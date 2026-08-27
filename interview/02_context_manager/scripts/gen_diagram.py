"""
context_manager 示意图生成脚本
输出: images/context_manager.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图示内容为机制示意图（with 执行流程 / 类式 vs 函数式 / 异常传播决策树），
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
    fig, axes = plt.subplots(1, 3, figsize=(20, 7))
    fig.suptitle("Context Manager -- Internals",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) with 语句执行流程 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("with Statement Flow", fontsize=12, fontweight="bold")
    ax.axis("off")

    steps = [
        (5, 9.0, "with Timer() as t:", "#4C72B0"),
        (5, 7.6, "t = obj.__enter__()", "#DD8452"),
        (5, 6.2, "try: block body", "#55A868"),
        (5, 4.8, "finally:", "#8172B2"),
        (5, 3.4, "obj.__exit__(exc...)", "#C44E52"),
        (5, 2.0, "return True/False", "#E8A838"),
    ]
    w, h = 6.5, 1.0
    for i, (x, y, text, color) in enumerate(steps):
        box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=10, fontweight="bold", color=color)
        if i < len(steps) - 1:
            ax.annotate("", xy=(5, steps[i+1][1] + h/2 + 0.05),
                        xytext=(5, y - h/2 - 0.05),
                        arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    # 侧注
    ax.text(9.2, 7.6, "returns\nresource", ha="left", va="center",
            fontsize=7, color="#666", style="italic")
    ax.text(9.2, 3.4, "True=swallow\nFalse=propagate", ha="left", va="center",
            fontsize=7, color="#666", style="italic")

    # ---- 2) 类式 vs 函数式对比 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Class vs Generator Approach", fontsize=12, fontweight="bold")
    ax.axis("off")

    # Left: class
    ax.text(2.5, 9.3, "Class-based", ha="center", fontsize=12,
            fontweight="bold", color="#4C72B0")
    class_steps = [
        (2.5, 8.0, "__enter__(self)", "#4C72B0"),
        (2.5, 6.6, "  return resource", "#4C72B0"),
        (2.5, 5.2, "__exit__(self, ...)", "#C44E52"),
        (2.5, 3.8, "  cleanup / return bool", "#C44E52"),
    ]
    for x, y, text, color in class_steps:
        box = FancyBboxPatch((x-2.0, y-0.4), 4.0, 0.8,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=1.5)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=9, color=color, fontweight="bold")

    # Right: generator
    ax.text(7.5, 9.3, "@contextmanager", ha="center", fontsize=12,
            fontweight="bold", color="#55A868")
    gen_steps = [
        (7.5, 8.0, "yield resource", "#55A868"),
        (7.5, 6.6, "  (code before = enter)", "#55A868"),
        (7.5, 5.2, "finally: cleanup", "#C44E52"),
        (7.5, 3.8, "  (code after = exit)", "#C44E52"),
    ]
    for x, y, text, color in gen_steps:
        box = FancyBboxPatch((x-2.0, y-0.4), 4.0, 0.8,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=1.5)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=9, color=color, fontweight="bold")

    # VS
    ax.text(5, 6.6, "VS", ha="center", va="center",
            fontsize=14, color="#999", fontweight="bold")

    # Pros
    ax.text(5, 2.8, "Class: explicit state | Generator: concise",
            ha="center", fontsize=8, color="#666", style="italic")

    # ---- 3) 异常传播决策树 ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("__exit__ Exception Flow", fontsize=12, fontweight="bold")
    ax.axis("off")

    # Diamond: exception occurred?
    cx, cy = 5, 8.0
    diamond_size = 0.6
    diamond = plt.Polygon(
        [(cx, cy + diamond_size * 1.2), (cx + 1.5, cy),
         (cx, cy - diamond_size * 1.2), (cx - 1.5, cy)],
        closed=True, facecolor="#E8A838", alpha=0.2,
        edgecolor="#E8A838", lw=2)
    ax.add_patch(diamond)
    ax.text(cx, cy, "Exception\noccurred?", ha="center", va="center",
            fontsize=9, fontweight="bold", color="#E8A838")

    # No branch (left)
    ax.annotate("No", xy=(1.8, cy), xytext=(cx - 1.5, cy),
                arrowprops=dict(arrowstyle="->", color="#55A868", lw=1.5))
    ax.text(1.8, 6.5, "Normal cleanup", ha="center", fontsize=9,
            color="#55A868", fontweight="bold")
    box = FancyBboxPatch((0.5, 5.8), 2.6, 0.6,
                         boxstyle="round,pad=0.08",
                         facecolor="#55A868", alpha=0.12,
                         edgecolor="#55A868", lw=1.5)
    ax.add_patch(box)
    ax.text(1.8, 6.1, "Normal cleanup", ha="center", va="center",
            fontsize=8, color="#55A868")

    # Yes branch (down)
    ax.annotate("Yes", xy=(cx, 6.5), xytext=(cx, cy - diamond_size * 1.2),
                arrowprops=dict(arrowstyle="->", color="#C44E52", lw=1.5))
    ax.text(cx + 0.6, 6.8, "Yes", fontsize=9, color="#C44E52")

    # __exit__ returns?
    cx2, cy2 = 5, 5.8
    diamond2 = plt.Polygon(
        [(cx2, cy2 + 0.5), (cx2 + 1.3, cy2),
         (cx2, cy2 - 0.5), (cx2 - 1.3, cy2)],
        closed=True, facecolor="#4C72B0", alpha=0.2,
        edgecolor="#4C72B0", lw=2)
    ax.add_patch(diamond2)
    ax.text(cx2, cy2, "__exit__\nreturns?", ha="center", va="center",
            fontsize=8, fontweight="bold", color="#4C72B0")

    # True branch (left)
    ax.annotate("True", xy=(1.8, 4.2), xytext=(cx2 - 1.3, cy2),
                arrowprops=dict(arrowstyle="->", color="#55A868", lw=1.5))
    box_t = FancyBboxPatch((0.5, 3.6), 2.6, 0.7,
                           boxstyle="round,pad=0.08",
                           facecolor="#55A868", alpha=0.15,
                           edgecolor="#55A868", lw=1.5)
    ax.add_patch(box_t)
    ax.text(1.8, 3.95, "SUPPRESSED\n(code continues)", ha="center",
            va="center", fontsize=8, color="#55A868", fontweight="bold")

    # False branch (right)
    ax.annotate("False/None", xy=(8.2, 4.2), xytext=(cx2 + 1.3, cy2),
                arrowprops=dict(arrowstyle="->", color="#C44E52", lw=1.5))
    box_f = FancyBboxPatch((6.9, 3.6), 2.6, 0.7,
                           boxstyle="round,pad=0.08",
                           facecolor="#C44E52", alpha=0.15,
                           edgecolor="#C44E52", lw=1.5)
    ax.add_patch(box_f)
    ax.text(8.2, 3.95, "PROPAGATED\n(traceback raised)", ha="center",
            va="center", fontsize=8, color="#C44E52", fontweight="bold")

    fig.tight_layout()
    path = os.path.join("images", "context_manager.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
