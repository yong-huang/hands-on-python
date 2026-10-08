"""
缓存穿透 / 击穿 / 雪崩 —— hands-on-python 第五系列（数据库）实验 18
核心要点: 穿透(查不存在)+空值缓存、击穿(热点过期)+互斥重建、
          雪崩(集体过期)+随机 TTL、DB 查询计数器做数字级对比

前置: ./cache_penetration.sh start 已拉起 Redis(55447)与 PG(55449)
生命周期(由 shell 编排):
  seed      PG 5 万行商品 + DB 查询计数器(计数函数包一层)
  penet     穿透: 1000 次查不存在的 id, 裸奔 DB 1000 次; 空值缓存后 DB 1 次
  break     击穿: 热点 key 过期瞬间 50 并发, 裸奔 50 次重建; 互斥锁后 <=3 次
  avalanche 雪崩: 200 键同 TTL 集体到期, DB 峰值高; 随机 TTL 后峰值显著下降
运行: ../.venv/bin/python cache_penetration.py   (由 ./cache_penetration.sh 调用)
"""

import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import psycopg
import redis

PORT_R = os.environ.get("LAB18_PORT_R", "55447")
PORT_P = os.environ.get("LAB18_PORT_P", "55449")
R = redis.Redis(host="127.0.0.1", port=PORT_R, decode_responses=True)

PASS_COUNT = 0
DB_COUNT = 0
COUNT_LOCK = threading.Lock()


def ok(label, cond, detail=""):
    global PASS_COUNT
    if not cond:
        print(f"  [FAIL] {label} {detail}")
        raise AssertionError(label)
    PASS_COUNT += 1
    print(f"  [PASS] {label}")


def step(name, desc):
    print(f"\n=====> [{name}] {desc}")


def reset_state():
    R.flushdb()
    global DB_COUNT
    DB_COUNT = 0


def db_query(product_id):
    """带计数的 DB 查询: 所有实验共用这一个入口, 计数即 DB 压力。"""
    global DB_COUNT
    with COUNT_LOCK:
        DB_COUNT += 1
    conn = psycopg.connect(host="127.0.0.1", port=PORT_P, dbname="lab",
                           user="postgres", password="lab")
    try:
        row = conn.execute(
            "SELECT name FROM products WHERE id = %s", (product_id,)
        ).fetchone()
        time.sleep(0.005)   # 模拟真实查询开销
        return row[0] if row else None
    finally:
        conn.close()


# ============================================================
# 1. seed
# ============================================================

def do_seed():
    step("seed", "PG 建 5 万行商品表(供存在的与不存在的查询)")
    conn = psycopg.connect(host="127.0.0.1", port=PORT_P, dbname="lab",
                           user="postgres", password="lab")
    conn.execute("""
        DROP TABLE IF EXISTS products;
        CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
        INSERT INTO products SELECT g, 'product-' || g
        FROM generate_series(1, 50000) g;
    """)
    conn.commit()
    n = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    conn.close()
    ok(f"products {n:,} 行就位", n == 50000)


# ============================================================
# 2. penet — 穿透与空值缓存
# ============================================================

def query_naive(product_id):
    v = R.get(f"p:{product_id}")
    if v is not None:
        return v
    name = db_query(product_id)
    if name is not None:
        R.set(f"p:{product_id}", name, ex=60)
    return name


def query_guarded(product_id):
    key = f"gp:{product_id}"
    v = R.get(key)
    if v is not None:
        return None if v == "\x00" else v       # 空值标记
    name = db_query(product_id)
    if name is None:
        R.set(key, "\x00", ex=10)               # 空值缓存 10 秒
    else:
        R.set(key, name, ex=60)
    return name


def do_penetrate():
    step("penetrate", "穿透: 对同一个不存在的 id 连查 1000 次(如被刷的无效接口)")
    conn = psycopg.connect(host="127.0.0.1", port=PORT_P, dbname="lab",
                           user="postgres", password="lab")
    missing = conn.execute(
        "SELECT COUNT(*) FROM products WHERE id > 50000").fetchone()[0]
    conn.close()
    reset_state()
    for _ in range(1000):
        query_naive(50001)
    n_naive = DB_COUNT
    print(f"    裸奔: 1000 次请求打到 DB {n_naive} 次(缓存不拦不存在的查询)")
    reset_state()
    for _ in range(1000):
        query_guarded(50001)
    n_guarded = DB_COUNT
    print(f"    空值缓存: 同样 1000 次请求, DB 只被查询 {n_guarded} 次")
    ok(f"裸奔 DB 1000 次({n_naive})", n_naive == 1000)
    ok(f"空值缓存后 DB 仅 {n_guarded} 次(=1)", n_guarded == 1)
    ok("不存在的库表数据未被动过", missing == 0)


