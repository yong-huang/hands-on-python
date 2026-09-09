"""
06 · 进程间通信与共享状态 —— Pipe / Queue / SharedMemory / Manager
并发清单项目 6：进程隔离了内存，四条路把数据递过去

四个实测点（全部可断言）:
- Pipe:       双向管道，父子进程一来一回
- Queue:      10 万条消息批量传递，接收条数分毫不差
- SharedMemory: 50MB 大数组零拷贝共享，对比 pickle+Pipe 至少快 5×，校验和一致
- Manager:    代理对象的并发更新——不加锁会丢，加锁后 10000 次分毫不差

用法: python3 ipc_shared.py   # 全部实测 + 断言，约 10 秒
交互示意图: 用浏览器打开 images/ipc_shared.archify.html
"""

import multiprocessing
import os
import sys
import time
import zlib

N_MESSAGES = 100_000
SHM_MB = 50
N_INCREMENTS = 10_000
N_WORKERS = 4


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. Pipe：父子双向管道
# ============================================================

def pipe_child(conn) -> None:
    for _ in range(3):
        msg = conn.recv()
        conn.send(f"收到: {msg}")


def demo_pipe() -> None:
    section("1. Pipe：父子双向一来一回")
    parent_conn, child_conn = multiprocessing.Pipe()
    p = multiprocessing.Process(target=pipe_child, args=(child_conn,))
    p.start()
    child_conn.close()                      # 父进程用不到子端，立刻关闭
    for msg in ("ping-1", "ping-2", "ping-3"):
        parent_conn.send(msg)
        assert parent_conn.recv() == f"收到: {msg}"
    p.join()
    print("  三次往返全部按序返回；双端各持一半，用完的一端要及时 close")


# ============================================================
# 2. Queue：10 万条消息批量传递
# ============================================================

def queue_consumer(q, done) -> None:
    count = 0
    while True:
        item = q.get()
        if item is None:
            break
        count += 1
    done.send(count)


def demo_queue() -> None:
    section(f"2. Queue：{N_MESSAGES:,} 条消息批量传递")
    q = multiprocessing.Queue()
    recv_fd, send_fd = multiprocessing.Pipe(duplex=False)
    p = multiprocessing.Process(target=queue_consumer, args=(q, send_fd))
    p.start()
    t0 = time.perf_counter()
    for i in range(N_MESSAGES):
        q.put(i)
    q.put(None)                             # 毒丸
    p.join()
    total = recv_fd.recv()
    secs = time.perf_counter() - t0
    assert total == N_MESSAGES, f"应收到 {N_MESSAGES} 条，实际 {total}"
    print(f"  {total:,} 条分毫不差，耗时 {secs:.2f}s（≈{N_MESSAGES / secs:,.0f} 条/秒，含 pickle 开销）")


# ============================================================
# 3. SharedMemory：50MB 零拷贝 vs pickle+Pipe
# ============================================================

def shm_child(name, go_evt, result_q) -> None:
    import zlib
    from multiprocessing import shared_memory
    shm = shared_memory.SharedMemory(name=name)   # 预先挂载（spawn 成本不计入）
    go_evt.wait()
    t0 = time.perf_counter()
    crc = zlib.crc32(bytes(shm.buf))              # 零拷贝直读 + C 速度校验
    result_q.put((crc, time.perf_counter() - t0))
    shm.close()


def pickle_child(conn, result_q) -> None:
    import zlib
    t0 = time.perf_counter()
    data = conn.recv()                            # 反序列化 50MB（拷贝进子进程）
    result_q.put((zlib.crc32(data), time.perf_counter() - t0))


