#!/usr/bin/env bash
# lab 01 · 最小应用与参数系统 —— 主演示脚本
#
# 用法:
#   ./01_minimal_app_routing.sh start   # 后台启动服务(端口 8901), 就绪后脚本退出
#   ./01_minimal_app_routing.sh demo    # 教学演示: 自动起停服务, 跑完 6 个章节(含断言)
#   ./01_minimal_app_routing.sh clean   # 停止服务并清理 /tmp 运行时产物
#   ./01_minimal_app_routing.sh all     # clean -> demo -> clean 全生命周期
#
# 场景: 图书检索 API。四类参数(路径 / 查询 / 请求头 / Cookie)的声明、
# 类型转换与 422 校验失败结构(detail[0] 的 loc / msg / type 三字段)。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8901
BASE="http://127.0.0.1:$PORT"
LOG="/tmp/hof01_uvicorn.log"
LAST_RESP="/tmp/hof01_last_resp.json"
COOKIE_JAR="/tmp/hof01_cookies.txt"
SERVER_PID=""

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }
ok() { echo "    [PASS] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "    [FAIL] $*"; exit 1; }
assert_eq() { # desc actual expected
    if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (实际: [$2] / 期望: [$3])"; fi
}

# jget: 从最近一次响应里取字段。表达式形如 d["detail"][0]["loc"](eval 仅供本脚本自用)
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
call_api() { # method path [extra curl args...]
    local method="$1" path="$2"
    shift 2
    STATUS="$(curl -sS -o "$LAST_RESP" -w '%{http_code}' -X "$method" "$BASE$path" "$@")"
    echo "    \$ curl -X $method $BASE$path $*   =>   HTTP $STATUS"
    "$PY" -c '
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    print(json.dumps(json.load(f), ensure_ascii=False, indent=2))
' "$LAST_RESP" | sed 's/^/        /'
}

start_server() {
    : > "$LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$LOG" 2>&1 &
    SERVER_PID=$!
    # readiness 探针: 重试 curl /healthz 直到 200, 不用固定 sleep 猜启动时间
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/healthz" 2>/dev/null; then
            echo "  服务就绪: $BASE (pid=$SERVER_PID)"
            return 0
        fi
        sleep 0.3
    done
    echo "  [FAIL] 服务 18s 内未就绪, 日志尾部:"; tail -20 "$LOG"
    exit 1
}

stop_server() {
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
        SERVER_PID=""
    fi
    # 兜底清扫: 同端口可能有上一个脚本实例(如 ./xx.sh start)留下的残留进程
    if command -v lsof >/dev/null 2>&1; then
        local pids
        pids="$(lsof -ti "tcp:$PORT" 2>/dev/null || true)"
        if [ -n "$pids" ]; then kill $pids 2>/dev/null || true; sleep 0.5; fi
    fi
}

cmd_clean() {
    stop_server
    rm -f "$LOG" "$LAST_RESP" "$COOKIE_JAR"
    echo "已停止服务并清理: $LOG $LAST_RESP $COOKIE_JAR"
}

demo() {
    trap 'stop_server' EXIT   # 异常退出也清理服务进程
    stop_server               # 先清掉可能残留的旧进程
    banner "lab 01 · 最小应用与参数系统 —— 四类参数与 422 现场"
    echo "  场景: 图书检索 API。同一个应用里各放一个端点演示:"
    echo "  路径参数(book_id: int) / 查询参数(page/size/keyword/category) /"
    echo "  请求头(X-Request-Source) / Cookie(last_topic)。"
    echo "  重点观察: 类型转换都发生在进入函数之前, 失败统一是 422 + detail[0]。"

    start_server

    step "[1/6] 最小应用骨架: FastAPI() + 装饰器就是全部"
    echo "  在看什么: main.py 没有配置文件——FastAPI() 建应用, @app.get 建"
    echo "  路由。下面直接 import 内存里的 app 对象打印路由表(不是手写文档)。"
    "$PY" - <<'PYEOF' || fail "路由表断言失败"
from main import app

FRAMEWORK = {"/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}
expected = [
    "/healthz",
    "/books/{book_id}",
    "/books",
    "/request-source",
    "/set-topic",
    "/last-topic",
    "/price-preview",
]
seen = {}
for r in app.routes:
    methods = getattr(r, "methods", None) or set()
    methods = sorted(methods - {"HEAD", "OPTIONS"})
    if methods:
        seen[r.path] = methods
missing = set(expected) - set(seen)
assert not missing, f"路由缺失: {sorted(missing)}"
for path in expected:
    print(f"    {','.join(seen[path]):<5} {path}")
unexpected = set(seen) - FRAMEWORK - set(expected)
assert not unexpected, f"出现意外路由: {sorted(unexpected)}"
PYEOF
    ok "路由表与预期一致(7 条, 另有框架自动注册的 /docs /openapi.json 等)"
    echo "  自动生成的交互文档: $BASE/docs"

    step "[2/6] 路径参数: book_id: int —— 声明即转换"
    echo "  在看什么: 同一条路由, 传 '1002' 得 200, 传 'abc' 得 422——"
    echo "  类型转换发生在进入函数之前, 函数体拿到的永远是干净的 int。"
    call_api GET /books/1002
    assert_eq "GET /books/1002 -> 200" "$STATUS" "200"
    assert_eq "id 已是数字 1002(str 已被转成 int)" "$(jget 'd["id"]')" "1002"
    assert_eq "title 来自内存图书表" "$(jget 'd["title"]')" "FastAPI 实战"
    echo "  对照组: 参数合法但查无此书 -> 404(与 422 的分工)。"
    call_api GET /books/9999
    assert_eq "GET /books/9999 -> 404" "$STATUS" "404"
    echo "  同一条路由传 'abc': int 转换失败 -> 422, detail[0] 三字段是重点。"
    call_api GET /books/abc
    assert_eq "GET /books/abc -> 422" "$STATUS" "422"
    assert_eq "loc: 错在 path 层的 book_id" "$(jget 'd["detail"][0]["loc"]')" '["path", "book_id"]'
    assert_eq "type: int 解析失败" "$(jget 'd["detail"][0]["type"]')" "int_parsing"
    if "$PY" -c '
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
item = d["detail"][0]
assert "msg" in item and "integer" in item["msg"], item
' "$LAST_RESP"; then
        ok "msg 字段存在且描述整数解析失败"
    else
        fail "msg 断言失败"
    fi

    step "[3/6] 查询参数: 默认值、ge/le 约束、可选过滤"
    echo "  在看什么: 不带参数时默认值生效; page=0/size=99 被 ge/le 拦成 422;"
    echo "  keyword/category 不传时是 None 而不是报错。"
    call_api GET /books
    assert_eq "默认 page=1" "$(jget 'd["page"]')" "1"
    assert_eq "默认 size=3(每页 3 条)" "$(jget 'len(d["items"])')" "3"
    assert_eq "total 是全部 8 条" "$(jget 'd["total"]')" "8"
    call_api GET "/books?page=2&size=3"
    assert_eq "翻页: 第 2 页首条 id=1004" "$(jget 'd["items"][0]["id"]')" "1004"
    call_api GET "/books?category=programming"
    assert_eq "category 过滤 -> 4 本编程书" "$(jget 'd["total"]')" "4"
    call_api GET "/books?keyword=python"
    assert_eq "keyword 标题包含(不区分大小写) -> 2 本" "$(jget 'd["total"]')" "2"
    echo "  约束违约: ge=1 / le=20 在进入函数之前拦截。"
    call_api GET "/books?page=0"
    assert_eq "GET /books?page=0 -> 422" "$STATUS" "422"
    assert_eq "loc: query 层的 page" "$(jget 'd["detail"][0]["loc"]')" '["query", "page"]'
    assert_eq "type: ge 违约 greater_than_equal" "$(jget 'd["detail"][0]["type"]')" "greater_than_equal"
    call_api GET "/books?size=99"
    assert_eq "GET /books?size=99 -> 422(le=20)" "$STATUS" "422"
    assert_eq "type: le 违约 less_than_equal" "$(jget 'd["detail"][0]["type"]')" "less_than_equal"

    step "[4/6] 请求头参数: x_request_source <-> X-Request-Source"
    echo "  在看什么: Python 变量名不允许连字符, fastapi.Header 默认把下划线"
    echo "  映射回连字符去找; HTTP 头名不区分大小写。"
    call_api GET /request-source
    assert_eq "未带请求头 -> 默认 unknown" "$(jget 'd["x_request_source"]')" "unknown"
    call_api GET /request-source -H 'X-Request-Source: curl-cli'
    assert_eq "标准写法 X-Request-Source 被读到" "$(jget 'd["x_request_source"]')" "curl-cli"
    call_api GET /request-source -H 'x-request-source: lower-case-ok'
    assert_eq "全小写头同样命中(头名不区分大小写)" "$(jget 'd["x_request_source"]')" "lower-case-ok"

    step "[5/6] Cookie 参数: 先 SET 后 GET"
    echo "  在看什么: Cookie 与 Query 的解析规则相同, 区别只在取值位置;"
    echo "  没有 Cookie 时是 None(可选语义), 写入之后才能读到。"
    rm -f "$COOKIE_JAR"
    call_api GET /last-topic
    assert_eq "未带 Cookie -> null" "$(jget 'd["last_topic"]')" "null"
    call_api POST "/set-topic?topic=cookie-lab" -c "$COOKIE_JAR"
    assert_eq "set-topic -> 200 且写了 Set-Cookie" "$STATUS" "200"
    if grep -q "last_topic" "$COOKIE_JAR"; then
        ok "Cookie Jar 里已保存 last_topic"
    else
        fail "Cookie Jar 未写入 last_topic"
    fi
    call_api GET /last-topic -b "$COOKIE_JAR"
    assert_eq "带 Cookie 再取 -> cookie-lab" "$(jget 'd["last_topic"]')" "cookie-lab"

    step "[6/6] 类型坑: float 不等于'什么都能转'"
    echo "  在看什么: 声明 float 的 discount, 传 0.2 正常计算, 传 'abc' -> 422。"
    echo "  想'函数里再 try/except'是来不及的: 校验发生在函数体之前。"
    call_api GET "/price-preview?price=59&discount=0.2"
    assert_eq "正常路径 -> final=47.2" "$(jget 'd["final"]')" "47.2"
    call_api GET "/price-preview?price=59&discount=abc"
    assert_eq "GET discount=abc -> 422" "$STATUS" "422"
    assert_eq "loc: query 层的 discount" "$(jget 'd["detail"][0]["loc"]')" '["query", "discount"]'
    assert_eq "type: float 解析失败" "$(jget 'd["detail"][0]["type"]')" "float_parsing"

    echo
    echo "  422 现场汇总(三次失败都发生在进入函数体之前):"
    cat <<'TABLE'
    来源    端点 / 传值                   loc                        type
    path    /books/abc                    ["path", "book_id"]        int_parsing
    query   /books?page=0                 ["query", "page"]          greater_than_equal
    query   /price-preview?discount=abc   ["query", "discount"]      float_parsing

    共同结构: {"detail": [ { "loc": [...], "msg": "...", "type": "..." } ]}
TABLE

    stop_server
    trap - EXIT
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    stop_server   # 清掉同端口残留
    start_server
    echo "  试一试:"
    echo "    curl $BASE/books/1002"
    echo "    curl $BASE/books/abc"
    echo "    curl $BASE/books?page=0"
    echo "    curl $BASE/request-source -H 'X-Request-Source: curl-cli'"
    echo "    curl -c $COOKIE_JAR -X POST '$BASE/set-topic?topic=cookie-lab'"
    echo "    curl -b $COOKIE_JAR $BASE/last-topic"
    echo "  交互文档: $BASE/docs    停止: ./$(basename "$0") clean"
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
