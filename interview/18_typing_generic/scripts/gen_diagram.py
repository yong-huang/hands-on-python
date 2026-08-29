"""
typing_generic 示意图生成脚本
输出: images/typing_generic.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图为静态机制示意图（TypeVar/Generic、Protocol、常用注解速查），
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
    fig.suptitle("typing -- TypeVar / Generic / Protocol",
                 fontsize=14, fontweight="bold", y=1.02)

    # ---- 1) TypeVar 与 Generic ----
    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("TypeVar & Generic[T]", fontsize=12, fontweight="bold")
    ax.axis("off")

    ax.text(5, 9.0, "T = TypeVar('T')", ha="center", fontsize=12,
            fontweight="bold", color="#4C72B0", family="monospace")

    # Stack[int]
    box = FancyBboxPatch((1, 6.5), 3.5, 1.8,
                         boxstyle="round,pad=0.1",
                         facecolor="#55A868", alpha=0.1,
                         edgecolor="#55A868", lw=2)
    ax.add_patch(box)
    ax.text(2.75, 8.0, "Stack[int]", ha="center", fontsize=10,
            fontweight="bold", color="#55A868")
    ax.text(2.75, 7.2, "items: List[int]\npush(T) / pop() -> T", ha="center",
            fontsize=8, color="#666")

    # Stack[str]
    box = FancyBboxPatch((5.5, 6.5), 3.5, 1.8,
                         boxstyle="round,pad=0.1",
                         facecolor="#DD8452", alpha=0.1,
                         edgecolor="#DD8452", lw=2)
    ax.add_patch(box)
    ax.text(7.25, 8.0, "Stack[str]", ha="center", fontsize=10,
            fontweight="bold", color="#DD8452")
    ax.text(7.25, 7.2, "items: List[str]\npush(T) / pop() -> T", ha="center",
            fontsize=8, color="#666")

    ax.text(5, 5.0, "Same class, different type parameter",
            ha="center", fontsize=9, color="#666")

    # Constrained
    ax.text(5, 3.5, "Constrained TypeVar:", ha="center",
            fontsize=10, fontweight="bold", color="#C44E52")
    ax.text(5, 2.8, "N = TypeVar('N', int, float)",
            ha="center", fontsize=10, color="#C44E52", family="monospace")
    ax.text(5, 2.0, "N can only be int or float (checker enforces)",
            ha="center", fontsize=8, color="#666")

    # ---- 2) Protocol ----
    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Protocol (PEP 544)", fontsize=12, fontweight="bold")
    ax.axis("off")

    ax.text(5, 9.0, "@runtime_checkable", ha="center", fontsize=10,
            fontweight="bold", color="#8172B2", family="monospace")

    protocols = [
        (2.5, 7.0, "Sized", "#4C72B0", "__len__ + __getitem__"),
        (7.5, 7.0, "Closeable", "#55A868", "close()"),
        (2.5, 4.5, "Writable", "#DD8452", "write(data)"),
        (7.5, 4.5, "Readable", "#E8A838", "read() + write()"),
    ]
    for x, y, name, color, methods in protocols:
        box = FancyBboxPatch((x-1.5, y-0.6), 3.0, 1.2,
                             boxstyle="round,pad=0.08",
                             facecolor=color, alpha=0.12,
                             edgecolor=color, lw=2)
        ax.add_patch(box)
        ax.text(x, y+0.1, name, ha="center", fontsize=10,
                fontweight="bold", color=color)
        ax.text(x, y-0.3, methods, ha="center", fontsize=7, color="#666")

    # Inheritance
    ax.annotate("", xy=(7.5, 5.1), xytext=(7.5, 6.4),
                arrowprops=dict(arrowstyle="->", color="#666", lw=1,
                                connectionstyle="arc3,rad=-0.3"))
    ax.text(5, 2.0, "Readable(Writable, Protocol): protocol composition",
            ha="center", fontsize=8, color="#666")

    # ---- 3) 常用类型注解 ----
    ax = axes[2]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_title("Common Type Annotations", fontsize=12, fontweight="bold")
    ax.axis("off")

    annotations = [
        ("Optional[str]", "str | None", "#4C72B0"),
        ("Union[int, str]", "int or str", "#55A868"),
        ("List[int]", "list[int]", "#DD8452"),
        ("Dict[str, int]", "dict[str, int]", "#8172B2"),
        ("Tuple[int, ...]", "tuple[int, ...]", "#C44E52"),
        ("Callable[[int], str]", "def(x: int) -> str", "#E8A838"),
        ("TypeAlias", "Point = tuple[int, int]", "#999"),
    ]
    for i, (annotation, meaning, color) in enumerate(annotations):
        y = 9.0 - i * 1.2
        box = FancyBboxPatch((0.5, y-0.35), 4.5, 0.7,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.1,
                             edgecolor=color, lw=1.5)
        ax.add_patch(box)
        ax.text(2.75, y, annotation, ha="center", fontsize=8,
                fontweight="bold", color=color, family="monospace")
        box = FancyBboxPatch((5.5, y-0.35), 4.0, 0.7,
                             boxstyle="round,pad=0.06",
                             facecolor=color, alpha=0.05,
                             edgecolor="#ddd", lw=0.5)
        ax.add_patch(box)
        ax.text(7.5, y, meaning, ha="center", fontsize=8, color="#333")

    fig.tight_layout()
    path = os.path.join("images", "typing_generic.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    path = generate_visualization()
    print(f"Saved: {os.path.abspath(path)}")