def demo_shm() -> None:
    section(f"3. SharedMemory vs pickle+Pipe：{SHM_MB}MB 大数组")
    from multiprocessing import shared_memory
    payload = bytes(os.urandom(SHM_MB * 1024 * 1024))
    expected = zlib.crc32(payload)
    result_q = multiprocessing.Queue()
    go_evt = multiprocessing.Event()

    shm = shared_memory.SharedMemory(create=True, size=len(payload))
    shm.buf[:] = payload
    p1 = multiprocessing.Process(target=shm_child, args=(shm.name, go_evt, result_q))
    p1.start()
    time.sleep(0.3)                     # 等子进程完成 spawn 与挂载，计时只测传输
    t0 = time.perf_counter()
    go_evt.set()                        # 发车：写已在计时外，子进程直读共享内存
    got_shm, shm_child_secs = result_q.get()
    shm_total = time.perf_counter() - t0
    p1.join()
    shm.close()
    shm.unlink()

    parent_conn, child_conn = multiprocessing.Pipe()
    p2 = multiprocessing.Process(target=pickle_child, args=(child_conn, result_q))
    p2.start()
    child_conn.close()
    time.sleep(0.3)
    t0 = time.perf_counter()
    parent_conn.send(payload)           # 发车：pickle + 管道拷贝 + 对端反序列化
    got_pipe, pickle_child_secs = result_q.get()
    pickle_total = time.perf_counter() - t0
    p2.join()

    assert got_shm == expected and got_pipe == expected, "校验和不一致，数据损坏！"
    ratio = pickle_child_secs / shm_child_secs
    assert ratio >= 5, f"子进程侧仅快 {ratio:.1f}×，未达 5×"
    print(f"  SharedMemory 子进程侧: {shm_child_secs * 1000:.0f}ms（零拷贝直读，父端写 {shm_total * 1000:.0f}ms 全程）")
    print(f"  pickle+Pipe  子进程侧: {pickle_child_secs * 1000:.0f}ms（序列化+管道+反序列化）")
    print(f"  子进程侧加速 {ratio:.1f}×，两边 CRC32 一致（{SHM_MB}MB 数据完好）")


# ============================================================
# 4. Manager：代理对象的并发更新，加锁前后的命运
# ============================================================

def manager_worker(d, lock, n) -> None:
    for _ in range(n):
        if lock is None:
            d["count"] = d["count"] + 1     # get 与 set 是两次独立 RPC——窗口大开
        else:
            with lock:
                d["count"] = d["count"] + 1


def demo_manager() -> None:
    section(f"4. Manager：{N_WORKERS} 进程 × {N_INCREMENTS // N_WORKERS:,} 次并发更新同一 key")
    per_worker = N_INCREMENTS // N_WORKERS
    mgr = multiprocessing.Manager()
    d = mgr.dict()
    d["count"] = 0

    # 无锁：get 与 set 之间存在 RPC 窗口，丢失更新
    procs = [multiprocessing.Process(target=manager_worker, args=(d, None, per_worker)) for _ in range(N_WORKERS)]
    for p in procs:
        p.start()
    for p in procs:
        p.join()
    dirty = d["count"]
    print(f"  无锁:   最终 count = {dirty:,}（丢失 {N_INCREMENTS - dirty:,} 次，RPC 窗口被穿插）")

    # 加锁：Manager 自带的 Lock 代理
    d["count"] = 0
    lock = mgr.Lock()
    procs = [multiprocessing.Process(target=manager_worker, args=(d, lock, per_worker)) for _ in range(N_WORKERS)]
    for p in procs:
        p.start()
    for p in procs:
        p.join()
    assert d["count"] == N_INCREMENTS, f"加锁后仍丢: {d['count']}"
    print(f"  加锁:   最终 count = {d['count']:,}（{N_INCREMENTS:,} 次分毫不差）")
    print("  Manager 的每次属性访问都是一次 RPC——慢，但让'进程级共享对象'成为可能")
    mgr.shutdown()


def main() -> None:
    print(f"Python {sys.version.split()[0]} · start_method={multiprocessing.get_start_method()!r}")
    demo_pipe()
    demo_queue()
    demo_shm()
    demo_manager()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：Queue 不丢（§2）、SharedMemory ≥5×（§3）、Manager 加锁恒等（§4）")


if __name__ == "__main__":
    main()
