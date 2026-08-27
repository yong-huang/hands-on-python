"""
metaclass 示意图生成脚本
输出: images/metaclass.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图示内容为机制示意图（class 创建流程 / 单例元类 / __init_subclass__ 对比），
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
    fig.suptitle("Metaclass -- Internals",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) class 创建流程 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("class Foo: Execution", fontsize=12, fontweight="bold")
    ax.axis("off")

    steps = [
        (5, 9.0, "class Foo(Base):\n  x = 1", "#4C72B0"),
        (5, 7.2, "Metaclass.__new__(mcs,\n  'Foo', (Base,), {'x': 1})", "#DD8452"),
        (5, 5.4, "type.__call__ -> Foo.__new__\n(instance creation)", "#55A868"),
        (5, 3.6, "Foo.__init__(self, ...)\n(initialization)", "#8172B2"),
        (5, 1.8, "return instance", "#C44E52"),
    ]
    w, h = 6.5, 1.2
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

    ax.text(5, 0.6, "Metaclass controls step 2 (class creation)",
            ha="center", fontsize=8, color="#666", style="italic")

    # ---- 2) 单例模式 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Singleton Metaclass", fontsize=12, fontweight="bold")
    ax.axis("off")

    box = FancyBboxPatch((0.5, 7.0), 4.0, 1.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#4C72B0", alpha=0.15,
                         edgecolor="#4C72B0", lw=2)
    ax.add_patch(box)
    ax.text(2.5, 7.75, "SingletonMeta\n.__call__(cls, ...)", ha="center",
            fontsize=10, fontweight="bold", color="#4C72B0")

    # 判断框
    diamond = plt.Polygon(
        [(5.5, 7.75), (7, 7.0), (8.5, 7.75), (7, 8.5)],
        closed=True, facecolor="#E8A838", alpha=0.2,
        edgecolor="#E8A838", lw=2)
    ax.add_patch(diamond)
    ax.text(7, 7.75, "cls in\n_instances?", ha="center", va="center",
            fontsize=9, fontweight="bold", color="#E8A838")

    # Yes
    ax.text(7.0, 5.8, "Yes", ha="center", fontsize=9, color="#55A868")
    box_yes = FancyBboxPatch((5.5, 4.6), 3.0, 0.8,
                              boxstyle="round,pad=0.08",
                              facecolor="#55A868", alpha=0.15,
                              edgecolor="#55A868", lw=1.5)
    ax.add_patch(box_yes)
    ax.text(7, 5.0, "return existing", ha="center",
            fontsize=9, fontweight="bold", color="#55A868")

    # No
    ax.text(9.2, 7.75, "No", ha="left", fontsize=9, color="#C44E52")
    box_no = FancyBboxPatch((8.0, 8.5), 1.6, 0.8,
                             boxstyle="round,pad=0.08",
                             facecolor="#C44E52", alpha=0.15,
                             edgecolor="#C44E52", lw=1.5)
    ax.add_patch(box_no)
    ax.text(8.8, 8.9, "create &\nstore", ha="center",
            fontsize=8, fontweight="bold", color="#C44E52")

    ax.annotate("", xy=(5.0, 7.75), xytext=(4.5, 7.75),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))
    ax.annotate("", xy=(7, 6.4), xytext=(7, 7.0),
                arrowprops=dict(arrowstyle="->", color="#55A868", lw=1.5))
    ax.annotate("", xy=(8.8, 8.5), xytext=(8.5, 7.8),
                arrowprops=dict(arrowstyle="->", color="#C44E52", lw=1.5))

    # 两次调用演示
    ax.text(5, 3.0, "Database('localhost')  -> instance A", ha="center",
            fontsize=9, color="#C44E52")
    ax.text(5, 2.2, "Database('remote')    -> instance A (same!)", ha="center",
            fontsize=9, color="#55A868")
    box = FancyBboxPatch((1.5, 1.0), 7.0, 0.6,
                         boxstyle="round,pad=0.08",
                         facecolor="#f5f5f5", edgecolor="#999", lw=1)
    ax.add_patch(box)
    ax.text(5, 1.3, "__call__ is invoked every time you call Database()",
            ha="center", fontsize=8, color="#666")

    # ---- 3) __init_subclass__ vs 元类 ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Metaclass vs __init_subclass__", fontsize=12, fontweight="bold")
    ax.axis("off")

    # 左: 元类
    ax.text(2.5, 9.2, "Metaclass", ha="center", fontsize=12,
            fontweight="bold", color="#C44E52")
    meta_pros = [
        "Full control of class creation",
        "Modify namespace (add/remove attrs)",
        "Singleton, ORM, validation",
        "More powerful, more complex",
    ]
    meta_cons = [
        "Hard to understand / debug",
        "Inheritance chain complexity",
        "Rarely needed in practice",
    ]
    for i, p in enumerate(meta_pros):
        ax.text(2.5, 8.4 - i*0.6, f"+ {p}", ha="center", fontsize=8, color="#55A868")
    for i, c in enumerate(meta_cons):
        ax.text(2.5, 6.0 - i*0.6, f"- {c}", ha="center", fontsize=8, color="#C44E52")

    # 右: __init_subclass__
    ax.text(7.5, 9.2, "__init_subclass__", ha="center", fontsize=12,
            fontweight="bold", color="#55A868")
    init_pros = [
        "Simple: just a hook in base class",
        "Subclass registration",
        "No metaclass magic needed",
        "Python 3.6+ recommended",
    ]
    init_cons = [
        "Cannot modify namespace",
        "Only triggered on subclassing",
        "Less powerful than metaclass",
    ]
    for i, p in enumerate(init_pros):
        ax.text(7.5, 8.4 - i*0.6, f"+ {p}", ha="center", fontsize=8, color="#55A868")
    for i, c in enumerate(init_cons):
        ax.text(7.5, 6.0 - i*0.6, f"- {c}", ha="center", fontsize=8, color="#C44E52")

    # VS
    ax.text(5, 4.0, "VS", ha="center", fontsize=16,
            fontweight="bold", color="#999")

    # 推荐
    box = FancyBboxPatch((1.0, 1.5), 8.0, 1.8,
                         boxstyle="round,pad=0.12",
                         facecolor="#f5f5f5", edgecolor="#999", lw=1.5)
    ax.add_patch(box)
    ax.text(5, 2.8, "Rule of thumb:", ha="center", fontsize=10,
            fontweight="bold", color="#4C72B0")
    ax.text(5, 2.2, "Need subclass registration?  -> __init_subclass__",
            ha="center", fontsize=8, color="#666")
    ax.text(5, 1.7, "Need to modify class creation? -> Metaclass",
            ha="center", fontsize=8, color="#666")

    fig.tight_layout()
    path = os.path.join("images", "metaclass.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
