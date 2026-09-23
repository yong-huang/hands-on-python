"""
10 · async 端点与 ASGI 真相 —— def 与 async def 到底在哪执行
Web 框架清单项目 10：用 uvicorn 真服务器 + 并发压测，把"异步"的传说变成数据

三个实测结论（对应 images/fastapi_async_truth.svg）:
- 执行位置:  async def 跑在事件循环线程（MainThread）；def 被扔进 anyio 线程池
            （线程名带 AnyIO）——同一个应用，两种执行模型
- 并发差异:  100 个并发请求打 0.5s 延迟的端点：async 版事件循环串联等待 ~0.5s；
            def 版受线程池容量（默认 40）限制，分批执行 ~1.5s——比值 ≥2
- 进程分发:  uvicorn --workers 4 起多进程，同一 socket 内核级分发给各 worker
            （实测收集到 ≥3 个不同 PID）

前置：python_concurrency.md 项目 8-11（asyncio 语法不在此重复教）。
用法:
- source ../.venv/bin/activate && python3 fastapi_async_truth.py
"""

import asyncio
import os
import socket
import statistics
import subprocess
import sys
import threading
import time
import warnings

warnings.filterwarnings("ignore", message=".*httpx.*testclient.*deprecated.*")

import httpx  # noqa: E402
import uvicorn  # noqa: E402
from fastapi import FastAPI  # noqa: E402

LAB_DIR = os.path.dirname(os.path.abspath(__file__))
MODULE = os.path.splitext(os.path.basename(__file__))[0]  # uvicorn 的导入串用

app = FastAPI(title="async 真相实验")


@app.get("/io-async")
async def io_async():
    await asyncio.sleep(0.5)  # 模拟一次 0.5s 的外部 IO（事件循环期间可服务别人）
    return {"mode": "async", "thread": threading.current_thread().name, "pid": os.getpid()}


@app.get("/io-sync")
def io_sync():
    time.sleep(0.5)  # 阻塞式 sleep：这个线程被占满 0.5s
    return {"mode": "sync", "thread": threading.current_thread().name, "pid": os.getpid()}


@app.get("/pool-capacity")
async def pool_capacity():
    from anyio import to_thread
    return {"capacity": to_thread.current_default_thread_limiter().total_tokens}


