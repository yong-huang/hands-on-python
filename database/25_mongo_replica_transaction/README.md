# 25 · 副本集与多文档事务:跨集合转账的 abort 与 commit

> 单节点副本集上跑真事务:跨 accounts 与 ledger 两集合的转账,abort 后
> 两集合全部回滚、commit 后双集合一致且总额守恒;w:majority 与 w:1 写
> 关注对比收尾。6 项断言跑成全绿。

## Background

MongoDB 在没有副本集的情况下不支持事务——单机 mongod 只是普通文档
存储。replica set(副本集,多台 mongod 互为备份的部署)是事务的门槛,
哪怕只有一个节点。这背后的事务依赖的是 WiredTiger 存储引擎的快照隔离加上
replica set 的 oplog 时间戳。

多文档事务解决的是关系库天生擅长的问题:跨集合的原子性——转账要同时
扣一个账户、加另一个账户、写一条流水,三步要么全做要么全不做。没有事务
时,第二步失败意味着钱凭空消失。

MongoDB 4.0 在副本集上启用了多文档事务;4.2 扩展到分片集群。本实验在
单节点副本集上验证 abort/commit 的原子性承诺。

## What

**定义**:Mongo 事务通过 start_session() 开启会话、start_transaction()
开启事务,操作传 session= 即纳入。commit 提交(全部生效)、abort 回滚
(全部撤销)。事务要求读写运行在副本集的 primary 节点上。

可以把事务想成一次"打包快递":三件东西(两个余额变更 + 一条流水)
装进同一个箱子,收件人要么签收整箱(commit),要么拒收整箱退回
(abort),不存在只签收一半的可能。但和快递不同的是,MongoDB 的事务
需要 replica set 作为基础设施——没有副本集,连打包的箱子都不提供。

| 操作 | 效果 | 本实验实测 |
|:--|:--|:--|
| abort_transaction | 全部回滚 | accounts 复原 + ledger 0 条 |
| commit_transaction | 全部落盘 | accounts 变更 + ledger 1 条 |
| w:majority | 多数派确认后返回 | 单节点下与 w:1 等价 |

![Lab 25 · 跨集合转账事务:abort 全回滚 vs commit 双集合一致](images/mongo_replica_transaction.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/25_mongo_replica_transaction/images/mongo_replica_transaction.html)
> (或本地打开 [`images/mongo_replica_transaction.html`](images/mongo_replica_transaction.html))。

## When to Use

**典型场景**。跨集合原子操作:扣库存加流水、转账、积分变更;多文档
业务规则:满足条件才允许同时写入多个集合。只要有"多步操作不能只做
一半"的需求,事务就是对的工具。

**何时不用**。单文档操作天然原子(MongoDB 保证单文档写入的原子性),
不需要显式事务;高吞吐场景下事务的性能开销约为非事务写入的 2~5 倍,
能用文档设计避免事务(如把关联数据内嵌)就优先内嵌。

| 手段 | 原子粒度 | 性能 | 什么时候选它 |
|:--|:--|:--|:--|
| 单文档操作 | 单文档 | 最高 | 数据可内嵌到同一文档 |
| 多文档事务 | 跨集合 | 较低 | 跨集合原子需求 |
| 两阶段提交(手工) | 跨集合 | 中 | 无副本集时的变通 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 mongo:7 就位、venv 装好 pymongo。
一条命令跑完整生命周期(约 15 秒):

```bash
cd database/25_mongo_replica_transaction && ./mongo_replica_transaction.sh all
```

真实输出(节选,完整 6 项断言以实跑为准):

```text
=====> [abort] 转账事务: 扣阿里加小熊后 abort, 两集合全部回滚
    abort 后: {'阿里': 1000, '小熊': 1000}, ledger 0 条
  [PASS] 两集合全部回滚({'阿里': 1000, '小熊': 1000}, ledger 0)
=====> [commit] 转账事务: 扣阿里加小熊写流水, commit 后双集合一致
    commit 后: {'阿里': 900, '小熊': 1100}, ledger 1 条
  [PASS] 两集合一致({'阿里': 900, '小熊': 1100}, ledger 1)
  [PASS] 总额守恒 2000
==== 实验 25 · mongo_replica_transaction 全部 6 项断言通过 [PASS] ====
```

诚实预期:rs0 的选举在 replSetInitiate 后需要几秒完成,启动脚本的
就绪探测会等待;w:majority 与 w:1 在单节点副本集上语义等价(都是
本地确认),延迟差异极小——多节点时差异才显现。

## How It Works

### 单节点副本集:事务的最低门槛

mongod 以 `--replSet rs0` 启动后,必须调用 rs.initiate() 初始化副本
集配置,节点经选举成为 PRIMARY 才能接受写入。事务依赖 oplog(操作日
志,副本集用于同步的核心机制)做 undo/redo——单节点也有 oplog。

### 事务中每个操作都要传 session

pymongo 4.x 中,事务不是隐式的——每个 CRUD 操作必须显式传
`session=session` 才会纳入事务。漏传 session 的操作会在事务外执行,
破坏原子性。这是最容易犯的错误:三步操作只有两步在事务里,第三步
失败了也不会回滚前两步。

### w:majority 与事务的关系

事务的 commit 默认要求 w:majority 确认(多数派节点已收到写入)。单节
点副本集只有自己,majority 等价于本地确认;多节点时 majority 保证主
节点挂了数据不丢——这是事务持久性的保障机制。

## Pitfalls & Q&A

**坑 1:replSetInitiate 的 host 必须是容器内部地址**。用宿主机映射端口
(127.0.0.1:55457)发起,节点之间(包括自己)心跳走内部地址——地址
错误节点永远选不出 PRIMARY。正确写法:容器内部端口 27017。

**坑 2:with_options 不接受 session 参数**。pymongo 4.x 的
Collection.with_options 只接受 read_preference/write_concern 等;
session 传给每个操作调用(update_one/insert_one 的关键字参数)。

**坑 3:directConnection=True 是单节点副本集的标配**。不用的话
MongoClient 会做副本集发现,而初始化前的 RSGhost 状态让发现失败;
directConnection 跳过发现直接连。

**Q1:abort 后被回滚的数据去哪了?** 回滚 = oplog 里不写入 commit 记录,
WiredTiger 利用快照恢复到事务前的状态;数据不是"删了再恢复",而是
"从未对外可见"。

**Q2:事务里能做 find 吗?** 能。事务内的读操作看到的是本事务已写入的
数据(自己的写自己可见),加上事务开始时快照里的已提交数据。

**Q3:单节点副本集的事务有意义吗?** 有——它让你在开发/测试环境用
和生产一致的代码路径;生产部署多节点副本集时,代码零改动。
