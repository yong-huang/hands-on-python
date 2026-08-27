"""
generator_iterator 示意图生成脚本
输出: images/generator_iterator.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图示内容为机制示意图（yield 执行流程 / send 双向通信 / 惰性管道 / yield from 委托），
不依赖主模块运行时数据。
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
    fig, axes = plt.subplots(2, 2, figsize=(16, 11))
    fig.suptitle("Generator & Iterator -- Internals",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) yield 执行流程 ----
    ax = axes[0][0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("yield Execution Flow", fontsize=12, fontweight="bold")
    ax.axis("off")

    steps = [
        (5, 8.8, "gen = fib()", "#4C72B0", "returns generator\n(not executed yet)"),
        (5, 7.0, "next(gen)", "#DD8452", "runs until first yield\nreturns yielded value"),
        (5, 5.2, "yield 42", "#55A868", "pauses here\nsaves full local state"),
        (5, 3.4, "next(gen) again", "#8172B2", "resumes from pause\nruns until next yield"),
        (5, 1.6, "StopIteration", "#C44E52", "function returns\n(raise StopIteration)"),
    ]
    w, h = 5.5, 0.9
    for i, (x, y, text, color, desc) in enumerate(steps):
        box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x - 0.5, y, text, ha="center", va="center",
                fontsize=9, fontweight="bold", color=color)
        ax.text(x + w/2 + 0.2, y, desc, ha="left", va="center",
                fontsize=7, color="#666")
        if i < len(steps) - 1:
            ny = steps[i+1][1]
            ax.annotate("", xy=(5, ny + h/2 + 0.05),
                        xytext=(5, y - h/2 - 0.05),
                        arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    # ---- 2) send() 双向通信 ----
    ax = axes[0][1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("send() Bidirectional", fontsize=12, fontweight="bold")
    ax.axis("off")

    # 调用方
    box = FancyBboxPatch((0.3, 7.5), 3.5, 1.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#4C72B0", alpha=0.15,
                         edgecolor="#4C72B0", lw=2)
    ax.add_patch(box)
    ax.text(2.05, 8.25, "Caller", ha="center", va="center",
            fontsize=11, fontweight="bold", color="#4C72B0")

    # 生成器
    box = FancyBboxPatch((6.2, 7.5), 3.5, 1.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#55A868", alpha=0.15,
                         edgecolor="#55A868", lw=2)
    ax.add_patch(box)
    ax.text(7.95, 8.25, "Generator", ha="center", va="center",
            fontsize=11, fontweight="bold", color="#55A868")

    # 交互步骤
    interactions = [
        (6.2, "next(gen)", "→", "#DD8452"),
        (5.3, "yield total", "→", "#55A868"),
        (4.4, "gen.send(10)", "→", "#4C72B0"),
        (3.5, "received=10", "→", "#55A868"),
        (2.6, "yield total", "→", "#55A868"),
        (1.7, "gen.send(None)", "→", "#4C72B0"),
    ]
    for y, label, arrow, color in interactions:
        if arrow == "→" and "send" in label or label == "next(gen)":
            ax.annotate(label, xy=(6.1, y), xytext=(3.6, y),
                        arrowprops=dict(arrowstyle="->", color=color, lw=1.5),
                        fontsize=8, color=color, ha="center", va="center")
        elif "yield" in label:
            ax.annotate(label, xy=(3.9, y), xytext=(6.4, y),
                        arrowprops=dict(arrowstyle="->", color=color, lw=1.5),
                        fontsize=8, color=color, ha="center", va="center")
        else:
            ax.text(5, y, label, ha="center", va="center",
                    fontsize=8, color=color)

    # received
    ax.text(7.95, 3.2, "received = yield total",
            ha="center", fontsize=8, color="#55A868", style="italic")
    ax.text(7.95, 2.6, "send value → received",
            ha="center", fontsize=7, color="#666")

    # ---- 3) 惰性管道 ----
    ax = axes[1][0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Lazy Pipeline", fontsize=12, fontweight="bold")
    ax.axis("off")

    pipeline = [
        (1.5, 7.5, 2.5, 3.5, "integers()\ninfinite\nstream", "#4C72B0"),
        (5, 7.5, 2.5, 3.5, "map_gen\n(lambda x:\n x**2)", "#55A868"),
        (8.5, 7.5, 2.5, 3.5, "filter_gen\n(even)", "#DD8452"),
        (8.5, 2.5, 2.5, 3.5, "take(10)\nlimit", "#E8A838"),
        (5, 2.5, 2.5, 3.5, "list()\nmaterialize", "#C44E52"),
    ]

    for x, y, w, h, text, color in pipeline:
        box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=9, fontweight="bold", color=color)

    # arrows
    arrow_pairs = [
        (2.8, 7.5, 3.7, 7.5),
        (6.3, 7.5, 7.2, 7.5),
        (8.5, 5.5, 8.5, 4.5),
        (7.2, 2.5, 6.3, 2.5),
    ]
    for x1, y1, x2, y2 in arrow_pairs:
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    ax.text(5, 0.5, "Each step pulls 1 element at a time → zero intermediate storage",
            ha="center", fontsize=8, color="#666", style="italic")

    # ---- 4) yield from 委托 ----
    ax = axes[1][1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("yield from Delegation", fontsize=12, fontweight="bold")
    ax.axis("off")

    # outer generator
    box = FancyBboxPatch((3.5, 7.0), 3.0, 1.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#8172B2", alpha=0.15,
                         edgecolor="#8172B2", lw=2)
    ax.add_patch(box)
    ax.text(5, 7.75, "flatten([1, [2, 3], 4])", ha="center",
            fontsize=9, fontweight="bold", color="#8172B2")

    # sub generators
    sub_calls = [
        (2.0, 4.5, "yield 1", "#55A868"),
        (5.0, 4.5, "yield from\nflatten([2, 3])", "#DD8452"),
        (8.0, 4.5, "yield 4", "#55A868"),
    ]
    for x, y, text, color in sub_calls:
        box = FancyBboxPatch((x-1.2, y-0.6), 2.4, 1.2,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=1.5)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=8, fontweight="bold", color=color)

    # recursive
    box = FancyBboxPatch((5-1.0, 2.0), 2.0, 1.0,
                         boxstyle="round,pad=0.08",
                         facecolor="#DD8452", alpha=0.08,
                         edgecolor="#DD8452", lw=1)
    ax.add_patch(box)
    ax.text(5, 2.5, "yield 2\nyield 3", ha="center", va="center",
            fontsize=7, color="#DD8452")

    ax.annotate("", xy=(5, 5.1), xytext=(5, 6.8),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))
    ax.annotate("", xy=(2, 5.1), xytext=(4, 7.0),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))
    ax.annotate("", xy=(8, 5.1), xytext=(6, 7.0),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))
    ax.annotate("", xy=(5, 3.2), xytext=(5, 3.9),
                arrowprops=dict(arrowstyle="->", color="#DD8452", lw=1))

    fig.tight_layout()
    path = os.path.join("images", "generator_iterator.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
