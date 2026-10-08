# 🗄️ Python 数据库 27 小项目学习清单（含 1 个选做） · Todo List

> 通过 27 个小项目（每项目 120-300 行应用代码 + 配套演示脚本）系统掌握数据库：SQLite 零依赖打下 SQL 与建模地基，进 PostgreSQL 主线把索引、慢查询、锁与隔离级别全部实测，再向运维视角要可靠性与规模化，然后拿 Redis 与 MongoDB 补齐缓存与文档两大场景，最终串联为三库协作平台与一份可复跑的数据库巡检报告
> 约束：macOS Apple Silicon · OrbStack 2.2.3 跑容器（postgres:16-alpine / redis:7-alpine / mongo:7 已拉取并探活，实测记录见文末速查表）· Python 3.13.9 + SQLite 3.51 本机自带 · 阶段一零第三方依赖；容器由各项目演示脚本拉起并清理、不常驻
> 串联机制：知识体系型——阶段即能力等级（SQL 地基 → PostgreSQL 主线 → 可靠性与规模化 → Redis 缓存 → MongoDB 文档库 → 串联交付），项目 26 为 ⛓️ 三库集成点，项目 27 为 🏁 综合交付
> 预计周期：8 周（每天 1.5-2 小时）

## 🤖 AI 辅助提示词速查

| 场景 | 提示词 |
|:---|:---|
| **开始一个新项目** | `我要开始 Python 数据库项目「[名称]」（database/NN_short_name/），目标是 [目标]。请给我完整代码约 [行数] 行：主演示脚本（创建 → 观察 → 破坏/加压 → 验证 → 清理，断言输出 [PASS]），运行在 database/.venv（Python 3.13，psycopg/redis/pymongo 按项目选用），数据库容器 docker run -d --rm 拉起、脚本结尾清理（镜像与端口见清单对应项目），附验收命令，中文注释。只输出代码。` |
| **排障** | `我的数据库项目出现 [报错/变慢/锁等待]。数据库 [PostgreSQL/Redis/Mongo] 容器日志：[粘贴]；EXPLAIN ANALYZE 或客户端报错输出：[粘贴]。请分析根因并给最小修复与验证命令。` |
| **执行计划审查** | `这条 SQL：[粘贴]；EXPLAIN ANALYZE 输出：[粘贴]；表结构与索引：[粘贴]。请指出索引是否被用、扫描行数是否合理，并给加索引或改写方案，要求给出优化前后 EXPLAIN 对比。` |
| **缓存方案审查** | `我的缓存读写代码：[粘贴]。请指出穿透/击穿/雪崩防护是否完备、缓存与数据库的一致性窗口在哪里、并发下是否安全，并给修复对照。` |

## 📊 总进度

进度：█████████████░░░░░░░░░ 13/27 (48%)

| 阶段 | 项目数 | 已完成 |
|:---|:---:|:---:|
| 第一阶段：SQL 与建模地基（项目 1-5） | 5 | 5 |
| 第二阶段：PostgreSQL 主线（项目 6-12） | 7 | 7 |
| 第三阶段：可靠性与规模化（项目 13-16） | 4 | 1 |
| 第四阶段：Redis 缓存实战（项目 17-21） | 5 | 5 |
| 第五阶段：MongoDB 文档库（项目 22-25） | 4 | 4 |
| 第六阶段：串联与交付（项目 26-27） | 2 | 2 |
| **合计** | **27** | **13** |

---

## 🗂️ 第一阶段：SQL 与建模地基（项目 1-5）

> **目标**：SQLite 零依赖起步——写得出复杂业务查询、建得出不返工的表、控得住事务边界，全程用可断言的脚本证明

### [x] 项目 1：SQL CRUD 与约束系统

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~230 行（sql_crud.py 单文件生命周期演示，实装 233 行） |
| **核心知识点** | CREATE TABLE / INSERT / UPDATE / DELETE / SELECT、五种约束（PK/NOT NULL/UNIQUE/CHECK/FK）、DB-API 参数绑定、SQL 注入对比 |
| **技术栈** | Python 标准库 sqlite3（✅ 实测 3.51.0，零第三方依赖；✅ 2026-10-07 实现并通过脚本验收） |
| **验收标准** | 演示脚本对五类约束各触发一次非法写入并断言被拒；拼接 SQL 被引号逃逸攻击成功、参数绑定写法原样入库（防注入数字级对比断言）；`python3 01_sql_crud/sql_crud.py` 连跑 2 次输出全 [PASS] 且不留残留 .db 文件 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「SQL CRUD 与约束系统」（database/01_sql_crud/），目标：用标准库 sqlite3 演示建表、五类约束、CRUD 全套与参数绑定防注入。请给我完整代码约 180 行：单文件演示脚本（建表 → 五类约束逐个违反并断言拒绝 → CRUD 基本流 → 拼接 SQL 注入成功对比参数绑定被防 → 清理 .db 文件，断言输出 [PASS]），零第三方依赖，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：外键是五类约束里唯一默认关闭的——`PRAGMA foreign_keys` 默认 0，悬空引用静默入库，必须每连接显式开启；README 写浮点例子时凭直觉写了 `329.0*0.8`，实测 repr 是干净的 `263.2`（断言为假），换成实测出尾数的 `259.0*0.8 → 207.20000000000002`——写数值断言前必须先跑一次；小白评审第 1 轮抓出"引用了输出里不存在的证据"（写了"查询仍返回 3 行"但脚本从未这么查），机制陈述必须对应脚本真实输出。

---

### [x] 项目 2：表设计与三范式

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~265 行（schema_normalization.py 单文件生命周期演示，实装 265 行） |
| **核心知识点** | ER 建模、1NF/2NF/3NF、外键与级联（CASCADE/RESTRICT）、更新/插入/删除三类异常、反范式权衡 |
| **技术栈** | Python 标准库 sqlite3（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 1 |
| **验收标准** | 同一「学生选课」需求产出 1NF 违规表与 3NF 表两套 schema；脚本演示更新异常——改一门课名违规表 UPDATE 影响 N 行、3NF 表只改 1 行（数字断言）；`PRAGMA foreign_keys=ON` 下级联删除子表行数归零、RESTRICT 时被拒两种行为各断言一次 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「表设计与三范式」（database/02_schema_normalization/），目标：用同一选课需求对比 1NF 违规表与 3NF 表，实测更新异常与外键级联。请给我完整代码约 200 行：两套 schema 建表 → 插入同样数据 → 改课名演示 N 行 vs 1 行更新断言 → CASCADE/RESTRICT 两种删除行为断言 → 清理，断言输出 [PASS]，零第三方依赖，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：SQLite 的 rowcount 统计"匹配行"而非"值变化的行"——不带 WHERE 的 REPLACE() 连没变的行也计数（实测 4 行含 1 行没变），写更新断言必须带 WHERE；PRAGMA foreign_keys 在事务内执行不报错但静默失效（实测 foreign_keys 仍为 0），必须先 commit 再开；图管线上异常泳道（exception lane）的虚线边框会横贯整个画布，节点再少边框也顶到画布右缘（像素居中实测 R=0.0%），稀疏的下方泳道宁可砍掉、叙事交给卡片。

---

