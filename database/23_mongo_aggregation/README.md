# 23 · 聚合管道:SQL 与 Mongo 双实现逐行 diff

> 同一份 810 行销售数据灌入 SQLite 与 Mongo:区域汇总、类目 Top3、
> JOIN+分组三问各写两版(SQL 与聚合管道),结果逐行 diff 为 0;管道五
> 操作符($match/$group/$sort/$lookup/$unwind)各验一次。6 项断言全绿。

## Background

会 SQL 的工程师转 Mongo,第一道坎是把 SELECT/GROUP BY/JOIN 翻译成聚合
管道:WHERE 变 $match、GROUP BY+SUM 变 $group、JOIN 变 $lookup 配
$unwind。翻译错了不会报错——只会得到"看起来差不多"的错结果,等对账
时才发现数字对不上。

"看起来对"在数据报表里是最危险的状态。唯一可靠的验证法是同构数据双
实现:同一份数据分别灌 SQLite 与 Mongo,同一报表问题各写一版,结果
逐行 diff——diff 为 0 才能证明两边语义一致。

本实验的做法:三问(区域汇总/类目 Top3/按类目分组的月度明细)
双实现,逐行对齐。

## What

**定义**:聚合管道(aggregate pipeline)是 Mongo 的多阶段数据处理流——
文档依次流过每个阶段,前一阶段的输出是后一阶段的输入。$match 过滤、
$group 按键分组聚合、$sort 排序、$lookup 关联另一个集合(类似 JOIN)、
$unwind 把数组字段展开成多行。

可以把管道想成工厂流水线:原材料(原始文档)从入口进,经过一道道工序
(阶段)加工,末尾产出成品(结果文档)。但和物理流水线不同的是,阶段
的顺序直接影响性能与正确性——$match 放前面能减少流入后续阶段的文档量,
放后面则白白处理了将被丢弃的数据。

| SQL | 聚合管道 | 本实验实测 |
|:--|:--|:--|
| WHERE amount > 500 | $match | Q1 前置过滤 |
| GROUP BY region + SUM | $group + $sum | 区域汇总一致 |
| JOIN categories + GROUP BY | $lookup + $unwind + $group | Q3 逐行一致 |

![Lab 23 · 聚合管道与 SQL 的对应:同数据双实现逐行 diff](images/mongo_aggregation.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/23_mongo_aggregation/images/mongo_aggregation.html)
> (或本地打开 [`images/mongo_aggregation.html`](images/mongo_aggregation.html))。

## When to Use

**典型场景**。报表统计:按区域/类目/时间段汇总;数据关联:订单关联
商品目录取分组维度;ETL 中间层:从原始集合筛选、变形、写入目标集合。

**何时不用**。单键查询单文档读写用 find 即可;超大规模报表(亿级)
该走数仓(为海量分析专建的独立存储)或预聚合集合(写入时就算好并存的
汇总数据)——管道强在灵活,不强在无限吞吐。

| 手段 | 灵活性 | 上手成本 | 什么时候选它 |
|:--|:--|:--|:--|
| find + 应用层聚合 | 全靠代码 | 低 | 数据量小、逻辑特殊 |
| 聚合管道 | 多阶段灵活组合 | 中 | 库内报表与统计 |
| 预聚合集合 | 写时计算 | 高 | 高频读固定维度报表 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 mongo:7 就位、venv 装好 pymongo
与标准库 sqlite3。一条命令跑完整生命周期(约 10 秒):

```bash
cd database/23_mongo_aggregation && ./mongo_aggregation.sh all
```

真实输出(节选,完整 6 项断言以实跑为准):

```text
=====> [pipeline] 同三问的 Mongo 聚合管道, 与 SQLite 版逐行 diff
    Q1 区域汇总: SQL 2 行 vs Mongo 2 行
  [PASS] Q1 区域汇总逐行一致
    Q2 类目 Top3: SQL ['food', 'toy', 'book'] vs Mongo ['food', 'toy', 'book']
  [PASS] Q2 类目 Top3 逐行一致
  [PASS] Q3 JOIN+分组逐行一致
==== 实验 23 · mongo_aggregation 全部 6 项断言通过 [PASS] ====
```

诚实预期:三问的双实现结果完全确定(数据确定性生成,无时序因素);
diff 断言是本实验的核心价值——如果 $lookup 的 cat_group 与 SQL JOIN
的维度不同源,断言会立刻抓住。

## How It Works

### SQL 与管道的阶段映射

WHERE ↔ $match(尽早过滤减少下游数据量);GROUP BY + SUM ↔ $group +
$sum;JOIN ↔ $lookup 把另一集合文档按字段匹配后放进数组,再 $unwind
展平成一行一元素。

Q3 的"关联 + 按关联维度分组"就是 $lookup + $unwind + $group 三阶段
连用的典型形态。

### $unwind:把数组拆成多行

$lookup 的输出是数组(每笔销售匹配一条类目则数组仅一元素,匹配多条则
多元素),$unwind 把数组元素拆成独立文档——没有这一步,$group 会把整个
数组当单一值处理,统计全错。这是 JOIN 语义"一变多"的那一步,也是
$lookup 后最常见的前置遗漏。

### diff 为 0 的前提:同构数据与同源维度

断言可信的前提:两库数据同一次生成(种子循环灌两库),JOIN 两侧的分组
维度同源(SQL categories 表 = Mongo categories 集合)。

维度不同源,diff 就会静默少行——首版就因 cat_group 不同源而 Q3 少了
north 区域。

## Pitfalls & Q&A

**坑 1:管道结果 total 是 float,len() 会炸**。统计结果计数用循环或
sum(1 for _ in ...),别对 float 调 len。

**坑 2:维表(存分组名称的对照表,本实验即 categories:book→文化)
两侧不同源,diff 静默对不上**。首版 SQL 侧直接拿 category 本身当分组
名,Mongo 侧却用 cat_group(文化/玩乐/食品)——分组名不同,结果对不上。
修法:两侧用同一张维表。

**坑 3:种子数据的行数断言写具体值**。3 区域 x 3 类目 x 90 天 = 810,
不是 8100(多写一个零,断言永远 FAIL);具体值断言是防种子循环出 bug
的最便宜手段。

**Q1:$match 放管道前面还是后面?** 尽量前面——$match 在 $group 前能
利用索引并减少进入后续阶段的文档量;放在 $group 后就只能过滤聚合结果。

**Q2:$group 的 _id 能是复合键吗?** 能,_id 用嵌套文档
({_id: {region: ..., cat: ...}})即按多列分组;结果用 d["_id"]["region"]
取值。

**Q3:$lookup 性能如何?** 每个输入文档都触发一次对外集合的查询,没索引
就是 O(n*m);给 foreignField 建索引是 $lookup 的标配优化。
