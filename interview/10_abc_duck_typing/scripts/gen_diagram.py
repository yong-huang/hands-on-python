"""
abc_duck_typing 示意图生成脚本
输出: images/abc_duck_typing.png (dpi=150)
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
    fig.suptitle("ABC & Duck Typing -- Internals",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) Duck Typing vs ABC ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Duck Typing vs ABC", fontsize=12, fontweight="bold")
    ax.axis("off")

    # Duck typing
    box = FancyBboxPatch((0.3, 6.5), 4.2, 2.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#55A868", alpha=0.1,
                         edgecolor="#55A868", lw=2)
    ax.add_patch(box)
    ax.text(2.4, 8.5, "Duck Typing", ha="center",
            fontsize=11, fontweight="bold", color="#55A868")
    duck_items = [
        ("quack(duck)", "#333"),
        ("  → duck.speak()", "#666"),
        ("  No type check!", "#55A868"),
    ]
    for i, (text, color) in enumerate(duck_items):
        ax.text(0.6, 7.9 - i * 0.5, text, fontsize=8, color=color)

    # ABC
    box = FancyBboxPatch((5.5, 6.5), 4.2, 2.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#4C72B0", alpha=0.1,
                         edgecolor="#4C72B0", lw=2)
    ax.add_patch(box)
    ax.text(7.6, 8.5, "ABC", ha="center",
            fontsize=11, fontweight="bold", color="#4C72B0")
    abc_items = [
        ("isinstance(obj, Base)", "#333"),
        ("  → checks at runtime", "#666"),
        ("  Enforces interface", "#4C72B0"),
    ]
    for i, (text, color) in enumerate(abc_items):
        ax.text(5.8, 7.9 - i * 0.5, text, fontsize=8, color=color)

    # VS
    ax.text(5, 7.75, "VS", ha="center", fontsize=14,
            fontweight="bold", color="#999")

    # 底部: duck typing 过程
    ax.text(5, 5.5, "Duck Typing decision flow:", ha="center",
            fontsize=10, fontweight="bold", color="#55A868")
    steps = [
        (5, 4.5, "Does it have .speak()?", "#DD8452"),
        (3.0, 3.2, "Yes -> Call it!", "#55A868"),
        (7.0, 3.2, "No -> AttributeError", "#C44E52"),
    ]
    for x, y, text, color in steps:
        box = FancyBboxPatch((x-1.5, y-0.35), 3.0, 0.7,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=1.5)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=9, color=color, fontweight="bold")

    ax.annotate("", xy=(3.0, 3.6), xytext=(4.0, 4.15),
                arrowprops=dict(arrowstyle="->", color="#55A868", lw=1.2))
    ax.annotate("", xy=(7.0, 3.6), xytext=(6.0, 4.15),
                arrowprops=dict(arrowstyle="->", color="#C44E52", lw=1.2))

    # ---- 2) ABC 继承层次 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("ABC Inheritance & register()", fontsize=12, fontweight="bold")
    ax.axis("off")

    # ABC
    nodes = [
        (5, 8.5, "Transport\n(ABC)", "#4C72B0", True),
        (2.5, 6.0, "Truck", "#55A868", False),
        (5, 6.0, "Drone", "#55A868", False),
        (7.5, 6.0, "ExternalLogistics\n(registered)", "#DD8452", False),
    ]
    r = 0.7
    for x, y, label, color, is_abstract in nodes:
        style = "dashed" if not is_abstract else "solid"
        circle = plt.Circle((x, y), r, facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2, linestyle=style)
        ax.add_patch(circle)
        ax.text(x, y, label, ha="center", va="center",
                fontsize=8, fontweight="bold", color=color)

    # Edges
    for cx, cy in [(2.5, 6.0), (5, 6.0)]:
        ax.annotate("", xy=(cx, 6.0 + r), xytext=(5, 8.5 - r),
                    arrowprops=dict(arrowstyle="->", color="#55A868", lw=1.5))
    # registered (dashed)
    ax.annotate("", xy=(7.5, 6.0 + r), xytext=(5, 8.5 - r),
                arrowprops=dict(arrowstyle="->", color="#DD8452", lw=1.5,
                                linestyle="dashed"))

    ax.text(5, 4.2, "Real subclass (inherit)", ha="center", fontsize=8,
            color="#55A868")
    ax.text(5, 3.6, "Virtual subclass (register)", ha="center", fontsize=8,
            color="#DD8452", style="italic")

    # 关键点
    box = FancyBboxPatch((1.0, 1.0), 8.0, 2.0,
                         boxstyle="round,pad=0.12",
                         facecolor="#f5f5f5", edgecolor="#999", lw=1.5)
    ax.add_patch(box)
    points = [
        "Both pass isinstance(obj, Transport)",
        "register() adds to _abc_registry without inheritance",
        "Useful for third-party classes you can't modify",
    ]
    for i, p in enumerate(points):
        ax.text(5, 2.5 - i * 0.45, p, ha="center", fontsize=8, color="#333")

    # ---- 3) Protocol ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Protocol (PEP 544)", fontsize=12, fontweight="bold")
    ax.axis("off")

    # Protocol definition
    box = FancyBboxPatch((0.5, 7.0), 9.0, 2.2,
                         boxstyle="round,pad=0.1",
                         facecolor="#8172B2", alpha=0.1,
                         edgecolor="#8172B2", lw=2)
    ax.add_patch(box)
    ax.text(5, 8.7, "@runtime_checkable", ha="center",
            fontsize=10, fontweight="bold", color="#8172B2")
    code_lines = [
        "class Speakable(Protocol):",
        "    def speak(self) -> str: ...",
    ]
    for i, line in enumerate(code_lines):
        ax.text(5, 8.0 - i * 0.4, line, ha="center",
                fontsize=9, color="#333", family="monospace")

    # Checks
    checks = [
        (2.5, 5.0, "Duck()", True, "#55A868"),
        (5.0, 5.0, "Robot()", True, "#55A868"),
        (7.5, 5.0, "Person()", False, "#C44E52"),
    ]
    for x, y, name, has_method, color in checks:
        box = FancyBboxPatch((x-1.2, y-0.5), 2.4, 1.0,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=1.5)
        ax.add_patch(box)
        status = "speak()" if has_method else "talk()"
        ax.text(x, y + 0.1, name, ha="center", fontsize=9,
                fontweight="bold", color=color)
        ax.text(x, y - 0.2, status, ha="center", fontsize=8, color="#666")

    # 结果
    ax.text(2.5, 3.5, "Pass", ha="center", fontsize=9,
            fontweight="bold", color="#55A868")
    ax.text(7.5, 3.5, "Fail", ha="center", fontsize=9,
            fontweight="bold", color="#C44E52")

    # 说明
    box = FancyBboxPatch((0.5, 1.0), 9.0, 1.8,
                         boxstyle="round,pad=0.12",
                         facecolor="#f5f5f5", edgecolor="#999", lw=1.5)
    ax.add_patch(box)
    ax.text(5, 2.3, "Protocol = structural subtyping (best of both worlds)",
            ha="center", fontsize=9, fontweight="bold", color="#8172B2")
    ax.text(5, 1.7, "Duck typing flexibility + ABC isinstance checks",
            ha="center", fontsize=8, color="#666")

    fig.tight_layout()
    path = os.path.join("images", "abc_duck_typing.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
