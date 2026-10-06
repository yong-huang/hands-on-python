#!/usr/bin/env bash
# lab 17 · OAuth2 + JWT 完整链 —— 主演示脚本
#
# 用法:
#   ./17_oauth2_jwt.sh start   # 启动服务(端口 8917), Ctrl-C 停止
#   ./17_oauth2_jwt.sh demo    # 教学演示: 自动起停服务, 跑完 7 个章节(含断言)
#   ./17_oauth2_jwt.sh clean   # 停止服务并删除 .run/
#   ./17_oauth2_jwt.sh all     # clean + demo + clean 全生命周期
#
# 场景: 受保护资源 API。认证链一整条:
#   POST /token   username/password 表单 -> bcrypt 校验 -> 签发 access(60s) + refresh(1h)
#   POST /refresh refresh 令牌换新 access —— 免去重新输密码
#   GET  /me      带 Bearer 令牌 -> 验签名/验 exp/验 type, 三关全过才返回 sub
#   GET  /whoami-open  对照: 无鉴权
# 三道 401 关卡各有一个现场: 密码错 / 篡改 / 过期, 外加 type 误用(refresh 访问 /me)。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8917
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
SERVER_PID=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }

# run_py: 从 stdin 读一段 python 并执行, 透传其余参数; 打印输出并统计 [PASS]
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
    banner "lab 17 · OAuth2 + JWT 完整链 —— 表单换令牌, 签名定真伪"
    echo "  场景: 受保护资源 API。登录不再产生服务端会话, 而是签发自带声明的令牌:"
    echo "  POST /token 用表单里的 username/password 换一对 JWT —— access(60s 短命)"
    echo "  + refresh(1h 长命); 之后每个请求带 Bearer 令牌, 服务器只验签名/exp/type,"
    echo "  不查任何会话表。预置用户 alice(密码 secret123, 库里只存 bcrypt 哈希)。"

    start_server

    # ------------------------------------------------------------------
    step "[1/7] JWT 三段解剖: header.payload.signature, 前两段明文可读"
    echo "  先用正确密码登录, 把拿到的 access 令牌按点号切开、逐段 base64 解码:"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import base64
import json
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


def b64pad(seg: str) -> str:
    return seg + "=" * (-len(seg) % 4)      # base64url 省略了补位 =, 解码前补回


r = httpx.post(f"{base}/token", data={"username": "alice", "password": "secret123"})
print(f'    $ POST {base}/token  (表单: username=alice, password=***)   ->   HTTP {r.status_code}')
check("登录成功拿到双令牌", r.status_code == 200)
pair = r.json()
token = pair["access_token"]
print(f"        access_token = {token[:38]}...{token[-10:]}")
print("        (令牌串每次运行都不同: payload 里带着签发时刻 iat/exp)")
check("响应含 access_token 与 refresh_token 两个字段", "access_token" in pair and "refresh_token" in pair)

h, p, s = token.split(".")
header = json.loads(base64.urlsafe_b64decode(b64pad(h)))
claims = json.loads(base64.urlsafe_b64decode(b64pad(p)))
sig = base64.urlsafe_b64decode(b64pad(s))
print()
print("    ---------------- JWT 三段解剖 (header.payload.signature) ----------------")
print(f"    header   (第1段, 算法说明书): {json.dumps(header, ensure_ascii=False)}")
print(f"    payload  (第2段, 明文声明):   {json.dumps(claims, ensure_ascii=False)}")
print(f"    signature(第3段):             {len(sig)} 字节二进制, hex 前 24 位: {sig.hex()[:24]}...")
print("    --------------------------------------------------------------------------")
check("恰好三段, 点号分隔", len(token.split(".")) == 3)
check("header 声明 alg=HS256 + typ=JWT", header.get("alg") == "HS256" and header.get("typ") == "JWT")
check("payload 带 sub/type/iat/exp 四个声明", all(k in claims for k in ("sub", "type", "iat", "exp")),
      str({k: claims[k] for k in ("sub", "type")}))
