"""
decorator_factory 示意图生成脚本
输出: images/decorator_arch.png, images/decorator_runtime.png (dpi=150)
用法: python3 scripts/gen_diagram.py   (在任意 cwd 运行均可)

图中数据为示意数据（重试/缓存行为模式），不依赖主模块运行时结果。
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

# 中文字体探测 (macOS 优先 PingFang SC, 兜底 SimHei)
for _f in ["PingFang SC", "Heiti SC", "STHeiti", "SimHei"]:
    if any(_f in f.name for f in fm.fontManager.ttflist):
        plt.rcParams["font.sans-serif"] = [_f, "DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False
        break


def plot_arch():
    fig, ax = plt.subplots(figsize=(7, 8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis("off")

    layers = [
        ("Client 调用",      8.8, "#4C72B0"),
        ("@retry(3, 0.1)",   7.1, "#DD8452"),
        ("@cache(ttl=2.0)",  5.4, "#E8A838"),
        ("@log_call(DEBUG)", 3.7, "#C44E52"),
        ("fetch()",          2.0, "#55A868"),
    ]
    w, h = 7.0, 1.1

    for i, (label, yc, color) in enumerate(layers):
        rect = plt.Rectangle(((10-w)/2, yc-h/2), w, h,
                            facecolor=color, edgecolor="#333",
                            linewidth=1.5, alpha=0.85)
        ax.add_patch(rect)
        ax.text(5, yc, label, ha="center", va="center",
               fontsize=12, color="white", fontweight="bold")
        # 箭头
        if i < len(layers) - 1:
            next_yc = layers[i+1][1]
            ax.annotate("", xy=(5, next_yc+h/2+0.05),
                       xytext=(5, yc-h/2-0.05),
                       arrowprops=dict(arrowstyle="->", color="#333", lw=2))

    ax.text(5, 9.7, "装饰器调用链", ha="center", fontsize=14, fontweight="bold")
    ax.text(5, 0.4, "调用从上到下  |  返回从下到上", ha="center", fontsize=10, color="#666")

    plt.tight_layout()
    fig.savefig(os.path.join("images", "decorator_arch.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("✅ decorator_arch.png")


def plot_runtime():
    fig, axes = plt.subplots(1, 3, figsize=(14, 4))

    # retry 行为
    ax = axes[0]
    attempts = [1, 2, 3, 1, 2, 1]
    ok = [False, False, True, True, False, True]
    colors = ["#C44E52" if not v else "#55A868" for v in ok]
    ax.bar(range(len(attempts)), attempts, color=colors, edgecolor="#333")
    ax.set_title("@retry 重试", fontsize=11)
    ax.set_xticks(range(len(attempts)))
    ax.set_xticklabels([f"#{i+1}" for i in range(len(attempts))], fontsize=8)

    # cache 行为
    ax = axes[1]
    results = ["miss", "hit", "hit", "miss", "hit"]
    colors = ["#C44E52" if r == "miss" else "#55A868" for r in results]
    ax.bar(range(len(results)), [1]*len(results), color=colors, edgecolor="#333")
    ax.set_title("@cache 命中", fontsize=11)
    ax.set_xticks(range(len(results)))
    ax.set_xticklabels([f"#{i+1}" for i in range(len(results))], fontsize=8)

    # 耗时对比
    ax = axes[2]
    ax.barh(["首次调用", "缓存命中"], [0.30, 0.00], color=["#C44E52", "#55A868"])
    ax.set_title("@cache 耗时(s)", fontsize=11)
    ax.set_xlabel("秒")

    plt.suptitle("装饰器运行时行为", fontsize=13, y=1.02)
    plt.tight_layout()
    fig.savefig(os.path.join("images", "decorator_runtime.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("✅ decorator_runtime.png")


if __name__ == "__main__":
    plot_arch()
    plot_runtime()
    print(f"Saved: {os.path.abspath('images/decorator_arch.png')}")
    print(f"Saved: {os.path.abspath('images/decorator_runtime.png')}")