### [x] 项目 3：JOIN 与聚合查询手册

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~310 行（join_aggregation.py 单文件生命周期演示，实装 310 行；--keep 附赠 join_playbook.md 十问手册） |
| **核心知识点** | INNER/LEFT/CROSS/SELF JOIN、GROUP BY / HAVING、子查询 vs JOIN、NULL 三值逻辑与 COUNT 陷阱 |
| **技术栈** | Python 标准库 sqlite3（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 2 |
| **验收标准** | 十个业务问题（电商订单域）每问一条 SQL，全部跑通且与内置期望值逐条断言一致；其中 ≥2 问只能用外连接解出（内连接结果缺失断言）；1 问专门复现 COUNT(列) 与 COUNT(*) 在 NULL 下的差异并断言 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「JOIN 与聚合查询手册」（database/03_join_aggregation/），目标：电商订单域十条业务查询覆盖 JOIN 全家族与聚合陷阱。请给我完整代码约 250 行：建表造数据 → 十问逐条执行并断言期望值（含 2 问必须外连接、1 问 COUNT NULL 陷阱）→ 生成 join_playbook.md 查询手册（每问业务描述 + SQL + 结果）→ 清理，断言输出 [PASS]，零第三方依赖，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：断言期望值必须在造数后逐条推演——首轮实跑连错三处（没下单的客户漏算阿花、外设买家漏算小熊、Q3 双写法把手册题号计成 13），数字断言的期望值不是拍脑袋来的；`NOT IN (SELECT 列)` 子查询混入一个 NULL 整句永假（x<>NULL 为 UNKNOWN），LEFT JOIN IS NULL 是稳健替代；一问多写法在手册里算同一问，统计题号要用正则去重而非数标题。

---

### [x] 项目 4：窗口函数与 CTE

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~270 行（window_cte.py 单文件生命周期演示，实装 268 行） |
| **核心知识点** | OVER / PARTITION BY、ROW_NUMBER/RANK/DENSE_RANK、LAG/LEAD、CTE、WITH RECURSIVE 层级遍历 |
| **技术栈** | Python 标准库 sqlite3（窗口函数需 SQLite 3.25+，本机 3.51 ✅；✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 3 |
| **验收标准** | 三张报表各有数字断言：排行榜（同分并列名次规则明确）、每人最近一笔订单（TopN-per-group 不允许出现每人多行）、订单金额环比（LAG 计算）；WITH RECURSIVE 遍历出 ≥5 层组织树且叶子节点数断言正确 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「窗口函数与 CTE」（database/04_window_cte/），目标：排行榜、TopN-per-group、环比三报表 + 递归组织树。请给我完整代码约 220 行：建员工/订单/组织表 → 窗口函数三报表逐条断言（并列名次、每人取最近一单不重行、LAG 环比）→ WITH RECURSIVE 遍历 ≥5 层组织树并断言叶子数 → 清理，断言输出 [PASS]，零第三方依赖，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：同分并列时 ROW_NUMBER 的先后随 tiebreaker 的文本序（Unicode 码点：周 U+5468 < 赵 U+8D75，周琪排前）——期望值按直觉写就错了，写数字断言前先实跑；递归 CTE 反向汇报链的 JOIN 条件第一次就写错（e.id = e.manager_id 是自比较，正确的是 chain.pid = e.id 再找 manager）；输出块节选必须有省略标记，否则读者实跑逐行对不上（评审抓出 3 处）。

---

### [x] 项目 5：事务与 SAVEPOINT

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~255 行（transaction_savepoint.py 单文件生命周期演示，实装 255 行，含 kill -9 子进程） |
| **核心知识点** | BEGIN/COMMIT/ROLLBACK、SAVEPOINT 部分回滚、原子性与持久性、sqlite3 的 isolation_level 自动提交陷阱 |
| **技术栈** | Python 标准库 sqlite3（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 1 |
| **验收标准** | 子进程执行两步转账、中途 kill -9，重启校验两账户总额与转账前一致（数字断言）；SAVEPOINT 回滚内层后外层仍成功提交断言；演示不显式 commit 时另一连接读不到（隔离行为断言）与 python 默认事务行为说明 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「事务与 SAVEPOINT」（database/05_transaction_savepoint/），目标：事务边界与崩溃原子性实测。请给我完整代码约 200 行：转账演示（子进程执行 A→B 转账两步，第二步前 kill -9，主进程重启校验总额不变断言）→ SAVEPOINT 部分回滚断言外层可提交 → 未 commit 跨连接不可见断言 → 清理，断言输出 [PASS]，零第三方依赖（允许 os/subprocess），附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：kill -9 原子性实测的要点是让子进程在未提交事务内"挂住"（哨兵文件 + sleep 60）再杀，主进程必须先 close 让出文件锁；SIGKILL 是 POSIX 专属，Windows 跑不了这一步（诚实预期已写入 README）；回滚日志（-journal）在事务开启后出现、commit 后消失，实测可拿 os.path.exists 观察；CHECK 违反默认 ABORT 只回滚当前语句，同事务先前的语句仍有效（语句级与事务级原子性是两层）。

---

## 🗂️ 第二阶段：PostgreSQL 主线（项目 6-12）

> **目标**：从玩具库进入工业级——容器化 PostgreSQL，索引设计、慢查询治理、锁与隔离级别全部用百万行级数据实测出数字

### [x] 项目 6：PostgreSQL 上手与 SQLite 迁移

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~230 行（pg_migration.sh 容器生命周期 + pg_migration.py 迁移断言，实装约 240 行） |
| **核心知识点** | 容器化 PostgreSQL、psycopg 3 连接管理、跨库迁移对账、IDENTITY 主键、JSONB / ARRAY / NUMERIC 三种专有类型 |
| **技术栈** | postgres:16-alpine 容器（✅ 探活 16.15）+ psycopg 3.3.6（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 1-5 |
| **验收标准** | 一条命令起容器（--rm 拉起、脚本结尾清理）；SQLite 三张表迁入 PG 后逐表行数断言一致；JSONB / ARRAY / NUMERIC(10,2) 三种类型写入读回断言精度无损（NUMERIC 读回 == Decimal 写入值） |
| **⚠️ 风险** | 已化解：容器 initdb 阶段的临时实例会骗过 pg_isready——shell 等待窗口放宽到 60s + Python 侧连接重试；同名残留容器 start 前 docker rm -f 兜底 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「PostgreSQL 上手与 SQLite 迁移」（database/06_pg_migration/），目标：容器化 PG 与 SQLite→PG 数据迁移、专有类型体验。请给我完整代码约 220 行：start.sh 用 docker run 拉起 postgres:16-alpine（端口 55432、密码 lab）→ 等待就绪 → SQLite 三表数据迁入 PG 并逐表行数断言 → JSONB/ARRAY/NUMERIC(10,2) 写入读回精度断言 → clean.sh 停容器，断言输出 [PASS]，psycopg 3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：容器 initdb 阶段会先起一个临时实例，pg_isready 探活通过后真连接仍可能被拒（server closed the connection unexpectedly）——连接必须带重试；psql 非交互执行时 "Did not find any relations." 写在 stderr 不在 stdout，subprocess 捕获要合并；psycopg 3 的 f-string 占位符生成错误（`for _ in cols` 迭代了字符）；jsonb `@>` 两边类型必须都是 jsonb，参数要 `%s::jsonb` 显式转型；拼 SQL 在 psycopg 3 下其实能执行（评审实测纠正），参数化的意义是防注入与类型安全而非语法限制。

---

