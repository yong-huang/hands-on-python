"""
gc_weakref 示意图生成脚本
输出: images/gc_weakref.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图为静态机制示意图（引用计数 / 循环引用 / strong vs weak ref），
不依赖主模块的实测数据。
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
from matplotlib.patches import FancyBboxPatch

# 中文字体探测 (macOS 优先 PingFang SC, 兜底 SimHei)
for _f in ["PingFang SC", "Heiti SC", "STHeiti", "SimHei"]:
    if any(_f in f.name for f in fm.fontManager.ttflist):
        plt.rcParams["font.sans-serif"] = [_f, "DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False
        break


def generate_visualization():
    fig, axes = plt.subplots(1, 3, figsize=(20, 7))
    fig.suptitle("GC / weakref -- Memory Management",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) 引用计数 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Reference Counting", fontsize=12, fontweight="bold")
    ax.axis("off")

    steps = [
        ("obj = object()", "refcount = 1", "#4C72B0"),
        ("a = obj", "refcount = 2", "#55A868"),
        ("b = a", "refcount = 3", "#DD8452"),
        ("del b", "refcount = 2", "#E8A838"),
        ("del a", "refcount = 1", "#8172B2"),
        ("del obj", "refcount = 0 -> RECLAIMED!", "#C44E52"),
    ]
    for i, (action, result, color) in enumerate(steps):
        y = 9.0 - i * 1.4
        box = FancyBboxPatch((0.5, y-0.4), 5, 0.8,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=1.5)
        ax.add_patch(box)
        ax.text(3, y, action, ha="center", fontsize=8,
                fontweight="bold", color=color, family="monospace")
        ax.text(8, y, result, ha="center", fontsize=9, color=color)

    # ---- 2) 循环引用 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Cyclic Reference", fontsize=12, fontweight="bold")
    ax.axis("off")

    # Nodes
    for x, y, label in [(3, 7.0, "Node A"), (7, 7.0, "Node B")]:
        circle = plt.Circle((x, y), 0.8, facecolor="#DD8452", alpha=0.15,
                             edgecolor="#DD8452", lw=2)
        ax.add_patch(circle)
        ax.text(x, y, label, ha="center", va="center",
                fontsize=11, fontweight="bold", color="#DD8452")

    # Circular arrows
    ax.annotate("", xy=(3.8, 6.5), xytext=(3, 6.2),
                arrowprops=dict(arrowstyle="->", color="#666", lw=2))
    ax.annotate("", xy=(6.2, 6.5), xytext=(7, 6.2),
                arrowprops=dict(arrowstyle="->", color="#666", lw=2))
    # Top arrows
    ax.annotate("", xy=(6.0, 7.8), xytext=(3.8, 7.8),
                arrowprops=dict(arrowstyle="->", color="#666", lw=2,
                                connectionstyle="arc3,rad=0.3"))
    ax.text(5, 8.8, "A.next = B, B.next = A", ha="center",
            fontsize=9, color="#666")

    # refcount labels
    ax.text(3, 5.3, "refcount=2\n(B holds ref)", ha="center",
            fontsize=8, color="#C44E52")
    ax.text(7, 5.3, "refcount=2\n(A holds ref)", ha="center",
            fontsize=8, color="#C44E52")

    # Solution
    box = FancyBboxPatch((1.5, 2.5), 7.0, 2.2,
                         boxstyle="round,pad=0.12",
                         facecolor="#55A868", alpha=0.1,
                         edgecolor="#55A868", lw=2)
    ax.add_patch(box)
    ax.text(5, 4.2, "gc.collect() detects cycle", ha="center",
            fontsize=10, fontweight="bold", color="#55A868")
    ax.text(5, 3.5, "1. Mark all reachable objects", ha="center",
            fontsize=8, color="#333")
    ax.text(5, 3.0, "2. Unreachable objects = cyclic -> collect", ha="center",
            fontsize=8, color="#333")

    # ---- 3) weakref vs strong ref ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("strong ref vs weakref", fontsize=12, fontweight="bold")
    ax.axis("off")

    # Strong ref
    box = FancyBboxPatch((0.5, 6.5), 4.0, 2.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#C44E52", alpha=0.1,
                         edgecolor="#C44E52", lw=2)
    ax.add_patch(box)
    ax.text(2.5, 8.5, "Strong Reference", ha="center",
            fontsize=11, fontweight="bold", color="#C44E52")
    items = ["x = obj", "refcount += 1", "Blocks GC", "Use: normal vars"]
    for i, item in enumerate(items):
        ax.text(2.5, 7.8 - i*0.5, item, ha="center",
                fontsize=8, color="#333")

    # Weak ref
    box = FancyBboxPatch((5.5, 6.5), 4.0, 2.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#55A868", alpha=0.1,
                         edgecolor="#55A868", lw=2)
    ax.add_patch(box)
    ax.text(7.5, 8.5, "Weak Reference", ha="center",
            fontsize=11, fontweight="bold", color="#55A868")
    items = ["wr = weakref.ref(obj)", "refcount unchanged", "Allows GC", "Use: caches, observers"]
    for i, item in enumerate(items):
        ax.text(7.5, 7.8 - i*0.5, item, ha="center",
                fontsize=8, color="#333")

    # Use cases
    box = FancyBboxPatch((0.5, 1.0), 9.0, 4.5,
                         boxstyle="round,pad=0.12",
                         facecolor="#f5f5f5", edgecolor="#999", lw=1.5)
    ax.add_patch(box)
    ax.text(5, 4.8, "weakref use cases:", ha="center",
            fontsize=10, fontweight="bold", color="#4C72B0")
    cases = [
        "WeakKeyDictionary: cache with auto-cleanup",
        "Observer pattern: subscribe without blocking GC",
        "Circular reference avoidance: break ref cycles",
        "Memoization: store results without preventing cleanup",
    ]
    for i, c in enumerate(cases):
        ax.text(5, 4.0 - i * 0.6, f"{i+1}. {c}", ha="center",
                fontsize=8, color="#333")

    fig.tight_layout()
    path = os.path.join("images", "gc_weakref.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
