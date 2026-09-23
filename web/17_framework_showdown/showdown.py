"""
17 · ⛓️ 三框架同题对比 —— Flask / FastAPI / Django+DRF
Web 框架清单项目 17（集成点）：同一个 TODO API 写三遍，拿数据说话

控制变量设计（对应 images/framework_showdown.svg）:
- 同一题目:   GET/POST/GET-id/DELETE /todos + POST /token + 受保护的 /secret
- 同一认证:   tokenbox.py 共享 HMAC 签名 token——认证逻辑零差异
- 同一验收:   14 条 HTTP 断言（状态码序列）依次跑三个 app，全绿才算"同题同解"
- 同一压测:   1000 请求 × 并发 50，各自 QPS 与 p95（绝对值不重要，量级与方向才重要）
- 代码量:     wc -l 实测统计，不拍脑袋

用法:
- source ../.venv/bin/activate && python3 showdown.py
"""

import asyncio
import os
import socket
import statistics
import sys
import threading
import time
from pathlib import Path

LAB = Path(__file__).resolve().parent
sys.path.insert(0, str(LAB))

import httpx  # noqa: E402
import uvicorn  # noqa: E402
from werkzeug.serving import make_server  # noqa: E402

import logging  # noqa: E402

logging.getLogger("werkzeug").setLevel(logging.CRITICAL)  # 静音压测期间 1000+ 行访问日志

# 版本检查必须在 import app_* 之前——旧环境会在模块导入阶段就崩，main() 里拦不住
from importlib.metadata import version as _v  # noqa: E402
for _pkg, _min in (("flask", (3, 0)), ("fastapi", (0, 100)), ("django", (4, 2))):
    if tuple(int(x) for x in _v(_pkg).split(".")[:2]) < _min:
        sys.exit(f"本实验需要 {_pkg} ≥ {'.'.join(map(str, _min))}（当前 {_v(_pkg)}）。"
                 f"请先激活系列环境：source ../.venv/bin/activate")

import app_django  # noqa: E402
import app_fastapi  # noqa: E402
import app_flask  # noqa: E402

TOTAL_REQUESTS = 1000
CONCURRENCY = 50


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class WSGIThreadServer:
    """werkzeug make_server 线程化托管（Flask 与 Django 的 WSGI app 共用）"""

    def __init__(self, wsgi_app):
        self.server = make_server("127.0.0.1", 0, wsgi_app, threaded=True)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def __enter__(self):
        self.thread.start()
        return f"http://127.0.0.1:{self.server.port}"

    def __exit__(self, *exc):
        self.server.shutdown()
        self.thread.join(timeout=5)


class ASGIThreadServer:
    """uvicorn.Server 线程化托管（FastAPI 的 ASGI app）"""

    def __init__(self, asgi_app):
        config = uvicorn.Config(asgi_app, host="127.0.0.1", port=free_port(),
                                log_level="warning")
        self.server = uvicorn.Server(config)
        self.thread = threading.Thread(target=self.server.run, daemon=True)

    def __enter__(self):
        self.thread.start()
        while not self.server.started:
            time.sleep(0.05)
        return f"http://127.0.0.1:{self.server.config.port}"

    def __exit__(self, *exc):
        self.server.should_exit = True
        self.thread.join(timeout=5)


# 每个框架的路由方言：Django 惯例带尾斜杠
APPS = {
    "Flask": (app_flask.app, WSGIThreadServer,
              {"todos": "/todos", "token": "/token", "secret": "/secret",
               "item": "/todos/{id}"}),
    "FastAPI": (app_fastapi.app, ASGIThreadServer,
                {"todos": "/todos", "token": "/token", "secret": "/secret",
                 "item": "/todos/{id}"}),
    "Django+DRF": (app_django.application, WSGIThreadServer,
                   {"todos": "/todos/", "token": "/token/", "secret": "/secret/",
                    "item": "/todos/{id}/"}),
}


