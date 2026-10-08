"""
B-tree 索引与 EXPLAIN ANALYZE —— hands-on-python 第五系列（数据库）实验 07
核心要点: B-tree 原理、EXPLAIN / EXPLAIN ANALYZE、Seq Scan vs Index Scan、
          列上套函数导致索引失效、表达式索引救回、ANALYZE 统计信息

前置: ./btree_explain.sh start 已拉起容器(端口 55433, 库 lab)
生命周期(由 shell 编排):
  seed    服务端 generate_series 生成 100 万行订单(确定性 md5 数据)
  seq     无索引点查: EXPLAIN ANALYZE 实测 Seq Scan 与耗时
  index   建 B-tree 索引: 同查询走 Index Scan, 耗时对比 >= 10x
  broken  WHERE upper(email)=... 复现索引失效, 表达式索引救回
  stats   ANALYZE 前后: 规划器的行数估计从瞎猜变精准
运行: ../.venv/bin/python btree_explain.py   (由 ./btree_explain.sh 调用)
"""

import os
import sys
import time

import psycopg

CONTAINER_PORT = os.environ.get("LAB07_PORT", "55433")
CONNINFO = dict(host="127.0.0.1", port=CONTAINER_PORT, dbname="lab",
                user="postgres", password="lab")
ROWS = 1_000_000
TARGET_ID = 777_777

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


def explain_analyze(cur, sql):
    """跑 EXPLAIN ANALYZE, 返回 (计划文本, 执行毫秒)。"""
    cur.execute("EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) " + sql)
    plan = "\n".join(r[0] for r in cur.fetchall())
    ms = float(next(l for l in plan.splitlines() if "Execution Time" in l)
               .split(":")[1].strip().split(" ")[0])
    return plan, ms


# ============================================================
# 1. seed — 服务端生成 100 万行
# ============================================================

def do_seed(cur):
    step("seed", f"服务端 generate_series 生成 {ROWS:,} 行订单(确定性 md5 数据)")
    cur.execute("""
        CREATE TABLE orders (
            id          INTEGER PRIMARY KEY,   -- IDENTITY 不用: 主键本就是 B-tree
            customer_id INTEGER NOT NULL,
            email       TEXT NOT NULL,
            amount      NUMERIC(10, 2) NOT NULL
        );
    """)
    # md5(g::text) 做确定性伪数据: email 形如 user<md5前10位>@example.com
    # 注意: psycopg 参数化下, SQL 的取模 % 要写成 %%
    cur.execute("""
        INSERT INTO orders (id, customer_id, email, amount)
        SELECT g,
               (g %% 50000) + 1,
               'user' || substr(md5(g::text), 1, 10) || '@example.com',
               round((g %% 99990 + 10)::numeric / 100, 2)
        FROM generate_series(1, %s) g
    """, (ROWS,))
    cur.execute(f"UPDATE orders SET customer_id = {TARGET_ID} WHERE id = {TARGET_ID}")
    cur.execute("SELECT COUNT(*) FROM orders")
    n = cur.fetchone()[0]
    print(f"    已生成 {n:,} 行; 热查询目标 id={TARGET_ID}")
    ok(f"{ROWS:,} 行就位", n == ROWS)


# ============================================================
# 2. seq — 无索引点查(主键除外)
# ============================================================

def do_seq(cur):
    step("seq", "无索引查 customer_id: 只能 Seq Scan 全表顺序扫")
    sql = f"SELECT id, email FROM orders WHERE customer_id = {TARGET_ID}"
    plan, ms = explain_analyze(cur, sql)
    seq_lines = [l for l in plan.splitlines() if "Seq Scan" in l]
    print("\n".join("    " + l.strip() for l in seq_lines[:1]))
    print(f"    执行 {ms:.1f} ms")
    ok("计划是 Seq Scan(全表顺序扫)", "Seq Scan on orders" in plan)
    target_email = cur.execute(
        "SELECT email FROM orders WHERE customer_id = %s", (TARGET_ID,)
    ).fetchone()[0]
    print(f"    目标行存在: id={TARGET_ID} email={target_email}")
    ok("热查询目标恰 1 行(库里有这条数据)", target_email.startswith("user"))
    return ms


# ============================================================
# 3. index — 建 B-tree 后同查询
# ============================================================

