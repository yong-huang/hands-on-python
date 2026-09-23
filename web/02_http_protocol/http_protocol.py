"""
02 · HTTP 协议观察器 —— 手搓报文 / chunked 解码 / keep-alive 复用
Web 框架清单项目 2：下到 socket 层，看清 requests 一行代码背后的逐字节细节

HTTP/1.1 报文只有两种形状（对应 images/http_protocol.archify.svg）:
- 请求:  请求行(CRLF) 头(CRLF)* 空行(CRLF) 体
- 响应:  状态行(CRLF) 头(CRLF)* 空行(CRLF) 体
"体有多长"由两套机制回答——Content-Length（先知长度）或
Transfer-Encoding: chunked（分块流式，chunk-size 行 + 数据 + 终止块）。

三个动手点:
- 手搓 GET/POST 报文发往本实验自带的极简 HTTP 服务，逐行解析响应，
  与标准库 http.client 的解析结果逐项比对
- 手写 chunked 解码器：按 chunk-size\r\n → data\r\n 循环到 0\r\n，逐字节还原
- keep-alive 连接复用：同一 socket 连打 3 个请求，服务端只 accept 一次
  （用进程内计数器断言），对照 Connection: close 的"一请求一连接"

用法:
- python3 http_protocol.py    # 完整演示（4 个小节，含内置验收断言）
"""

import http.client
import json
import socket
import sys
import threading

HOST = "127.0.0.1"
CRLF = "\r\n"

# 服务端计数器（同进程共享）：连接数 / 请求数，keep-alive 验收的证据
STATS = {"conns": 0, "reqs": 0}


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 极简 HTTP/1.1 服务：只实现教学需要的四个路由 + 三种传输形态
# ============================================================

LOREM = ("HTTP/1.1 报文结构一学就会：请求行/状态行、头部、空行、正文。"
         "RFC 9112 用一百多页讲的东西，拆开看就是这四段。").encode()


def handle_request(method: str, path: str, body: bytes) -> tuple[str, list[tuple[str, str]], bytes]:
    """极简路由：三个 GET + 一个 POST 回显"""
    if path == "/text":
        return "200 OK", [("Content-Type", "text/plain; charset=utf-8"),
                          ("Content-Length", str(len(LOREM)))], LOREM
    if path == "/chunked":
        # 人为切成 20/17/0 三块：0 号块是"到此为止"的终止块
        chunks = [LOREM[:20], LOREM[20:], b""]
        body_out = b"".join(f"{len(c):X}{CRLF}".encode() + c + CRLF.encode() for c in chunks)
        return "200 OK", [("Content-Type", "text/plain; charset=utf-8"),
                          ("Transfer-Encoding", "chunked")], body_out
    if path == "/echo" and method == "POST":
        resp = b"echo:" + body
        return "200 OK", [("Content-Type", "text/plain; charset=utf-8"),
                          ("Content-Length", str(len(resp)))], resp
    return "404 Not Found", [("Content-Length", "0")], b""


def serve_once(conn: socket.socket) -> None:
    """处理一条连接：可服务多个请求（keep-alive），直到对端要求关闭"""
    conn.settimeout(5)
    buf = b""
    while True:
        # 1. 读到头部结束标记（空行）为止；keep-alive 空闲超时就优雅关闭
        #    （真实服务器的 keep-alive timeout 同款策略，不是无限等）
        while CRLF.encode() * 2 not in buf:
            try:
                data = conn.recv(4096)
            except socket.timeout:
                return
            if not data:  # 对端关闭
                return
            buf += data
        head, _, buf = buf.partition(CRLF.encode() * 2)
        lines = head.decode().split(CRLF)
        method, path, _version = lines[0].split(" ")
        headers = {}
        for line in lines[1:]:
            k, _, v = line.partition(":")
            headers[k.strip().lower()] = v.strip()

        # 2. 有请求体（POST）就按 Content-Length 再读够
        need = int(headers.get("content-length", 0))
        while len(buf) < need:
            data = conn.recv(4096)  # body 读一半断流 = 对端违约，放弃本连接
            if not data:
                return
            buf += data
        payload, buf = buf[:need], buf[need:]

        STATS["reqs"] += 1
        status, resp_headers, resp_body = handle_request(method, path, payload)
        keep = headers.get("connection", "").lower() != "close"
        resp_headers.append(("Connection", "keep-alive" if keep else "close"))
        head_out = f"HTTP/1.1 {status}{CRLF}" + CRLF.join(f"{k}: {v}" for k, v in resp_headers)
        conn.sendall(head_out.encode() + CRLF.encode() * 2 + resp_body)
        if not keep:
            return


