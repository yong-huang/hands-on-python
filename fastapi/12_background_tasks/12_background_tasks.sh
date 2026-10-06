#!/usr/bin/env bash
# lab 12 · 后台任务三形态 —— 主演示脚本
#
# 用法:
#   ./12_background_tasks.sh start   # 启动服务(端口 8912), Ctrl-C 停止
#   ./12_background_tasks.sh demo    # 教学演示: 自动起停服务, 跑完 6 个章节(含断言)
#   ./12_background_tasks.sh clean   # 停止服务, 删除 .run/ 运行目录
#   ./12_background_tasks.sh all     # clean + demo + clean 全生命周期
#
# 场景: 邮件通知 API。同一个伪发送工作(sleep 0.5 后写 outbox 记录)分别交给三种
# "响应之后继续干活"的机制: BackgroundTasks / asyncio.create_task / 进程内队列
# + 常驻 worker; 另有两个故意抛异常的端点, 实测两种形态的异常分别去了哪。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8912
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

# jget: 从最近一次响应里取字段。表达式形如 d["items"][0]["id"]（eval 仅供本脚本自用）
jget() {
    "$PY" -c '
import json, sys
with open(sys.argv[2], encoding="utf-8") as f:
    d = json.load(f)
v = eval(sys.argv[1])
print(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
' "$1" "$LAST_RESP"
}

# oget: 按邮件 id 从 /outbox 响应里取表达式值（expr 里 i 代表该条记录）
oget() { # ID expr
    "$PY" -c '
import json, sys
d = json.load(open(sys.argv[3], encoding="utf-8"))
items = [r for r in d["items"] if r["id"] == sys.argv[1]]
assert items, f"outbox 中没有 {sys.argv[1]}"
i = items[0]
print(eval(sys.argv[2]))
' "$1" "$2" "$LAST_RESP"
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

# httpx_req / httpx_req_q: 用 .venv/bin/python + httpx 发请求(断言与耗时测量统一走 httpx)。
# 结果: 响应体写入 $LAST_RESP, 状态码/耗时写入 STATUS / ELAPSED; _q 静默版供轮询用。
httpx_req() { # METHOD PATH [JSON_BODY]
    local line
    line="$(_req "$@")"
    STATUS="${line%% *}"
    ELAPSED="${line##* }"
    show_resp "httpx -X $1 $2${3:+ -d '$3'}"
}
httpx_req_q() {
    local line
    line="$(_req "$@")"
    STATUS="${line%% *}"
    ELAPSED="${line##* }"
}
_req() {
    "$PY" - "$1" "$BASE$2" "${3:-}" "$LAST_RESP" <<'PYEOF'
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
}

# wait_outbox: 轮询 /outbox 直到条件为真(条件是作用于 d 的 Python 表达式), 超时报 FAIL
wait_outbox() { # timeout_sec cond
    local timeout="$1" cond="$2" waited=0
    while :; do
        httpx_req_q GET /outbox
        if [ "$(jget "$cond")" = "true" ]; then return 0; fi
        waited=$((waited + 1))
        if [ "$waited" -ge $((timeout * 10)) ]; then
            fail "轮询 ${timeout}s 超时: $cond (最后一次 outbox: $(cat "$LAST_RESP"))"
        fi
        sleep 0.1
    done
}

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $SERVER_LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/outbox" 2>/dev/null; then
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
    banner "lab 12 · 后台任务三形态 —— 响应之后的活, 交给谁, 干砸了谁知道"
    echo "  场景: 邮件通知 API。同一个伪发送工作(sleep 0.5 模拟 SMTP, 完成后写"
    echo "  outbox 记录)分别交给三种机制; 另有两个故意抛异常的端点, 实测异常去向。"

    start_server

    step "[1/6] 三形态总览: 同一份工作, 三种'响应之后继续干活'的交接方式"
    cat <<'FIG'
        POST /notify-*  ->  立即返回 202 Accepted(毫秒级)
          |
          +--[bg]    BackgroundTasks     响应发送后, 同一进程里按添加顺序逐个执行
          +--[task]  asyncio.create_task 立即调度到事件循环, 返回 Task 对象, 无人 await
          +--[queue] 进程内 asyncio.Queue + 常驻 worker(lifespan 里启动), 逐件消费
FIG
    echo "  可靠性边界(如实标注): 三形态的'队列'都活在本进程里, 进程重启即丢;"
    echo "  生产环境要可靠投递应使用外部队列(Redis / Celery 等), 本系列零依赖不装。"

    step "[2/6] BackgroundTasks: POST 立即 202, '邮件'约 0.5s 后才落进 outbox"
    httpx_req_q POST /reset
    httpx_req POST /notify-bg '{"to":"alice@example.com"}'
    assert_eq "POST /notify-bg 状态码 202" "$STATUS" "202"
    assert_lt "响应到达 < 0.3s(没等发送完成)" "$ELAPSED" "0.3"
    local id
    id="$(jget 'd["id"]')"
    httpx_req_q GET /outbox
    assert_eq "响应返回瞬间 outbox 还没有该记录(响应先于任务完成)" \
        "$(jget "any(i[\"id\"] == \"$id\" for i in d[\"items\"])")" "false"
    wait_outbox 5 "any(i[\"id\"] == \"$id\" and i[\"status\"] == \"done\" for i in d[\"items\"])"
    assert_ge "落账晚于 accepted_at >= 0.4s(sleep 0.5 在响应之后才跑)" \
        "$(oget "$id" 'i["finished_at"] - i["accepted_at"]')" "0.4"
    echo "    时序差: $(oget "$id" 'round(i["finished_at"] - i["accepted_at"], 3)')s"

    step "[3/6] create_task: 同样的立即 202 与 0.5s 后落账, 但调度时机更早"
    echo "  create_task 在端点函数体里就把它调度上了事件循环, 不必等响应发送;"
    echo "  返回的 Task 对象没人 await —— 先记住这点, 章节 [5] 它会体现出差别。"
    httpx_req POST /notify-task '{"to":"bob@example.com"}'
    assert_eq "POST /notify-task 状态码 202" "$STATUS" "202"
    assert_lt "响应到达 < 0.3s" "$ELAPSED" "0.3"
    id="$(jget 'd["id"]')"
    httpx_req_q GET /outbox
    assert_eq "响应返回瞬间 outbox 同样没有该记录" \
        "$(jget "any(i[\"id\"] == \"$id\" for i in d[\"items\"])")" "false"
    wait_outbox 5 "any(i[\"id\"] == \"$id\" and i[\"status\"] == \"done\" for i in d[\"items\"])"
    assert_ge "落账晚于 accepted_at >= 0.4s" \
        "$(oget "$id" 'i["finished_at"] - i["accepted_at"]')" "0.4"
    echo "    时序差: $(oget "$id" 'round(i["finished_at"] - i["accepted_at"], 3)')s"

    step "[4/6] 队列形态: 投 3 件, worker 逐件消费, 完成顺序 = 投递顺序"
    httpx_req_q POST /reset
    local n
    for n in 1 2 3; do
        httpx_req POST /notify-queue "{\"to\":\"q${n}@example.com\"}"
        assert_eq "POST /notify-queue #$n 状态码 202" "$STATUS" "202"
        assert_lt "  响应到达 < 0.3s(只入队, 不执行)" "$ELAPSED" "0.3"
    done
    wait_outbox 8 'len([i for i in d["items"] if i["channel"] == "queue"]) == 3'
    assert_eq "完成顺序与投递顺序一致(FIFO)" \
        "$(jget '[i["to"] for i in d["items"] if i["channel"] == "queue"]')" \
        '["q1@example.com", "q2@example.com", "q3@example.com"]'
    local gaps gap12 gap23
    gaps="$(jget '[i["finished_at"] for i in d["items"] if i["channel"] == "queue"]')"
    gap12="$("$PY" -c 'import json,sys; t=json.loads(sys.argv[1]); print(round(t[1]-t[0],3))' "$gaps")"
    gap23="$("$PY" -c 'import json,sys; t=json.loads(sys.argv[1]); print(round(t[2]-t[1],3))' "$gaps")"
    assert_ge "第 2 件比第 1 件晚 >= 0.4s(逐件串行)" "$gap12" "0.4"
    assert_ge "第 3 件比第 2 件晚 >= 0.4s" "$gap23" "0.4"
    echo "    相邻完成间隔: ${gap12}s / ${gap23}s —— worker 每件花 0.5s, 串行消费"

    step "[5/6] 异常去向实测: 同样抛 RuntimeError, 两种形态各去往何处"
    echo "  (a) POST /fail-bg: 工作函数先落账 failed 再 raise。"
    httpx_req_q POST /reset
    httpx_req POST /fail-bg '{"to":"fb@example.com"}'
    assert_eq "(a) 客户端照常收到 202(异常发生在响应发送之后)" "$STATUS" "202"
    id="$(jget 'd["id"]')"
    wait_outbox 5 "any(i[\"id\"] == \"$id\" and i[\"status\"] == \"failed\" for i in d[\"items\"])"
    ok "(a) outbox 里该记录被工作函数自己标记为 failed(框架不代劳)"
    sleep 0.3
    if grep -q "Exception in ASGI application" "$SERVER_LOG" \
        && grep -q "RuntimeError: 邮件 $id 发送失败" "$SERVER_LOG"; then
        ok "(a) 异常沿请求管线冒到服务端日志: 'Exception in ASGI application' + traceback"
    else
        fail "(a) 服务端日志里没有找到 fail-bg 的异常"
    fi
    echo "      日志摘录(完整 traceback 约 40 行, 中间省略):"
    grep -m1 -B1 "await self.background()" "$SERVER_LOG" | sed 's/^/        /'
    echo "        ..."
    grep "RuntimeError: 邮件 $id 发送失败" "$SERVER_LOG" | head -1 | sed 's/^/        /'
    echo "  (b) POST /fail-task: 裸抛不落账, 异常被 Task 对象持有, 没人 await。"
    httpx_req POST /fail-task '{"to":"ft@example.com"}'
    assert_eq "(b) 客户端同样照常收到 202" "$STATUS" "202"
    id="$(jget 'd["id"]')"
    sleep 1.2   # 远超任务的 0.5s 生存期: 该跑的跑了, 该抛的抛了
    httpx_req_q GET /outbox
    assert_eq "(b) 1.2s 后 outbox 仍无该记录 —— '静默'本身就是要断言的现象" \
        "$(jget "any(i[\"id\"] == \"$id\" for i in d[\"items\"])")" "false"
    local asgi_crashes
    asgi_crashes="$(grep -c "Exception in ASGI application" "$SERVER_LOG")"
    assert_eq "(b) 请求管线异常仍只有 1 条(全部来自 fail-bg)" "$asgi_crashes" "1"
    echo "      唯一的痕迹: Task 对象被垃圾回收后, asyncio 补一条登记警告(时机不保证):"
    local waited=0 found=""
    while [ "$waited" -lt 50 ]; do
        if grep -q "Task exception was never retrieved" "$SERVER_LOG"; then found="y"; break; fi
        waited=$((waited + 1)); sleep 0.1
    done
    if [ -n "$found" ]; then
        ok "(b) 日志出现 'Task exception was never retrieved' + 该 RuntimeError"
    else
        fail "(b) 5s 内未出现 never-retrieved 警告(本次 GC 时机异常, 请重跑)"
    fi
    grep -m1 -A2 "Task exception was never retrieved" "$SERVER_LOG" | sed 's/^/        /'
    echo "        ..."

    step "[6/6] 三形态边界总结: 一张表收束全部实测结论"
    echo "  +---------------+----------------------+---------------------------+------------+"
    echo "  | 形态          | 完成保证             | 异常可见性                | 进程重启后 |"
    echo "  +---------------+----------------------+---------------------------+------------+"
    echo "  | Background    | 尽力而为, 无重试     | 服务端日志 traceback      | 全部丢失   |"
    echo "  | create_task   | 尽力而为, 需自留引用 | 默认静默, GC 后才有警告   | 全部丢失   |"
    echo "  | 进程内队列    | worker 逐件消费,     | worker 统一观察并落账     | 未执行即丢 |"
    echo "  |               | 单件失败不杀循环     |                           |            |"
    echo "  +---------------+----------------------+---------------------------+------------+"
    echo "  适用场景: bg = 响应后的轻量追加工作; task = 请求上下文外发起的并发工作"
    echo "  (需自己兜异常); queue = 削峰/串行化。可靠投递一律交给外部队列(Redis/Celery)。"
    echo
    echo "  章节速查: [1] 总览 | [2] bg 时序差 >=0.4s | [3] task 同样时序"
    echo "            [4] 队列 FIFO + 串行 | [5] 日志 traceback / 静默 | [6] 边界表"
    echo "  服务端日志保留在 $SERVER_LOG"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl -X POST $BASE/notify-bg -H 'Content-Type: application/json' -d '{\"to\":\"alice@example.com\"}'"
    echo "    curl -X POST $BASE/notify-queue -H 'Content-Type: application/json' -d '{\"to\":\"bob@example.com\"}'"
    echo "    curl $BASE/outbox"
    echo "    curl -X POST $BASE/fail-bg -H 'Content-Type: application/json' -d '{\"to\":\"fb@example.com\"}'   # 之后看本目录 .run/server.log 里的 traceback"
    echo "    curl -X POST $BASE/fail-task -H 'Content-Type: application/json' -d '{\"to\":\"ft@example.com\"}'  # 202 之后什么都不会发生"
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
