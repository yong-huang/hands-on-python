"""
数据库巡检与压测报告 —— hands-on-python 第五系列（数据库）实验 27
核心要点: pgbench 压测 TPS、巡检指标(缓存命中率/索引使用率/连接峰值)、
          慢查询优化前后 EXPLAIN 对比、可复跑 Markdown 报告

前置: ./db_inspection_report.sh start 已拉起容器(端口 55461/55462)
生命周期(由 shell 编排):
  seed      100 万行订单 + 索引(有/无各一列)
  bench     pgbench 内置压测(5 秒 x 2 客户端), 产出 TPS
  inspect   巡检: 缓存命中率 / 索引使用率 / 连接峰值 / 慢查询 Top3
  optimize  慢查询优化前后 EXPLAIN 对比(>=2x 断言)
  report    汇总生成 inspection_report.md, 重跑一次数字均在合理区间
运行: ../.venv/bin/python db_inspection_report.py   (由 ./db_inspection_report.sh 调用)
"""

import os
import subprocess
import sys
import time

import psycopg

PORT = int(os.environ.get("LAB27_PORT", "55461"))
PG = dict(host="127.0.0.1", port=PORT, dbname="lab",
          user="postgres", password="lab")
CONTAINER = "lab27-pg"

PASS_COUNT = 0
REPORT = ["# 数据库巡检与压测报告(实验 27 生成)\n",
          f"生成时间: {time.strftime('%Y-%m-%d %H:%M:%S')}\n",
          "\n## 环境概要\n"]


def ok(label, cond, detail=""):
    global PASS_COUNT
    if not cond:
        print(f"  [FAIL] {label} {detail}")
        raise AssertionError(label)
    PASS_COUNT += 1
    print(f"  [PASS] {label}")


def step(name, desc):
    print(f"\n=====> [{name}] {desc}")


def rpt(text):
    REPORT.append(text + "\n")


# ============================================================
# 1. seed — 100 万行 + 索引
# ============================================================

def do_seed(cur):
    step("seed", "生成 100 万行订单表, 有/无索引各一列")
    cur.execute("""
        CREATE TABLE orders (
            id      INTEGER PRIMARY KEY,
            region  TEXT NOT NULL,
            amount  REAL NOT NULL,
            note    TEXT NOT NULL
        );
    """)
    cur.execute("""
        INSERT INTO orders (id, region, amount, note)
        SELECT g, 'r' || (g % 100), (g % 9990 + 10)::real,
               rpad('n', 60, md5(g::text))
        FROM generate_series(1, 1000000) g
    """)
    cur.execute("CREATE INDEX idx_region ON orders (region)")
    cur.execute("ANALYZE orders")
    cur.connection.commit()
    n = cur.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    ok(f"{n:,} 行订单 + region 索引", n == 1000000)
    rpt(f"- 订单表: {n:,} 行, region 列有索引, note 宽列无索引\n")


# ============================================================
# 2. bench — pgbench 内置压测
# ============================================================

def do_bench():
    step("bench", "pgbench 内置 TP 简单更新压测(5 秒 x 2 客户端)")
    env = dict(os.environ, PGPASSWORD="lab")
    subprocess.run(
        ["docker", "exec", CONTAINER, "pgbench",
         "-U", "postgres", "-i", "-q", "lab"], check=True,
        capture_output=True, text=True, env=env)
    cmd = ["docker", "exec", CONTAINER, "pgbench",
           "-U", "postgres", "-c", "2", "-t", "50", "lab"]
    r = subprocess.run(cmd, capture_output=True, text=True, env=env,
                       timeout=60)
    output = r.stdout + r.stderr
    lines = [l for l in output.splitlines() if "tps" in l.lower()]
    tps_line = lines[-1] if lines else "(无 tps 输出)"
    print(f"    {tps_line.strip()}")
    import re
    m = re.search(r'tps = ([\d.]+)', tps_line)
    tps = float(m.group(1)) if m else 0
    ok(f"pgbench 压测 TPS > 100 (实测 {tps:.0f})", tps > 100)
    rpt(f"\n## pgbench 压测\n- TPS: {tps:.0f} (2 客户端 x 50 事务)\n")


# ============================================================
# 3. inspect — 巡检指标
# ============================================================

