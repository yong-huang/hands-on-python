#!/usr/bin/env bash
# lab 07 · yield 依赖与生命周期 —— 主演示脚本
#
# 用法:
#   ./07_yield_dependencies.sh start   # 启动服务(端口 8907), Ctrl-C 停止
#   ./07_yield_dependencies.sh demo    # 教学演示: 自动起停服务, 跑完 6 个章节(含断言)
#   ./07_yield_dependencies.sh clean   # 停止服务, 删除 .run/ 运行目录
#   ./07_yield_dependencies.sh all     # clean + demo + clean 全生命周期
#
# 场景: 事务边界 API。transaction 依赖 yield 前 BEGIN、yield 后 COMMIT/ROLLBACK
# (端点异常时回滚); audit 依赖 teardown 写审计记录; 另有两个 teardown 抛异常的
# 实验端点, 实测客户端状态码与服务端日志的真实行为。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8907
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
LAST_RESP="$RUN_DIR/last_resp.json"
SERVER_PID=""
STATUS=""
ELAPSED=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }
ok() { echo "    [PASS] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "    [FAIL] $*"; exit 1; }
assert_eq() { # desc actual expected
    if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (实际: [$2] / 期望: [$3])"; fi
}
assert_ge() { # desc actual expected(数值 >=, 支持小数)
    if "$PY" -c 'import sys; sys.exit(0 if float(sys.argv[1]) >= float(sys.argv[2]) else 1)' "$2" "$3"; then
        ok "$1"
    else
        fail "$1 (实际: [$2] / 期望 >= [$3])"
    fi
}
assert_lt() { # desc actual expected(数值 <, 支持小数)
    if "$PY" -c 'import sys; sys.exit(0 if float(sys.argv[1]) < float(sys.argv[2]) else 1)' "$2" "$3"; then
        ok "$1"
    else
        fail "$1 (实际: [$2] / 期望 < [$3])"
    fi
}

# jget: 从最近一次响应里取字段。表达式形如 d["events"][0]（eval 仅供本脚本自用）
jget() {
    "$PY" -c '
import json, sys
with open(sys.argv[2], encoding="utf-8") as f:
    d = json.load(f)
v = eval(sys.argv[1])
print(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
' "$1" "$LAST_RESP"
}

show_resp() { # 打印请求描述与最近一次响应(JSON 美化, 纯文本原样打印)
    echo "    \$ $1   =>   HTTP $STATUS"
    "$PY" -c '
import json, sys
raw = open(sys.argv[1], encoding="utf-8").read()
try:
    print(json.dumps(json.loads(raw), ensure_ascii=False, indent=2))
except ValueError:
    print(raw)
' "$LAST_RESP" | sed 's/^/        /'
}

# httpx_req: 用 .venv/bin/python + httpx 发请求(教学断言与耗时测量统一走 httpx)。
# 结果: 响应体写入 $LAST_RESP, 状态码/耗时写入 STATUS / ELAPSED。
httpx_req() { # METHOD PATH [JSON_BODY]
    local line
    line="$("$PY" - "$1" "$BASE$2" "${3:-}" "$LAST_RESP" <<'PYEOF'
import json, sys, time
import httpx
method, url, body, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
kwargs: dict = {"timeout": 10}
if body:
    kwargs["json"] = json.loads(body)
t0 = time.perf_counter()
r = httpx.request(method, url, **kwargs)
print(r.status_code, f"{time.perf_counter() - t0:.3f}")
with open(out, "w", encoding="utf-8") as f:
    f.write(r.text)
PYEOF
)"
    STATUS="${line%% *}"
    ELAPSED="${line##* }"
    show_resp "httpx -X $1 $2${3:+ -d '$3'}"
}

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $SERVER_LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/trace" 2>/dev/null; then
            echo "  服务就绪: $BASE (pid=$SERVER_PID)"
            return 0
        fi
        sleep 0.3
    done
    echo "  [FAIL] 服务 18s 内未就绪, 日志尾部:"; tail -20 "$SERVER_LOG"
    exit 1
}

stop_server() {
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
        SERVER_PID=""
    fi
    # 兜底清扫: 上一个脚本实例可能留下了同端口残留进程
    if command -v lsof >/dev/null 2>&1; then
        local pids
        pids="$(lsof -ti "tcp:$PORT" 2>/dev/null || true)"
        if [ -n "$pids" ]; then kill $pids 2>/dev/null || true; sleep 0.5; fi
    fi
}
trap 'stop_server' EXIT

