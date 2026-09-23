"""
10 · 异步生产者-消费者与限流 —— asyncio.Queue / Semaphore / 背压
并发清单项目 10：把流水线搬进单线程世界，背压与限流一个不少

三个实测点（全部可断言）:
- 总量守恒:   异步流水线处理 5000 条任务，每条恰好一次
- Semaphore:  并发上限 10，在飞任务峰值实测 ≤ 10
- 背压:       maxsize 队列把生产速率拉低到消费速率——无界队列内存暴涨 vs 有界平稳

用法: python3 async_pipelines.py   # 全部实测 + 断言，约 3 秒
"""

import asyncio
import sys
import time

N_TASKS = 5000
N_PRODUCERS = 3
N_CONSUMERS = 2
MAXSIZE = 64
SEM_LIMIT = 10


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. 异步流水线：5000 条任务总量守恒（验收点 1）
# ============================================================

async def producer(q: asyncio.Queue, pid: int, n: int, counts: dict) -> None:
    for i in range(n):
        task_id = f"p{pid}-{i}"
        counts[task_id] = counts.get(task_id, 0) + 1   # 生产即登记
        await q.put(task_id)


async def consumer(q: asyncio.Queue, results: dict) -> None:
    while True:
        item = await q.get()
        if item is None:                    # 毒丸：None 对象（单线程内安全）
            q.task_done()
            return
        results[item] = results.get(item, 0) + 1
        q.task_done()


async def pipeline_main(q: asyncio.Queue) -> tuple:
    produced: dict = {}
    results: dict = {}
    base, extra = divmod(N_TASKS, N_PRODUCERS)
    per = [base + extra] + [base] * (N_PRODUCERS - 1)
    producers = [asyncio.create_task(producer(q, i, n, produced)) for i, n in enumerate(per)]
    consumers = [asyncio.create_task(consumer(q, results)) for _ in range(N_CONSUMERS)]

    await asyncio.gather(*producers)        # 生产完毕
    for _ in consumers:
        await q.put(None)                   # 每人一枚毒丸
    await asyncio.gather(*consumers)        # 消费者全部退出
    return produced, results


async def run_pipeline() -> tuple:
    q: asyncio.Queue = asyncio.Queue()      # 无界
    return await pipeline_main(q)


def demo_pipeline() -> None:
    section(f"1. 异步流水线：{N_PRODUCERS} 生产者 × {N_CONSUMERS} 消费者 × {N_TASKS} 条")
    t0 = time.perf_counter()
    produced, results = asyncio.run(run_pipeline())
    secs = time.perf_counter() - t0
    assert len(results) == N_TASKS, f"应处理 {N_TASKS} 条，实际 {len(results)}"
    assert all(c == 1 for c in results.values()), "存在重复处理"
    assert all(c == 1 for c in produced.values()), "生产侧重复"
    print(f"  {len(results):,} 条全部恰好处理一次，耗时 {secs:.2f}s（≈{N_TASKS / secs:,.0f} 条/秒）")
    print("  单线程跑流水线：没有锁、没有 GIL 争用，只有 await 让出")


# ============================================================
# 2. Semaphore：在飞峰值 ≤ 10（验收点 2）
# ============================================================

async def limited_worker(sem: asyncio.Semaphore, wid: int, in_flight: list, peak: list) -> None:
    async with sem:                          # 许可外排队
        in_flight.append(wid)
        peak[0] = max(peak[0], len(in_flight))
        await asyncio.sleep(0.02)            # 模拟受限资源的等待
        in_flight.pop()


async def semaphore_main() -> int:
    sem = asyncio.Semaphore(SEM_LIMIT)
    in_flight: list = []
    peak = [0]
    await asyncio.gather(*(limited_worker(sem, i, in_flight, peak) for i in range(50)))
    return peak[0]


def demo_semaphore() -> None:
    section(f"2. Semaphore({SEM_LIMIT})：50 个任务同时在飞的峰值")
    peak = asyncio.run(semaphore_main())
    assert 1 <= peak <= SEM_LIMIT, f"在飞峰值 {peak} 超出许可数"
    print(f"  50 个任务全部完成，在飞峰值 = {peak}（≤ 许可数 {SEM_LIMIT}）")
    print("  异步版语义与线程版一致，但成本更低：许可就是计数器，不占线程")


# ============================================================
# 3. 背压对比：无界队列内存暴涨 vs maxsize 平稳（验收点 3）
# ============================================================

async def unbounded_run(qsize_samples: list, stop: asyncio.Event) -> int:
    q: asyncio.Queue = asyncio.Queue()       # 无界
    async def fast_producer():
        for i in range(N_TASKS):
            q.put_nowait(i)                  # 不等待地灌
            if i % 250 == 0:
                qsize_samples.append(q.qsize())
                await asyncio.sleep(0)       # 给采样机会
    async def slow_consumer():
        while True:
            await q.get()
            await asyncio.sleep(0.0005)      # 消费明显偏慢
            q.task_done()
    c = asyncio.create_task(slow_consumer())
    await fast_producer()
    stop.set()
    await q.join()
    c.cancel()
    return max(qsize_samples)


async def bounded_run(qsize_samples: list) -> int:
    q: asyncio.Queue = asyncio.Queue(maxsize=MAXSIZE)
    async def producer():
        for i in range(N_TASKS):
            await q.put(i)                   # 满了就等——背压
            if i % 250 == 0:
                qsize_samples.append(q.qsize())
    async def consumer():
        while True:
            await q.get()
            await asyncio.sleep(0.0005)
            q.task_done()
    c = asyncio.create_task(consumer())
    await asyncio.gather(producer())
    await q.join()
    c.cancel()
    return max(qsize_samples)


def demo_backpressure() -> None:
    section(f"3. 背压对比：无界 vs maxsize={MAXSIZE}（慢消费）")
    unbounded_samples: list = []
    stop = asyncio.Event()
    unbounded_peak = asyncio.run(unbounded_run(unbounded_samples, stop))
    bounded_samples: list = []
    bounded_peak = asyncio.run(bounded_run(bounded_samples))
    assert unbounded_peak >= bounded_peak * 5, (
        f"无界峰值 {unbounded_peak} 未显著高于有界 {bounded_peak}，对比不明显")
    assert bounded_peak <= MAXSIZE
    print(f"  无界队列:   峰值长度 = {unbounded_peak:,}（生产一路狂奔，任务堆积在内存里）")
    print(f"  maxsize={MAXSIZE}:  峰值长度 = {bounded_peak}（生产者被按住，内存恒定）")
    print("  背压 = 让过载反馈到源头，而不是让队列悄悄吃光内存")


def main() -> None:
    print(f"Python {sys.version.split()[0]}")
    demo_pipeline()
    demo_semaphore()
    demo_backpressure()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：总量守恒（§1）、峰值 ≤10（§2）、背压生效（§3）")


if __name__ == "__main__":
    main()
