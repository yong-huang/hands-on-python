# 04 · 窗口函数与 CTE:明细行旁开一扇统计的窗

> 同一份销售明细,做出排行榜并列名次、每人最近一笔订单、月度营收环比三张
> 报表,再用递归 CTE 走完五层组织树。读完本篇,你能说清窗口函数与 GROUP BY
> 的分工、三个排序函数对同分的不同处理、窗口结果为什么要用 CTE 包一层才能
> 过滤,13 项断言跑成全绿。

## Background

只有 GROUP BY 的年代,报表写成了套娃:想给销售排名,得先把每人总额用子查询
聚合出来再套一层排序编号——"每人消费额加名次"一个诉求,SQL 要叠两三层;
想要"每人最近一笔",得自连接(表和自己 JOIN)再反连接(JOIN 完再反向排除,
只留最近的一笔),读到的人理不清哪层在干什么。

痛点本质是表达力:名次、最近一笔、环比这类"引用旁边行"的计算,GROUP BY
表达不出来——它把整组压成一行,明细信息当场丢失;搬到应用层用 Python 算,
数据库就只当了存取工具。

SQL:2003 标准补上了窗口函数:在保留明细行的同时,按组算出统计值贴在每行
旁边;CTE(WITH 查询:给一段查询起个名字,供主查询引用)再把长查询拆成
命名的分步。SQLite 从 3.25(2018 年)起支持,本实验把四张报表逐个跑成
可断言的证据。

## What

**定义**:窗口函数是带 OVER 子句的函数——PARTITION BY 把行分成组
(分组但不合并行),组内按 ORDER BY 定序,结果贴在行旁;ROW_NUMBER、
RANK、DENSE_RANK 负责名次,LAG/LEAD 跨行取值(如 LAG(total) 把 1 月的
900 挪到 2 月当"上月"列)。

可以把窗口想成"把本组成绩单复印一份贴到每人桌上":每人都能看到自己的
名次和上下文,人数没有变少。但和 GROUP BY 不同的是,窗口从不减少行数——
要出汇总数字,仍要老老实实 GROUP BY。

同分 750 的赵敏与周琪,三个排序函数给出三种答案:

| 销售总额榜 | ROW_NUMBER | RANK | DENSE_RANK |
|:--|:--:|:--:|:--:|
| 王强 950 | 1 | 1 | 1 |
| 周琪 750 | 2 | 2 | 2 |
| 赵敏 750 | 3 | 2 | 2 |
| 孙磊 550 | 4 | 4 | 3 |

CTE 是 WITH 里命名的临时结果集;WITH RECURSIVE 允许 CTE 引用自己,
从而遍历层级。

设计演进:明细行经 OVER 开窗补上统计列,用 CTE 命名中间结果,再组装成
报表或递归遍历组织树。

![Lab 04 · 从明细到报表:窗口开在行旁,CTE 命名分步](images/window_cte.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/04_window_cte/images/window_cte.html)
> (或本地打开 [`images/window_cte.html`](images/window_cte.html))。

## When to Use

**典型场景**。排行榜与发奖:成绩并列时名次规则要明确。TopN-per-group:
每人/每类取最近或最高的一条,不许出现两行。环比同比:本月对上月、本季对
上季。组织树、物料清单、评论楼中楼:层级遍历靠 WITH RECURSIVE。

**何时不用**。只要汇总数字(总营收、订单数)用 GROUP BY 即可,窗口是
多余开销;数据量小且一次性分析,Python 里 pandas 一行更直接。

| 手段 | 差异 | 什么时候选它 |
|:--|:--|:--|
| GROUP BY | 每组压成一行 | 纯汇总数字 |
| 窗口函数 | 行不减少,统计贴行旁 | 名次、最近一笔、环比 |
| 自连接/子查询 | 旧写法,可读性差 | SQLite < 3.25 的兜底 |

## Quick Start

前置条件:Python 3.8+ 与 SQLite ≥ 3.25(窗口函数门槛),仅标准库,无第三方
依赖。运行主脚本:

```bash
cd database/04_window_cte && python3 window_cte.py
```

真实输出(节选,完整 13 项断言以实跑为准):