### [x] 项目 7：B-tree 索引与 EXPLAIN ANALYZE

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行（btree_explain.sh 容器生命周期 + btree_explain.py 百万行实测，实装 216 行） |
| **核心知识点** | B-tree 原理、EXPLAIN / EXPLAIN ANALYZE、Seq Scan vs Index Scan、索引失效场景（列上套函数）、ANALYZE 统计信息 |
| **技术栈** | postgres:16-alpine 容器 + psycopg 3（✅ 2026-10-07 实现并通过脚本验收，提速 258x-324x） |
| **前置** | 项目 6 |
| **验收标准** | 生成 100 万行订单表：无索引点查 EXPLAIN 输出 Seq Scan、建索引后同查询输出 Index Scan，实测耗时对比 ≥10× 并把两组数字写进断言输出；`WHERE upper(email)=...` 复现函数导致索引失效、表达式索引救回断言 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「B-tree 索引与 EXPLAIN ANALYZE」（database/07_btree_explain/），目标：百万行上实测索引前后扫描方式与耗时差异。请给我完整代码约 200 行：generate_rows 造 100 万行 → 无索引 Seq Scan 计时与 explain 节点断言 → 建索引 ANALYZE 后 Index Scan 断言、耗时对比 ≥10× 打印 → upper() 失效复现 + 表达式索引救回断言 → 清理，断言输出 [PASS]，psycopg 3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：psycopg 参数化下 SQL 的取模 % 必须写 %%（占位符前缀冲突）；`SELECT COUNT(*)` 的 EXPLAIN 首行是 Aggregate 节点恒 rows=1，行数估计必须取 Seq/Index Scan 节点；Parallel Seq Scan 把行数拆进各 worker 的 loops，真实行数在 Gather 汇总节点；百万行种子用服务端 generate_series + md5 秒级完成，别从 Python 搬；耗时数字每次波动（258x~324x）但倍数稳超 10x，断言按 ≥10x 写、数字只做打印。

---

### [x] 项目 8：复合索引与最左前缀

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~290 行（composite_index.sh 容器生命周期 + composite_index.py 矩阵实测，实装 236+52 行） |
| **核心知识点** | 复合索引列序、最左前缀原则、覆盖索引（Index Only Scan）、部分索引、pg_stat_user_indexes 死索引观测 |
| **技术栈** | postgres:16-alpine 容器 + psycopg 3（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 7 |
| **验收标准** | (region, status, created_at) 三列建复合索引，7 种 WHERE 列组合逐个 explain 并自动断言"走/不走"与最左前缀理论一致；覆盖查询 explain 断言 Index Only Scan；建一个从不被用的索引，pg_stat_user_indexes 断言其 idx_scan=0（死索引可视化） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「复合索引与最左前缀」（database/08_composite_index/），目标：实测最左前缀、覆盖索引与死索引观测。请给我完整代码约 220 行：造 50 万行数据 → (region,status,created_at) 复合索引 → 7 种 WHERE 组合循环 explain 断言走索引与否符合最左前缀 → 覆盖查询断言 Index Only Scan → 建死索引用 pg_stat_user_indexes 断言 idx_scan=0 → 清理，断言输出 [PASS]，psycopg 3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：Bitmap Heap Scan 主节点行不含索引名（索引名在子节点 Bitmap Index Scan 行），判"走不走"要收集全部扫描行；VACUUM 不能在事务块里跑（ActiveSqlTransaction），要独立 autocommit 连接，且种表连接必须先 commit 否则 VACUUM 连接看不见表；最重的坑——「EXPLAIN ANALYZE 不计入 idx_scan」是假阴性误判，它其实计入，只是统计要等事务提交/pg_stat_force_next_flush 强制上报后才可见（上报另有节流），立刻读是 0；独立最小复现（起独立容器对照 EXPLAIN 与真实执行的计数差）是拆穿这类统计时序假象的关键手段。

---

### [x] 项目 9：慢查询诊断与重写

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~240 行（slow_query_tuning.sh 容器生命周期 + slow_query_tuning.py 诊断实测，实装 236 行） |
| **核心知识点** | pg_stat_statements、深分页（OFFSET 陷阱）与 keyset 分页、SELECT * 代价、相关子查询改 JOIN |
| **技术栈** | postgres:16-alpine 容器（shared_preload_libraries 预载）+ psycopg 3（✅ 2026-10-07 实现并通过脚本验收，keyset 提速 11-13x） |
| **前置** | 项目 7、8 |
| **验收标准** | 构造的 3 条慢查询出现在 pg_stat_statements Top 列表且 total_exec_time 排名与构造意图一致（断言）；`OFFSET 90000 LIMIT 10` 改 keyset（`WHERE id > ? LIMIT 10`）后耗时断言 ≤1/10 且两结果集逐行 diff 为空；相关子查询改 JOIN 前后结果一致断言 + 耗时对比记录 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「慢查询诊断与重写」（database/09_slow_query_tuning/），目标：用 pg_stat_statements 定位慢查询并重写验证。请给我完整代码约 240 行：启动时 preload pg_stat_statements → 造数据 + 构造 3 类慢查询（深分页/相关子查询/SELECT * 大宽表）→ 从 pg_stat_statements 抓 Top 并断言命中 → keyset 改写断言 ≤1/10 耗时且结果 diff 为空 → 子查询改 JOIN 对比 → 清理，断言输出 [PASS]，psycopg 3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：pg_stat_statements 把字面量归一化成 $1/$2，Top 榜指纹必须按结构串找（"OFFSET"、"status = $1"）；读榜前必须 pg_stat_statements_reset()，否则种子 INSERT 霸榜；深分页 OFFSET 版与 keyset 版返回同一批行是硬校验（OFFSET 150000 与 WHERE id > 150000 同为 150001..150010，锚点差一就会跨页重行）；JOIN 改写提速幅度随数据浮动（约三成），断言只锁"不慢于"与结果一致，不锁倍数——没锁定的倍数别写进文档。

---

### [x] 项目 10：JSONB 与全文检索

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~250 行（jsonb_fulltext.sh 容器生命周期 + jsonb_fulltext.py 检索实测，实装 255 行） |
| **核心知识点** | JSONB 操作符与 GIN 索引、tsvector/tsquery、数组类型 = ANY 与 @>、PG 全文检索能力边界 |
| **技术栈** | postgres:16-alpine 容器 + psycopg 3（✅ 2026-10-07 实现并通过脚本验收，GIN 前后 8-11x） |
| **前置** | 项目 6 |
| **⚠️ 风险** | 已按设计执行：PG 原生 tsvector 不做中文分词——语料用英文，中文边界做成 0 命中断言如实记录；zhparser/pg_jieba 为选做不在验收内 |
| **验收标准** | JSONB @> 包含查询建 GIN 前后耗时对比 ≥5× 断言；tsquery 检索 10 个查询词召回 10/10 断言（AND 语义 rank 排序）；ARRAY 列 `= ANY(...)` + GIN 断言命中 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「JSONB 与全文检索」（database/10_jsonb_fulltext/），目标：半结构化数据与全文检索实测。请给我完整代码约 200 行：造 20 万行 JSONB 商品 + 英文文章表 → JSONB @> 查询 GIN 前后 ≥5× 对比断言 → to_tsvector/tsquery 十词召回 10/10 断言 → ARRAY + ANY + GIN 断言 → 清理，断言输出 [PASS]，psycopg 3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：`&` 是硬过滤不是加分——`database & index` 只命中双词文章，单词文章根本不进结果集，"含词越多排越前"要用 `|` 配 ts_rank；ts_rank 有并列（两篇单词文章同分），排序断言要么取第一名要么直接对比目标对的 rank 值；to_tsvector 要在 INSERT 时算好落列，查询里现算任何索引都用不上（评审实测 enable_seqscan=off 也只有 Seq Scan + Filter）；中文在默认分词器下整串一个 token，查'索引'对'数据库索引与查询优化'零命中——能力边界做成断言是诚实教学的好素材。

