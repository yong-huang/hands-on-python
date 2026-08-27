"""
getattr_proxy 示意图生成脚本
输出: images/getattr_proxy.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图示内容为静态机制示意（属性查找链 / __getattr__ vs __getattribute__ / 代理模式），
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
    fig.suptitle("__getattr__ & __getattribute__ -- Lookup Chain",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) 属性查找链 ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Attribute Lookup Chain", fontsize=12, fontweight="bold")
    ax.axis("off")

    steps = [
        (5, 9.0, "obj.attr", "#4C72B0"),
        (5, 7.6, "__getattribute__(attr)", "#DD8452"),
        (5, 6.2, "Data descriptor in type?", "#E8A838"),
        (5, 4.8, "obj.__dict__[attr]?", "#55A868"),
        (5, 3.4, "Non-data descriptor in type?", "#8172B2"),
        (5, 2.0, "__getattr__(attr)", "#C44E52"),
        (5, 0.6, "AttributeError", "#999"),
    ]
    w, h = 6.5, 0.9
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
            label = "Found" if i in [1, 2, 3] else "Not found"
            if i in [0]:
                label = ""
            ax.text(x + w/2 + 0.1, (y + ny)/2, label, fontsize=7, color="#55A868")
            ax.annotate("", xy=(5, ny + h/2 + 0.05),
                        xytext=(5, y - h/2 - 0.05),
                        arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    # ---- 2) __getattr__ vs __getattribute__ ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("__getattr__ vs __getattribute__", fontsize=12, fontweight="bold")
    ax.axis("off")

    # __getattr__
    box = FancyBboxPatch((0.5, 5.5), 4.0, 3.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#55A868", alpha=0.1,
                         edgecolor="#55A868", lw=2)
    ax.add_patch(box)
    ax.text(2.5, 8.5, "__getattr__", ha="center", fontsize=12,
            fontweight="bold", color="#55A868")
    items = [
        "Called ONLY when",
        "normal lookup fails",
        "",
        "Good for:",
        "  Dynamic attributes",
        "  Lazy loading",
        "  Default values",
    ]
    for i, item in enumerate(items):
        ax.text(2.5, 7.8 - i * 0.5, item, ha="center",
                fontsize=8, color="#333")

    # __getattribute__
    box = FancyBboxPatch((5.5, 5.5), 4.0, 3.5,
                         boxstyle="round,pad=0.1",
                         facecolor="#C44E52", alpha=0.1,
                         edgecolor="#C44E52", lw=2)
    ax.add_patch(box)
    ax.text(7.5, 8.5, "__getattribute__", ha="center", fontsize=12,
            fontweight="bold", color="#C44E52")
    items = [
        "Called on EVERY",
        "attribute access",
        "",
        "Good for:",
        "  Access logging",
        "  Validation",
        "  Immutable objects",
    ]
    for i, item in enumerate(items):
        ax.text(7.5, 7.8 - i * 0.5, item, ha="center",
                fontsize=8, color="#333")

    ax.text(5, 4.5, "VS", ha="center", fontsize=16, fontweight="bold", color="#999")

    # Warning
    box = FancyBboxPatch((0.5, 1.0), 9.0, 2.8,
                         boxstyle="round,pad=0.12",
                         facecolor="#fff3cd", edgecolor="#DD8452", lw=1.5)
    ax.add_patch(box)
    ax.text(5, 3.2, "WARNING: infinite recursion trap!", ha="center",
            fontsize=10, fontweight="bold", color="#C44E52")
    ax.text(5, 2.5, "Inside __getattribute__, NEVER use self.xxx",
            ha="center", fontsize=9, color="#333")
    ax.text(5, 1.9, "Use: object.__getattribute__(self, 'xxx')",
            ha="center", fontsize=9, color="#333", family="monospace")

    # ---- 3) 代理模式 ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Proxy Pattern", fontsize=12, fontweight="bold")
    ax.axis("off")

    nodes = [
        (5, 8.5, "Client Code", "#4C72B0"),
        (2, 5.5, "Proxy", "#55A868"),
        (8, 5.5, "Real Object", "#DD8452"),
    ]
    r = 0.7
    for x, y, label, color in nodes:
        circle = plt.Circle((x, y), r, facecolor=color, alpha=0.15,
                             edgecolor=color, lw=2)
        ax.add_patch(circle)
        ax.text(x, y, label, ha="center", va="center",
                fontsize=10, fontweight="bold", color=color)

    ax.annotate("", xy=(2.7, 5.8), xytext=(4.3, 8.2),
                arrowprops=dict(arrowstyle="->", color="#55A868", lw=1.5))
    ax.annotate("", xy=(7.3, 5.5), xytext=(2.7, 5.5),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1.5))

    ax.text(5, 6.8, "obj.attr", ha="center", fontsize=9, color="#666")

    flows = [
        "1. Client calls proxy.attr",
        "2. Proxy.__getattr__ forwards to real_obj.attr",
        "3. Real object returns value",
        "4. Proxy returns value to client",
    ]
    for i, f in enumerate(flows):
        ax.text(5, 3.8 - i * 0.6, f, ha="center", fontsize=8, color="#333")

    # Use cases
    box = FancyBboxPatch((1.0, 0.5), 8.0, 1.2,
                         boxstyle="round,pad=0.08",
                         facecolor="#f5f5f5", edgecolor="#999", lw=1)
    ax.add_patch(box)
    ax.text(5, 1.3, "Use cases: API wrapper, lazy loading, access control, logging",
            ha="center", fontsize=8, color="#666")

    fig.tight_layout()
    path = os.path.join("images", "getattr_proxy.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
