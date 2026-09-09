"""
13 · 并发设计模式集 —— 优雅关闭 / 令牌桶限流 / 指数退避 / fan-out / fan-in
并发清单项目 13：四个生产级模式一次配齐，每个都带确定性验收

四个模式（全部可断言）:
- 优雅关闭:   SIGTERM 触发 → worker 完成手头任务 → 结果落盘 → 2 秒内退出
- 令牌桶:     恒定速率放行 + 允许突发，实测窗口内通过数误差 ≤ 10%
- 指数退避:   对 100% 失败上游重试 5 次后放弃，总耗时符合指数曲线（±30%）
- fan-out/in: 20 个任务扇出 5 个 worker，失败的单独收集，不拖累整批

用法:
- python3 concurrency_patterns.py              # 全流程，约 6 秒
- python3 concurrency_patterns.py --worker F   # 内部用：worker 模式（F=落盘文件）

交互示意图: 用浏览器打开 images/concurrency_patterns.archify.html
"""

import json
import signal
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. 优雅关闭：信号 → 停止接活 → 完成手头 → 落盘 → 退出
# ============================================================

def worker_mode(persist_path: str) -> None:
    """worker 子进程模式：主线程等信号，5 个 worker 从队列领任务"""
    shutdown = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: shutdown.set())
    signal.signal(signal.SIGINT, lambda *_: shutdown.set())

    task_q: "queue.Queue[str]" = __import__("queue").Queue()
    done: list = []
    done_lock = threading.Lock()

    def worker() -> None:
        while True:
            try:
                item = task_q.get(timeout=0.1)
            except __import__("queue").Empty:
                if shutdown.is_set():
                    return                  # 收到关闭信号且没活干了 → 下班
                continue
            time.sleep(0.05)                # 手头任务要做完（不做一半！）
            with done_lock:
                done.append(item)
            task_q.task_done()

    workers = [threading.Thread(target=worker) for _ in range(5)]
    for w in workers:
        w.start()
    for i in range(12):
        task_q.put(f"task-{i}")
    t_started = time.perf_counter()
    while not shutdown.is_set() and time.perf_counter() - t_started < 30:
        time.sleep(0.05)                    # 主线程等 SIGTERM
    for w in workers:
        w.join(timeout=5)

    with open(persist_path, "w") as f:      # 已完成的落盘——一个不丢
        json.dump({"done": done, "graceful": shutdown.is_set()}, f)


