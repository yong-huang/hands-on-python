"""
descriptor 示意图生成脚本
输出: images/descriptor.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图示内容为机制示意图（属性查找流程 / 数据 vs 非数据描述符 / 四种实战模式），
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
    fig.suptitle("Descriptor Protocol -- Internals",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) obj.attr 查找流程 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("obj.attr Lookup Flow", fontsize=12, fontweight="bold")
    ax.axis("off")

    steps = [
        (5, 9.0, "obj.attr", "#4C72B0"),
        (5, 7.5, "1. type(obj).__dict__['attr']?", "#DD8452"),
        (5, 6.0, "2. Is it a data descriptor?", "#E8A838"),
        (5, 4.5, "3. obj.__dict__['attr']?", "#55A868"),
        (5, 3.0, "4. type(obj).__dict__['attr']?\n(non-data descriptor)", "#8172B2"),
        (5, 1.5, "5. raise AttributeError", "#C44E52"),
    ]
    w, h = 6.5, 1.0
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
            side_text = "Yes" if i in [0, 3] else ("Found" if i == 1 else "Yes")
            if i == 0:
                ax.text(x + w/2 + 0.1, (y + ny)/2, side_text,
                        fontsize=7, color="#55A868")
            ax.annotate("", xy=(5, ny + h/2 + 0.05),
                        xytext=(5, y - h/2 - 0.05),
                        arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    # ---- 2) Data vs Non-data descriptor ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Data vs Non-Data Descriptor", fontsize=12, fontweight="bold")
    ax.axis("off")

    # Data descriptor
    ax.text(2.5, 9.3, "Data Descriptor", ha="center", fontsize=12,
            fontweight="bold", color="#C44E52")
    data_items = [
        (2.5, 8.2, "def __get__(self, obj, type)", "#C44E52"),
        (2.5, 7.0, "def __set__(self, obj, val)", "#C44E52"),
        (2.5, 5.8, "def __delete__(self, obj)", "#C44E52"),
        (2.5, 4.4, "Priority > obj.__dict__", "#C44E52"),
    ]
    for x, y, text, color in data_items:
        box = FancyBboxPatch((x-2.0, y-0.35), 4.0, 0.7,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=1.5)
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=8, color=color, fontweight="bold")

    # Examples
    ax.text(2.5, 3.4, "Examples:", ha="center", fontsize=9,
            color="#666", fontweight="bold")
    for i, ex in enumerate(["property", "TypedField", "LoggedField"]):
        ax.text(2.5, 2.8 - i*0.5, ex, ha="center", fontsize=8,
                color="#888")

    # Non-data descriptor
    ax.text(7.5, 9.3, "Non-Data Descriptor", ha="center", fontsize=12,
            fontweight="bold", color="#55A868")
    nondata_items = [
        (7.5, 8.2, "def __get__(self, obj, type)", "#55A868"),
        (7.5, 7.0, "No __set__ / __delete__", "#55A868"),
        (7.5, 5.8, "", "#55A868"),
        (7.5, 4.4, "obj.__dict__ priority >", "#55A868"),
    ]
    for x, y, text, color in nondata_items:
        box = FancyBboxPatch((x-2.0, y-0.35), 4.0, 0.7,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=1.5)
        ax.add_patch(box)
        if text:
            ax.text(x, y, text, ha="center", va="center",
                    fontsize=8, color=color, fontweight="bold")

    ax.text(7.5, 3.4, "Examples:", ha="center", fontsize=9,
            color="#666", fontweight="bold")
    for i, ex in enumerate(["classmethod", "CachedProperty", "LazyField"]):
        ax.text(7.5, 2.8 - i*0.5, ex, ha="center", fontsize=8,
                color="#888")

    # VS
    ax.text(5, 4.4, "VS", ha="center", va="center",
            fontsize=14, color="#999", fontweight="bold")

    # ---- 3) 四种描述符实战场景 ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Four Descriptor Patterns", fontsize=12, fontweight="bold")
    ax.axis("off")

    patterns = [
        (2.5, 8.2, "TypedField", "#C44E52", "validation\n(type/range check)"),
        (2.5, 5.5, "CachedProperty", "#55A868", "lazy compute\ncache after 1st access"),
        (7.5, 8.2, "LazyField", "#4C72B0", "defer init\nconnect on first use"),
        (7.5, 5.5, "LoggedField", "#E8A838", "read/write audit\naccess tracking"),
    ]

    for x, y, name, color, desc in patterns:
        box = FancyBboxPatch((x-1.8, y-0.8), 3.6, 1.6,
                             boxstyle="round,pad=0.12",
                             facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y + 0.2, name, ha="center", va="center",
                fontsize=10, fontweight="bold", color=color)
        ax.text(x, y - 0.3, desc, ha="center", va="center",
                fontsize=7, color="#666")

    # Bottom: key takeaway
    box = FancyBboxPatch((0.5, 1.0), 9.0, 2.0,
                         boxstyle="round,pad=0.12",
                         facecolor="#f5f5f5", edgecolor="#999", lw=1.5)
    ax.add_patch(box)
    ax.text(5, 2.4, "__set_name__(owner, name)", ha="center",
            fontsize=10, fontweight="bold", color="#4C72B0")
    ax.text(5, 1.7, "Python 3.6+: auto-captures attribute name\n"
            "descriptor.name = 'age' (not hardcoded)",
            ha="center", va="center", fontsize=8, color="#666")

    fig.tight_layout()
    path = os.path.join("images", "descriptor.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
