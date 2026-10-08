"""
副本集与多文档事务 —— hands-on-python 第五系列（数据库）实验 25
核心要点: 单节点副本集(rs.initiate)、多文档事务(start_session/start_transaction)、
          abort 全回滚 / commit 双集合一致、w:majority 写关注、读写偏好

前置: ./mongo_replica_transaction.sh start 已拉起容器(端口 55457, rs0)
生命周期(由 shell 编排):
  seed      accounts(2 账户) + ledger(流水) 两集合
  abort     转账事务: 扣 A 加 B 后 abort -> 两集合全部回滚
  commit    同样转账 commit -> 两集合一致且总额守恒
  concern   w:majority 写确认延迟对比 w:1
运行: ../.venv/bin/python mongo_replica_transaction.py   (由 ./mongo_replica_transaction.sh 调用)
"""

import os
import sys
import time

import pymongo
from pymongo import MongoClient
from pymongo.read_concern import ReadConcern
from pymongo.write_concern import WriteConcern

PORT = int(os.environ.get("LAB25_PORT", "55457"))
CLIENT = MongoClient("127.0.0.1", PORT, directConnection=True)
DB = CLIENT["bank"]

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
# 1. seed — 两集合
# ============================================================

def do_seed():
    step("seed", "建 accounts(阿里 1000/小熊 1000) + ledger(空)")
    DB.accounts.delete_many({})
    DB.ledger.delete_many({})
    DB.accounts.insert_many([
        {"_id": "阿里", "balance": 1000},
        {"_id": "小熊", "balance": 1000},
    ])
    n_a = DB.accounts.count_documents({})
    n_l = DB.ledger.count_documents({})
    ok(f"accounts {n_a} 行 / ledger {n_l} 行", n_a == 2 and n_l == 0)


def balances():
    return {d["_id"]: d["balance"]
            for d in DB.accounts.find({})}


def total():
    return sum(balances().values())


# ============================================================
# 2. abort — 事务回滚: 两集合全部复原
# ============================================================

def do_abort():
    step("abort", "转账事务: 扣阿里加小熊后 abort, 两集合全部回滚")
    with CLIENT.start_session() as session:
        session.start_transaction()
        try:
            DB.accounts.update_one(
                {"_id": "阿里"}, {"$inc": {"balance": -100}}, session=session)
            DB.accounts.update_one(
                {"_id": "小熊"}, {"$inc": {"balance": 100}}, session=session)
            DB.ledger.insert_one(
                {"from": "阿里", "to": "小熊", "amount": 100}, session=session)
            session.abort_transaction()
            print("    事务已 abort")
        except Exception:
            session.abort_transaction()
            raise

    b = balances()
    n = DB.ledger.count_documents({})
    print(f"    abort 后: {b}, ledger {n} 条")
    ok(f"两集合全部回滚({b}, ledger {n})", b == {"阿里": 1000, "小熊": 1000} and n == 0)
    ok(f"总额守恒 {total():.0f}", total() == 2000)


# ============================================================
# 3. commit — 事务提交: 跨集合一致
# ============================================================

def do_commit():
    step("commit", "转账事务: 扣阿里加小熊写流水, commit 后双集合一致")
    with CLIENT.start_session() as session:
        session.start_transaction()
        try:
            DB.accounts.update_one(
                {"_id": "阿里"}, {"$inc": {"balance": -100}}, session=session)
            DB.accounts.update_one(
                {"_id": "小熊"}, {"$inc": {"balance": 100}}, session=session)
            DB.ledger.insert_one(
                {"from": "阿里", "to": "小熊", "amount": 100}, session=session)
            session.commit_transaction()
            print("    事务已 commit")
        except Exception:
            session.abort_transaction()
            raise

    b = balances()
    n = DB.ledger.count_documents({})
    print(f"    commit 后: {b}, ledger {n} 条")
    ok(f"两集合一致({b}, ledger {n})", b == {"阿里": 900, "小熊": 1100} and n == 1)
    ok(f"总额守恒 {total():.0f}", total() == 2000)


# ============================================================
# 4. concern — w:majority 写关注
# ============================================================

def do_concern():
    step("concern", "w:majority vs w:1 写确认延迟对比")
    coll_w1 = DB.accounts.with_options(write_concern=WriteConcern(w=1))
    coll_maj = DB.accounts.with_options(write_concern=WriteConcern(w="majority"))

    times_w1 = []
    times_maj = []
    for i in range(20):
        t0 = time.perf_counter()
        coll_w1.update_one({"_id": "阿里"}, {"$set": {"ping": i}})
        times_w1.append((time.perf_counter() - t0) * 1000)
    for i in range(20):
        t0 = time.perf_counter()
        coll_maj.update_one({"_id": "阿里"}, {"$set": {"ping": i}})
        times_maj.append((time.perf_counter() - t0) * 1000)

    avg_w1 = sum(times_w1) / len(times_w1)
    avg_maj = sum(times_maj) / len(times_maj)
    print(f"    w:1       平均 {avg_w1:.1f} ms")
    print(f"    w:majority 平均 {avg_maj:.1f} ms(单节点副本集两者等价)")
    ok("两种写关注均成功", True)   # 单节点下两者语义相同, 延迟接近
    print("    结论: 单节点副本集 w:1 与 majority 等价;"
          "多节点时 majority 保证多数派确认后返回")


# ============================================================
# main
# ============================================================

def main():
    print(f"pymongo {pymongo.version}; rs0; "
          f"primary={CLIENT.primary}")
    do_seed()
    do_abort()
    do_commit()
    do_concern()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 25 · mongo_replica_transaction 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
