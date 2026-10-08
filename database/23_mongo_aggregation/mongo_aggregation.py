"""
聚合管道 —— hands-on-python 第五系列（数据库）实验 23
核心要点: $match/$group/$sort/$lookup/$unwind、管道执行顺序、
          与 SQL GROUP BY/JOIN 的映射、同数据双实现逐行 diff

前置: ./mongo_aggregation.sh start 已拉起容器(端口 55455)并清理临时 SQLite
生命周期(由 shell 编排):
  seed      同构销售数据(3 区域 x 3 类目 x 90 天, ~8100 行)灌入 SQLite 与 Mongo
  sql       SQLite 版报表: 区域汇总 / 类目 TopN / 带关联的明细报表
  pipeline  Mongo 聚合管道版同三问, 逐行 diff 断言为 0
  pipeline2 管道结构断言: 必含 $match/$group/$sort/$lookup/$unwind 各一
运行: ../.venv/bin/python mongo_aggregation.py   (由 ./mongo_aggregation.sh 调用)
"""

import os
import sqlite3
import sys

import pymongo

PORT = int(os.environ.get("LAB23_PORT", "55455"))
SQLITE_DB = "/tmp/lab23_sales.db"
CLIENT = pymongo.MongoClient("127.0.0.1", PORT)
DB = CLIENT["sales"]

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


# ============================================================
# 1. seed — 同构数据灌两库
# ============================================================

def do_seed():
    step("seed", "3 区域 x 3 类目 x 90 天销售(~8100 行)灌 SQLite 与 Mongo")
    conn = sqlite3.connect(SQLITE_DB)
    conn.execute("""
        CREATE TABLE sales (
            id INTEGER PRIMARY KEY, region TEXT, category TEXT,
            day TEXT, amount REAL);
    """)
    rows = []
    n = 0
    for r in ("north", "south", "west"):
        for c in ("book", "toy", "food"):
            for d in range(1, 91):
                day = f"2026-{(d - 1) // 30 + 1:02d}-{(d - 1) % 30 + 1:02d}"
                n += 1
                rows.append((n, r, c, day, (n % 997) + 1))
    conn.executemany("INSERT INTO sales VALUES (?,?,?,?,?)", rows)
    conn.commit()

    docs = [{"region": r[1], "category": r[2], "day": r[3], "amount": r[4]}
            for r in conn.execute("SELECT * FROM sales")]
    DB.sales.insert_many(docs)
    n_mongo = DB.sales.count_documents({})
    conn.close()
    print(f"    SQLite {len(rows):,} 行, Mongo {n_mongo:,} 行(同构)")
    ok(f"两库各 {len(rows):,} 行(3x3x90=810)", len(rows) == 810 and n_mongo == 810)


# ============================================================
# 2. sql — SQLite 三问
# ============================================================

def sql_reports(conn):
    q1 = """SELECT region, SUM(amount) AS total FROM sales
            WHERE amount > 500 GROUP BY region ORDER BY region"""
    r1 = conn.execute(q1).fetchall()

    q2 = """SELECT category, SUM(amount) AS total FROM sales
            GROUP BY category ORDER BY total DESC LIMIT 3"""
    r2 = conn.execute(q2).fetchall()

    q3 = """SELECT s.region, cat.cat_group, COUNT(*) AS n
            FROM sales s
            JOIN categories cat ON s.category = cat.category
            WHERE s.day LIKE '2026-01%' AND s.amount > 300
            GROUP BY s.region, cat.cat_group
            ORDER BY s.region, cat.cat_group"""
    r3 = conn.execute(q3).fetchall()
    return r1, r2, r3


# ============================================================
# 3. pipeline — Mongo 三问 + 逐行 diff
# ============================================================

def do_pipeline(conn):
    step("pipeline", "同三问的 Mongo 聚合管道, 与 SQLite 版逐行 diff")
    p1 = [
        {"$match": {"amount": {"$gt": 500}}},
        {"$group": {"_id": "$region", "total": {"$sum": "$amount"}}},
        {"$sort": {"_id": 1}},
    ]
    m1 = [(d["_id"], d["total"]) for d in DB.sales.aggregate(p1)]

    p2 = [
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}},
        {"$limit": 3},
    ]
    m2 = [(d["_id"], d["total"]) for d in DB.sales.aggregate(p2)]

    p3 = [
        {"$match": {"day": {"$regex": "^2026-01"}, "amount": {"$gt": 300}}},
        {"$lookup": {"from": "categories", "localField": "category",
                     "foreignField": "category", "as": "cat"}},
        {"$unwind": "$cat"},
        {"$group": {"_id": {"region": "$region", "cat": "$cat.cat_group"},
                    "n": {"$sum": 1}}},
        {"$sort": {"_id.region": 1, "_id.cat": 1}},
    ]
    m3 = [(d["_id"]["region"], d["_id"]["cat"], d["n"])
          for d in DB.sales.aggregate(p3)]

    r1, r2, r3 = sql_reports(conn)
    print(f"    Q1 区域汇总: SQL {len(r1)} 行 vs Mongo {len(m1)} 行")
    ok("Q1 区域汇总逐行一致", [(a, round(b)) for a, b in r1] ==
       [(a, round(b)) for a, b in m1])
    print(f"    Q2 类目 Top3: SQL {[a for a, _ in r2]} vs Mongo {[a for a, _ in m2]}")
    ok("Q2 类目 Top3 逐行一致", [(a, round(b)) for a, b in r2] ==
       [(a, round(b)) for a, b in m2])
    ok("Q3 JOIN+分组逐行一致", [(a, c, d) for a, c, d in r3] ==
       [(a, b, int(d)) for a, b, d in m3])


# ============================================================
# 4. structure — 管道结构断言
# ============================================================

def do_structure():
    step("structure", "管道五操作符各至少一次: $match/$group/$sort/$lookup/$unwind")
    pipe = [
        {"$match": {"amount": {"$gt": 300}, "day": {"$regex": "^2026-0[12]"}}},
        {"$lookup": {"from": "categories", "localField": "category",
                     "foreignField": "category", "as": "cat"}},
        {"$unwind": "$cat"},
        {"$group": {"_id": {"r": "$region", "c": "$cat.cat_group"},
                    "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}},
        {"$limit": 5},
    ]
    stages = [list(s.keys())[0] for s in pipe]
    required = {"$match", "$lookup", "$unwind", "$group", "$sort"}
    missing = required - set(stages)
    n = sum(1 for _ in DB.sales.aggregate(pipe))
    print(f"    管道阶段: {stages}; 结果 {n} 元素")
    ok(f"五操作符齐备({missing or '无缺失'})", not missing)
    ok("管道有产出", n > 0)


# ============================================================
# main
# ============================================================

def main():
    print(f"pymongo {pymongo.version}; server {DB.client.server_info()['version']}")
    DB.categories.delete_many({})
    DB.categories.insert_many([
        {"category": "book", "cat_group": "文化"},
        {"category": "toy", "cat_group": "玩乐"},
        {"category": "food", "cat_group": "食品"},
    ])
    do_seed()
    conn = sqlite3.connect(SQLITE_DB)
    conn.execute("""CREATE TABLE IF NOT EXISTS categories
                    (category TEXT PRIMARY KEY, cat_group TEXT)""")
    for c, g in (("book", "文化"), ("toy", "玩乐"), ("food", "食品")):
        conn.execute("INSERT OR IGNORE INTO categories VALUES (?,?)", (c, g))
    conn.commit()
    do_pipeline(conn)
    do_structure()
    conn.close()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 23 · mongo_aggregation 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
