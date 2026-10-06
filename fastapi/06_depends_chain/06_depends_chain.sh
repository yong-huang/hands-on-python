#!/usr/bin/env bash
# lab 06 · Depends 依赖链 —— 主演示脚本
#
# 用法:
#   ./06_depends_chain.sh start   # 启动服务(端口 8906), Ctrl-C 停止
#   ./06_depends_chain.sh demo    # 教学演示: 自动起停服务, 跑完 5 个章节(含断言)
#   ./06_depends_chain.sh clean   # 停止服务, 删除 .run/
#   ./06_depends_chain.sh all     # clean + demo + clean 全生命周期
#
# 场景: 文章发布 API。三层依赖链 settings(读配置) -> db(伪会话) -> user(当前用户)。
# 每个依赖被调用时向 TRACE 追加一条记录, GET /trace 读走记录并清空, 断言全靠它。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8906
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
LAST_RESP="$RUN_DIR/last_resp.json"
SERVER_PID=""
STATUS=""
TRACE_VAL=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }
ok() { echo "    [PASS] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "    [FAIL] $*"; exit 1; }
assert_eq() { # desc actual expected
    if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (实际: [$2] / 期望: [$3])"; fi
}

# jget: 从最近一次响应里取字段。表达式形如 d["trace"][3]（eval 仅供本脚本自用）
jget() {
    "$PY" -c '
import json, sys
with open(sys.argv[2], encoding="utf-8") as f:
    d = json.load(f)
v = eval(sys.argv[1])
print(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
' "$1" "$LAST_RESP"
}

show_resp() { # 打印请求描述与最近一次响应(美化 JSON)
    echo "    \$ $1   =>   HTTP $STATUS"
    "$PY" -c '
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    print(json.dumps(json.load(f), ensure_ascii=False, indent=2))
' "$LAST_RESP" | sed 's/^/        /'
}

# fetch_trace: 用 httpx 读取并清空执行记录。/trace 读取即清空, 是本实验的观测方式:
# 每个章节的请求产生的记录被整段读走, 下个章节从零开始。响应同时写入 LAST_RESP,
# 让后续的 jget 断言(取 trace 长度、下标)与 show_resp 的打印口径保持一致。
fetch_trace() {
    local out
    out="$("$PY" - "$LAST_RESP" "$BASE" <<'PYEOF'
import json
import sys

import httpx

r = httpx.get(sys.argv[2] + "/trace", timeout=5)
r.raise_for_status()
with open(sys.argv[1], "w", encoding="utf-8") as f:
    json.dump(r.json(), f, ensure_ascii=False, indent=2)
print(r.status_code)
print(json.dumps(r.json()["trace"], ensure_ascii=False))
PYEOF
)"
    STATUS="$(printf '%s\n' "$out" | head -n 1)"
    TRACE_VAL="$(printf '%s\n' "$out" | tail -n 1)"
    echo "    \$ httpx GET $BASE/trace   =>   HTTP $STATUS"
    echo "        trace = $TRACE_VAL"
}

assert_trace() { # desc expected_json_list —— 断言 /trace 的执行记录逐项一致
    assert_eq "$1" "$TRACE_VAL" "$2"
}

get() { # path
    STATUS="$(curl -sS -o "$LAST_RESP" -w '%{http_code}' "$BASE$1")"
    show_resp "curl $BASE$1"
}

post_json() { # path body [header ...] —— 额外参数原样传给 curl(传请求头用)
    local path="$1" body="$2"
    shift 2
    local args=(-sS -o "$LAST_RESP" -w '%{http_code}' -X POST "$BASE$path" -H 'Content-Type: application/json' -d "$body")
    local h shown=""
    for h in "$@"; do
        args+=(-H "$h")
        shown="$shown-H $h "
    done
    STATUS="$(curl "${args[@]}")"
    show_resp "curl -X POST $path -d '$body' ${shown}"
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
    banner "lab 06 · Depends 依赖链 —— 深度优先解析、每请求缓存与 use_cache=False"
    echo "  场景: 文章发布 API。三层依赖链: settings(读配置) -> db(伪会话, 依赖配置)"
    echo "  -> user(查会话取当前用户, 依赖 db)。端点只声明需要的层, 链由 FastAPI 补齐。"
    echo "  观测手段: 每个依赖被调用的第一行向 TRACE 追加一条记录, /trace 读走并清空。"

    start_server

    step "[1/5] 依赖链总览: 端点只声明 user, FastAPI 沿 Depends 深度优先补齐三层"
    cat <<'EOF'
        GET /posts 端点函数
          └─ get_current_user        第三层: 查会话取当前用户
               └─ get_db             第二层: 伪数据库会话
                    └─ get_settings  第一层: 应用配置(链的根)
EOF
    echo "  解析规则: 深度优先下钻到链的根, 根先执行, 返回值沿链向下传;"
    echo "  全部依赖执行完之前, 端点函数体一行都不会跑。下面用 /trace 实测。"

    step "[2/5] 一次请求的执行顺序: settings -> db -> user, 端点函数在最后"
    get /posts
    assert_eq "GET /posts 状态码 200" "$STATUS" "200"
    assert_eq "作者来自第三层依赖 user" "$(jget 'd["author"]')" "alice"
    assert_eq "dsn 来自第一层 settings(值沿链传递的证据)" "$(jget 'd["db_dsn"]')" "pseudo://localhost/articles"
    fetch_trace
    assert_trace "执行记录恰为 settings,db,user" '["settings", "db", "user"]'

    step "[3/5] 每请求缓存: 新请求整条链重跑, 同一请求内不重复"
    echo "  /posts 声明了 user 和 db 两个参数: db 与 user 链上的是同一个函数, 第二次"
    echo "  出现命中缓存不再执行——所以一轮请求留下的记录是 3 条而不是 4 条。"
    get /posts
    assert_eq "再次 GET /posts 状态码 200" "$STATUS" "200"
    fetch_trace
    assert_trace "新请求从 settings 重新开始(缓存跨请求重置)" '["settings", "db", "user"]'
    assert_eq "记录数=3: 请求内 db 参数命中缓存未重跑" "$(jget 'len(d["trace"])')" "3"

    step "[4/5] use_cache=False 对照: 同一依赖在一次请求里执行两次"
    echo "  /posts/draft 声明 user_a(走缓存)与 user_b(use_cache=False): user_b 绕过"
    echo "  缓存重新执行 get_current_user, 多出一条 user 记录; 它的子依赖 settings/db"
    echo "  仍是默认 use_cache=True, 照常命中缓存, 不跟着重跑。"
    get /posts/draft
    assert_eq "GET /posts/draft 状态码 200" "$STATUS" "200"
    assert_eq "两次解析都拿到 alice" "$(jget 'd["author_b"]')" "alice"
    assert_eq "绕过缓存 -> 两个 User 是不同对象" "$(jget 'd["same_object"]')" "false"
    fetch_trace
    assert_trace "记录 4 条: user 出现两次" '["settings", "db", "user", "user"]'
    assert_eq "多出的第 4 条(下标 3)正是重复的 user" "$(jget 'd["trace"][3]')" "user"

    step "[5/5] 依赖里抛 HTTPException: 链被短路, 端点函数体未执行"
    echo "  POST /posts 第一个参数是令牌校验依赖: 校验失败立即抛 403, 排在后面的"
    echo "  current_user 三层链还没开始解析——空 trace 就是证据(连根都没执行)。"
    post_json /posts '{"title":"缓存实测"}' "X-Auth-Token: wrong-token"
    assert_eq "令牌错误 -> 状态码 403" "$STATUS" "403"
    assert_eq "错误详情来自依赖里的 HTTPException" "$(jget 'd["detail"]')" "发布令牌无效"
    fetch_trace
    assert_trace "校验失败: 一条记录都没有" '[]'
    echo "  对照组: 令牌正确时链照常执行, 且 token 是第 1 条(参数顺序=解析顺序)。"
    post_json /posts '{"title":"缓存实测"}' "X-Auth-Token: lab06-publish-token"
    assert_eq "令牌正确 -> 状态码 200" "$STATUS" "200"
    assert_eq "发布作者来自依赖链" "$(jget 'd["author"]')" "alice"
    fetch_trace
    assert_trace "token 最先执行, 三层链随后" '["token", "settings", "db", "user"]'

    echo
    echo "  章节速查: [2] 顺序 settings→db→user | [3] 跨请求重置/请求内去重"
    echo "            [4] 4 条记录, user 在下标 3 重复 | [5] 403 短路, trace 为空"
    echo "  服务端日志保留在 .run/server.log"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl $BASE/posts"
    echo "    curl $BASE/posts/draft"
    echo "    curl $BASE/trace"
    echo "    curl -X POST $BASE/posts -H 'Content-Type: application/json' -H 'X-Auth-Token: lab06-publish-token' -d '{\"title\":\"demo\"}'"
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
