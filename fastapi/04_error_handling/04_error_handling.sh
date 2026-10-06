#!/usr/bin/env bash
# lab 04 · 错误处理体系 —— 主演示脚本
#
# 用法:
#   ./04_error_handling.sh start   # 启动默认(生产)模式服务, Ctrl-C 停止
#   ./04_error_handling.sh demo    # 教学演示: 自动起停服务, 跑完 6 个章节(含断言)
#   ./04_error_handling.sh clean   # 停止服务并清理运行时产物(.run/)
#   ./04_error_handling.sh all     # clean + demo + clean 全生命周期
#
# 场景: 库存扣减 API。四条错误路径(409/404/422/500)全部收敛到同一 JSON 信封:
#   { "code": ..., "message": ..., "details": ..., "request_id": ... }
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8904
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
DEBUG_LOG="$RUN_DIR/server_debug.log"
LAST_RESP="$RUN_DIR/last_resp.json"
SERVER_PID=""

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }
ok() { echo "    [PASS] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "    [FAIL] $*"; exit 1; }
assert_eq() { # desc actual expected
    if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (实际: [$2] / 期望: [$3])"; fi
}

# jget: 从最近一次响应里取字段。表达式形如 d["details"]["sku"]（eval 仅供本脚本自用）
jget() {
    "$PY" -c '
import json, sys
with open(sys.argv[2], encoding="utf-8") as f:
    d = json.load(f)
v = eval(sys.argv[1])
print(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
' "$1" "$LAST_RESP"
}

# call_api: 发请求, 打印命令/状态码/美化后的响应体, 留下 $STATUS 与 LAST_RESP
call_api() { # method path [json-body]
    local method="$1" path="$2" data="${3:-}"
    local args=(-sS -o "$LAST_RESP" -w '%{http_code}' -X "$method" "$BASE$path" -H 'Content-Type: application/json')
    [ -n "$data" ] && args+=(-d "$data")
    STATUS="$(curl "${args[@]}")"
    echo "    \$ curl -X $method $path${data:+  -d '$data'}   =>   HTTP $STATUS"
    "$PY" -c '
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    print(json.dumps(json.load(f), ensure_ascii=False, indent=2))
' "$LAST_RESP" | sed 's/^/        /'
}

# 信封四字段断言: 恰好 code/message/details/request_id, 多一个少一个都算不统一
assert_envelope() {
    "$PY" -c '
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    d = json.load(f)
assert set(d.keys()) == {"code", "message", "details", "request_id"}, sorted(d.keys())
' "$LAST_RESP" && ok "$1" || fail "$1 (字段集合不符)"
}

start_server() { # label logfile [ENV=1 ...]
    local label="$1" log_file="$2"
    shift 2
    mkdir -p "$RUN_DIR"
    : > "$log_file"
    echo "  启动 uvicorn main:app --port $PORT ($label), 日志: $log_file"
    env "$@" "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$log_file" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/inventory/A1001" 2>/dev/null; then
            echo "  服务就绪: $BASE (pid=$SERVER_PID)"
            return 0
        fi
        sleep 0.3
    done
    echo "  [FAIL] 服务 18s 内未就绪, 日志尾部:"; tail -20 "$log_file"
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
    banner "lab 04 · 错误处理体系 —— 统一错误契约"
    echo "  场景: 库存扣减 API。四条错误路径: 409 业务异常 / 404 HTTPException /"
    echo "  422 校验失败 / 500 未捕获异常。目标: 全部收敛到同一个 JSON 信封,"
    echo '  即 { "code", "message", "details", "request_id" } 四字段。'

    start_server "默认模式, FastAPI(debug=False)" "$SERVER_LOG"

    step "[1/6] 成功路径: 正常扣减 -> 200, 信封只约束错误响应"
    echo "  正常业务响应不需要信封, 但 request_id 中间件对每个请求都生效。"
    call_api POST /inventory/deduct '{"sku":"A1001","qty":2}'
    assert_eq "状态码 200" "$STATUS" "200"
    assert_eq "remaining == 8" "$(jget 'd["remaining"]')" "8"

    step "[2/6] 业务异常 InventoryShortage -> 409 信封"
    echo "  B2002 库存 0 却要扣 5 件: 业务层 raise InventoryShortage(sku, short),"
    echo "  注册的 exception_handler 把它翻译成 409 + 信封, details 带业务字段。"
    call_api POST /inventory/deduct '{"sku":"B2002","qty":5}'
    assert_eq "状态码 409" "$STATUS" "409"
    assert_envelope "信封恰好四字段: code/message/details/request_id"
    assert_eq "code" "$(jget 'd["code"]')" "INVENTORY_SHORTAGE"
    assert_eq "message" "$(jget 'd["message"]')" "库存不足：B2002 还差 5 件"
    assert_eq "details.sku" "$(jget 'd["details"]["sku"]')" "B2002"
    assert_eq "details.short" "$(jget 'd["details"]["short"]')" "5"
    local rid
    rid="$(jget 'd["request_id"]')"
    [ -n "$rid" ] && ok "request_id 非空: $rid" || fail "request_id 为空"

    step "[3/6] HTTPException(404) -> 覆盖默认结构后的 HTTP 异常处理器"
    echo "  查询不存在的 SKU: 路由层 raise HTTPException(404)。默认会输出"
    echo '  {"detail": ...}, 这里被 exception_handler(StarletteHTTPException) 覆盖成信封。'
    call_api GET /inventory/X9999
    assert_eq "状态码 404" "$STATUS" "404"
    assert_envelope "404 也是同一信封"
    assert_eq "code" "$(jget 'd["code"]')" "NOT_FOUND"
    assert_eq "message" "$(jget 'd["message"]')" "SKU X9999 不存在"

    step "[4/6] 校验失败 -> 覆盖后的 422 信封(不再是 FastAPI 默认 422)"
    echo "  qty=-1 违反 Field(gt=0): RequestValidationError 被我们的 handler 接管,"
    echo "  原始 loc(错在哪一层哪个字段)保留进 details。"
    call_api POST /inventory/deduct '{"sku":"A1001","qty":-1}'
    assert_eq "状态码 422" "$STATUS" "422"
    assert_envelope "422 也是同一信封"
    assert_eq "code" "$(jget 'd["code"]')" "VALIDATION_ERROR"
    assert_eq "details[0].loc 保留原始位置" "$(jget 'd["details"][0]["loc"]')" '["body", "qty"]'
    assert_eq "details[0].type" "$(jget 'd["details"][0]["type"]')" "greater_than"
    assert_eq "默认 422 的 \"detail\" 键已消失" "$(grep -c '"detail"' "$LAST_RESP" || true)" "0"

    step "[5/6] 未捕获异常 -> 兜底 500: 信封给客户端, 堆栈只进日志"
    echo "  /boom 里 raise RuntimeError, 没有更精确的 handler 能接:"
    echo "  exception_handler(Exception) 兜底成 500 信封; 异常仍会被重新抛给"
    echo "  uvicorn, 于是服务端日志里有完整 traceback, 客户端什么堆栈都拿不到。"
    call_api GET /boom
    assert_eq "状态码 500" "$STATUS" "500"
    assert_envelope "500 也是同一信封"
    assert_eq "code" "$(jget 'd["code"]')" "INTERNAL_ERROR"
    local body_text
    body_text="$(cat "$LAST_RESP")"
    case "$body_text" in
        *RuntimeError* | *Traceback*) fail "客户端响应泄漏了堆栈信息" ;;
        *) ok "客户端拿不到堆栈(无 RuntimeError / Traceback 字样)" ;;
    esac
    if grep -q "Traceback (most recent call last)" "$SERVER_LOG" && grep -q "RuntimeError" "$SERVER_LOG"; then
        ok "服务端日志含完整 traceback(uvicorn: Exception in ASGI application)"
    else
        fail "服务端日志缺少 traceback"
    fi
    stop_server

    step "[5b/6] 对比: debug=True 时 500 的输出(生产环境必须关 debug)"
    echo "  APP_DEBUG=1 重启一次: ServerErrorMiddleware 先看 debug 再看自定义"
    echo "  handler, 于是堆栈以响应体形式发给了调用方, 500 信封被跳过。"
    start_server "FastAPI(debug=True), 对比用" "$DEBUG_LOG" "APP_DEBUG=1"
    local debug_body
    debug_body="$(curl -sS "$BASE/boom")"
    case "$debug_body" in
        *RuntimeError*) ok "debug 模式: 响应体出现异常名 RuntimeError(堆栈泄漏给调用方)" ;;
        *) fail "预期 debug 输出包含 RuntimeError" ;;
    esac
    echo "  (状态码仍为 500, 但响应是 Starlette 的调试文本/调试页, 不是信封)"
    stop_server

    step "[6/6] 错误契约总览: 四条路径的信封对照"
    cat <<'TABLE'
  1) POST /inventory/deduct  库存不足    -> 409  INVENTORY_SHORTAGE  details={sku,short}       [业务异常处理器]
  2) GET  /inventory/{sku}   未知 SKU    -> 404  NOT_FOUND           details=null              [HTTP 异常处理器]
  3) POST /inventory/deduct  qty=-1      -> 422  VALIDATION_ERROR    details=[{loc,msg,type}]  [校验异常处理器]
  4) GET  /boom              未捕获异常  -> 500  INTERNAL_ERROR      details=null              [兜底处理器(层外)]
TABLE
    echo "  共同点: 四字段信封 + x-request-id 响应头; 500 的堆栈只在服务端日志里。"
    echo "  服务端日志保留在 .run/server.log 与 .run/server_debug.log, 可直接查看。"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server "默认模式, FastAPI(debug=False)" "$SERVER_LOG"
    echo "  试一试:"
    echo "    curl -X POST $BASE/inventory/deduct -H 'Content-Type: application/json' -d '{\"sku\":\"A1001\",\"qty\":2}'"
    echo "    curl $BASE/inventory/X9999"
    echo "    curl $BASE/boom"
    echo "  停止: Ctrl-C"
    wait "$SERVER_PID"
}

cmd_clean() {
    stop_server
    rm -rf "$RUN_DIR"
    echo "已停止服务并清理 $RUN_DIR"
}

PASS_COUNT=0
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
