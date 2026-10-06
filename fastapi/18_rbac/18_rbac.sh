#!/usr/bin/env bash
# lab 18 · 依赖链做 RBAC —— 主演示脚本
#
# 用法:
#   ./18_rbac.sh start   # 启动服务(端口 8918), Ctrl-C 停止
#   ./18_rbac.sh demo    # 教学演示: 自动起停服务, 跑完 6 个章节(含断言)
#   ./18_rbac.sh clean   # 停止服务并删除 .run/
#   ./18_rbac.sh all     # clean + demo + clean 全生命周期
#
# 场景: 文档管理 API, 预置 alice(admin) 与 bob(user)。授权拆成三层依赖:
#   router 级  Depends(require_login)              —— 401: 登录了吗
#   端点级    Depends(require_role("admin"))       —— 403: 角色够吗
#   对象级    Depends(get_doc_and_check_owner)     —— 403: 这份资源是你的吗
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8918
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
SERVER_PID=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }

# run_py: 从 stdin 读一段 python 并执行, 透传其余参数(第一个参数是 base url)
run_py() {
    "$PY" - "$@"
}

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $SERVER_LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/healthz" 2>/dev/null; then
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

# finish_py: 打印 python 段输出, 统计 [PASS]; rc 非 0 说明有断言失败, 立即退出
finish_py() {
    local out="$1" rc="$2" n
    printf '%s\n' "$out"
    n="$(grep -c '\[PASS\]' <<<"$out" || true)"
    PASS_COUNT=$((PASS_COUNT + n))
    if [ "$rc" -ne 0 ]; then
        echo "    [FAIL] 本节断言未全部通过"
        exit 1
    fi
}

