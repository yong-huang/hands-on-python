# 07 · B-tree 索引与 EXPLAIN ANALYZE:百万行上见真章

> 造 100 万行订单,给同一条点查语句(按精确值查一行的查询)测两次:无索引
> 全表顺序扫,建 B-tree 后索引扫,实测 258~286 倍提速;再亲手复现"列上套
> 函数让索引失效"与统计信息对规划器的影响。读完本篇,你能读懂 EXPLAIN
> 输出、知道索引为什么快、什么时候它会失灵,9 项断言跑成全绿。

## Background

没有索引的年代,数据库找一行数据只有一招:从第一行读到最后一行。数据几百
行时无感,百万行时每次查询都要全表翻一遍——明明要找的客户就在某个角落,
也得把 100 万行全部过目,每次 13 毫秒,查询一多就是灾难。

纸质时代早有解法:账本前面加目录,按编号排序,翻目录直达页码。数据库的
B-tree 索引(按列值排序的多叉平衡树)就是这个目录:树高只有 3~4 层,百万行
里定位一行只需三四次比较。但"加了索引就快"并不总成立——列上套了函数、
统计信息过时,引擎都可能弃索引不用,你却毫无察觉。

EXPLAIN ANALYZE(让引擎真跑一次并回报执行计划的命令)把这些黑盒摊开:
走了哪条路、扫了多少行、花了多少毫秒,全部印在输出里。本实验用它实测
索引前后、失效与救回、统计准与不准四组对照。其中统计信息(引擎采集的
表数据分布概况,如每个值出现多少次)正是查询规划器选路的依据。

## What

**定义**:EXPLAIN 输出执行计划(引擎准备怎么执行这条 SQL 的步骤说明书),
加 ANALYZE 则真执行并填入实际耗时与行数;扫描方式两种——Seq Scan
(顺序扫:整表逐行翻)与 Index Scan(索引扫:查 B-tree 后取行)。
选择由查询规划器(自动比较各方案的组件)按统计信息算代价决定。

可以把 B-tree 想成字典侧边的音标索引:查"zhao"不用从 a 翻起。但和字典
不同的是,索引对"加工过的键"失认——目录按原词排序,查 `upper(email)`
等于拿着大写拼音查小写目录,只能整本翻。

| 计划关键字 | 含义 | 本实验的实测 |
|:--|:--|:--|
| Seq Scan | 全表逐行翻 | 100 万行 12.6 ms |
| Index Scan | 走 B-tree 定位取行 | 同查询 0.044 ms |
| Bitmap Index Scan | 索引先圈范围再取行 | 本实验点查(等值查一行)实际走的形态 |
| rows=估计 | 规划器猜的行数 | 无统计 1000,ANALYZE 后 2227(实际 2000) |

一条查询的两条路:谓词(WHERE 里的过滤条件,如 customer_id = 777777)
能用索引时走 B-tree 直达,否则虚线回退全表扫。

![Lab 07 · 一条查询的两条路:规划器怎么在 Seq Scan 与 Index Scan 之间选](images/btree_explain.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/07_btree_explain/images/btree_explain.html)
> (或本地打开 [`images/btree_explain.html`](images/btree_explain.html))。

## When to Use

**典型场景**。WHERE 等值与范围查询的热点列(customer_id、order_date);
JOIN 的连接列(两表各建,连接从 O(n·m) 降近线性);唯一性业务键(sku、
邮箱)顺手防重。

**何时不用**。几百到几千行的小表,全表扫比爬树还快;写多读少的列,每个
索引都是 INSERT/UPDATE 额外要维护的副本;重复值只有两三种的列(如状态),
选择性太低,索引帮不上忙。

| 手段 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 无索引 | 写入零负担,读全表扫 | 小表、日志追加型 |
| 单列 B-tree | 等值/范围直达 | WHERE/JOIN 热点列 |
| 表达式索引 | 按函数结果排序 | 查询里必须套函数时 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 postgres:16-alpine 就位、venv 装好
psycopg。一条命令跑完整生命周期(含生成 100 万行,约 40 秒):

```bash
cd database/07_btree_explain && ./btree_explain.sh all
```

真实输出(节选,完整 9 项断言以实跑为准):

