# 03 · JOIN 与聚合查询手册:电商订单域十问

> 用四张表(客户/订单/明细/商品)搭一个电商订单域,回答十个真实业务问题,
> 每问一条 SQL、一条断言。读完本篇,你能按问题选对 JOIN 的种类,说清
> COUNT(*) 与 COUNT(列)、HAVING 与 WHERE 的分工,并亲手复现 NOT IN
> 遇上 NULL 时"全军覆没"的经典陷阱,15 项断言跑成全绿。

## Background

数据拆成多张表存放后,跨表问题出现了:回答"每个客户买了什么、花了多少",
要同时打开客户表和订单表,人工逐行比对编号——纸质台账时代靠登记员搬运,
电子表格时代靠复制粘贴,表一多就拼不动。

人肉拼接还有口径问题。同一份"客户消费额",A 报表算了散客订单,B 报表没算,
两个数字对不上;客户改了名字,旧报表里还是旧称呼,没人说得清哪份可信。

JOIN(连接:按匹配条件把两张表的行临时拼成一张结果表)由关系模型(把数据
拆成多张二维表、表间用编号互相关联的组织方式)一并给出:数据各存各的,
查询时按需拼装。

拼完再用聚合(按 GROUP BY 分组,把每组多行汇总成一行,如 COUNT 计数、
SUM 求和)出统计口径。本实验用十个业务问题把机制逐个跑成可断言的证据。

## What

**定义**:JOIN 家族按"没匹配上的行怎么处理"分工——INNER JOIN(内连接)
只保留两表都匹配的行;LEFT JOIN(左连接)保住左表全部行,右表没匹配的
位置填 NULL(空值,相当于 Python 的 None);SELF JOIN(自连接)是同一
张表和自己拼,靠别名扮两个角色。

CROSS JOIN(笛卡尔积:两表行两两全组合)用于生成组合表。判断用哪种,
先看"不存在匹配的行要不要出现在答案里"。

可以把 JOIN 想成两份名单穿针引线地缝合:匹配条件是针脚。但和缝纫不同的
是,内连接会把没缝上的部分直接剪掉——本实验的散客订单(customer_id 为
NULL 的无账户订单)在第一次内连接就消失了,这正是后续多个陷阱的源头。

十问速览(每问完整 SQL 与结果见脚本生成的 join_playbook.md):

| 问题组 | 业务问题 | 关键机制 |
|:--|:--|:--|
| Q1-Q2 | 订单归属、明细展开 | 内连接与三表连接,散客单被滤掉 |
| Q3-Q4 | 未下单客户、各客户单量 | 只有 LEFT JOIN 能答,零单客户计 0 |
| Q5 | 总单数 vs 用券单数 | COUNT(*) 数行,COUNT(列) 跳过 NULL |
| Q6-Q7 | 消费榜首、消费过线 | SUM + ORDER BY(按列排序),分组筛选用 HAVING |
| Q8 | 谁和谁同城 | SELF JOIN,别名两个角色 |
| Q9 | 买过外设的客户 | 子查询(嵌在另一条 SQL 里的查询)与 JOIN 两种写法同一答案 |
| Q10 | 从没下过单(NOT IN 版) | 子查询混入 NULL,NOT IN 全空 |

![Lab 03 · 电商订单域四表地图:JOIN 的路线与 NULL 的埋伏](images/join_aggregation.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/03_join_aggregation/images/join_aggregation.html)
> (或本地打开 [`images/join_aggregation.html`](images/join_aggregation.html))。

## When to Use

**典型场景**。后台列表页与报表:一次 JOIN 把名称、金额、状态拼齐,不逐行
回库。对账与稽核:两份明细 JOIN 后找差异行。数据看板:GROUP BY + 聚合
出日活、客单价、复购率这类统计口径。

**何时不用**。应用代码循环里逐行查库再自行拼接(N+1 查询:一次查询派生
N 次后续查询的反模式)应改成一次 JOIN 或批量 IN;见 web/06 的实测。

| 手段 | 差异 | 什么时候选它 |
|:--|:--|:--|
| JOIN | 库内拼装,由优化器(自动挑执行路径的组件)选路径 | 默认首选 |
| 子查询 | 逻辑分层,可读性好 | 只问"存不存在"的场景,用 IN 或 EXISTS(存在测试:子查询查到行即为真)(Q9) |
| 应用层拼接 | 灵活但要自己管一致性 | 跨库、跨数据源时 |

## Quick Start

前置条件:Python 3.8+,仅标准库 `sqlite3`,无第三方依赖。运行主脚本:

```bash
cd database/03_join_aggregation && python3 join_aggregation.py
```

真实输出(节选,完整 15 项断言以实跑为准):

