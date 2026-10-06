#!/usr/bin/env bash
# lab 08 · 类依赖与全局依赖 —— 主演示脚本
#
# 用法:
#   ./08_class_global_dependencies.sh start  # 启动服务(端口 8908), Ctrl-C 停止
#   ./08_class_global_dependencies.sh demo   # 教学演示: 自动起停服务, 跑完 6 个章节(含断言)
#   ./08_class_global_dependencies.sh clean  # 停止服务, 删除 .run/
#   ./08_class_global_dependencies.sh all    # clean + demo + clean 全生命周期
#
# 场景: "管理后台" API。类依赖两件套: RateLimitGuard(实例化时定 limit, __call__
# 按 IP 进程内计数, 超限 429)与 Pagination(query 参数收进实例属性); 三层挂载:
# app 级全局依赖(请求计数) -> router 级 dependencies=[...](校验 X-API-Key)
# -> 端点级 Annotated[None, Depends(...)], GET /admin/trace 回显真实执行顺序。
# 注意: 限流计数是进程内状态, 服务重启即归零——demo 每次自行起服务, 断言从零开始。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8908
BASE="http://127.0.0.1:$PORT"
KEY="lab08-admin-key"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
SERVER_PID=""
PASS_COUNT=0
export LAB_PORT="$PORT"
export LAB_LAST_RESP="$RUN_DIR/last_resp.json"

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }
ok() { echo "    [PASS] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "    [FAIL] $*"; exit 1; }
assert_eq() { # desc actual expected
    if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (实际: [$2] / 期望: [$3])"; fi
}
assert_contains() { # desc haystack needle
    if [[ "$2" == *"$3"* ]]; then ok "$1"; else fail "$1 ([$2] 不含 [$3])"; fi
}

# jget: 从最近一次响应里取字段。表达式形如 d["guards"]["heavy(limit=2)"]（eval 仅供本脚本自用）
jget() {
    "$PY" -c '
import json, sys
with open(sys.argv[2], encoding="utf-8") as f:
    d = json.load(f)
v = eval(sys.argv[1])
print(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
' "$1" "$LAB_LAST_RESP"
}

show_resp() { # 打印请求描述与最近一次响应(美化 JSON)
    echo "    \$ $1   =>   HTTP $STATUS"
    "$PY" -c '
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    print(json.dumps(json.load(f), ensure_ascii=False, indent=2))
' "$LAB_LAST_RESP" | sed 's/^/        /'
}

# req: 用 httpx 发一次请求, 状态码进 STATUS, 响应体落盘供 jget 取用。
# 用法: req <展示用描述> <method> <path> ["Header: value" ...] [--data body]
req() {
    local desc="$1"; shift
    STATUS="$("$PY" -c '
import os, sys, httpx
method, path, extra = sys.argv[1], sys.argv[2], sys.argv[3:]
headers = {}
data = None
while extra:
    a = extra.pop(0)
    if a == "--data":
        data = extra.pop(0)
    else:
        k, _, v = a.partition(":")
        headers[k.strip()] = v.strip()
r = httpx.request(method, "http://127.0.0.1:" + os.environ["LAB_PORT"] + path,
                  headers=headers, content=data, timeout=10)
with open(os.environ["LAB_LAST_RESP"], "w", encoding="utf-8") as f:
    f.write(r.text)
print(r.status_code)
' "$@")"
    show_resp "$desc"
}

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $SERVER_LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/public/ping" 2>/dev/null; then
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
    banner "lab 08 · 类依赖与全局依赖 —— 类当依赖用, 依赖批量挂"
    echo "  场景: 管理后台 API。三层挂载: app 级全局依赖(每个请求计数 +1) ->"
    echo "  router 级 dependencies=[...](校验 X-API-Key) -> 端点级 Annotated[None, Depends(...)]。"
    echo "  两个类依赖: RateLimitGuard 实例化时定上限、__call__ 按 IP 计数超限 429;"
    echo "  Pagination 把 query 参数收进实例属性。所有状态在进程内存里, 重启归零。"

    start_server

    step "[1/6] 挂载层级总览: 三层结构 + 不经 router 的公开端点"
    cat <<'TXT'
    请求 -> [app 级]    track_request      全局依赖: 计数 +1, 开出 trace 记录
         -> [router 级] require_api_key    /admin 专属: 校验 X-API-Key
         -> [端点级]    Annotated[None, Depends(...)]  单条路由自己的依赖
         -> 端点函数
TXT
    req "GET /public/ping(挂在 app 上, 不经 /admin router)" GET /public/ping
    assert_eq "公开端点 200" "$STATUS" "200"
    assert_eq "trace 只有 global(没有 router 层)" "$(jget 'd["trace"]')" '["global"]'

    step "[2/6] 类依赖参数化: 两个 RateLimitGuard 实例, 各自独立计数"
    echo "  heavy 守卫 limit=2, reports 守卫 limit=5: 同一个类, 实例化参数不同。"
    echo "  实例在 import 时创建、被模块级变量持有, counts 跨请求累积; 重启归零。"
    req "heavy 第 1 次" GET /admin/heavy "X-API-Key: $KEY"
    assert_eq "heavy 第 1 次 -> 200" "$STATUS" "200"
    req "heavy 第 2 次" GET /admin/heavy "X-API-Key: $KEY"
    assert_eq "heavy 第 2 次 -> 200" "$STATUS" "200"
    req "heavy 第 3 次(超过 limit=2)" GET /admin/heavy "X-API-Key: $KEY"
    assert_eq "heavy 第 3 次 -> 429" "$STATUS" "429"
    assert_contains "429 文案点明上限与当前次数" "$(jget 'd["detail"]')" "第 3 次请求，超过 heavy 守卫的上限 2"
    local i
    for i in 1 2 3 4 5; do
        req "reports 第 $i 次" GET /admin/reports "X-API-Key: $KEY"
        assert_eq "reports 第 $i 次 -> 200(heavy 已 429, 不影响这边)" "$STATUS" "200"
    done
    req "reports 第 6 次(超过 limit=5)" GET /admin/reports "X-API-Key: $KEY"
    assert_eq "reports 第 6 次 -> 429" "$STATUS" "429"
    req "GET /admin/stats 看两本账" GET /admin/stats "X-API-Key: $KEY"
    assert_eq "heavy 计数表独立: {127.0.0.1: 3}" "$(jget 'd["guards"]["heavy(limit=2)"]')" '{"127.0.0.1": 3}'
    assert_eq "reports 计数表独立: {127.0.0.1: 6}" "$(jget 'd["guards"]["reports(limit=5)"]')" '{"127.0.0.1": 6}'

    step "[3/6] Pagination 类依赖: query 参数 -> 实例属性"
    echo "  Depends(Pagination) 传的是类本身: FastAPI 读 __init__ 签名, 把 q/size"
    echo "  当 query 参数解析(ge/le 校验生效), 每请求现场实例化, 实例就是注入值。"
    req "GET /admin/items?q=2&size=3" GET "/admin/items?q=2&size=3" "X-API-Key: $KEY"
    assert_eq "状态码 200" "$STATUS" "200"
    assert_eq "q=2 收进实例属性" "$(jget 'd["q"]')" "2"
    assert_eq "size=3 收进实例属性" "$(jget 'd["size"]')" "3"
    assert_eq "第 2 页每页 3 条 -> item-04~06" "$(jget 'd["items"]')" '["item-04", "item-05", "item-06"]'
    assert_eq "简写式与完整式命中同一实例(cache_proof)" "$(jget 'd["cache_proof"]')" "true"
    req "GET /admin/items(默认值 q=1 size=10)" GET /admin/items "X-API-Key: $KEY"
    assert_eq "默认 q=1" "$(jget 'd["q"]')" "1"
    assert_eq "默认 size=10, 切出 10 条" "$(jget 'len(d["items"])')" "10"
    req "GET /admin/items?q=0(触发 Query 校验 ge=1)" GET "/admin/items?q=0" "X-API-Key: $KEY"
    assert_eq "q=0 -> 422" "$STATUS" "422"

    step "[4/6] router 级依赖: /admin 整组路由共用一次 X-API-Key 校验"
    echo "  dependencies 写在 APIRouter 构造参数里, 端点函数零重复; 校验失败 403,"
    echo "  请求到不了端点函数。挂在 app 上的 /public/ping 不在门内, 免凭证。"
    req "GET /admin/stats 不带 X-API-Key" GET /admin/stats
    assert_eq "缺凭证 -> 403" "$STATUS" "403"
    assert_contains "403 文案指出缺哪个头" "$(jget 'd["detail"]')" "X-API-Key"
    req "GET /admin/stats 带错误 key" GET /admin/stats "X-API-Key: wrong-key"
    assert_eq "错凭证 -> 403" "$STATUS" "403"
    req "GET /admin/stats 带正确 key" GET /admin/stats "X-API-Key: $KEY"
    assert_eq "凭证正确 -> 200" "$STATUS" "200"

    step "[5/6] app 级全局依赖: 任何请求都被计数, 连 403 的也算"
    echo "  track_request 是全局依赖: 先于 router 级执行, 所以被 403 拒掉的请求"
    echo "  同样 +1; /admin/stats 自身这次请求也会 +1, 断言按差值算, 与历史无关。"
    req "记下初始计数 S1" GET /admin/stats "X-API-Key: $KEY"
    local s1 s2
    s1="$(jget 'd["total_requests"]')"
    req "无凭证打 /admin/stats(被 403, 也计数)" GET /admin/stats
    assert_eq "无凭证 -> 403" "$STATUS" "403"
    req "ping 第 1 次" GET /public/ping
    req "ping 第 2 次" GET /public/ping
    req "再读计数 S2" GET /admin/stats "X-API-Key: $KEY"
    s2="$(jget 'd["total_requests"]')"
    assert_eq "S2 - S1 = 4(2 ping + 1 个 403 + stats 自身)" "$((s2 - s1))" "4"

    step "[6/6] 执行顺序: app 级 -> router 级 -> 端点级"
    echo "  三层依赖各自往 request.state.trace 里记一笔, 端点体运行时三层已跑完,"
    echo "  GET /admin/trace 回显的就是真实执行顺序。"
    req "GET /admin/trace" GET /admin/trace "X-API-Key: $KEY"
    assert_eq "状态码 200" "$STATUS" "200"
    assert_eq "顺序 = global -> router -> endpoint" "$(jget 'd["trace"]')" '["global", "router", "endpoint"]'
    req "GET /public/ping 对照: 无 router 层" GET /public/ping
    assert_eq "公开端点顺序 = 只有 global" "$(jget 'd["trace"]')" '["global"]'

    echo
    echo "  章节速查: [1] 三层结构 | [2] heavy 3 次 429 / reports 6 次 429, 两本账独立"
    echo "            [3] q=2&size=3 -> item-04~06 | [4] 无 key 403 | [5] 差值 4(含 403)"
    echo "            [6] trace = global -> router -> endpoint"
    echo "  服务端日志保留在 .run/server.log; 限流/计数为进程内状态, 重启归零。"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl -H 'X-API-Key: $KEY' $BASE/admin/trace"
    echo "    curl -H 'X-API-Key: $KEY' '$BASE/admin/items?q=2&size=3'"
    echo "    for i in 1 2 3; do curl -s -H 'X-API-Key: $KEY' $BASE/admin/heavy; echo; done"
    echo "    curl $BASE/public/ping"
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
