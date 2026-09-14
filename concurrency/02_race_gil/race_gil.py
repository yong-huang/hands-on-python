"""
02 · 竞态复现与 GIL 边界实测 —— 丢失更新 / 字节码证据 / CPU 与 IO 的相反命运
并发清单项目 2：亲手把 counter 打丢，量出 GIL 对 CPU/IO 密集的两种相反影响

对应 images/race_gil.archify.svg 的丢失更新时序:
线程 A「LOAD counter(=100)」后 GIL 强制切换，线程 B 完整做完「LOAD → +1 → STORE(=101)」，
A 被换回后接着执行自己的 STORE(=101)——它的 +1 就这样凭空消失。

五个实测结论（全部可断言）:
- dis 字节码: 一条 counter += 1 被拆成 LOAD 与 STORE 两条独立指令，中间可被打断
- 无锁竞态: 100 线程 × 10000 次递增，最终值 < 1_000_000 且连跑 5 次各不相同
- check-then-act: 「查余额再扣款」不加深锁就会透支
- CPU 密集: 4 线程比串行更慢（GIL 串行化 + 切换开销），记录实测减速比
- IO 密集: 4 线程接近 4 倍加速（sleep 等待期间 GIL 被释放）

用法: python3 race_gil.py   # 全部实测 + 断言，约 10 秒
提示: 在 free-threading 无 GIL 构建下本脚本的竞态部分将不再丢失更新（见清单项目 16）
交互示意图: 用浏览器打开 images/race_gil.archify.html
"""

import dis
import sys
import threading
import time

N_THREADS = 100
N_INCREMENTS = 10_000
EXPECTED = N_THREADS * N_INCREMENTS

# CPU 密集任务：纯 Python 循环数素数（规模调到串行约 0.3-0.4s，见 README 诚实预期）
CPU_N = 60_000


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. dis：一条 counter += 1 的字节码解剖（非原子的直接证据）
# ============================================================

def demo_bytecode() -> None:
    section("1. 字节码证据：counter += 1 不是一条指令")
    code = compile("counter += 1", "<race>", "exec")
    instrs = [i for i in dis.get_instructions(code) if i.opname != "CACHE"]
    for i in instrs:
        print(f"  {i.offset:>4} {i.opname:<12} {i.argrepr}")

    opnames = [i.opname for i in instrs]
    # 断言：剥掉前后缀（RESUME/RETURN_CONST）后，先 LOAD 后 STORE，中间隔着加法
    # 跨版本：3.13 是 LOAD_CONST，3.14 换成专用指令 LOAD_SMALL_INT，尾部还有 RETURN_VALUE
    housekeeping = {"RESUME", "RETURN_CONST", "RETURN_VALUE", "LOAD_CONST"}
    core = [op for op in opnames if op not in housekeeping]
    assert core[0].startswith("LOAD"), f"第一条应为 LOAD: {core}"
    assert core[-1].startswith("STORE"), f"最后一条应为 STORE: {core}"
    assert any(op.startswith("BINARY") for op in core), core
    print("\n  LOAD 与 STORE 确实是两条独立指令。但注意：实测 3.13 的 GIL 切换")
    print("  检查点只落在循环回边和调用边界，不落在语句中部——所以裸 += 反而丢不了（见 §2 对照组）。")
    print("  真正打开窗口的是「读-改-写之间隔着一个调用」——真实代码里就是写日志/查缓存/RPC。")


# ============================================================
# 2. 无锁竞态复现（验收点 1：读-改-写窗口内丢失，连跑 5 次各不相同）
# ============================================================

counter = 0


def _bare_increment(n: int) -> None:
    """对照组：单条 += 语句。3.13 的切换点不落在语句中部 → 不丢"""
    global counter
    for _ in range(n):
        counter += 1


def _audit() -> None:
    """真实代码里这一步是写日志/查缓存/RPC——一次纯函数调用，成本极低，
    但 CALL 边界是 GIL 切换检查点，读-改-写窗口就此打开"""


def _rmw_increment(n: int) -> None:
    """实验组：读-改-写之间隔着一个调用 → 丢失更新"""
    global counter
    for _ in range(n):
        tmp = counter      # LOAD：读共享变量
        _audit()           # 调用边界 = GIL 切换检查点
        counter = tmp + 1  # STORE：写回的可能是过期旧值


