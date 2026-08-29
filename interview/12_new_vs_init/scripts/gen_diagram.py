"""
new_vs_init 示意图生成脚本
输出: images/new_vs_init.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图示内容为静态机制示意（对象创建流程 / 实例缓存模式 / __new__ 使用场景），
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
    fig.suptitle("__new__ vs __init__ -- Object Lifecycle",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) 创建流程 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("obj = MyClass()", fontsize=12, fontweight="bold")
    ax.axis("off")

    steps = [
        (5, 9.0, "type.__call__(MyClass, ...)", "#8172B2"),
        (5, 7.5, "MyClass.__new__(cls, ...)", "#DD8452"),
        (5, 6.0, "  Allocate memory", "#DD8452"),
        (5, 4.5, "  Return instance", "#55A868"),
        (5, 3.0, "MyClass.__init__(instance, ...)", "#4C72B0"),
        (5, 1.5, "  Set attributes", "#4C72B0"),
    ]
    w, h = 7.0, 1.0
    for i, (x, y, text, color) in enumerate(steps):
        box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=9, fontweight="bold", color=color)
        if i < len(steps) - 1:
            ny = steps[i+1][1]
            ax.annotate("", xy=(5, ny + h/2 + 0.05),
                        xytext=(5, y - h/2 - 0.05),
                        arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    # ---- 2) 缓存模式 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Instance Caching via __new__", fontsize=12, fontweight="bold")
    ax.axis("off")

    nodes = [
        (2, 8.0, "Client", "#4C72B0"),
        (5, 8.0, "__new__(cls, key)", "#DD8452"),
        (8, 8.0, "Cache", "#55A868"),
    ]
    for x, y, label, color in nodes:
        box = FancyBboxPatch((x-1.3, y-0.4), 2.6, 0.8,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y, label, ha="center", va="center",
                fontsize=10, fontweight="bold", color=color)

    ax.annotate("", xy=(3.7, 8.0), xytext=(3.3, 8.0),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))
    ax.annotate("", xy=(6.7, 8.0), xytext=(6.3, 8.0),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    # Decision
    diamond = plt.Polygon([(5, 6.2), (6.5, 5.2), (5, 4.2), (3.5, 5.2)],
                          closed=True, facecolor="#E8A838", alpha=0.2,
                          edgecolor="#E8A838", lw=2)
    ax.add_patch(diamond)
    ax.text(5, 5.2, "key in\ncache?", ha="center", va="center",
            fontsize=9, fontweight="bold", color="#E8A838")

    ax.annotate("", xy=(5, 6.8), xytext=(5, 7.6),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    box_yes = FancyBboxPatch((2, 3.0), 3.0, 0.8,
                              boxstyle="round,pad=0.08",
                              facecolor="#55A868", alpha=0.15,
                              edgecolor="#55A868", lw=1.5)
    ax.add_patch(box_yes)
    ax.text(3.5, 3.4, "return cached\n(__init__ still runs)", ha="center",
            fontsize=8, fontweight="bold", color="#55A868")
    ax.annotate("Yes", xy=(3.5, 3.8), xytext=(3.8, 4.2),
                arrowprops=dict(arrowstyle="->", color="#55A868", lw=1.5))

    box_no = FancyBboxPatch((6, 3.0), 3.0, 0.8,
                             boxstyle="round,pad=0.08",
                             facecolor="#C44E52", alpha=0.15,
                             edgecolor="#C44E52", lw=1.5)
    ax.add_patch(box_no)
    ax.text(7.5, 3.4, "create new\n+ cache + __init__", ha="center",
            fontsize=8, fontweight="bold", color="#C44E52")
    ax.annotate("No", xy=(7.5, 3.8), xytext=(6.2, 4.2),
                arrowprops=dict(arrowstyle="->", color="#C44E52", lw=1.5))

    # ---- 3) 何时用 __new__ ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("When to Use __new__", fontsize=12, fontweight="bold")
    ax.axis("off")

    cases = [
        ("Immutable subclass", "#C44E52",
         "str, int, tuple must override __new__",
         "init cannot modify immutable values"),
        ("Singleton / Cache", "#55A868",
         "Return existing instance from cache",
         "init still runs (careful: re-init!)"),
        ("Factory pattern", "#4C72B0",
         "Return different type based on args",
         "Type() constructor pattern"),
        ("Connection pool", "#DD8452",
         "Reuse existing connections",
         "Return pooled resource"),
    ]
    for i, (title, color, line1, line2) in enumerate(cases):
        y = 8.5 - i * 2.0
        x = 5
        box = FancyBboxPatch((x-4, y-0.7), 8, 1.4,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.1,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x-3.5, y+0.15, title, ha="left", va="center",
                fontsize=10, fontweight="bold", color=color)
        ax.text(x-3.5, y-0.25, f"{line1}\n{line2}", ha="left", va="center",
                fontsize=8, color="#666")

    ax.text(5, 1.0, "Rule: 95% of the time, __init__ is enough",
            ha="center", fontsize=10, fontweight="bold", color="#999")

    fig.tight_layout()
    path = os.path.join("images", "new_vs_init.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