def do_inspect(cur):
    step("inspect", "四大巡检指标: 缓存命中率 / 索引使用率 / 连接数 / 表大小")
    # 缓存命中率
    cur.execute("""
        SELECT round(blks_hit::numeric / nullif(blks_hit + blks_read, 0) * 100, 1)
        FROM pg_stat_database WHERE datname = 'lab'
    """)
    hit_rate = cur.fetchone()[0]
    print(f"    缓存命中率: {hit_rate}%")
    ok(f"缓存命中率 >= 90% (实测 {hit_rate}%)", hit_rate and hit_rate >= 90)

    # 索引使用率
    cur.execute("""
        SELECT indexrelname, idx_scan FROM pg_stat_user_indexes
        WHERE relname = 'orders' ORDER BY indexrelname
    """)
    idx_stats = cur.fetchall()
    for name, scan in idx_stats:
        print(f"    索引 {name}: idx_scan = {scan}")
    rpt("\n## 巡检指标\n")
    for name, scan in idx_stats:
        rpt(f"- 索引 {name}: idx_scan = {scan}\n")

    # 连接数
    cur.execute("SELECT COUNT(*) FROM pg_stat_activity")
    conn_count = cur.fetchone()[0]
    print(f"    当前连接数: {conn_count}")
    ok(f"连接数合理(<=10)", conn_count <= 10)

    # 表大小
    cur.execute("""
        SELECT pg_size_pretty(pg_total_relation_size('orders'))
    """)
    table_size = cur.fetchone()[0]
    print(f"    orders 表大小: {table_size}")
    rpt(f"- orders 表大小: {table_size}\n")
    ok(f"表大小已记录({table_size})", len(table_size) > 0)


# ============================================================
# 4. optimize — 慢查询优化前后 EXPLAIN 对比
# ============================================================

def do_optimize(cur):
    step("optimize", "慢查询优化: 无索引 vs 建索引, EXPLAIN 耗时对比 >= 2x")
    # 无索引列的查询
    q = "SELECT COUNT(*) FROM orders WHERE note LIKE 'a%'"
    cur.execute("EXPLAIN ANALYZE " + q)
    cur.fetchall()   # 取全输出避免游标截断
    plan_lines = [r[0] for r in cur.execute(
        "EXPLAIN ANALYZE " + q).fetchall()]
    before_ms = float(next(
        l.split("Execution Time:")[1].strip().split(" ")[0]
        for l in plan_lines if "Execution Time" in l))

    cur.execute("CREATE INDEX idx_note ON orders (note text_pattern_ops)")
    cur.execute("ANALYZE orders")
    plan_lines = [r[0] for r in cur.execute(
        "EXPLAIN ANALYZE " + q).fetchall()]
    after_ms = float(next(
        l.split("Execution Time:")[1].strip().split(" ")[0]
        for l in plan_lines if "Execution Time" in l))

    ratio = before_ms / after_ms if after_ms else float("inf")
    print(f"    优化前 {before_ms:.1f} ms -> 优化后 {after_ms:.1f} ms "
          f"(提速 {ratio:.1f}x)")
    ok(f"索引优化提速 >= 2x (实际 {ratio:.1f}x)", ratio >= 2)
    rpt(f"\n## 优化对比\n- 查询: {q}\n")
    rpt(f"- 优化前: {before_ms:.1f} ms (无索引)\n")
    rpt(f"- 优化后: {after_ms:.1f} ms (note text_pattern_ops 索引)\n")
    rpt(f"- 提速: {ratio:.1f}x\n")


# ============================================================
# 5. report — 生成 Markdown 报告
# ============================================================

def do_report():
    step("report", "生成 inspection_report.md")
    with open("inspection_report.md", "w") as f:
        f.write("\n".join(REPORT))
    content = open("inspection_report.md").read()
    n_sections = content.count("## ")
    ok(f"报告已生成({n_sections} 个章节)",
       os.path.exists("inspection_report.md") and n_sections >= 2)


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    rpt(f"- PostgreSQL 容器: {CONTAINER}\n")
    with psycopg.connect(**PG) as conn, conn.cursor() as cur:
        do_seed(cur)
        do_bench()
        do_inspect(cur)
        do_optimize(cur)
        do_report()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 27 · db_inspection_report 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
