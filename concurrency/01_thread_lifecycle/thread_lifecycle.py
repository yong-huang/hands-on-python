"""
01 · 线程生命周期观察器 —— Thread / start / join / daemon / 交错执行
并发清单项目 1：会写线程程序，亲眼见到"交错不可预测"这件事

线程对象的四个阶段（对应 images/thread_lifecycle.archify.svg 状态机）:
- NEW:       Thread(...) 已创建但未 start()，is_alive() == False
- RUNNABLE:  start() 之后，is_alive() == True（是否真正在跑由 OS/GIL 决定）
- TERMINATED: run() 返回或抛异常后，is_alive() == False，join() 立即返回

三个最容易被追问的行为:
- t.run() 直接调用不会创建新线程——它只是普通方法调用，跑在调用者线程里
- join() 只是把"等它死"这个动作加到调用者身上，不 affect 线程本身
- daemon=True 的线程在主线程退出时被立即强杀——收尾代码可能根本没机会执行

用法:
- python3 thread_lifecycle.py           # 完整演示（5 个小节，含内置验收断言）
- python3 thread_lifecycle.py --daemon  # 只跑 daemon 截断演示（验收点 2）
"""

import argparse
import random
import sys
import threading
import time

# daemon 演示参数：20 条输出 × 0.05s 间隔 = 全部打完需要 ~1s
TOTAL_LINES = 20
LINE_INTERVAL = 0.05


def section(title: str) -> None:
    """打印小节标题"""
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. 线程家谱与状态迁移（NEW → RUNNABLE → TERMINATED）
# ============================================================

def demo_family_and_states() -> None:
    """观察线程对象从创建到死亡的全部状态，以及线程家谱"""
    section("1. 线程家谱与状态迁移")

    # 家谱：任何 Python 程序至少有一个线程——主线程
    main = threading.main_thread()
    assert main.name == "MainThread"
    assert threading.current_thread() is main
    print(f"主线程: {main.name}，当前就活着的线程: {[t.name for t in threading.enumerate()]}")

    worker = threading.Thread(target=time.sleep, args=(0.4,), name="worker-A")

    # 阶段 NEW：已创建，未 start
    assert not worker.is_alive()
    print(f"[NEW]       is_alive()={worker.is_alive()}   ← 创建了但还没 start()")

    worker.start()

    # 阶段 RUNNABLE：start() 之后，run() 结束之前
    assert worker.is_alive()
    alive_names = [t.name for t in threading.enumerate()]
    assert "worker-A" in alive_names, "存活的线程应出现在 enumerate() 里"
    print(f"[RUNNABLE]  is_alive()={worker.is_alive()}  enumerate() 里能看到它: {alive_names}")

    worker.join()

    # 阶段 TERMINATED：run() 已返回
    assert not worker.is_alive()
    assert "worker-A" not in [t.name for t in threading.enumerate()]
    print(f"[TERMINATED] is_alive()={worker.is_alive()}  join() 返回，enumerate() 里也消失了")

    # 附加证据：join() 之后再 join() 是合法的（线程已死，立即返回）
    worker.join(timeout=1.0)
    print("对已结束的线程重复 join() 合法且立即返回")


# ============================================================
# 2. start() vs run()：最常见的陷阱
# ============================================================

def demo_start_vs_run() -> None:
    """证明 t.run() 只是普通方法调用，不会创建新线程"""
    section("2. start() vs run()")

    seen: list[str] = []

    def note_caller() -> None:
        seen.append(threading.current_thread().name)

    # 直接调用 run()：代码确实执行了，但执行者是当前线程（主线程）！
    # 注意用独立的线程对象——手动 run() 会消耗掉 _target，之后再 start() 会直接炸
    t1 = threading.Thread(target=note_caller, name="never-born")
    t1.run()
    assert seen == ["MainThread"], f"run() 应跑在调用者线程里，实际: {seen}"
    print(f"t.run()          → 函数体执行了，但线程是 {seen[-1]}（没有新线程！）")

    # start() 才真正开线程，target 跑在新线程里
    t2 = threading.Thread(target=note_caller, name="born-by-start")
    t2.start()
    t2.join()
    assert seen[-1] == "born-by-start"
    print(f"t.start()        → 函数体跑在新线程 {seen[-1]} 里")

    # 再补一刀：start() 两次直接 RuntimeError
    try:
        t2.start()
    except RuntimeError as e:
        print(f"对已启动的线程再次 start() → RuntimeError: {e}")


# ============================================================
# 3. 交错执行观察（验收点 1：连跑 3 批，顺序至少 2 种排列）
# ============================================================

