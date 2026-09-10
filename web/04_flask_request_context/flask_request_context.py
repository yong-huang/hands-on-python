"""
04 · Flask 最小应用与请求上下文 —— request / g / current_app 的真实身份
Web 框架清单项目 4：框架时代第一站，看 Flask 把项目 1-3 的地基封装成了什么

上一篇手写 WSGI 时，每个函数都显式传递 environ；Flask 把它藏进了两个"魔法全局变量"
（对应 images/flask_request_context.svg）:
- request:  当前请求的 environ 封装——但只在请求上下文内有效，出了边界直接 RuntimeError
- g:        一次请求（更准确说：一个应用上下文）内的临时笔记本，钩子与视图间传值
- current_app: 当前应用对象——同一个进程可以 create_app() 出多个应用，各归各的上下文

支撑这一切的是上下文栈 + LocalProxy：每个线程只看得见自己 push 的那层上下文，
所以 request/g 才能"看起来是全局的、用起来是隔离的"。

四个实验点（全部断言验收）:
- 动态路由 / 404 兜底 / 自定义 errorhandler（test_client 实测）
- 上下文边界：裸线程里摸 request → RuntimeError；test_request_context 内复活
- LocalProxy 线程隔离：两个线程各写各的 g，值互不串
- 钩子流水线：before → 视图 → after → teardown 的真实顺序（含视图抛异常时）

用法:
- source ../.venv/bin/activate && python3 flask_request_context.py

交互示意图: 用浏览器打开 images/flask_request_context.html
"""

import logging
import sys
import threading
import time

from flask import Flask, g, request

app = Flask(__name__)
app.logger.setLevel(logging.CRITICAL)  # 静音 /crash 的自带日志：异常证据已由 teardown 事件收集

# 钩子顺序与线程隔离的证据收集
EVENTS: list[str] = []
THREAD_RESULTS: dict[str, str] = {}


# ============================================================
# 路由：动态段 / 请求信息 / 手动引爆异常
# ============================================================

@app.get("/user/<name>")
def greet(name: str):
    return {"message": f"Hello, {name}"}


@app.get("/whoami")
def whoami():
    # request 与 g 在视图里"看似全局"——本实验的主角
    return {
        "path": request.path,
        "name": request.args.get("name", "(anonymous)"),
        "elapsed_ms": round((time.perf_counter() - g.t0) * 1000, 1),
    }


@app.get("/boom")
def boom():
    raise ValueError("视图内部爆炸（有 errorhandler 兜底）")


@app.get("/crash")
def crash():
    raise RuntimeError("无人兜底的异常")


@app.errorhandler(404)
def not_found(e):
    # errorhandler 里照样能摸 request——因为 404 响应也是在请求上下文里生成的
    return {"error": "not found", "path": request.path}, 404


@app.errorhandler(ValueError)
def on_value_error(e):
    return {"error": f"caught: {e}"}, 418


# ============================================================
# 钩子流水线：顺序写进 EVENTS，断言用
# ============================================================

@app.before_request
def record_start():
    g.t0 = time.perf_counter()  # g 的本职工作：钩子 ↔ 视图之间传值
    EVENTS.append("before")


@app.after_request
def add_header(response):
    EVENTS.append("after")
    response.headers["X-Lab"] = "flask-context"
    return response


@app.teardown_request
def always_cleanup(exc):
    # exc 是视图抛出的异常对象（正常请求为 None）——本函数"一定"被调用
    EVENTS.append(f"teardown({type(exc).__name__ if exc else 'None'})")


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. 最小应用：动态路由 / 404 兜底 / errorhandler
# ============================================================

def demo_routing() -> None:
    section("1. 动态路由、404 兜底与自定义 errorhandler（test_client 实测）")
    client = app.test_client()

    r = client.get("/user/Zed")
    assert r.status_code == 200 and r.json == {"message": "Hello, Zed"}
    print(f"  GET /user/Zed      → {r.status_code} {r.json}")

    r = client.get("/whoami?name=alice")
    assert r.status_code == 200 and r.json["name"] == "alice"
    assert r.headers["X-Lab"] == "flask-context", "after_request 加的头应在"
    print(f"  GET /whoami?name=alice → {r.status_code} {r.json} · X-Lab={r.headers['X-Lab']}")

    r = client.get("/definitely-missing")
    assert r.status_code == 404 and r.json == {"error": "not found", "path": "/definitely-missing"}
    print(f"  GET /definitely-missing → {r.status_code}（自定义 404 JSON）: {r.json}")
    print("  对比项目 1：路由表、404 兜底全都在，只是从手写 dict 变成了装饰器注册")


