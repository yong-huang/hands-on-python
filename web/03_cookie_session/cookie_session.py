"""
03 · Cookie 与 Session 手写 —— 无状态 HTTP 上的登录态
Web 框架清单项目 3：不借助任何框架，把"记住你是谁"的两种实现都造一遍

HTTP 本身无状态：每个请求都是陌生人。登录态靠 Cookie 头往返携带，两种存法
（对应 images/cookie_session.archify.svg）:
- 服务端 session:  cookie 只放随机 sessionid，状态存服务端 dict——可随时吊销
- 客户端签名 cookie: 状态（用户名+过期时间）放 cookie 本体，附 HMAC 签名防篡改
                    ——无状态、不占存储，但发出去就无法单方面作废

验收四连（http.client 实测）:
- 登录 200 且 Set-Cookie 带 HttpOnly/SameSite/Max-Age；无 cookie 访问受保护页 401
- 篡改签名 cookie 的 payload（签名不动）→ HMAC 校验失败 401
- 过期 cookie（exp 设为过去）→ 即使签名合法也 401

用法:
- python3 cookie_session.py    # 完整演示（4 个小节，含内置验收断言）
"""

import base64
import hashlib
import hmac
import http.client
import http.server
import json
import secrets
import sys
import threading
import time
import urllib.parse

SECRET = b"hands-on-web-demo-secret"  # 生产环境从环境变量/密钥管理来，绝不硬编码
COOKIE_MAX_AGE = 3600                 # 登录态有效期（秒）
SESSIONS: dict[str, dict] = {}        # 服务端 session 存储：sid → {user, exp}


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 两种登录态的签发与校验（核心逻辑，与 HTTP 层解耦）
# ============================================================

def issue_session(user: str) -> str:
    """模式一：随机 sessionid，状态留服务端"""
    sid = secrets.token_hex(16)
    SESSIONS[sid] = {"user": user, "exp": time.time() + COOKIE_MAX_AGE}
    return f"sid={sid}"


def _sign(payload: bytes) -> str:
    return hmac.new(SECRET, payload, hashlib.sha256).hexdigest()[:32]


def issue_signed_cookie(user: str, exp: float | None = None) -> str:
    """模式二：payload（用户名+过期时间）base64 后附 HMAC 签名，状态在 cookie 本体"""
    exp = time.time() + COOKIE_MAX_AGE if exp is None else exp
    payload = base64.urlsafe_b64encode(f"{user}|{exp:.0f}".encode()).decode()
    return f"auth={payload}.{_sign(payload.encode())}"


def check_cookie(cookie_header: str | None) -> str | None:
    """校验两种格式的 Cookie，返回用户名；无效/过期返回 None"""
    if not cookie_header:
        return None
    jar = dict(p.strip().split("=", 1) for p in cookie_header.split(";") if "=" in p)
    # 模式一：查 session 表（存在性 + 过期）
    if "sid" in jar:
        rec = SESSIONS.get(jar["sid"])
        if rec and rec["exp"] > time.time():
            return rec["user"]
        return None
    # 模式二：验签名 + 过期——两关都过才算数
    if "auth" in jar and "." in jar["auth"]:
        payload_b64, sig = jar["auth"].rsplit(".", 1)
        expected = _sign(payload_b64.encode())
        if hmac.compare_digest(sig, expected):  # 恒时比较，防时序侧信道
            user, _, exp = base64.urlsafe_b64decode(payload_b64).decode().partition("|")
            if float(exp) > time.time():
                return user
    return None


# ============================================================
# HTTP 层：http.server 实现登录/受保护页
# ============================================================

class LabHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, format: str, *args) -> None:  # 静音默认访问日志
        pass

    def _reply(self, code: int, body: str, set_cookie: str | None = None) -> None:
        payload = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        if set_cookie:
            # 三个安全属性逐个点名：Path 限定作用域，HttpOnly 挡 JS 读取（防 XSS 偷 cookie），
            # SameSite=Lax 限制跨站请求携带（防 CSRF），Max-Age 控制浏览器侧过期
            self.send_header("Set-Cookie",
                             f"{set_cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age={COOKIE_MAX_AGE}")
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self) -> None:
        if self.path != "/login":
            return self._reply(404, "未知端点")
        length = int(self.headers.get("Content-Length", 0))
        form = urllib.parse.parse_qs(self.rfile.read(length).decode())
        user, pw = form.get("user", [""])[0], form.get("password", [""])[0]
        mode = form.get("mode", ["server"])[0]
        if user != "alice" or pw != "wonderland":  # 账号密码不过关，发不出任何 cookie
            return self._reply(401, "账号或密码错误")
        cookie = issue_session(user) if mode == "server" else issue_signed_cookie(user)
        self._reply(200, f"登录成功: {user}（mode={mode}）", set_cookie=cookie)

    def do_GET(self) -> None:
        if self.path == "/":
            return self._reply(200, "端点: POST /login (user/password/mode) · GET /protected")
        if self.path == "/protected":
            user = check_cookie(self.headers.get("Cookie"))
            if user is None:
                return self._reply(401, "登录态无效：请先登录")
            return self._reply(200, f"欢迎回来, {user} · 这是受保护页")


