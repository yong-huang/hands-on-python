"""
callable 示意图生成脚本
输出: images/callable.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图示内容为静态机制示意（__call__ 机制 / 函数 vs 可调用对象 / 策略模式），
不使用主模块的真实运行数据。
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
    fig.suptitle("__call__ -- Callable Objects",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) __call__ 机制 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("__call__ Mechanism", fontsize=12, fontweight="bold")
    ax.axis("off")

    steps = [
        (5, 8.5, "obj(42)", "#4C72B0"),
        (5, 7.0, "Python sees: obj.__call__(42)", "#DD8452"),
        (5, 5.5, "__call__ runs with self=obj", "#55A868"),
        (5, 4.0, "Uses self.factor (instance state)", "#8172B2"),
        (5, 2.5, "Returns 42 * self.factor", "#C44E52"),
    ]
    w, h = 7.0, 1.0
    for i, (x, y, text, color) in enumerate(steps):
        box = FancyBboxPatch((x-w/2, y-h/2), w, h,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=9, fontweight="bold", color=color)
        if i < len(steps) - 1:
            ny = steps[i+1][1]
            ax.annotate("", xy=(5, ny+h/2+0.05), xytext=(5, y-h/2-0.05),
                        arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    # ---- 2) 函数 vs 可调用对象 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Function vs Callable Object", fontsize=12, fontweight="bold")
    ax.axis("off")

    # Function
    box = FancyBboxPatch((0.5, 5.5), 4.0, 3.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#4C72B0", alpha=0.1,
                         edgecolor="#4C72B0", lw=2)
    ax.add_patch(box)
    ax.text(2.5, 8.5, "def fn(x):", ha="center",
            fontsize=11, fontweight="bold", color="#4C72B0")
    items = ["Can be called: fn(5)", "No internal state", "No methods attached",
             "Lightweight", "Simple syntax"]
    for i, item in enumerate(items):
        prefix = "+" if i < 1 else "-"
        ax.text(2.5, 7.6 - i*0.5, f"{prefix} {item}", ha="center",
                fontsize=8, color="#55A868" if prefix == "+" else "#C44E52")

    # Callable object
    box = FancyBboxPatch((5.5, 5.5), 4.0, 3.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#55A868", alpha=0.1,
                         edgecolor="#55A868", lw=2)
    ax.add_patch(box)
    ax.text(7.5, 8.5, "class Callable:", ha="center",
            fontsize=11, fontweight="bold", color="#55A868")
    items = ["Can be called: obj(5)", "Has internal state", "Can add attributes",
             "Slightly heavier", "More flexible"]
    for i, item in enumerate(items):
        prefix = "+" if i < 3 else "-"
        ax.text(7.5, 7.6 - i*0.5, f"{prefix} {item}", ha="center",
                fontsize=8, color="#55A868" if prefix == "+" else "#C44E52")

    ax.text(5, 4.5, "VS", ha="center", fontsize=16, fontweight="bold", color="#999")

    # Use case
    box = FancyBboxPatch((0.5, 1.0), 9.0, 2.8,
                         boxstyle="round,pad=0.12",
                         facecolor="#f5f5f5", edgecolor="#999", lw=1.5)
    ax.add_patch(box)
    ax.text(5, 3.2, "When to use callable objects?", ha="center",
            fontsize=10, fontweight="bold", color="#DD8452")
    cases = ["Need state across calls (accumulator, rate limiter)",
             "Strategy pattern (swap algorithms at runtime)",
             "Decorator pattern (class-based decorators)"]
    for i, c in enumerate(cases):
        ax.text(5, 2.4 - i*0.5, f"{i+1}. {c}", ha="center", fontsize=8, color="#333")

    # ---- 3) 策略模式 ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Strategy with __call__", fontsize=12, fontweight="bold")
    ax.axis("off")

    # Client
    box = FancyBboxPatch((3.5, 8.0), 3.0, 1.2,
                         boxstyle="round,pad=0.1",
                         facecolor="#4C72B0", alpha=0.15,
                         edgecolor="#4C72B0", lw=2)
    ax.add_patch(box)
    ax.text(5, 8.6, "Formatter(strategy)", ha="center",
            fontsize=9, fontweight="bold", color="#4C72B0")

    strategies = [
        (1.5, 5.0, "JSON", "#55A868"),
        (5, 5.0, "CSV", "#DD8452"),
        (8.5, 5.0, "Table", "#8172B2"),
    ]
    for x, y, name, color in strategies:
        box = FancyBboxPatch((x-1.2, y-0.6), 2.4, 1.2,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y, name, ha="center", va="center",
                fontsize=10, fontweight="bold", color=color)

    ax.annotate("", xy=(1.5, 5.6), xytext=(4.0, 7.8),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))
    ax.annotate("", xy=(5, 5.6), xytext=(5, 7.8),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))
    ax.annotate("", xy=(8.5, 5.6), xytext=(6.0, 7.8),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    ax.text(5, 3.0, "fmt = Formatter(format_json)", ha="center",
            fontsize=9, color="#666", style="italic")
    ax.text(5, 2.3, "result = fmt(data)  # calls format_json(data)",
            ha="center", fontsize=9, color="#666", style="italic")
    ax.text(5, 1.3, "Swap strategy at runtime!",
            ha="center", fontsize=10, fontweight="bold", color="#55A868")

    fig.tight_layout()
    path = os.path.join("images", "callable.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
