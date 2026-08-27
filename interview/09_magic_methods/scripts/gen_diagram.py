"""
magic_methods 示意图生成脚本
输出: images/magic_methods.png (dpi=150)
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
    fig.suptitle("Magic Methods -- Operator Overloading",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) 常用魔术方法分类 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Magic Methods Categories", fontsize=12, fontweight="bold")
    ax.axis("off")

    categories = [
        (2.5, 8.2, "String", "#4C72B0",
         ["__str__   → str(obj)", "__repr__  → repr(obj)", "__format__ → f'{obj}'"]),
        (7.5, 8.2, "Compare", "#55A868",
         ["__eq__  → ==", "__lt__  → <", "__le__  → <=",
          "__hash__ → dict key"]),
        (2.5, 4.5, "Arithmetic", "#DD8452",
         ["__add__  → +", "__sub__  → -", "__mul__  → *",
          "__abs__  → abs()"]),
        (7.5, 4.5, "Container", "#8172B2",
         ["__len__    → len()", "__getitem__ → obj[i]", "__iter__  → for x in",
          "__bool__  → if obj:"]),
    ]

    for x, y, title, color, methods in categories:
        box = FancyBboxPatch((x - 2.0, y - 1.5), 4.0, 3.0,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.1,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y + 0.8, title, ha="center", fontsize=11,
                fontweight="bold", color=color)
        for i, method in enumerate(methods):
            ax.text(x, y + 0.1 - i * 0.45, method, ha="center",
                    fontsize=8, color="#333", family="monospace")

    ax.text(5, 1.5, "Python calls magic methods automatically\nwhen you use operators/builtins",
            ha="center", fontsize=8, color="#666", style="italic")

    # ---- 2) == vs is vs __hash__ ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Equality & Hashing", fontsize=12, fontweight="bold")
    ax.axis("off")

    steps = [
        (5, 9.0, "p1 = Point(3, 4)", "#4C72B0"),
        (5, 7.8, "p2 = Point(3, 4)", "#4C72B0"),
        (5, 6.2, "p1 == p2 ?", "#DD8452"),
        (5, 5.2, "→ __eq__: (3,4) == (3,4) → True", "#55A868"),
        (5, 3.8, "hash(p1) == hash(p2) ?", "#DD8452"),
        (5, 2.8, "→ __hash__: hash((3,4)) → True", "#55A868"),
        (5, 1.5, "→ p1 and p2 can be dict keys", "#8172B2"),
    ]
    w, h = 7.0, 0.7
    for i, (x, y, text, color) in enumerate(steps):
        if i in [2, 4]:
            diamond = plt.Polygon(
                [(x, y+0.35), (x+0.8, y), (x, y-0.35), (x-0.8, y)],
                closed=True, facecolor=color, alpha=0.15,
                edgecolor=color, lw=1.5)
            ax.add_patch(diamond)
            ax.text(x, y, text, ha="center", va="center",
                    fontsize=9, fontweight="bold", color=color)
        else:
            box = FancyBboxPatch((x - w/2, y - 0.25), w, 0.5,
                                 boxstyle="round,pad=0.06",
                                 facecolor=color, alpha=0.08,
                                 edgecolor=color, lw=1)
            ax.add_patch(box)
            ax.text(x, y, text, ha="center", va="center",
                    fontsize=9, color=color)

    # ---- 3) @total_ordering & dataclass ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("total_ordering & dataclass", fontsize=12, fontweight="bold")
    ax.axis("off")

    # total_ordering
    box = FancyBboxPatch((0.5, 6.5), 4.0, 3.0,
                         boxstyle="round,pad=0.1",
                         facecolor="#4C72B0", alpha=0.08,
                         edgecolor="#4C72B0", lw=2)
    ax.add_patch(box)
    ax.text(2.5, 9.0, "@total_ordering", ha="center",
            fontsize=10, fontweight="bold", color="#4C72B0")
    items = [
        ("Define:", "#666"),
        ("  __eq__, __lt__", "#333"),
        ("Auto-generates:", "#666"),
        ("  __le__, __gt__, __ge__", "#333"),
    ]
    for i, (text, color) in enumerate(items):
        ax.text(1.0, 8.3 - i * 0.5, text, fontsize=8, color=color)

    # dataclass
    box = FancyBboxPatch((5.5, 6.5), 4.0, 3.0,
                         boxstyle="round,pad=0.1",
                         facecolor="#55A868", alpha=0.08,
                         edgecolor="#55A868", lw=2)
    ax.add_patch(box)
    ax.text(7.5, 9.0, "@dataclass", ha="center",
            fontsize=10, fontweight="bold", color="#55A868")
    items = [
        ("Auto-generates:", "#666"),
        ("  __init__, __repr__, __eq__", "#333"),
        ("  __hash__ (if frozen)", "#333"),
        ("  __lt__ (if order=True)", "#333"),
    ]
    for i, (text, color) in enumerate(items):
        ax.text(6.0, 8.3 - i * 0.5, text, fontsize=8, color=color)

    # 底部规则
    box = FancyBboxPatch((0.5, 1.0), 9.0, 4.5,
                         boxstyle="round,pad=0.12",
                         facecolor="#f5f5f5", edgecolor="#999", lw=1.5)
    ax.add_patch(box)
    ax.text(5, 5.0, "__eq__ and __hash__ contract:", ha="center",
            fontsize=10, fontweight="bold", color="#C44E52")
    rules = [
        "If __eq__ is defined, __hash__ should be too (or set to None)",
        "Equal objects MUST have same hash (a == b → hash(a) == hash(b))",
        "But same hash does NOT mean equal (hash collision exists)",
        "If you define __eq__ but not __hash__, Python sets __hash__ = None",
        "None hash → object is unhashable → cannot be dict key / set member",
    ]
    for i, rule in enumerate(rules):
        ax.text(1.0, 4.3 - i * 0.55, f"{i+1}. {rule}", fontsize=7.5, color="#333")

    fig.tight_layout()
    path = os.path.join("images", "magic_methods.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
