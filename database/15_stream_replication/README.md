# 15 · 流复制与故障切换:一主一从的切换演练

> pg_basebackup -R 建从库、WAL 流式推送,主写从读延迟毫秒级;从库
> INSERT 被拒(SQLSTATE 25006);pg_promote 手动切换后新主可写。7 项断言
> 跑成全绿,附一套带时间线的故障切换演练记录。

## Background

实验 14 的 PITR 能救回数据,但要停库、重放、耗时按分钟计。业务连续性要的
是另一条路:平时就有一台"热备"实时追着主库跑,主库出事,把备库升为主——
切换以秒计,这就是流复制加故障切换。

流复制(physical streaming replication)的原理是 WAL 的另一种用法:从库
拿到主库的数据目录副本(物理级,连块结构都一致)后,持续接收主库产生的
WAL 并在本地重放,数据始终贴近主库。应用可以把它当只读副本分担查询;
主库挂了就 promote 它——结束恢复态,转为可写的正式主库。

本实验在两个容器间搭出这套一主一从,把"延迟多大、从库能不能写、怎么
切"三问全部实测。

## What

**定义**:流复制是主库把 WAL 实时推送给从库、从库逐条重放的物理复制
(复制的是数据块的改动,不是 SQL 语句);从库处于恢复态,只读,写操作
收到 SQLSTATE 25006(只读事务拒绝写入);promote 是把从库提升为新主库
的动作,提升后脱离恢复态、接受写入,且不可逆。

可以把一主一从想成主讲与速记员:主库每讲一句(WAL 记录),速记员立刻
抄一份,内容几乎实时同步。但速记员不能改讲稿内容(只读);promote 相当
于速记员转正当主讲,原讲稿当场作废,不能倒回速记身份。

| 环节 | 断言 | 实测 |
|:--|:--|:--|
| 建从库 | standby.signal(从库身份标志文件)存在且处于恢复态 | basebackup -R 一步到位 |
| 复制延迟 | 主写从读 ≤1000ms | 9~26ms(本机) |
| 只读保护 | 从库写被拒 25006 | 硬性拒绝 |
| 故障切换 | promote 后新主可写 | 插入读回 1 行 |

![Lab 15 · 一主一从的切换演练:建从库、验延迟、25006、promote](images/stream_replication.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/15_stream_replication/images/stream_replication.html)
> (或本地打开 [`images/stream_replication.html`](images/stream_replication.html))。

## When to Use

**典型场景**。读写分离:报表与后台查询打到从库,主库专心接写入;高可用:
主库故障时秒级 promote 从库;迁移与升级:先建从库追平,再切换流量。

**何时不用**。数据量极小或无人值守需求不强时,定时备份加 PITR(实验 14)
更省心;需要多主写入或跨地域自动选主的场景,原生流复制不够,要引分布式
方案——那是另一个量级的复杂度。

| 手段 | 切换速度 | 数据视野 | 什么时候选它 |
|:--|:--|:--|:--|
| 流复制 + promote | 秒级 | 主库已提交的 | 高可用主力 |
| PITR(实验 14) | 分钟级 | 任意历史时刻 | 误删找回 |
| 延迟从库 | 分钟级 | 故意落后的 | 人为误操作缓冲 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 postgres:16-alpine 就位、venv 装好
psycopg。一条命令跑完整生命周期(主从两容器,约 40 秒):

```bash
cd database/15_stream_replication && ./stream_replication.sh all
```

真实输出(节选,完整 7 项断言以实跑为准):

```text
=====> [standby] pg_basebackup -R 建从库数据目录, 拉起从库容器
    从库就绪: pg_is_in_recovery = True
  [PASS] 从库处于恢复态(流复制从库)
=====> [lag] 主库写入 3 条, 从库轮询可见, 实测延迟毫秒
    第 1 条: 延迟 7.3 ms
  [PASS] 复制延迟 <= 1000ms(实际最大 10ms)
=====> [readonly] 从库只读: INSERT 应被拒(SQLSTATE 25006)
  [PASS] 从库写被拒(sqlstate=25006, 期待 25006)
=====> [promote] pg_promote 从库转新主: 可写断言 + 演练时间线
  [PASS] 新主可写断言
==== 实验 15 · stream_replication 全部 7 项断言通过 [PASS] ====
```

诚实预期:延迟毫秒数随负载波动(实测 2.7~26ms),断言只锁 1 秒内;promote
是破坏性演练——切完后旧主容器弃用,重跑 `all` 会重建整套主从;主库的
pg_hba 需要一条 replication 白名单,脚本在 start 步自动写入。

## How It Works

### 建从库:basebackup -R 一步到位

`pg_basebackup -R` 做两件事:拷出主库数据目录的物理快照;写入
standby.signal(从库身份标志)与 primary_conninfo(去哪找主库)。

从库容器挂载该目录启动,便自动进入恢复态、持续拉取主库 WAL。

basebackup 是在主库容器内执行的,写下的 conninfo 是主库的"容器内视角"
(host=127.0.0.1、port=5432、无密码),从库照抄只会指向自己——host 要
换宿主机地址、port 换映射端口、补密码,复制才能找回主库。

### 延迟毫秒级:异步复制的代价与底气

主库提交不必等从库确认(异步复制),所以写入零额外延迟;从库落后多少
取决于网络与重放速度。

生产里这个数字决定故障切换的 RPO(会丢多少已提交事务):异步复制下,
promote 前主库若有未送达的 WAL,那部分提交就丢了;要求零丢失得用
synchronous_commit 的 remote_apply 档(实验 13 的分级表)。

### promote:把恢复态一次性换成可写

pg_promote 让从库退出恢复:重放完手头所有改动、切换到新的 WAL 时间线
(PG 用递增编号区分 promote 前后的 WAL 流,防止旧主后续写入混入)、开始
接受连接。

切换后旧主不能直接拉回——它还自认为是主库,会产生双主分裂;生产做法
是按实验 13 的 basebackup 流程把旧主重建为新从,让集群回到一主一从。

## Pitfalls & Q&A

**坑 1:conninfo 三处都要改**。basebackup -R 生成的连接串是"容器内视角":
host=127.0.0.1、port=5432、无密码——从库容器里三样全不通。host 换
宿主机地址、port 换映射端口、补 password,缺一 replication 起不来。

**坑 2:pg_hba 的 replication 白名单按来源生效**。`host all all` 不
覆盖复制伪数据库;镜像自带的 localhost replication trust 只放行本机
来源。

复制连接来自非回环地址(Linux 原生 Docker、生产远程机器)时,必须显式
写 `host replication replicator 0.0.0.0/0 scram-sha-256` 并执行
`SELECT pg_reload_conf()`,否则从库报 no pg_hba.conf entry。

**坑 3:promote 后旧主是"僵尸主"**。它还带着主库身份运行会产生双主分裂;
演练或切换后必须立刻停掉旧主,重建时按实验 13 的 basebackup 流程转为
新从。

**Q1:从库能扛查询,会不会拖慢主库?** 重放占从库自己的资源;主库只剩
发送 WAL 的开销,几乎可忽略——这正是读写分离的收益来源。

**Q2:RPO 和 RTO 分别是什么?** RPO 是灾难时最多丢多少已提交事务
(异步复制 >0,remote_apply=0);RTO 是切换耗时(本实验秒级)。两者
通常此消彼长,按业务赔付成本选档。

**Q3:能不建专门从库、直接延迟从库防误删吗?** 可以:recovery_min_apply_delay
参数让从库延迟 N 分钟重放,误删发生后在它追平前抢救数据;
与实验 14 的 PITR 互为快慢双保险。