---

### [x] 项目 11：锁与死锁诊断

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~280 行（locks_deadlock.sh 容器生命周期 + locks_deadlock.py 并发实测，实装 282 行） |
| **核心知识点** | 行锁与 FOR UPDATE、FOR UPDATE SKIP LOCKED 任务队列、死锁检测（SQLSTATE 40P01）、pg_blocking_pids 阻塞链 |
| **技术栈** | postgres:16-alpine 容器 + psycopg 3 + threading（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 6 |
| **验收标准** | 两会话交叉更新同一两行，死锁 5/5 次被 PG 自动检测（捕获 40P01 且断言其中一方被回滚）；20 并发 FOR UPDATE 抢购 1 件库存，最终售出断言恰好 1 件（超卖=0）；脚本用 pg_locks 抓到 waiting 阻塞链并输出「谁等谁」诊断文本 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「锁与死锁诊断」（database/11_locks_deadlock/），目标：死锁复现与检测、悲观锁防超卖、阻塞链诊断。请给我完整代码约 250 行：两会话交叉更新复现死锁断言 40P01 5/5 次 → 20 线程 FOR UPDATE 抢购 1 件断言超卖 0 → pg_locks/pg_stat_activity 抓阻塞链输出诊断报告 → 清理，断言输出 [PASS]，psycopg 3 + threading，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：死锁复现的两会话要用 ThreadPoolExecutor 同时发起交叉更新，中间 sleep 0.1 确保等待顺序；PG 默认 1 秒 deadlock_timeout，每轮检测约 1 秒属正常；并发可见性坑——工作线程 UPDATE 完成但未提交时主线程读不到（v=0），线程内必须 commit 后再发完成信号；行锁只锁被改的行不锁整表（评审实测同表他行 0.002s 完成不受阻），"同表写全堵"是错误心智模型；EXPLAIN ANALYZE 式的验证在这里同理——阻塞链要用 pg_blocking_pids 主动抓，普通等待不报错。

---

### [x] 项目 12：隔离级别与 MVCC 实测

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~270 行（isolation_mvcc.sh 容器生命周期 + isolation_mvcc.py 矩阵实测，实装 273 行） |
| **核心知识点** | READ COMMITTED / REPEATABLE READ / SERIALIZABLE、脏读/不可重复读/幻读、MVCC 与 xmin/xmax、序列化失败重试 |
| **技术栈** | postgres:16-alpine 容器 + psycopg 3（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 5、11 |
| **验收标准** | 「3 类读异常 × 3 个隔离级别」矩阵脚本自动化复现：每格输出"复现/防住"，9 格判定与理论全部一致（断言）；xmin/xmax 现场观察断言旧版本对未提交会话不可见；SERIALIZABLE 冲突后重试同一事务成功断言 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「隔离级别与 MVCC 实测」（database/12_isolation_mvcc/），目标：读异常矩阵自动化复现与 MVCC 版本观察。请给我完整代码约 280 行：双会话编排 3 异常 x 3 隔离级别矩阵，逐格断言与理论一致并打印矩阵 → SELECT xmin,xmax 观察版本可见性断言 → SERIALIZABLE 冲突重试成功断言 → 清理，断言输出 [PASS]，psycopg 3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：MVCC 观察的编排顺序极易出错——RR 会话必须在 b 提交前取快照（即先执行一条 SELECT），提交后才开的事务看到的就是新值，实验首版因此断言失败；SERIALIZABLE 冲突同理：a 必须先取快照再让 b 提交，顺序反了 40001 根本不出现（err=None）；探针实证「RR 快照挂在首条语句而非 BEGIN」——BEGIN 后不执行语句，别人提交后首读是新值(20)。矩阵每格之间必须 reset 清场，上一格的提交会污染下一格。

---

## 🗂️ 第三阶段：可靠性与规模化（项目 13-16）

> **目标**：运维视角——崩了数据不丢、误删能找回、主库挂了能切、连接再多不雪崩，四件事全部演练过一遍

### [x] 项目 13：WAL 与崩溃恢复

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行（wal_crash_recovery.sh + wal_crash_recovery.py，实装约 210 行） |
| **核心知识点** | WAL 先写日志、checkpoint、synchronous_commit 与 fsync、崩溃恢复时序、持久性分级 |
| **技术栈** | postgres:16-alpine 容器（本实验不带 --rm）+ psycopg 3（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 6 |
| **验收标准** | 持续写入过程中 kill -9 容器，重启后「提交确认已返回」的行 100% 存在（逐行校验断言）；synchronous_commit=on/off 吞吐对比实测记录（打印两组 TPS）；写入期间 pg_wal 目录尺寸增长观测数据输出 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「WAL 与崩溃恢复」（database/13_wal_crash_recovery/），目标：用容器断电模拟验证 WAL 持久性与参数取舍。请给我完整代码约 220 行：写线程持续插入并记录每个已提交 id → 主进程 kill -9 容器模拟断电 → 重启校验已确认 id 全部存在逐行断言 → synchronous_commit on/off 两组 TPS 对比 → pg_wal 增长观测 → 清理，断言输出 [PASS]，psycopg 3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：WAL 段文件是 16MB 预分配，几千行写入 du 看不出增长——观测要用 pg_wal_lsn_diff(pg_current_wal_lsn(),'0/0')；登记 id 必须在 commit 返回之后（append 放 commit 后），登记表才是"持久性承诺清单"；本实验容器不能 --rm（kill 后要重启同一容器），clean 补 rm -f；重启等待窗口要给足（pg_isready 在回放完成前不会就绪）；synchronous_commit=on/off 实测 776 vs 2396 tps（约 3 倍），off 的代价是双方都以为成功的事务可能丢失。

---

### [x] 项目 14：备份与时间点恢复（PITR）

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行（backup_pitr.sh + backup_pitr.py，实装约 230 行） |
| **核心知识点** | pg_dump / pg_restore 逻辑备份、pg_basebackup 物理备份、WAL 归档（archive_command）、恢复到指定时间点 |
| **技术栈** | postgres:16-alpine 容器（主库 + 独立恢复容器）+ psycopg 3（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 13 |
| **验收标准** | pg_dump 备份恢复到新库逐表行数断言一致；开启 WAL 归档后做 pg_basebackup，随后制造误删（DELETE 无 WHERE），用基准备份 + WAL 重放恢复到误删前一秒，被删行 100% 找回（行级断言） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「备份与时间点恢复」（database/14_backup_pitr/），目标：逻辑备份 + basebackup/WAL 归档 PITR 全演练。请给我完整代码约 200 行：pg_dump 逻辑备份恢复新库逐表行数断言 → 开 archive_command 与 pg_basebackup 基准 → 误删一行 → 基准 + WAL 重放恢复到误删前时间点断言该行找回 → 清理，psycopg 3 + 可重放 shell 脚本，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：docker exec 无法操作已停止的容器——"停库后换文件"必须改成独立恢复容器方案（--entrypoint sh 先做文件手术再 exec docker-entrypoint.sh postgres）；sh 的 printf 会把 %f/%p 当格式符吃掉，PG 配置要用 heredoc 落盘（shell 不解释 %）；带 assert 的精确替换防静默 no-op；archive_timeout=2s + pg_switch_wal() 强制切段，确保误删前改动已进归档。

---