# ============================================================
# 2. 上下文边界：request 出了上下文就是 RuntimeError
# ============================================================

def touch_request() -> str:
    return request.path  # 谁调用我，谁负责保证请求上下文在栈里


def demo_context_boundary() -> None:
    section("2. 上下文边界：request / current_app 出栈即失效")
    try:
        touch_request()
        raise AssertionError("裸调用不该成功")
    except RuntimeError as e:
        print(f"  裸线程直接调 → RuntimeError: {str(e)[:44]}...")

    # 复活方式一：手工 push 请求上下文（测试常用）
    with app.test_request_context("/whoami?name=bob"):
        assert touch_request() == "/whoami"
        assert request.args["name"] == "bob"
    print("  with test_request_context('/whoami?name=bob') → request 复活，出 with 即失效")

    # 复活方式二：只 push 应用上下文 —— current_app 可用，request 仍不可用
    with app.app_context():
        assert current_app_name() == app.name
        try:
            touch_request()
        except RuntimeError:
            print(f"  只有 app 上下文时: current_app.name={app.name!r} 可用，request 仍 RuntimeError")

    # 真线程再验一遍：每个线程都要自己 push
    outcome = {}

    def worker():
        try:
            outcome["value"] = touch_request()
        except RuntimeError:
            outcome["value"] = "RuntimeError"

    t = threading.Thread(target=worker)
    t.start()
    t.join()
    assert outcome["value"] == "RuntimeError", f"子线程应拿不到主线程的上下文: {outcome}"
    print(f"  子线程调用 → {outcome['value']}：上下文栈是线程本地的，不跨线程共享")


def current_app_name() -> str:
    from flask import current_app
    return current_app.name


# ============================================================
# 3. LocalProxy 线程隔离：两个线程各写各的 g
# ============================================================

def g_worker(tag: str) -> None:
    with app.app_context():
        g.value = f"{tag}-data"
        time.sleep(0.05)  # 强制交叠：写完别人的值再回来读
        THREAD_RESULTS[tag] = g.value


def demo_g_isolation() -> None:
    section("3. LocalProxy 线程隔离：g 在两个交叠线程里互不串")
    threads = [threading.Thread(target=g_worker, args=(t,)) for t in ("A", "B")]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert THREAD_RESULTS == {"A": "A-data", "B": "B-data"}, f"值串了: {THREAD_RESULTS}"
    print(f"  线程 A 与 B 交叠读写 g.value → {THREAD_RESULTS}")
    print("  request/g 不是真全局变量，是 LocalProxy——指向'当前线程栈顶上下文'的属性转发器")
    print("  对比项目 1 的手写 WSGI：当时 environ 靠参数传递，Flask 用线程隔离代理把它变成了'魔法全局'")


# ============================================================
# 4. 钩子流水线：真实执行顺序（正常 + 视图抛异常）
# ============================================================

def run_and_reset(path: str) -> tuple[int, list[str]]:
    EVENTS.clear()
    client = app.test_client()
    r = client.get(path)
    return r.status_code, list(EVENTS)


def demo_hooks() -> None:
    section("4. 钩子流水线：before → 视图 → after → teardown（三条路径实测）")
    status, events = run_and_reset("/whoami")
    assert events == ["before", "after", "teardown(None)"], f"顺序异常: {events}"
    print(f"  正常请求            : {status} · {events}")

    status, events = run_and_reset("/boom")
    assert status == 418 and events == ["before", "after", "teardown(None)"], (status, events)
    print(f"  视图抛 ValueError   : {status}（errorhandler 兜底）· {events}")
    print("    ↳ 异常在 full_dispatch_request 内部就被 handler 处理掉：teardown 拿到 exc=None")

    status, events = run_and_reset("/crash")
    assert status == 500 and events[-1] == "teardown(RuntimeError)", (status, events)
    print(f"  视图抛 RuntimeError : {status}（无人兜底）· {events}")
    print("    ↳ teardown 一定执行，且 exc 参数带回异常对象；客户端只看到 500")

    print("  实测结论：teardown 是 finally 语义'必执行'（是否带 exc 取决于有无 handler 兜底）；")
    print("  after 两条异常路径也都执行了；真正不保证的是视图内 raise 之后的剩余代码")


def main() -> None:
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · Flask {version('flask')} · 请求上下文实验")
    demo_routing()
    demo_context_boundary()
    demo_g_isolation()
    demo_hooks()

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 路由/404/errorhandler、上下文边界 RuntimeError、g 线程隔离、钩子顺序")


if __name__ == "__main__":
    main()
