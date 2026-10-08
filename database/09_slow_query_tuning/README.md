# 09 · 慢查询诊断与重写:先抓凶手,再改口供

> 起一个预载 pg_stat_statements 的 PG 容器,故意跑三类慢查询,从统计账本
> 的 Top 榜把它们全部抓出;再用两条改写收尾——深分页改 keyset 实测提速
> 11~12 倍且逐行一致,相关子查询改 JOIN 结果等价。13 项断言跑成全绿。

## Background

没有慢查询账本的年代,性能问题靠用户投诉发现:接口慢了,DBA 登上机器翻
日志、凭经验猜——先怀疑索引,再加缓存,改完等用户反馈,一轮下来可能
方向全错。更麻烦的是同一条 SQL 每天被执行几万次,参数各不相同,日志里
散成几万行,人工根本归并不了。

pg_stat_statements(PG 官方扩展,把执行过的每条 SQL 按模板记账:执行
次数、总耗时、平均耗时、扫描行数)把这个过程变成读一张排行榜:字面量
归一化后,同一模板的执行合并记一行,总耗时降序一排,谁最烧钱一目了然。

本实验先在账本上"养"出三类经典慢查询,验证 Top 榜能全部抓出;再对
深分页与相关子查询动手术,用"结果逐行一致 + 耗时对比"验收每台手术。

## What

**定义**:pg_stat_statements 把字面量归一化(参数替换成 $1/$2,只留
结构)后按模板记账。深分页指 OFFSET 大偏移的翻页——取第 15 万零 10 行,
引擎要扫过并丢掉前 15 万行。

keyset 分页改记"上页最后一条的 id",用 `WHERE id > ? ORDER BY id
LIMIT 10` 直接跳到起点;相关子查询指子查询引用了外层行的列,外层每
返回一行它都要重算一次。

可以把账本想成餐厅流水:每道菜卖几单、总额多少,月底一排就知道谁在
赚钱。但和流水不同的是,它按菜谱归档——同一模板不同参数记在一行,
快慢参数混在一起,均值可能骗人。

| 病灶 | 为什么慢 | 改写 |
|:--|:--|:--|
| 深分页 OFFSET 15 万 | 扫过并丢弃 15 万行 | keyset:WHERE id > 上页末尾 |
| 相关子查询 2000 客户 | 每个客户单独探一次订单表 | LEFT JOIN + GROUP BY 一次算完 |
| SELECT * 宽行 | 每行 ~120B 原样搬运 | 只投影需要的列 |

体检流程:嫌疑查询执行后进账本,reset 保证榜单只含嫌疑,Top 榜确认
全部命中,再对最慢者下刀改写。

![Lab 09 · 慢查询的体检流程:pg_stat_statements 定位,两条改写收尾](images/slow_query_tuning.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/09_slow_query_tuning/images/slow_query_tuning.html)
> (或本地打开 [`images/slow_query_tuning.html`](images/slow_query_tuning.html))。

## When to Use

**典型场景**。上线后例行体检:每周看一眼 Top 榜,防患未然;接口突然变慢:
榜单直接点名最烧钱的 SQL 模板;容量评估前:找出高频查询重点优化。

**何时不用**。一次性运维 SQL 不必入账分析;刚 reset 完样本太少,均值
不可信;单条复杂查询的细节诊断,EXPLAIN ANALYZE(实验 07)才是对的工具。

| 工具 | 差异 | 什么时候选它 |
|:--|:--|:--|
| pg_stat_statements | 按模板聚合,历史累计 | 找"最烧钱"的 SQL |
| EXPLAIN ANALYZE | 单条执行的完整计划 | 深挖某一条为什么慢 |
| 慢日志 | 逐条记录,超阈值才记 | 审计与留存 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 postgres:16-alpine 就位、venv 装好
psycopg。一条命令跑完整生命周期(含 20 万行种子,约 40 秒):

```bash
cd database/09_slow_query_tuning && ./slow_query_tuning.sh all
```

