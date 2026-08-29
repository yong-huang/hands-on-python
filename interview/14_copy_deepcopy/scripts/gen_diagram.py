"""
copy_deepcopy 示意图生成脚本
输出: images/copy_deepcopy.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图示内容为静态机制示意（内存模型 / 修改传播表 / 使用指南），
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
    fig.suptitle("copy vs deepcopy -- Object Graphs",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) 三种方式的内存图 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Memory: = / copy / deepcopy", fontsize=12, fontweight="bold")
    ax.axis("off")

    for label, y in [("Assignment", 8.5), ("copy()", 5.5), ("deepcopy()", 2.5)]:
        ax.text(0.5, y, label, ha="left", va="center", fontsize=10,
                fontweight="bold", color="#4C72B0")

    # Assignment: same box
    box = FancyBboxPatch((3, 7.8), 3.0, 1.4,
                         boxstyle="round,pad=0.1",
                         facecolor="#C44E52", alpha=0.15,
                         edgecolor="#C44E52", lw=2)
    ax.add_patch(box)
    ax.text(4.5, 8.5, "[[1,2], [3,4]]", ha="center", fontsize=8,
            fontweight="bold", color="#C44E52")
    ax.text(9, 8.5, "original = assigned\n(same object!)", ha="center",
            fontsize=8, color="#C44E52")

    # copy: outer new, inner shared
    box1 = FancyBboxPatch((3, 5.0), 1.5, 1.0,
                          boxstyle="round,pad=0.06",
                          facecolor="#55A868", alpha=0.15,
                          edgecolor="#55A868", lw=1.5)
    box2 = FancyBboxPatch((5, 5.0), 1.5, 1.0,
                          boxstyle="round,pad=0.06",
                          facecolor="#55A868", alpha=0.15,
                          edgecolor="#55A868", lw=1.5)
    ax.add_patch(box1)
    ax.add_patch(box2)
    ax.text(3.75, 5.5, "[1,2]", ha="center", fontsize=8, color="#55A868")
    ax.text(5.75, 5.5, "[3,4]", ha="center", fontsize=8, color="#55A868")
    ax.text(9, 5.5, "outer: new\ninner: shared", ha="center",
            fontsize=8, color="#55A868")

    # deepcopy: all new
    box1 = FancyBboxPatch((3, 2.0), 1.5, 1.0,
                          boxstyle="round,pad=0.06",
                          facecolor="#4C72B0", alpha=0.15,
                          edgecolor="#4C72B0", lw=1.5)
    box2 = FancyBboxPatch((5, 2.0), 1.5, 1.0,
                          boxstyle="round,pad=0.06",
                          facecolor="#4C72B0", alpha=0.15,
                          edgecolor="#4C72B0", lw=1.5)
    ax.add_patch(box1)
    ax.add_patch(box2)
    ax.text(3.75, 2.5, "[1,2]", ha="center", fontsize=8, color="#4C72B0")
    ax.text(5.75, 2.5, "[3,4]", ha="center", fontsize=8, color="#4C72B0")
    ax.text(9, 2.5, "outer: new\ninner: new!", ha="center",
            fontsize=8, color="#4C72B0")

    # ---- 2) 修改传播 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Mutation Propagation", fontsize=12, fontweight="bold")
    ax.axis("off")

    table = [
        ("Operation", "copy()", "deepcopy()"),
        ("outer[0] = 99", "Independent", "Independent"),
        ("outer[0][0] = 99", "Shared!", "Independent"),
        ("outer.append(x)", "Independent", "Independent"),
    ]
    # 行颜色: Independent=绿(安全), Shared!=红(危险); 与表格文字一一对应
    colors = [("#4C72B0", "#4C72B0", "#4C72B0"),
              ("#333", "#55A868", "#55A868"),
              ("#C44E52", "#C44E52", "#55A868"),
              ("#55A868", "#55A868", "#55A868")]

    for i, row in enumerate(table):
        for j, cell in enumerate(row):
            x = 1.5 + j * 3.5
            y = 8.5 - i * 1.5
            color = colors[i][j] if j > 0 else "#4C72B0"
            box = FancyBboxPatch((x-1.5, y-0.4), 3.0, 0.8,
                                 boxstyle="round,pad=0.06",
                                 facecolor=color, alpha=0.1,
                                 edgecolor=color, lw=1)
            ax.add_patch(box)
            fw = "bold" if i == 0 else "normal"
            ax.text(x, y, cell, ha="center", va="center",
                    fontsize=9, fontweight=fw, color=color)

    ax.text(5, 1.5, "Key: Shared = mutation affects BOTH copies",
            ha="center", fontsize=9, color="#C44E52", fontweight="bold")

    # ---- 3) 何时用哪种 ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("When to Use Which", fontsize=12, fontweight="bold")
    ax.axis("off")

    cases = [
        ("Assignment (=)", "#999",
         "Both names point to same object\nAlias, not a copy"),
        ("copy.copy()", "#55A868",
         "New outer, shared inner objects\nFlat structures (no nested lists)"),
        ("copy.deepcopy()", "#4C72B0",
         "Completely independent copy\nNested or shared structures"),
    ]
    for i, (name, color, desc) in enumerate(cases):
        y = 8.5 - i * 2.5
        box = FancyBboxPatch((0.5, y-1.0), 9.0, 2.0,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.1,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(5, y+0.3, name, ha="center", fontsize=11,
                fontweight="bold", color=color)
        ax.text(5, y-0.3, desc, ha="center", fontsize=8, color="#333")

    fig.tight_layout()
    path = os.path.join("images", "copy_deepcopy.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