```text
=====> [index] 建 B-tree 索引 ANALYZE 后同查询: Index Scan
    ->  Bitmap Index Scan on idx_orders_customer ... (actual rows=1 loops=1)
    执行 0.044 ms
    提速 286x (12.6 ms -> 0.044 ms)
  [PASS] 计划改走 Index Scan(或 Index Only Scan)
  [PASS] 实测提速 >= 10x (实际 286x)
    ...
=====> [stats] ANALYZE 统计信息: 规划器不再瞎猜行数
    无统计时估计 rows=1000, ANALYZE 后估计 rows=2227 (实际 2000)
  [PASS] ANALYZE 后估计贴近实际(2227 vs 2000, 误差 <= 20%)
==== 实验 07 · btree_explain 全部 9 项断言通过 [PASS] ====
```

诚实预期:耗时与倍数随机器波动,但倍数稳定在 10x 以上(实测 258x 与
286x);行数估计值也随采样小幅波动(2227 或 1940,均在容差内);计划
可能显示 Parallel Seq Scan 与 Bitmap Index Scan,都属预期形态;`all`
结束容器连百万行一起回收,重跑从零开始。

## How It Works

### EXPLAIN 输出怎么读:cost、rows、actual time

每行是一个节点:`cost=0.00..14066` 是估的代价区间,`rows=1888` 是估的
产出行数,`actual time=9.4 rows=0 loops=3` 是真跑出的耗时/行数/分片。
判计划好坏第一眼看估的 rows 与 actual rows 差多远:估歪了,后面整个
代价模型都跟着歪。

### 为什么套函数就失效,表达式索引能救

B-tree 按建索引时的"原值"排好了序;查询写 `WHERE upper(email)=...`,
要找的是大写值在排序里的位置,可索引里存的全是小写原值,对不上号只能
全表翻。

`CREATE INDEX ... ON orders (upper(email))` 让索引按 upper 的结果排序,
查询于是重新走索引。等价规则:WHERE 里写成什么样,索引就得按什么样排。

### 统计信息:规划器的眼睛

规划器不读数据,读的是 ANALYZE 采样的统计(各值分布、去重数)。没有统计
时按默认选择性瞎估,20 万行估成 1000;ANALYZE 后按直方图(按值域分桶的
分布统计)估 2227,对实际 2000 误差 11%。

PG 的 autovacuum(后台自动维护进程)会定期补 ANALYZE,但刚灌完数据的表
来不及;批量导入后手动 ANALYZE 是标准动作。

## Pitfalls & Q&A

**坑 1:psycopg 参数化下,SQL 的取模 % 要写成 %%**。% 是 psycopg 的
占位符前缀,`g % 50000` 会被解析成残缺占位符直接报错;带参数的查询里
所有 SQL 层的 % 都要翻倍。

**坑 2:EXPLAIN 的行数估计要取扫描节点**。`SELECT COUNT(*)` 的计划里
第一行 Aggregate 节点恒是 rows=1,拿它断言"估得准不准"必错;取 Seq Scan
/ Index Scan 节点上的 rows 才是规划的产出。

**坑 3:并行扫描把行数拆进分片**。Parallel Seq Scan 每个 worker 各报
`rows=0 loops=3`,真实行数在汇总节点;判断"扫了几行"要看总和或上层节点。

**Q1:索引建了却没走,怎么查?** 先 EXPLAIN 看计划走没走,没走再查三件事:
谓词是否对列做了加工(函数/隐式转型)、选择性是否太低、统计是否过时——
对应解法分别是表达式索引、别建、ANALYZE。

**Q2:主键还要单独建索引吗?** 不用,PRIMARY KEY 约束自带一个 B-tree;
本实验种子表的主键就是索引,所以点查 id 从来不慢,慢的是没索引的
customer_id。

**Q3:COMPOSITE 索引和多个单列索引怎么选?** 查询恒定同时命中多列时,
复合索引一次定位且省回表(不必按主键再回主表取其余列);单列索引靠
bitmap 与合并(先合并各索引命中的行号再取行),灵活但多一步。复合索引
列序讲究最左前缀(条件须从第一列起连续命中),那是实验 08 的主题。
