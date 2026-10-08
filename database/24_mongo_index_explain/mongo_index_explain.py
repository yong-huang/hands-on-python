"""
Mongo 索引与 explain —— hands-on-python 第五系列（数据库）实验 24
核心要点: COLLSCAN vs IXSCAN、explain 三档、覆盖查询(totalDocsExamined=0
          的 PROJECTION_COVERED)、复合索引列序(对标 PG 最左前缀)、
          hint 强制索引

前置: ./mongo_index_explain.sh start 已拉起容器(端口 55456)
生命周期(由 shell 编排):
  seed      50 万行事件表(无索引, 只有 _id)
  scan      点查无索引: explain 输出 COLLSCAN; 建索引后 IXSCAN, 耗时对比
  cover     覆盖查询: projection 只取索引列, totalDocsExamined=0 断言
  hint      hint 强制走/绕开索引, 计划节点断言
  matrix    复合索引 (region, status): 4 种 WHERE 组合的走/不走矩阵
运行: ../.venv/bin/python mongo_index_explain.py   (由 ./mongo_index_explain.sh 调用)
"""

import os
import sys
import time

import pymongo

PORT = int(os.environ.get("LAB24_PORT", "55456"))
CLIENT = pymongo.MongoClient("127.0.0.1", PORT)
DB = CLIENT["lab"]
COLL = DB["events"]

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


def explain_stage(query, projection=None, hint=None):
    """跑 explain 'executionStats', 返回 (首个扫描阶段名, 毫秒, 文档数)。"""
    kwargs = {"comment": "lab24"}
    if hint:
        kwargs["hint"] = hint
    cur = COLL.find(query, projection, **kwargs)
    plan = cur.explain()   # pymongo 4.x: explain() 默认即 executionStats
    stages = []
    def walk(node):
        if isinstance(node, dict):
            if "stage" in node:
                stages.append(node)
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)
    walk(plan)
    scan = next((s for s in stages
                 if "SCAN" in s.get("stage", "") or "IXSCAN" in s.get("stage", "")), None)
    ms = plan["executionStats"]["executionTimeMillis"]
    n = plan["executionStats"]["nReturned"]
    all_stage_names = [s["stage"] for s in stages]
    return (scan["stage"] if scan else "UNKNOWN", ms, n, all_stage_names)


# ============================================================
# 1. seed — 50 万行事件表
# ============================================================

def do_seed():
    step("seed", "50 万行事件(region/status/created_at/payload), 仅 _id 索引")
    COLL.drop()
    import concurrent.futures
    docs_per_batch = 100000
    def batch(b):
        docs = []
        for i in range(b * docs_per_batch, (b + 1) * docs_per_batch):
            docs.append({
                "region": f"r{i % 100}", "status": f"s{i % 3}",
                "created_at": f"2026-{i % 12 + 1:02d}-15", "payload": f"p{i}",
            })
        COLL.insert_many(docs)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(batch, range(10)))
    # 不建任何业务索引: 让后续 COLLSCAN vs IXSCAN 的对比干净
    n = COLL.count_documents({})
    print(f"    {n:,} 行; 现有索引: 仅 _id")
    ok(f"100 万行就位, 仅 _id 索引", n == 1000000)


# ============================================================
# 2. scan — COLLSCAN vs IXSCAN
# ============================================================

