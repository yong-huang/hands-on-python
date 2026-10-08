"""
慢查询诊断与重写 —— hands-on-python 第五系列（数据库）实验 09
核心要点: pg_stat_statements 慢查询排行、深分页(OFFSET 陷阱)与 keyset 改写、
          相关子查询改 JOIN、SELECT * 宽行代价

前置: ./slow_query_tuning.sh start 已拉起容器(端口 55435,
      shared_preload_libraries=pg_stat_statements)
生命周期(由 shell 编排):
  preload  CREATE EXTENSION 并确认共享库生效
  seed     20 万行订单 + 1 万客户(宽行 note 列, 确定性数据)
  slow     重置统计, 各跑 3 类慢查询若干次: 深分页/相关子查询/SELECT *
  top      pg_stat_statements Top5 断言: 三条慢查询全部上榜
  rewrite  keyset 改写(<=1/10 耗时 + 逐行 diff 为空)与子查询改 JOIN(结果一致)
运行: ../.venv/bin/python slow_query_tuning.py   (由 ./slow_query_tuning.sh 调用)
"""

import os
import sys
import time

import psycopg

PORT = os.environ.get("LAB09_PORT", "55435")
CONNINFO = dict(host="127.0.0.1", port=PORT, dbname="lab",
                user="postgres", password="lab")
ORDERS = 200_000
CUSTOMERS = 10_000
OFFSET_AT = 150_000

PASS_COUNT = 0

# 三条"故意慢"的查询(指纹 = pg_stat_statements 归一化后仍保留的结构串)
Q_DEEP = ("SELECT * FROM orders ORDER BY id OFFSET "
          f"{OFFSET_AT} LIMIT 10")                       # 深分页
Q_SUB = ("""SELECT c.id, c.name,
       (SELECT count(*) FROM orders o WHERE o.customer_id = c.id) AS n
       FROM customers c WHERE c.id <= 2000 ORDER BY c.id""")   # 相关子查询
Q_STAR = ("SELECT * FROM orders WHERE status = 's3' AND amount > 40")  # 宽行
Q_KEYSET = (f"SELECT * FROM orders ORDER BY id "
            f"OFFSET {OFFSET_AT} LIMIT 10")             # 占位, 下面真改写见 rewrite 步


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


def timed(cur, sql):
    """真实执行并取回全部行, 返回 (rows, 毫秒)。"""
    t0 = time.perf_counter()
    rows = cur.execute(sql).fetchall()
    return rows, (time.perf_counter() - t0) * 1000


# ============================================================
# 1. preload — pg_stat_statements 就位
# ============================================================

def do_preload(cur):
    step("preload", "确认共享库生效并 CREATE EXTENSION")
    cur.execute("SHOW shared_preload_libraries")
    libs = cur.fetchone()[0]
    print(f"    shared_preload_libraries = {libs}")
    ok("pg_stat_statements 已预载", "pg_stat_statements" in libs)
    cur.execute("CREATE EXTENSION IF NOT EXISTS pg_stat_statements")
    cur.connection.commit()
    ok("扩展创建成功", True)


# ============================================================
# 2. seed — 确定性数据
# ============================================================

def do_seed(cur):
    step("seed", f"{ORDERS:,} 行宽表订单(note ~100B) + {CUSTOMERS:,} 客户")
    cur.execute("CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL)")
    cur.execute("""
        CREATE TABLE orders (
            id          INTEGER PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            status      TEXT NOT NULL,
            amount      NUMERIC(10, 2) NOT NULL,
            note        TEXT NOT NULL
        );
    """)
    cur.execute("""
        INSERT INTO customers SELECT g, 'customer-' || g
        FROM generate_series(1, %s) g
    """, (CUSTOMERS,))
    cur.execute("""
        INSERT INTO orders
        SELECT g, g %% 10000 + 1, 's' || (g %% 10),
               round((g %% 9990 + 10)::numeric / 100, 2),
               rpad('n', 100, md5(g::text))
        FROM generate_series(1, %s) g
    """, (ORDERS,))
    cur.execute("CREATE INDEX idx_orders_customer ON orders (customer_id)")
    cur.execute("ANALYZE orders; ANALYZE customers")
    cur.connection.commit()
    n = cur.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    ok(f"{n:,} 行就位(全表 note 列每行 ~100B, 专为 SELECT * 铺垫)", n == ORDERS)


# ============================================================
# 3. slow — 重置统计后跑三类慢查询
# ============================================================

