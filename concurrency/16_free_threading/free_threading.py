"""
16 · ⚠️ 选做——free-threading 无 GIL 实测：亲手跑进"没有 GIL 的世界"
并发清单项目 16（前沿选做）：PEP 703 落地后的 threading 是什么样子

实测设计:
- 同一段纯 Python CPU 循环，分别在 GIL 构建与 free-threading 构建下跑
- 度量：T 个线程各自做 n 次迭代的墙钟时间，对照串行基准 T×n
  speedup = T × t(单线程) / t(T 线程) —— GIL 构建理论 ≈1.0×，free-threading 理论 ≈T×

两个实测点（全部可断言）:
- GIL 构建 (3.13): sys._is_gil_enabled() == True，4 线程 speedup ≈ 1.0（完全串行化）
- free-threading 构建 (3.14t): gil == False，4 线程 speedup ≥ 2.0（真并行！）

用法:
- python3 free_threading.py             # 双构建对比（自动探测 python3.14t）
- python3 free_threading.py --bench     # 只输出当前构建的 JSON（供 --compare 调用）
前置: uv python install 3.14t（本机已装 3.14.3t，见 README 环境配置）
交互示意图: 用浏览器打开 images/free_threading.archify.html
"""

import json
import subprocess
import sys
import sysconfig
import threading
import time

N_ITER = 2_000_000
N_THREADS = 4


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def cpu_loop(n: int) -> int:
    x = 0
    for i in range(n):
        x += i
    return x


def bench_threads(nthreads: int, n: int) -> float:
    """nthreads 个线程各跑 n 次迭代，返回墙钟时间"""
    threads = [threading.Thread(target=cpu_loop, args=(n,)) for _ in range(nthreads)]
    t0 = time.perf_counter()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return time.perf_counter() - t0


def bench_build() -> dict:
    """当前构建的完整画像：版本 / GIL 状态 / 线程扩展比"""
    is_ft = bool(sysconfig.get_config_var("Py_GIL_DISABLED"))
    gil_enabled = sys._is_gil_enabled() if hasattr(sys, "_is_gil_enabled") else True
    t1 = bench_threads(1, N_ITER)           # 单线程基线
    t4 = bench_threads(N_THREADS, N_ITER)   # 4 线程（总功 = 4×）
    speedup = N_THREADS * t1 / t4           # 相对"串行做同样总功"
    return {"build": "free-threading" if is_ft else "GIL",
            "version": sys.version.split()[0],
            "gil_enabled": gil_enabled,
            "t1": round(t1, 3), "t4": round(t4, 3),
            "speedup": round(speedup, 2)}


# ============================================================
# --bench 模式：输出 JSON 供 --compare 收集
# ============================================================

def bench_mode() -> None:
    r = bench_build()
    print("BENCH_JSON=" + json.dumps(r, ensure_ascii=False))


# ============================================================
# 默认模式：双构建对比
# ============================================================

def find_ft_python() -> str:
    import shutil
    for cand in ("python3.14t", "python3.13t"):
        p = shutil.which(cand)
        if p:
            return p
    import os
    local = os.path.expanduser("~/.local/bin/python3.14t")
    if os.path.exists(local):
        return local
    return ""


def run_bench_in(python: str) -> dict:
    p = subprocess.run([python, __file__, "--bench"],
                       capture_output=True, text=True, timeout=120)
    for line in p.stdout.splitlines():
        if line.startswith("BENCH_JSON="):
            return json.loads(line.split("=", 1)[1])
    raise RuntimeError(f"{python} 未输出 BENCH_JSON: {p.stderr[-200:]}")


def demo_compare() -> None:
    section(f"1. 双构建对比：{N_THREADS} 线程 × {N_ITER:,} 次迭代")
    ft_python = find_ft_python()
    assert ft_python, "找不到 free-threading 解释器（uv python install 3.14t）"

    gil = run_bench_in(sys.executable)
    ft = run_bench_in(ft_python)
    print(f"  {'构建':<16} {'版本':<10} {'GIL':<6} {'1线程':>8} {'4线程':>8} {'扩展比':>8}")
    for r in (gil, ft):
        print(f"  {r['build']:<16} {r['version']:<10} "
              f"{'开' if r['gil_enabled'] else '关':<6} "
              f"{r['t1']:>7.3f}s {r['t4']:>7.3f}s {r['speedup']:>7.2f}×")

    # 断言 1：GIL 构建——GIL 开着，4 线程无真并行
    assert gil["gil_enabled"] is True, "GIL 构建的 _is_gil_enabled 应为 True"
    assert gil["speedup"] < 1.3, f"GIL 构建竟有 {gil['speedup']}× 扩展？"
    # 断言 2：free-threading 构建——GIL 关闭，真并行 ≥2×
    assert ft["gil_enabled"] is False, "free-threading 构建的 GIL 应已关闭"
    assert ft["speedup"] >= 2.0, f"free-threading 扩展比仅 {ft['speedup']}×（≥2.0 预期）"
    print(f"\n  结论：GIL 构建 4 线程 {gil['speedup']}×（串行化），"
          f"free-threading {ft['speedup']}×（真并行）")
    print("  同样的 threading 代码，换了构建就是两倍以上吞吐——这就是 PEP 703 的意义")


def main() -> None:
    if "--bench" in sys.argv:
        bench_mode()
        return
    print(f"Python {sys.version.split()[0]} · GIL={sys._is_gil_enabled() if hasattr(sys, '_is_gil_enabled') else '?'}")
    demo_compare()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：双构建 GIL 状态（§1）、扩展比对照（§1）")
    print("提醒：free-threading 下'靠 GIL 兜底的侥幸代码'不再安全——锁该加还得加（项目 3）")


if __name__ == "__main__":
    main()
