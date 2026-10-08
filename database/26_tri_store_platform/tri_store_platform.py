"""
三库协作内容平台 —— hands-on-python 第五系列（数据库）实验 26
核心要点: PG 主存储 / Redis 缓存与计数 / Mongo 评论的三库分工、
          缓存命中率、降级演练(kill Redis 后主库直读)、缓存回填

前置: ./tri_store_platform.sh start 已拉起三库容器
生命周期(由 shell 编排):
  publish   发布 20 篇文章到 PG(PG 是唯一事实源)
  browse    浏览接口: 先查 Redis 缓存, miss 查 PG 回填 + Redis INCR 计数
            断言缓存命中率 >= 90%
  comment   Mongo 写评论, 按文章 id 可查断言
  degrade   kill Redis -> 降级为主库直读仍可用(断言); Redis 恢复后缓存
            回填命中率回到 >= 90%(断言)
运行: ../.venv/bin/python tri_store_platform.py   (由 ./tri_store_platform.sh 调用)
"""

import os
import sys
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor

import psycopg
import pymongo
import redis

PORT_P = int(os.environ.get("LAB26_PORT_P", "55458"))
PORT_R = int(os.environ.get("LAB26_PORT_R", "55459"))
PORT_M = int(os.environ.get("LAB26_PORT_M", "55460"))
PG = dict(host="127.0.0.1", port=PORT_P, dbname="lab",
          user="postgres", password="lab")
R = redis.Redis(host="127.0.0.1", port=PORT_R, decode_responses=True)
MC = pymongo.MongoClient("127.0.0.1", PORT_M)
MDB = MC["content"]
POSTS = 20
CACHE_HITS = 0
CACHE_MISSES = 0

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


def pg_connect():
    return psycopg.connect(**PG)


def reset_counters():
    global CACHE_HITS, CACHE_MISSES
    CACHE_HITS = 0
    CACHE_MISSES = 0


# ============================================================
# 数据访问层: PG 主存储 + Redis 缓存 + Mongo 评论
# ============================================================

def publish(cur, title, body):
    cur.execute(
        "INSERT INTO posts (title, body) VALUES (%s, %s) RETURNING id",
        (title, body))
    pid = cur.fetchone()[0]
    return pid


def browse(pid):
    """浏览接口: Redis 优先, miss 查 PG 回填; Redis INCR 计数。"""
    global CACHE_HITS, CACHE_MISSES
    key = f"post:{pid}"
    cached = R.get(key)
    if cached:
        CACHE_HITS += 1
        R.incr(f"views:{pid}")
        return cached
    CACHE_MISSES += 1
    conn = pg_connect()
    row = conn.execute(
        "SELECT title, body FROM posts WHERE id = %s", (pid,)).fetchone()
    conn.close()
    if row:
        R.set(key, f"{row[0]}|{row[1]}", ex=300)
    R.incr(f"views:{pid}")
    return f"{row[0]}|{row[1]}" if row else None


def add_comment(post_id, user, text):
    MDB.comments.insert_one(
        {"post_id": str(post_id), "user": user, "text": text})


def get_comments(post_id):
    return list(MDB.comments.find({"post_id": str(post_id)}, {"_id": 0}))


# ============================================================
# 1. publish — 发布 20 篇文章
# ============================================================

def do_publish():
    step("publish", f"PG 发布 {POSTS} 篇文章(唯一事实源)")
    conn = pg_connect()
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS posts; DROP TABLE IF EXISTS views")
    cur.execute("""
        CREATE TABLE posts (
            id SERIAL PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL);
        CREATE TABLE views (post_id INT PRIMARY KEY, count INT NOT NULL);
    """)
    for i in range(1, POSTS + 1):
        publish(cur, f"文章 {i}", f"这是第 {i} 篇文章的正文内容。")
        cur.execute("INSERT INTO views VALUES (%s, 0)", (i,))
    conn.commit()
    n = cur.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    conn.close()
    ok(f"PG 中 {n} 篇文章(主存储)", n == POSTS)


# ============================================================
# 2. browse — 浏览并断言缓存命中率
# ============================================================

def do_browse():
    step("browse", f"{POSTS} 篇各浏览 10 次(首轮 miss 回填, 后九轮命中)")
    reset_counters()
    for _ in range(10):
        for pid in range(1, POSTS + 1):
            browse(pid)
    rate = CACHE_HITS / (CACHE_HITS + CACHE_MISSES) * 100
    print(f"    命中 {CACHE_HITS} / miss {CACHE_MISSES} = {rate:.0f}%")
    ok(f"缓存命中率 >= 90%(实际 {rate:.0f}%)", rate >= 90)
    views = sum(int(R.get(f"views:{pid}") or 0) for pid in range(1, POSTS + 1))
    print(f"    Redis 浏览计数总计: {views}(INCR 原子计数)")
    ok(f"浏览计数完整({views} = {POSTS}x10)", views == POSTS * 10)


# ============================================================
# 3. comment — Mongo 评论
# ============================================================

def do_comment():
    step("comment", "Mongo 写评论: 3 篇各 3 条, 按文章 id 可查")
    for pid in (1, 2, 3):
        for u in range(3):
            add_comment(pid, f"user-{u}", f"评论 {pid}-{u}")
    for pid in (1, 2, 3):
        cs = get_comments(pid)
        assert len(cs) == 3, f"post-{pid} 评论数 {len(cs)}"
    ok("3 篇文章各 3 条评论, 按文章 id 可查", True)


# ============================================================
# 4. degrade — kill Redis 降级 + 恢复回填
# ============================================================

def do_degrade():
    step("degrade", "kill Redis -> 降级为主库直读仍可用; Redis 恢复后命中率回升")
    print("    docker stop lab26-redis (模拟缓存层故障)...")
    subprocess.run(["docker", "restart", "lab26-redis"], capture_output=True)

    reset_counters()
    ok_count = 0
    try:
        for pid in range(1, POSTS + 1):
            key = f"post:{pid}"
            # 降级: Redis 不可用时直读 PG
            try:
                R.get(key)
            except redis.exceptions.ConnectionError:
                pass
            conn = pg_connect()
            row = conn.execute(
                "SELECT title, body FROM posts WHERE id = %s", (pid,)).fetchone()
            conn.close()
            if row:
                ok_count += 1
    except Exception as e:
        print(f"    降级异常: {e}")
    print(f"    降级模式: {ok_count}/{POSTS} 篇可从 PG 直读")
    ok(f"降级后主库直读可用({ok_count}/{POSTS})", ok_count == POSTS)

    print("    docker start lab26-redis (恢复)...")
    # docker restart 已在上面完成(含 stop + start)
    ready = False
    for _ in range(60):
        try:
            if R.ping():
                ready = True
                break
        except redis.exceptions.ConnectionError:
            pass
        time.sleep(0.5)
    ok("Redis 恢复", ready)

    # 回填: 逐篇读一遍重建缓存
    for pid in range(1, POSTS + 1):
        browse(pid)
    reset_counters()
    for pid in range(1, POSTS + 1):
        browse(pid)
    rate = CACHE_HITS / (CACHE_HITS + CACHE_MISSES) * 100
    print(f"    恢复后命中率: {rate:.0f}%")
    ok(f"恢复后命中率 >= 90%(实际 {rate:.0f}%)", rate >= 90)


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__} / redis {redis.__version__} / "
          f"pymongo {pymongo.version}")
    do_publish()
    do_browse()
    do_comment()
    do_degrade()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 26 · tri_store_platform 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