### [x] 项目 15：流复制与故障切换

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行（backup_pitr.sh + backup_pitr.py，实装约 230 行） |
| **核心知识点** | 流复制（physical replication）、一主一从、只读实例（25006）、手动 promote、RTO/RPO 概念 |
| **技术栈** | postgres:16-alpine 容器 ×2 + psycopg 3（✅ 2026-10-07 实现并通过脚本验收，延迟 9-26ms） |
| **前置** | 项目 14 |
| **⚠️ 风险** | 两实例端口（55432/55433）与数据卷名必须 lab 专属前缀；promote 是破坏性演练，脚本需支持一键重建整套主从 |
| **验收标准** | 主库写入后 ≤1s 从库可读（带实测延迟毫秒数断言）；从库写操作被拒（SQLSTATE 25006）断言；promote 从库后新主可写断言，并输出一套完整故障切换演练记录（时间线 + 命令） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「流复制与故障切换」（database/15_stream_replication/），目标：一主一从容灾演练。请给我完整代码约 200 行：start.sh 拉起主从（pg_basebackup 建从库）→ 主写断言从库 ≤1s 可读并打印延迟 → 从库写被拒 25006 断言 → 手动 promote 断言新主可写 → 输出演练时间线 → 一键重建脚本，psycopg 3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：pg_basebackup -R 写的 primary_conninfo 是主库"容器内视角"（host=127.0.0.1、port=5432、无密码），从库照抄指向自己——host/port/密码三处都要改写；pg_hba 的 replication 白名单按来源生效，镜像自带 localhost trust 只放行本机，非回环来源必须显式加行并 pg_reload_conf()； OrbStack 挂载点的 rm -rf 会破坏挂载（/sb 消失），文件搬运用 docker cp；sh 的 set -e 中断要保证 clean 仍执行（all 路径 do_demo || rc=$?; do_clean; exit $rc）。

---

### [x] 项目 16：连接池与连接风暴

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~230 行（connection_pool.sh + connection_pool.py，实装约 280 行） |
| **核心知识点** | 连接的代价、max_connections、psycopg_pool 客户端池、PgBouncer transaction pooling、pg_stat_activity 峰值观测 |
| **技术栈** | postgres:16-alpine + edoburu/pgbouncer 容器 + psycopg 3 + psycopg_pool（✅ 2026-10-07 实现并通过脚本验收，后端峰值 21/19） |
| **前置** | 项目 6 |
| **验收标准** | 500 并发短连接直连（每请求新建连接）触发 max_connections 拒绝并记录失败率 vs 经 PgBouncer 全部成功，pg_stat_activity 实测后端连接峰值 ≤ 池大小（断言）；psycopg_pool 压测数据与 PgBouncer 对比表打印 |
| **⚠️ 风险** | 直连压测要临时调低 max_connections 才能在本机复现拒绝——改参数须在同容器内做、脚本结束还原 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「连接池与连接风暴」（database/16_connection_pool/），目标：直连 vs PgBouncer vs 客户端池三方案实测。请给我完整代码约 230 行：500 并发短连接直连记录被拒率（临时调低 max_connections 后还原）→ 经 PgBouncer（edoburu/pgbouncer 容器）全部成功且 pg_stat_activity 峰值 ≤ 池大小断言 → psycopg_pool 对比数据表 → 清理，断言输出 [PASS]，psycopg 3 + ThreadPoolExecutor，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：PgBouncer 的 userlist 密码形态要与服务端一致——SCRAM 服务端配明文/错配 md5 会有 wrong password type 或认证失败，正解是从 pg_authid 取 rolpassword 喂哈希 + AUTH_TYPE=scram-sha-256；镜像默认 auth_type=md5；观测统计的采样连接必须 autocommit（事务中的连接计数恒 0，实测），且 peak_backends 的 first 参数坑（把 Connection 当 Cursor）会让采样线程静默全灭——线程内的异常要显式打印；transaction 池下 SET/advisory lock 等 会话级功能失效。

---

## 🗂️ 第四阶段：Redis 缓存实战（项目 17-21）

> **目标**：Redis 五大结构各就各位，缓存三大问题会复现也会治，缓存与数据库的一致性窗口心里有数

### [x] 项目 17：Redis 五大结构与 TTL

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~230 行（redis_datastructures.sh + py，实装约 250 行） |
| **核心知识点** | String/List/Hash/Set/Zset 五结构、TTL 与过期策略、原子 INCR、场景选型（排行榜/购物车/关注关系） |
| **技术栈** | redis:7-alpine 容器 + redis-py 8.1.0（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 6（Docker 环境复用） |
| **验收标准** | 五场景各有行为断言：Zset 排行榜名次与并列处理、Hash 购物车增删改、Set 交集算共同关注、String INCR 100 并发计数恰为 100、List 存最新 100 条（LTRIM 裁剪断言长度）；设置 2s TTL 的键到期后自动消失（轮询断言） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「Redis 五大结构与 TTL」（database/17_redis_datastructures/），目标：五结构各落一个真实场景。请给我完整代码约 220 行：Zset 排行榜断言名次 → Hash 购物车断言增删改查 → Set 共同关注交集断言 → String 100 并发 INCR 恰为 100 断言 → List + LTRIM 保留最新 100 条断言 → TTL 到期消失断言 → 清理，断言输出 [PASS]，redis-py，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：redis-py 默认返回字节串，decode_responses=False 时 b'3' != '3'；非原子的 GET-SET 拆分实测 50 线程丢到只剩 9，一切"读改写"要用原子命令；Zset 同分按字典序倒排（排行榜从高分到低），carol 稳定排在 alice 前；TTL 对不存在键返回 -2、无过期键 -1，可用它区分两种状态；带 assert 的字符串替换防静默 no-op（评审第 2 轮抓到一处替换未落盘）。

---

### [x] 项目 18：缓存穿透 / 击穿 / 雪崩

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~250 行（cache_penetration.sh + py，实装 255 行） |
| **核心知识点** | 穿透（查不存在）与空值缓存、击穿（热点过期）与互斥重建/逻辑过期、雪崩（集体过期）与随机 TTL、DB 压力观测 |
| **技术栈** | redis:7-alpine + postgres:16-alpine 容器 + redis-py + psycopg 3（✅ 2026-10-07 实现并通过脚本验收，1000→1 / 50→1 / 200→113） |
| **前置** | 项目 17 |
| **验收标准** | 三问题各先复现后修复，全部数字对比：穿透场景 1000 次查不存在键，裸奔时 DB QPS=1000 → 空值缓存后 DB 查询 1 次（断言）；击穿场景热点过期瞬间 50 并发，裸奔 50 次重建 → 互斥锁后 DB 重建 ≤3 次（断言）；雪崩场景批量同 TTL 过期 → 随机 TTL 后 DB 峰值显著下降（断言） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「缓存穿透击穿雪崩」（database/18_cache_penetration/），目标：三问题复现 + 修复数字级对比。请给我完整代码约 250 行：PG 造数据 + DB 查询计数器 → 穿透复现（1000 次不存在键）修复（空值缓存）断言 DB 从 1000 降到 1 → 击穿复现（50 并发抢过期热点）修复（互斥重建）断言重建 ≤3 次 → 雪崩复现修复（随机 TTL）断言峰值下降 → 清理，断言输出 [PASS]，redis-py + psycopg 3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：穿透场景必须"同一 id 重复查"——1000 个不同 id 本来就该各查一次，空值缓存只救重复查询；hammer 之前误 flush 刚重建的键，雪崩数字永远是 200（复现类实验每步要检查是否破坏上一步的现场）；雪崩错峰请求时机要在 TTL 窗口内（3.5s 时 2~3s 档过期、4~5s 档仍活）；闸机类比补了失效边界（闸机不会"到期失效"）。

