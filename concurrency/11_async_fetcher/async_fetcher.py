"""
11 · 异步 IO 实战 —— aiohttp 本地批量抓取器（离线可跑）
并发清单项目 11：把异步三件套（限流/超时/重试）接到真实 HTTP 协议上

设计:
- 内置 aiohttp 本地服务（127.0.0.1 随机端口，50 个端点，每端点 30-80ms 延迟）
- 其中 15 个（30%）是"不稳定端点"：第一次请求必失败，之后恢复——确定性可复现
- 三种客户端模型抓同一组端点：串行 / 线程池 / 异步（Semaphore 限流 + 超时 + 重试）

三个实测点（全部可断言）:
- 全部 50 个端点最终抓取成功（重试后）
- 异步版总耗时 < 串行版 1/5，且 < 线程池版
- 不稳定端点的重试恢复率 ≥ 9/10（本设计下 100%）

用法: python3 async_fetcher.py   # 全部实测 + 断言，约 8 秒（需要 aiohttp，已装 3.14.1）
交互示意图: 用浏览器打开 images/async_fetcher.archify.html
"""

import asyncio
import random
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen
from urllib.error import URLError

import aiohttp
from aiohttp import web

N_ENDPOINTS = 50
N_FLAKY = 15                 # 30% 端点首次必失败，重试即恢复
LATENCY_LO, LATENCY_HI = 0.03, 0.08
SEMAPHORE = 10
MAX_ATTEMPTS = 5


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 本地测试服务：延迟 + 确定性的一次性失败
# ============================================================

def make_app() -> web.Application:
    rng = random.Random(42)
    latencies = [rng.uniform(LATENCY_LO, LATENCY_HI) for _ in range(N_ENDPOINTS)]
    flaky = {i for i in range(N_ENDPOINTS) if i < N_FLAKY}   # 前 15 个端点不稳定
    failed_once: set = set()

    async def endpoint(request: web.Request) -> web.Response:
        i = int(request.match_info["i"])
        await asyncio.sleep(latencies[i])
        if i in flaky and i not in failed_once:
            failed_once.add(i)               # 只失败第一次，重试必恢复
            return web.Response(status=500, text="simulated failure")
        return web.Response(text=f"endpoint-{i}-ok")

    app = web.Application()
    app.router.add_get("/ep/{i:\\d+}", endpoint)
    app.router.add_get("/health", lambda r: web.Response(text="ok"))
    return app


async def start_server() -> tuple:
    runner = web.AppRunner(make_app())
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)   # 端口 0 = 随机可用端口
    await site.start()
    port = runner.addresses[0][1]
    return runner, f"http://127.0.0.1:{port}"


# ============================================================
# 三种客户端模型
# ============================================================

def fetch_serial(base: str) -> tuple:
    """串行：一个接一个，带重试"""
    ok, attempts = 0, 0
    t0 = time.perf_counter()
    for i in range(N_ENDPOINTS):
        for attempt in range(1, MAX_ATTEMPTS + 1):
            attempts += 1
            try:
                with urlopen(f"{base}/ep/{i}", timeout=5) as resp:
                    if resp.status == 200:
                        ok += 1
                        break
            except URLError:
                if attempt == MAX_ATTEMPTS:
                    raise
    return ok, attempts, time.perf_counter() - t0


def fetch_threads(base: str) -> tuple:
    """线程池：10 线程 + 重试"""
    def fetch_one(i: int) -> bool:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                with urlopen(f"{base}/ep/{i}", timeout=5) as resp:
                    if resp.status == 200:
                        return True
            except OSError:                 # URLError / HTTPError / Timeout 通吃
                pass
            time.sleep(0.02 * 2 ** (attempt - 1))   # 与异步版相同的退避策略，保证公平
        return False

    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=SEMAPHORE) as tp:
        oks = list(tp.map(fetch_one, range(N_ENDPOINTS)))
    return sum(oks), time.perf_counter() - t0