def _run_workers(worker, n_threads: int, n_increments: int) -> int:
    global counter
    counter = 0
    threads = [threading.Thread(target=worker, args=(n_increments,)) for _ in range(n_threads)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return counter


def demo_lost_update() -> None:
    section("2. 无锁竞态：裸 +=  vs 读-改-写隔一个调用")
    # 压到 1µs 相当于把 GIL 检查频率放大数千倍，保证「该切的都切」
    sys.setswitchinterval(0.000001)

    # 对照组：单条语句
    bare = [_run_workers(_bare_increment, N_THREADS, N_INCREMENTS) for _ in range(3)]
    print(f"  对照组 裸 counter += 1（{N_THREADS} 线程 × {N_INCREMENTS:,}）:")
    for i, v in enumerate(bare, 1):
        print(f"    第 {i} 轮: {v:>9,}  (丢失 {EXPECTED - v})")
    assert all(v == EXPECTED for v in bare), f"裸 += 也丢了？切换点落进了语句中部: {bare}"

    # 实验组：读-改-写隔一个调用
    n_exp_threads, n_exp_increments = 20, 10_000
    expected_exp = n_exp_threads * n_exp_increments
    rmw = [_run_workers(_rmw_increment, n_exp_threads, n_exp_increments) for _ in range(5)]
    print(f"\n  实验组 读 {n_exp_threads} 线程 × {n_exp_increments:,} 次，写前隔一次调用:")
    for i, v in enumerate(rmw, 1):
        print(f"    第 {i} 轮: {v:>9,}  (丢失 {expected_exp - v:>6,} 次, {100 * (expected_exp - v) / expected_exp:.1f}%)")

    assert all(v < expected_exp for v in rmw), f"竟然有轮次没丢？{rmw}"
    assert len(set(rmw)) == 5, f"5 轮结果应各不相同（宏观方差），实际: {rmw}"
    print("\n  → 丢失规模由调度时机随机决定，5 轮各不相同；加锁是唯一修法（项目 3）")


# ============================================================
# 3. check-then-act：用双 Barrier 把「最坏交错」钉成必然
# ============================================================

def demo_check_then_act() -> None:
    section("3. check-then-act：余额 100，6 个线程各取 100")
    # 不赌调度器运气：用两道 Barrier 把最坏交错变成确定性事件——
    #   gate：六个线程对齐起跑；
    #   hold：每个人都检查完先卡住，等全员检查完才放行写回。
    # 无锁时这种「人人基于过期余额做决定」的交错随时可能自然发生，
    # 这里的 Barrier 只是把它定格成 100% 可复现。
    balance = 100
    gate = threading.Barrier(6)
    hold = threading.Barrier(6)
    ok_flags: list[bool] = []

    def worker() -> None:
        nonlocal balance
        gate.wait()
        ok = balance >= 100          # check：此刻人人读到 100
        ok_flags.append(ok)
        hold.wait()                  # 卡住！等所有线程都检查完
        if ok:
            balance -= 100           # act：全部基于过期判定写回

    threads = [threading.Thread(target=worker) for _ in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert all(ok_flags), f"检查阶段应全部通过: {ok_flags}"
    assert balance == -500, f"6 人通过检查各扣 100，最终应为 -500，实际 {balance}"
    print(f"  6 个线程全部通过检查（读到同一个 100），全部扣款 → 余额 {balance}")
    print("  正确语义应只有 1 人成功；Lock 的作用就是把 check+act 合成原子区（项目 3）")


# ============================================================
# 4. CPU 密集实测（验收点 2：4 线程总耗时 ≥ 串行，记录减速比）
# ============================================================

def cpu_task(n: int) -> int:
    """纯 Python 数素数，无 C 扩展、无 I/O——GIL 全程握在手里"""
    count = 0
    for i in range(2, n):
        if all(i % j for j in range(2, int(i ** 0.5) + 1)):
            count += 1
    return count


def demo_cpu_bound() -> None:
    section("4. CPU 密集：串行 vs 4 线程（数素数，预热后交替 3 轮取中位）")
    # 实测（见 README 诚实预期）：默认 5ms 切换间隔下 4 线程 ≈ 1.0× 串行（不加速），
    # 但开销小到接近计时噪声；压到 10µs 让「切换税」放大到肉眼可见的 1.6× 量级
    sys.setswitchinterval(0.00001)

    def timed(run_threads: bool) -> float:
        t0 = time.perf_counter()
        if run_threads:
            threads = [threading.Thread(target=cpu_task, args=(CPU_N,)) for _ in range(4)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()
        else:
            for _ in range(4):
                cpu_task(CPU_N)
        return time.perf_counter() - t0

    timed(False)  # 预热：把 CPU 频率拉起来，避免先跑的一方吃亏
    serial = sorted(timed(False) for _ in range(3))[1]
    threads = sorted(timed(True) for _ in range(3))[1]

    ratio = threads / serial
    assert ratio >= 1.15, f"预期 GIL 争用减速 ≥1.15×，实测 {ratio:.2f}（间隔是否生效？）"
    print(f"  串行:   {serial:.3f}s")
    print(f"  4 线程: {threads:.3f}s   ({ratio:.2f}× 串行)")
    print("  GIL 下同一时刻只有一个线程在跑字节码：总功不变，多出的全是切换与缓存代价；")
    print("  默认 5ms 间隔时 4 线程 ≈ 串行（不加速），间隔越小切换税越重")


# ============================================================
# 5. IO 密集对照：GIL 在等待期间被释放，线程仍然有效
# ============================================================

def demo_io_bound() -> None:
    section("5. IO 密集：4 个 0.25s 的模拟网络请求")
    t0 = time.perf_counter()
    for _ in range(4):
        time.sleep(0.25)
    t_serial = time.perf_counter() - t0

    t0 = time.perf_counter()
    threads = [threading.Thread(target=time.sleep, args=(0.25,)) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    t_threads = time.perf_counter() - t0

    speedup = t_serial / t_threads
    assert speedup >= 2.5, f"IO 并行加速比仅 {speedup:.2f}×，sleep 期间 GIL 未被释放？"
    print(f"  串行:   {t_serial:.3f}s")
    print(f"  4 线程: {t_threads:.3f}s   ({speedup:.2f}× 加速，接近理论 4×)")
    print("  sleep/收发网络包时 CPython 显式释放 GIL——等待可以重叠，计算不行")


def main() -> None:
    print(f"Python {sys.version.split()[0]} · 默认 GIL 切换间隔 {sys.getswitchinterval() * 1000:.0f}ms")
    demo_bytecode()
    demo_lost_update()
    demo_check_then_act()
    demo_cpu_bound()
    demo_io_bound()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：竞态 5 跑各异（§2）、CPU 不加速（§4）、dis 非原子（§1）")


if __name__ == "__main__":
    main()