---

### [x] 项目 19：缓存一致性

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~230 行（cache_consistency.sh + py，实装约 240 行） |
| **核心知识点** | Cache Aside 模式、先更库再删缓存、不一致窗口、延迟双删、为什么不是更新缓存而是删缓存 |
| **技术栈** | redis:7-alpine + postgres:16-alpine 容器 + redis-py + psycopg 3（✅ 2026-10-07 实现并通过脚本验收，先删缓存 993/2000 轮不一致 vs 标准 0） |
| **前置** | 项目 18 |
| **验收标准** | 并发「读旧值-写库-回填」与写侧竞争 10000 次实测，捕获并记录「先删缓存再更库」方案的不一致次数 > 0（复现断言）；改为「先更库再删缓存 + 延迟双删」后对账脚本断言 Redis 与 PG 差异数为 0；两种方案对比结论表打印 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「缓存一致性」（database/19_cache_consistency/），目标：实测不一致窗口并验证延迟双删。请给我完整代码约 230 行：读写两线程竞争 10000 次 → 先删缓存方案复现不一致（对账差异数 >0 断言复现成功）→ 换先更库再删 + 延迟双删 → 再跑 10000 次对账断言差异为 0 → 打印两方案对比表 → 清理，断言输出 [PASS]，redis-py + psycopg 3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：对账判据错了整个实验反转——Cache Aside 写后删缓存，空是正确终态，只有"有值但与库不符"才是不一致；带 assert 的字符串替换必须落地 grep 复核（一轮替换因 cwd 漂移写到了根 README，实验 README 一字未动还汇报了"已修"）；输出块的数字要随脚本轮数同步重跑，"不可能打印的值"会让输出失去真实性；race 的竞争读者只在一半轮次插入，不一致上限 = 轮数/2。

---

### [x] 项目 20：Redis 持久化与分布式锁

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行（redis_persistence_lock.sh + py，实装约 230 行） |
| **核心知识点** | RDB 快照 vs AOF（appendfsync 档位）、持久化丢失窗口、SET NX PX + Lua 原子释放、锁超时与持有者崩溃 |
| **技术栈** | redis:7-alpine 容器（AOF everysec，无 --rm）+ redis-py（✅ 2026-10-07 实现并通过脚本验收，48689 条 0 丢失） |
| **前置** | 项目 17 |
| **验收标准** | AOF everysec 下持续写入中 kill 容器，重启后丢失窗口 ≤1s 的写入（记录实际丢失条数并断言在预期内）；SET NX PX + Lua 释放：20 并发抢锁恰 1 个成功（断言）；持锁方 kill -9 后锁在 TTL 到期自动可被他人获取（断言兜底生效） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「Redis 持久化与分布式锁」（database/20_redis_persistence_lock/），目标：AOF 丢失窗口实测与 SETNX+Lua 锁三连验证。请给我完整代码约 250 行：AOF everysec 写入中 kill 容器重启记录丢失条数断言 ≤1s 窗口 → 20 并发 SET NX PX 抢锁恰 1 成功断言 → Lua 原子释放断言非持有者不能删 → kill 持锁方 TTL 到期他人获得锁断言 → 清理，断言输出 [PASS]，redis-py，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：采样线程把 Connection 当 Cursor 调用（fetchone 不存在）会在线程内静默死亡，峰值恒 0——线程内异常必须显式捕获打印；观测统计的连接要 autocommit，事务中的连接读 pg_stat_activity 恒 0；PgBouncer userlist 密码形态要与服务端一致（SCRAM 服务端喂 SCRAM 哈希 + AUTH_TYPE=scram-sha-256）；AOF everysec 实测 5 秒 4.8 万条写入 0 丢失（fsync 快于写入峰值的巧合，语义承诺仍是最多约 1 秒）。

---

### [x] 项目 21：Stream 与 Pub/Sub（选做）

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~180 行（redis_stream.sh + py，实装约 190 行） |
| **核心知识点** | Pub/Sub 无持久化本质、Stream 与消费组（XADD/XREADGROUP/XACK）、pending 列表、at-least-once 语义 |
| **技术栈** | redis:7-alpine 容器 + redis-py（✅ 2026-10-07 实现并通过脚本验收，断线 0 条 vs 补读 10/10） |
| **前置** | 项目 17 |
| **⚠️ 风险** | 选做项目——环境链短但涉及消息语义，建议在项目 20 后顺手做；跳过不影响后续阶段 |
| **验收标准** | 消费端断线窗口内发布 N 条：Pub/Sub 重连后收到 0 条（丢消息复现断言）vs Stream 消费组重连后 XREADGROUP 补齐 N 条全收到（断言）；未 ACK 消息留在 pending、XPENDING 可见（断言） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「Stream 与 Pub/Sub」（database/21_redis_stream/），目标：实测 Pub/Sub 断线丢消息 vs Stream 消费组补读。请给我完整代码约 180 行：消费端断线窗口发 10 条 → Pub/Sub 重连收到 0 条断言 → Stream 消费组重连 XREADGROUP 补齐 10 条断言 → 未 ACK 留 pending 且 XPENDING 可见断言 → 清理，断言输出 [PASS]，redis-py，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：XGROUP CREATE 对不存在的 Stream 报错，必须 mkstream=True；pubsub.get_message 要先吃掉 subscribe 确认帧，否则后面的数据帧解析错位；首轮消费不 ACK 的 10 条进 pending，重连后 ">" 只取新消息、"0" 游标才认领 pending——两游标配合才是 at-least-once 完整体；Pending 数含新消费未 ACK 的部分，断言要按实际时序写。

---

## 🗂️ 第五阶段：MongoDB 文档库（项目 22-25）

> **目标**：换一种建模世界观——文档内嵌 vs 引用、聚合管道对标 SQL、索引机制对标 PG、副本集事务补齐可靠性拼图

### [x] 项目 22：MongoDB 文档建模与 CRUD

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~230 行（mongo_modeling.sh + py，实装约 200 行） |
| **核心知识点** | 文档模型 vs 关系模型、内嵌 vs 引用取舍、读写放大对比、ObjectId、pymongo CRUD 与 filter 语法 |
| **技术栈** | mongo:7 容器 + pymongo 4.18.2（✅ 2026-10-07 实现并通过脚本验收，内嵌 1 次查询 vs 引用 2 次） |
| **前置** | 项目 1-3（有 SQL 视角才好对比） |
| **验收标准** | 同一博客需求建内嵌版与引用版两套集合：读文章带评论场景内嵌版查询次数=1、引用版=N+1（次数断言）；写「改作者昵称」场景引用版改 1 处、内嵌版要改 M 篇文档（对比数据断言）；CRUD 与 $filter 等基本操作全部断言 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「MongoDB 文档建模与 CRUD」（database/22_mongo_modeling/），目标：内嵌 vs 引用读写放大实测。请给我完整代码约 230 行：同一博客需求建两套集合 → 读文章带评论用 profiling/计数断言内嵌 1 次查询 vs 引用 N+1 → 改昵称场景断言引用改 1 处内嵌改 M 篇 → pymongo CRUD 基本操作断言 → 清理，断言输出 [PASS]，pymongo，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：字符串 _id 的 $gt/sort 按字典序——$gt post-15 命中 13 篇（含 post-2..9，因为 '2'>'1'），倒序第一条是 post-9 而非 post-20；数字 id 或补零对齐才符合数值直觉；MongoClient 的 port 参数必须 int（os.environ.get 取出来是 str）；upsert 是 update 的参数不是独立命令。