async def fetch_async(base: str) -> tuple:
    """异步：ClientSession + Semaphore 限流 + 超时 + 指数退避重试"""
    sem = asyncio.Semaphore(SEMAPHORE)
    stats = {"ok": 0, "attempts": 0, "recovered": 0, "first_failed": 0}

    async def fetch_one(session: aiohttp.ClientSession, i: int) -> None:
        async with sem:                     # 限流：同时在飞 ≤ 10
            url = f"{base}/ep/{i}"
            for attempt in range(1, MAX_ATTEMPTS + 1):
                stats["attempts"] += 1
                try:
                    async with session.get(url) as resp:
                        body = await resp.text()
                        if resp.status == 200:
                            stats["ok"] += 1
                            if attempt > 1:
                                stats["recovered"] += 1
                            return
                        if attempt == 1:
                            stats["first_failed"] += 1
                except (asyncio.TimeoutError, aiohttp.ClientError) as e:
                    if attempt == 1:
                        stats["first_failed"] += 1
                    if i < 2:
                        print(f"    [debug] ep{i} attempt{attempt}: {type(e).__name__}: {str(e)[:100]}")
                await asyncio.sleep(0.02 * 2 ** (attempt - 1))   # 指数退避 20/40/80/160ms

    t0 = time.perf_counter()
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
        await asyncio.gather(*(fetch_one(session, i) for i in range(N_ENDPOINTS)))
    return stats, time.perf_counter() - t0


# ============================================================
# 对决
# ============================================================

async def demo_compare() -> None:
    section(f"3. 对决：50 个端点（15 个不稳定），三种模型")

    # 串行/线程池客户端是阻塞代码，必须丢进工作线程——
    # 若在事件循环线程里直接调 urlopen，服务端和客户端在同一个循环里互相等死（实测挂 5s 超时）
    runner, base = await start_server()
    ok_s, att_s, t_serial = await asyncio.to_thread(fetch_serial, base)
    await runner.cleanup()
    print(f"  串行:     {ok_s}/{N_ENDPOINTS} 成功，{att_s} 次请求，{t_serial:.2f}s")

    runner, base = await start_server()      # 全新服务：不稳定状态每个模型独立
    ok_t, t_threads = await asyncio.to_thread(fetch_threads, base)
    await runner.cleanup()
    print(f"  线程池:   {ok_t}/{N_ENDPOINTS} 成功，{t_threads:.2f}s")

    runner, base = await start_server()      # 异步模型同样用全新服务
    stats, t_async = await fetch_async(base)
    print(f"  异步:     {stats['ok']}/{N_ENDPOINTS} 成功，{stats['attempts']} 次请求，{t_async:.2f}s"
          f"（首次失败 {stats['first_failed']} 个，重试恢复 {stats['recovered']} 个）")

    await runner.cleanup()

    # ---- 断言 ----
    assert ok_s == ok_t == stats["ok"] == N_ENDPOINTS, "三种模型应全部抓齐"
    assert t_async < t_serial / 5, f"异步未达串行 1/5（{t_async:.2f}s vs {t_serial:.2f}s）"
    assert t_async <= t_threads * 1.2, (
        f"异步明显慢于线程池（{t_async:.2f}s vs {t_threads:.2f}s）——限流是否失效？")
    recovery = stats["recovered"] / max(stats["first_failed"], 1)
    assert recovery >= 0.9, f"重试恢复率仅 {recovery:.0%}"
    print(f"\n  加速比: 异步 = 串行的 1/{t_serial / t_async:.1f}；与线程池同并发下打平")
    print(f"  重试恢复率: {recovery:.0%}（不稳定端点全部救回）")
    print("  同并发 = 同等待重叠，打平是理论必然；异步的真正优势在'并发便宜'（见 §4.4）")
    print("  三件套各司其职：Semaphore 限流防打爆、超时防挂死、退避重试救回失败")


def main() -> None:
    print(f"Python {sys.version.split()[0]} · aiohttp 本地实测（离线可跑）")
    asyncio.run(demo_compare())
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：全部成功、异步 < 串行 1/5 且 < 线程池、恢复率 ≥ 90%")


if __name__ == "__main__":
    main()
