"""
01 · WSGI 最小应用手写 —— environ / start_response / 中间件洋葱
Web 框架清单项目 1：不靠任何框架，把"框架魔法"还原成两个参数的函数约定

WSGI（PEP 3333）的全部合约只有四句话（对应 images/wsgi_barebones.archify.svg）:
- 应用是可调用对象:  app(environ, start_response)——框架本质就是这个函数
- environ:          请求全量信息的 dict（PATH_INFO / REQUEST_METHOD / QUERY_STRING ...）
- start_response:   声明响应行与响应头的回调，body 被迭代前必须调用
- 返回值:           可迭代的 body（bytes 分块），server 负责发给客户端

中间件就是洋葱:  "接受 app、返回新 app" 的包装函数，server 只看得见最外层。
wsgiref.validate.validator 是官方合规检查器: 忘调 start_response、body 混入 str
等违规，当场 AssertionError——本实验的路由 app 会被它包一层再交给中间件。

用法:
- python3 wsgi_barebones.py    # 完整演示（4 个小节，含内置验收断言）
"""

import io
import json
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from typing import Callable
from wsgiref.simple_server import WSGIRequestHandler, make_server
from wsgiref.validate import validator

# 处理函数签名：吃 environ，吐 (状态行, 响应头, body 字节串)
# 这是"框架层"的心智模型——Flask 视图函数 return 字符串/Response，本质是它的语法糖
Handler = Callable[[dict], tuple[str, list[tuple[str, str]], bytes]]

# 中间件收集的请求日志（方法 路径 状态码 耗时），验收点 2 的证据
REQUEST_LOG: list[str] = []


def section(title: str) -> None:
    """打印小节标题"""
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 路由表与处理函数：Handler 只关心业务，不碰 WSGI 细节
# ============================================================

def home(environ: dict) -> tuple[str, list[tuple[str, str]], bytes]:
    body = "WSGI 101: 框架的本质就是 app(environ, start_response)".encode()
    return "200 OK", [("Content-Type", "text/plain; charset=utf-8")], body


def greet(name: str) -> Handler:
    def handler(environ: dict) -> tuple[str, list[tuple[str, str]], bytes]:
        body = f"Hello, {name}! 这段 body 由路由表分发出来".encode()
        return "200 OK", [("Content-Type", "text/plain; charset=utf-8")], body
    return handler


def info(environ: dict) -> tuple[str, list[tuple[str, str]], bytes]:
    """把 environ 里最值得观察的键回显成 JSON——HTTP 头在 environ 里变成 HTTP_ 前缀"""
    facts = {
        "REQUEST_METHOD": environ["REQUEST_METHOD"],
        "PATH_INFO": environ["PATH_INFO"],
        "QUERY_STRING": environ["QUERY_STRING"],
        "SERVER_PROTOCOL": environ["SERVER_PROTOCOL"],
        "HTTP_USER_AGENT": environ.get("HTTP_USER_AGENT", "(无)"),
    }
    body = json.dumps(facts, ensure_ascii=False).encode()
    return "200 OK", [("Content-Type", "application/json; charset=utf-8")], body


def not_found(environ: dict) -> tuple[str, list[tuple[str, str]], bytes]:
    body = f"404: {environ['PATH_INFO']} 不在路由表里".encode()
    return "404 Not Found", [("Content-Type", "text/plain; charset=utf-8")], body


def route(environ: dict) -> tuple[str, list[tuple[str, str]], bytes]:
    """路由 app：静态表 → 动态段 /hello/<name> → 兜底 404"""
    path = environ["PATH_INFO"]
    if path == "/":
        return home(environ)
    if path == "/info":
        return info(environ)
    if path.startswith("/hello/"):
        name = path.removeprefix("/hello/")
        if name:  # /hello/ 空名字不算命中，落 404
            return greet(name)(environ)
    return not_found(environ)


def wsgi_app(environ: dict, start_response: Callable) -> list[bytes]:
    """WSGI 合约层：把 Handler 的三元组翻译成 PEP 3333 的调用约定

    所有 Python Web 框架里都有这个薄层——Flask 叫 wsgi_app()，FastAPI 背后
    Starlette 叫 __call__()。server 只认它，永远看不见上面的 route/greet。
    """
    status, headers, body = route(environ)
    start_response(status, headers)
    return [body]


# ============================================================
# 中间件洋葱：日志中间件 + validator 合规校验
# ============================================================