def run_batch(batch_id: int, n_workers: int = 4, ticks: int = 3) -> list[str]:
    """起一批线程，各自打 3 个 tick；用 list 记录真实完成顺序返回

    list.append 在 GIL 下是原子的，适合跨线程收集事件；
    每个 sleep 都带随机抖动，保证交错模式每次不同。
    """
    events: list[str] = []

    def worker(idx: int) -> None:
        for tick in range(ticks):
            time.sleep(0.01 + random.uniform(0, 0.03))  # 抖动制造真实交错
            events.append(f"W{idx}#t{tick}")

    threads = [threading.Thread(target=worker, args=(i,), name=f"W{i}") for i in range(n_workers)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    print(f"  批次 {batch_id}: {' '.join(events)}")
    return events


def demo_interleaving() -> None:
    """同一程序跑 3 批，事件顺序至少出现 2 种排列——线程调度不可预测"""
    section("3. 交错执行观察（4 线程 × 3 tick，共 3 批）")

    orders = [run_batch(i) for i in range(3)]
    distinct = {tuple(o) for o in orders}

    # 断言 1：3 批里至少 2 种不同排列 → 调度顺序不可复现
    assert len(distinct) >= 2, f"3 批顺序完全相同？不太可能，检查抖动逻辑: {orders}"

    # 断言 2（对照）：单个线程内部的 tick 永远有序——无序只发生在线程之间
    for order in orders:
        for idx in range(4):
            pos = [order.index(f"W{idx}#t{t}") for t in range(3)]
            assert pos == sorted(pos), f"W{idx} 自己的 tick 乱了: {pos}"

    print(f"\n  3 批出现了 {len(distinct)} 种不同的排列 → 线程间顺序不可预测")
    print("  但每个线程自己内部的 t0→t1→t2 永远有序 → 无序只发生在线程之间")


# ============================================================
# 4. join 的意义 + daemon 对照（验收点 2 的对照组）
# ============================================================

def chatty_worker(counter: list[int], prefix: str) -> None:
    """打 20 条消息，每条间隔 0.05s，计数器记录实际打印条数"""
    for i in range(1, TOTAL_LINES + 1):
        time.sleep(LINE_INTERVAL)
        print(f"  {prefix} 输出 #{i:>2}/{TOTAL_LINES}")
        counter.append(i)


def demo_join_and_daemon() -> None:
    """join 等到全部输出；同样代码换成 daemon，主线程一走它就被掐断"""
    section("4. join vs daemon（同样 20 条输出，两种命运）")

    # 对照组：普通线程 + join() → 20 条全部打完
    counter_a: list[int] = []
    ta = threading.Thread(target=chatty_worker, args=(counter_a, "普通+join"), name="ordinary")
    ta.start()
    ta.join()
    assert len(counter_a) == TOTAL_LINES, f"join 后应打满 {TOTAL_LINES} 条，实际 {len(counter_a)}"
    print(f"  → join() 返回，{len(counter_a)}/{TOTAL_LINES} 条一条不少\n")

    # 实验组：daemon 线程，主线程不等它
    counter_b: list[int] = []
    tb = threading.Thread(target=chatty_worker, args=(counter_b, "daemon    "), name="daemon-t", daemon=True)
    tb.start()
    time.sleep(0.3)  # 只给它 0.3s（约 6 条的时间）
    assert 0 < len(counter_b) < TOTAL_LINES, f"daemon 应被截断，实际已打印 {len(counter_b)} 条"
    print(f"\n  主线程只等了 0.3s，daemon 才输出 {len(counter_b)}/{TOTAL_LINES} 条")
    print("  主线程马上退出 → daemon 剩余输出被直接丢弃（看本行之后没有任何 daemon 输出）")


def daemon_only_demo() -> None:
    """--daemon 模式：本脚本只演示"主线程退出 → daemon 被截断"

    daemon 线程计划打 20 条（需 ~1s），主线程 0.3s 后退出；
    进程随之结束，daemon 的剩余输出永远不会再出现。
    """
    section("daemon 截断演示（--daemon 模式）")

    counter: list[int] = []
    t = threading.Thread(target=chatty_worker, args=(counter, "daemon"), name="daemon-t", daemon=True)
    t.start()
    print("  主线程：睡 0.3s 后退出，不 join\n")
    time.sleep(0.3)
    assert 0 < len(counter) < TOTAL_LINES, f"daemon 应被截断，实际 {len(counter)} 条"
    print(f"\n  主线程退出！daemon 只来得及打 {len(counter)}/{TOTAL_LINES} 条，剩余输出被丢弃")
    print("  （验证：本行之后不会有任何 daemon 输出；exit code = 0）")


def main() -> None:
    parser = argparse.ArgumentParser(description="线程生命周期观察器")
    parser.add_argument("--daemon", action="store_true", help="只跑 daemon 截断演示")
    args = parser.parse_args()

    print(f"Python {sys.version.split()[0]} · 主线程 {threading.main_thread().name}")

    if args.daemon:
        daemon_only_demo()
        return  # main 线程到此结束 → 进程退出 → daemon 被强杀

    demo_family_and_states()
    demo_start_vs_run()
    demo_interleaving()
    demo_join_and_daemon()

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  两个验收点：交错多排列（§3）、daemon 被截断（§4/末尾）")


if __name__ == "__main__":
    main()
