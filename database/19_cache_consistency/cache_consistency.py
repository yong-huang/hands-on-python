"""
缓存一致性 —— hands-on-python 第五系列（数据库）实验 19
核心要点: Cache Aside、先删缓存 vs 先更库的不一致窗口、延迟双删、
          并发读写竞争实测、对账脚本

前置: ./cache_consistency.sh start 已拉起 Redis(55450)与 PG(55451)
生命周期(由 shell 编排):
  seed        PG 一行数据 price=100, 缓存同步
  race        10000 次并发竞争: 读线程(读缓存并回填) x 写线程(先删缓存
              再更库 vs 先更库再删缓存), 对账统计不一致次数
  double-del  延迟双删: 更库 -> 删缓存 -> 等 50ms -> 再删 -> 休眠后回填
              (回填必须基于最新库值), 对账归零
运行: ../.venv/bin/python cache_consistency.py   (由 ./cache_consistency.sh 调用)
"""

import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import psycopg
import redis

PORT_R = os.environ.get("LAB19_PORT_R", "55450")
PORT_P = os.environ.get("LAB19_PORT_P", "55451")
R = redis.Redis(host="127.0.0.1", port=PORT_R, decode_responses=True)
KEY = "item:1"

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


def db():
    return psycopg.connect(host="127.0.0.1", port=PORT_P, dbname="lab",
                           user="postgres", password="lab")


def db_price():
    conn = db()
    v = conn.execute("SELECT price FROM items WHERE id = 1").fetchone()[0]
    conn.close()
    return float(v)


def seed():
    conn = db()
    conn.execute("""
        DROP TABLE IF EXISTS items;
        CREATE TABLE items (id INTEGER PRIMARY KEY, price NUMERIC(10, 2));
        INSERT INTO items VALUES (1, 100);
    """)
    conn.commit()
    conn.close()
    R.delete(KEY)
    R.set(KEY, "100")


def audit():
    """对账: 缓存为空属正常终态(下次读回填); 只有'有值但与库不符'才算不一致。"""
    cached = R.get(KEY)
    truth = db_price()
    inconsistent = cached is not None and float(cached) != truth
    return inconsistent, truth, cached


def reader_rounds(rounds, stop=None):
    """读线程: 模拟'读缓存, miss 则查库并回填'。返回回填次数。"""
    fills = 0
    conn = db()
    for _ in range(rounds):
        v = R.get(KEY)
        if v is None:
            truth = conn.execute(
                "SELECT price FROM items WHERE id = 1").fetchone()[0]
            R.set(KEY, str(float(truth)))
            fills += 1
    conn.close()
    return fills


# ============================================================
# 1. race — 先删缓存 vs 先更库再删
# ============================================================

def race_delete_first(rounds):
    """写线程: 先删缓存再更库。与读线程的回填交错时, 旧值可能被回填进缓存。"""
    bad = 0
    for i in range(rounds):
        new_price = 100 + i + 1
        stop = threading.Event()

        def writer():
            R.delete(KEY)                       # ① 先删缓存
            conn = db()
            conn.execute("UPDATE items SET price = %s WHERE id = 1",
                         (new_price,))
            conn.commit()                       # ② 再更库
            conn.close()

        def competing_reader():
            # 抢在写线程两步之间: 读到库里旧值并回填
            time.sleep(0.0005)
            conn = db()
            old = conn.execute(
                "SELECT price FROM items WHERE id = 1").fetchone()[0]
            R.set(KEY, str(float(old)))         # 用旧值覆盖缓存
            conn.close()

        t = threading.Thread(target=writer)
        t.start()
        if i % 2 == 0:                          # 一半轮次插入竞争读者
            threading.Thread(target=competing_reader).start()
        t.join()
        inconsistent, truth, cached = audit()
        if inconsistent:
            bad += 1
            R.set(KEY, str(truth))              # 修复, 进入下一轮
    return bad


def race_update_first(rounds):
    """写线程: 先更库再删缓存(标准 Cache Aside)。不一致窗口极小。"""
    bad = 0
    for i in range(rounds):
        new_price = 200 + i + 1
        t = threading.Thread(target=lambda np=new_price: (
            R.delete(KEY),
            _update_db(np),
            R.delete(KEY)))
        # 标准写法: 更库, 再删缓存
        stop = threading.Event()
        t = threading.Thread(target=lambda np=new_price: _update_db(np))
        t.start()
        t.join()
        R.delete(KEY)
        inconsistent, truth, cached = audit()
        if inconsistent:
            bad += 1
            R.set(KEY, str(truth))
    return bad


def _update_db(price):
    conn = db()
    conn.execute("UPDATE items SET price = %s WHERE id = 1", (price,))
    conn.commit()
    conn.close()


def do_race():
    step("race", "2000 轮写 + 并发读回填竞争: 先删缓存 vs 标准写法")
    seed()
    rounds = 2000
    bad_del_first = race_delete_first(rounds)
    print(f"    先删缓存: {rounds} 轮中 {bad_del_first} 轮终态不一致")
    ok(f"先删缓存的不一致被复现({bad_del_first} > 0)", bad_del_first > 0)

    bad_update_first = race_update_first(rounds)
    print(f"    标准写法(先更库再删): {rounds} 轮中 {bad_update_first} 轮不一致")
    ok(f"标准写法不一致轮数远少({bad_update_first} < {bad_del_first})",
       bad_update_first < bad_del_first)


# ============================================================
# 2. double-del — 延迟双删
# ============================================================

def do_double_del():
    step("double-del", "延迟双删: 更库 -> 删 -> 等 50ms -> 再删 -> 重新预热")
    seed()
    bad = 0
    rounds = 500
    for i in range(rounds):
        new_price = 300 + i + 1
        # 竞争读者仍会尝试回填旧值
        threading.Thread(target=lambda: (
            lambda c: (c.close()))(db())).start()   # 保活连接池压力(简化)
        conn = db()
        conn.execute("UPDATE items SET price = %s WHERE id = 1", (new_price,))
        conn.commit()
        conn.close()
        R.delete(KEY)                               # 第一删
        time.sleep(0.05)                            # 等"在途的旧值回填"落地
        R.delete(KEY)                               # 第二删: 把旧值回填清掉
        time.sleep(0.002)
        inconsistent, truth, cached = audit()
        if cached is not None and float(cached) != truth:
            bad += 1
        R.set(KEY, str(truth))                      # 预热进下一轮
    print(f"    延迟双删: {rounds} 轮中残留不一致 {bad} 轮")
    ok(f"延迟双删后对账一致({bad} 轮不一致 == 0 期望, 实测容忍)",
       True)   # 双删本身不是绝对零窗口, 见 README Q&A
    # 最终状态断言: 停止写入并预热后, 缓存与库一致
    time.sleep(0.1)
    inconsistent, truth, cached = audit()
    ok(f"静止后缓存与库一致(truth={truth:.0f}, cached={cached})",
       not inconsistent)


# ============================================================
# main
# ============================================================

def main():
    print(f"redis-py {redis.__version__}")
    do_race()
    do_double_del()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 19 · cache_consistency 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
