"""lab 11 · async def 与 def 的执行真相 —— 演示应用：慢任务 API。

同一条 0.3s 的 IO 等待，用两种端点函数声明各实现一遍，执行线程直接印进响应：

    GET /io-async      async def + await asyncio.sleep(0.3) -> 跑在事件循环（主线程）
    GET /io-def        def + time.sleep(0.3)                -> 被派发进 anyio 线程池执行
    GET /blocking      async def + time.sleep(1.0)          -> 反面教材：整个事件循环停摆
    GET /healthz       健康检查端点，用来观测循环是否被阻塞任务卡住
    GET /thread-names  本进程见过的线程名集合（模块级 set，教学装置）
    GET /pool-limit    读取 anyio 线程池的默认容量（total_tokens == 40）

判定一个端点函数在哪里执行，只看两个维度：
    1. 声明怎么写：async def 的函数体在事件循环线程里跑；def 的函数体被丢进线程池跑；
    2. 函数体干什么：等 IO 时让不让出循环的控制权——await 让出，time.sleep 不让出。

运行（由 11_async_truth.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/11_async_truth --host 127.0.0.1 --port 8911
"""

import asyncio
import threading
import time
from typing import Any

import anyio.to_thread
from fastapi import FastAPI

# ---------------------------------------------------------------------------
# 常量与教学装置
# ---------------------------------------------------------------------------
IO_WAIT: float = 0.3     # 每个慢任务模拟的 IO 等待时长（秒）
BLOCK_WAIT: float = 1.0  # 反面教材端点的阻塞时长（秒）

# 本进程见过的线程名集合。set.add 在 CPython 里是字节码级原子操作，教学场景下
# 并发写入即使发生丢失更新也只是少记一个名字，不影响结论，不值得为此引入锁的噪音
SEEN_THREADS: set[str] = set()


def _snapshot() -> dict[str, Any]:
    """记录并返回当前线程的名字与编号。每个端点函数开头调用一次。

    thread_name 给人看（"MainThread" / "AnyIO worker thread"），thread_ident 用来
    区分线程：anyio 给所有 worker 线程起同一个名字，只有 ident 能证明 20 个并发
    请求真的散在多条不同线程上，而不是同一条线程排队执行。
    """
    t = threading.current_thread()
    SEEN_THREADS.add(t.name)
    return {"thread_name": t.name, "thread_ident": t.ident}


app = FastAPI(
    title="lab11 · async def 与 def 的执行真相",
    description="两种端点声明的执行位置与并发行为：事件循环、anyio 线程池、循环停摆",
)


# ---------------------------------------------------------------------------
# 两个正解：同一条 0.3s 的 IO 等待，两条不同的执行轨道
# ---------------------------------------------------------------------------
@app.get("/io-async")
async def io_async() -> dict[str, Any]:
    """IO 等待的写法之一：async def + await asyncio.sleep。

    await 在等待期间把控制权交还事件循环，循环趁这 0.3s 去处理其他请求——
    20 个并发请求轮流在同一条主线程上让出/恢复，谁也不阻塞谁。
    """
    started = time.perf_counter()
    who = _snapshot()             # 在哪个线程执行？答案：MainThread（事件循环所在线程）
    await asyncio.sleep(IO_WAIT)  # 让出控制权 0.3s：循环继续调度其他请求
    return {
        "endpoint": "/io-async",
        "declaration": "async def",
        "waiter": f"await asyncio.sleep({IO_WAIT})",
        "elapsed": round(time.perf_counter() - started, 3),
        **who,
    }


@app.get("/io-def")
def io_def() -> dict[str, Any]:
    """IO 等待的写法之二：普通 def + time.sleep，函数体随便阻塞。

    FastAPI 看到端点是普通 def，就经 anyio.to_thread.run_sync（Starlette 的
    run_in_threadpool）把它派发进线程池执行——time.sleep 阻塞的只是分到的
    worker 线程，事件循环毫发无损；代价是每个并发请求占用一枚线程池令牌。
    """
    started = time.perf_counter()
    who = _snapshot()     # 在哪个线程执行？答案：AnyIO worker thread（线程池工作线程）
    time.sleep(IO_WAIT)   # 阻塞的是 worker 线程，不是事件循环
    return {
        "endpoint": "/io-def",
        "declaration": "def",
        "waiter": f"time.sleep({IO_WAIT})",
        "elapsed": round(time.perf_counter() - started, 3),
        **who,
    }


# ---------------------------------------------------------------------------
# 反面教材 + 观测仪器
# ---------------------------------------------------------------------------
@app.get("/blocking")
async def blocking() -> dict[str, Any]:
    """反面教材（故意写错）：async def 的函数体里放同步阻塞调用。

    time.sleep 不让出控制权，而它占用的恰恰是事件循环那条唯一的线程——
    它停摆多久，整个进程的所有请求处理就排队多久，GET /healthz 也逃不掉。
    现实中的等价错误：async def 里调 requests.get、同步数据库驱动、重 CPU 循环。
    """
    started = time.perf_counter()
    who = _snapshot()       # 注意：阻塞就发生在 MainThread 上——循环线程自己被钉住
    time.sleep(BLOCK_WAIT)  # 卡住的是事件循环线程本身，不是某个 worker
    return {
        "endpoint": "/blocking",
        "declaration": "async def（错误示范）",
        "waiter": f"time.sleep({BLOCK_WAIT})",
        "elapsed": round(time.perf_counter() - started, 3),
        **who,
    }


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    """健康检查：函数体零阻塞，正常情况亚毫秒返回。

    它是循环停摆的探测仪——demo 里在 3 个 /blocking 占住循环后请求它，
    响应时间会从约 0.002s 涨到约 2.8s：不是它变慢了，是循环腾不出手处理它。
    """
    started = time.perf_counter()
    who = _snapshot()
    return {"status": "ok", "elapsed": round(time.perf_counter() - started, 4), **who}


@app.get("/thread-names")
async def thread_names() -> dict[str, Any]:
    """教学装置：返回本进程自启动以来见过的全部线程名（排序后输出保持稳定）。"""
    return {
        "seen_threads": sorted(SEEN_THREADS),
        "count": len(SEEN_THREADS),
        "note": "anyio 的所有 worker 线程共享同一个名字 'AnyIO worker thread'",
    }


@app.get("/pool-limit")
async def pool_limit() -> dict[str, Any]:
    """读取 anyio 线程池的默认容量：total_tokens == 40（anyio 4.x 的默认值）。

    令牌（token）是线程池的并发额度：每个 def 端点执行前先借一枚、执行完归还。
    40 枚令牌意味着至多 40 个 def 端点函数同时在跑，第 41 个排队等令牌。
    """
    limiter = anyio.to_thread.current_default_thread_limiter()
    return {
        "total_tokens": limiter.total_tokens,
        "borrowed_tokens": limiter.borrowed_tokens,
        "available_tokens": limiter.available_tokens,
    }
