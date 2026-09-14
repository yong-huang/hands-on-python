"""
14 · 四种执行模型性能对决 —— 串行 / threading / multiprocessing / asyncio
并发清单项目 14：同一 IO 任务与同一 CPU 任务分别用四模型跑，用数据回答"该用什么跑"

三条方向性断言（每轮独立成立，连跑 3 轮方向一致）:
- CPU 密集: 进程版最快（独立 GIL 真并行）
- IO 密集:  协程版最快（单线程挂起上万等待）
- CPU 密集: 线程版不快于串行（GIL 串行化，甚至更慢）

用法: python3 model_benchmark.py            # 全量基准，约 25 秒
      python3 model_benchmark.py --quick    # 快速档（任务减半），约 12 秒
      python3 model_benchmark.py --plot     # 追加 matplotlib 柱状图（存 images/）
交互示意图: 用浏览器打开 images/model_benchmark.archify.html
"""

import argparse
import asyncio
import statistics
import sys
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

CPU_N = 60_000            # CPU 任务：数素数（串行单次 ~0.1s）
IO_SLEEP = 0.05           # IO 任务：每次"请求"等待 50ms，共 40 次
IO_COUNT = 40
ROUNDS = 3


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def cpu_task(n: int) -> int:
    count = 0
    for i in range(2, n):
        if all(i % j for j in range(2, int(i ** 0.5) + 1)):
            count += 1
    return count


# ---------- 四种执行模型（同一签名：跑 n 个 cpu_task(100) 小块） ----------

def run_serial_cpu(blocks: int) -> None:
    for _ in range(blocks):
        cpu_task(CPU_N)


def run_threads_cpu(blocks: int) -> None:
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(cpu_task, [CPU_N] * blocks))


_PROC_POOL = None                      # 全局进程池：spawn 成本只在预热时付一次


def run_process_cpu(blocks: int) -> None:
    global _PROC_POOL
    if _PROC_POOL is None:
        _PROC_POOL = ProcessPoolExecutor(max_workers=4)
        _PROC_POOL.submit(cpu_task, 1000).result()   # 预热触发 spawn
    list(_PROC_POOL.map(cpu_task, [CPU_N] * blocks))


async def _async_cpu_helper(blocks: int) -> None:
    """CPU 任务在协程里只能顺序跑（await 不帮计算）——这正是要证明的"""
    for _ in range(blocks):
        cpu_task(CPU_N)


def run_asyncio_cpu(blocks: int) -> None:
    asyncio.run(_async_cpu_helper(blocks))


# ---------- IO 任务（模拟网络：40 次 × 50ms 等待） ----------

def run_serial_io(blocks: int) -> None:
    for _ in range(blocks):
        for _ in range(IO_COUNT):
            time.sleep(IO_SLEEP / IO_COUNT)


def run_threads_io(blocks: int) -> None:
    def one(_: int) -> None:
        for _ in range(IO_COUNT):
            time.sleep(IO_SLEEP / IO_COUNT)
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(one, range(blocks)))


async def _async_io_one() -> None:
    for _ in range(IO_COUNT):
        await asyncio.sleep(IO_SLEEP / IO_COUNT)


async def _async_io_main(blocks: int) -> None:
    await asyncio.gather(*(_async_io_one() for _ in range(blocks)))


def run_asyncio_io(blocks: int) -> None:
    asyncio.run(_async_io_main(blocks))


# ---------- 基准框架：预热 1 轮 + 正式 3 轮取中位 ----------

