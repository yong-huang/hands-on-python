"""
复合索引与最左前缀 —— hands-on-python 第五系列（数据库）实验 08
核心要点: 复合索引列序、最左前缀原则、覆盖索引(Index Only Scan)、
          部分索引、pg_stat_user_indexes 死索引观测

前置: ./composite_index.sh start 已拉起容器(端口 55434, 库 lab)
生命周期(由 shell 编排):
  seed    20 万行事件表(100 地区 x 3 状态 x 365 天, 确定性分布)
  matrix  复合索引 (region, status, created_at): 7 种 WHERE 组合
          逐个 EXPLAIN ANALYZE, 断言走/不走与最左前缀理论一致
  cover   覆盖查询断言 Index Only Scan(先 VACUUM 建可见性)
  partial 部分索引: 只服务自己 WHERE 子句的查询
  dead    从不被查询的索引: pg_stat_user_indexes 里 idx_scan=0
运行: ../.venv/bin/python composite_index.py   (由 ./composite_index.sh 调用)
"""

import os
import sys
import time

import psycopg

CONTAINER_PORT = os.environ.get("LAB08_PORT", "55434")
CONNINFO = dict(host="127.0.0.1", port=CONTAINER_PORT, dbname="lab",
                user="postgres", password="lab")
ROWS = 200_000
IDX = "idx_events_region_status_created"

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


def scan_lines(cur, sql):
    """EXPLAIN ANALYZE, 返回全部扫描节点行(Bitmap Heap Scan 的索引名在子节点)。"""
    cur.execute("EXPLAIN (ANALYZE, FORMAT TEXT) " + sql)
    return [r[0].strip() for r in cur.fetchall()
            if "Scan" in r[0] and "Scan:" not in r[0]]


def uses_index(plan_lines):
    return any(IDX in l for l in plan_lines)


# ============================================================
# 1. seed — 20 万行事件表
# ============================================================

def do_seed(cur):
    step("seed", f"生成 {ROWS:,} 行事件: 100 地区 x 3 状态 x 365 天")
    cur.execute("""
        CREATE TABLE events (
            id         INTEGER PRIMARY KEY,
            region     TEXT NOT NULL,
            status     TEXT NOT NULL,
            created_at DATE NOT NULL,
            payload    TEXT NOT NULL
        );
    """)
    # psycopg 参数化下取模 % 要写 %%
    cur.execute("""
        INSERT INTO events (id, region, status, created_at, payload)
        SELECT g,
               'r' || (g %% 100),
               's' || (g %% 3),
               DATE '2026-01-01' + (g %% 365),
               'payload-' || md5(g::text)
        FROM generate_series(1, %s) g
    """, (ROWS,))
    cur.execute(f"CREATE INDEX {IDX} ON events (region, status, created_at)")
    cur.execute("ANALYZE events")
    cur.connection.commit()   # 落账: 后面独立 autocommit 连接做 VACUUM 要能看到表
    cur.execute("SELECT COUNT(*) FROM events")
    ok(f"{ROWS:,} 行 + 复合索引(region, status, created_at)就位",
       cur.fetchone()[0] == ROWS)


# ============================================================
# 2. matrix — 7 种 WHERE 组合对最左前缀
# ============================================================

def do_matrix(cur):
    step("matrix", "7 种 WHERE 组合逐个实测: 走索引 iff 含最左列 region")
    cases = [
        ("region",                        "r42",            True),
        ("region + status",               "r42 + s1",       True),
        ("region + status + created_at",  "r42 + s1 + 3月", True),
        ("status 单独(缺最左)",            "s1",             False),
        ("status + created_at(缺最左)",    "s1 + 3月",       False),
        ("created_at 单独(缺最左)",        "3月",            False),
        ("region + created_at(跳列)",     "r42 + 3月",      True),
    ]
    sqls = [
        "SELECT id FROM events WHERE region = 'r42'",
        "SELECT id FROM events WHERE region = 'r42' AND status = 's1'",
        "SELECT id FROM events WHERE region = 'r42' AND status = 's1'"
        " AND created_at >= DATE '2026-03-01' AND created_at < DATE '2026-04-01'",
        "SELECT id FROM events WHERE status = 's1'",
        "SELECT id FROM events WHERE status = 's1'"
        " AND created_at >= DATE '2026-03-01' AND created_at < DATE '2026-04-01'",
        "SELECT id FROM events WHERE created_at >= DATE '2026-03-01'"
        " AND created_at < DATE '2026-04-01'",
        "SELECT id FROM events WHERE region = 'r42'"
        " AND created_at >= DATE '2026-03-01' AND created_at < DATE '2026-04-01'",
    ]
    print(f"    {'WHERE 组合':<28} 计划节点")
    for (label, _, expect), sql in zip(cases, sqls):
        lines = scan_lines(cur, sql)
        walked = uses_index(lines)
        mark = "走" if walked else "不走"
        print(f"    {label:<26} [{mark}] {lines[0][:76]}")
        ok(f"{label}: 最左前缀预期={'走' if expect else '不走'}, 实测={mark}",
           walked == expect)
    cur.connection.commit()   # 统计在事务提交后才可见, 这一点比"计不计"更容易骗人


