"""
JSONB 与全文检索 —— hands-on-python 第五系列（数据库）实验 10
核心要点: JSONB 操作符与 GIN 索引、tsvector/tsquery 全文检索、
          数组类型 = ANY 与 @>、PG 中文分词能力边界

前置: ./jsonb_fulltext.sh start 已拉起容器(端口 55436, 库 lab)
生命周期(由 shell 编排):
  seed      20 万行 JSONB 商品(服务端生成) + 1000 篇英文文章 + 1 篇中文
  jsonb     attrs @> 包含查询: GIN 前后耗时对比, 断言 >= 5x
  fulltext  tsquery 十个检索词召回 10/10; AND 语义 rank 排序;
            中文短语不被原生分词命中(能力边界实录)
  array     TEXT[] 列 = ANY 与 @> 查询 + GIN 断言命中
运行: ../.venv/bin/python jsonb_fulltext.py   (由 ./jsonb_fulltext.sh 调用)
"""

import os
import sys
import time

import psycopg

PORT = os.environ.get("LAB10_PORT", "55436")
CONNINFO = dict(host="127.0.0.1", port=PORT, dbname="lab",
                user="postgres", password="lab")
PRODUCTS = 200_000
ARTICLES = 1_000
TARGET = "product-77777"
WORDS = ["database", "index", "query", "cache", "transaction",
         "replication", "backup", "cluster", "sharding", "latency"]

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


def timed(cur, sql):
    """真实执行取全部行, 返回 (rows, 毫秒)。"""
    t0 = time.perf_counter()
    rows = cur.execute(sql).fetchall()
    return rows, (time.perf_counter() - t0) * 1000


# ============================================================
# 1. seed — JSONB 商品 + 英文文章语料
# ============================================================

def do_seed(cur):
    step("seed", f"{PRODUCTS:,} 行 JSONB 商品(服务端生成) + {ARTICLES} 篇英文文章")
    cur.execute("""
        CREATE TABLE products (
            id    INTEGER PRIMARY KEY,
            attrs JSONB NOT NULL,
            tags  TEXT[] NOT NULL
        );
    """)
    # psycopg 参数化下取模 % 写 %%
    cur.execute("""
        INSERT INTO products (id, attrs, tags)
        SELECT g,
               jsonb_build_object(
                   'name',  'product-' || g,
                   'brand', 'brand-' || (g %% 50),
                   'specs', jsonb_build_object('weight', g %% 1000)),
               ARRAY['t' || (g %% 20), 'cat' || (g %% 7)]
        FROM generate_series(1, %s) g
    """, (PRODUCTS,))
    cur.execute("""
        CREATE TABLE articles (
            id      INTEGER PRIMARY KEY,
            title   TEXT NOT NULL,
            body    TEXT NOT NULL,
            body_tsv tsvector NOT NULL
        );
    """)
    filler = ["system", "design", "service", "data", "model", "user",
              "process", "network", "storage", "record"]
    rows = []
    for i in range(1, ARTICLES + 1):
        w = WORDS[(i - 1) % len(WORDS)]
        body = (f"This article examines {w} with notes on "
                f"{filler[i % len(filler)]} and {filler[(i + 3) % len(filler)]}.")
        rows.append((i, f"note-{i}", body, body))
    cur.executemany(
        "INSERT INTO articles (id, title, body, body_tsv)"
        " VALUES (%s, %s, %s, to_tsvector('english', %s))", rows)
    # AND 排序演示: 两篇分别含 1 个与 2 个目标词
    cur.execute("""
        INSERT INTO articles (id, title, body, body_tsv) VALUES
        (9001, 'both-words',  'database and index work together',
         to_tsvector('english', 'database and index work together')),
        (9002, 'single-word', 'database basics only',
         to_tsvector('english', 'database basics only'));
    """)
    # 中文边界演示: 原生分词器把整串中文当一个 token
    cur.execute("""
        INSERT INTO articles (id, title, body, body_tsv) VALUES
        (9999, 'chinese-doc', '数据库索引与查询优化详解',
         to_tsvector('english', '数据库索引与查询优化详解'));
    """)
    cur.execute("ANALYZE products; ANALYZE articles")
    cur.connection.commit()
    n = cur.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    a = cur.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
    ok(f"商品 {n:,} 行 / 文章 {a} 篇(含 1 篇中文边界样本)",
       n == PRODUCTS and a == ARTICLES + 3)


# ============================================================
# 2. jsonb — GIN 前后 @> 耗时对比
# ============================================================