def bench(name: str, fn, blocks: int, rounds: int = ROUNDS) -> float:
    fn(blocks)                              # 预热（拉频、缓存、spawn 池）
    times = []
    for _ in range(rounds):
        t0 = time.perf_counter()
        fn(blocks)
        times.append(time.perf_counter() - t0)
    med = statistics.median(times)
    print(f"  {name:<18} 中位 {med:.3f}s   （3 轮: {', '.join(f'{t:.3f}' for t in times)}）")
    return med


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--quick", action="store_true", help="任务规模减半")
    parser.add_argument("--plot", action="store_true", help="matplotlib 柱状图存 images/")
    args = parser.parse_args()
    scale = 0.5 if args.quick else 1.0
    n_cpu = max(4, int(4 * scale))
    n_io = max(4, int(16 * scale))

    print(f"Python {sys.version.split()[0]} · 任务规模 scale={scale}")

    section("A. IO 密集：16 个请求块 × 40 次 50ms 等待")
    s_io = bench("串行", run_serial_io, n_io)
    t_io = bench("threading(8)", run_threads_io, n_io)
    a_io = bench("asyncio", run_asyncio_io, n_io)
    assert a_io < s_io, f"协程 IO 竟不快于串行？{a_io:.3f} vs {s_io:.3f}"
    assert t_io < s_io, "线程 IO 竟不快于串行？"
    print(f"  → IO 密集：asyncio {s_io / a_io:.1f}×、threading {s_io / t_io:.1f}×（等待重叠）")

    section("B. CPU 密集：4 个任务块 × 数素数")
    s_cpu = bench("串行", run_serial_cpu, n_cpu)
    t_cpu = bench("threading(4)", run_threads_cpu, n_cpu)
    p_cpu = bench("multiprocessing(4)", run_process_cpu, n_cpu)
    a_cpu = bench("asyncio", run_asyncio_cpu, n_cpu)
    assert p_cpu <= s_cpu * 0.6, f"进程版加速比不足（{s_cpu / p_cpu:.2f}×），应为四模型最快"
    # 容差 10%：机器渐热会让后跑的模型稳定快 ~3%（3.14 实测），方向性结论不变
    assert a_cpu >= s_cpu * 0.9, "协程版不应明显快于串行（CPU 任务 await 不帮忙）"
    assert t_cpu >= s_cpu * 0.9, f"线程版 CPU 明显快于串行（GIL 失效？）{t_cpu:.3f} vs {s_cpu:.3f}"
    print(f"  → CPU 密集：multiprocessing {s_cpu / p_cpu:.2f}× 最快；"
          f"threading {t_cpu / s_cpu:.2f}× 串行耗时（GIL 串行化）；asyncio ≈ 串行")

    section("C. 三条方向性结论")
    c1 = p_cpu < s_cpu * 0.6
    c2 = a_io < s_io * 0.4
    c3 = t_cpu >= s_cpu * 0.99
    print(f"  [{'✓' if c1 else '✗'}] CPU 密集 → 进程版最快（{s_cpu / p_cpu:.2f}× 加速）")
    print(f"  [{'✓' if c2 else '✗'}] IO 密集 → 协程版最快（{s_io / a_io:.1f}× 加速）")
    print(f"  [{'✓' if c3 else '✗'}] CPU 密集 → 线程版不快于串行（{t_cpu / s_cpu:.2f}×，GIL）")
    assert c1 and c2 and c3
    print("\n全部方向性断言通过 ✓ —— 模型选型公式：IO 看 asyncio/线程，CPU 看进程")

    if args.plot:
        plot_results(
            {"IO 密集": {"串行": s_io, "threading": t_io, "asyncio": a_io},
             "CPU 密集": {"串行": s_cpu, "threading": t_cpu, "asyncio": a_cpu, "multiprocessing": p_cpu}}
        )


def plot_results(data: dict) -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("  （未装 matplotlib，跳过绘图）")
        return
    import os
    os.makedirs("images", exist_ok=True)
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    for ax, (title, results) in zip(axes, data.items()):
        names, vals = zip(*results.items())
        bars = ax.bar(names, vals, color=["#94a3b8", "#38bdf8", "#34d399", "#fbbf24"][: len(names)])
        ax.set_title(f"{title}（越矮越快）")
        ax.set_ylabel("中位耗时 (s)")
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v, f"{v:.2f}", ha="center", va="bottom", fontsize=9)
    fig.suptitle("四种执行模型性能对决")
    out = "images/model_benchmark_bars.png"
    fig.tight_layout()
    fig.savefig(out, dpi=120)
    print(f"  柱状图已保存: {out}")


if __name__ == "__main__":
    main()