check("sub=alice 且 type=access", claims.get("sub") == "alice" and claims.get("type") == "access")
check("exp - iat = 60s (access 的设计寿命)", claims["exp"] - claims["iat"] == 60,
      f"实测 {claims['exp'] - claims['iat']}s")
check("signature 解出 32 字节 (HS256 = HMAC-SHA256, 摘要定长)", len(sig) == 32)
print("    签名段读不出任何含义 —— 它是 SECRET 对前两段的 HMAC 摘要, 不是编码过的内容;")
print("    payload 反而人人可读(base64 不是加密)。改动 payload 任何字符, 服务器重算的")
print("    签名都对不上 —— 章节[4]现场验证。")
raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[2/7] 密码错的现场: wrong-pass 与不存在的用户, 同一句 401"
    echo "  bcrypt 校验不过 -> 401。用户名不存在与密码错误返回同一句文案:"
    echo "  不给攻击者\"这个用户名存在\"的探测线索(防用户名枚举):"
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


r1 = httpx.post(f"{base}/token", data={"username": "alice", "password": "wrong-pass"})
print(f'    $ POST /token (alice / wrong-pass)   ->   HTTP {r1.status_code}')
print(f"        detail = {r1.json()['detail']!r}")
check("密码错 -> 401", r1.status_code == 401)
check("detail 是\"用户名或密码错误\"", r1.json()["detail"] == "用户名或密码错误")
check("WWW-Authenticate: Bearer", r1.headers.get("www-authenticate") == "Bearer")

r2 = httpx.post(f"{base}/token", data={"username": "mallory", "password": "secret123"})
print(f'    $ POST /token (mallory / secret123)  ->   HTTP {r2.status_code}')
print(f"        detail = {r2.json()['detail']!r}")
check("用户不存在 -> 同样 401 + 同一句文案", r2.status_code == 401 and r2.json()["detail"] == "用户名或密码错误")
raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[3/7] 正常访问 /me: Bearer 令牌三关全过 -> 200 + sub; 对照无鉴权端点"
    echo "  Authorization: Bearer <token> —— 服务器验签名/验 exp/验 type, 全过才放行;"
    echo "  对照组 /whoami-open 没有鉴权依赖, 裸访问就 200:"
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


pair = httpx.post(f"{base}/token", data={"username": "alice", "password": "secret123"}).json()
token = pair["access_token"]

r = httpx.get(f"{base}/me", headers={"Authorization": f"Bearer {token}"})
print(f'    $ GET /me  (Authorization: Bearer <access>)   ->   HTTP {r.status_code}')
print(f"        {r.json()}")
check("有效 access 令牌 -> 200", r.status_code == 200)
check("返回 sub=alice", r.json().get("sub") == "alice")
check("返回 type=access", r.json().get("type") == "access")

r_open = httpx.get(f"{base}/whoami-open")
print(f'    $ GET /whoami-open  (对照: 不带任何令牌)      ->   HTTP {r_open.status_code}')
print(f"        {r_open.json()}")
check("公开端点无令牌也 200", r_open.status_code == 200)

r_none = httpx.get(f"{base}/me")
print(f'    $ GET /me  (缺令牌)                           ->   HTTP {r_none.status_code}')
print(f"        detail = {r_none.json()['detail']!r}")
check("缺令牌 -> 401", r_none.status_code == 401)
check("缺令牌也带 WWW-Authenticate: Bearer", r_none.headers.get("www-authenticate") == "Bearer")
raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[4/7] 篡改现场: 改 payload 一个字段 / 翻签名一个字符, 签名校验拦下"
    echo "  把 payload 里的 sub 从 alice 改成 mallory 再原样带上第三段 —— 签名是"
    echo "  SECRET 对\"原 payload\"算的, 内容一动签名就对不上:"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import base64
import json
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


def b64pad(seg: str) -> str:
    return seg + "=" * (-len(seg) % 4)


pair = httpx.post(f"{base}/token", data={"username": "alice", "password": "secret123"}).json()
h, p, s = pair["access_token"].split(".")

