"""
gil_concurrency 示意图生成脚本
输出: images/gil_concurrency.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

第 2/3 面板的柱状图使用真实基准测试数据
(from gil_concurrency import bench_cpu, bench_io)。
"""

import os
import sys

# 固定头部: 从脚本位置定位实验根目录, 保证任何 cwd 运行都输出正确
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LAB_ROOT = os.path.dirname(SCRIPT_DIR)
os.chdir(LAB_ROOT)
sys.path.insert(0, LAB_ROOT)

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

from gil_concurrency import bench_cpu, bench_io

# 中文字体探测 (macOS 优先 PingFang SC, 兜底 SimHei)
for _f in ["PingFang SC", "Heiti SC", "STHeiti", "SimHei"]:
    if any(_f in f.name for f in fm.fontManager.ttflist):
        plt.rcParams["font.sans-serif"] = [_f, "DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False
        break


def generate_visualization():
    fig, axes = plt.subplots(1, 3, figsize=(20, 7))
    fig.suptitle("GIL & Concurrency -- Benchmarks",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) GIL 工作原理 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("GIL Threading Model", fontsize=12, fontweight="bold")
    ax.axis("off")

    # 线程时间线
    threads = [
        ("Thread 1", 8.5, "#4C72B0"),
        ("Thread 2", 6.5, "#DD8452"),
        ("Thread 3", 4.5, "#55A868"),
    ]
    for name, y, color in threads:
        ax.text(0.3, y, name, ha="left", va="center", fontsize=9,
                fontweight="bold", color=color)
        # timeline
        ax.plot([2, 9], [y, y], color=color, lw=1, alpha=0.3)

    # GIL 持有片段
    gil_segments = [
        (2.5, 4.0, 8.5, "#4C72B0"),
        (4.0, 5.5, 6.5, "#DD8452"),
        (5.5, 7.0, 4.5, "#55A868"),
        (7.0, 8.0, 8.5, "#4C72B0"),
        (8.0, 9.0, 6.5, "#DD8452"),
    ]
    for x1, x2, y, color in gil_segments:
        ax.barh(y, x2 - x1, left=x1, height=0.6, color=color, alpha=0.4,
                edgecolor=color, lw=1.5)

    ax.text(5.5, 2.5, "Only ONE thread holds GIL at a time",
            ha="center", fontsize=9, fontweight="bold", color="#C44E52")
    ax.text(5.5, 1.8, "Threads alternate: switch every ~5ms",
            ha="center", fontsize=8, color="#666")

    # ---- 2) CPU-bound 结果 ----
    ax = axes[1]
    cpu_results = bench_cpu(n=5000, workers=4)
    names = ["Serial", "Threading\n(GIL blocked)", "Multiprocessing\n(parallel)"]
    times = [cpu_results["serial"], cpu_results["threading"], cpu_results["multiprocessing"]]
    colors = ["#4C72B0", "#C44E52", "#55A868"]

    bars = ax.bar(names, times, color=colors, edgecolor="#333", width=0.5)
    ax.set_ylabel("Time (s)")
    ax.set_title("CPU-Bound Benchmark", fontsize=12, fontweight="bold")
    ax.grid(axis="y", alpha=0.2)

    for bar, t in zip(bars, times):
        speedup = cpu_results["serial"] / t
        label = f"{t:.2f}s"
        if speedup != 1.0:
            label += f"\n({speedup:.1f}x)"
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                label, ha="center", fontsize=9, color="#333")

    # ---- 3) I/O-bound 结果 ----
    ax = axes[2]
    io_results = bench_io(workers=8, duration=0.1)
    names = ["Serial", "Threading\n(GIL released)", "Asyncio\n(event loop)"]
    times = [io_results["serial"], io_results["threading"], io_results["asyncio"]]
    colors = ["#4C72B0", "#55A868", "#8172B2"]

    bars = ax.bar(names, times, color=colors, edgecolor="#333", width=0.5)
    ax.set_ylabel("Time (s)")
    ax.set_title("I/O-Bound Benchmark", fontsize=12, fontweight="bold")
    ax.grid(axis="y", alpha=0.2)

    for bar, t in zip(bars, times):
        speedup = io_results["serial"] / max(t, 0.001)
        label = f"{t:.2f}s\n({speedup:.1f}x)"
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
                label, ha="center", fontsize=9, color="#333")

    fig.tight_layout()
    path = os.path.join("images", "gil_concurrency.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
