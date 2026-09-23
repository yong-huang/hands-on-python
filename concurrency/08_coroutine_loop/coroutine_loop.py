"""
08 · 协程与事件循环机制 —— async/await、惰性协程、单线程内的并发
并发清单项目 8：切换到 asyncio 世界——单线程怎么并发？await 到底让出了什么？

四个实测点（全部可断言）:
- 惰性:      调用协程函数只生成协程对象，不 await 函数体一行都不跑
- 交错:      两个协程在【同一个线程】内通过 await 互相让出，输出精确交错
- 等价:      asyncio.run() 与手动 loop.run_until_complete() 结果一致
- 对比:      await 链是顺序调用（不并发），create_task 才是真并发

用法: python3 coroutine_loop.py   # 全部实测 + 断言，约 1 秒
"""

import asyncio
import os
import sys
import threading
import time


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. 协程对象是惰性的：调用 ≠ 执行
# ============================================================

async def sample() -> str:
    executed.append("body-ran")
    return "sample-结果"


executed: list = []


def demo_lazy() -> None:
    section("1. 调用协程函数 ≠ 执行函数体")
    coro = sample()                         # 只是创建协程对象
    assert executed == [], "不 await 函数体竟然跑了！"
    print(f"  coro = sample() → {coro!r}")
    print(f"  此刻函数体执行痕迹: {executed}（一行都没跑）")
    result = asyncio.run(coro)              # 事件循环驱动它，才算执行
    assert executed == ["body-ran"] and result == "sample-结果"
    print(f"  asyncio.run(coro) → {result!r}，执行痕迹: {executed}")
    print("  忘记 await 是 asyncio 第一大坑：协程对象被 GC 时会警告'never awaited'")


# ============================================================
# 2. await 让出控制权：单线程内的确定性交错
# ============================================================

async def ticker(name: str, n: int, events: list) -> None:
    for i in range(1, n + 1):
        events.append(f"{name}{i}")
        await asyncio.sleep(0)              # 主动让出：事件循环切换到另一个协程


def demo_interleave() -> None:
    section("2. await 让出控制权：单线程内的交错")

    async def main() -> list:
        events: list = []
        await asyncio.gather(ticker("A", 3, events), ticker("B", 3, events))
        return events

    events = asyncio.run(main())
    # sleep(0) 的让出是确定性的：严格 A1 B1 A2 B2 A3 B3 轮转
    assert events == ["A1", "B1", "A2", "B2", "A3", "B3"], f"交错模式异常: {events}"
    print(f"  交错序列: {' '.join(events)}（sleep(0) 轮转，精确可复现）")
    print("  线程断言：全部协程代码跑在同一个线程上")

    thread_names: list = []

    async def note_thread() -> None:
        thread_names.append(threading.current_thread().name)

    asyncio.run(note_thread())
    assert thread_names == ["MainThread"], f"协程竟不在主线程: {thread_names}"
    print(f"  协程所在线程: {thread_names[0]}（asyncio 从不创建新线程）")
    print("  并发 ≠ 并行：单线程靠 await 主动让出实现'看起来同时'")


# ============================================================
# 3. asyncio.run vs 手动事件循环（等价性）
# ============================================================

async def compute() -> dict:
    await asyncio.sleep(0.01)
    return {"pid": os.getpid(), "thread": threading.current_thread().name, "value": 42}


def demo_run_equivalence() -> None:
    section("3. asyncio.run() vs loop.run_until_complete()")
    r1 = asyncio.run(compute())

    loop = asyncio.new_event_loop()
    try:
        r2 = loop.run_until_complete(compute())
    finally:
        loop.close()

    assert r1["value"] == r2["value"] == 42
    assert r1["pid"] == r2["pid"] == os.getpid()
    assert r1["thread"] == r2["thread"] == "MainThread"
    print(f"  asyncio.run:            {r1}")
    print(f"  run_until_complete:     {r2}")
    print("  结果完全一致——asyncio.run 就是'建循环 + run_until_complete + 清理'的便捷封装")
    print("  注意：一个线程同时只能有一个运行中的事件循环，别嵌套 asyncio.run")


# ============================================================
# 4. await 链 ≠ 并发，create_task 才是
# ============================================================

async def slow_step(tag: str, secs: float) -> str:
    await asyncio.sleep(secs)
    return tag


async def sequential() -> list:
    """await 链：等上一步做完才做下一步——只是异步写法的顺序执行"""
    r = []
    r.append(await slow_step("s1", 0.1))
    r.append(await slow_step("s2", 0.1))
    return r


async def concurrent() -> list:
    """create_task：两个协程同时开跑，await 只是在收结果"""
    t1 = asyncio.create_task(slow_step("c1", 0.1))
    t2 = asyncio.create_task(slow_step("c2", 0.1))
    return [await t1, await t2]


def demo_await_vs_task() -> None:
    section("4. await 链 vs create_task：差的不是语法是并发")
    t0 = time.perf_counter()
    r_seq = asyncio.run(sequential())
    t_seq = time.perf_counter() - t0

    t0 = time.perf_counter()
    r_con = asyncio.run(concurrent())
    t_con = time.perf_counter() - t0

    speedup = t_seq / t_con
    assert r_seq == ["s1", "s2"] and r_con == ["c1", "c2"]
    assert speedup >= 1.5, f"create_task 没并发？加速比仅 {speedup:.2f}×"
    print(f"  await 链（顺序）:  {t_seq * 1000:.0f}ms  {r_seq}")
    print(f"  create_task（并发）: {t_con * 1000:.0f}ms  {r_con}   ({speedup:.2f}×)")
    print("  await coro() 只是带异步语法的函数调用；想同时跑，先 create_task 挂上去")


def main() -> None:
    print(f"Python {sys.version.split()[0]} · pid={os.getpid()}")
    demo_lazy()
    demo_interleave()
    demo_run_equivalence()
    demo_await_vs_task()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：惰性（§1）、单线程交错（§2）、run 等价（§3）、task 并发（§4）")


if __name__ == "__main__":
    main()
