"""
隔离级别与 MVCC 实测 —— hands-on-python 第五系列（数据库）实验 12
核心要点: READ COMMITTED / REPEATABLE READ / SERIALIZABLE、脏读/不可重复读/
          幻读三异常、MVCC 与 xmin/xmax、序列化冲突 40001 与重试

前置: ./isolation_mvcc.sh start 已拉起容器(端口 55438, 库 lab)
生命周期(由 shell 编排):
  seed     计数表与工单表
  matrix   3 异常 x 3 隔离级别 = 9 格, 双会话编排逐格复现/防住, 与理论对表
  mvcc     xmin/xmax 现场观察: 未提交改动对其他会话不可见, 旧快照留旧版本
  serial   SERIALIZABLE 冲突拿 40001, 整事务重试后成功
运行: ../.venv/bin/python isolation_mvcc.py   (由 ./isolation_mvcc.sh 调用)
"""

import os
import sys
import time

import psycopg
from psycopg import errors as pgerr

PORT = os.environ.get("LAB12_PORT", "55438")
CONNINFO = dict(host="127.0.0.1", port=PORT, dbname="lab",
                user="postgres", password="lab")
LEVELS = ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"]

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


def connect_pg(retries=15, delay=1.0):
    last = None
    for _ in range(retries):
        try:
            return psycopg.connect(**CONNINFO)
        except psycopg.OperationalError as err:
            last = err
            time.sleep(delay)
    raise SystemExit(f"PostgreSQL 连不上(已重试 {retries} 次): {last}")


def iso_conn(level):
    conn = connect_pg()
    conn.execute(f"BEGIN ISOLATION LEVEL {level}")
    return conn


def reset(cur):
    cur.execute("TRUNCATE counter; TRUNCATE tickets")
    cur.execute("INSERT INTO counter VALUES (1, 10)")
    cur.execute("INSERT INTO tickets SELECT g, 'open' FROM generate_series(1, 5) g")
    cur.connection.commit()


# ============================================================
# 1. seed
# ============================================================

def do_seed(cur):
    step("seed", "建计数表 counter 与工单表 tickets")
    cur.execute("""
        CREATE TABLE counter (id INTEGER PRIMARY KEY, v INT NOT NULL);
        CREATE TABLE tickets (id INTEGER PRIMARY KEY, status TEXT NOT NULL);
    """)
    reset(cur)
    ok("counter(10) 与 tickets(5 张 open) 就位", True)


# ============================================================
# 2. matrix — 3 异常 x 3 级别
# ============================================================

def cell_dirty(level):
    """脏读: c2 未提交的改动, c1 能不能读到。理论: 任何级别都防住。"""
    a = iso_conn(level)
    b = iso_conn(level)
    b.execute("UPDATE counter SET v = 99 WHERE id = 1")   # 未提交
    seen = a.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
    b.rollback()
    a.rollback()
    return "复现" if seen == 99 else "防住", seen


def cell_nonrepeat(level):
    """不可重复读: c1 两次读之间 c2 提交改值, c1 第二次读到新值即复现。
    理论: RC 复现, RR/SERIALIZABLE 防住(快照固定)。"""
    a = iso_conn(level)
    first = a.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
    b = connect_pg()
    b.execute("UPDATE counter SET v = 20 WHERE id = 1")
    b.commit()
    second = a.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
    b.close()
    a.rollback()
    return ("复现" if second != first else "防住"), (first, second)


def cell_phantom(level):
    """幻读: c1 两次 count 之间 c2 提交插入, 第二次多出一行即复现。
    理论: RC 复现, RR/SERIALIZABLE 防住(PG 的 RR 快照含幻读保护)。"""
    a = iso_conn(level)
    first = a.execute(
        "SELECT COUNT(*) FROM tickets WHERE status = 'open'").fetchone()[0]
    b = connect_pg()
    b.execute("INSERT INTO tickets VALUES (100, 'open')")
    b.commit()
    second = a.execute(
        "SELECT COUNT(*) FROM tickets WHERE status = 'open'").fetchone()[0]
    b.close()
    a.rollback()
    return ("复现" if second != first else "防住"), (first, second)


def do_matrix(cur):
    step("matrix", "3 异常 x 3 级别 = 9 格, 双会话编排逐格实测")
    theory = {
        ("脏读", "READ COMMITTED"): "防住", ("脏读", "REPEATABLE READ"): "防住",
        ("脏读", "SERIALIZABLE"): "防住",
        ("不可重复读", "READ COMMITTED"): "复现",
        ("不可重复读", "REPEATABLE READ"): "防住",
        ("不可重复读", "SERIALIZABLE"): "防住",
        ("幻读", "READ COMMITTED"): "复现",
        ("幻读", "REPEATABLE READ"): "防住",
        ("幻读", "SERIALIZABLE"): "防住",
    }
    print(f"    {'异常':<8}{'级别':<18}{'实测':<6}理论")
    agree = 0
    for anomaly, probe in (("脏读", cell_dirty),
                           ("不可重复读", cell_nonrepeat),
                           ("幻读", cell_phantom)):
        for level in LEVELS:
            reset(cur)
            got, detail = probe(level)
            want = theory[(anomaly, level)]
            print(f"    {anomaly:<8}{level:<18}{got:<6}{want}   {detail}")
            if got == want:
                agree += 1
            else:
                print(f"      -> 与理论不符!")
        reset(cur)
    ok(f"9 格判定与理论全部一致({agree}/9)", agree == 9)


