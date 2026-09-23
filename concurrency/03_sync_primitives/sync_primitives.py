"""
03 · 同步原语工具箱 —— Lock / RLock / Semaphore / Event / Condition / Barrier
并发清单项目 3：六种原语各就各位，把项目 2 的两个竞态全部修掉

每个场景都是「原语 + 最小演示 + 确定性断言」:
- Lock:       互斥。with lock: 包住读-改-写，修复项目 2 的丢失更新（10 跑恒等）
- RLock:      可重入。同一线程可以再次拿同一把锁，递归函数不再自锁
- Semaphore:  限流。并发峰值被钳在许可数以内
- Event:      一次性广播开关。set() 唤醒所有等待者
- Condition:  条件等待。等「队列非空」这类谓词成立，notify 精准叫醒
- Barrier:    集结点。全员到齐才放行（项目 2 §3 用它复现竞态，这里用它守序）

用法: python3 sync_primitives.py   # 六个场景 + 全部断言，约 8 秒
"""

import sys
import threading
import time

N_THREADS = 100
N_INCREMENTS = 10_000
EXPECTED = N_THREADS * N_INCREMENTS


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. Lock：互斥修复丢失更新（验收点 1：10 跑全部恒等）
# ============================================================

counter = 0
counter_lock = threading.Lock()


def _audit() -> None:
    """项目 2 的竞态形状：读-改-写之间隔着一个调用（写日志/查缓存）"""


def _locked_increment(n: int) -> None:
    global counter
    for _ in range(n):
        with counter_lock:      # with 惯用法：异常也会自动放锁
            tmp = counter
            _audit()
            counter = tmp + 1


