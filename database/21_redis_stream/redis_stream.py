"""
Stream 与 Pub/Sub —— hands-on-python 第五系列（数据库）实验 21（选做）
核心要点: Pub/Sub 即发即弃(断线丢消息)、Stream 消费组(XADD/XREADGROUP/
          XACK)at-least-once、pending 列表可见性

前置: ./redis_stream.sh start 已拉起容器(端口 55453)
生命周期(由 shell 编排):
  pubsub    订阅端断线窗口发布 10 条 -> 重连后收到 0 条(丢消息复现)
  stream    同样断线窗口, Stream 消费组重连后 XREADGROUP 补读全部 10 条
  pending   未 ACK 的消息留在 pending 列表(XPENDING 可见), XACK 后清空
运行: ../.venv/bin/python redis_stream.py   (由 ./redis_stream.sh 调用)
"""

import os
import sys
import time

import redis

PORT = os.environ.get("LAB21_PORT", "55453")
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


# ============================================================
# 1. pubsub — 断线即丢
# ============================================================

def do_pubsub():
    step("pubsub", "Pub/Sub: 订阅端断线窗口发 10 条, 重连后收到 0 条")
    received = []

    def subscribe():
        sub = redis.Redis(host="127.0.0.1", port=PORT,
                          decode_responses=True)
        pubsub = sub.pubsub()
        pubsub.subscribe("news")
        # 读到 subscribe 确认帧
        pubsub.get_message(timeout=2)
        received.append("LISTENING")   # 标记: 已在订阅态
        for _ in range(200):
            msg = pubsub.get_message(timeout=0.3)
            if msg and msg["type"] == "message":
                received.append(msg["data"])
        sub.close()

    t = threading_start(subscribe)
    # 等订阅者就绪
    while "LISTENING" not in received:
        time.sleep(0.05)
    for i in range(10):
        R.publish("news", f"event-{i}")
    time.sleep(1)          # 在线窗口: 能收到
    online = len([x for x in received if x != "LISTENING"])
    print(f"    在线窗口: 订阅端收到 {online}/10 条")
    ok("在线时 Pub/Sub 可达(10/10)", online == 10)

    # 断线窗口: 订阅端"消失"(不再取消息), 发布 10 条, 再"重连"(新订阅)
    received.clear()
    for i in range(10, 20):
        R.publish("news", f"event-{i}")
    time.sleep(0.5)
    sub2 = redis.Redis(host="127.0.0.1", port=PORT, decode_responses=True)
    pub2 = sub2.pubsub()
    pub2.subscribe("news")
    pub2.get_message(timeout=2)
    missed = 0
    deadline = time.time() + 1
    while time.time() < deadline:
        msg = pub2.get_message(timeout=0.2)
        if msg and msg["type"] == "message":
            missed += 1
    sub2.close()
    print(f"    断线窗口后的 10 条: 重连的新订阅端收到 {missed} 条")
    ok("断线期间的消息全部丢失(0 条可补)", missed == 0)


def threading_start(fn):
    import threading
    th = threading.Thread(target=fn, daemon=True)
    th.start()
    return th


# ============================================================
# 2. stream — 消费组补读
# ============================================================

def do_stream():
    step("stream", "Stream 消费组: 断线窗口的 10 条, 重连后 XREADGROUP 全部补读")
    R.delete("orders")
    try:
        R.xgroup_create("orders", "workers", id="0", mkstream=True)
    except redis.exceptions.ResponseError:
        pass   # 组已存在(重跑)

    def produce(n, base):
        for i in range(base, base + n):
            R.xadd("orders", {"event": f"order-{i}"})

    def consume_once(count):
        """消费组读 count 条并返回(不 ACK, 模拟处理中)。"""
        entries = R.xreadgroup("workers", "consumer-1",
                               {"orders": ">"}, count=count)
        out = []
        for _, messages in entries:
            out.extend(messages)
        return out

    produce(10, 0)
    first = consume_once(10)          # 消费但不 ACK -> 全部进 pending
    print(f"    首轮消费 {len(first)} 条(未 ACK)")
    ok("首轮读满 10 条", len(first) == 10)

    produce(10, 100)                  # 消费端"断线"窗口: 又来 10 条
    print("    消费端断线, 期间又产生 10 条")
    again = consume_once(10)
    print(f"    重连后 XREADGROUP '>' 补读 {len(again)} 条新消息")
    ok("新消息补读 10/10", len(again) == 10)

    # pending 里的旧消息仍可被 XREADGROUP 0 认领(至少一次语义)
    pending = R.xpending("orders", "workers")
    print(f"    pending 列表: {pending['pending']} 条未 ACK")
    ok(f"pending 列表可见(未 ACK 的 {pending['pending']} 条, 含新消费的 10 条)",
       pending["pending"] == 20)
    old = R.xreadgroup("workers", "consumer-1", {"orders": "0"}, count=10)
    claimed = sum(len(msgs) for _, msgs in old)
    print(f"    用 '0' 游标认领 pending: {claimed} 条")
    ok(f"pending 消息可重新认领(at-least-once, 认回首批 {claimed} 条)", claimed == 10)

    # ACK 清空
    ids = [mid for mid, _ in first] + [mid for mid, _ in again]
    R.xack("orders", "workers", *ids)
    left = R.xpending("orders", "workers")["pending"]
    print(f"    XACK 后 pending 剩 {left} 条")
    ok("XACK 后 pending 清零", left == 0)


# ============================================================
# main
# ============================================================

def main():
    print(f"redis-py {redis.__version__}; ping={R.ping()}")
    do_pubsub()
    do_stream()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 21 · redis_stream 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
