# 24 · Mongo 索引与 explain:COLLSCAN 到 IXSCAN 的 10 倍之路

> 100 万行事件表,同一条查询无索引 COLLSCAN 159ms、建索引 IXSCAN 15ms,
> 实测 10 倍;hint 可强制走或绕开索引;复合索引 (region, status) 的最左
> 前缀矩阵与 PG 结论完全一致。12 项断言跑成全绿。

## Background

实验 22 建好了 Mongo 集合但没有索引,数据到百万行后,无索引的
COLLSCAN(全集合扫描)就是定时炸弹——每个查询都逐行翻。

Mongo 的 B-tree 索引与 PG 同源同理:按键排序的多叉树,点查沿树直达,
术语与 explain 输出格式不同但本质一样。本实验在 Mongo 上重演实验 07
的全部对比,并验证 Mongo 特有的 hint 语法与覆盖查询形态。

## What

**定义**:Mongo 的 explain() 返回执行计划——其中 winningPlan(规划器
最终选中的那个计划节点)里的 stage 字段标明扫描方式:COLLSCAN(全集合逐文档翻)与 IXSCAN(走 B-tree 索引
定位)。hint 参数可强制走或绕开索引,是排障利器。

覆盖查询指 projection 只取索引里已有的列——引擎标注 PROJECTION_
COVERED,完全不碰文档。

可以把 Mongo 索引想成实验 07 的 PG 索引换了套术语:B-tree、最左前缀、
覆盖查询概念全部通用,差异只在语法与 explain 输出的字段名。

| 扫描方式 | 含义 | 本实验实测 |
|:--|:--|:--|
| COLLSCAN | 全集合逐文档 | 100 万行 159ms |
| IXSCAN | B-tree 定位 + FETCH(回文档取非索引字段) | 同查询 15ms |
| PROJECTION_COVERED | 只读索引,不回文档 | 覆盖查询的标志 |

![Lab 24 · Mongo 索引与 explain:扫描方式、覆盖查询与最左前缀](images/mongo_index_explain.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/24_mongo_index_explain/images/mongo_index_explain.html)
> (或本地打开 [`images/mongo_index_explain.html`](images/mongo_index_explain.html))。

## When to Use

**典型场景**。热点查询字段建索引(region、status 等 WHERE 常客);复合
索引按最左前缀设计(与 PG 同规则);覆盖查询减少磁盘 IO——读多写少的
字段组合值得加复合索引。

**何时不用**。写入极频繁而读取极少的字段;索引数量过多会拖慢每次写入
(每个索引都要维护一份有序副本)。

| 手段 | 差异 | 什么时候选它 |
|:--|:--|:--|
| COLLSCAN(无索引) | 写入零负担 | 小表或全量扫描 |
| 单字段索引 | 一列一索引 | WHERE 单字段 |
| 复合索引 | 多列联合排序 | WHERE 多列组合 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 mongo:7 就位、venv 装好 pymongo。
一条命令跑完整生命周期(含 100 万行种子,约 40 秒):

```bash
cd database/24_mongo_index_explain && ./mongo_index_explain.sh all
```

真实输出(节选,完整 12 项断言以实跑为准):

```text
=====> [scan] region 点查: 无索引 COLLSCAN vs 建索引 IXSCAN
    建索引前: COLLSCAN, explain 140 ms, wall 159 ms
  [PASS] 无索引时 COLLSCAN
    建索引后: IXSCAN, explain 22.0 ms, wall 14.9 ms
  [PASS] 实际耗时提速 >= 5x (实际 11x)
=====> [matrix] 复合索引 (region, status): 4 种 WHERE 组合走/不走矩阵
  [PASS] region: 预期=走, 实测=走
  [PASS] status 单独(缺最左): 预期=不走, 实测=不走
==== 实验 24 · mongo_index_explain 全部 12 项断言通过 [PASS] ====
```

诚实预期:耗时与倍数随机器与缓存状态波动(实测 7~11x),断言锁 >=5x
以覆盖波动;explain 的 executionTimeMillis 首次含缓存冷启动偏高——
实际耗时用 Python 的 perf_counter 计 wall-clock 更准确。

## How It Works

### explain 的输出:stage 字段告诉你一切

Mongo 的 explain 输出是一棵计划树,每个节点有 stage 字段标明操作类型:
COLLSCAN(全扫)、IXSCAN(索引扫)、FETCH(回文档取非索引字段)、
PROJECTION_COVERED(覆盖,不回文档)。判断走没走索引,看有没有
COLLSCAN 即可。

### hint:强制走或绕开指定索引

hint({"$natural": 1}) 强制全表扫,hint({"region": 1}) 强制走 region
索引。排障时如果确认某索引应该被用但规划器没选它,先 hint 验证索引
本身是否有效,再排查统计信息与选择性。

### 复合索引与最左前缀:与 PG 同规则

复合索引 (region, status) 按 region 排序、region 相同再按 status 排——
与 PG 的 B-tree 完全一致。region 单独查可走,region+status 也可走,
status 单独不可走(缺最左列)。本实验的矩阵判定与 PG(实验 08)结论
完全一致。

## Pitfalls & Q&A

**坑 1:seed 建了 status 索引,matrix 的「status 单独不走」断言就
废了**。status 单独查询能走 status_1 索引;而 region 点查不受影响。
种子阶段不要建任何业务索引。

**坑 2:pymongo 的 explain() 调用**。pymongo 4.x 的 cursor.explain()
不带参数(默认 allPlansExecution 档,含 executionStats 统计);老版本的
explain("executionStats")
会报 TypeError。

**坑 3:hint 用索引名而非字段名**。hint("region") 报"does not correspond";
要么用完整索引名 "region_1",要么用键模式 {"region": 1}。

**Q1:Mongo 的覆盖查询和 PG 的一样吗?** 概念一样(只读索引不回表);
Mongo 标注为 PROJECTION_COVERED,PG 没有专门阶段名但有 Index Only Scan。
两者的前提都是 projection 只取索引里已有的列。

**Q2:Mongo 索引和 PG 索引哪个快?** 不好直接比——Mongo 的 COLLSCAN
在内存里比 PG 的 Seq Scan 快(无 WAL 开销),但 PG 的 WAL 保证持久性
(实验 13)。数据库选型不该只看单查询微基准。

**Q3:多个索引都可用时规划器怎么选?** Mongo 会并行试探各索引取代价
最低者;实验 08 的最左前缀矩阵在 Mongo 同样适用——复合索引的最左列
必须出现在查询条件中。