demo() {
    stop_server
    banner "lab 07 · yield 依赖与生命周期 —— setup 在前, teardown 在后, 异常照走全程"
    echo "  场景: 事务边界 API。transaction 依赖: yield 前 BEGIN, yield 后按端点"
    echo "  成败分流 COMMIT / ROLLBACK; audit 依赖: teardown 写审计记录(带 0.5s 停顿,"
    echo "  让 teardown 的时机肉眼可见)。另有两个 teardown 抛异常的实验端点。"

    start_server

    step "[1/6] 生命周期总览: 一个 yield 把依赖函数掰成两半"
    echo "  一次带 yield 依赖的请求, 完整时间线如下(双依赖叠加时):"
    cat <<'FIG'
        请求到达
          |
          v
        依赖 setup   tx:begin --> audit:setup        (按声明顺序执行)
          |
          v
        端点函数运行(拿到的参数 = 各依赖 yield 出去的值)
          |
          v
        构建响应 --> 响应发送        ** 客户端此刻已收到 200 **
          |
          v
        依赖 teardown  audit:teardown --> tx:commit  (后进先出, 与 setup 相反)
FIG
    echo "  规则: yield 之前是 setup, 之后是 teardown; teardown 的触发点在响应"
    echo "  发送之后; 端点抛异常时 teardown 照样执行, 且异常会从 yield 点穿回生成器。"

    step "[2/6] 正常路径: POST /orders -> BEGIN ... COMMIT, teardown 后进先出"
    echo "  声明顺序 transaction 在前、audit 在后, 所以 setup 是 tx:begin -> audit:setup;"
    echo "  teardown 走栈结构(后进先出), 是 audit:teardown -> tx:commit, 顺序正好相反。"
    echo "  注意: 响应返回时 teardown 还没跑完(audit 要停 0.5s), 等 0.8s 再读 /trace。"
    httpx_req POST /orders '{"item":"coffee","qty":2}'
    assert_eq "POST /orders 状态码 200" "$STATUS" "200"
    assert_eq "端点拿到依赖 yield 的值 tx 编号" "$(jget 'd["tx"]')" "tx#1"
    sleep 0.8
    httpx_req GET /trace
    assert_eq "事件序列(setup 顺序 -> teardown 逆序)" "$(jget 'd["events"]')" \
        '["tx:begin", "audit:setup", "audit:teardown", "tx:commit"]'
    assert_eq "正常路径没有 rollback" "$(jget '"tx:rollback" in d["events"]')" "false"

    step "[3/6] 异常路径: POST /boom -> 端点异常穿越 yield 点, ROLLBACK 顶替 COMMIT"
    echo "  端点抛 HTTPException(418)后, 异常先穿回两个生成器: audit:teardown 与"
    echo "  tx:rollback 都在错误响应之前完成(所以响应耗时 >= audit 的 0.5s 停顿),"
    echo "  然后异常中间件才把 HTTPException 翻译成 418 响应发给客户端。"
    httpx_req POST /boom '{"item":"ghost","qty":1}'
    assert_eq "POST /boom 状态码 418" "$STATUS" "418"
    assert_ge "418 响应耗时 >= 0.35s(teardown 先于错误响应)" "$ELAPSED" "0.35"
    httpx_req GET /trace
    assert_eq "事件序列: rollback 顶替 commit" "$(jget 'd["events"]')" \
        '["tx:begin", "audit:setup", "audit:teardown", "tx:rollback"]'

    step "[4/6] teardown 在响应之后: 响应先到, audit:teardown 晚 >=0.35s 才落账"
    echo "  对照墙钟时间戳: 响应体里的 responded_at 是构建响应的时刻, /trace 的"
    echo "  times 是各事件落账时刻。响应到达耗时约 10ms, 而 teardown 记录晚 0.5s。"
    httpx_req POST /orders '{"item":"tea","qty":1}'
    assert_eq "POST /orders 状态码 200" "$STATUS" "200"
    assert_lt "响应到达 < 0.35s(teardown 没有拖慢响应)" "$ELAPSED" "0.35"
    local responded_at min_teardown_t
    responded_at="$(jget 'd["responded_at"]')"
    sleep 0.8
    httpx_req GET /trace
    assert_eq "事件序列不变" "$(jget 'd["events"]')" \
        '["tx:begin", "audit:setup", "audit:teardown", "tx:commit"]'
    min_teardown_t="$("$PY" -c 'import sys; print(float(sys.argv[1]) + 0.35)' "$responded_at")"
    assert_ge "audit:teardown 落账晚于 responded_at 至少 0.35s" "$(jget 'd["times"][2]')" "$min_teardown_t"
    assert_ge "tx:commit 落账也晚于 responded_at" "$(jget 'd["times"][3]')" "$min_teardown_t"

    step "[5/6] teardown 里的异常(本机实测): 客户端看到什么, 日志留下什么"
    echo "  (a) GET /teardown-crash: 端点成功、teardown 抛 RuntimeError。"
    echo "      实测(fastapi 0.142.2 / starlette 1.7.0): 响应已先发送完毕, 客户端"
    echo "      照常收到 200; 异常沿 ASGI 调用链冒到 uvicorn, 只出现在服务端日志。"
    httpx_req GET /teardown-crash
    assert_eq "(a) 客户端照常收到 200(teardown 异常改不了已发送的响应)" "$STATUS" "200"
    assert_eq "(a) 响应体完整" "$(jget 'd["ok"]')" "true"
    sleep 0.5   # 等异常走完 ASGI 调用链、落进日志
    if grep -q "Exception in ASGI application" "$SERVER_LOG" \
        && grep -q "RuntimeError: cleanup failed in teardown" "$SERVER_LOG"; then
        ok "(a) 服务端日志出现 'Exception in ASGI application' + RuntimeError"
    else
        fail "(a) 服务端日志里没有找到 teardown 异常"
    fi
    echo "      日志摘录(完整 traceback 约 30 行, 中间省略):"
    grep -m1 -A2 "Exception in ASGI application" "$SERVER_LOG" | sed 's/^/        /'
    echo "        ..."
    grep "RuntimeError: cleanup failed in teardown" "$SERVER_LOG" | head -1 | sed 's/^/        /'
    echo "  (b) GET /teardown-crash-on-error: 端点先抛 418、teardown 再抛 RuntimeError。"
    echo "      实测: finally 里的异常顶掉业务异常, 客户端收到 500 纯文本而非 418 JSON。"
    httpx_req GET /teardown-crash-on-error
    assert_eq "(b) 客户端收到 500(teardown 异常顶掉了业务 418)" "$STATUS" "500"
    local crashes
    crashes="$(grep -c "Exception in ASGI application" "$SERVER_LOG")"
    assert_ge "(b) 日志累计 2 条 ASGI 异常(两次实验各一条)" "$crashes" "2"

    step "[6/6] 顺序总结: 一张表收束全部实测结论"
    echo "  +-----------------------------------+---------------------------+"
    echo "  | 阶段                              | 顺序                      |"
    echo "  +-----------------------------------+---------------------------+"
    echo "  | setup                             | 声明顺序: tx -> audit     |"
    echo "  | 端点函数                           | 拿到各依赖 yield 的值     |"
    echo "  | teardown(正常路径)                 | 响应发送后, 后进先出      |"
    echo "  | teardown(端点异常)                 | 错误响应发送前, 照常执行  |"
    echo "  +-----------------------------------+---------------------------+"
    echo "  teardown 异常实测: 端点成功时客户端无感(200 照发), 异常只进服务端日志;"
    echo "  端点失败时 teardown 异常顶掉业务异常, 客户端收到 500。"
    echo
    echo "  章节速查: [1] 时间线 | [2] COMMIT + 后进先出 | [3] ROLLBACK 先于 418"
    echo "            [4] teardown 晚于响应 >=0.35s | [5] 200 照发/500 顶替 | [6] 速查表"
    echo "  服务端日志保留在 $SERVER_LOG"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl -X POST $BASE/orders -H 'Content-Type: application/json' -d '{\"item\":\"coffee\",\"qty\":2}'"
    echo "    curl -X POST $BASE/boom -H 'Content-Type: application/json' -d '{\"item\":\"ghost\",\"qty\":1}'"
    echo "    curl $BASE/trace"
    echo "    curl $BASE/teardown-crash   # 之后看本目录 .run/server.log 里的 traceback"
    echo "  停止: Ctrl-C"
    wait "$SERVER_PID"
}

cmd_clean() {
    stop_server
    rm -rf "$RUN_DIR"
    echo "已停止服务并清理 $RUN_DIR"
}

case "${1:-demo}" in
    start) cmd_start ;;
    demo) demo ;;
    clean) cmd_clean ;;
    all)
        cmd_clean
        demo
        cmd_clean
        ;;
    *)
        echo "用法: $0 start|demo|clean|all"
        exit 1
        ;;
esac
