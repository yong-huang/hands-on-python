"""
04 · 多线程生产者-消费者流水线 —— queue.Queue / 毒丸关闭 / maxsize 背压
并发清单项目 4：把"共享状态+锁"升级成消息传递，收尾用毒丸而不是碰运气

三种收尾方式的命运对比:
- 不收尾:      消费者永远阻塞在 q.get()，非 daemon 线程让整个进程退不出去
- task_done/join: 主线程知道"活干完了"，但不知道"谁来通知消费者下班" → 还是要毒丸
- 毒丸 sentinel: 每个消费者收到一枚专用毒丸，处理完手头活、干净退出

验收点（全部确定性断言）:
- 3 生产者 × 2 消费者处理 1000 条任务：处理总数 = 1000，计数 dict 证明每条恰好一次
- maxsize=10 的队列在快生产/慢消费下队列长度峰值恰为 10（背压生效）
- 毒丸发出后全部消费者 2 秒内退出

用法: python3 producer_consumer.py   # 三个场景 + 全部断言，约 4 秒
交互示意图: 用浏览器打开 images/producer_consumer.archify.html
"""

import queue
import sys
import threading
import time

N_PRODUCERS = 3
N_CONSUMERS = 2
N_TASKS = 1000
POISON = object()          # 毒丸：queue.Queue 里放一个谁也不会当成任务的哨兵
MAXSIZE = 10


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def produce(q: "queue.Queue", producer_idx: int, n_tasks: int) -> None:
    """生产者：把自己的编号织进任务 id，方便统计归属"""
    for i in range(n_tasks):
        q.put(f"p{producer_idx}-t{i}")


def consume(q: "queue.Queue", results: dict, counter_lock: threading.Lock) -> None:
    """消费者：循环取任务，直到取到毒丸为止"""
    while True:
        item = q.get()
        try:
            if item is POISON:
                return                      # 毒丸不含任务，直接下班
            with counter_lock:
                results[item] = results.get(item, 0) + 1
        finally:
            q.task_done()                   # 每取一件必须交一次回执（毒丸也要）


# ============================================================
# 1. 流水线正确性：无丢失、无重复 + 毒丸计时
# ============================================================

def demo_pipeline() -> None:
    section(f"1. 流水线：{N_PRODUCERS} 生产者 × {N_CONSUMERS} 消费者 × {N_TASKS} 条任务")
    q: "queue.Queue" = queue.Queue()
    results: dict = {}
    counter_lock = threading.Lock()

    consumers = [threading.Thread(target=consume, args=(q, results, counter_lock)) for _ in range(N_CONSUMERS)]
    for t in consumers:
        t.start()
    base, extra = divmod(N_TASKS, N_PRODUCERS)   # 余数分给第一个生产者，凑足整 1000
    counts = [base + extra] + [base] * (N_PRODUCERS - 1)
    assert sum(counts) == N_TASKS
    producers = [threading.Thread(target=produce, args=(q, i, n)) for i, n in enumerate(counts)]
    for t in producers:
        t.start()
    for t in producers:
        t.join()

    q.join()                                # 等 1000 个 task_done 全部交齐
    for _ in consumers:
        q.put(POISON)                       # 每人一枚毒丸，不多不少
    shutdown_start = time.perf_counter()
    for t in consumers:
        t.join()
    shutdown_secs = time.perf_counter() - shutdown_start

    assert len(results) == N_TASKS, f"应处理 {N_TASKS} 种任务，实际 {len(results)} 种"
    assert all(c == 1 for c in results.values()), f"存在重复处理: {[k for k, c in results.items() if c > 1][:5]}"
    assert shutdown_secs < 2.0, f"毒丸后 {shutdown_secs:.2f}s 才退出，太慢"
    per_producer = {p: sum(1 for k in results if k.startswith(p + "-")) for p in (f"p{i}" for i in range(N_PRODUCERS))}
    print(f"  处理总数 = {len(results)}，每条恰好一次（计数 dict 全为 1）")
    print(f"  各生产者归属: {per_producer}")
    print(f"  毒丸发出后 {shutdown_secs * 1000:.0f}ms 内全部消费者退出（< 2s）")
    print("  注意 q.join() 数的是 task_done 回执：毒丸也必须 task_done，否则 join 永不返回")


