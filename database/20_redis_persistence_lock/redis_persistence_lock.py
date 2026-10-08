"""
Redis 持久化与分布式锁 —— hands-on-python 第五系列（数据库）实验 20
核心要点: AOF everysec 的丢失窗口、SET NX PX 互斥、Lua 原子释放、
          持有者崩溃后 TTL 兜底

前置: ./redis_persistence_lock.sh start 已拉起容器(端口 55452, AOF everysec)
生命周期(由 shell 编排):
  persistence  持续写入 5 秒 -> docker kill(SIGKILL) -> 重启 -> 统计丢失条数
  lock         SET NX PX 三连: 20 并发恰 1 成功; 错误 token 不能释放;
               持有者 kill 后 TTL 到期自动可抢
运行: ../.venv/bin/python redis_persistence_lock.py   (由 ./redis_persistence_lock.sh 调用)
"""

import os
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
import uuid

import redis

PORT = os.environ.get("LAB20_PORT", "55452")
R = redis.Redis(host="127.0.0.1", port=PORT, decode_responses=True)
CONTAINER = "lab20-redis"

PASS_COUNT = 0


def ok(label, cond, detail=""):
    global PASS_COUNT
    if not cond:
        print(f"  [FAIL] {label} {detail}")
        raise AssertionError(label)
    PASS_COUNT += 1
    print(f"  [PASS] {label}")


def step(name, desc):
    print(f"\n=====> [{name}] {desc}")


def docker(*args, check=True):
    return subprocess.run(["docker", *args], capture_output=True, text=True,
                          check=check)


def wait_ready(timeout=30):
    for _ in range(timeout * 2):
        try:
            return R.ping()
        except redis.exceptions.ConnectionError:
            time.sleep(0.5)
    return False


RELEASE_LUA = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


# ============================================================
# 1. persistence — AOF 丢失窗口
# ============================================================

def do_persistence():
    step("persistence", "AOF everysec 持续写入 5 秒 -> docker kill -> 重启数丢失")
    R.flushdb()
    committed = []
    stop = threading.Event()
    err = []

    def writer():
        try:
            conn = redis.Redis(host="127.0.0.1", port=PORT,
                               decode_responses=True)
            i = 0
            while not stop.is_set():
                i += 1
                conn.set(f"persist:k:{i}", f"v-{i}")
                committed.append(i)   # 客户端确认已返回
        except Exception as e:
            err.append(e)

    t = threading.Thread(target=writer)
    t.start()
    time.sleep(5)
    stop.set()
    t.join(timeout=5)
    n = len(committed)
    print(f"    断电前客户端确认 {n:,} 条写入")
    ok(f"写入量足够({n:,} > 500)", n > 500)

    print("    docker kill (SIGKILL, 模拟断电)...")
    docker("kill", CONTAINER)
    docker("start", CONTAINER)
    ok("重启完成且可响应", wait_ready())

    survived = sum(1 for i in committed
                   if R.exists(f"persist:k:{i}"))
    lost = n - survived
    print(f"    重启后存活 {survived:,}/{n:,}, 丢失 {lost} 条")
    ok(f"丢失远小于总写入(丢 {lost} 条, 占比 {lost / n * 100:.1f}% < 20%)",
       lost < n * 0.2)
    ok(f"绝大多数提交存活(AOF everysec 兜底: {survived:,})", survived >= n * 0.8)
    print(f"    结论: everysec 最多丢约 1 秒的写入(本机实测 {lost} 条), "
          f"要求零丢失用 appendfsync always 或换 PG(实验 13)")


# ============================================================
# 2. lock — SET NX PX 三连
# ============================================================

def acquire(key, token, ttl_ms=3000):
    return R.set(key, token, nx=True, px=ttl_ms)


def release(key, token):
    return R.eval(RELEASE_LUA, 1, key, token) == 1


def do_lock():
    step("lock", "SET NX PX: 20 并发抢同一把锁, 恰 1 个成功")
    R.delete("lock:demo")
    tokens = [uuid.uuid4().hex for _ in range(20)]
    results = []
    barrier = threading.Barrier(20)

    def contender(token):
        barrier.wait()
        results.append(acquire("lock:demo", token))

    with ThreadPoolExecutor(max_workers=20) as pool:
        list(pool.map(contender, tokens))
    winners = sum(1 for r in results if r)
    print(f"    20 并发抢锁: {winners} 个成功")
    ok(f"互斥: 恰 1 个成功({winners}/20)", winners == 1)

    step("lock-release", "Lua 原子释放: 正确 token 可删, 错误 token 拒绝")
    winner_token = R.get("lock:demo")
    fake_release = release("lock:demo", "wrong-token-123")
    print(f"    错误 token 释放: {fake_release}(被拒)")
    ok("错误 token 不能释放别人的锁", fake_release is False)
    real_release = release("lock:demo", winner_token)
    print(f"    正确 token 释放: {real_release}")
    ok("正确 token 释放成功且锁已消失",
       real_release is True and R.exists("lock:demo") == 0)

    step("lock-ttl", "持有者崩溃: TTL 到期后锁自动可抢(兜底)")
    my_token = uuid.uuid4().hex
    ok("重新抢锁成功", acquire("lock:demo", my_token, ttl_ms=1500) is True)
    print("    模拟持有者 kill -9(进程直接消失, 无释放)...")
    ttl = R.ttl("lock:demo")
    print(f"    锁剩余 TTL {ttl}ms; 等待过期...")
    time.sleep(1.8)
    other_token = uuid.uuid4().hex
    got = acquire("lock:demo", other_token, ttl_ms=3000)
    ok("TTL 到期后他人可获取锁(自愈兜底)", got is True)


# ============================================================
# main
# ============================================================

def main():
    print(f"redis-py {redis.__version__}; ping={R.ping()}")
    info = R.info("persistence")
    print(f"    AOF: enabled={info['aof_enabled']}, "
          f"everysec 由启动参数指定")
    do_persistence()
    do_lock()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 20 · redis_persistence_lock 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