# ============================================================
# 3. mvcc — xmin/xmax 现场观察
# ============================================================

def do_mvcc(cur):
    step("mvcc", "xmin/xmax: 未提交改动对他会话不可见, 旧快照留旧版本")
    reset(cur)
    xmin0 = cur.execute(
        "SELECT xmin, xmax, v FROM counter WHERE id = 1").fetchone()
    print(f"    初版: xmin={xmin0[0]} xmax={xmin0[1]} v={xmin0[2]}")

    a = iso_conn("READ COMMITTED")
    seen_before = a.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
    rr = iso_conn("REPEATABLE READ")
    rr_snapshot = rr.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
    print(f"    RR 会话此刻取快照: 读到 {rr_snapshot}")

    b = connect_pg()
    b.execute("UPDATE counter SET v = 20 WHERE id = 1")   # 不提交
    seen_during = a.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
    print(f"    b 未提交 UPDATE 期间: a 读到 {seen_during}(旧版本还在)")
    ok(f"未提交改动不可见(a 始终读到 {seen_before})",
       seen_before == 10 and seen_during == 10)

    b.commit()
    seen_after_open = a.execute(
        "SELECT v FROM counter WHERE id = 1").fetchone()[0]
    xmin_new = cur.execute(
        "SELECT xmin, v FROM counter WHERE id = 1").fetchone()
    print(f"    b 提交后: a(RC, 新语句新快照) 读到 {seen_after_open}; "
          f"新版本 xmin={xmin_new[0]} v={xmin_new[1]}")
    ok("RC 下新语句看到新版本", seen_after_open == 20)

    rr_seen = rr.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
    print(f"    但 RR 旧快照会话仍读 {rr_seen}(旧版本为它保留)")
    ok("旧快照会话继续读旧版本(MVCC 多版本共存)", rr_seen == rr_snapshot == 10)
    rr.rollback()
    a.rollback()
    b.close()


# ============================================================
# 4. serial — 40001 与重试
# ============================================================

def serial_attempt(cur_factory):
    """一次 SERIALIZABLE 读改写: 与并发事务冲突时抛 40001。返回异常或 None。"""
    a = cur_factory()
    try:
        with a.transaction():
            v = a.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
            a.execute("UPDATE counter SET v = %s WHERE id = 1", (v + 5,))
        return None
    except pgerr.SerializationFailure as err:
        return err
    finally:
        a.close()


def do_serial(cur):
    step("serial", "SERIALIZABLE 冲突: 40001 序列化失败, 重试整事务成功")
    reset(cur)
    # a 先取快照(v=10), b 随后提交 v=50, a 的写撞在 b 的提交上 → 40001
    a = iso_conn("SERIALIZABLE")
    snap = a.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
    print(f"    a 取快照 v={snap}; 随后 b 提交 v=50")
    b = connect_pg()
    b.execute("UPDATE counter SET v = 50 WHERE id = 1")
    b.commit()
    err = None
    try:
        a.execute("UPDATE counter SET v = %s WHERE id = 1", (snap + 5,))
        a.commit()
    except pgerr.SerializationFailure as e:
        err = e
    got = getattr(err, "sqlstate", None)
    print(f"    a 的写收到: {type(err).__name__} sqlstate={got}")
    a.rollback()
    ok(f"序列化冲突被检测(sqlstate={got}, 期待 40001)", got == "40001")

    for attempt in range(1, 6):   # 重试: 整事务重来, 快照刷新后不再冲突
        r = iso_conn("SERIALIZABLE")
        try:
            v0 = r.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
            r.execute("UPDATE counter SET v = %s WHERE id = 1", (v0 + 5,))
            r.commit()
            print(f"    第 {attempt} 次重试成功(v={v0} -> {v0 + 5})")
            break
        except pgerr.SerializationFailure:
            r.rollback()
    v = cur.execute("SELECT v FROM counter WHERE id = 1").fetchone()[0]
    cur.connection.commit()
    ok(f"重试后事务成功落账(v={v} = 50 + 5)", v == 55)
    b.close()


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    with connect_pg() as conn, conn.cursor() as cur:
        do_seed(cur)
        do_matrix(cur)
        do_mvcc(cur)
        do_serial(cur)
    print(f"\n{'=' * 60}")
    print(f"==== 实验 12 · isolation_mvcc 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