def demo_lock() -> None:
    global counter
    section(f"1. Lock：同一个竞态形状 + with lock，{N_THREADS} 线程 × {N_INCREMENTS:,} 次")
    results = []
    for run in range(1, 11):
        counter = 0
        threads = [threading.Thread(target=_locked_increment, args=(N_INCREMENTS,)) for _ in range(N_THREADS)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        results.append(counter)
    assert all(v == EXPECTED for v in results), f"加锁后仍丢失: {results}"
    print(f"  10 轮结果: {results[0]:,}（10 轮全部 = {EXPECTED:,}，一次不丢）")
    print("  对照项目 2 实验组丢失 72~83% —— 锁把读-改-写变成原子区，竞态从物理上不可能")


# ============================================================
# 2. RLock：可重入锁，递归调用不再自己等自己
# ============================================================

def demo_rlock() -> None:
    section("2. RLock：同一线程再次拿锁")
    plain = threading.Lock()
    rlock = threading.RLock()

    def inner(lock, depth: int) -> str:
        with lock:
            return f"inner-{depth} 执行成功"

    def outer(lock, depth: int) -> str:
        with lock:
            return inner(lock, depth + 1)   # 同一线程再拿一次同一把锁

    # 普通 Lock：嵌套再入 = 自己等自己。放进 daemon 线程里真跑，1 秒后它仍出不来
    victim = threading.Thread(target=outer, args=(plain, 0), daemon=True)
    victim.start()
    victim.join(timeout=1.0)
    assert victim.is_alive(), "普通 Lock 嵌套竟没死锁？"
    print("  普通 Lock:  嵌套 acquire → 1 秒后仍卡在原地（自锁）")
    print("             daemon=True 才敢这么演示——非 daemon 线程会让整个进程退不出去")

    assert outer(rlock, 0) == "inner-1 执行成功"
    print("  RLock:      同一线程再 acquire → 直接通过（inner 正常执行）")
    print("  分界：Lock 一次一票；RLock 记得'这是我自己'，进出要配对")


# ============================================================
# 3. Semaphore：并发限流（验收点 2：峰值 ≤ 许可数）
# ============================================================

def demo_semaphore() -> None:
    section("3. Semaphore(3)：20 个任务，同时在飞的最多 3 个")
    sem = threading.Semaphore(3)
    active = 0
    active_lock = threading.Lock()
    peak = 0

    def task(idx: int) -> None:
        nonlocal active, peak
        with sem:                       # 拿不到许可就在门外等
            with active_lock:
                active += 1
                if active > peak:
                    peak = active
            time.sleep(0.05)            # 模拟受限资源的工作
            with active_lock:
                active -= 1

    threads = [threading.Thread(target=task, args=(i,)) for i in range(20)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert 1 <= peak <= 3, f"并发峰值应为 1~3，实测 {peak}"
    print(f"  20 个任务全部完成，采样到并发峰值 = {peak}（≤ 许可数 3）")
    print("  用途：连接池、限速爬虫、最多 N 个并发下载——GIL 管不了它们，Semaphore 管")


# ============================================================
# 4. Event：一次性广播开关
# ============================================================

def demo_event() -> None:
    section("4. Event：set() 之前全员等待，set() 之后全员放行")
    event = threading.Event()
    proceed_times = []

    def waiter(idx: int) -> None:
        event.wait(timeout=5)               # 开关没开就在这等着
        proceed_times.append((idx, time.perf_counter()))

    t0 = time.perf_counter()
    threads = [threading.Thread(target=waiter, args=(i,)) for i in range(5)]
    for t in threads:
        t.start()
    time.sleep(0.15)                        # 留出时间让全员进入等待
    set_time = time.perf_counter()
    event.set()                             # 一次 set，广播所有人
    for t in threads:
        t.join(timeout=5)

    assert len(proceed_times) == 5, f"应有 5 个等待者放行，实际 {len(proceed_times)}"
    assert all(ts >= set_time for _, ts in proceed_times), "有人在 set() 之前就跑了"
    assert max(ts for _, ts in proceed_times) - set_time < 0.5, "set() 后应迅速放行"
    print(f"  5 个等待者全部在 set() 之后 ~{(max(ts for _, ts in proceed_times) - set_time) * 1000:.0f}ms 内放行")
    print("  语义：一次性广播（set 后 is_set 恒真，clear 才能复用）；适合'配置就绪/停止信号'")


# ============================================================
# 5. Condition：条件等待，生产者通知消费者
# ============================================================

def demo_condition() -> None:
    section("5. Condition：消费者等'队列非空'，生产者 notify 叫醒")
    cond = threading.Condition()
    items: list[str] = []
    consumed: list[str] = []
    produce_times: list[float] = []
    first_consume_time = []

    def producer() -> None:
        for i in range(5):
            time.sleep(0.03)
            with cond:
                items.append(f"item-{i}")
                produce_times.append(time.perf_counter())
                cond.notify_all()           # 谓词可能变化了，叫醒等待者重新检查

    def consumer() -> None:
        while True:
            with cond:
                while not items:            # 惯用法：谓词循环，防空唤醒
                    cond.wait(timeout=5)
                if items[-1] == "item-4":   # 最后一件到手就收工
                    while items:
                        if not first_consume_time:
                            first_consume_time.append(time.perf_counter())
                        consumed.append(items.pop(0))
                    cond.notify_all()
                    return
                while items:
                    if not first_consume_time:
                        first_consume_time.append(time.perf_counter())
                    consumed.append(items.pop(0))

    pt = threading.Thread(target=producer)
    ct = threading.Thread(target=consumer)
    ct.start()
    pt.start()
    pt.join()
    ct.join(timeout=5)

    assert consumed == [f"item-{i}" for i in range(5)], f"消费序列错误: {consumed}"
    assert first_consume_time and first_consume_time[0] >= produce_times[0], "消费先于生产？"
    print(f"  消费者按生产顺序收齐 5 件: {consumed}")
    print("  与 Event 的分工：Event 是'发生了'，Condition 是'谓词成立了'——带状态、可重查")


# ============================================================
# 6. Barrier：集结点，全员到齐才放行
# ============================================================

def demo_barrier() -> None:
    section("6. Barrier(6)：分批到达，全员集结后同时出发")
    barrier = threading.Barrier(6)
    arrive_times: dict[int, float] = {}
    go_times: dict[int, float] = {}
    arrive_lock = threading.Lock()

    def runner(idx: int) -> None:
        time.sleep(0.02 * idx)              # 故意错开到达时间
        with arrive_lock:
            arrive_times[idx] = time.perf_counter()
        barrier.wait(timeout=5)             # 没到齐就原地待命
        go_times[idx] = time.perf_counter()

    threads = [threading.Thread(target=runner, args=(i,)) for i in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=5)

    last_arrival = max(arrive_times.values())
    assert len(go_times) == 6, f"应有 6 人全部放行，实际 {len(go_times)}"
    assert all(t >= last_arrival for t in go_times.values()), "有人在最晚者到达前就被放行了"
    print(f"  到达时间跨度 {(last_arrival - min(arrive_times.values())) * 1000:.0f}ms，"
          f"放行时刻全部 ≥ 最晚到达（差值 ≤ {(max(go_times.values()) - last_arrival) * 1000:.1f}ms）")
    print("  与项目 2 §3 的呼应：同一道 Barrier，那边用来定格最坏交错，这边用来守序集结")


def main() -> None:
    print(f"Python {sys.version.split()[0]} · 默认 GIL 切换间隔 {sys.getswitchinterval() * 1000:.0f}ms")
    demo_lock()
    demo_rlock()
    demo_semaphore()
    demo_event()
    demo_condition()
    demo_barrier()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：加锁 10 跑恒等（§1）、限流峰值 ≤3（§3）、三原语守序（§4/5/6）")


if __name__ == "__main__":
    main()