def do_slow(cur):
    step("slow", "pg_stat_statements_reset 后, 三类慢查询各跑 3 遍")
    cur.execute("SELECT pg_stat_statements_reset()")
    cur.connection.commit()
    for label, sql in (("深分页 OFFSET 15 万", Q_DEEP),
                       ("相关子查询 2000 客户", Q_SUB),
                       ("SELECT * 宽行过滤", Q_STAR)):
        _, ms = timed(cur, sql)
        print(f"    {label:<18} 首跑 {ms:.1f} ms")
    # 再各跑 2 遍让 total_exec_time 稳居 Top
    for sql in (Q_DEEP, Q_SUB, Q_STAR):
        timed(cur, sql)
        timed(cur, sql)
    cur.connection.commit()
    ok("三类慢查询各执行 3 遍完成", True)


# ============================================================
# 4. top — pg_stat_statements 排行榜断言
# ============================================================

def do_top(cur):
    step("top", "读 pg_stat_statements Top5, 三条慢查询应全部上榜")
    cur.execute("""
        SELECT query, calls, mean_exec_time, total_exec_time
        FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5
    """)
    rows = cur.fetchall()
    print("    Top5 (total_exec_time 降序):")
    for q, calls, mean, total in rows:
        head = " ".join(q.split())[:66]
        print(f"      [{calls:>2} 次 mean {mean:8.2f} ms total {total:9.2f} ms] {head}")
    top_text = "\n".join(r[0] for r in rows)
    ok("深分页查询上榜(指纹: OFFSET)", "OFFSET" in top_text)
    ok("相关子查询上榜(指纹: count(*) ... customer_id = c.id)",
       "customer_id = c.id" in top_text)
    ok("SELECT * 宽行查询上榜(指纹: status = $1 AND amount > $2)",
       "status = $1" in top_text)
    ours = sum(1 for f in ("OFFSET", "customer_id = c.id", "status = $1")
               if f in top_text)
    ok(f"三条慢查询占 Top5 中 {ours} 席(>=3 即与构造意图一致)", ours >= 3)
    return rows


# ============================================================
# 5. rewrite — keyset 与 JOIN 两条改写
# ============================================================

def do_rewrite(cur, top_rows):
    step("rewrite", "深分页改 keyset; 相关子查询改 LEFT JOIN + GROUP BY")

    # -- keyset: OFFSET 版与 keyset 版必须同一批行, 且耗时 <= 1/10
    q_offset = f"SELECT id FROM orders ORDER BY id OFFSET {OFFSET_AT} LIMIT 10"
    q_keyset = f"SELECT id FROM orders WHERE id > {OFFSET_AT} ORDER BY id LIMIT 10"
    off_rows, off_ms = timed(cur, q_offset)
    key_rows, key_ms = timed(cur, q_keyset)
    print(f"    OFFSET 版 {off_ms:.2f} ms vs keyset 版 {key_ms:.3f} ms")
    ok("两版取回同一批 id(逐行 diff 为空)",
       [r[0] for r in off_rows] == [r[0] for r in key_rows])
    ratio = off_ms / key_ms if key_ms else float("inf")
    print(f"    提速 {ratio:.0f}x")
    ok(f"keyset 耗时 <= 1/10 (实际 1/{ratio:.0f})", key_ms <= off_ms / 10)

    # -- 相关子查询改 JOIN: 结果逐行一致, 耗时对比记录
    q_join = ("""SELECT c.id, c.name, count(o.id) AS n
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       WHERE c.id <= 2000 GROUP BY c.id, c.name ORDER BY c.id""")
    sub_rows, sub_ms = timed(cur, Q_SUB)
    join_rows, join_ms = timed(cur, q_join)
    same = ([(r[0], r[2]) for r in sub_rows] ==
            [(r[0], int(r[2])) for r in join_rows])
    print(f"    相关子查询 {sub_ms:.1f} ms vs JOIN 改写 {join_ms:.1f} ms "
          f"(2000 行结果一致={same})")
    ok("子查询版与 JOIN 版逐行结果一致(客户id + 订单数)", same)
    ok(f"JOIN 改写不慢于子查询({join_ms:.1f} <= {sub_ms:.1f})", join_ms <= sub_ms)

    # -- SELECT * 的代价: 只取需要的列, 传输行宽骤降(记录性断言)
    star_rows, star_ms = timed(cur, Q_STAR)
    slim_rows, slim_ms = timed(
        cur, "SELECT id, amount FROM orders WHERE status = 's3' AND amount > 40")
    print(f"    SELECT * 取回 {len(star_rows)} 行宽行 {star_ms:.1f} ms; "
          f"只取 id+amount {len(slim_rows)} 行 {slim_ms:.1f} ms")
    ok("投影裁剪后结果集行数一致", len(star_rows) == len(slim_rows))


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    with connect_pg() as conn, conn.cursor() as cur:
        do_preload(cur)
        do_seed(cur)
        do_slow(cur)
        top_rows = do_top(cur)
        do_rewrite(cur, top_rows)
    print(f"\n{'=' * 60}")
    print(f"==== 实验 09 · slow_query_tuning 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
