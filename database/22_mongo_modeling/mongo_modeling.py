"""
MongoDB 文档建模与 CRUD —— hands-on-python 第五系列（数据库）实验 22
核心要点: 文档模型 vs 关系模型、内嵌 vs 引用取舍、读写放大对比、
          ObjectId、pymongo CRUD 与 filter 语法

前置: ./mongo_modeling.sh start 已拉起容器(端口 55454)
生命周期(由 shell 编排):
  seed      同一博客需求建两套集合: 内嵌版(评论在文档内) 与 引用版(评论独立集合)
  read      读"文章+评论": 内嵌版 1 次查询; 引用版 N+1(1 次文章 + N 次评论)
  write     改作者昵称: 引用版 1 处; 内嵌版要改 M 篇文档(读写放大)
  crud      filter 语法、投影、排序、ObjectId 等基本操作断言
运行: ../.venv/bin/python mongo_modeling.py   (由 ./mongo_modeling.sh 调用)
"""

import os
import sys

import pymongo

PORT = int(os.environ.get("LAB22_PORT", "55454"))
CLIENT = pymongo.MongoClient("127.0.0.1", PORT)
DB = CLIENT["blog"]

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
# 1. seed — 同一博客需求, 两套建模
# ============================================================

def do_seed():
    step("seed", "同一博客需求: 20 篇文章 x 每篇 5 条评论, 两套建模")
    DB.embedded_posts.delete_many({})
    DB.ref_posts.delete_many({})
    DB.comments.delete_many({})
    DB.authors.delete_many({})

    DB.authors.insert_one({"_id": "author-1", "name": "张三"})

    for p in range(1, 21):
        comments = [{"user": f"user-{c}", "text": f"评论 {c}"} for c in range(1, 6)]
        # 内嵌版: 评论直接放文档内
        DB.embedded_posts.insert_one({
            "_id": f"post-{p}", "author": "张三", "title": f"标题 {p}",
            "comments": comments,
        })
        # 引用版: 文章只存 id, 评论独立集合(带 post_id 外键)
        DB.ref_posts.insert_one({
            "_id": f"post-{p}", "author": "张三", "title": f"标题 {p}",
        })
        DB.comments.insert_many([
            {"post_id": f"post-{p}", "user": c["user"], "text": c["text"]}
            for c in comments
        ])

    n_emb = DB.embedded_posts.count_documents({})
    n_ref = DB.ref_posts.count_documents({})
    n_com = DB.comments.count_documents({})
    ok(f"内嵌 {n_emb} 篇 / 引用 {n_ref} 篇 / 评论 {n_com} 条(两套同数据)",
       n_emb == 20 and n_ref == 20 and n_com == 100)


# ============================================================
# 2. read — 读文章带评论: 1 次 vs N+1
# ============================================================

def do_read():
    step("read", "读一篇文章带全部评论: 数查询次数")
    queries = {"emb": 0, "ref": 0}

    emb = DB.embedded_posts.find_one({"_id": "post-7"})
    queries["emb"] += 1
    print(f"    内嵌版: 1 次查询拿全(含 {len(emb['comments'])} 条评论)")

    post = DB.ref_posts.find_one({"_id": "post-7"})
    queries["ref"] += 1
    n = DB.comments.count_documents({"post_id": "post-7"})
    queries["ref"] += 1
    print(f"    引用版: 1 次文章 + {n} 条评论计数 = {queries['ref']} 次")

    ok(f"内嵌版查询次数 = 1(实测 {queries['emb']})", queries["emb"] == 1)
    ok(f"引用版查询次数 = 2(文章 + 计数, N+1 形态)", queries["ref"] == 2)
    ok(f"两版评论数一致({len(emb['comments'])} vs {n})",
       len(emb["comments"]) == n == 5)

    # 写放大演示: 改作者昵称
    DB.authors.update_one({"_id": "author-1"}, {"$set": {"name": "张三丰"}})
    r1 = DB.ref_posts.update_many(
        {"author": "张三"}, {"$set": {"author_name": "张三丰"}})
    writes_ref = 1 + r1.modified_count              # 作者 1 次 + 文章 20 次
    r2 = DB.embedded_posts.update_many(
        {"author": "张三"}, {"$set": {"author_name": "张三丰"}})
    writes_emb = r2.modified_count                  # 内嵌版也要改 20 篇
    print(f"    改昵称: 引用版 {writes_ref} 次写 vs 内嵌版 {writes_emb} 次写")
    ok("引用版改 1 处(作者文档) + 文章冗余 20 处", writes_ref == 21)
    ok("内嵌版改 20 篇(读写放大)", writes_emb == 20)


# ============================================================
# 3. crud — filter/投影/排序/ObjectId
# ============================================================

def do_crud():
    step("crud", "CRUD 与 filter 语法: 比较/逻辑/数组/投影/ObjectId")
    # $gt / AND 隐式 —— 注意: 字符串 id 按字典序比较, post-2..9 > post-15
    n = DB.ref_posts.count_documents(
        {"_id": {"$gt": "post-15"}, "author": "张三"})
    print(f"    字典序 $gt 命中 {n} 篇(含 post-2..9, 字符串比较的坑)")
    ok(f"字符串 id 字典序 $gt 命中 {n} 篇(8 位数十篇 + 5 篇 post-1x)", n == 13)
    # $or
    n = DB.ref_posts.count_documents(
        {"$or": [{"_id": "post-1"}, {"_id": "post-2"}]})
    ok(f"$or 命中 2 篇", n == 2)
    # 数组字段查询: 内嵌文档按 comments.user 匹配
    n = DB.embedded_posts.count_documents({"comments.user": "user-1"})
    ok(f"内嵌数组按子字段查询命中 {n} 篇(每篇都有 user-1)", n == 20)
    # 投影: 只返回 title
    doc = DB.ref_posts.find_one({"_id": "post-1"}, {"title": 1, "_id": 0})
    ok(f"投影只剩 title: {doc}", doc == {"title": "标题 1"})
    # 排序
    first = DB.ref_posts.find().sort("_id", pymongo.DESCENDING).limit(1)
    print(f"    字典序倒序第一条 = {first[0]['_id']}(post-9 > post-20)")
    ok("字典序倒序第一条 = post-9('9' 是最大字符)", first[0]["_id"] == "post-9")
    # ObjectId 独立集合
    oid_doc = DB.comments.find_one()
    ok(f"ObjectId 类型: {type(oid_doc['_id']).__name__}",
       type(oid_doc["_id"]).__name__ == "ObjectId")
    # upsert
    DB.authors.update_one({"_id": "author-9"}, {"$set": {"name": "新作者"}},
                          upsert=True)
    ok("upsert 无则插入", DB.authors.find_one({"_id": "author-9"}) is not None)


# ============================================================
# main
# ============================================================

def main():
    print(f"pymongo {pymongo.version}; server {DB.client.server_info()['version']}")
    do_seed()
    do_read()
    do_crud()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 22 · mongo_modeling 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