```text
=====> [qa] 十问逐条断言: JOIN 全家族 + 聚合陷阱

  -- Q3: 哪些客户从没下过单?(LEFT JOIN 正解)
    内连接版本 0 行(它造不出'没匹配上的行'), LEFT JOIN 找到 ['阿花', '大雄', '小美']
  [PASS] Q3 只有 LEFT JOIN 能解: ['阿花', '大雄', '小美']

  -- Q5: 总订单数与用券订单数(COUNT(*) vs COUNT(列))
    COUNT(*)=6, COUNT(coupon)=3 —— 3 个 NULL 不参与计数
  [PASS] Q5 6 笔订单中 3 笔用了券

  -- Q10: NOT IN 版本: 子查询里混入一个 NULL, 全军覆没
    LEFT JOIN 找到 ['阿花', '大雄', '小美'], NOT IN 只剩 0 行 (x <> NULL 得 UNKNOWN, AND 上它整句永假)
  [PASS] Q10 NOT IN 遇 NULL 全空(0 行), LEFT JOIN 正常 3 行

============================================================
==== 实验 03 · join_aggregation 全部 15 项断言通过 [PASS] ====
```

诚实预期:退出码 0 即全绿。默认运行结束删除库文件与 join_playbook.md;
加 `--keep` 保留两者,可用 sqlite3 命令行客户端对着手册逐问复跑。

## How It Works

### LEFT JOIN:不存在匹配的行,也要留在答案里

Q3 的内连接写法把"从没下过单"翻译成"订单行不存在",但内连接只会输出
匹配上的行,永远造不出"客户在、订单无"的结果(实测 0 行)。LEFT JOIN
保住左表全行,右表补 NULL,再用 `WHERE o.id IS NULL` 挑出补 NULL 的行——
3 位零单客户就是这么现身的。

### COUNT 三兄弟:数行、数非空、数右表

`COUNT(*)` 数行数;`COUNT(列)` 只数该列非 NULL 的值(Q5 里 6 对 3);
LEFT JOIN 之后若用 `COUNT(*)`,右表补 NULL 的行也计入,零单客户会被数
成 1 单——必须 `COUNT(o.id)` 让 NULL 落空(Q4 同一客户两写法 0 对 1)。

### NOT IN 遇上 NULL:三值逻辑的滑铁卢

SQL 的比较是三值逻辑:TRUE / FALSE 之外还有 UNKNOWN(NULL 与任何值比较
都是 UNKNOWN)。`x NOT IN (1, 3, NULL)` 展开成 `x<>1 AND x<>3 AND
x<>NULL`,最后一项永为 UNKNOWN,AND 起来整句无法为 TRUE。

Q10 实测 0 行,语义相同的 LEFT JOIN 版本返回 3 行。防法:外键列(引用
另一张表主键的列,如 orders.customer_id)声明 NOT NULL,或用 NOT EXISTS
(外层行在子查询查不到匹配时才保留,不受 NULL 干扰)替代 NOT IN。

## Pitfalls & Q&A

**坑 1:LEFT JOIN 的右表条件写在 WHERE 里会退化成内连接**。WHERE 在连接
之后过滤,`WHERE o.status='paid'` 会把补 NULL 的行筛没;对右表的过滤要
写进 ON 条件。解法:先问"这条件是筛选匹配,还是筛选结果"。

**坑 2:GROUP BY 的 SELECT 列纪律**。SQLite 允许 SELECT 不在分组里的列
(取该组任意一行),PostgreSQL 直接报错。跨库的写法:SELECT 列要么出现在
GROUP BY,要么包进聚合。

**坑 3:SUM 遇上全 NULL 不返回 0**。SUM 忽略 NULL 值,但组内全是 NULL 时
结果是 NULL 而非 0;需要 0 就 `COALESCE(SUM(x), 0)` 包一层。

**Q1:WHERE 和 HAVING 谁先执行?** WHERE 先筛原始行,HAVING 后筛分组,
所以 HAVING 里才能用 SUM 这类聚合;能在 WHERE 做的过滤别推到 HAVING,
分组越少越快。

**Q2:CROSS JOIN 什么时候有用?** 生成组合维表:城市 × 类目铺满报表骨架,
没有数据的日子也要显示 0;配合 LEFT JOIN 补数即可。

**Q3:同一问题,子查询和 JOIN 怎么选?** 语义上 Q9 两者等价(实测结果集
一致);读感上"是否存在"用 IN/EXISTS 子查询更贴近问句,"要带出对方列"
只能 JOIN。执行计划(数据库实际执行一条 SQL 的步骤方案)上,现代优化器
常把两者改写成同一个计划,先写清楚再谈优化。