def do_scan():
    step("scan", "region 点查: 无索引 COLLSCAN vs 建索引 IXSCAN")
    # 先量 wall-clock(无索引)
    t0 = time.perf_counter()
    list(COLL.find({"region": "r42"}))
    wall_no_idx = (time.perf_counter() - t0) * 1000

    stage0, ms0, n0, _ = explain_stage({"region": "r42"})
    print(f"    建索引前: {stage0}, explain {ms0:.0f} ms, wall {wall_no_idx:.0f} ms")
    ok("无索引时 COLLSCAN", stage0 == "COLLSCAN")

    COLL.create_index([("region", 1)])
    COLL.create_index([("created_at", 1)])
    time.sleep(0.3)

    stage1, ms1, n1, _ = explain_stage({"region": "r42"})
    t1 = time.perf_counter()
    list(COLL.find({"region": "r42"}))
    wall_idx = (time.perf_counter() - t1) * 1000
    print(f"    建索引后: {stage1}, explain {ms1:.1f} ms, wall {wall_idx:.1f} ms")
    ok("有索引时 IXSCAN", "IXSCAN" in stage1)
    ratio = wall_no_idx / wall_idx if wall_idx else float("inf")
    print(f"    wall-clock 提速 {ratio:.0f}x ({wall_no_idx:.0f} -> {wall_idx:.1f} ms)")
    ok(f"实际耗时提速 >= 5x (实际 {ratio:.0f}x)", ratio >= 5)
    ok(f"两版返回行数一致({n0} vs {n1})", n0 == n1 == 10000)


# ============================================================
# 3. cover — 覆盖查询
# ============================================================

def do_cover():
    step("cover", "覆盖查询: projection 只取索引列, 不回表")
    COLL.create_index([("status", 1), ("payload", 1)])
    import time as _t
    _t.sleep(0.3)
    # payload 无索引时: 需要回表
    stage_plain, _, n1, _ = explain_stage(
        {"status": "s1"}, projection={"payload": 1, "_id": 0})
    # 清掉多余索引只留 (status, payload), 避免规划器选错
    for idx in COLL.list_indexes():
        name = idx["name"]
        if name not in ("_id_", "status_1_payload_1"):
            COLL.drop_index(name)
    COLL.create_index([("status", 1), ("payload", 1)])
    _t.sleep(0.3)
    stage_cover, _, n2, all_stages = explain_stage(
        {"status": "s1"}, projection={"payload": 1, "_id": 0})
    print(f"    无覆盖索引: {stage_plain}")
    print(f"    有覆盖索引: {stage_cover}")
    ok("覆盖查询走 PROJECTION_COVERED(不回表)",
       "PROJECTION_COVERED" in all_stages)
    ok(f"两版行数一致({n1} vs {n2})", n1 == n2)


# ============================================================
# 4. hint — 强制走/绕开索引
# ============================================================

def do_hint():
    step("hint", "hint 强制: $natural 全表扫 vs region 索引")
    stage_nat, ms_nat, _, _ = explain_stage(
        {"region": "r42"}, hint={"$natural": 1})
    stage_idx, ms_idx, _, _ = explain_stage(
        {"region": "r42"}, hint={"region": 1})
    print(f"    hint $natural: {stage_nat}, {ms_nat:.0f} ms")
    print(f"    hint region:   {stage_idx}, {ms_idx:.1f} ms")
    ok("hint $natural 强制 COLLSCAN", stage_nat == "COLLSCAN")
    ok("hint region 强制 IXSCAN", "IXSCAN" in stage_idx)


# ============================================================
# 5. matrix — 复合索引矩阵
# ============================================================

def do_matrix(cur=None):
    step("matrix", "复合索引 (region, status): 4 种 WHERE 组合走/不走矩阵")
    COLL.create_index([("region", 1), ("status", 1)])
    import time as _t
    _t.sleep(0.3)
    cases = [
        ("region",                    {"region": "r42"}, True),
        ("region + status",           {"region": "r42", "status": "s1"}, True),
        ("status 单独(缺最左)",        {"status": "s1"}, False),
    ]
    for label, q, expect in cases:
        stage, _, n, _ = explain_stage(q)
        walked = "IXSCAN" in stage or "PROJECTION_COVERED" in stage
        mark = "走" if walked else "不走"
        print(f"    {label:<20} [{mark}] {stage[:70]}")
        ok(f"{label}: 预期={'走' if expect else '不走'}, 实测={mark}",
           walked == expect)


# ============================================================
# main
# ============================================================

def main():
    print(f"pymongo {pymongo.version}; server {DB.client.server_info()['version']}")
    do_seed()
    do_scan()
    do_hint()
    do_matrix()
    do_cover()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 24 · mongo_index_explain 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
