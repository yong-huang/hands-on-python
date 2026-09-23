"""
07 · concurrent.futures 统一执行器 —— Future 一等公民，线程/进程一键切换
并发清单项目 7：Executor 是 threading 与 multiprocessing 之上的统一抽象

三个实测点（全部可断言）:
- 统一接口:   同一任务函数，executor 工厂一键切线程/进程，两边结果完全一致
- as_completed: 谁先完成谁先出（按完成顺序收集，而非提交顺序）
- 异常传播:   worker 里抛的异常在 future.result() 处原样重现，连类型和消息都不变
- 附加:       result(timeout=) 超时保护——future 可以"暂时不 etc"

用法: python3 futures_executor.py   # 全部实测 + 断言，约 5 秒
"""

import sys
import time
from concurrent.futures import (ProcessPoolExecutor, ThreadPoolExecutor,
                                as_completed, wait, FIRST_COMPLETED)


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def square(n: int) -> int:
    return n * n


def sleepy(tag: str, secs: float) -> str:
    time.sleep(secs)
    return f"{tag}:{secs}"


def boom() -> None:
    raise ValueError("worker 里爆炸了")


# ============================================================
# 1. 统一接口：executor 工厂一键切换（验收点 1）
# ============================================================

def run_batch(make_executor, n: int) -> list:
    """提交 n 个 square 任务，收集全部结果——调用方不关心后端是什么"""
    with make_executor() as ex:
        futures = [ex.submit(square, i) for i in range(n)]
        return [f.result() for f in futures]


def demo_unified() -> None:
    section("1. 统一接口：同一份代码，线程/进程一键切换")
    factories = {
        "ThreadPoolExecutor": lambda: ThreadPoolExecutor(max_workers=4),
        "ProcessPoolExecutor": lambda: ProcessPoolExecutor(max_workers=4),
    }
    results = {}
    for name, factory in factories.items():
        t0 = time.perf_counter()
        results[name] = run_batch(factory, 50)
        print(f"  {name:<22} 50 个任务完成，耗时 {time.perf_counter() - t0:.3f}s")
    assert results["ThreadPoolExecutor"] == results["ProcessPoolExecutor"] == [i * i for i in range(50)]
    print("  两种后端结果完全一致（50 个平方数逐项相等）——submit/result 接口与后端解耦")


# ============================================================
# 2. as_completed：按完成顺序收集（验收点 2）
# ============================================================

def demo_as_completed() -> None:
    section("2. as_completed：谁先完成谁先出")
    jobs = [("慢任务", 0.3), ("中任务", 0.2), ("快任务", 0.1)]
    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = {ex.submit(sleepy, tag, s): tag for tag, s in jobs}
        done_order = [f.result() for f in as_completed(futures)]
    assert done_order == ["快任务:0.1", "中任务:0.2", "慢任务:0.3"], f"完成顺序异常: {done_order}"
    print(f"  提交顺序: {[tag for tag, _ in jobs]}（最慢的先提交）")
    print(f"  完成顺序: {done_order}")
    print("  对照 wait(FIRST_COMPLETED)：也以'完成'为事件单位")
    with ThreadPoolExecutor(max_workers=3) as ex:
        fs = [ex.submit(sleepy, f"j{i}", s) for i, s in enumerate([0.3, 0.1])]
        done, not_done = wait(fs, return_when=FIRST_COMPLETED)
        assert len(done) == 1 and list(done)[0].result() == "j1:0.1"
        print(f"  FIRST_COMPLETED 先返回 1 个（{list(done)[0].result()}），其余 {len(not_done)} 个继续跑")


# ============================================================
# 3. 异常传播：worker 炸了，future 在 result() 处还给你
# ============================================================

def demo_exception() -> None:
    section("3. 异常传播：类型和消息原样重现")
    with ThreadPoolExecutor() as ex:
        f = ex.submit(boom)
        try:
            f.result()
            raise AssertionError("应该抛 ValueError")
        except ValueError as e:
            assert str(e) == "worker 里爆炸了"
            print(f"  线程池: {e!r} 在 result() 处重现")
    with ProcessPoolExecutor() as ex:
        f = ex.submit(boom)
        try:
            f.result()
            raise AssertionError("应该抛 ValueError")
        except ValueError as e:
            assert str(e) == "worker 里爆炸了"
            print(f"  进程池: {e!r} 跨进程 pickle 传回，同样重现")
    print("  关键差异：不调 result() 异常就被吞——future 是异常的载体，也是唯一的出口")


# ============================================================
# 4. result(timeout=)：future 的超时保护
# ============================================================

def demo_timeout() -> None:
    section("4. result(timeout=)：卡住的任务能被'暂时放弃'")
    with ThreadPoolExecutor() as ex:
        f = ex.submit(time.sleep, 2)
        t0 = time.perf_counter()
        try:
            f.result(timeout=0.2)
            raise AssertionError("应该抛 TimeoutError")
        except TimeoutError:
            waited = time.perf_counter() - t0
        assert 0.15 < waited < 1.0, f"超时未按预期生效: {waited:.2f}s"
        print(f"  result(timeout=0.2) 在 {waited * 1000:.0f}ms 抛 TimeoutError（任务本身还要跑很久）")
        print("  注意：超时只是调用者不等了，任务线程仍在跑——取消要靠 cancel()（未启动才有效）")


def main() -> None:
    print(f"Python {sys.version.split()[0]}")
    demo_unified()
    demo_as_completed()
    demo_exception()
    demo_timeout()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：双后端一致（§1）、as_completed 乱序（§2）、异常原样重现（§3）")


if __name__ == "__main__":
    main()
