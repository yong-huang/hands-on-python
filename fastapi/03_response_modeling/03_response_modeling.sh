#!/usr/bin/env bash
# lab 03 · 响应建模 —— 主演示脚本
#
# 用法:
#   ./03_response_modeling.sh start   # 启动服务, Ctrl-C 停止
#   ./03_response_modeling.sh demo    # 教学演示: 自动起停服务, 跑完 7 个章节(含断言)
#   ./03_response_modeling.sh clean   # 停止服务并清理运行时产物(.run/ 与 /tmp 的 CSV)
#   ./03_response_modeling.sh all     # clean + demo + clean 全生命周期
#
# 场景: 用户资料 API。核心是一条"返回值 -> HTTP 字节"的出口管线:
#   response_model 出口闸裁剪 -> 状态码声明 -> 五类响应形态(JSON/HTML/重定向/流式/文件)
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8903
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
LAST_RESP="$RUN_DIR/last_resp.json"      # JSON 响应体
HEADERS="$RUN_DIR/headers.txt"           # 最近一次响应的原始响应头
BODY="$RUN_DIR/body.txt"                 # 最近一次响应的原始响应体
CSV_PATH="/tmp/hands-on-python-lab03-users.csv"   # 必须与 main.py 的 CSV_PATH 一致
SERVER_PID=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }
ok() { echo "    [PASS] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "    [FAIL] $*"; exit 1; }
assert_eq() { # desc actual expected
    if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (实际: [$2] / 期望: [$3])"; fi
}

# jget: 从最近一次 JSON 响应里取字段。表达式形如 d["username"]（eval 仅供本脚本自用）
jget() {
    "$PY" -c '
import json, sys
with open(sys.argv[2], encoding="utf-8") as f:
    d = json.load(f)
v = eval(sys.argv[1])
print(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
' "$1" "$LAST_RESP"
}

# call_api: JSON 请求, 打印命令/状态码/美化响应体, 留下 $STATUS 与 LAST_RESP
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

# fetch: 任意 GET 请求, 响应头/响应体分别落盘, 保留 $STATUS; 响应体同时镜像到
# LAST_RESP, 之后可以无缝接 jget(响应体不是 JSON 时 jget 不可用, 但没有章节这么做)
fetch() { # path [extra-curl-args...]
    local path="$1"; shift
    STATUS="$(curl -sS -o "$BODY" -D "$HEADERS" -w '%{http_code}' "$BASE$path" "$@")"
    cp "$BODY" "$LAST_RESP"
}
# header_of: 从 HEADERS 里取某个响应头的值(大小写不敏感)
header_of() { # header-name
    grep -i "^$1:" "$HEADERS" | head -1 | tr -d '\r' | cut -d' ' -f2-
}

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $SERVER_LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/stats" 2>/dev/null; then
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

cmd_clean() {
    stop_server
    rm -rf "$RUN_DIR"
    rm -f "$CSV_PATH"
    echo "已停止服务并清理 $RUN_DIR 与 $CSV_PATH"
}

demo() {
    stop_server
    banner "lab 03 · 响应建模 —— 返回值从函数到 HTTP 字节"
    echo "  场景: 用户资料 API。UserIn 收 password, UserOut(对外契约)没有 password"
    echo "  与 internal_risk_score —— 挂上 response_model 这道出口闸, 敏感字段就出不去。"
    echo "  后半场演示五类响应形态与各自的边界: JSON/HTML/重定向/流式/文件。"

    start_server

    step "[1/7] 出口闸: POST /users 收下 password, 响应里却找不到它"
    echo "  端点返回的内部记录含 password 与 internal_risk_score, 但装饰器声明了"
    echo "  response_model=UserOut: FastAPI 按白名单重新校验, 多余的键直接丢弃。"
    call_api POST /users '{"username":"alice","email":"alice@example.com","password":"alice-pw-2014","bio":"learning fastapi"}'
    assert_eq "状态码 201(status_code 声明)" "$STATUS" "201"
    assert_eq "响应字段恰好是 UserOut 四字段" "$(jget 'sorted(d.keys())')" '["bio", "email", "id", "username"]'
    if grep -q 'password\|internal_risk_score\|alice-pw-2014' "$LAST_RESP"; then
        fail "出口闸失效: 敏感字段出现在响应字节里"
    else
        ok "响应字节里没有 password / internal_risk_score / 密码明文"
    fi

    step "[2/7] 反面教材: POST /users/legacy —— 忘挂 response_model 的对照端点"
    echo "  同样的内部记录, 不挂 response_model: 返回注解 dict[str, Any] 不做任何"
    echo "  裁剪, 函数内部长什么样, 对外 JSON 就长什么样 —— 字段泄漏现场。"
    call_api POST /users/legacy '{"username":"eve","email":"eve@example.com","password":"eve-pw-99","bio":"对照实验"}'
    assert_eq "状态码 200(未声明 status_code)" "$STATUS" "200"
    assert_eq "password 泄漏在响应里(警示)" "$(jget 'd["password"]')" "eve-pw-99"
    assert_eq "internal_risk_score 泄漏在响应里(警示)" "$(jget 'd["internal_risk_score"]')" "0.3"
    assert_eq "字段集合 = 函数返回值的全部键" "$(jget 'sorted(d.keys())')" \
        '["bio", "email", "id", "internal_risk_score", "password", "username"]'

    step "[3/7] 状态码声明: 201 Created 与 Location 的语义"
    echo "  装饰器声明 status_code=201: 告诉框架与文档'成功 = 建了新资源';"
    echo "  201 的惯例是再给 Location 头, 指明新资源在哪取 —— 端点里手写了一行。"
    STATUS="$(curl -sS -o "$BODY" -D "$HEADERS" -w '%{http_code}' -X POST "$BASE/users" \
        -H 'Content-Type: application/json' \
        -d '{"username":"dave","email":"dave@example.com","password":"dave-pw-1337"}')"
    echo "    \$ curl -i -X POST /users -d '{...dave...}'   =>   HTTP $STATUS"
    grep -i '^HTTP/\|^location:' "$HEADERS" | sed 's/^/        /'
    assert_eq "状态码 201" "$STATUS" "201"
    assert_eq "Location 头指向新资源" "$(header_of location)" "/users/5"
    fetch /users/5
    assert_eq "顺着 Location 取回新资源" "$(jget 'd["username"]')" "dave"

    step "[4/7] HTML 响应: Content-Type 从 application/json 换成 text/html"
    echo "  /html 返回手工构造的 HTMLResponse; /html-class 只返回 str, 由"
    echo "  response_class=HTMLResponse 负责包装 —— 两种写法, 同一个头。"
    fetch /html
    assert_eq "状态码 200" "$STATUS" "200"
    assert_eq "/html 的 Content-Type" "$(header_of content-type)" "text/html; charset=utf-8"
    grep -q "<h1>lab03 · 响应建模</h1>" "$BODY" && ok "响应体是 HTML 页面" || fail "HTML 页面内容不符"
    fetch /html-class
    assert_eq "/html-class 的 Content-Type" "$(header_of content-type)" "text/html; charset=utf-8"
    echo "    (响应体: $(cat "$BODY"))"

    step "[5/7] 重定向: 先看 307 与 Location, 再让 curl -L 跟一跳"
    echo "  RedirectResponse 默认 307 Temporary Redirect; GET 场景它与 302 等效,"
    echo "  差别在 POST: 307 保证重定向后仍是 POST, 302 会被浏览器偷换成 GET。"
    fetch /redirect
    assert_eq "重定向状态码 307" "$STATUS" "307"
    assert_eq "Location 指向 /html" "$(header_of location)" "/html"
    FOLLOWED="$(curl -sS -L "$BASE/redirect")"
    case "$FOLLOWED" in
        *"<h1>lab03 · 响应建模</h1>"*) ok "curl -L 跟随重定向, 拿到了 /html 的页面" ;;
        *) fail "跟随重定向后未拿到目标页面" ;;
    esac

    step "[6/7] 流式响应: 三块文本逐块到达, 没有应用层 Content-Length"
    echo "  StreamingResponse 用生成器逐块 yield, 每块间隔 0.4s; 下面的客户端"
    echo "  按到达时刻打印每一块 —— 时间差就是'边生成边发送'的直接证据。"
    "$PY" - "$BASE/stream" <<'PYEOF'
import sys, time, httpx

expected = [
    "block 1: 状态码与响应头已发出,正文开始流动\n",
    "block 2: 数据仍在生成,逐块发送,不攒成完整正文\n",
    "block 3: 生成完毕,连接关闭\n",
]
t0 = time.monotonic()
arrived = []
with httpx.stream("GET", sys.argv[1]) as r:
    assert r.status_code == 200, r.status_code
    print(f"    状态码 {r.status_code} 先到(此时正文一块都还没生成完)")
    for chunk in r.iter_text():
        arrived.append((time.monotonic() - t0, chunk))
for n, (dt, chunk) in enumerate(arrived, 1):
    print(f"    块 {n}: +{dt:.2f}s  收到 {len(chunk.encode())} 字节: {chunk.rstrip()!r}")
body = "".join(c for _, c in arrived)
assert [c for _, c in arrived] == expected, f"块内容/顺序不符: {arrived}"
print(f"    [PASS] 3 块按序到达, 拼接结果与预期逐字节一致(共 {len(body.encode())} 字节)")
PYEOF
    ok "流式断言: 块数=3、顺序正确、拼接一致"

    step "[7/7] 文件下载: FileResponse 带 Content-Disposition, 字节级一致"
    echo "  CSV 在进程启动时生成于 $CSV_PATH(只含 2 个种子用户, 注册的"
    echo "  用户不在里面)。filename 参数会生成 attachment 头, 浏览器据此'另存为'。"
    DL="$RUN_DIR/downloaded.csv"
    fetch /download
    assert_eq "状态码 200" "$STATUS" "200"
    assert_eq "Content-Disposition 触发下载" "$(header_of content-disposition)" 'attachment; filename="users.csv"'
    curl -sS -o "$DL" "$BASE/download"
    if cmp -s "$DL" "$CSV_PATH"; then
        ok "下载文件与磁盘上的 CSV 逐字节一致($(wc -c < "$DL" | tr -d ' ') 字节)"
    else
        fail "下载内容与源文件不一致"
    fi
    echo "    (文件内容:)"
    sed 's/^/        /' "$DL"

    stop_server
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl -i -X POST $BASE/users -H 'Content-Type: application/json' -d '{\"username\":\"frank\",\"email\":\"f@x.com\",\"password\":\"frank-pw-1\"}'"
    echo "    curl -i $BASE/redirect   # 307 + Location, 再加 -L 跟随"
    echo "    curl -N $BASE/stream     # 三块文本逐块到达"
    echo "    curl -OJ $BASE/download  # 按 Content-Disposition 存文件"
    echo "  停止: Ctrl-C"
    wait "$SERVER_PID"
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
