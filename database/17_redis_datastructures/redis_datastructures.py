"""
Redis 五大结构与 TTL —— hands-on-python 第五系列（数据库）实验 17
核心要点: String/List/Hash/Set/Zset 五结构、TTL 过期、原子 INCR、
          场景选型(排行榜/购物车/共同关注/计数器/最新列表)

前置: ./redis_datastructures.sh start 已拉起容器(端口 55446)
生命周期(由 shell 编排):
  zset     排行榜: 分数更新、并列名次、TopN
  hash     购物车: 增改删、整车读取
  set      共同关注: 交集、并集、差集
  string   原子计数器: 100 线程并发 INCR 恰为 100
  ttl      TTL: 到期自动消失(轮询断言)
运行: ../.venv/bin/python redis_datastructures.py   (由 ./redis_datastructures.sh 调用)
"""

import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import redis

PORT = os.environ.get("LAB17_PORT", "55446")
R = redis.Redis(host="127.0.0.1", port=PORT, decode_responses=True)

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


def ping_ready():
    try:
        return R.ping()
    except redis.exceptions.ConnectionError:
        return False


# ============================================================
# 1. zset — 排行榜
# ============================================================

def do_zset():
    step("zset", "排行榜: ZINCRBY 累分, ZREVRANK 名次, ZREVRANGE TopN")
    R.delete("board")
    pipe = R.pipeline()
    for name, score in (("alice", 90), ("bob", 75), ("carol", 90),
                        ("dave", 60), ("erin", 85)):
        pipe.zadd("board", {name: score})
    pipe.execute()
    R.zincrby("board", 5, "bob")          # bob 75 -> 80
    top = R.zrevrange("board", 0, 2, withscores=True)
    print(f"    Top3: {[(n, int(s)) for n, s in top]}")
    ok("并列分数按字典序稳定(carol 在 alice 前)",
       [n for n, _ in top] == ["carol", "alice", "erin"])
    rank = R.zrevrank("board", "bob")
    ok(f"bob 加 5 分后名次第 {rank + 1}(80 分居中)", rank == 3)
    card = R.zcard("board")
    ok(f"榜单共 {card} 人", card == 5)


# ============================================================
# 2. hash — 购物车
# ============================================================

def do_hash():
    step("hash", "购物车: field=商品 value=数量, 增改删整车读")
    R.delete("cart:u1001")
    R.hset("cart:u1001", mapping={"键盘": 1, "鼠标垫": 2})
    R.hincrby("cart:u1001", "键盘", 2)       # 键盘 1 -> 3
    R.hdel("cart:u1001", "鼠标垫")
    R.hset("cart:u1001", "扩展坞", 1)
    cart = R.hgetall("cart:u1001")
    print(f"    购物车: {cart}")
    ok("增改删后整车读取正确", cart == {"键盘": "3", "扩展坞": "1"})
    ok("单查数量: 键盘 x3", R.hget("cart:u1001", "键盘") == "3")
    ok("商品种数 = field 数", R.hlen("cart:u1001") == 2)


# ============================================================
# 3. set — 共同关注
# ============================================================

def do_set():
    step("set", "共同关注: 交集(SINTER)/并集/差集")
    R.delete("follow:a", "follow:b")
    R.sadd("follow:a", "张三", "李四", "王五", "赵六")
    R.sadd("follow:b", "李四", "王五", "钱七")
    common = R.sinter("follow:a", "follow:b")
    union = R.sunion("follow:a", "follow:b")
    only_a = R.sdiff("follow:a", "follow:b")
    print(f"    共同关注: {sorted(common)}; A 独有: {sorted(only_a)}")
    ok("交集恰为 李四/王五", common == {"李四", "王五"})
    ok(f"并集 5 人(去重)", len(union) == 5)
    ok("差集 = A 独有关注", only_a == {"张三", "赵六"})


# ============================================================
# 4. string — 100 线程并发 INCR
# ============================================================

def do_incr():
    step("string", "原子计数器: 100 线程并发 INCR, 结果恰为 100")
    R.delete("hits")
    R.set("hits", 0)
    def bump(_):
        r = redis.Redis(host="127.0.0.1", port=PORT, decode_responses=True)
        r.incr("hits")
        r.close()
    with ThreadPoolExecutor(max_workers=100) as pool:
        list(pool.map(bump, range(100)))
    n = int(R.get("hits"))
    print(f"    100 线程各 INCR 一次: hits = {n}")
    ok(f"并发下无丢失: {n}/100", n == 100)
    # 对照: 非原子的读改写会丢更新(演示用, 不作断言)
    R.set("unsafe", 0)
    def unsafe(_):
        v = int(R.get("unsafe") or 0)
        R.set("unsafe", v + 1)     # 读改写不是原子的
    with ThreadPoolExecutor(max_workers=50) as pool:
        list(pool.map(unsafe, range(50)))
    bad = int(R.get("unsafe"))
    print(f"    对照(非原子读改写): 50 线程后 unsafe = {bad} < 50, 丢失更新")
    ok(f"非原子读改写确实丢更新({bad} < 50)", bad < 50)


# ============================================================
# 5. ttl — 到期自动消失
# ============================================================

def do_ttl():
    step("ttl", "验证码场景: SET EX 2 秒, 轮询断言到期消失")
    R.set("captcha:u1001", "8 6 3 7", ex=2)
    ok("写入后立即可读", R.get("captcha:u1001") == "8 6 3 7")
    ttl = R.ttl("captcha:u1001")
    ok(f"TTL 剩余 {ttl}s(0 < ttl <= 2)", 0 < ttl <= 2)
    for _ in range(40):
        if R.get("captcha:u1001") is None:
            break
        time.sleep(0.1)
    ok("到期后键自动消失", R.get("captcha:u1001") is None)
    ok("不存在键 TTL 返回 -2", R.ttl("captcha:u1001") == -2)


# ============================================================
# main
# ============================================================

def main():
    print(f"redis-py {redis.__version__}; ping={ping_ready()}")
    if not ping_ready():
        raise SystemExit("Redis 未就绪, 请先 ./redis_datastructures.sh start")
    do_zset()
    do_hash()
    do_set()
    do_incr()
    do_ttl()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 17 · redis_datastructures 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
