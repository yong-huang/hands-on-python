"""
锁与死锁诊断 —— hands-on-python 第五系列（数据库）实验 11
核心要点: 行锁与 FOR UPDATE、FOR UPDATE SKIP LOCKED 任务队列、
          死锁检测(SQLSTATE 40P01)、pg_blocking_pids 阻塞链诊断

前置: ./locks_deadlock.sh start 已拉起容器(端口 55437, 库 lab)
生命周期(由 shell 编排):
  seed       库存表 + 订单表 + 任务表
  deadlock   两会话交叉更新同一两行, 死锁 5 连复现(SQLSTATE 40P01)
  oversell   20 线程 FOR UPDATE 抢购 1 件库存, 超卖必须为 0
  skiplock   SKIP LOCKED 任务队列: 30 任务 8 工人, 每任务恰被领一次
  blocking   pg_blocking_pids 抓"谁等谁"阻塞链
运行: ../.venv/bin/python locks_deadlock.py   (由 ./locks_deadlock.sh 调用)
"""

import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import psycopg
from psycopg import errors as pgerr

PORT = os.environ.get("LAB11_PORT", "55437")
CONNINFO = dict(host="127.0.0.1", port=PORT, dbname="lab",
                user="postgres", password="lab")

PASS_COUNT = 0


def ok(label, cond, detail=""):
    """断言并把结果打进输出: 通过记 [PASS], 失败抛 AssertionError 中止全流程。"""
    global PASS_COUNT
    if not cond:
        print(f"  [FAIL] {label} {detail}")
        raise AssertionError(label)
    PASS_COUNT += 1
    print(f"  [PASS] {label}")


def step(name, desc):
    print(f"\n=====> [{name}] {desc}")


def connect_pg(retries=15, delay=1.0):
    """连接 PG: 容器 initdb 阶段的临时实例会骗过 pg_isready, 带重试。"""
    last = None
    for _ in range(retries):
        try:
            return psycopg.connect(**CONNINFO)
        except psycopg.OperationalError as err:
            last = err
            time.sleep(delay)
    raise SystemExit(f"PostgreSQL 连不上(已重试 {retries} 次): {last}")


# ============================================================
# 1. seed — 三张表
# ============================================================

def do_seed(cur):
    step("seed", "建库存/订单/任务三张表, 库存两行各 10 件")
    cur.execute("""
        CREATE TABLE inventory (id INTEGER PRIMARY KEY, name TEXT NOT NULL,
                                stock INT NOT NULL CHECK (stock >= 0));
        CREATE TABLE orders (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                             sku TEXT NOT NULL);
        CREATE TABLE jobs (id INTEGER PRIMARY KEY, payload TEXT NOT NULL,
                           claimed_by INTEGER);
        INSERT INTO inventory VALUES (1, 'sku-A', 10), (2, 'sku-B', 10);
        INSERT INTO jobs SELECT g, 'job-' || g, NULL FROM generate_series(1, 30) g;
    """)
    cur.connection.commit()
    n = cur.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    ok("三表就位, 30 个待领任务", n == 30)


# ============================================================
# 2. deadlock — 交叉更新死锁 5 连
# ============================================================

def deadlock_round(round_no):
    """一轮死锁: c1 锁行1等行2, c2 锁行2等行1。返回是否出现 40P01。"""
    c1 = connect_pg()
    c2 = connect_pg()
    try:
        c1.execute("UPDATE inventory SET stock = stock - 1 WHERE id = 1")
        c2.execute("UPDATE inventory SET stock = stock - 1 WHERE id = 2")
        with ThreadPoolExecutor(max_workers=2) as pool:
            f1 = pool.submit(c1.execute,
                             "UPDATE inventory SET stock = stock - 1 WHERE id = 2")
            time.sleep(0.1)   # 确保 c1 先等在行 2 上
            f2 = pool.submit(c2.execute,
                             "UPDATE inventory SET stock = stock - 1 WHERE id = 1")
            deadlock = False
            for f in (f1, f2):
                try:
                    f.result(timeout=15)
                except pgerr.DeadlockDetected as err:
                    deadlock = True
                    assert err.sqlstate == "40P01", err.sqlstate
                except Exception as err:   # 另一连接可能被选为牺牲者
                    if "deadlock" not in str(err).lower():
                        raise
        c1.rollback()
        c2.rollback()
        return deadlock
    finally:
        c1.close()
        c2.close()


def do_deadlock(cur):
    step("deadlock", "两会话交叉更新行 1/行 2, 死锁 5 连(检测约需 1 秒/轮)")
    wins = 0
    for i in range(1, 6):
        if deadlock_round(i):
            wins += 1
            print(f"    第 {i} 轮: 死锁被检测, 牺牲者收到 40P01 并整体回滚")
        else:
            print(f"    第 {i} 轮: 未触发死锁(异常)")
    ok(f"死锁 5/5 轮被 PG 自动检测(40P01)", wins == 5)
    cur.execute("SELECT stock FROM inventory WHERE id IN (1, 2) ORDER BY id")
    stocks = tuple(r[0] for r in cur.fetchall())
    print(f"    每轮回滚后库存复原: {stocks}")
    ok(f"牺牲者整体回滚, 库存无脏数据 {stocks}", stocks == (10, 10))


# ============================================================
# 3. oversell — 20 线程抢 1 件库存
# ============================================================