def do_jsonb(cur):
    step("jsonb", f"attrs @> '\"name\":\"{TARGET}\"': GIN 前后耗时对比")
    q = f"SELECT id FROM products WHERE attrs @> '{{\"name\": \"{TARGET}\"}}'"
    rows, before_ms = timed(cur, q)
    ok(f"GIN 前查询正确命中 1 行(id={rows[0][0] if rows else '?'})",
       len(rows) == 1)
    times = [before_ms] + [timed(cur, q)[1] for _ in range(2)]
    before = min(times)
    print(f"    GIN 前 3 次: {[f'{t:.0f} ms' for t in times]}, 取最好 {before:.0f} ms")

    cur.execute("CREATE INDEX idx_attrs_gin ON products USING GIN (attrs)")
    cur.execute("ANALYZE products")
    cur.connection.commit()
    after_times = [timed(cur, q)[1] for _ in range(3)]
    after = max(after_times)
    print(f"    GIN 后 3 次: {[f'{t:.1f} ms' for t in after_times]}, 取最差 {after:.1f} ms")
    ratio = before / after if after else float("inf")
    print(f"    提速 {ratio:.0f}x")
    ok(f"GIN 前后耗时对比 >= 5x (实际 {ratio:.0f}x, 前取最好后取最差)", ratio >= 5)


# ============================================================
# 3. fulltext — tsquery 召回 + AND 排序 + 中文边界
# ============================================================

def do_fulltext(cur):
    step("fulltext", "10 个检索词逐个 tsquery, 目标文章必须召回")
    hits = 0
    for i, w in enumerate(WORDS, start=1):
        rows = cur.execute("""
            SELECT id FROM articles
            WHERE body_tsv @@ to_tsquery('english', %s)
        """, (w,)).fetchall()
        ids = {r[0] for r in rows}
        if i in ids:
            hits += 1
        else:
            print(f"    [{w}] 未召回目标文章 note-{i}")
    ok(f"十个检索词召回 {hits}/10", hits == 10)

    step("fulltext-and", "AND 语义与 rank 排序: 含两词的排 ahead of 只含一词的")
    # & 是硬过滤: 只含 database 的 9002 根本进不了结果; 要比"谁更相关"用 | 加 rank 排序
    n_and = cur.execute("""
        SELECT COUNT(*) FROM articles
        WHERE body_tsv @@ to_tsquery('english', 'database & index')
    """).fetchone()[0]
    rows = cur.execute("""
        SELECT id, ts_rank(body_tsv, to_tsquery('english', 'database | index'))
        AS rank FROM articles
        WHERE body_tsv @@ to_tsquery('english', 'database | index')
        ORDER BY rank DESC LIMIT 2
    """).fetchall()
    order = [r[0] for r in rows]
    ranks = {r[0]: r[1] for r in rows}
    pair = cur.execute("""
        SELECT id, ts_rank(body_tsv, to_tsquery('english', 'database | index'))
        FROM articles WHERE id IN (9001, 9002) ORDER BY 2 DESC
    """).fetchall()
    print(f"    database & index 命中 {n_and} 篇(硬过滤, 单词文章不入围)")
    print(f"    全表 rank 第一: {order[0]}; 双词 9001 rank={ranks[9001]:.4f} 高于单词文章")
    ok("AND 是硬过滤: & 查询只命中 9001 一篇", n_and == 1 and order[0] == 9001)
    ok(f"双词 9001 全表第一, 且 rank 严格高于单词 9002"
       f"({pair[0][1]:.4f} > {pair[1][1]:.4f}, {pair[0][0]} vs {pair[1][0]})",
       order[0] == 9001 and pair[0][0] == 9001 and pair[0][1] > pair[1][1])

    step("fulltext-zh", "中文边界: 原生分词器把整串中文当一个 token")
    n_zh = cur.execute("""
        SELECT COUNT(*) FROM articles
        WHERE body_tsv @@ to_tsquery('english', '索引')
    """).fetchone()[0]
    n_en = cur.execute("""
        SELECT COUNT(*) FROM articles
        WHERE body_tsv @@ to_tsquery('english', 'database')
    """).fetchone()[0]
    print(f"    查'索引'命中中文文档 {n_zh} 篇(原生分词不支持中文切词);"
          f" 查'database'仍命中 {n_en} 篇")
    ok("中文词检索 0 命中(边界实录, 中文方案见 README 选做)", n_zh == 0)
    ok("英文检索不受影响(>0 命中)", n_en > 0)


# ============================================================
# 4. array — 数组列 = ANY 与 @>
# ============================================================

def do_array(cur):
    step("array", "tags TEXT[]: = ANY 与 @> 两种查法, GIN 后均可命中")
    cur.execute("CREATE INDEX idx_tags_gin ON products USING GIN (tags)")
    cur.execute("ANALYZE products")
    cur.connection.commit()
    n_any = cur.execute(
        "SELECT COUNT(*) FROM products WHERE 't5' = ANY(tags)").fetchone()[0]
    n_contains = cur.execute(
        "SELECT COUNT(*) FROM products WHERE tags @> ARRAY['t5']").fetchone()[0]
    print(f"    't5' = ANY(tags) 命中 {n_any:,} 行; tags @> ARRAY['t5'] 命中 {n_contains:,} 行")
    ok(f"两种数组查法结果一致(均 ~1/20: {n_any:,} 行)",
       n_any == n_contains and abs(n_any - PRODUCTS // 20) < PRODUCTS // 20 * 0.1)


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    with connect_pg() as conn, conn.cursor() as cur:
        do_seed(cur)
        do_jsonb(cur)
        do_fulltext(cur)
        do_array(cur)
    print(f"\n{'=' * 60}")
    print(f"==== 实验 10 · jsonb_fulltext 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