# ============================================================
# 3. cover — 覆盖查询: Index Only Scan
# ============================================================

def do_cover(cur):
    step("cover", "只取索引里已有的列: 先 VACUUM 建可见性, 再等 Index Only Scan")
    sql = ("SELECT region, status, created_at FROM events"
           " WHERE region = 'r42' AND status = 's1'"
           " AND created_at >= DATE '2026-03-01'")
    before = scan_lines(cur, sql)[0]
    print(f"    VACUUM 前: {before[:80]}")
    # VACUUM 不能在事务块里跑, 开独立 autocommit 连接执行
    with psycopg.connect(autocommit=True, **CONNINFO) as vac_conn:
        vac_conn.execute("VACUUM (ANALYZE) events")
    after = scan_lines(cur, sql)
    print(f"    VACUUM 后: {after[:80]}")
    ok("VACUUM 后覆盖查询走 Index Only Scan(免回表)",
       any("Index Only Scan" in l for l in after))


# ============================================================
# 4. partial — 部分索引
# ============================================================

def do_partial(cur):
    step("partial", "部分索引: 只为 status='s2' 的查询而建")
    cur.execute("CREATE INDEX idx_events_s2 ON events (region) WHERE status = 's2'")
    cur.execute("ANALYZE events")
    hit = scan_lines(cur,
                    "SELECT id FROM events WHERE region = 'r42' AND status = 's2'")
    miss = scan_lines(cur,
                     "SELECT id FROM events WHERE region = 'r42' AND status = 's1'")
    print(f"    s2 查询: {hit[0][:80]}")
    print(f"    s1 查询: {miss[0][:80]}")
    ok("s2 查询走部分索引 idx_events_s2",
       any("idx_events_s2" in l for l in hit))
    ok("s1 查询不吃这套(仍走全列复合索引)",
       any(IDX in l for l in miss) and not any("idx_events_s2" in l for l in miss))


# ============================================================
# 5. dead — 死索引观测
# ============================================================

def do_dead(cur):
    step("dead", "建一个从不被查询的索引, pg_stat_user_indexes 里现形")
    cur.execute("CREATE INDEX idx_dead ON events (payload)")
    cur.execute("ANALYZE events")
    cur.connection.commit()
    # EXPLAIN ANALYZE 同样计入 idx_scan; 但计数要等提交/force flush 后才可见,
    # 这里补两条真实执行 + 强制上报, 让计数确定性可见
    cur.execute("SELECT id FROM events WHERE region = 'r42' AND status = 's1'").fetchall()
    cur.execute("SELECT id FROM events WHERE region = 'r42' AND status = 's2'").fetchall()
    cur.execute("SELECT pg_stat_force_next_flush()")
    cur.connection.commit()
    # 统计收集器有亚秒级刷新延迟: 清掉本会话快照 + 短重试
    stats = {}
    for _ in range(10):
        stats = {name: scan for name, scan in cur.execute("""
            SELECT indexrelname, idx_scan FROM pg_stat_user_indexes
            WHERE relname = 'events'""").fetchall()}
        cur.connection.commit()   # 每次读取独立成事务, 后端才能回 idle
        if stats.get(IDX, 0) > 0:
            break
        time.sleep(0.5)
    for name, scan in sorted(stats.items()):
        print(f"    {name:<36} idx_scan = {scan}")
    dead = stats.get("idx_dead")
    alive = stats.get(IDX, 0)
    ok(f"死索引 idx_scan = {dead}(从未被真实查询过)", dead == 0)
    ok(f"复合索引 idx_scan = {alive} > 0(使用计数已上报可见)", alive > 0)


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    with connect_pg() as conn, conn.cursor() as cur:
        do_seed(cur)
        do_matrix(cur)
        do_cover(cur)
        do_partial(cur)
        do_dead(cur)
    print(f"\n{'=' * 60}")
    print(f"==== 实验 08 · composite_index 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