def do_index(cur, seq_ms):
    step("index", "建 B-tree 索引 ANALYZE 后同查询: Index Scan")
    cur.execute("CREATE INDEX idx_orders_customer ON orders (customer_id)")
    cur.execute("ANALYZE orders")
    sql = f"SELECT id, email FROM orders WHERE customer_id = {TARGET_ID}"
    plan, ms = explain_analyze(cur, sql)
    scan_line = next(l for l in plan.splitlines()
                     if "Index" in l and "Scan" in l and "never executed" not in l)
    print("    " + scan_line.strip())
    print(f"    执行 {ms:.3f} ms")
    ratio = seq_ms / ms
    print(f"    提速 {ratio:.0f}x ({seq_ms:.1f} ms -> {ms:.3f} ms)")
    ok("计划改走 Index Scan(或 Index Only Scan)",
       "Index Scan" in plan or "Index Only Scan" in plan)
    ok(f"实测提速 >= 10x (实际 {ratio:.0f}x)", ratio >= 10)
    return ratio


# ============================================================
# 4. broken — 函数包列让索引失效, 表达式索引救回
# ============================================================

def do_broken(cur):
    step("broken", "email 列上有索引, 但 WHERE upper(email)=... 让它失效")
    cur.execute("CREATE INDEX idx_orders_email ON orders (email)")
    cur.execute("ANALYZE orders")
    email = cur.execute(
        "SELECT email FROM orders WHERE id = %s", (TARGET_ID,)
    ).fetchone()[0]

    sql_plain = f"SELECT id FROM orders WHERE email = '{email}'"
    plan_plain, ms_plain = explain_analyze(cur, sql_plain)
    print(f"    等值查询: {next(l for l in plan_plain.splitlines() if 'Scan' in l).strip()}")

    sql_upper = f"SELECT id FROM orders WHERE upper(email) = '{email.upper()}'"
    plan_upper, ms_upper = explain_analyze(cur, sql_upper)
    print(f"    套 upper(): {next(l for l in plan_upper.splitlines() if 'Scan' in l).strip()}")
    ok("等值查询走索引(B-tree 按原值排序)",
       "Index" in plan_plain and "Seq Scan on orders" not in plan_plain)
    ok("列上套函数后索引失效, 退回 Seq Scan",
       "Seq Scan on orders" in plan_upper)

    cur.execute("CREATE INDEX idx_orders_email_upper ON orders (upper(email))")
    cur.execute("ANALYZE orders")
    plan_fix, ms_fix = explain_analyze(cur, sql_upper)
    print(f"    表达式索引: {next(l for l in plan_fix.splitlines() if 'Scan' in l).strip()}")
    ok("表达式索引救回: upper() 查询重新走索引",
       "Index" in plan_fix and "Seq Scan on orders" not in plan_fix)


# ============================================================
# 5. stats — ANALYZE 统计信息
# ============================================================

def do_stats(cur):
    step("stats", "ANALYZE 统计信息: 规划器不再瞎猜行数")
    cur.execute("CREATE TABLE guess (g INT, bucket INT)")
    cur.execute("""
        INSERT INTO guess SELECT g, g % 100 FROM generate_series(1, 200000) g
    """)   # 故意不 ANALYZE
    plan_raw = [r[0] for r in cur.execute(
        "EXPLAIN SELECT COUNT(*) FROM guess WHERE bucket = 7").fetchall()]
    raw_est = next(int(l.split("rows=")[1].split()[0].strip())
                   for l in plan_raw if "Seq Scan" in l)   # 扫描节点的估计, 非 Aggregate
    cur.execute("ANALYZE guess")
    plan_analyzed = [r[0] for r in cur.execute(
        "EXPLAIN SELECT COUNT(*) FROM guess WHERE bucket = 7").fetchall()]
    est = next(int(l.split("rows=")[1].split()[0].strip())
               for l in plan_analyzed if "Seq Scan" in l)
    print(f"    无统计时估计 rows={raw_est}, ANALYZE 后估计 rows={est} (实际 2000)")
    ok(f"ANALYZE 后估计贴近实际({est} vs 2000, 误差 <= 20%)", abs(est - 2000) <= 400)


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    with connect_pg() as conn, conn.cursor() as cur:
        do_seed(cur)
        seq_ms = do_seq(cur)
        do_index(cur, seq_ms)
        do_broken(cur)
        do_stats(cur)
    print(f"\n{'=' * 60}")
    print(f"==== 实验 07 · btree_explain 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
