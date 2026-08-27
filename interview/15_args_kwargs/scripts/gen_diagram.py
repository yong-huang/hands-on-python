"""
args_kwargs 示意图生成脚本
输出: images/args_kwargs.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图示内容为静态机制示意（参数顺序规则 / * 的四种用法 / 解包图示），
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
    fig.suptitle("*args / **kwargs -- Parameter Passing",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) 参数顺序规则 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Parameter Order Rules", fontsize=12, fontweight="bold")
    ax.axis("off")

    header = "def f(a, b, /, c, d, *args, key=val, **kwargs):"
    ax.text(5, 9.0, header, ha="center", fontsize=8,
            fontweight="bold", color="#4C72B0", family="monospace")

    params = [
        ("a, b", "#C44E52", "pos-only (before /)"),
        ("c, d", "#55A868", "positional or keyword"),
        ("*args", "#DD8452", "extra positional -> tuple"),
        ("key=val", "#8172B2", "keyword with default"),
        ("**kwargs", "#E8A838", "extra keyword -> dict"),
    ]

    for i, item in enumerate(params, 2):
        label, color, desc = item
        y = 7.5 - (i-2) * 1.3
        box = FancyBboxPatch((1, y-0.4), 2.5, 0.8,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(2.25, y, label, ha="center", fontsize=10,
                fontweight="bold", color=color, family="monospace")
        ax.text(5, y, desc, ha="left", fontsize=9, color="#666")

    # ---- 2) * 的四种用法 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Four Uses of *", fontsize=12, fontweight="bold")
    ax.axis("off")

    uses = [
        (5, 8.5, "Definition: *args", "#C44E52",
         "def f(*args):  # collect extra pos -> tuple"),
        (5, 6.5, "Definition: **kwargs", "#55A868",
         "def f(**kw):  # collect extra kw -> dict"),
        (5, 4.5, "Call: *list", "#DD8452",
         "f(*[1,2,3])  # unpack list as positional"),
        (5, 2.5, "Call: **dict", "#8172B2",
         "f(**{'x':1})  # unpack dict as keyword"),
    ]
    for x, y, title, color, code in uses:
        box = FancyBboxPatch((0.5, y-0.6), 9.0, 1.2,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.1,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(5, y+0.1, title, ha="center", fontsize=10,
                fontweight="bold", color=color)
        ax.text(5, y-0.25, code, ha="center", fontsize=8,
                color="#333", family="monospace")

    # ---- 3) 解包图示 ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Unpacking Visual", fontsize=12, fontweight="bold")
    ax.axis("off")

    # list -> *args
    ax.text(5, 9.0, "*[1, 2, 3]  -->  f(1, 2, 3)", ha="center",
            fontsize=10, fontweight="bold", color="#C44E52")

    items = [(2, 7.0, "1"), (4, 7.0, "2"), (6, 7.0, "3")]
    for x, y, val in items:
        circle = plt.Circle((x, y), 0.4, facecolor="#C44E52", alpha=0.2,
                             edgecolor="#C44E52", lw=2)
        ax.add_patch(circle)
        ax.text(x, y, val, ha="center", va="center", fontsize=10, color="#C44E52")
    ax.annotate("", xy=(2, 7.5), xytext=(4, 8.5),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.2))
    ax.annotate("", xy=(4, 7.5), xytext=(5, 8.5),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.2))
    ax.annotate("", xy=(6, 7.5), xytext=(6, 8.5),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.2))

    ax.text(5, 6.0, "f(*args) -> args = (1, 2, 3)", ha="center",
            fontsize=9, color="#666")

    # dict -> **kwargs
    ax.text(5, 4.5, "**{'x': 1, 'y': 2}  -->  f(x=1, y=2)", ha="center",
            fontsize=10, fontweight="bold", color="#55A868")

    items = [(2, 2.8, "x=1"), (6, 2.8, "y=2")]
    for x, y, val in items:
        box = FancyBboxPatch((x-0.8, y-0.3), 1.6, 0.6,
                             boxstyle="round,pad=0.06",
                             facecolor="#55A868", alpha=0.2,
                             edgecolor="#55A868", lw=2)
        ax.add_patch(box)
        ax.text(x, y, val, ha="center", va="center", fontsize=9, color="#55A868")
    ax.annotate("", xy=(2, 3.2), xytext=(4, 4.0),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.2))
    ax.annotate("", xy=(6, 3.2), xytext=(6, 4.0),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.2))

    ax.text(5, 1.8, "f(**kwargs) -> kwargs = {'x': 1, 'y': 2}", ha="center",
            fontsize=9, color="#666")

    fig.tight_layout()
    path = os.path.join("images", "args_kwargs.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