# ============================================================
# 2. maxsize 背压：队列满时生产者被按住，峰值恰为上限
# ============================================================

def demo_backpressure() -> None:
    section(f"2. 背压：maxsize={MAXSIZE}，快生产、慢消费（每件 {3}ms）")
    q: "queue.Queue" = queue.Queue(maxsize=MAXSIZE)
    results: dict = {}
    counter_lock = threading.Lock()
    qsize_samples: list[int] = []
    sampling = True

    def monitor() -> None:                 # 1ms 采样队列长度
        while sampling or not q.empty():
            qsize_samples.append(q.qsize())
            time.sleep(0.001)

    consumers = [threading.Thread(target=consume_slow, args=(q, results, counter_lock)) for _ in range(N_CONSUMERS)]
    base, extra = divmod(N_TASKS, N_PRODUCERS)
    counts = [base + extra] + [base] * (N_PRODUCERS - 1)
    producers = [threading.Thread(target=produce, args=(q, i, n)) for i, n in enumerate(counts)]
    mon = threading.Thread(target=monitor)
    for t in consumers + [mon]:
        t.start()
    time.sleep(0.05)                        # 等消费者先进入 get() 等待
    for t in producers:
        t.start()
    for t in producers:
        t.join()
    sampling = False
    mon.join(timeout=2)
    for _ in consumers:
        q.put(POISON)
    for t in consumers:
        t.join(timeout=5)

    peak = max(qsize_samples)
    assert peak == MAXSIZE, f"队列峰值应为 {MAXSIZE}（背压顶满），实测 {peak}"
    assert len(results) == N_TASKS and all(c == 1 for c in results.values()), "背压下出现丢失/重复"
    print(f"  采样 {len(qsize_samples)} 次，队列长度峰值 = {peak}（= maxsize，生产者被按在门外）")
    print(f"  背压下依然 {len(results)} 条全部恰好处理一次 —— 丢任务与背压无关，与无锁共享有关")


def consume_slow(q: "queue.Queue", results: dict, counter_lock: threading.Lock) -> None:
    """慢消费者：每件任务拖 3ms，制造生产快于消费的局面"""
    while True:
        item = q.get()
        try:
            if item is POISON:
                return
            time.sleep(0.003)
            with counter_lock:
                results[item] = results.get(item, 0) + 1
        finally:
            q.task_done()


# ============================================================
# 3. 反面教材：不发毒丸，消费者就永远等在 get() 上
# ============================================================

def demo_no_shutdown() -> None:
    section("3. 反面教材：不发毒丸，消费者就永远等在 get() 上")
    q: "queue.Queue" = queue.Queue()

    def consume_forever() -> None:
        while True:
            item = q.get()
            if item is POISON:
                return
            q.task_done()

    t = threading.Thread(target=consume_forever, daemon=True)   # daemon：进程至少能退出
    t.start()
    q.put("唯一任务")
    q.join()                                # 任务确实处理完了……
    time.sleep(0.1)
    assert t.is_alive(), "消费者竟然自己退出了？"
    print(f"  任务处理完、q.join() 也返回了，但消费者 {t.name} 还活着（阻塞在 get()）")
    print("  若它是非 daemon 线程，主进程退出时会被 threading._shutdown 无限等待")
    q.put(POISON)                           # 救援：一发毒丸让它体面下班
    t.join(timeout=5)
    assert not t.is_alive(), "毒丸都没能让消费者退出？"
    print("  一发毒丸让它干净退出 —— 收尾协议要从设计时就写进去，而不是等卡住了再补")


def main() -> None:
    print(f"Python {sys.version.split()[0]} · 默认 GIL 切换间隔 {sys.getswitchinterval() * 1000:.0f}ms")
    demo_pipeline()
    demo_backpressure()
    demo_no_shutdown()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：无丢失无重复（§1）、背压峰值=10（§2）、毒丸 2s 内退出（§1）")


if __name__ == "__main__":
    main()