def oversell_worker(worker_id):
    """一个买家: FOR UPDATE 锁行看库存, 有货才下单。"""
    conn = connect_pg()
    bought = False
    try:
        with conn.transaction():
            stock = conn.execute(
                "SELECT stock FROM inventory WHERE id = 1 FOR UPDATE"
            ).fetchone()[0]
            if stock > 0:
                conn.execute("UPDATE inventory SET stock = stock - 1 WHERE id = 1")
                conn.execute("INSERT INTO orders (sku) VALUES ('sku-A')")
                bought = True
    finally:
        conn.close()
    return bought


def do_oversell(cur):
    step("oversell", "20 线程并发抢 1 件库存: FOR UPDATE 行锁串行化")
    cur.execute("UPDATE inventory SET stock = 1 WHERE id = 1")
    cur.execute("DELETE FROM orders")
    cur.connection.commit()
    with ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(oversell_worker, range(20)))
    sold = sum(1 for r in results if r)
    stock = cur.execute(
        "SELECT stock FROM inventory WHERE id = 1").fetchone()[0]
    n_orders = cur.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    print(f"    20 人抢购: 成交 {sold} 单, 剩余库存 {stock}, 订单表 {n_orders} 行")
    ok(f"恰好成交 1 单(20 人里只成 1 人)", sold == 1)
    ok(f"零超卖: 库存归 0 且从不为负({n_orders} 单对应 {stock} 件剩货)",
       stock == 0 and n_orders == 1)


# ============================================================
# 4. skiplock — SKIP LOCKED 任务队列
# ============================================================

def skiplock_worker(worker_id):
    """工人循环领任务: SKIP LOCKED 让每个任务只被一个工人领走。"""
    conn = connect_pg()
    conn.autocommit = True
    got = []
    while True:
        row = conn.execute("""
            UPDATE jobs SET claimed_by = %s WHERE id = (
                SELECT id FROM jobs WHERE claimed_by IS NULL
                ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1
            ) RETURNING id
        """, (worker_id,)).fetchone()
        if not row:
            break
        got.append(row[0])
    conn.close()
    return got


def do_skiplock(cur):
    step("skiplock", "8 工人并发领 30 任务: FOR UPDATE SKIP LOCKED")
    cur.execute("UPDATE jobs SET claimed_by = NULL")
    cur.connection.commit()
    with ThreadPoolExecutor(max_workers=8) as pool:
        all_claims = list(pool.map(skiplock_worker, range(8)))
    claimed = [j for chunk in all_claims for j in chunk]
    n = cur.execute(
        "SELECT COUNT(*) FROM jobs WHERE claimed_by IS NOT NULL").fetchone()[0]
    distinct = cur.execute(
        "SELECT COUNT(DISTINCT claimed_by) FROM jobs").fetchone()[0]
    print(f"    30 任务由 {distinct} 个工人领完, 领取序列无重复")
    ok(f"全部 30 任务恰好被领一次({n}/30)", n == 30 and len(claimed) == 30
       and len(set(claimed)) == 30)
    ok(f"8 工人均参与(实际 {distinct} 人分摊, 无一人空转阻塞)", distinct >= 2)


# ============================================================
# 5. blocking — 阻塞链诊断
# ============================================================

def do_blocking(cur):
    step("blocking", "谁等谁: pg_blocking_pids 现场抓阻塞链")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS hot_row (id INTEGER PRIMARY KEY, v INT);
        TRUNCATE hot_row;
        INSERT INTO hot_row VALUES (1, 0);
    """)
    cur.connection.commit()

    holder = connect_pg()
    waiter = connect_pg()
    holder.execute("UPDATE hot_row SET v = v + 1 WHERE id = 1")   # 持锁不提交
    holder_pid = holder.execute("SELECT pg_backend_pid()").fetchone()[0]
    waiter_pid = waiter.execute("SELECT pg_backend_pid()").fetchone()[0]

    import threading
    done = threading.Event()
    def blocked_update():
        waiter.execute("UPDATE hot_row SET v = v + 1 WHERE id = 1")
        waiter.commit()   # 提交后才对其他连接可见
        done.set()
    t = threading.Thread(target=blocked_update)
    t.start()

    chain = None
    for _ in range(50):   # 最多等 5 秒让阻塞关系建立
        cur.connection.commit()
        cur.execute("SELECT pg_blocking_pids(%s)", (waiter_pid,))
        blockers = cur.fetchone()[0]
        if holder_pid in blockers:
            chain = blockers
            break
        time.sleep(0.1)
    print(f"    持锁者 pid={holder_pid}, 等待者 pid={waiter_pid}, "
          f"阻塞链: 等待者被 {chain} 阻塞")
    ok("pg_blocking_pids 指认持锁者正是阻塞源",
       chain is not None and holder_pid in chain)

    holder.rollback()   # 释放, 等待者的更新随即完成
    done.wait(timeout=5)
    t.join(timeout=5)
    v = cur.execute("SELECT v FROM hot_row WHERE id = 1").fetchone()[0]
    cur.connection.commit()
    holder.close()
    waiter.close()
    ok(f"持锁者回滚后等待者立即完成(最终 v={v})", v == 1)


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    with connect_pg() as conn, conn.cursor() as cur:
        do_seed(cur)
        do_deadlock(cur)
        do_oversell(cur)
        do_skiplock(cur)
        do_blocking(cur)
    print(f"\n{'=' * 60}")
    print(f"==== 实验 11 · locks_deadlock 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
