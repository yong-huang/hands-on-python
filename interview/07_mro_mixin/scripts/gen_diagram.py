"""
mro_mixin 示意图生成脚本
输出: images/mro_mixin.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

三张图均为静态示意图，无需主模块数据。
"""

import os

# 固定头部: 从脚本位置定位实验根目录, 保证任何 cwd 运行都输出正确
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LAB_ROOT = os.path.dirname(SCRIPT_DIR)
os.chdir(LAB_ROOT)

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
    fig.suptitle("MRO & Mixin -- Internals",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) 钻石继承图 + MRO ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Diamond Inheritance & MRO", fontsize=12, fontweight="bold")
    ax.axis("off")

    # 钻石图
    nodes = [
        (5, 8.5, "object", "#999"),
        (5, 7.0, "A", "#C44E52"),
        (2.5, 5.0, "B", "#4C72B0"),
        (7.5, 5.0, "C", "#DD8452"),
        (5, 3.0, "D", "#55A868"),
    ]
    r = 0.6
    for x, y, label, color in nodes:
        circle = plt.Circle((x, y), r, facecolor=color, alpha=0.2,
                             edgecolor=color, lw=2)
        ax.add_patch(circle)
        ax.text(x, y, label, ha="center", va="center",
                fontsize=12, fontweight="bold", color=color)

    # 边
    edges = [
        (5, 8.5-0.6, 5, 7.0+0.6),      # object -> A
        (5, 7.0-0.6, 2.5, 5.0+0.6),    # A -> B
        (5, 7.0-0.6, 7.5, 5.0+0.6),    # A -> C
        (2.5, 5.0-0.6, 5, 3.0+0.6),    # B -> D
        (7.5, 5.0-0.6, 5, 3.0+0.6),    # C -> D
    ]
    for x1, y1, x2, y2 in edges:
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#333", lw=1.5))

    # MRO 序列
    mro = "D -> B -> C -> A -> object"
    ax.text(5, 1.5, f"MRO: {mro}", ha="center", fontsize=10,
            fontweight="bold", color="#55A868")
    ax.text(5, 0.8, "C3: A appears exactly once, after B and C",
            ha="center", fontsize=8, color="#666")

    # ---- 2) super() 调用链 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("super() Call Chain", fontsize=12, fontweight="bold")
    ax.axis("off")

    mro_chain = [
        (5, 9.0, "MyService.__init__()", "#55A868"),
        (5, 7.5, "MixinLog.__init__()", "#4C72B0"),
        (5, 6.0, "MixinValidate.__init__()", "#DD8452"),
        (5, 4.5, "Base.__init__()", "#C44E52"),
        (5, 3.0, "object.__init__()", "#999"),
    ]
    w, h = 6.5, 1.0
    for i, (x, y, text, color) in enumerate(mro_chain):
        box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=10, fontweight="bold", color=color)
        if i < len(mro_chain) - 1:
            ny = mro_chain[i+1][1]
            ax.text(x + w/2 + 0.1, (y + ny)/2, "super()", fontsize=7,
                    color="#666")
            ax.annotate("", xy=(5, ny + h/2 + 0.05),
                        xytext=(5, y - h/2 - 0.05),
                        arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    ax.text(5, 1.8, "super() = MRO next, NOT parent",
            ha="center", fontsize=10, fontweight="bold", color="#4C72B0")
    ax.text(5, 1.2, "Each class calls super().__init__()\nforwards through entire MRO chain",
            ha="center", fontsize=8, color="#666")

    # ---- 3) Mixin 组合模式 ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Mixin Composition Pattern", fontsize=12, fontweight="bold")
    ax.axis("off")

    # 业务类
    box = FancyBboxPatch((3.5, 8.0), 3.0, 1.2,
                         boxstyle="round,pad=0.1",
                         facecolor="#55A868", alpha=0.15,
                         edgecolor="#55A868", lw=2)
    ax.add_patch(box)
    ax.text(5, 8.6, "User (business)", ha="center",
            fontsize=10, fontweight="bold", color="#55A868")

    # Mixins
    mixins = [
        (2.0, 5.5, "JSONMixin\nto_json()", "#4C72B0"),
        (5.0, 5.5, "ReprMixin\n__repr__()", "#DD8452"),
        (8.0, 5.5, "ValidateMixin\nvalidate()", "#E8A838"),
    ]
    for x, y, text, color in mixins:
        box = FancyBboxPatch((x-1.3, y-0.7), 2.6, 1.4,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=9, fontweight="bold", color=color)

    # 箭头
    for mx, my in [(2.0, 5.5), (5.0, 5.5), (8.0, 5.5)]:
        ax.annotate("", xy=(mx, 6.2), xytext=(5, 8.0),
                    arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    # 说明
    rules = [
        ("Mixin design rules:", "#4C72B0", True),
        ("1. No state (only methods)", "#666", False),
        ("2. No __init__ (or call super())", "#666", False),
        ("3. Left side in MRO = higher priority", "#666", False),
        ("4. Named with Mixin suffix", "#666", False),
        ("5. Never used standalone", "#666", False),
    ]
    for i, (text, color, bold) in enumerate(rules):
        ax.text(5, 3.8 - i * 0.55, text, ha="center",
                fontsize=9 if bold else 8, fontweight="bold" if bold else "normal",
                color=color)

    fig.tight_layout()
    path = os.path.join("images", "mro_mixin.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