def log_middleware(app: Callable) -> Callable:
    """洋葱外层：计时、捕获状态行、body 消费完补一条日志

    注意日志发生在 body 迭代完之后——WSGI 里"调用了 app"不等于"响应已发完"，
    真正的终点是 server 把可迭代 body 消费完。
    """
    def wrapped(environ: dict, start_response: Callable):
        t0 = time.perf_counter()
        seen: dict = {}

        def tracked_start_response(status, headers, exc_info=None):
            seen["status"] = status
            return start_response(status, headers, exc_info)

        inner = app(environ, tracked_start_response)

        def body_iter():
            try:
                yield from inner
            finally:
                # PEP 3333：中间件消费完（或被 close）必须把 close() 传播给内层——
                # validator 的 IteratorWrapper 靠它检查资源回收，漏调 GC 时会被抓
                if hasattr(inner, "close"):
                    inner.close()
                cost = (time.perf_counter() - t0) * 1000
                REQUEST_LOG.append(
                    f"{environ['REQUEST_METHOD']}  {environ['PATH_INFO']}"
                    f"  {seen.get('status', '?')}  {cost:.1f}ms"
                )
        return body_iter()
    return wrapped


def fake_environ(method: str = "GET", path: str = "/",
                 query: str = "", agent: str = "handmade-client/0.1") -> dict:
    """手工构造一份 PEP 3333 要求齐全的 environ（直调 app 时用）"""
    return {
        "REQUEST_METHOD": method,
        "PATH_INFO": path,
        "SCRIPT_NAME": "",  # PEP 3333 必需键：应用挂载前缀，根挂载就是空串
        "QUERY_STRING": query,
        "SERVER_NAME": "127.0.0.1",
        "SERVER_PORT": "8000",
        "SERVER_PROTOCOL": "HTTP/1.1",
        "HTTP_USER_AGENT": agent,
        "wsgi.version": (1, 0),
        "wsgi.url_scheme": "http",
        "wsgi.input": io.BytesIO(b""),
        "wsgi.errors": sys.stderr,
        "wsgi.multithread": True,
        "wsgi.multiprocess": False,
        "wsgi.run_once": False,
    }


# ============================================================
# 1. WSGI 合约：手工调一次 app，看清三要素
# ============================================================

def demo_contract() -> None:
    section("1. WSGI 合约：app(environ, start_response) → iterable")
    environ = fake_environ(path="/hello/WSGI")
    collected: dict = {}

    def start_response(status, headers, exc_info=None):  # server 侧的回调桩
        collected["status"], collected["headers"] = status, headers
        print(f"  start_response 被调用: status={status!r} headers={headers}")

    chunks = wsgi_app(environ, start_response)  # ← 应用就是这样一个普通函数调用
    assert chunks and all(isinstance(c, bytes) for c in chunks), "body 必须是 bytes 可迭代"
    assert collected["status"] == "200 OK", "body 交付前 start_response 必须已调用"
    print(f"  environ 关键键: PATH_INFO={environ['PATH_INFO']!r} "
          f"REQUEST_METHOD={environ['REQUEST_METHOD']!r}")
    print(f"  返回的 body 可迭代: {chunks}")
    print("  合约三要素齐活: environ（进）/ start_response（声明响应）/ iterable body（出）")


# ============================================================
# 2. 路由分发：静态表 + 动态段 + 404 兜底（纯函数调用，还没有网络）
# ============================================================

def demo_routing() -> None:
    section("2. 路由分发：静态表 + 动态段 /hello/<name> + 404 兜底")
    cases = [
        ("/", "200 OK"),
        ("/hello/Zed", "200 OK"),
        ("/info", "200 OK"),
        ("/hello/", "404 Not Found"),   # 空名字不算命中
        ("/definitely-missing", "404 Not Found"),
    ]
    for path, expected in cases:
        status, headers, body = route(fake_environ(path=path))
        assert status == expected, f"{path} → {status}，期望 {expected}"
        print(f"  {path:<22} → {status:<15} body[:24]={body.decode()[:24]!r}")
    print("  路由 = 查表 + 前缀匹配动态段 + 兜底 404，Flask 的 url_map 本质相同")


# ============================================================
# 3. 中间件洋葱 + validator 合规校验（含坏 app 被抓的诚实演示）
# ============================================================