def run_checks(base: str, paths: dict) -> None:
    """14 条同一组断言：对'同题同解'的直接验证"""
    c = httpx.Client(base_url=base, timeout=10)

    assert c.post(paths["token"], json={"username": "alice", "password": "no"}).status_code == 401
    token = c.post(paths["token"], json={"username": "alice", "password": "wonderland"}).json()["token"]
    auth = {"Authorization": f"Bearer {token}"}

    assert c.get(paths["secret"]).status_code == 401
    r = c.get(paths["secret"], headers=auth)
    assert r.status_code == 200 and "alice" in r.json()["secret"]

    assert c.get(paths["todos"]).json() == []
    assert c.post(paths["todos"], json={"title": ""}).status_code == 400
    assert c.post(paths["todos"], json={"title": "买牛奶"}).status_code == 201
    assert c.post(paths["todos"], json={"title": "还书"}).status_code == 201
    assert len(c.get(paths["todos"]).json()) == 2
    assert c.get(paths["item"].format(id=1)).json()["title"] == "买牛奶"
    assert c.get(paths["item"].format(id=999)).status_code == 404
    assert c.delete(paths["item"].format(id=1)).status_code == 204
    assert c.delete(paths["item"].format(id=1)).status_code == 404
    assert len(c.get(paths["todos"]).json()) == 1
    c.close()


async def bench(base: str, todos_path: str) -> tuple[float, float]:
    """1000 请求 × 并发 50：返回 (QPS, p95 ms)"""
    limits = httpx.Limits(max_connections=CONCURRENCY, max_keepalive_connections=CONCURRENCY)
    latencies: list[float] = []

    async def one(client: httpx.AsyncClient):
        t0 = time.perf_counter()
        r = await client.get(base + todos_path)
        latencies.append(time.perf_counter() - t0)
        assert r.status_code == 200

    async with httpx.AsyncClient(limits=limits, timeout=30) as client:
        t0 = time.perf_counter()
        async with asyncio.TaskGroup() as tg:
            for _ in range(TOTAL_REQUESTS):
                tg.create_task(one(client))
        wall = time.perf_counter() - t0

    qps = TOTAL_REQUESTS / wall
    p95 = statistics.quantiles(latencies, n=20)[18] * 1000
    return qps, p95


def line_count(name: str) -> int:
    return len((LAB / name).read_text().splitlines())


def main() -> None:
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · 三框架同题对比（各实现 {TOTAL_REQUESTS} 请求压测）")
    db_file = LAB / "showdown.sqlite3"
    if db_file.exists():
        db_file.unlink()
    app_django.ensure_db()  # standalone Django：先建表
    try:
        results: dict[str, dict] = {}
        for name, (app, server_cls, paths) in APPS.items():
            section(f"{name}：同一组断言 + 压测")
            with server_cls(app) as base:
                run_checks(base, paths)
                print(f"  14 条断言全绿（注册/受保护路由/CRUD/404/重复删除）")
                qps, p95 = asyncio.run(bench(base, paths["todos"]))
            results[name] = {"lines": line_count(app_file(name)), "qps": qps, "p95": p95}
            print(f"  压测: {qps:.0f} req/s · p95 {p95:.1f}ms")
    finally:
        if db_file.exists():
            db_file.unlink()
        print("\n  已清理 showdown.sqlite3")

    section("对比总表")
    print(f"  {'框架':<12}{'代码行数':>8}{'QPS':>10}{'p95(ms)':>10}")
    for name, r in results.items():
        print(f"  {name:<12}{r['lines']:>8}{r['qps']:>10.0f}{r['p95']:>10.1f}")
    print("\n  判读：QPS 绝对值不重要（本地 dev server），量级同档即说明——")
    print("  选型该看生态与团队：微服务/异步密集选 FastAPI，小而美选 Flask，内容密集选 Django")


def app_file(name: str) -> str:
    return {"Flask": "app_flask.py", "FastAPI": "app_fastapi.py",
            "Django+DRF": "app_django.py"}[name]


if __name__ == "__main__":
    main()
