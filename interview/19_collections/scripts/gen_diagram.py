"""
collections 示意图生成脚本
输出: images/collections.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图为静态机制示意图（容器对比表 / dataclass 配置 / 常用模式），
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
    fig.suptitle("collections / dataclass -- Data Containers",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) 三种容器对比 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Container Comparison", fontsize=12, fontweight="bold")
    ax.axis("off")

    table = [
        ("Feature", "dict", "namedtuple", "dataclass"),
        ("Mutable", "Yes", "No", "Yes"),
        ("Field access", "d['x']", "p.x", "p.x"),
        ("__repr__", "Manual", "Auto", "Auto"),
        ("__eq__", "Manual", "Auto", "Auto"),
        ("__hash__", "No", "Yes", "If frozen"),
        ("Defaults", "No", "Yes (3.7+)", "Yes"),
        ("Type hints", "No", "NamedTuple", "Yes"),
    ]
    col_colors = ("#4C72B0", "#55A868", "#DD8452", "#8172B2")
    for i, row in enumerate(table):
        for j, cell in enumerate(row):
            x = 1.2 + j * 2.5
            y = 8.5 - i * 1.1
            color = col_colors[j] if i == 0 or j == 0 else "#333"
            fw = "bold" if i == 0 or j == 0 else "normal"
            box = FancyBboxPatch((x-1.1, y-0.3), 2.2, 0.6,
                                 boxstyle="round,pad=0.04",
                                 facecolor=color, alpha=0.08 if i > 0 else 0.15,
                                 edgecolor=color, lw=0.5 if i > 0 else 1.5)
            ax.add_patch(box)
            ax.text(x, y, cell, ha="center", va="center",
                    fontsize=8 if i > 0 else 9, fontweight=fw, color=color)

    # ---- 2) dataclass 配置 ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("dataclass Options", fontsize=12, fontweight="bold")
    ax.axis("off")

    options = [
        ("frozen=True", "#C44E52", "Immutable + hashable\nNo __setattr__"),
        ("order=True", "#55A868", "Auto __lt__/__le__/etc.\nSorted instances"),
        ("slots=True", "#4C72B0", "__slots__ memory saving\nPython 3.10+"),
        ("kw_only=True", "#8172B2", "All fields keyword-only\nin __init__"),
        ("repr=False", "#DD8452", "Disable auto __repr__\nCustom repr"),
        ("default_factory=", "#E8A838", "Mutable default factory\nAvoid shared mutable"),
    ]
    for i, (option, color, desc) in enumerate(options):
        y = 8.5 - i * 1.3
        box = FancyBboxPatch((0.5, y-0.5), 3.0, 1.0,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(2, y, option, ha="center", fontsize=8,
                fontweight="bold", color=color, family="monospace")
        ax.text(5.5, y, desc, ha="left", fontsize=8, color="#666")

    # ---- 3) 常用模式 ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Common Patterns", fontsize=12, fontweight="bold")
    ax.axis("off")

    patterns = [
        ("Data transfer", "#4C72B0", "Use namedtuple for returning\nmultiple values as a unit"),
        ("Configuration", "#55A868", "Use frozen dataclass for\nstructured config with defaults"),
        ("Model/Entity", "#DD8452", "Use dataclass for domain\nobjects with validation"),
        ("Immutable key", "#C44E52", "frozen=True for dict keys\nand set members"),
    ]
    for i, (name, color, desc) in enumerate(patterns):
        y = 8.5 - i * 2.2
        box = FancyBboxPatch((0.5, y-0.8), 9.0, 1.6,
                             boxstyle="round,pad=0.1",
                             facecolor=color, alpha=0.1,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(5, y + 0.2, name, ha="center", fontsize=10,
                fontweight="bold", color=color)
        ax.text(5, y - 0.3, desc, ha="center", fontsize=8, color="#666")

    fig.tight_layout()
    path = os.path.join("images", "collections.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