def demo_middleware_and_validator() -> None:
    section("3. 中间件洋葱与 wsgiref.validate.validator")
    chain = log_middleware(validator(wsgi_app))  # server 只看见最外层

    collected: dict = {}

    def sr(status, headers, exc_info=None):
        collected["status"] = status
        return lambda chunks: None

    result = chain(fake_environ(path="/"), sr)
    payload = b"".join(result)
    if hasattr(result, "close"):
        result.close()  # 真实 server 消费完 body 必须调 close()——漏调会在 GC 时被 validator 抓
    assert collected["status"] == "200 OK"
    print(f"  经洋葱链后 body: {payload.decode()[:36]!r}")
    print(f"  中间件日志（body 消费完才写）: {REQUEST_LOG[-1]}")

    # 诚实失败演示：忘调 start_response 的坏 app，validator 当场抓住
    def broken_app(environ, start_response):
        return [b"forgot start_response"]

    broken_result = validator(broken_app)(fake_environ(), sr)
    caught = ""
    try:
        b"".join(broken_result)  # 迭代 body 时 validator 才有机会发现违规
    except AssertionError as e:
        caught = str(e)
    finally:
        broken_result.close()  # 不管成败都收尾——否则 GC 时又是一条 AssertionError
    assert caught, "坏 app 竟然通过了 validator？"
    print(f"  坏 app（忘调 start_response）→ validator AssertionError: {caught[:52]}")
    print("  validator 就是这么给我们的路由 app 背书的：每条路径都合规")


# ============================================================
# 4. 真实服务自测（验收点）：wsgiref 起服务，urllib 实际打请求
# ============================================================

class QuietHandler(WSGIRequestHandler):
    """静音 wsgiref 自带的 stderr 访问日志，只留我们自己的中间件日志"""

    def log_message(self, format: str, *args) -> None:
        pass


def demo_real_server() -> None:
    section("4. 真实服务自测：127.0.0.1 动态端口，5 个请求全断言")
    REQUEST_LOG.clear()  # §3 直调已积累 1 条，本次自测从零计数
    server = make_server("127.0.0.1", 0, log_middleware(validator(wsgi_app)),
                         handler_class=QuietHandler)
    port = server.server_port
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    print(f"  wsgiref 服务已起: {base}（端口 0 = 由内核分配，避免端口冲突）\n")

    def get(path: str):
        try:
            with urllib.request.urlopen(base + path, timeout=5) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as e:  # 4xx/5xx 走异常通道
            return e.code, dict(e.headers), e.read()

    checks = [
        ("/", 200, "text/plain"),
        ("/hello/WSGI", 200, "text/plain"),
        ("/info?a=1&b=2", 200, "application/json"),
        ("/definitely-missing", 404, "text/plain"),
        ("/hello/framework", 200, "text/plain"),
    ]
    for path, want_status, want_ct in checks:
        status, headers, body = get(path)
        assert status == want_status, f"{path} → {status}，期望 {want_status}"
        assert headers.get("Content-Type", "").startswith(want_ct), \
            f"{path} Content-Type={headers.get('Content-Type')!r}，期望 {want_ct} 前缀"
        if path.startswith("/info"):
            facts = json.loads(body)
            assert facts["QUERY_STRING"] == "a=1&b=2", f"QUERY_STRING 回显错了: {facts}"
            print(f"  {path:<22} → {status} · environ 回显 QUERY_STRING={facts['QUERY_STRING']!r}")
        else:
            print(f"  {path:<22} → {status} · {body.decode()[:40]!r}")

    # 验收点：5 个请求的日志一行不少、格式一致（状态行自带空格，用正则校验）
    log_pattern = re.compile(r"^\S+  \S+  \d{3} [A-Za-z ]+  [\d.]+ms$")
    assert len(REQUEST_LOG) == 5, f"应有 5 条请求日志，实际 {len(REQUEST_LOG)} 条"
    for line in REQUEST_LOG:
        assert log_pattern.match(line), f"日志格式异常: {line!r}"
    print("\n  中间件请求日志（方法 路径 状态码 耗时ms）:")
    for line in REQUEST_LOG:
        print(f"    {line}")

    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
    assert not thread.is_alive()
    print("\n  server.shutdown() 后服务线程干净退出，无端口残留")


def main() -> None:
    print(f"Python {sys.version.split()[0]} · WSGI 最小应用手写")
    demo_contract()
    demo_routing()
    demo_middleware_and_validator()
    demo_real_server()

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 三类路径 200/200/404 + Content-Type 正确、")
    print("validator 包裹下全部请求合规、5 条请求日志一行不少")


if __name__ == "__main__":
    main()
