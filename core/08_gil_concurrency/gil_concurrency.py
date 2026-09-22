"""
GIL 与并发模型 —— threading / multiprocessing / asyncio
面试高频题: GIL 是什么、为什么多线程不能利用多核、如何绕过 GIL

GIL (Global Interpreter Lock) 是 CPython 的全局锁:
- 同一时刻只有一个线程执行 Python 字节码
- I/O 密集型任务不受影响（释放 GIL 等待 I/O）
- CPU 密集型任务需要 multiprocessing 绕过 GIL

核心概念:
- GIL: CPython 的全局解释器锁，保护内部状态
- threading: 适合 I/O 密集（网络/文件/DB），GIL 在 I/O 时释放
- multiprocessing: 适合 CPU 密集，每个进程独立 GIL
- asyncio: 适合大量 I/O 并发，单线程事件循环
- ThreadPoolExecutor / ProcessPoolExecutor: 高级封装

交互示意图: 用浏览器打开 images/gil_concurrency.archify.html
"""

import time
import os
import sys
import math


# ============================================================
# 1. CPU 密集型任务
# ============================================================

def cpu_heavy(n):
    """CPU 密集: 计算 n 以内所有素数"""
    count = 0
    for i in range(2, n):
        is_prime = True
        for j in range(2, int(math.sqrt(i)) + 1):
            if i % j == 0:
                is_prime = False
                break
        if is_prime:
            count += 1
    return count


# ============================================================
# 2. I/O 密集型任务（模拟）
# ============================================================

def io_heavy(duration):
    """I/O 密集: 模拟网络请求（用 sleep）"""
    time.sleep(duration)
    return duration


# ============================================================
# 3. 串行 vs threading vs multiprocessing
# ============================================================

def bench_cpu(n=5000, workers=4):
    """CPU 密集任务: 串行 / threading / multiprocessing"""
    from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

    # 串行
    t0 = time.perf_counter()
    for _ in range(workers):
        cpu_heavy(n)
    t_serial = time.perf_counter() - t0

    # threading
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.submit(cpu_heavy, n) for _ in range(workers))
    t_thread = time.perf_counter() - t0

    # multiprocessing
    t0 = time.perf_counter()
    with ProcessPoolExecutor(max_workers=workers) as pool:
        list(pool.submit(cpu_heavy, n) for _ in range(workers))
    t_process = time.perf_counter() - t0

    return {
        "serial": t_serial,
        "threading": t_thread,
        "multiprocessing": t_process,
    }


def bench_io(workers=8, duration=0.1):
    """I/O 密集任务: 串行 / threading / asyncio"""
    from concurrent.futures import ThreadPoolExecutor
    import asyncio

    # 串行
    t0 = time.perf_counter()
    for _ in range(workers):
        io_heavy(duration)
    t_serial = time.perf_counter() - t0

    # threading
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.submit(io_heavy, duration) for _ in range(workers))
    t_thread = time.perf_counter() - t0

    # asyncio
    async def async_io():
        await asyncio.gather(*[asyncio.sleep(duration) for _ in range(workers)])

    t0 = time.perf_counter()
    asyncio.run(async_io())
    t_async = time.perf_counter() - t0

    return {
        "serial": t_serial,
        "threading": t_thread,
        "asyncio": t_async,
    }


# ============================================================
# 4. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("GIL & Concurrency -- Demo Mode")
    print("=" * 60)

    # 1) GIL info
    print("\n[1] GIL info:")
    print(f"  Python: {sys.version.split()[0]}")
    print(f"  Implementation: {sys.implementation.name}")
    print(f"  GIL exists: {hasattr(sys, 'getswitchinterval')}")
    if hasattr(sys, "getswitchinterval"):
        print(f"  Switch interval: {sys.getswitchinterval()*1000:.0f}ms")
    print(f"  CPU count: {os.cpu_count()}")

    # 2) CPU-bound benchmark
    print("\n[2] CPU-bound (prime counting, 5000, 4 workers):")
    print("  This may take a few seconds...")
    cpu_results = bench_cpu(n=5000, workers=4)
    for name, t in cpu_results.items():
        print(f"  {name:>20s}: {t:.3f}s")
    # 比值 >1 表示比串行更慢（耗时比）；结论按实测动态判断, 不硬编码
    t_ratio = cpu_results["threading"] / cpu_results["serial"]
    p_ratio = cpu_results["multiprocessing"] / cpu_results["serial"]
    print(f"\n  Threading/Serial time ratio:       {t_ratio:.2f}  (>1 = slower)")
    print(f"  Multiprocessing/Serial time ratio: {p_ratio:.2f}  (>1 = slower)")
    if t_ratio > 1.05:
        print("  → Threading SLOWER (GIL contention)")
    else:
        print("  → Threading ≈ Serial (GIL: no CPU parallel gain)")
    if p_ratio < 0.75:
        print("  → Multiprocessing FASTER (parallel execution)")
    else:
        print("  → Multiprocessing looks SLOWER at n=5000: process startup cost")
        print("    dominates this tiny workload (try bench_cpu(n=200000) for real speedup)")

    # 3) I/O-bound benchmark
    print("\n[3] I/O-bound (8 x 100ms sleep):")
    io_results = bench_io(workers=8, duration=0.1)
    for name, t in io_results.items():
        print(f"  {name:>20s}: {t:.3f}s")
    print(f"\n  Threading vs Serial: {io_results['serial']/max(io_results['threading'], 0.001):.2f}x speedup")
    print(f"  asyncio vs Serial:   {io_results['serial']/max(io_results['asyncio'], 0.001):.2f}x speedup")
    print("  → Both FASTER (GIL released during I/O)")

    # 4) GIL release demo
    print("\n[4] When GIL is released:")
    scenarios = [
        ("time.sleep()", True, "I/O wait"),
        ("socket.recv()", True, "Network I/O"),
        ("open().read()", True, "File I/O"),
        ("for x in range(10**9)", False, "Pure Python"),
        ("numpy.sum(arr)", True, "C ext, explicit release"),
        ("re.match(pattern, text)", False, "C ext, no release"),
    ]
    print(f"  {'Operation':<30} {'GIL Released':<14} {'Why'}")
    print(f"  {'-'*30} {'-'*14} {'-'*20}")
    for op, released, why in scenarios:
        status = "Yes" if released else "No"
        print(f"  {op:<30} {status:<14} {why}")

    # 5) Choosing the right model
    print("\n[5] Decision guide:")
    print("  CPU-bound (heavy computation):")
    print("    → multiprocessing (bypass GIL)")
    print("    → or C extension / numpy (release GIL in C)")
    print("  I/O-bound (network, file, DB):")
    print("    → asyncio (most efficient, single thread)")
    print("    → threading (simple, works well)")
    print("  Mixed:")
    print("    → asyncio + run_in_executor for CPU parts")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 交互示意图见 images/gil_concurrency.archify.html
    run_demo()