# 篡改 1: 解码 payload, 改 sub, 重新编码(第三段原样不动 -> 签名必然对不上)
claims = json.loads(base64.urlsafe_b64decode(b64pad(p)))
claims["sub"] = "mallory"
new_p = base64.urlsafe_b64encode(json.dumps(claims, separators=(",", ":")).encode()).decode().rstrip("=")
forged = f"{h}.{new_p}.{s}"
r1 = httpx.get(f"{base}/me", headers={"Authorization": f"Bearer {forged}"})
print(f'    $ GET /me  (payload: sub: alice -> mallory, 签名段原样)   ->   HTTP {r1.status_code}')
print(f"        detail = {r1.json()['detail']!r}")
check("改 payload -> 401", r1.status_code == 401)
check("detail 指向签名不符", "签名" in r1.json()["detail"])

# 篡改 2: payload 不动, 只把签名段第一个字符翻掉 —— 摘要差一位, 整个作废
sig_char = "A" if s[0] != "A" else "B"
r2 = httpx.get(f"{base}/me", headers={"Authorization": f"Bearer {h}.{p}.{sig_char}{s[1:]}"})
print(f'    $ GET /me  (签名段首字符 {s[0]} -> {sig_char})              ->   HTTP {r2.status_code}')
print(f"        detail = {r2.json()['detail']!r}")
check("改签名一个字符 -> 401", r2.status_code == 401)
check("detail 同样指向签名不符", "签名" in r2.json()["detail"])
print("    签名防的不是\"看\", 是\"改\": SECRET 只在服务器手里, 客户端无法为改过的")
print("    内容算出新签名 —— 这就是\"无状态也敢信令牌\"的全部底气。")
raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[5/7] type 关卡: refresh 令牌签名有效、没过期, 照样进不了 /me"
    echo "  签名只证明\"没被改过\", 不证明\"该走这扇门\"。refresh 令牌由同一个 SECRET"
    echo "  签发, 拿它访问 /me 会签名校验通过, 拦下它的是 type 检查:"
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


pair = httpx.post(f"{base}/token", data={"username": "alice", "password": "secret123"}).json()

r = httpx.get(f"{base}/me", headers={"Authorization": f"Bearer {pair['refresh_token']}"})
print('    $ GET /me  (Bearer <refresh 令牌>)   ->   HTTP %d' % r.status_code)
print(f"        detail = {r.json()['detail']!r}")
check("refresh 访问 /me -> 401", r.status_code == 401)
check("detail 指出需要 access", "access" in r.json()["detail"])

r2 = httpx.post(f"{base}/refresh", json={"refresh_token": pair["access_token"]})
print('    $ POST /refresh  (反向: 拿 access 冒充 refresh)   ->   HTTP %d' % r2.status_code)
print(f"        detail = {r2.json()['detail']!r}")
check("access 访问 /refresh -> 401", r2.status_code == 401)
check("detail 指出需要 refresh", "refresh" in r2.json()["detail"])
print("    教训: 验完签名和 exp 还要验 type —— 漏了它, 1 小时的长命令牌就能顶替")
print("    60 秒的短命令牌, \"短命\"的设计立刻失效。")
raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[6/7] 过期现场: 手造一个已过期的 access -> 401; refresh 换新后复活"
    echo "  access 寿命 60s 是设计值, 不空等 61 秒 —— 用与服务器相同的 demo SECRET"
    echo "  现场造一个 exp 在 10 秒前的令牌, 它与服务器 60s 前真会签出的令牌数学上"
    echo "  等价(签名/exp 校验路径完全相同), 立刻就能看到过期 401:"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import sys
import time

import httpx
import jwt

base = sys.argv[1]
fails = 0
SECRET = "demo-only-secret-key-17-0123456789abcdef"   # 与 main.py 相同的 demo 值(生产从环境注入)


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    extra = f"  ({detail})" if detail else ""
    print(f"        [{'PASS' if ok else 'FAIL'}] {label}{extra}")
    if not ok:
        fails += 1


