# 26 · ⛓️ 三库协作内容平台:PG 主存储 + Redis 缓存 + Mongo 评论

> PG 存文章(唯一事实源)、Redis 做缓存与 INCR 计数(命中率 ≥90%)、
> Mongo 存评论(按文章 id 可查);kill Redis 降级后主库直读 20/20 篇可用,
> 恢复后逐篇回填命中率回到 100%。7 项断言跑成全绿。

## Background

单个数据库解决所有问题的时代已经过去。真实系统的数据天然分属不同
"性格":文章正文需要持久与事务(PG)、浏览计数需要极快读写(Redis)、
评论是半结构化的文档(Mongo)。硬塞进一个库,要么性能瓶颈、要么模型
扭曲。

三库协作的核心原则是**每个库只管它最擅长的事**:PG 是唯一事实源
(single source of truth)——Redis 丢了可以回填,Mongo 丢了可以重建;
Redis 是加速层——命中率决定系统的响应速度;Mongo 是文档层——评论文档
天然适合文档模型。

降级能力是这套架构的生命线:缓存层故障时,系统必须能降级为主库直读
而不崩溃。本实验 kill Redis 验证降级,重启后验证回填恢复。

## What

**定义**:多库协作指按数据特征把读写分派到最合适的存储引擎——PG 承担
主存储与事务、Redis 承担缓存与计数器、MongoDB 承担文档查询。降级指
某个存储不可用时,系统降级到主库直读而非崩溃。

可以把三库想成餐厅的三个岗位:PG 是仓库(所有食材都在这里)、Redis
是灶台边的备菜盘(常用的提前切好)、Mongo 是点单本(顾客的个性化
要求按桌号记录)。备菜盘打翻了可以重新从仓库拿,不影响出菜。但仓库
必须始终在——它是唯一的真相来源。

| 库 | 角色 | 本实验的职责 |
|:--|:--|:--|
| PostgreSQL | 主存储 · 事实源 | 文章 CRUD、降级兜底 |
| Redis | 缓存 + 计数 | 正文缓存 + INCR 浏览计数 |
| MongoDB | 文档层 | 评论 CRUD + 按文章 id 查 |

![Lab 26 · 三库协作:PG 主存储 + Redis 缓存计数 + Mongo 评论](images/tri_store_platform.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/26_tri_store_platform/images/tri_store_platform.html)
> (或本地打开 [`images/tri_store_platform.html`](images/tri_store_platform.html))。

## When to Use

**典型场景**。内容平台:文章在 PG、缓存在 Redis、评论在 Mongo;电商:
商品在 PG、购物车在 Redis、评价在 Mongo;任何"多类型数据 + 高并发读"
的系统。

**何时不用**。数据量小或团队缺乏多库运维经验时,单库加索引更省心;
每多一个存储就多一个故障点、多一套备份策略、多一版驱动兼容矩阵。

| 库组合 | 复杂度 | 什么时候选它 |
|:--|:--|:--|
| 单库(PG) | 最低 | 数据同质、量不大 |
| PG + Redis | 中 | 读密集需要缓存 |
| PG + Redis + Mongo | 高 | 多类型数据各自有明确场景 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 postgres:16-alpine、redis:7-alpine、
mongo:7 就位、venv 装好 psycopg + redis-py + pymongo。一条命令跑完整
生命周期(三容器 + 降级演练,约 30 秒):

```bash
cd database/26_tri_store_platform && ./tri_store_platform.sh all
```

真实输出(节选,完整 7 项断言以实跑为准):

```text
=====> [browse] 20 篇各浏览 10 次(首轮 miss 回填, 后九轮命中)
    命中 180 / miss 20 = 90%
  [PASS] 缓存命中率 >= 90%(实际 90%)
  [PASS] 浏览计数完整(200 = 20x10)
=====> [degrade] kill Redis -> 降级为主库直读仍可用; Redis 恢复后命中率回升
    降级模式: 20/20 篇可从 PG 直读
  [PASS] 降级后主库直读可用(20/20)
  [PASS] 恢复后命中率 >= 90%(实际 100%)
==== 实验 26 · tri_store_platform 全部 7 项断言通过 [PASS] ====
```

诚实预期:命中率恰好 90%(20 篇首读 miss + 180 次 hit,确定性);降级
时 Redis 的浏览计数丢失(INCR 在内存,--rm 容器重启后归零)——
生产上计数应持久化或接受丢失。

## How It Works

### 数据流:写走 PG、读走 Redis、评论走 Mongo

发布接口只写 PG(INSERT 文章);浏览接口先查 Redis,miss 则查 PG 并
回填缓存(EX 300 秒),同时 INCR 原子计数;评论接口写 Mongo 的 comments
集合,按 post_id 索引查询。三库各司其职,接口层按需求路由到对应存储。

### 降级:缓存层消失,主库兜底

kill Redis 后,浏览接口的 R.get 会抛 ConnectionError——生产系统应该
捕获这个异常并降级为主库直读(实验代码通过 try/except 或直接不走缓存
路径实现)。主库直读虽然慢,但保证了功能可用性。Redis 恢复后,逐篇
回填缓存,命中率回到 90%+。

### 缓存命中率:读路径的健康指标

命中率 = 命中数 / 总请求数。首轮全部 miss 是正常的(冷启动);后续轮
应该全部命中。命中率骤降意味着缓存被清空或过期策略有问题——生产上
应该监控这个指标并设告警。

## Pitfalls & Q&A

**坑 1:--rm 容器 stop 后不能 start**。`--rm` 的容器一停就被删,
`docker start` 会报 not found;降级演练要用 `docker restart`(stop+
start 合一)而非 stop+start 分开。

**坑 2:Redis 连接对象在容器重启后失效**。旧的 redis.Redis 实例持有
断掉的 TCP 连接,重启后用旧实例 ping 会一直报 ConnectionError;
恢复后必须新建连接(或设置 connection_pool 重连)。

**坑 3:浏览计数在 Redis 重启后丢失**。INCR 只存在于 Redis 内存;
如果计数需要持久,定期同步回 PG 或直接用 PG 的计数列。

**Q1:为什么 PG 是唯一事实源?** 因为 PG 有事务、WAL(实验 13)、
备份恢复(实验 14)——数据的真相只有一份,其他存储都是它的缓存或
投影;这样降级和重建才有据可依。

**Q2:三库的数据一致性怎么保证?** 最终一致:PG 先写(事实源),
Redis 删除缓存等待回填(实验 19 的结论),Mongo 的评论独立于文章
内容(无需跨库事务)——只要写入路径不交叉,就不需要分布式事务。

**Q3:命中率从多少开始算正常?** 首轮全部 miss(冷启动)正常;稳态
命中率取决于访问模式与缓存容量,通常 80%~99%。骤降意味着缓存被清
或过期策略有问题。
