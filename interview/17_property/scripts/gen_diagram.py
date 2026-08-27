"""
property 示意图生成脚本
输出: images/property.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图为静态机制示意图（property 工作流 / 三种用法 / 对比表），
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
    fig.suptitle("property -- Getter / Setter / Computed",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) property 工作流 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("property Workflow", fontsize=12, fontweight="bold")
    ax.axis("off")

    # Read
    ax.text(5, 9.0, "READ: obj.x", ha="center", fontsize=11,
            fontweight="bold", color="#4C72B0")
    read_steps = [
        ("obj.x", "calls x.__get__(obj)", "#4C72B0"),
        ("returns", "self._x (via getter)", "#55A868"),
    ]
    for i, (left, right, color) in enumerate(read_steps):
        y = 7.5 - i * 1.5
        box = FancyBboxPatch((1, y-0.3), 3.5, 0.6,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.1, edgecolor=color, lw=1)
        ax.add_patch(box)
        box = FancyBboxPatch((5.5, y-0.3), 3.5, 0.6,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.1, edgecolor=color, lw=1)
        ax.add_patch(box)
        ax.text(2.75, y, left, ha="center", fontsize=9, color=color)
        ax.text(7.25, y, right, ha="center", fontsize=9, color=color)
    ax.annotate("", xy=(5.5, 7.2), xytext=(4.5, 7.2),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    # Write
    ax.text(5, 4.0, "WRITE: obj.x = 10", ha="center", fontsize=11,
            fontweight="bold", color="#C44E52")
    write_steps = [
        ("obj.x = 10", "calls x.__set__(obj, 10)", "#C44E52"),
        ("setter runs", "validate -> self._x = 10", "#55A868"),
    ]
    for i, (left, right, color) in enumerate(write_steps):
        y = 2.5 - i * 1.5
        box = FancyBboxPatch((1, y-0.3), 3.5, 0.6,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.1, edgecolor=color, lw=1)
        ax.add_patch(box)
        box = FancyBboxPatch((5.5, y-0.3), 3.5, 0.6,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.1, edgecolor=color, lw=1)
        ax.add_patch(box)
        ax.text(2.75, y, left, ha="center", fontsize=9, color=color)
        ax.text(7.25, y, right, ha="center", fontsize=9, color=color)
    ax.annotate("", xy=(5.5, 2.2), xytext=(4.5, 2.2),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    # ---- 2) 三种 property 用法 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Three property Patterns", fontsize=12, fontweight="bold")
    ax.axis("off")

    patterns = [
        (5, 8.2, "Getter + Setter + Deleter", "#C44E52",
         "@property / @x.setter / @x.deleter\nValidation + side effects"),
        (5, 5.5, "Read-Only Computed", "#55A868",
         "@property only (no setter)\nDerived from other attributes"),
        (5, 2.8, "Synced Properties", "#4C72B0",
         "@property on celsius + fahrenheit\nSetter modifies internal state"),
    ]
    for x, y, title, color, desc in patterns:
        box = FancyBboxPatch((x-4.2, y-0.8), 8.4, 1.6,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.1,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y + 0.2, title, ha="center", fontsize=10,
                fontweight="bold", color=color)
        ax.text(x, y - 0.3, desc, ha="center", fontsize=8, color="#666")

    # ---- 3) property vs method vs attribute ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("property vs attribute vs method", fontsize=12, fontweight="bold")
    ax.axis("off")

    table = [
        ("Feature", "attribute", "property", "method"),
        ("Access", "obj.x", "obj.x", "obj.x()"),
        ("Validation", "No", "Yes (setter)", "Yes"),
        ("Computed", "No", "Yes (getter)", "Yes"),
        ("With params", "N/A", "N/A", "Yes"),
        ("Backward compat", "Always", "@property + setter", "Always"),
    ]
    colors = [("#4C72B0", "#4C72B0", "#4C72B0", "#4C72B0"),
              ("#333", "#55A868", "#C44E52", "#DD8452"),
              ("#333", "#55A868", "#C44E52", "#DD8452"),
              ("#333", "#C44E52", "#C44E52", "#55A868"),
              ("#333", "#55A868", "#55A868", "#55A868"),
              ("#333", "#55A868", "#C44E52", "#DD8452")]

    for i, row in enumerate(table):
        for j, cell in enumerate(row):
            x = 1.5 + j * 2.5
            y = 8.5 - i * 1.5
            color = colors[i][j]
            fw = "bold" if i == 0 else "normal"
            box = FancyBboxPatch((x-1.0, y-0.3), 2.0, 0.6,
                                 boxstyle="round,pad=0.04",
                                 facecolor=color, alpha=0.08,
                                 edgecolor=color, lw=0.5 if i > 0 else 2)
            ax.add_patch(box)
            ax.text(x, y, cell, ha="center", va="center",
                    fontsize=8 if i > 0 else 9, fontweight=fw, color=color)

    fig.tight_layout()
    path = os.path.join("images", "property.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