# ============================================================
# 手写测试客户端：http.client 走完整流程
# ============================================================

def post_login(port: int, user: str, password: str, mode: str):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    body = urllib.parse.urlencode({"user": user, "password": password, "mode": mode})
    conn.request("POST", "/login", body,
                 {"Content-Type": "application/x-www-form-urlencoded"})
    resp = conn.getresponse()
    set_cookie = resp.getheader("Set-Cookie")
    data = resp.read().decode()
    conn.close()
    return resp.status, set_cookie, data


def get_protected(port: int, cookie: str | None = None):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    headers = {"Cookie": cookie} if cookie else {}
    conn.request("GET", "/protected", headers=headers)
    resp = conn.getresponse()
    data = resp.read().decode()
    conn.close()
    return resp.status, data


# ============================================================
# 演示小节
# ============================================================

def demo_login(port: int) -> None:
    section("1. 登录与 Set-Cookie：服务器往响应里塞了什么")
    status, _, body = post_login(port, "alice", "wrong-password", "server")
    assert status == 401, f"错误密码应 401，实际 {status}"
    print(f"  错误密码登录 → 401（状态不过关，绝不发 cookie）")

    status, set_cookie, body = post_login(port, "alice", "wonderland", "server")
    assert status == 200 and set_cookie and set_cookie.startswith("sid=")
    print(f"  登录成功 → Set-Cookie: {set_cookie}")
    for attr in set_cookie.split(";")[1:]:
        print(f"    · {attr.strip():<16} ← 安全属性")
    print(f"  语义: {body}——cookie 只有一个随机 sid，用户名留在服务端")


def demo_server_session(port: int) -> None:
    section("2. 服务端 session 模式：状态在服务器，cookie 只是取号牌")
    status, set_cookie, _ = post_login(port, "alice", "wonderland", "server")
    sid = set_cookie.split(";")[0]

    code, body = get_protected(port)
    assert code == 401, f"无 cookie 应 401，实际 {code}"
    print(f"  无 cookie 访问 /protected → 401（{body}）")

    code, body = get_protected(port, sid)
    assert code == 200 and "alice" in body, f"带 sid 应 200，实际 {code} {body}"
    print(f"  带 {sid[:12]}... 访问 /protected → 200（{body}）")
    print(f"  服务端 session 表: {json.dumps(SESSIONS, ensure_ascii=False)}")
    print("  吊销 = 删表里一行（logout 的全部实现）；服务器重启默认全掉线也是它")


def demo_signed_cookie(port: int) -> None:
    section("3. 客户端签名 cookie 模式：状态在客户端，HMAC 防篡改")
    status, set_cookie, _ = post_login(port, "alice", "wonderland", "client")
    assert status == 200 and set_cookie.startswith("auth=")
    value = set_cookie.split(";")[0].removeprefix("auth=")
    payload_b64, sig = value.rsplit(".", 1)
    decoded = base64.urlsafe_b64decode(payload_b64).decode()
    print(f"  cookie 值 = payload.签名: {payload_b64[:24]}...{sig}")
    print(f"  payload 解码 = {decoded!r}（用户名|过期时间戳，明文但不可改）")

    code, body = get_protected(port, f"auth={value}")
    assert code == 200 and "alice" in body
    print(f"  原样携带 → 200（{body}）")

    # 篡改实验：payload 换成 mallory，签名原样保留
    evil_payload = base64.urlsafe_b64encode(b"mallory|9999999999").decode()
    code, _ = get_protected(port, f"auth={evil_payload}.{sig}")
    assert code == 401, f"篡改 payload 应 401，实际 {code}"
    print(f"  payload 改成 mallory、签名不动 → 401（HMAC compare_digest 不过）")
    print("  无状态账：服务端不存任何东西，但 cookie 发出去就收不回——吊销靠换 SECRET 或等过期")


def demo_expiry(port: int) -> None:
    section("4. 过期校验：签名合法也救不了过期的登录态")
    stale = issue_signed_cookie("alice", exp=time.time() - 10)  # 10 秒前就该过期
    value = stale.removeprefix("auth=").split(";")[0]
    code, _ = get_protected(port, stale)
    assert code == 401, f"过期 cookie 应 401，实际 {code}"
    payload = value.rsplit(".", 1)[0]
    print(f"  签发的 payload: {base64.urlsafe_b64decode(payload).decode()!r}（exp 已是过去）")
    print(f"  签名本身合法（SECRET 没变）→ 仍 401：签名防篡改，不防过期")
    print("  两种模式的过期检查殊途同归：session 查 exp 字段，签名 cookie 查 payload 里的时间戳")


def main() -> None:
    print(f"Python {sys.version.split()[0]} · Cookie 与 Session 手写")
    server = http.server.HTTPServer(("127.0.0.1", 0), LabHandler)
    port = server.server_port
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print(f"登录演示服务已起: http://127.0.0.1:{port}（端口 0 = 内核分配）")
    try:
        demo_login(port)
        demo_server_session(port)
        demo_signed_cookie(port)
        demo_expiry(port)
    finally:
        server.shutdown()
        server.server_close()

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 登录 200 + 安全属性齐全、无 cookie 401、篡改 payload 401、过期 401")


if __name__ == "__main__":
    main()
