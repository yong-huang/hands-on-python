# 27 · 🏁 数据库巡检与压测报告:一键巡检,可复跑报告

> 100 万行订单表 + pgbench 压测 + 四大巡检指标 + 慢查询索引优化对比
> (实测 412~488x),全部收拢为一个 inspection_report.md——可复跑、
> 数字说话。7 项断言跑成全绿。

## Background

前 26 个实验各管一个专题,但真实生产系统的数据库需要定期做一次全面
"体检":压测看容量上限、巡检指标看健康状态、慢查询看优化空间。这些
工作零散地做容易遗漏,集中做又需要一套标准流程。

巡检报告的价值在于**可复跑**:每次产出格式一致的 Markdown,数字可以
跨时间对比(本周 TPS 比上周降了 30%?),也可以交给不懂数据库的人看。
本实验把 seed→bench→inspect→optimize→report 串成一条流水线,一键跑完。

## What

**定义**:数据库巡检是对运行中的数据库采集关键健康指标的过程,本实验
覆盖四项:缓存命中率(PG 从共享缓冲命中而非磁盘读的比例)、索引使用率
(每个索引被扫描的次数,长期为 0 的该下线)、当前连接数、表大小。压测
用 pgbench(PG 自带的基准测试工具)产出 TPS(每秒事务数)。

可以把巡检报告想成体检报告:血压、心率、血脂是指标,跑步机测心肺是
压测——指标反映当前状态,压测反映上限。但和体检不同的是,数据库巡检
可以自动化一键复跑,每次产出格式一致的报告方便跨时间对比。

| 巡检项 | 含义 | 本实验实测 |
|:--|:--|:--|
| pgbench TPS | 每秒事务数 | 670~846 |
| 缓存命中率 | blks_hit / (hit+read) | 100% |
| 索引 idx_scan | 被扫描次数 | 死索引=0 可见 |
| 优化提速 | 索引前后比值 | 412~488x |

![Lab 27 · 一键巡检:种子→压测→四大指标→优化→可复跑报告](images/db_inspection_report.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/27_db_inspection_report/images/db_inspection_report.html)
> (或本地打开 [`images/db_inspection_report.html`](images/db_inspection_report.html))。

## When to Use

**典型场景**。上线前容量评估:压测 TPS 确认能扛住预期流量;定期健康
检查:每周跑一次巡检,对比趋势发现劣化;性能优化验证:优化前后各跑
一轮,数字说话。

**何时不用**。开发环境的数据量太小,压测结果无参考价值;已有专业监控
系统(Prometheus + Grafana)时,手工巡检只是补充。

| 手段 | 覆盖面 | 可复跑性 | 什么时候选它 |
|:--|:--|:--|:--|
| 一键巡检脚本 | 四指标+压测 | 一键复跑 | 定期体检 + 优化验证 |
| Prometheus 监控 | 全指标实时 | 持续采集 | 生产长驻 |
| 手工 EXPLAIN | 单查询 | 不可比 | 临时排障 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 postgres:16-alpine 与
redis:7-alpine 就位、venv 装好 psycopg。一条命令跑完整生命周期
(含 100 万行种子与 pgbench 压测,约 30 秒):

```bash
cd database/27_db_inspection_report && ./db_inspection_report.sh all
```

真实输出(节选,完整 7 项断言以实跑为准):

```text
=====> [bench] pgbench 内置 TP 简单更新压测(5 秒 x 2 客户端)
    tps = 846.940850 (without initial connection time)
  [PASS] pgbench 压测 TPS > 100 (实测 670)
=====> [inspect] 四大巡检指标: 缓存命中率 / 索引使用率 / 连接数 / 表大小
    缓存命中率: 100.0%
  [PASS] 缓存命中率 >= 90% (实测 100.0%)
=====> [optimize] 慢查询优化: 无索引 vs 建索引, EXPLAIN 耗时对比 >= 2x
    优化前 17.6 ms -> 优化后 0.0 ms (提速 487.9x)
  [PASS] 索引优化提速 >= 2x (实际 487.9x)
==== 实验 27 · db_inspection_report 全部 7 项断言通过 [PASS] ====
```

诚实预期:TPS 与优化提速倍数随机器波动(实测 670~846 tps、412~488x),
断言只锁下限(TPS>100、提速>=2x);clean 后报告也被删,重跑 `all` 会
重新生成——报告是实验产物,不是永久文件。

## How It Works

### pgbench:PG 自带的基准测试工具

`pgbench -i` 初始化内置表(pgbench_accounts 等),`pgbench -c 2 -t 50`
用 2 个客户端各跑 50 笔事务,输出 TPS。TPS 数字受硬件、shared_buffers、
fsync 档位影响——绝对值无意义,跨时间对比才有参考价值。

### 慢查询优化:EXPLAIN ANALYZE 前后对比

同一查询(无索引 LIKE vs 建 text_pattern_ops 索引),优化前 17.6ms、
优化后亚毫秒级,提速数百倍。`text_pattern_ops` 是专为 LIKE/前缀匹配
设计的 B-tree 操作符类——默认的 C locale 排序对 LIKE 不生效,需要
显式指定。

### 巡检指标:pg_stat 系统视图

缓存命中率来自 pg_stat_database(blks_hit/blks_hit+blks_read);索引
使用率来自 pg_stat_user_indexes(idx_scan);表大小来自 pg_total_relation_
size。这些系统视图是 PG 内置的"体检仪器",零成本采集。

## Pitfalls & Q&A

**坑 1:pgbench 输出的 TPS 行在 stderr**。subprocess 捕获时要合并
stdout 与 stderr,只读 stdout 会漏掉 TPS 行;TPS 数字用正则
`r'tps = ([\d.]+)'` 提取,不能用 split("t") 之类的字符切分。

**坑 2:EXPLAIN ANALYZE 的输出是 tuple 列表**。cur.fetchall() 返回
[(text,), (text,)...],每行需要 r[0] 取字符串;直接对 tuple 调 split
会报 AttributeError。

**坑 3:pgbench -i 要先跑**。pgbench 需要内置表(pgbench_accounts 等),
不先初始化就跑压测会报错;本实验用 `pgbench -i -q lab` 先初始化。

**Q1:巡检报告的数字能跨机器对比吗?** 结构可以(指标种类、断言逻辑),
绝对值不行(硬件差异太大);跨时间对比才有意义——同一台机器本周 vs
上周。

**Q2:缓存命中率 100% 是好事吗?** 通常是的——所有数据都在共享缓冲
里;但如果表比 shared_buffers 还大却仍 100%,可能是只读了热数据,
冷数据的命中率要单独看。

**Q3:100 万行的优化提速 488x,生产也会这么夸张吗?** 取决于选择性——
本实验 LIKE 'a%' 的匹配率极低(索引优势最大);如果匹配 50% 的行,
优化倍数会骤降但绝对提升仍然可观。
