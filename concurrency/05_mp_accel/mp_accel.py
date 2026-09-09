"""
05 · multiprocessing 多核加速实测 —— 绕开 GIL 的真并行
并发清单项目 5：每个进程一把独立 GIL，CPU 密集任务第一次真正跑出加速比

四个实测点（全部可断言）:
- 启动方式: macOS 默认 spawn——子进程重新 import 主模块，__main__ 保护不是摆设
- 加速比:   同一 CPU 密集任务，Pool(4) vs 串行，预热后交替 3 轮取中位，加速比 ≥ 2.0×
- 保序:     pool.map 结果严格按输入顺序返回（即使各任务完成时间乱序）
- 对照:     threading 同任务无加速（项目 2 的结论），数字摆在一起看

用法: python3 mp_accel.py   # 全部实测 + 断言，约 15 秒
交互示意图: 用浏览器打开 images/mp_accel.archify.html
"""

import multiprocessing
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

CPU_N = 150_000      # 数素数规模：串行单次约 0.3s（M 系列），加大任务摊薄 spawn 启动成本


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def cpu_task(n: int) -> int:
    """纯 Python 数素数：GIL 全程握在手里，只有多进程能并行它"""
    count = 0
    for i in range(2, n):
        if all(i % j for j in range(2, int(i ** 0.5) + 1)):
            count += 1
    return count


# ============================================================
# 1. 环境探测：核数与启动方式
# ============================================================

def demo_env() -> None:
    section("1. 环境探测")
    print(f"  cpu_count = {multiprocessing.cpu_count()}")
    print(f"  默认启动方式 = {multiprocessing.get_start_method()!r}")
    print("  macOS 从 3.8 起默认 spawn：子进程重新 import 主模块，")
    print("  所以入口必须躲在 if __name__ == '__main__' 后面（§3 复现违反的后果）")


# ============================================================
# 2. 加速比实测（验收点：Pool(4) ≥ 2.0× 串行）
# ============================================================

def bench_once(n_procs: int) -> float:
    """一轮计时：进程池建在计时外（摊薄 spawn 成本），测纯并行收益"""
    with multiprocessing.Pool(n_procs) as pool:
        t0 = time.perf_counter()
        pool.map(cpu_task, [CPU_N] * n_procs)
        return time.perf_counter() - t0


def demo_speedup() -> None:
    section(f"2. CPU 密集加速比：串行 vs Pool(4)，任务规模 {CPU_N:,}")
    cpu_task(1000)  # 预热拉频
    serial = sorted(
        (lambda t0: (cpu_task(CPU_N), cpu_task(CPU_N), cpu_task(CPU_N), cpu_task(CPU_N), time.perf_counter() - t0))(time.perf_counter())
        for _ in range(3)
    )
    t_serial = serial[0][-1]
    pool_times = sorted(bench_once(4) for _ in range(3))
    t_pool = pool_times[1]
    speedup = t_serial / t_pool
    assert speedup >= 2.0, f"加速比仅 {speedup:.2f}×，多进程没跑起来？"
    print(f"  串行 4 连跑:  {t_serial:.3f}s")
    print(f"  Pool(4):      {t_pool:.3f}s   ({speedup:.2f}× 加速)")
    print("  对照（同一任务 threading 4 线程）——GIL 下白忙:")
    with ThreadPoolExecutor(max_workers=4) as tp:
        t0 = time.perf_counter()
        list(tp.map(cpu_task, [CPU_N] * 4))
    t_threads = time.perf_counter() - t0
    print(f"  threading(4): {t_threads:.3f}s   ({t_serial / t_threads:.2f}×，不加速)")
    print("  多进程 = 每个进程一把独立 GIL，字节码真并行")


# ============================================================
# 3. spawn 与 __main__ 保护：违反的后果复现
# ============================================================

def demo_spawn_guard() -> None:
    section("3. spawn 的 __main__ 保护：违反会怎样？")
    bad_code = """import multiprocessing
def worker(n):
    return n * n
multiprocessing.set_start_method('spawn', force=True)
p = multiprocessing.Process(target=worker, args=(2,))   # 保护缺失！
p.start(); p.join()
print('OK', p.exitcode)
"""
    tmp = "/tmp/_mp_no_guard.py"
    with open(tmp, "w") as f:
        f.write(bad_code)
    import subprocess
    p = subprocess.run([sys.executable, tmp], capture_output=True, text=True, timeout=30)
    # 3.13 的真实行为：RuntimeError 在【子进程】re-import 主模块时抛出——
    # 子进程带着 exitcode=1 尸退，父进程毫不知情，照常打印 OK 并以 0 退出
    assert "bootstrapping phase" in p.stderr, "预期子进程报 bootstrapping 错误"
    assert p.returncode == 0 and "OK 1" in p.stdout, f"父进程行为与预期不符: {p.stdout}"
    print(f"  父进程退出码 {p.returncode}，stdout = {p.stdout.strip()!r}  ← 看起来一切正常！")
    print("  真相在 stderr：子进程 re-import 主模块时再次执行 p.start()，")
    print("  抛 RuntimeError '...before the current process has finished its bootstrapping phase...'，")
    print("  子进程 exitcode=1 尸退，worker 结果悄悄丢失——静默失败，比当场崩溃更危险")
    print("  规矩：入口代码必须 if __name__ == '__main__' 保护")


def sleepy(n: float) -> float:
    """注意：必须定义在模块顶层——spawn 要按限定名 pickle 目标函数，
    嵌套在函数里的 local 函数会 AttributeError: Can't get local object"""
    time.sleep(n)
    return n


# ============================================================
# 4. pool.map 保序：完成乱序，结果不乱
# ============================================================

def demo_map_order() -> None:
    section("4. pool.map 保序：慢任务在前，结果仍按输入顺序")
    with multiprocessing.Pool(4) as pool:
        t0 = time.perf_counter()
        got = pool.map(sleepy, [0.3, 0.1, 0.2, 0.05])
    assert got == [0.3, 0.1, 0.2, 0.05], f"map 乱序了: {got}"
    print(f"  输入 [0.3, 0.1, 0.2, 0.05]（最慢的先提交）→ map 返回 {got}")
    print(f"  总耗时 {time.perf_counter() - t0:.2f}s ≈ 最慢任务 0.3s：4 个任务真并行了")
    print("  顺带一个坑：传给 Pool 的函数必须是模块顶层函数——嵌套函数无法 pickle（本实验第一版就踩了）")


def main() -> None:
    print(f"Python {sys.version.split()[0]} · cpu_count={multiprocessing.cpu_count()} · "
          f"start_method={multiprocessing.get_start_method()!r}")
    demo_env()
    demo_speedup()
    demo_spawn_guard()
    demo_map_order()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：加速比 ≥2.0×（§2）、spawn 保护复现（§3）、map 保序（§4）")


if __name__ == "__main__":
    main()