---

### [x] 项目 23：聚合管道

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行（mongo_aggregation.sh + py，实装约 210 行） |
| **核心知识点** | $match/$group/$sort/$lookup/$unwind、管道执行顺序、与 SQL GROUP BY/JOIN 的映射关系 |
| **技术栈** | mongo:7 容器 + pymongo + sqlite3（✅ 2026-10-07 实现并通过脚本验收，三问双实现 diff=0） |
| **前置** | 项目 22 |
| **验收标准** | 同一月度销售报表（按类目汇总、关联商品表、TopN）：SQL 版（SQLite）与聚合管道版结果逐行 diff 断言为 0；管道必须包含 $match/$group/$lookup/$unwind/$sort 各至少一次（结构断言）；$lookup 等价 LEFT JOIN 的空值行为对比断言 |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「聚合管道」（database/23_mongo_aggregation/），目标：同一报表 SQL 与聚合管道结果对齐。请给我完整代码约 220 行：SQLite 与 Mongo 造同构销售数据 → 月度按类目汇总 + 关联商品 + TopN 两版实现 → 逐行 diff 断言为 0 → 管道五阶段结构断言 → 清理，断言输出 [PASS]，pymongo + sqlite3，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：SQL 侧 cat_group 用 sales 自身 category、Mongo 侧用 categories 集合的 cat_group——维表不同源 diff 静默对不上（Q3 静默少 north 区域），两侧必须用同一张维表；管道结果 total 是 float，len() 会炸，计数用循环；种子数据 3x3x90=810，断言写具体值。

---

### [x] 项目 24：Mongo 索引与 explain

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~210 行（mongo_index_explain.sh + py，实装约 230 行） |
| **核心知识点** | explain() 三档输出、COLLSCAN vs IXSCAN、覆盖查询（totalDocsExamined=0）、复合索引列序（对标 PG 最左前缀） |
| **技术栈** | mongo:7 容器 + pymongo（✅ 2026-10-07 实现并通过脚本验收，100 万行 10x 提速） |
| **前置** | 项目 22 |
| **验收标准** | 50 万行集合点查 explain 断言 COLLSCAN → 建索引后 IXSCAN，耗时对比 ≥10× 记录；覆盖查询 explain 断言 totalDocsExamined=0；三列复合索引 7 种查询组合矩阵判定与 PG 项目 8 结论一致（断言） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「Mongo 索引与 explain」（database/24_mongo_index_explain/），目标：扫描方式实测并与 PG 索引结论对齐。请给我完整代码约 200 行：造 50 万行 → 点查 COLLSCAN/建索引后 IXSCAN 断言 + 耗时对比 → 覆盖查询 totalDocsExamined=0 断言 → 复合索引 7 组合矩阵断言与最左前缀一致 → 清理，断言输出 [PASS]，pymongo，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：seed 阶段建 status 索引会让 matrix 的「status 单独不走」断言失效（status 单独查询走 status_1 索引），但 region 点查不受影响（status 索引对 region 条件无效）——受害阶段要写对；pymongo 4.x 的 cursor.explain() 不带参数（默认 allPlansExecution 档），老版 explain("executionStats") 报 TypeError；hint 必须用完整索引名 region_1（不能只写 region）或键模式 {"region":1}；覆盖查询的 PROJECTION_COVERED 出现在 all_stage_names 里而非 scan 节点里，explain_stage 要返回所有阶段名集合。

---

### [x] 项目 25：副本集与多文档事务

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~170 行（mongo_replica_transaction.sh + py，实装约 180 行） |
| **核心知识点** | 单节点副本集（rs.initiate）、多文档事务（4.0+）、read/write concern、事务与 PG 事务的取舍 |
| **技术栈** | mongo:7 容器（--replSet rs0 单节点副本集）+ pymongo（✅ 2026-10-07 实现并通过脚本验收） |
| **前置** | 项目 22 |
| **⚠️ 风险** | 事务必须跑在副本集上——单机要以 `--replSet` 启动并 rs.initiate；提示词要求生成初始化脚本，起不来可一键重建 |
| **验收标准** | rs.status() 断言单成员 PRIMARY；跨两集合（账户与流水）转账多文档事务：abort 后两集合全部回滚断言、commit 后两集合一致断言；w:majority 写入确认断言（对比 w:1 的返回时间） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「副本集与多文档事务」（database/25_mongo_replica_transaction/），目标：单节点副本集 + 跨集合事务原子性实测。请给我完整代码约 220 行：--replSet 启动 + rs.initiate 断言 PRIMARY → 转账事务写两集合 → abort 断言双集合全回滚 → commit 断言一致 → w:majority 与 w:1 确认时间对比 → 清理，断言输出 [PASS]，pymongo，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：replSetInitiate 的 host 必须是容器内部地址 127.0.0.1:27017（不是宿主机映射端口 55457），否则节点永远选不出 PRIMARY；pymongo 4.x 的事务 session 传给每个操作调用而非 with_options；directConnection=True 是单节点副本集的标配（跳过副本集发现，否则 RSGhost 状态让连接卡死）；w:majority 在单节点副本集上等价于 w:1。

---

## 🗂️ 第六阶段：串联与交付（项目 26-27）

> **目标**：把五个阶段的能力装进一个系统——三库各司其职的完整数据流，以及一份压得出数字、可复跑的巡检报告

### [x] ⛓️ 项目 26：三库协作内容平台

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~250 行（tri_store_platform.sh + py，实装约 220 行） |
| **核心知识点** | 多库架构分工（PG 主存储 / Redis 缓存计数 / Mongo 评论）、失败降级、缓存回填、跨库数据流验证 |
| **技术栈** | 三库容器 + psycopg 3 + redis-py + pymongo（✅ 2026-10-07 实现并通过脚本验收，命中率 90-100%、降级 20/20） |
| **前置** | 项目 12、17-19、22-25 |
| **验收标准** | 发布一篇文章端到端断言三库各就各位：正文在 PG、访问计数与热点列表在 Redis（命中率 ≥90% 断言）、评论在 Mongo 且按文章可查（关联 id 断言）；kill Redis 容器后平台降级为主库直读仍可用（断言），Redis 恢复后缓存回填命中率回到 ≥90%（断言） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「三库协作内容平台」（database/26_tri_store_platform/），目标：PG+Redis+Mongo 各司其职的内容平台与降级演练。请给我完整代码约 300 行：三容器拉起 → 发布/浏览/评论三 API 数据流（PG 存正文、Redis 缓存与计数、Mongo 存评论）→ 端到端断言三库状态与命中率 ≥90% → kill Redis 断言降级可读 → 恢复后回填断言 → 清理，断言输出 [PASS]，psycopg 3 + redis-py + pymongo，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：--rm 容器 stop 后就被删了（不能 start），降级演练要用 docker restart 而非 stop+start 分开；Redis 连接对象在容器重启后失效（旧 TCP 连接断），恢复后必须新建连接或设置重连；浏览计数存 Redis INCR 只在内存，Redis 重启后归零——生产上要定期同步回 PG。

---

