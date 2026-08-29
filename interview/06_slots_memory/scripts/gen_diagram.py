"""
slots_memory 示意图生成脚本
输出: images/slots_memory.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

第 2/3 面板使用真实测量数据
(from slots_memory import RegularPoint, SlotPoint, benchmark_access)。
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
import numpy as np
from matplotlib.patches import FancyBboxPatch

from slots_memory import RegularPoint, SlotPoint, benchmark_access

# 中文字体探测 (macOS 优先 PingFang SC, 兜底 SimHei)
for _f in ["PingFang SC", "Heiti SC", "STHeiti", "SimHei"]:
    if any(_f in f.name for f in fm.fontManager.ttflist):
        plt.rcParams["font.sans-serif"] = [_f, "DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False
        break


def generate_visualization():
    fig, axes = plt.subplots(1, 3, figsize=(20, 7))
    fig.suptitle("__slots__ -- Memory & Performance",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) 内存结构对比 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Instance Memory Layout", fontsize=12, fontweight="bold")
    ax.axis("off")

    # __dict__ 对象
    box = FancyBboxPatch((0.5, 5.0), 4.0, 3.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#C44E52", alpha=0.1,
                         edgecolor="#C44E52", lw=2)
    ax.add_patch(box)
    ax.text(2.5, 8.0, "RegularPoint", ha="center",
            fontsize=11, fontweight="bold", color="#C44E52")
    items = [
        (1.3, 6.8, "obj header", "#666"),
        (1.3, 6.2, "refcount", "#666"),
        (1.3, 5.6, "__dict__ ->", "#C44E52"),
    ]
    for x, y, text, color in items:
        ax.text(x, y, text, fontsize=8, color=color)

    dict_box = FancyBboxPatch((2.8, 5.1), 1.5, 2.5,
                              boxstyle="round,pad=0.08",
                              facecolor="#fff3cd", edgecolor="#DD8452", lw=1.5)
    ax.add_patch(dict_box)
    ax.text(3.55, 7.0, "__dict__", ha="center", fontsize=8,
            fontweight="bold", color="#DD8452")
    ax.text(3.55, 6.3, "x -> 1", ha="center", fontsize=8, color="#666")
    ax.text(3.55, 5.7, "y -> 2", ha="center", fontsize=8, color="#666")

    ax.text(2.5, 4.5, "~48 B + __dict__ (~88-104 B)", ha="center", fontsize=10,
            fontweight="bold", color="#C44E52")

    # slots 对象
    box = FancyBboxPatch((5.5, 5.0), 4.0, 3.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#55A868", alpha=0.1,
                         edgecolor="#55A868", lw=2)
    ax.add_patch(box)
    ax.text(7.5, 8.0, "SlotPoint", ha="center",
            fontsize=11, fontweight="bold", color="#55A868")
    items = [
        (6.3, 6.8, "obj header", "#666"),
        (6.3, 6.2, "refcount", "#666"),
        (6.3, 5.6, "x = 1", "#55A868"),
        (6.3, 5.1, "y = 2", "#55A868"),
    ]
    for x, y, text, color in items:
        ax.text(x, y, text, fontsize=8, color=color)

    ax.text(7.5, 4.5, "~48 bytes", ha="center", fontsize=10,
            fontweight="bold", color="#55A868")

    # 下方说明
    box = FancyBboxPatch((0.5, 1.0), 9.0, 2.8,
                         boxstyle="round,pad=0.12",
                         facecolor="#f5f5f5", edgecolor="#999", lw=1.5)
    ax.add_patch(box)
    lines = [
        ("__dict__: hash table", "#C44E52"),
        ("  Flexible: add/remove attrs at runtime", "#666"),
        ("  Cost: ~136-152 B per instance (obj + dict, varies by version)", "#666"),
        ("__slots__: descriptor array", "#55A868"),
        ("  Fixed: only declared attrs allowed", "#666"),
        ("  Cost: ~48 bytes per instance (offset lookup, py3.10)", "#666"),
    ]
    for i, (text, color) in enumerate(lines):
        ax.text(1.0, 3.4 - i * 0.5, text, fontsize=8, color=color)

    # ---- 2) 大规模内存对比 ----
    ax = axes[1]
    N_values = [100, 500, 1000, 5000, 10000]
    regular_mem = []
    slot_mem = []

    for n in N_values:
        r_size = sys.getsizeof(RegularPoint(0, 0)) + sys.getsizeof(RegularPoint(0, 0).__dict__)
        s_size = sys.getsizeof(SlotPoint(0, 0))
        regular_mem.append(n * r_size / 1024)
        slot_mem.append(n * s_size / 1024)

    x = np.arange(len(N_values))
    w = 0.35
    ax.bar(x - w/2, regular_mem, w, label="Regular (__dict__)", color="#C44E52", edgecolor="#333")
    ax.bar(x + w/2, slot_mem, w, label="__slots__", color="#55A868", edgecolor="#333")
    ax.set_xticks(x)
    ax.set_xticklabels([str(n) for n in N_values])
    ax.set_xlabel("Number of instances")
    ax.set_ylabel("Memory (KB)")
    ax.set_title("Memory Usage by Instance Count", fontsize=12, fontweight="bold")
    ax.legend()
    ax.grid(axis="y", alpha=0.2)

    # ---- 3) 访问速度对比 ----
    ax = axes[2]
    bench = benchmark_access()
    categories = ["Write", "Read"]
    regular_times = [bench["regular_write"], bench["regular_read"]]
    slot_times = [bench["slot_write"], bench["slot_read"]]

    x = np.arange(len(categories))
    w = 0.3
    bars1 = ax.bar(x - w/2, regular_times, w, label="Regular", color="#C44E52", edgecolor="#333")
    bars2 = ax.bar(x + w/2, slot_times, w, label="__slots__", color="#55A868", edgecolor="#333")
    ax.set_xticks(x)
    ax.set_xticklabels(categories)
    ax.set_ylabel("Time (s)")
    ax.set_title("Attribute Access Speed (1M x 100)", fontsize=12, fontweight="bold")
    ax.legend()
    ax.grid(axis="y", alpha=0.2)

    for bars in [bars1, bars2]:
        for bar in bars:
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                    f"{bar.get_height():.3f}", ha="center", fontsize=7, color="#333")

    fig.tight_layout()
    path = os.path.join("images", "slots_memory.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