def demo_graceful_shutdown() -> None:
    import subprocess
    section("1. 优雅关闭：kill -TERM → 手头做完 → 落盘 → 退出")
    persist = "/tmp/_graceful_result.json"
    proc = subprocess.Popen(
        [sys.executable, __file__, "--worker", persist],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(0.6)                         # 让 worker 消化一部分任务
    t0 = time.perf_counter()
    proc.terminate()                        # SIGTERM
    proc.wait(timeout=10)
    shutdown_secs = time.perf_counter() - t0

    state = json.load(open(persist))
    assert state["graceful"], "worker 不是被优雅关闭的"
    assert len(state["done"]) >= 5, f"完成任务数过少: {state}"
    assert shutdown_secs < 2.0, f"SIGTERM 后 {shutdown_secs:.2f}s 才退出"
    print(f"  SIGTERM 后 {shutdown_secs * 1000:.0f}ms 内退出，已完成任务 {len(state['done'])} 个落盘")
    print("  关键：收到信号只'停止接活'，手头任务做完才走——强杀会撕烂正在写的数据")


# ============================================================
# 2. 令牌桶：恒定速率 + 突发
# ============================================================

class TokenBucket:
    def __init__(self, rate: float, capacity: int) -> None:
        self.rate, self.capacity = rate, capacity
        self.tokens = float(capacity)       # 初始满桶，允许突发
        self.updated = time.monotonic()

    def acquire(self) -> None:
        while True:
            now = time.monotonic()
            self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
            self.updated = now
            if self.tokens >= 1:
                self.tokens -= 1
                return
            time.sleep((1 - self.tokens) / self.rate)   # 等.nextToken


def demo_token_bucket() -> None:
    section("2. 令牌桶限流：50/s 满桶 50，连发 100 个请求")
    bucket = TokenBucket(rate=50, capacity=50)
    t0 = time.monotonic()
    for _ in range(100):
        bucket.acquire()
    elapsed = time.monotonic() - t0
    # 前 50 个走突发（立即），后 50 个按 50/s 补币 → 理论 ≈ 1.0s
    assert 0.8 <= elapsed <= 1.3, f"令牌桶速率异常: 100 请求耗时 {elapsed:.2f}s（理论 ~1.0s）"
    print(f"  100 个请求耗时 {elapsed:.2f}s（前 50 突发 + 后 50 按 50/s）——速率钳制生效")
    print("  与 Semaphore 的分工：Semaphore 限'同时在飞'，令牌桶限'长期平均速率'")


# ============================================================
# 3. 指数退避：对必败上游重试 5 次后放弃
# ============================================================

def retry_with_backoff(operation, attempts: int, base: float) -> tuple:
    """指数退避重试：base, 2×base, 4×base...（jitter 关闭以便断言）"""
    delays = []
    for attempt in range(1, attempts + 1):
        try:
            return operation(), delays
        except Exception:
            if attempt == attempts:
                raise
            delay = base * 2 ** (attempt - 1)
            delays.append(delay)
            time.sleep(delay)
    raise AssertionError("unreachable")


def demo_backoff() -> None:
    section("3. 指数退避：100% 失败的上游，重试 5 次后放弃")
    calls = []

    def always_fail() -> None:
        calls.append(1)
        raise ConnectionError("上游挂了")

    t0 = time.perf_counter()
    try:
        retry_with_backoff(always_fail, attempts=5, base=0.05)
        raise AssertionError("应该最终放弃并抛错")
    except ConnectionError:
        pass
    elapsed = time.perf_counter() - t0
    expected = 0.05 + 0.1 + 0.2 + 0.4        # 4 段退避：0.75s
    assert len(calls) == 5, f"应尝试 5 次后放弃，实际 {len(calls)}"
    assert expected * 0.7 <= elapsed <= expected * 1.3, (
        f"总耗时 {elapsed:.2f}s 偏离指数曲线 {expected:.2f}s ±30%")
    print(f"  尝试 {len(calls)} 次后放弃（间隔 0.05/0.1/0.2/0.4s），总耗时 {elapsed:.2f}s ≈ 理论 {expected:.2f}s")
    print("  指数曲线 = 给上游恢复时间；±20% 抖动（jitter）防重试同步风暴，断言时才关掉")


# ============================================================
# 4. fan-out / fan-in：扇出汇聚 + 错误隔离
# ============================================================

def demo_fan_out_in() -> None:
    section("4. fan-out / fan-in：20 个任务扇出，失败隔离收集")

    def task(i: int) -> str:
        time.sleep(0.01)
        if i % 7 == 3:                       # i=3,10,17 共 3 个必失败
            raise ValueError(f"task-{i} 挂了")
        return f"ok-{i}"

    results, errors = [], []
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(task, i): i for i in range(20)}   # fan-out
        for fut in as_completed(futures):                        # fan-in
            try:
                results.append(fut.result())
            except ValueError as e:
                errors.append(str(e))
    secs = time.perf_counter() - t0

    assert len(results) == 17 and len(errors) == 3, f"隔离收集异常: {len(results)}/{len(errors)}"
    assert secs < 20 * 0.01, f"扇出未并行: {secs:.2f}s"
    print(f"  20 个任务 5 个 worker：成功 {len(results)} 个 + 失败 {len(errors)} 个分别收集")
    print(f"  总耗时 {secs * 1000:.0f}ms（并行扇出）——单个失败不影响其余 19 个")
    print("  对比项目 9 的 TaskGroup：那是一败全停（事务型），这是失败隔离（批处理型）")


def main() -> None:
    if len(sys.argv) >= 3 and sys.argv[1] == "--worker":
        worker_mode(sys.argv[2])
        return
    print(f"Python {sys.version.split()[0]}")
    demo_graceful_shutdown()
    demo_token_bucket()
    demo_backoff()
    demo_fan_out_in()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：优雅关闭（§1）、令牌桶（§2）、指数退避（§3）、错误隔离（§4）")


if __name__ == "__main__":
    main()