def free_port() -> int:
    """向内核要一个空闲端口（绑定后立即释放，竞态窗口极小）"""
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_server(port: int, workers: int | None = None) -> subprocess.Popen:
    """起真 uvicorn：单 worker 测执行模型，4 workers 测进程分发"""
    cmd = [sys.executable, "-m", "uvicorn", f"{MODULE}:app",
           "--host", "127.0.0.1", "--port", str(port), "--log-level", "warning"]
    if workers:
        cmd += ["--workers", str(workers)]
    return subprocess.Popen(cmd, cwd=LAB_DIR,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def wait_ready(url: str, timeout: float = 20.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if httpx.get(f"{url}/pool-capacity", timeout=2).status_code == 200:
                return
        except httpx.HTTPError:
            time.sleep(0.2)
    raise RuntimeError(f"服务器 {url} 未在 {timeout}s 内就绪")


async def fetch_all(url_path: str, n: int) -> tuple[list[dict], float]:
    """n 个并发请求，返回 (响应列表, 总耗时)"""
    limits = httpx.Limits(max_connections=n, max_keepalive_connections=n)
    async with httpx.AsyncClient(limits=limits, timeout=30) as client:
        t0 = time.perf_counter()
        rs = await asyncio.gather(*[client.get(f"{url_path}") for _ in range(n)])
        cost = time.perf_counter() - t0
    assert all(r.status_code == 200 for r in rs)
    return [r.json() for r in rs], cost


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. 执行位置：线程名不会说谎
# ============================================================

def demo_location(base: str) -> None:
    section("1. 执行位置：async 在事件循环线程，def 在线程池")
    a = httpx.get(f"{base}/io-async", timeout=10).json()
    s = httpx.get(f"{base}/io-sync", timeout=10).json()
    cap = httpx.get(f"{base}/pool-capacity", timeout=10).json()["capacity"]
    print(f"  async def 执行线程: {a['thread']!r}（uvicorn 主线程 = 事件循环）")
    print(f"  def       执行线程: {s['thread']!r}（anyio 托管的工作线程）")
    print(f"  anyio 线程池容量: {cap}（def 版并发的天花板）")
    assert a["thread"] == "MainThread", f"async 应跑在事件循环线程: {a}"
    assert "AnyIO" in s["thread"], f"sync 应跑在线程池工作线程: {s}"
    assert cap == 40, f"默认线程池容量应为 40: {cap}"


# ============================================================
# 2. 并发对比：100 个 0.5s 延迟请求，两种命运
# ============================================================

def demo_concurrency(base: str) -> None:
    section("2. 并发对比：100 并发 × 0.5s 延迟（验收点）")
    results_a, cost_a = asyncio.run(fetch_all(f"{base}/io-async", 100))
    results_s, cost_s = asyncio.run(fetch_all(f"{base}/io-sync", 100))
    print(f"  async def: 100 并发总耗时 {cost_a:.2f}s（事件循环把 100 个 sleep 串联等待）")
    print(f"  def      : 100 并发总耗时 {cost_s:.2f}s（40 容量线程池 → 约 3 批 × 0.5s）")
    assert cost_a < 2.0, f"async 版应 <2s（串行需 50s），实际 {cost_a:.2f}s"
    ratio = cost_s / cost_a
    assert ratio >= 2.0, f"def/async 比值应 ≥2，实际 {ratio:.2f}"
    print(f"  比值 {ratio:.2f}× ≥ 2 ✓——async 赢在'等待不占线程'，而不是魔法加速")
    sync_threads = {r["thread"] for r in results_s}
    print(f"  def 版响应里出现的线程名: {len(sync_threads)} 种（工作线程同名；数量受容量 40 限制，请求分批跑）")


# ============================================================
# 3. 多 worker 进程分发：同一端口，多个 PID
# ============================================================

def demo_workers() -> None:
    section("3. uvicorn --workers 4：同一 socket 的进程级分发（验收点）")
    port = free_port()
    base = f"http://127.0.0.1:{port}"
    proc = start_server(port, workers=4)
    try:
        wait_ready(base)
        results, _ = asyncio.run(fetch_all(f"{base}/io-async", 100))
        pids = {r["pid"] for r in results}
        print(f"  100 个请求被分发给 {len(pids)} 个 worker 进程: {sorted(pids)}")
        assert len(pids) >= 3, f"应至少出现 3 个不同 PID，实际 {pids}"
        print(f"  原理：4 个 worker 共享同一监听 socket，内核决定谁 accept——负载均衡在内核层")
    finally:
        proc.terminate()
        proc.wait(timeout=10)
    print("  服务器已优雅退出，无端口残留")


def main() -> None:
    from importlib.metadata import version as _v
    if tuple(int(x) for x in _v("fastapi").split(".")[:2]) < (0, 100):
        sys.exit(f"本实验需要 fastapi ≥ 0.100（当前 {_v('fastapi')}）。"
                 f"请先激活系列环境：source ../.venv/bin/activate")
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · FastAPI {version('fastapi')} + "
          f"uvicorn {version('uvicorn')} · async 真相实验")
    port = free_port()
    base = f"http://127.0.0.1:{port}"
    proc = start_server(port)  # 单 worker：测执行模型与并发
    try:
        wait_ready(base)
        demo_location(base)
        demo_concurrency(base)
    finally:
        proc.terminate()
        proc.wait(timeout=10)
    demo_workers()

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 执行位置（MainThread vs AnyIO 线程）、并发比值 ≥2、≥3 个 worker PID")


if __name__ == "__main__":
    main()
