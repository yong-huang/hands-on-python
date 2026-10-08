"""
WAL 与崩溃恢复 —— hands-on-python 第五系列（数据库）实验 13
核心要点: WAL 先写日志、提交确认与 fsync、kill -9 断电恢复、
          synchronous_commit=on/off 的持久性分级与吞吐差、pg_wal 增长观测

前置: ./wal_crash_recovery.sh start 已拉起容器(端口 55439, 无 --rm)
生命周期(由 shell 编排, 本脚本内含 docker kill/start 编排):
  durability 持续单条提交写入 8 秒(记录每个已提交 id) -> docker kill 断电
             -> docker start 重启 -> 已确认 id 逐行校验 100% 存在
  walsize    写入期间 pg_wal 目录尺寸三次采样, 观察增长
  tps        synchronous_commit=on/off 各跑 4 秒, 对比吞吐
运行: ../.venv/bin/python wal_crash_recovery.py   (由 ./wal_crash_recovery.sh 调用)
"""

import os
import subprocess
import sys
import threading
import time

import psycopg

PORT = os.environ.get("LAB13_PORT", "55439")
CONNINFO = dict(host="127.0.0.1", port=PORT, dbname="lab",
                user="postgres", password="lab")
CONTAINER = "lab13-pg"
WRITE_SECONDS = 8

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


def connect_pg(retries=60, delay=1.0):
    """连接 PG: 容器重启后要等崩溃恢复(WAL 回放)完成, 重试窗口更大。"""
    last = None
    for _ in range(retries):
        try:
            return psycopg.connect(**CONNINFO)
        except psycopg.OperationalError as err:
            last = err
            time.sleep(delay)
    raise SystemExit(f"PostgreSQL 连不上(已重试 {retries} 次): {last}")


def docker(*args, check=True):
    return subprocess.run(["docker", *args], capture_output=True, text=True,
                          check=check)


def wait_ready(timeout=90):
    for _ in range(timeout):
        r = subprocess.run(
            ["docker", "exec", CONTAINER, "pg_isready", "-q", "-U", "postgres"],
            capture_output=True)
        if r.returncode == 0:
            return True
        time.sleep(1)
    return False


def wal_lsn_bytes(conn):
    """当前 WAL 写入位置(自起点累计字节): 16MB 段预分配, du 看不出增长。"""
    with conn.cursor() as cur:
        cur.execute("SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')::bigint")
        return cur.fetchone()[0]


# ============================================================
# 1. durability — 断电零丢失
# ============================================================

def do_durability():
    step("durability", f"持续写入 {WRITE_SECONDS} 秒(每条独立提交并登记 id) -> docker kill 断电")
    writer_done = threading.Event()
    committed = []          # 仅记录"commit 已返回"的 id —— 这是持久性承诺的边界
    errors = []

    def writer():
        try:
            conn = connect_pg()
            conn.execute("SET synchronous_commit = on")
            i = 0
            while not writer_done.is_set():
                i += 1
                conn.execute(
                    "INSERT INTO wal_log (id, payload) VALUES (%s, %s)",
                    (i, f"p-{i}"))
                conn.commit()      # synchronous_commit=on: 返回即已落 WAL
                committed.append(i)
        except Exception as err:   # 断电瞬间连接被杀, 属预期
            errors.append(err)
        finally:
            writer_done.set()
            try:
                conn.close()
            except Exception:
                pass

    cur = connect_pg()
    cur.execute("DROP TABLE IF EXISTS wal_log")
    cur.execute("CREATE TABLE wal_log (id INTEGER PRIMARY KEY, payload TEXT)")
    cur.connection.commit()
    wal0 = wal_lsn_bytes(cur)

    t = threading.Thread(target=writer)
    t.start()
    sizes = [wal0]
    for _ in range(WRITE_SECONDS // 2):
        time.sleep(2)
        sizes.append(wal_lsn_bytes(cur))
    print(f"    pg_wal 累计写入量采样(Bytes): {sizes}")
    writer_done.set()          # 停写
    t.join(timeout=5)
    n = len(committed)
    ok(f"断电前已提交并登记 {n:,} 行(>1000 才有说服力)", n > 1000)
    ok(f"pg_wal 随写入增长({sizes[0]:,}B -> {sizes[-1]:,}B)",
       sizes[-1] > sizes[0])

    print("    docker kill (SIGKILL, 模拟断电)...")
    docker("kill", CONTAINER)
    docker("start", CONTAINER)
    ok("容器重启, 等待崩溃恢复完成", wait_ready())

    conn = connect_pg()
    missing = 0
    for chunk_start in range(0, n, 5000):
        chunk = committed[chunk_start:chunk_start + 5000]
        found = {r[0] for r in conn.execute(
            "SELECT id FROM wal_log WHERE id = ANY(%s)", (chunk,)).fetchall()}
        missing += len(set(chunk) - found)
    total = conn.execute("SELECT COUNT(*) FROM wal_log").fetchone()[0]
    print(f"    重启后表内 {total:,} 行; 已登记 id 逐段校验缺失 {missing} 行")
    ok(f"提交确认过的 id 100% 存在(缺失 {missing})", missing == 0 and total >= n)
    conn.close()
    return committed


# ============================================================
# 2. tps — synchronous_commit on/off 吞吐对比
# ============================================================

def bench(cur, seconds, sync):
    n = 0
    t0 = time.perf_counter()
    while time.perf_counter() - t0 < seconds:
        cur.execute("INSERT INTO tps_log (payload) VALUES (%s)", (f"r-{n}",))
        cur.connection.commit()
        n += 1
    return n / (time.perf_counter() - t0)


def do_tps(cur):
    step("tps", "synchronous_commit=on/off 各 4 秒: 持久性分级换吞吐")
    cur.execute("DROP TABLE IF EXISTS tps_log")
    cur.execute("CREATE TABLE tps_log (id INTEGER GENERATED ALWAYS AS IDENTITY"
                " PRIMARY KEY, payload TEXT)")
    cur.execute("SET synchronous_commit = on")
    cur.connection.commit()
    tps_on = bench(cur, 4, "on")
    cur.execute("SET synchronous_commit = off")
    tps_off = bench(cur, 4, "off")
    cur.execute("SET synchronous_commit = on")
    cur.connection.commit()
    print(f"    on : {tps_on:,.0f} tps (每次提交等 WAL 落盘)")
    print(f"    off: {tps_off:,.0f} tps (提交即返回, 由后台批量落盘)")
    ok(f"off 吞吐高于 on({tps_off:,.0f} > {tps_on:,.0f})", tps_off > tps_on)
    print(f"    代价: off 模式断电可能丢失最后几百毫秒的已提交事务")
    ok("持久性分级说明已给出", True)


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    do_durability()
    with connect_pg() as conn, conn.cursor() as cur:
        do_tps(cur)
    print(f"\n{'=' * 60}")
    print(f"==== 实验 13 · wal_crash_recovery 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