now = int(time.time())
expired = jwt.encode(
    {"sub": "alice", "type": "access", "iat": now - 70, "exp": now - 10},
    SECRET, algorithm="HS256",
)
r = httpx.get(f"{base}/me", headers={"Authorization": f"Bearer {expired}"})
print('    $ GET /me  (Bearer <exp=now-10s 的 access>)   ->   HTTP %d' % r.status_code)
print(f"        detail = {r.json()['detail']!r}")
check("过期令牌 -> 401", r.status_code == 401)
check("detail 明确提示过期", "过期" in r.json()["detail"])
check("WWW-Authenticate: Bearer", r.headers.get("www-authenticate") == "Bearer")

# 过期了怎么办: 不重输密码, 用 refresh 换一对新的
pair = httpx.post(f"{base}/token", data={"username": "alice", "password": "secret123"}).json()
rr = httpx.post(f"{base}/refresh", json={"refresh_token": pair["refresh_token"]})
print(f'    $ POST /refresh  (Bearer 不需要, body 带 refresh 令牌)   ->   HTTP {rr.status_code}')
check("refresh 换新 -> 200", rr.status_code == 200)
new_pair = rr.json()
check("新令牌同样是双令牌", "access_token" in new_pair and "refresh_token" in new_pair)

r2 = httpx.get(f"{base}/me", headers={"Authorization": f"Bearer {new_pair['access_token']}"})
print('    $ GET /me  (Bearer <换来的新 access>)         ->   HTTP %d' % r2.status_code)
print(f"        {r2.json()}")
check("新 access 访问 /me -> 200 且 sub=alice", r2.status_code == 200 and r2.json().get("sub") == "alice")
print("    exp 的验证点在 decode: jwt.encode 不看 exp 是否已过(本节的过期令牌就是")
print("    encode 造的), jwt.decode 验完签名后拿 exp 与当前时间比, 早了就 401。")
raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[7/7] 双令牌对照表: access 与 refresh 各管一段寿命"
    echo
    cat <<'TABLE'
    +----------------+--------------------------------+--------------------------------+
    | 维度           | access 令牌                    | refresh 令牌                   |
    +----------------+--------------------------------+--------------------------------+
    | 寿命           | 60s (生产常 15min, 能短则短)   | 1h (生产可数天)                |
    | type 声明      | "access"                       | "refresh"                      |
    | 访问 /me       | 三关全过, 200 (章节[3])        | type 不符, 401 (章节[5])       |
    | 调 /refresh    | type 不符, 401 (章节[5])       | 200, 换来新双令牌 (章节[6])    |
    | 过期之后       | 凭 refresh 换新, 免重输密码    | 只能重新走密码登录             |
    | 泄露的代价     | 最多 60s 窗口                  | 1h 窗口, 故配合轮换 + 黑名单   |
    +----------------+--------------------------------+--------------------------------+
TABLE
    echo "  一句话分工: access 是短命门票, 每个请求都要出示; refresh 是办卡凭证,"
    echo "  只在续期时出示一次。把高频使用和高风险暴露分开, 泄露的代价就被压到最短。"
    echo
    echo "  章节速查: [1] 三段解剖, exp-iat=60s | [2] 密码错 401 | [3] /me 200, 缺令牌 401"
    echo "            [4] 篡改 -> 签名 401 | [5] type 误用 401 | [6] 过期 401 + refresh 换新"
    echo "            [7] 本表"
    echo "  服务端日志保留在 $SERVER_LOG"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl -X POST '$BASE/token' -d 'username=alice&password=secret123'"
    echo "    TOKEN=\$(curl -s -X POST '$BASE/token' -d 'username=alice&password=secret123' | .venv/bin/python -c \"import sys,json;print(json.load(sys.stdin)['access_token'])\")"
    echo "    curl '$BASE/me' -H \"Authorization: Bearer \$TOKEN\""
    echo "    curl '$BASE/whoami-open'   # 对照: 无鉴权"
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
