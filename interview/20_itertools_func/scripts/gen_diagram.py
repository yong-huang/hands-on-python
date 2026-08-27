"""
itertools_func 示意图生成脚本
输出: images/itertools_func.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图为静态机制示意图（itertools/functools 常用 API、operator vs lambda），
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
    fig.suptitle("itertools / functools / operator",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) itertools 常用 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("itertools Essentials", fontsize=12, fontweight="bold")
    ax.axis("off")

    funcs = [
        ("chain(a, b)", "#4C72B0", "Concatenate iterables"),
        ("islice(it, n, m)", "#55A868", "Slice without copying"),
        ("accumulate(it)", "#DD8452", "Running totals"),
        ("groupby(it, key)", "#8172B2", "Group consecutive"),
        ("combinations()", "#C44E52", "All k-combinations"),
    ]
    for i, (name, color, desc) in enumerate(funcs):
        y = 8.8 - i * 1.5
        box = FancyBboxPatch((0.5, y-0.4), 3.8, 0.8,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(2.4, y, name, ha="center", fontsize=9,
                fontweight="bold", color=color, family="monospace")
        ax.text(6, y, desc, ha="left", fontsize=8, color="#666")

    # ---- 2) functools 常用 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("functools Essentials", fontsize=12, fontweight="bold")
    ax.axis("off")

    funcs = [
        ("lru_cache", "#4C72B0", "Memoize with eviction"),
        ("partial", "#55A868", "Pre-fill function args"),
        ("wraps", "#DD8452", "Preserve metadata"),
        ("reduce", "#8172B2", "Fold: f(f(f(a,b),c),d)"),
        ("singledispatch", "#C44E52", "Type-overloaded function"),
    ]
    for i, (name, color, desc) in enumerate(funcs):
        y = 8.8 - i * 1.5
        box = FancyBboxPatch((0.5, y-0.4), 3.8, 0.8,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(2.4, y, name, ha="center", fontsize=9,
                fontweight="bold", color=color, family="monospace")
        ax.text(6, y, desc, ha="left", fontsize=8, color="#666")

    # ---- 3) operator vs lambda ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("operator vs lambda", fontsize=12, fontweight="bold")
    ax.axis("off")

    pairs = [
        ("itemgetter('name')", "lambda x: x['name']", "#4C72B0"),
        ("attrgetter('x')", "lambda o: o.x", "#55A868"),
        ("methodcaller('upper')", "lambda s: s.upper()", "#DD8452"),
        ("add", "lambda a, b: a + b", "#8172B2"),
        ("lt", "lambda a, b: a < b", "#C44E52"),
    ]
    for i, (op, lam, color) in enumerate(pairs):
        y = 8.8 - i * 1.5
        box = FancyBboxPatch((0.3, y-0.4), 4.5, 0.8,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(2.55, y, op, ha="center", fontsize=9,
                fontweight="bold", color=color, family="monospace")
        ax.text(7.2, y, lam, ha="center", fontsize=8,
                color="#999", family="monospace")
        ax.text(9.2, y, "VS", ha="center", fontsize=8,
                color="#999")

    fig.tight_layout()
    path = os.path.join("images", "itertools_func.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
