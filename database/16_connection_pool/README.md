# 16 · 连接池与连接风暴:200 并发只让 20 条连接见数据库

> 200 并发"每请求新建连接"打向 PgBouncer(transaction 池):200/200 全部
> 成功,后端连接峰值被钳在 21;换成应用内 psycopg_pool 同压,峰值 19;
> 外加建连代价基线(直连 5.1ms/次 vs 池化取用近 0)。6 项断言跑成全绿。

## Background

一条 PG 连接在服务端是一个进程:建连要 fork、认证、分配内存;每连接
还有固定内存开销。应用侧最常见的写法是"每请求新建连接、用完就关"——
十几个并发无感,并发一上来后端连接数直接等于并发数:几百个并发就是
几百个后端进程,先撞上 max_connections 被拒,再撑爆内存。

连接池是标准解法:开固定数量的连接反复复用,并发请求排队取用。池可以
立在数据库前面(服务端池 PgBouncer),也可以长在应用里(客户端池
psycopg_pool)。本实验用 200 并发风暴实测三种形态,峰值以
pg_stat_activity(PG 自带的会话统计视图,实时数出后端连接数)说话。

## What

**定义**:连接池维护一小组长连接;请求借出、用完归还,后端连接数被池
大小钳住。PgBouncer 以 transaction 模式运行时,一条后端连接还可以在
事务边界上被多个客户端轮流复用(客户端空闲持有期间不占后端)。

可以把连接池想成公司前台的车队:200 个员工出门不各自买车,向前台借
公司那 20 台。但和固定车队不同的是,transaction 池在员工"只在谈事情的
那几分钟"才派车,谈完立刻收回给别人——利用率远高于按人头配车。

| 形态 | 后端峰值 | 建连开销 | 本实验实测 |
|:--|:--|:--|:--|
| 每请求直连 | = 并发数(撞上限) | 每请求 5.1ms | 200 并发即危险 |
| PgBouncer 前置 | ≤ 池大小 | 应用无感 | 200/200,峰值 21 |
| psycopg_pool | ≤ 池大小 | 取用近 0 | 200/200,峰值 19 |

![Lab 16 · 200 并发的两条路:每请求新建 vs 复用连接池](images/connection_pool.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/16_connection_pool/images/connection_pool.html)
> (或本地打开 [`images/connection_pool.html`](images/connection_pool.html))。

## When to Use

**典型场景**。Web 服务接数据库:进程内放一个 psycopg_pool,请求借还;
微服务多语言混合或 DBA 想统一限流:前置 PgBouncer,连接策略集中管理;
函数计算/短生命周期实例:实例间无法共享池,前置 PgBouncer 是唯一解。

**何时不用**。单进程低并发脚本,直连即可;连接池不是越多越大越好——
池大小超过 CPU 核数×2 后,后端上下文切换反而拉低吞吐。

| 方案 | 位置 | 语言绑定 | 什么时候选它 |
|:--|:--|:--|:--|
| psycopg_pool | 应用进程内 | Python 专属 | 单语言服务的默认选择 |
| PgBouncer | 数据库前置代理 | 无关 | 多语言/多实例统一限流 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 postgres:16-alpine 与
edoburu/pgbouncer 就位、venv 装好 psycopg 与 psycopg_pool。一条命令
跑完整生命周期(两容器 + 两轮 200 并发风暴,约 60 秒):

```bash
cd database/16_connection_pool && ./connection_pool.sh all
```

真实输出(节选,完整 6 项断言以实跑为准):

```text
=====> [storm] 200 并发、每请求新建连接, 全部打到 PgBouncer(transaction 池)
    PgBouncer: 200/200 成功, 延迟 p50 1775 ms
  [PASS] PgBouncer 下全部成功(200/200)
    后端连接峰值 21 (PgBouncer default_pool_size=20, PG max_connections=100)
  [PASS] 后端峰值被池压住(<=30, 实测 21)
=====> [client] psycopg_pool 客户端池: 200 并发复用 20 条直连
    客户端池: 200/200 成功, probe 表 200 行, 后端峰值 19
==== 实验 16 · connection_pool 全部 6 项断言通过 [PASS] ====
```

诚实预期:后端峰值就是池大小±一两条(实测 21/19,波动来自采样时机)。
p50(延迟中位数,一半请求快于它)1.8 秒,是 200 请求排队过 20 条池连接
的真实代价——池压住了风暴,但不产生魔法吞吐。

直连风暴若真打 200 条到 PG(max_connections=100)会被拒绝,本实验以
PgBouncer 全过作为对照。

## How It Works

### transaction 池:一条后端连接服务多个客户端

池大小 20,200 个客户端同时要连接:PgBouncer 只开 20 条后端,谁的事务
开着就把后端绑给谁,事务结束立刻收回给下一个。客户端全程以为自己在用
独占连接。

代价是"会话级功能"不再可用(SET 只影响当前事务、advisory lock——
应用按 key 向 PG 登记的约定锁——绑定在后端连接上,换连接就串人)。pg_stat_activity 实测峰值 21,正是池大小钳制的直接证据。

### 两种池的位置差异决定了适用场景

psycopg_pool 在应用进程内:借还零网络跳,但每个应用实例各养各的池,
实例数×池大小才是后端总量;PgBouncer 在数据库前面:所有实例共享一个
池,总量精确可控,但每条查询多一跳代理。二选一或叠加(应用池小+
前置池兜底)都常见,取决于实例拓扑。

### 后端峰值的观测口径

pg_stat_activity 按 `datname='lab'` 计数并排除采样连接自身;采样连接
必须 autocommit——处于事务里的采样连接会挡住统计可见性,实测计数恒 0。
请求侧加 `pg_sleep(0.3)` 让后端连接驻留,采样才抓得到峰值。

## Pitfalls & Q&A

**坑 1:userlist 的密码形态要和认证方式对齐**。PG 默认用 SCRAM(质询
式密码认证,服务端只存哈希不传明文);userlist(PgBouncer 的用户密码
文件)里若存 md5 哈希而 auth_type(认证方式配置)是 scram,认证报错。

本实验从 pg_authid(PG 存角色认证信息的系统表)取 rolpassword(即
SCRAM 哈希)喂给 PgBouncer,保证形态与服务端严格一致。

**坑 2:transaction 池下的会话级功能会失效**。SET SESSION、advisory
lock、LISTEN(订阅频道推送的会话功能)在事务池里可能落到不同后端;
需要这些特性的连接要配 session 池(按客户端会话绑定后端的池模式)或绕开。

**坑 3:观测统计的连接自身要 autocommit**。处于事务中的采样连接会让
pg_stat_activity 的计数在它眼里"冻结",实测恒 0;autocommit 后立即
恢复。

**Q1:池大小设多少?** 经验起点 CPU 核数×2;再按 pg_stat_activity 的
活跃占比调——大量 idle 说明池偏大,排队延迟上涨说明偏小。

**Q2:客户端池加 PgBouncer 叠加用会不会冲突?** 不会,两层各管一段;
惯例是客户端池调小(每实例 5~10),总量由前置 PgBouncer 统一钳制。

**Q3:建连 5.1ms 听起来不慢?** 单次无感,风暴里 200×5ms 的纯建连开销
叠加认证与后端 fork,在高峰期是实打实的首字节延迟;池化把它摊薄成
一次性成本。
