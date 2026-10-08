# 08 · 复合索引与最左前缀:电话簿只认姓开头的查法

> 给 20 万行事件表建一个三列复合索引,把 7 种 WHERE 列组合逐个喂给规划器
> (决定走索引还是全表扫的组件),实测"走/不走"与最左前缀理论 7/7 吻合;
> 再验收覆盖查询的 Index Only Scan、部分索引,以及 pg_stat_user_indexes
> 里的死索引现形记。13 项断言跑成全绿。

## Background

实验 07 的单列索引解决"按一个字段找",但真实查询常同时按多个字段问:
"华东区已发货的三月订单"。三列各建一个单列索引要合并三份命中列表;
复合索引(多列拼成联合排序键)一次定位,顺序天然对齐查询。

多列排序立刻带来新问题:先按第一列排,相同再按第二列排——像电话簿按
"姓、名"排序,只报名没法查。这条"从第一列起连续命中"的规则叫最左前缀;
违反时索引静默失效,查询悄悄退回全表扫描,性能塌了却无报错。

EXPLAIN(PG 自带命令,把引擎执行这条 SQL 的计划打印出来)是唯一的
测谎仪,本实验用 7 种列组合把规则逐格验证。

顺带验收两个衍生能力:只读索引列的 Index Only Scan;以及用
pg_stat_user_indexes(PG 内置统计视图,逐索引记录使用次数 idx_scan)
抓"从没人用却照吃写放大(每写一行,所有索引都得同步维护)"的死索引。

## What

**定义**:复合索引在 (region, status, created_at) 上按字典序联合排序;
最左前缀原则指 WHERE 必须含第一列(以及尽量连续的后续列),引擎才能
利用这个排序。缺最左列的查询退回 Seq Scan(全表顺序扫描)。

含最左列但跳过中间列时,索引用上半段定位,余下条件降级为行级过滤。

可以把复合索引想成电话簿:按姓再按名排序,"姓+名"直接翻到,"只报名"
没法查。但和电话簿不同的是,跳列查法(姓+生日)仍能用上半本:姓锁住
区间后逐条核对生日,这正是"走索引但过滤比例高"的实测形态。

7 种组合的实测矩阵(200k 行,每列组合跑一次 EXPLAIN ANALYZE,即真执行
并回报实际耗时的计划检查):

| WHERE 列组合 | 实测 | 依据 |
|:--|:--|:--|
| region | 走索引 | 最左列命中 |
| region + status | 走索引 | 连续前缀 |
| region + status + created_at | 走索引 | 全列命中 |
| status / created_at 单独 | Seq Scan | 缺最左列 |
| status + created_at | Seq Scan | 缺最左列 |
| region + created_at(跳列) | 走索引 | 上半段定位+过滤 |

![Lab 08 · 复合索引这道电话簿:最左前缀决定谁走谁不走](images/composite_index.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/08_composite_index/images/composite_index.html)
> (或本地打开 [`images/composite_index.html`](images/composite_index.html))。

## When to Use

**典型场景**。查询恒定同时命中多列(租户+状态、用户+时间段)时建复合;
只查热点子集(如"未支付订单")时建部分索引(CREATE INDEX ... WHERE
圈定行集,体积极小);SELECT 只取索引已有列时,复合索引天然是覆盖索引,
免回表(不必再回主表取其余列)。

**何时不用**。列组合千变万化时复合索引覆盖不了所有排列,单列索引加
bitmap 合并(先合并各索引命中的行号再取行)更灵活;几乎不分叉的列
(如 99% 行同一状态)没有筛选力。

| 手段 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 多个单列索引 | 各管一列,合并命中 | 列组合多变 |
| 复合索引 | 联合排序一次定位 | 列组合恒定,本实验主线 |
| 部分索引 | 只索引 WHERE 圈定的子集 | 热点子集且体量小 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 postgres:16-alpine 就位、venv 装好
psycopg。一条命令跑完整生命周期(含 20 万行种子,约 30 秒):

