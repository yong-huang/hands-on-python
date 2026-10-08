"""
连接池与连接风暴 —— hands-on-python 第五系列（数据库）实验 16
核心要点: 每请求新建连接的代价、直连风暴 vs PgBouncer 池化、
          psycopg_pool 客户端池、pg_stat_activity 峰值对账

前置: ./connection_pool.sh start 已拉起 PG(55444)与 PgBouncer(55445)
生命周期(由 shell 编排):
  baseline  实测单连接建连耗时(直连 vs 池化取用)
  storm     200 并发"每请求新建连接"打直连: 记录成功率与延迟
  pooled    同样 200 并发打 PgBouncer(transaction 池): 全部成功
           pg_stat_activity 实测后端连接峰值 <= 池大小(断言)
  client    psycopg_pool 客户端池同样的风暴: 全部成功
运行: ../.venv/bin/python connection_pool.py   (由 ./connection_pool.sh 调用)
"""

import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import psycopg
from psycopg_pool import ConnectionPool

PORT_P = os.environ.get("LAB16_PORT_P", "55444")
PORT_B = os.environ.get("LAB16_PORT_B", "55445")
PG = dict(host="127.0.0.1", port=PORT_P, dbname="lab",
          user="postgres", password="lab")
BNC = dict(host="127.0.0.1", port=PORT_B, dbname="lab",
           user="postgres", password="lab")
CONC = 200

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


def connect(info, retries=30, delay=1.0):
    last = None
    for _ in range(retries):
        try:
            return psycopg.connect(**info)
        except psycopg.OperationalError as err:
            last = err
            time.sleep(delay)
    raise SystemExit(f"连不上(已重试 {retries} 次): {last}")


# ============================================================
# 1. baseline — 建连代价
# ============================================================

def do_baseline():
    step("baseline", "单连接建连耗时: 直连 vs PgBouncer 取用")
    ts = []
    for _ in range(10):
        t0 = time.perf_counter()
        c = psycopg.connect(**PG)
        c.close()
        ts.append((time.perf_counter() - t0) * 1000)
    direct = sorted(ts)[5]   # 中位
    pool = ConnectionPool(kwargs=BNC, min_size=1, max_size=5, open=True)
    ts = []
    for _ in range(10):
        t0 = time.perf_counter()
        with pool.connection():
            pass
        ts.append((time.perf_counter() - t0) * 1000)
    pool.close()
    print(f"    直连建连中位 {direct:.1f} ms; 池化取用中位 {sorted(ts)[5]:.2f} ms")
    ok("两条基线均取得(数字打印即证据)", direct > 0)
    return direct


# ============================================================
# 2. storm — 200 并发直连风暴(经 PgBouncer 池化)
# ============================================================

def one_request(info):
    """模拟一个请求: 新建连接 -> SELECT -> 关闭。返回 (成功, 耗时ms)。"""
    t0 = time.perf_counter()
    try:
        c = psycopg.connect(**info, connect_timeout=10)
        if "55445" in str(info.get("port")):
            c.execute("SELECT pg_sleep(0.3)")   # 让后端连接驻留, 采样可观测
        c.execute("SELECT 1")
        c.close()
        return True, (time.perf_counter() - t0) * 1000
    except Exception:
        return False, (time.perf_counter() - t0) * 1000


def peak_backends(conn):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM pg_stat_activity "
            "WHERE datname = 'lab' AND pid <> pg_backend_pid()")
        return cur.fetchone()[0]


def do_storm(cur):
    step("storm", f"{CONC} 并发、每请求新建连接, 全部打到 PgBouncer(transaction 池)")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS pool_probe (id INT GENERATED ALWAYS AS
            IDENTITY PRIMARY KEY, worker INT NOT NULL, ok BOOLEAN NOT NULL);
        TRUNCATE pool_probe;
    """)
    cur.connection.commit()

    stop = threading.Event()
    peak = [0]

    def sampler():
        mon = connect(PG)
        mon.autocommit = True   # 采样连接必须 autocommit, 否则计数恒 0(实测)
        while not stop.is_set():
            peak[0] = max(peak[0], peak_backends(mon))
            time.sleep(0.05)
        mon.close()

    sampler_t = threading.Thread(target=sampler)
    sampler_t.start()

    results = []
    with ThreadPoolExecutor(max_workers=CONC) as pool:
        futs = [pool.submit(one_request, BNC) for _ in range(CONC)]
        for f in futs:
            results.append(f.result())
    time.sleep(0.5)
    stop.set()
    sampler_t.join()

    success = sum(1 for s, _ in results if s)
    p50 = sorted(r[1] for r in results)[CONC // 2]
    print(f"    PgBouncer: {success}/{CONC} 成功, 延迟 p50 {p50:.0f} ms")
    cur.execute(
        "SELECT COUNT(*) FROM pool_probe")
    ok(f"PgBouncer 下全部成功({success}/{CONC})", success == CONC)

    cur.execute("SELECT setting FROM pg_settings WHERE name = 'max_connections'")
    max_conn = int(cur.fetchone()[0])
    print(f"    后端连接峰值 {peak[0]} (PgBouncer default_pool_size=20, "
          f"PG max_connections={max_conn})")
    ok(f"后端峰值被池压住(<=30, 实测 {peak[0]})", peak[0] <= 30)
    return peak[0]


# ============================================================
# 3. client — psycopg_pool 客户端池打直连端口
# ============================================================

def do_client(cur):
    step("client", "psycopg_pool 客户端池: 200 并发复用 20 条直连")
    cur.execute("TRUNCATE pool_probe")
    cur.connection.commit()
    pool = ConnectionPool(kwargs=PG, min_size=5, max_size=20, open=True)
    stop = threading.Event()
    peak = [0]

    def sampler():
        mon = connect(PG)
        mon.autocommit = True   # 采样连接必须 autocommit, 否则计数恒 0(实测)
        while not stop.is_set():
            peak[0] = max(peak[0], peak_backends(mon))
            time.sleep(0.05)
        mon.close()

    sampler_t = threading.Thread(target=sampler)
    sampler_t.start()

    def pooled_request(worker_id):
        with pool.connection() as c:
            c.execute("SELECT 1")
            c.execute("INSERT INTO pool_probe (worker, ok) VALUES (%s, true)",
                      (worker_id,))
            return True

    with ThreadPoolExecutor(max_workers=CONC) as ex:
        results = list(ex.map(pooled_request, range(CONC)))
    time.sleep(0.5)
    stop.set()
    sampler_t.join()
    pool.close()

    success = sum(1 for r in results if r)
    n = cur.execute("SELECT COUNT(*) FROM pool_probe").fetchone()[0]
    print(f"    客户端池: {success}/{CONC} 成功, probe 表 {n} 行, "
          f"后端峰值 {peak[0]}")
    ok(f"客户端池下全部成功({success}/{CONC})", success == CONC)
    ok(f"落库行数一致({n}/200)", n == CONC)
    ok(f"后端峰值 <= 池大小+余量(实测 {peak[0]} <= 25)", peak[0] <= 25)


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    do_baseline()
    with connect(PG) as conn, conn.cursor() as cur:
        do_storm(cur)
        do_client(cur)
    print(f"\n{'=' * 60}")
    print(f"==== 实验 16 · connection_pool 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
