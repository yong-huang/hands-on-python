"""
12 · 死锁与竞态诊断工坊 —— 复现死锁 / faulthandler 抓现场 / 锁排序修复
并发清单项目 12：故意造出死锁，学会定位它，然后修到连跑 100 次无挂起

三个实测点（全部可断言）:
- 复现:     两个线程以相反顺序获取 A/B 两把锁 → 稳定挂起（在隔离的子进程里演示）
- 抓现场:   子进程内 faulthandler.dump_traceback_later(3) 自动 dump 两个互相等待的栈
- 修复:     统一锁序（永远先 A 后 B）后，带守护超时连跑 100 次全部正常退出

用法:
- python3 deadlock_workshop.py                  # 全流程，约 20 秒
- python3 deadlock_workshop.py --deadlock-child # 内部用：跑会死锁的演示进程

重要教训（第一版踩坑）: 死锁演示绝不能放在主进程里——挂死的线程是非 daemon，
整个脚本永远退不出去。正确姿势是子进程隔离 + 父进程超时击杀 + 事后验尸。
"""

import faulthandler
import multiprocessing
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

LOCK_A = threading.Lock()
LOCK_B = threading.Lock()


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def transfer_bad(order: str) -> None:
    """坏味道：两个调用方以相反顺序拿两把锁——经典死锁教材"""
    if order == "A-then-B":
        with LOCK_A:
            time.sleep(0.01)                # 放大窗口，让反序必然撞上
            with LOCK_B:
                pass                        # 模拟转账临界区
    else:
        with LOCK_B:
            time.sleep(0.01)
            with LOCK_A:
                pass


def transfer_good(order: str) -> None:
    """修复版：全局统一锁序——永远先 A 后 B，循环等待不复存在"""
    first, second = LOCK_A, LOCK_B          # 无论业务顺序如何，锁序恒定
    with first:
        time.sleep(0.001)
        with second:
            pass


# ============================================================
# 子进程模式：稳定死锁 + faulthandler 3 秒后 dump 现场到 stderr
# ============================================================

def deadlock_child() -> None:
    faulthandler.dump_traceback_later(3, file=sys.stderr)   # 3 秒后自动验尸
    with ThreadPoolExecutor(max_workers=2) as pool:
        f1 = pool.submit(transfer_bad, "A-then-B")
        f2 = pool.submit(transfer_bad, "B-then-A")
        f1.result()                          # 死锁：这里永远等不到
        f2.result()


# ============================================================
# 1+2. 复现死锁 + faulthandler 抓现场（父进程击杀子进程后验尸）
# ============================================================

def demo_deadlock_and_dump() -> None:
    section("1. 复现死锁，faulthandler 3 秒后抓现场")
    dump_path = "/tmp/_deadlock_dump.txt"
    p = subprocess.Popen(
        [sys.executable, __file__, "--deadlock-child"],
        stdout=subprocess.DEVNULL,
        stderr=open(dump_path, "w"),         # 子进程的 dump 落到文件
    )
    time.sleep(5)                            # 死锁成立（瞬时）+ dump 完成（3s）
    p.kill()                                 # 击杀——死锁进程本来就救不活
    p.wait()
    dump = open(dump_path).read()

    assert "Timeout (0:00:03)" in dump, "faulthandler 没有触发 dump"
    assert dump.count("transfer_bad") >= 2, f"应看到两个线程都卡在 transfer_bad"
    print("  子进程死锁成立，faulthandler 在 3 秒时 dump 了全部线程栈")
    print("  现场（两个线程都停在 transfer_bad 的锁等待上）：")
    shown = 0
    for line in dump.splitlines():
        if "transfer_bad" in line and shown < 2:
            print(f"    {line.strip()[:76]}")
            shown += 1
    print("  诊断结论：两个线程分别持有 A/B 并等待对方持有的锁 → 循环等待 → 死锁")
    print("  教训：死锁演示必须在子进程里做——挂死线程是非 daemon，主进程会被拖到永远退不出")


# ============================================================
# 3. 修复：统一锁序 + 守护超时，连跑 100 次
# ============================================================

def demo_fix() -> None:
    section("2. 修复：统一锁序，连跑 100 次无挂起")
    t0 = time.perf_counter()
    for i in range(100):
        with ThreadPoolExecutor(max_workers=2) as pool:
            f1 = pool.submit(transfer_good, "A-then-B")
            f2 = pool.submit(transfer_good, "B-then-A")   # 业务顺序不同也不怕
            f1.result(timeout=10)           # 守护超时：万一挂起，10s 内报错而非永久卡死
            f2.result(timeout=10)
    secs = time.perf_counter() - t0
    print(f"  100 轮全部正常退出（{secs:.1f}s）——统一锁序消灭循环等待")
    print("  锁排序法则：全局约定'永远先 A 后 B'，谁都不反转 → 死锁四条件的循环等待被拆除")
    print("  兜底三件套：acquire(timeout=) / 守护超时 / faulthandler 现场")


def main() -> None:
    if "--deadlock-child" in sys.argv:      # 子进程模式：只跑死锁演示
        deadlock_child()
        return
    print(f"Python {sys.version.split()[0]} · faulthandler={faulthandler.is_enabled()}")
    demo_deadlock_and_dump()
    demo_fix()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：死锁复现与验尸（§1）、100 轮锁序修复（§2）")


if __name__ == "__main__":
    main()