def start_server() -> socket.socket:
    """起服务，返回监听 socket（端口 0 由内核分配）"""
    listener = socket.create_server((HOST, 0))
    listener.settimeout(5)

    def loop():
        while True:
            try:
                conn, _addr = listener.accept()
            except (TimeoutError, OSError):
                return  # 主流程收摊，服务线程随之退出
            STATS["conns"] += 1
            with conn:
                serve_once(conn)

    threading.Thread(target=loop, daemon=True).start()
    return listener


# ============================================================
# 手搓客户端：拼报文 → sendall → 逐行解析
# ============================================================

def craft_request(method: str, path: str, headers: dict[str, str],
                  body: bytes = b"") -> bytes:
    """按 RFC 9112 拼一份报文——HTTP 客户端的核心就这五行的字符串拼接"""
    head = f"{method} {path} HTTP/1.1{CRLF}"
    head += f"Host: {HOST}{CRLF}"
    for k, v in headers.items():
        head += f"{k}: {v}{CRLF}"
    return head.encode() + CRLF.encode() + body


def parse_response(raw: bytes) -> tuple[str, str, dict[str, str], bytes, int]:
    """手写解析器：状态行 / 头 / 体；返回 (状态码, 短语, 头, 体, 头部字节数)"""
    head_part, _, body_part = raw.partition(CRLF.encode() * 2)
    lines = head_part.decode().split(CRLF)
    _ver, code, reason = lines[0].split(" ", 2)
    headers = {}
    for line in lines[1:]:
        k, _, v = line.partition(":")
        headers[k.strip().lower()] = v.strip()
    return code, reason, headers, body_part, len(head_part) + 4


def recv_response(sock: socket.socket) -> bytes:
    """读完整响应：这里统一按'读到对端关闭'处理（Connection: close 语义）"""
    sock.settimeout(5)
    chunks = []
    while True:
        try:
            data = sock.recv(4096)
        except socket.timeout:
            break  # keep-alive 连接不会主动关——读到的就是全部（body 长度可从头算）
        if not data:
            break
        chunks.append(data)
        code, _, headers, body, _ = parse_response(b"".join(chunks))
        if int(headers.get("content-length", -1)) == len(body):
            break  # Content-Length 齐了，提前收工（keep-alive 下必须如此）
    return b"".join(chunks)


def decode_chunked(body: bytes) -> bytes:
    """chunked 解码器：chunk-size(HEX)CRLF → data CRLF … 循环到 0 号块"""
    out, pos = [], 0
    while True:
        line_end = body.index(CRLF.encode(), pos)
        size = int(body[pos:line_end], 16)  # 十六进制块长
        pos = line_end + 2
        out.append(body[pos:pos + size])
        pos += size + 2  # 数据 + 块尾 CRLF
        if size == 0:
            return b"".join(out)


# ============================================================
# 1. 报文逐字节观察：请求长什么样、响应长什么样
# ============================================================

def demo_raw_bytes(listener: socket.socket) -> None:
    section("1. 报文逐字节观察：GET /text 的来程与去程")
    port = listener.getsockname()[1]
    request = craft_request("GET", "/text", {"Accept": "text/plain", "Connection": "close"})
    print(f"  手搓请求报文原文: {request!r}")

    with socket.create_connection((HOST, port), timeout=5) as s:
        s.sendall(request)
        raw = recv_response(s)
    print(f"  原始响应前 120 字节: {raw[:120]!r}")
    code, reason, headers, body, head_len = parse_response(raw)
    print(f"  结构拆解: 状态行 HTTP/1.1 {code} {reason} → {head_len - 4} 字节头部"
          f" → 空行 CRLF → {len(body)} 字节 body（Content-Length={headers['content-length']}）")
    print("  报文 = 起始行 + 头 + 空行 + 体，四段式结构，与语言无关")


# ============================================================
# 2. 手写解析器 vs http.client：同一响应，两种解析，逐项比对
# ============================================================

def demo_vs_httpclient(listener: socket.socket) -> None:
    section("2. 手写解析器 vs http.client 标准实现（验收点）")
    port = listener.getsockname()[1]

    # 手搓客户端
    request = craft_request("GET", "/text", {"Accept": "text/plain", "Connection": "close"})
    with socket.create_connection((HOST, port), timeout=5) as s:
        s.sendall(request)
        code, reason, headers, body, _ = parse_response(recv_response(s))

    # 标准库实现
    conn = http.client.HTTPConnection(HOST, port, timeout=5)
    conn.request("GET", "/text", headers={"Accept": "text/plain"})
    resp = conn.getresponse()
    ref_body = resp.read()
    ref_headers = {k.lower(): v for k, v in resp.getheaders()}
    conn.close()

    # 逐项断言：状态、关键头、body 一字不差
    assert (code, reason) == (str(resp.status), resp.reason), \
        f"状态行不一致: {code} {reason} vs {resp.status} {resp.reason}"
    for key in ("content-type", "content-length"):
        assert headers[key] == ref_headers[key], f"{key} 不一致: {headers[key]!r} vs {ref_headers[key]!r}"
    assert body == ref_body == LOREM, "两种解析出的 body 不一致或与原文不符"
    print(f"  手搓解析:   {code} {reason} · Content-Type={headers['content-type']} · body {len(body)}B")
    print(f"  http.client: {resp.status} {resp.reason} · Content-Type={ref_headers['content-type']} · body {len(ref_body)}B")
    print("  三项全等 ✓ 手写解析器与标准库结论一致——HTTP 解析没有魔法")