demo() {
    stop_server
    banner "lab 18 · 依赖链做 RBAC —— 认证查票(401), 授权查座位(403)"
    echo "  场景: 文档管理 API。预置 alice(admin) 与 bob(user), 文档两篇:"
    echo "  doc1 归 alice, doc2 归 bob。授权不做在端点函数里, 而是三层依赖:"
    echo "  router 级 require_login -> 端点级 require_role(\"admin\") -> 对象级 owner 检查。"

    start_server

    # ------------------------------------------------------------------
    step "[1/6] 认证 vs 授权: 401 与 403 的语义分界(对照表)"
    echo
    cat <<'TABLE'
    +--------------+--------------------------------+------------------------------------+
    | 维度         | 401 Unauthorized               | 403 Forbidden                      |
    +--------------+--------------------------------+------------------------------------+
    | 回答的问题   | 你是谁?(认证)                  | 你配吗?(授权)                      |
    | 服务器知道   | 不知道用户是谁                 | 明确知道是谁、缺什么               |
    | 触发场景     | 没带令牌/令牌过期/令牌无效     | 登录了, 但角色不够/不是资源 owner  |
    | 规范要求     | 带 WWW-Authenticate 响应头,    | 无须该头; detail 写清缺什么        |
    |              | 告诉客户端凭证怎么带           | (角色名/owner 名)                  |
    | 客户端该做   | 引导登录或重新登录             | 提示无权限, 原样重试没有意义       |
    | 本篇对应的   | get_current_user(认证依赖)     | require_role 工厂 +                |
    | 依赖         |                                | get_doc_and_check_owner            |
    +--------------+--------------------------------+------------------------------------+
TABLE
    echo "  一句话: 401 是\"先买票\", 403 是\"这座位不是你的\"。分界线 = 服务器是否已"
    echo "  把请求关联到一个已知用户。下面 4 章把两种响应都在现场实测出来。"

    # ------------------------------------------------------------------
    step "[2/6] 未登录: 无令牌访问 /docs-list -> 401, 且必须带 WWW-Authenticate"
    echo "  请求没经过认证依赖的放行, 连用户是谁都不知道, router 级闸直接 401:"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import sys

import httpx

base = sys.argv[1]
fails = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    extra = f"  ({detail})" if detail else ""
    print(f"        [{'PASS' if ok else 'FAIL'}] {label}{extra}")
    if not ok:
        fails += 1


# 一发子弹: 完全不带 Authorization 头
r = httpx.get(f"{base}/docs-list")
body = r.json()
print(f'    $ GET {base}/docs-list   (无 Authorization 头)')
print(f"        -> HTTP {r.status_code}  detail={body['detail']!r}")
check("无令牌 -> 401", r.status_code == 401, f"实测 {r.status_code}")
www = r.headers.get("www-authenticate", "")
check("WWW-Authenticate: Bearer 响应头存在", "Bearer" in www, www)
check("detail 说的缺登录(401 语义), 不是缺角色", "登录" in body["detail"])

# 对照: 带了令牌但是伪造的, 同样停在认证层
r2 = httpx.get(f"{base}/docs-list", headers={"Authorization": "Bearer not-a-jwt"})
print(f'    $ GET {base}/docs-list   (Authorization: Bearer not-a-jwt)')
print(f"        -> HTTP {r2.status_code}  detail={r2.json()['detail']!r}")
check("伪造令牌 -> 同样 401(身份仍未知)", r2.status_code == 401, f"实测 {r2.status_code}")
check("WWW-Authenticate 头依然存在", "Bearer" in r2.headers.get("www-authenticate", ""))

raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[3/6] 登录但角色不够: bob(user) 调 POST /docs -> 403"
    echo "  bob 先 POST /token 拿到令牌——认证这一关过了; 端点级角色闸"
    echo "  require_role(\"admin\") 在端点函数之前拦下他, 403 的 detail 写清角色差距:"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import sys

import httpx

base = sys.argv[1]
fails = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    extra = f"  ({detail})" if detail else ""
    print(f"        [{'PASS' if ok else 'FAIL'}] {label}{extra}")
    if not ok:
        fails += 1


def login(client: httpx.Client, username: str, password: str) -> str:
    r = client.post(f"{base}/token", data={"username": username, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


with httpx.Client() as client:
    bob_token = login(client, "bob", "bob-pw")
    print("    $ POST /token  (bob / bob-pw)  ->  200, 令牌已签发")

    # 对照组: 同一个 bob, 登录后访问登录即可看的端点, 放行
    r_list = client.get(f"{base}/docs-list", headers={"Authorization": f"Bearer {bob_token}"})
    print(f"    $ GET /docs-list  (bob 的令牌)")
    print(f"        -> HTTP {r_list.status_code}  you={r_list.json()['you']!r} role={r_list.json()['role']!r}")
    check("bob 已登录: GET /docs-list -> 200(对照: 401 不会出现)", r_list.status_code == 200)

    r = client.post(f"{base}/docs", data={"title": "bob 想建的文档"},
                    headers={"Authorization": f"Bearer {bob_token}"})
    body = r.json()
    print(f'    $ POST /docs  title="bob 想建的文档"  (bob 的令牌, 角色 user)')
    print(f"        -> HTTP {r.status_code}  detail={body['detail']!r}")
    check("bob 调 POST /docs -> 403", r.status_code == 403, f"实测 {r.status_code}")
    check("detail 含需要的目标角色 admin", "admin" in body["detail"])
    check("detail 含 bob 的实际角色 user", "user" in body["detail"])
    check("403 没带 WWW-Authenticate(那是 401 的规范要求)",
          "www-authenticate" not in r.headers)

raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[4/6] admin 放行: alice 携同等请求再来 -> 201"
    echo "  请求一字不改, 换 alice 的令牌: 同一道 require_role(\"admin\") 闸, 这次放行。"
    echo "  拦与不拦的差异只来自令牌里的身份——这正是\"授权做进依赖\"的含义:"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import sys

import httpx

base = sys.argv[1]
fails = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    extra = f"  ({detail})" if detail else ""
    print(f"        [{'PASS' if ok else 'FAIL'}] {label}{extra}")
    if not ok:
        fails += 1


with httpx.Client() as client:
    r_tok = client.post(f"{base}/token", data={"username": "alice", "password": "alice-pw"})
    r_tok.raise_for_status()
    alice_token = r_tok.json()["access_token"]

    r = client.post(f"{base}/docs", data={"title": "发布清单 v1（alice 建）"},
                    headers={"Authorization": f"Bearer {alice_token}"})
    body = r.json()
    print(f'    $ POST /docs  title="发布清单 v1（alice 建）"  (alice 的令牌, 角色 admin)')
    print(f"        -> HTTP {r.status_code}  {body}")
    check("alice 调 POST /docs -> 201", r.status_code == 201, f"实测 {r.status_code}")
    check("新文档 id=3(进程内发号器, 确定性)", body["id"] == 3, f"id={body['id']}")
    check("owner 自动记为 alice(来自认证依赖, 不由客户端声明)", body["owner"] == "alice")

    r_list = client.get(f"{base}/docs-list", headers={"Authorization": f"Bearer {alice_token}"})
    titles = [d["title"] for d in r_list.json()["docs"]]
    print(f"    $ GET /docs-list  (alice 的令牌)  ->  {[d['id'] for d in r_list.json()['docs']]}")
    check("列表里能看到新文档", any(d["id"] == 3 for d in r_list.json()["docs"]), f"titles={titles}")

raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[5/6] 对象级权限: bob 删自己的文档 -> 204; 删 admin 的文档 -> 403"
    echo "  DELETE /docs/{id} 不挂角色闸, 挂的是对象级依赖 get_doc_and_check_owner:"
    echo "  admin 或该文档 owner 才能删。同一个 bob、同一条规则, 资源不同答案不同:"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import sys

import httpx

base = sys.argv[1]
fails = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    extra = f"  ({detail})" if detail else ""
    print(f"        [{'PASS' if ok else 'FAIL'}] {label}{extra}")
    if not ok:
        fails += 1


with httpx.Client() as client:
    r_tok = client.post(f"{base}/token", data={"username": "bob", "password": "bob-pw"})
    r_tok.raise_for_status()
    bob_token = r_tok.json()["access_token"]
    auth = {"Authorization": f"Bearer {bob_token}"}

    # 分支一: doc2 是 bob 自己的 -> owner 放行
    r_own = client.delete(f"{base}/docs/2", headers=auth)
    print(f"    $ DELETE /docs/2  (bob 的令牌; doc2 的 owner 就是 bob)")
    print(f"        -> HTTP {r_own.status_code}")
    check("bob 删自己的文档 -> 204", r_own.status_code == 204, f"实测 {r_own.status_code}")

    # 分支二: doc1 是 alice 的 -> 不是 owner 也不是 admin, 403
    r_other = client.delete(f"{base}/docs/1", headers=auth)
    body = r_other.json()
    print(f"    $ DELETE /docs/1  (bob 的令牌; doc1 的 owner 是 alice)")
    print(f"        -> HTTP {r_other.status_code}  detail={body['detail']!r}")
    check("bob 删 admin 的文档 -> 403", r_other.status_code == 403, f"实测 {r_other.status_code}")
    check("detail 点名 owner 与 admin", "alice" in body["detail"] and "admin" in body["detail"])

    # 分支三(边界): 资源不存在是 404, 与权限无关
    r_missing = client.delete(f"{base}/docs/99", headers=auth)
    print(f"    $ DELETE /docs/99  (不存在的文档)")
    print(f"        -> HTTP {r_missing.status_code}  detail={r_missing.json()['detail']!r}")
    check("不存在的文档 -> 404(先查资源, 再查归属)", r_missing.status_code == 404)

    r_list = client.get(f"{base}/docs-list", headers=auth)
    ids = sorted(d["id"] for d in r_list.json()["docs"])
    print(f"    $ GET /docs-list  (bob 的令牌)  ->  剩余文档 id={ids}")
    check("doc2 已删、doc1/3 仍在", ids == [1, 3], f"实测 {ids}")

raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[6/6] 模式总览: 三层依赖的分层结构(文字版)"
    echo
    cat <<'TABLE'
    请求(带 Bearer 令牌)
      │
      ▼
    ┌─ APIRouter(dependencies=[Depends(require_login)]) ──────────── router 级
    │     require_login ──Depends──> get_current_user
    │                                  解码 JWT -> User; 失败: 401 + WWW-Authenticate
    │                                                  │
    │   ┌─────────────────────┬──────────────────────┐ │ 通过后按端点叠加
    │   ▼                     ▼                      ▼ ▼
    │  GET /docs-list      POST /docs            DELETE /docs/{id}
    │  (无额外闸,          Depends(require_role  Depends(get_doc_and_check_owner)
    │   登录即可)           ("admin"))            同时收 doc_id(路径参数)+user
    │                      失败: 403 角色不足      admin 或 owner 才放行
    │                                              失败: 403 owner 不足 / 404 无此资源
    └──────────────────────────────────────────────────────────────────────
      │ 全部通过
      ▼
    端点函数: 只剩业务代码, 无一行权限 if
TABLE
    echo
    echo "  三层各自复用 get_current_user, 依赖缓存保证同一请求里 JWT 只解码一次;"
    echo "  新增端点时按需\"叠\"闸, 忘写权限判断在结构上不再可能。"
    echo
    echo "  章节速查: [1] 401/403 对照表 | [2] 无令牌 401 + WWW-Authenticate"
    echo "            [3] bob 建文档 403(角色说明) | [4] alice 同请求 201"
    echo "            [5] bob 删自己 204 / 删 admin 403 | [6] 分层结构图"
    echo "  服务端日志保留在 $SERVER_LOG"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl -i '$BASE/docs-list'                                    # 401 现场"
    echo "    curl -s -X POST '$BASE/token' -d 'username=bob&password=bob-pw'  # 领令牌"
    echo "    curl -i -X POST '$BASE/docs' -H \"Authorization: Bearer <令牌>\" -d 'title=x'  # bob: 403"
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