### [x] 🏁 项目 27：数据库巡检与压测报告

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~250 行（db_inspection_report.sh + py，实装约 230 行） |
| **核心知识点** | pgbench 压测、巡检指标（缓存命中率/索引使用率/连接峰值/慢查询）、备份恢复演练流程化、可复跑报告 |
| **技术栈** | postgres:16-alpine + redis:7-alpine 容器 + psycopg 3（✅ 2026-10-07 实现并通过脚本验收，TPS 670-846、优化 412-488x） |
| **前置** | 项目 9、14、18-19、26 |
| **验收标准** | pgbench 对 100 万行库压测产出 TPS 与延迟分布（数字写入报告）；Top3 慢查询优化前后每条提速 ≥2×（EXPLAIN 对比入报告）；Redis 缓存命中率、PG 索引使用率 Top、连接峰值三项巡检指标脚本一键产出；完整执行一次备份→恢复演练并把时间线写入；全部汇总为 inspection_report.md，重跑脚本两次报告数字均在合理区间（断言） |

**🤖 开始提示词**：
> `我要开始 Python 数据库项目「数据库巡检与压测报告」（database/27_db_inspection_report/），目标：把前面所有能力收拢为一键巡检 + 压测 + 可复跑报告。请给我完整代码约 280 行：pgbench 压测 TPS 报告 → Top3 慢查询优化前后 EXPLAIN 对比（≥2× 断言）→ 缓存命中率/索引使用率/连接峰值三指标采集 → 备份恢复演练时间线 → 汇总生成 inspection_report.md，断言输出 [PASS]，psycopg 3 + redis-py，附验收命令，中文注释。只输出代码。`

**完成日期**：2026-10-07
**踩坑记录**：pgbench 输出的 TPS 行在 stderr 而非 stdout，subprocess 要合并两个流；TPS 解析不能用 split("t")（"tps" 本身含 t），用正则 r'tps = ([\d.]+)' 提取；EXPLAIN ANALYZE 的 fetchall() 返回 tuple 列表需要 r[0] 取字符串；REPORT 列表的章节计数要对生成的文件内容 count("## ") 而非对内存列表；维表缺行时 $lookup + $unwind 会静默丢文档——断言要锁"两侧行数一致"而非只锁"不报错"。

---

## 📅 周计划

| 周次 | 内容 | 项目数 |
|:---|:---|:---:|
| **第 1 周** | 项目 1-5（SQL 与建模地基，SQLite 零依赖） | 5 |
| **第 2 周** | 项目 6-9（PG 迁移 + 索引主线 + 慢查询） | 4 |
| **第 3 周** | 项目 10-12（JSONB 检索 + 锁 + 隔离级别） | 3 |
| **第 4 周** | 项目 13-16（WAL 崩溃恢复 + 备份 + 复制 + 连接池） | 4 |
| **第 5 周** | 项目 17-20（Redis 五结构 + 三大问题 + 一致性 + 持久化锁） | 4 |
| **第 6 周** | 项目 21-25（Stream 选做 + MongoDB 四连） | 5 |
| **第 7 周** | 项目 26（三库协作平台） | 1 |
| **第 8 周** | 项目 27（巡检压测报告）+ 全线复盘 | 1 |

## 🏆 里程碑

- [x] **完成项目 1-5** → 「SQL 熟手」：不靠 ORM 写出业务级查询、建出不返工的表、控得住事务边界
- [x] **完成项目 6-12** → 「性能工程师」：索引设计与慢查询治理全部有 EXPLAIN 数字支撑
- [x] **完成项目 13-16** → 「可靠性负责人」：崩溃恢复、PITR、主从切换、连接池四场演练通过
- [x] **完成项目 17-21** → 「缓存架构师」：Redis 场景选型与穿透击穿雪崩、一致性治理实测在案
- [x] **完成项目 22-25** → 「多模数据库开发者」：文档建模、聚合管道、副本集事务都能落地
- [x] **全部完成** → 「三库全栈数据库工程师」：能设计多库架构、压测出数字、一键巡检、出报告兜底

## 📝 每日日志

| 日期 | 项目 | 耗时 | 收获 | 踩坑 |
|:---|:---|:---:|:---|:---|
| | | | | |

## 🔧 环境配置

```bash
# 0. 已就绪（2026-10-06 实测，详见文末覆盖速查表）
#    OrbStack 2.2.3 + Docker Engine 29.4.0（linux/aarch64，docker context=orbstack）✅
#    镜像已拉取并探活：postgres:16-alpine(16.15) / redis:7-alpine / mongo:7(7.0.43)
#                      / edoburu/pgbouncer(1.26.0) ✅
#    Python 3.13.9 + SQLite 3.51（CLI 与标准库模块，阶段一零第三方依赖）✅

# 1. 系列专属 venv（已装 ✅ 2026-10-07：psycopg 3.3.6 / redis 8.1.0 / pymongo 4.18.2）
cd database && python3 -m venv .venv
.venv/bin/pip install 'psycopg[binary]' redis pymongo

# 2. 每项目开工前：确认引擎在跑（OrbStack 设置可开开机自启）
orb status || orb start

# 3. 容器规范：一律 docker run -d --rm --name <lab名>-<db> 拉起、脚本结尾 docker stop 清理；
#    端口自 55432 起各项目错开；数据不留卷（演示库即抛即弃），备份实验除外
```

## ⚠️ 与已有清单的关系

| 已有清单/实验 | 关系 |
|:---|:---|
| `web/06_sqlalchemy_orm` | 已覆盖 ORM 应用层入门（N+1 实测、session 生命周期、最小迁移）。本清单**跳过 ORM 入门**，从 SQL 与数据库本身进阶；做完阶段二再回看它，session 行为会看得更透 |
| `fastapi/15_async_sqlalchemy` | 已覆盖异步 ORM 接入 FastAPI（async engine + yield 依赖）。本清单不重复该主题，Web 集成场景一律引用该实验 |
| `fastapi/16_alembic_migrations` | 已覆盖迁移工具入门。迁移是「结构」维度，本清单项目 14 备份恢复是「数据」维度，互补不重叠 |
| `docs/python_interview.md` | 语言机制考点线，无数据库内容，无重叠 |
| `docs/python_concurrency.md` | 无直接重叠；项目 11（锁）、16（连接池）、18（击穿互斥）用线程并发造压，可结合并发系列知识加深理解 |

## ⚠️ 能力覆盖速查表（2026-10-06 实测）

| 能力 | 计划 | 实测结论 |
|:---|:---|:---|
| PostgreSQL 16 容器（aarch64） | 项目 6-16、26-27 | ✅ postgres:16-alpine 探活通过（16.15，查询正常） |
| Redis 7 容器 | 项目 17-21、26-27 | ✅ redis:7-alpine 探活通过（SET/GET 回环正常） |
| MongoDB 7 容器 | 项目 22-25、26 | ✅ mongo:7 探活通过（ping=1，7.0.43） |
| PgBouncer 容器 | 项目 16 | ✅ edoburu/pgbouncer 探活通过（1.26.0，正常监听） |
| SQLite（CLI + 标准库） | 项目 1-5 | ✅ 本机自带 3.51.0，窗口函数可用（≥3.25） |
| Python 驱动（psycopg/redis/pymongo） | 各阶段 | ✅ 2026-10-07 装通于 database/.venv：psycopg 3.3.6 / redis 8.1.0 / pymongo 4.18.2（Python 3.13） |
| PG 中文全文检索 | 项目 10 | ⚠️ 原生 tsvector 不做中文分词：实验用英文语料；中文需 pg_jieba/zhparser 扩展，编译链长列为选做 |
| kill -9 断电/误删演练 | 项目 5、13、14、20 | ✅ 容器方案可行；脚本必须以「提交确认返回」为打点时序，见各项目风险行 |
| 国内镜像源拉镜像 | 全部容器项目 | ⚠️ 首拉 redis 时遇 USTC 镜像 EOF 一次，重试成功；所需镜像均已预拉到位 |