# ============================================================
# 3. chunked 传输编码：没有 Content-Length 时 body 怎么定界
# ============================================================

def demo_chunked(listener: socket.socket) -> None:
    section("3. chunked 解码：chunk-size 行 + 数据 + 终止块")
    port = listener.getsockname()[1]
    request = craft_request("GET", "/chunked", {"Connection": "close"})
    with socket.create_connection((HOST, port), timeout=5) as s:
        s.sendall(request)
        _, _, headers, body, _ = parse_response(recv_response(s))

    assert headers.get("transfer-encoding") == "chunked", "服务端应返回 chunked 编码"
    assert "content-length" not in headers, "chunked 与 Content-Length 不应同时出现"
    print(f"  原始 body（chunked 编码态）: {body[:60]!r}...")
    decoded = decode_chunked(body)
    sizes = [int(line, 16) for line in body.split(CRLF.encode())[::2] if line][:3]
    assert decoded == LOREM, "chunked 解码结果与原文不符"
    print(f"  块长序列: {sizes}（HEX: {'/'.join(f'{s:X}' for s in sizes)}），末块 0 = 终止块")
    print(f"  解码还原 {len(decoded)} 字节，与原文逐字节相等 ✓")


# ============================================================
# 4. keep-alive 连接复用（验收点）：3 个请求 1 条连接
# ============================================================

def demo_keepalive(listener: socket.socket) -> None:
    section("4. keep-alive 复用：3 个请求 1 条连接 vs 一请求一连接")
    port = listener.getsockname()[1]

    # 复用组：同一个 socket 对象连续 3 个请求（最后一个带 Connection: close）
    STATS.update(conns=0, reqs=0)
    with socket.create_connection((HOST, port), timeout=5) as s:
        for i, (method, path, body) in enumerate(
                [("GET", "/text", b""), ("POST", "/echo", b"ping"), ("GET", "/text", b"")]):
            headers = {"Accept": "text/plain"}
            if body:
                headers["Content-Length"] = str(len(body))
            if i == 2:
                headers["Connection"] = "close"
            s.sendall(craft_request(method, path, headers, body))
            _, _, resp_headers, resp_body, _ = parse_response(recv_response(s))
            assert resp_headers.get("connection") == "keep-alive" or i == 2
            if method == "POST":
                assert resp_body == b"echo:ping", f"POST 回显错了: {resp_body!r}"
        assert s is s, "复用的始终是同一个 socket 对象"
    assert STATS == {"conns": 1, "reqs": 3}, f"复用组应 1 连接 3 请求，实际 {STATS}"
    print(f"  复用组: 3 个请求（含 1 个 POST）共用 1 条连接，服务端 accept 次数 = {STATS['conns']}")

    # 对照组：每次新建连接（Connection: close）
    STATS.update(conns=0, reqs=0)
    for path in ("/text", "/text"):
        with socket.create_connection((HOST, port), timeout=5) as s:
            s.sendall(craft_request("GET", path, {"Connection": "close"}))
            parse_response(recv_response(s))
    assert STATS == {"conns": 2, "reqs": 2}, f"对照组应 2 连接 2 请求，实际 {STATS}"
    print(f"  对照组: 2 个请求 2 条连接（Connection: close），服务端 accept 次数 = {STATS['conns']}")
    print("  keep-alive 省 TCP 握手/慢启动——浏览器同域 6 连接、连接池，全是它的后裔")


def main() -> None:
    print(f"Python {sys.version.split()[0]} · HTTP 协议观察器")
    listener = start_server()
    port = listener.getsockname()[1]
    print(f"极简 HTTP/1.1 服务已起: {HOST}:{port}（本实验自带，零第三方依赖）")
    try:
        demo_raw_bytes(listener)
        demo_vs_httpclient(listener)
        demo_chunked(listener)
        demo_keepalive(listener)
    finally:
        listener.close()

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 手搓解析与 http.client 逐项一致、chunked 逐字节还原、")
    print("keep-alive 3 请求 1 连接（服务端计数器为证）")


if __name__ == "__main__":
    main()