# ============================================================
# 3. break — 击穿与互斥重建
# ============================================================

def hammer_key(key, n_clients, builder):
    """n_clients 并发同时请求同一个刚过期的 key。返回 DB 重建次数。"""
    reset_state()
    R.delete(key)
    barrier = threading.Barrier(n_clients)

    def client(_):
        barrier.wait()                    # 同时起跑
        builder(key)

    with ThreadPoolExecutor(max_workers=n_clients) as pool:
        list(pool.map(client, range(n_clients)))
    return DB_COUNT


def do_break():
    step("break", "击穿: 热点 key 过期瞬间 50 并发齐打")
    def naive_build(key):
        name = db_query(1)
        if name:
            R.set(key, name, ex=60)

    n_naive = hammer_key("hot:naive", 50, naive_build)
    print(f"    裸奔: 50 并发齐打, DB 重建 {n_naive} 次")

    def mutex_build(key):
        got = R.set(f"lock:{key}", "1", nx=True, ex=5)   # 互斥: 只有 1 人能建
        if got:
            try:
                name = db_query(1)
                if name:
                    R.set(key, name, ex=60)
            finally:
                R.delete(f"lock:{key}")
        else:
            time.sleep(0.05)
            if not R.exists(key):
                time.sleep(0.1)

    n_mutex = hammer_key("hot:mutex", 50, mutex_build)
    print(f"    互斥锁: 同样 50 并发, DB 重建 {n_mutex} 次")
    ok(f"裸奔重建 {n_naive} 次(并发全打到 DB)", n_naive >= 40)
    ok(f"互斥锁后重建 <=3 次(实测 {n_mutex})", n_mutex <= 3)


# ============================================================
# 4. avalanche — 雪崩与随机 TTL
# ============================================================

def do_avalanche(cur):
    step("avalanche", "雪崩: 200 键同一 TTL 集体到期 vs 随机 TTL 错峰")
    import random
    rng = random.Random(42)
    conn = psycopg.connect(host="127.0.0.1", port=PORT_P, dbname="lab",
                           user="postgres", password="lab")

    def hammer_all(n=200):
        """n 并发同时打全部键(按当前缓存状态), 返回本阶段 DB 次数。"""
        global DB_COUNT
        start = DB_COUNT
        with ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(lambda i: db_query(i) if R.get(f"av:{i}") is None
                          else None, range(n)))
        used = DB_COUNT - start
        return used

    def rebuild(ttl_fn):
        pipe = R.pipeline()
        for i in range(200):
            pipe.set(f"av:{i}", f"v-{i}", ex=ttl_fn(i))
        pipe.execute()

    rebuild(lambda i: 3)
    time.sleep(3.2)                 # 等固定 TTL 全部到期
    fixed = hammer_all()
    print(f"    同 TTL(3s): 集体到期后齐打 -> DB {fixed} 次(全穿透)")

    rebuild(lambda i: 2 + rng.randint(0, 3))   # TTL ∈ [2,5]s 错峰
    time.sleep(3.5)                 # 2~3s 档已过期, 4~5s 档仍活
    rand = hammer_all()
    ratio = rand / fixed if fixed else 0
    print(f"    随机 TTL(2~5s): 到期错峰 -> DB {rand} 次(为固定 TTL 的 "
          f"{ratio:.0%})")
    ok(f"同 TTL 集体过期: DB {fixed} 次(全穿透)", fixed >= 190)
    ok(f"随机 TTL 显著下降({rand} < {fixed * 0.85:.0f})", rand < fixed * 0.85)
    conn.close()


def cur_or_new():
    return psycopg.connect(host="127.0.0.1", port=PORT_P, dbname="lab",
                           user="postgres", password="lab").cursor()


# ============================================================
# main
# ============================================================

def main():
    print(f"redis-py {redis.__version__}")
    do_seed()
    do_penetrate()
    do_break()
    do_avalanche(None)
    print(f"\n{'=' * 60}")
    print(f"==== 实验 18 · cache_penetration 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