```text
=====> [report1] 排行榜: 赵敏与周琪同分 750, 看三个名次函数各给什么
    王强  总额 950  ROW_NUMBER=1 RANK=1 DENSE_RANK=1
    周琪  总额 750  ROW_NUMBER=2 RANK=2 DENSE_RANK=2
    赵敏  总额 750  ROW_NUMBER=3 RANK=2 DENSE_RANK=2
    ...
  [PASS] RANK 同分同名次但跳号(2,2 后跳 4), DENSE_RANK 不跳号(2,2 后接 3)
    ...(report2 每人最近一笔、report3 月度环比 从略)
=====> [report4] 组织树: 递归 CTE 从 CEO 走到每个工位
    第 1 层 1 人 ... 第 5 层 2 人
  [PASS] 全树 10 人遍历无遗漏, 最深 5 层
    ...
  [PASS] 自底向上汇报链: 孙磊 一路追到 CEO 张伟

============================================================
==== 实验 04 · window_cte 全部 13 项断言通过 [PASS] ====
```

诚实预期:SQLite 版本低于 3.25 时,脚本入口的版本守卫会直接报错退出并给出
当前版本号;不加守卫的裸 SQL 才会在窗口函数处报语法错误。默认运行结束
删除库文件;加 `--keep` 保留后可用 sqlite3 命令行客户端逐条复跑报表。

## How It Works

### 执行时点:窗口排在 GROUP BY 之后、最终排序之前

逻辑执行顺序是 FROM → GROUP BY → HAVING → 窗口 → ORDER BY。所以窗口里
能引用聚合结果(`RANK() OVER (ORDER BY SUM(amount) DESC)` 合法),而
WHERE 在窗口之前执行,引用不到窗口列——这个时点差正是 TopN 必须套 CTE
的原因。

### TopN 模板:CTE 承载窗口列,外层再筛

ROW_NUMBER() OVER (PARTITION BY salesperson ORDER BY order_date DESC)
给每人组内编好序号,此列在同级 WHERE 里看不见;用 CTE 命名后,外层
WHERE rn = 1 才筛得出每人最近一笔。PARTITION BY 换个列就是"每类最贵
商品"。

### WITH RECURSIVE:锚加递归,逐层生长

递归 CTE 两段式:锚成员选树根(顶层 CEO),递归成员把上一轮结果与
员工表 JOIN 找出直接下属,UNION ALL 接上,一轮轮长到没有新行为止。
反向同理:从叶子孙磊出发,沿 manager_id 上行,四步追到 CEO。数据有环
时递归停不下来,递归成员里加 lvl < N 上限兜底。

## Pitfalls & Q&A

**坑 1:同分的 ROW_NUMBER 顺序随排序键的文本序走**。本实验 tiebreaker
(并列时的补充排序键)是销售名,实测 Unicode 码点"周"(U+5468)排在
"赵"(U+8D75)前——并列先后并不随机,也不直觉;要么显式声明
tiebreaker 并写进需求,要么改用 RANK 接受并列。

**坑 2:PARTITION BY 忘写,全表就是一个组**。名次全表连排,分组内序号
全错;窗口语义里"分组"是显式声明,没有默认按某列分组这回事。

**坑 3:递归 CTE 的环**。组织树里两人互为上级时,沿 manager_id 上行的
递归永远产出新行,查询跑不完;自顶向下的查询虽会终止却会静默漏人——
加 lvl < N 深度上限,或递归列里记录路径去重。

**Q1:三个排名函数分别什么时候用?** 发奖牌用 RANK(并列第二就没有第三,
符合奖牌直觉);分页取"第 2 页 10 条"用 ROW_NUMBER(必须唯一且连续);
分组内编号打标用 DENSE_RANK(并列占用名次但不留空洞)。

**Q2:窗口还能更细吗?** 能。帧子句如
`SUM(amount) OVER (ORDER BY id ROWS UNBOUNDED PRECEDING)` 算累计值,
窗口的起止行可以逐行滑动,本实验的三张报表只用到最常用的默认帧。

**Q3:GROUP BY 与窗口能同场吗?** 能,且本实验就在用:排行榜先按人聚合
出总额,窗口再对聚合结果排名。顺序记住一句话——先压行(GROUP BY),
再开窗(OVER),最后排序(ORDER BY)。