```bash
cd database/08_composite_index && ./composite_index.sh all
```

真实输出(节选,完整 13 项断言以实跑为准):

```text
=====> [matrix] 7 种 WHERE 组合逐个实测: 走索引 iff 含最左列 region
    region                     [走] Bitmap Heap Scan on events ...
    status 单独(缺最左)             [不走] Seq Scan on events ...
    region + created_at(跳列)    [走] Bitmap Heap Scan on events ...
    ...
=====> [cover] 只取索引里已有的列: 先 VACUUM 建可见性, 再等 Index Only Scan
    VACUUM 后: ['Index Only Scan using idx_events_region_status_created ...']
  [PASS] VACUUM 后覆盖查询走 Index Only Scan(免回表)
=====> [dead] 建一个从不被查询的索引, pg_stat_user_indexes 里现形
    idx_dead                             idx_scan = 0
    ...
    idx_events_region_status_created     idx_scan = 8
  [PASS] 复合索引 idx_scan = 8 > 0(使用计数已上报可见)
==== 实验 08 · composite_index 全部 13 项断言通过 [PASS] ====
```

诚实预期:矩阵判定对数据分布敏感——每地区约 2000 行(1%)索引划算所以
走;某组合命中占比过高时改判 Seq Scan 是代价核算,不是前缀失效。死索引
步的计数依赖统计上报时机,见坑 2。

## How It Works

### 最左前缀的物理根源:字典序只认开头

三列联合排序后,region='r42' 的行全部相邻,其中再按 status、再按
created_at 排。所以"region=?"可二分定位,"region+status=?"也能;
但"status='s1'?"在各 region 区段里散布,排序用不上,只能全表翻。

跳列组合(region+created_at)是折中:region 锁住区间,created_at 在区
间内逐条核对——计划里它是索引条件+过滤器两层。

### Index Only Scan 要过两道门

第一道:查询列必须全部在索引里(SELECT 恰好是索引三列,免回主表)。
第二道:可见性地图就绪——它标记每页是否含未提交改动,新灌数据的表没
建全,要先 VACUUM。VACUUM 前后同查询,计划从 Bitmap Heap Scan(走索引
仍回主表)换成 Index Only Scan(只读索引,不碰主表)。

### idx_scan 计数的上报机制

idx_scan 计数包含 EXPLAIN ANALYZE 的执行,但要等事务提交、或
pg_stat_force_next_flush() 强制上报后才可见(上报有节流);立刻去读
是 0,会误判成"没被用过"。正确姿势:执行 → 强制上报 → 开新事务读
pg_stat_user_indexes;长事务里反复读是旧值。

## Pitfalls & Q&A

**坑 1:VACUUM 不能在事务块里跑**。psycopg 默认把语句包在事务里,直接
执行报 ActiveSqlTransaction;开独立 autocommit 连接。种表后先 commit,
VACUUM 的连接才看得见表。

**坑 2:EXPLAIN 后立刻读统计是 0,别误判成不计数**。EXPLAIN ANALYZE
同样计入 idx_scan,只是要等提交或 force flush 后才可见;观测使用率的
正确顺序:执行 → pg_stat_force_next_flush() → 开新事务读。

**坑 3:统计读取被事务快照挡住**。未提交的长事务里循环读
pg_stat_user_indexes 永远是旧值;每次读取独立提交,或先
pg_stat_clear_snapshot() 再读。

**Q1:复合索引的列序怎么定?** 等值条件列在前、范围条件列在后(等值列
锁死区间,范围列在区间内仍可用排序);选择性(列值越多样越能筛掉行)
高的列优先。本实验正合此序。

**Q2:有了复合索引,首列的单列索引还要吗?** 通常不用——按最左前缀,
region 单列查询走复合索引即可;但第二列开头的查询帮不了。

**Q3:死索引为什么危险?** 不加速任何查询,却让每次 INSERT/UPDATE 多
维护一份排序副本,拖慢写入、膨胀存储;定期看 idx_scan,长期为 0 的该下线。