真实输出(节选,完整 13 项断言以实跑为准):

```text
=====> [top] 读 pg_stat_statements Top5, 三条慢查询应全部上榜
      [ 3 次 mean    20.27 ms total     60.81 ms] SELECT c.id, c.name, (SELECT count(*) FROM ...
      [ 3 次 mean     6.11 ms total     18.32 ms] SELECT * FROM orders ORDER BY id OFFSET $1 LIMIT $2
  [PASS] 三条慢查询占 Top5 中 3 席(>=3 即与构造意图一致)
    ...
=====> [rewrite] 深分页改 keyset; 相关子查询改 LEFT JOIN + GROUP BY
    OFFSET 版 9.02 ms vs keyset 版 0.784 ms
    提速 11x
  [PASS] keyset 耗时 <= 1/10 (实际 1/11)
  [PASS] 子查询版与 JOIN 版逐行结果一致(客户id + 订单数)
==== 实验 09 · slow_query_tuning 全部 13 项断言通过 [PASS] ====
```

诚实预期:耗时与倍数随机器波动,但 keyset 提速稳定在 10 倍以上(本机
两次实测 11x 与 12x);Top 榜的排序随三类查询的相对耗时浮动,断言只锁
"三条全部上榜"不锁名次;`all` 结束容器回收,重跑从空库开始。

## How It Works

### 归一化与指纹:按结构找,别按原文找

账本把 `OFFSET 150000` 记成 `OFFSET $1`——字面量全部换成占位符,指纹
因此用结构串:"OFFSET"、"customer_id = c.id"、"status = $1",参数怎么
变都命中。同模板合并记账也在于此:几十万个不同参数的翻页请求,只是
同一行的 calls 加一。

### 为什么 OFFSET 慢、keyset 快

`OFFSET 150000 LIMIT 10` 在引擎里的执行是:按 id 排序从头走,数过 15 万
行丢掉,再把接下来 10 行给你——丢掉的那些才是成本大头。

keyset 把"数 15 万行"换成"从上页末行之后开始走"(WHERE id > 150000):
主键本身有序,
直接定位起点,走 10 行收工。分页越深差距越大,11~12 倍只是 15 万深度
的成绩,翻到 90 万页会更悬殊。

### 相关子查询改 JOIN:2000 次探查并成一次

子查询版让客户表的每一行都触发一次订单表计数,2000 行就是 2000 次索引
探查;LEFT JOIN + GROUP BY 把订单表整体扫一遍,按客户分组一次算完。

改写铁律:先逐行比对两版结果(本实验 2000 行客户计数一致),再谈快慢
——本实验 JOIN 版更快(实测 13.3 ms vs 17.3 ms,快约三成)。

## Pitfalls & Q&A

**坑 1:指纹要按归一化后的结构找**。拿原文数字去榜上搜永远落空;
匹配 "OFFSET" 与 "$1" 这类结构串,参数变化才不影响断言。

**坑 2:读榜前先 reset**。账本是历史累计,种子阶段的 INSERT 会霸占
Top 榜;`pg_stat_statements_reset()` 清零后立刻跑嫌疑查询,榜单只含
嫌疑人。

**坑 3:keyset 需要唯一排序键**。`WHERE id > ? ORDER BY id` 依赖 id
唯一且有序;按非唯一列(如 created_at)翻页会丢行或重行,要用
(created_at, id) 组合键。

**Q1:pg_stat_statements 有开销吗?** 有,每次执行多一次记账,官方口径
个位数百分比;常开无妨,怕敏感参数入账可用 pg_stat_statements.track
配置收紧。

**Q2:OFFSET 什么时候可接受?** 偏移量小(前几页)或一次性运维查询;
用户不会翻到第 1500 页的界面,别为不存在的深翻页过度设计。

**Q3:mean 和 total 先看哪个?** 找"单条最慢"看 mean,找"整体最烧钱"
看 total(次数 × 均值)——每 5 分钟跑一次的 2 秒查询,比每天一次的
30 秒查询更该先优化。
