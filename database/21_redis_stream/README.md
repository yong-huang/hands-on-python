# 21 · Stream 与 Pub/Sub:断线窗口的两种命运(选做)

> 同一个断线窗口发 10 条消息:Pub/Sub 的重连订阅端收到 0 条(丢消息
> 复现),Stream 消费组重连后 XREADGROUP 补读全部 10 条;未 ACK 的消息
> 留在 pending 列表可重新认领,XACK 后清零。7 项断言跑成全绿。

## Background

发布订阅是解耦生产与消费的标准手法,但 Redis 的 Pub/Sub 有一个公开的
语义:消息不落盘,只投给"此刻在线"的订阅者——订阅端断线重连,窗口期
的消息无处可寻。做通知推送无所谓,做订单事件同步就是事故。

Redis 5.0 补上了 Stream:追加日志型结构,消息写入后持久留存;消费组
(consumer group)为每组消费者维护游标,断线重连后从游标处继续;未确认
(ACK)的消息进 pending 列表,可被重新认领。

这套组合提供 at-least-once(至少送达一次)语义,代价是消费端必须幂等
(同一条消息可能被投递多次,处理逻辑被重复执行也要不改变结果)。

本实验让两种通道经历同一次"断线窗口",数字级对比各自的命运。

## What

**定义**:Pub/Sub 是即发即弃的消息广播——PUBLISH 把消息投给当前在线
的订阅者,不存储。Stream 是持久化的追加日志,XADD 追加条目;消费组让
多个消费者分工读取同一条 Stream。

XREADGROUP 用 `>` 取新消息、用 `0` 认领自己读过但未 ACK 的消息
(pending 列表),XACK 确认后移除。

可以把 Pub/Sub 想成现场广播:不在场就听不见,广播完即消散。Stream 则
是公告栏加签到本:公告贴着不走,每人签到自己读到哪条,没签确认的回来
补签重读。

但补签重读意味着同一条公告可能被处理两次——at-least-once 的另一面是
消费逻辑必须幂等。

| 维度 | Pub/Sub | Stream 消费组 |
|:--|:--|:--|
| 断线窗口消息 | 丢失 | 留档可补 |
| 送达语义 | 至多一次(在线) | 至少一次(ACK 前) |
| 消费端要求 | 无 | 幂等 + XACK |

![Lab 21 · 断线窗口的两种命运:Pub/Sub 丢失 vs Stream 补读](images/redis_stream.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/21_redis_stream/images/redis_stream.html)
> (或本地打开 [`images/redis_stream.html`](images/redis_stream.html))。

## When to Use

**典型场景**。Pub/Sub:实时行情推送、聊天在线消息——丢一两条无所谓的
瞬态通知;Stream:订单事件、任务分发、审计流水——"一条都不能少"且要
多消费者分工的场景。

**何时不用**。Stream 需要消费确认、重试、死信管理(多次投递仍失败的消息,转入专门
队列兜底)——做重了会变成自制消息队列(MQ);
消息量大或需要复杂路由时直接上专业消息队列。Pub/Sub 则不适合任何
"消费者可能离线"的场景——那是它设计上就不提供的东西。

| 需求 | 更合适的选择 |
|:--|:--|
| 在线瞬态通知 | Pub/Sub |
| 事件必须送达 | Stream 消费组 |
| 重试/延迟/大规模分区 | 专业消息队列 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 redis:7-alpine 就位、venv 装好
redis-py。一条命令跑完整生命周期(约 10 秒):

```bash
cd database/21_redis_stream && ./redis_stream.sh all
```

真实输出(节选,完整 7 项断言以实跑为准):

```text
=====> [pubsub] Pub/Sub: 订阅端断线窗口发 10 条, 重连后收到 0 条
    在线窗口: 订阅端收到 10/10 条
    断线窗口后的 10 条: 重连的新订阅端收到 0 条
  [PASS] 断线期间的消息全部丢失(0 条可补)
=====> [stream] Stream 消费组: 断线窗口的 10 条, 重连后 XREADGROUP 全部补读
    重连后 XREADGROUP '>' 补读 10 条新消息
  [PASS] 新消息补读 10/10
    XACK 后 pending 剩 0 条
  [PASS] XACK 后 pending 清零
==== 实验 21 · redis_stream 全部 7 项断言通过 [PASS] ====
```

诚实预期:Pub/Sub 在线窗口的 10 条全部可达(同机回环,无网络抖动);
Stream 断线窗口的重连时机不影响结果——消息在 Stream 里等着,早读晚读
都是那 10 条。

## How It Works

### Pub/Sub 丢失的机制:没有存储就没有补读

PUBLISH 的实现是把消息推给订阅频道的每个客户端连接的输出缓冲,推完
即弃。订阅端断线意味着没有连接在收,消息根本没有去向——重连后的
SUBSCRIBE 是全新的订阅,从重连那一刻开始收。10 条消息 0 条可补,
这就是"至多一次"。

### 消费组三件套:>、0、XACK

XREADGROUP 的 `>` 游标取"本组从未投递过"的新消息;取走即记录到该
消费者的 pending 列表(未 ACK 状态)。

重连后先以 `0` 游标认领 pending 里的旧消息(处理成功就 XACK),再继续
`>` 取新消息——这正是 at-least-once 的实现:消息要么已 ACK(确认处理
完),要么在 pending 里等着被重新处理。

### 幂等:at-least-once 的必要代价

pending 重认领意味着同一条消息可能被处理两次(第一次处理完但 ACK 前崩溃)。
消费逻辑因此必须幂等:用业务唯一键去重(如订单号做 Hash 键),或把
"处理"设计成重复执行无副作用。选型时把这一条算进成本。

## Pitfalls & Q&A

**坑 1:XGROUP CREATE 在 Stream 不存在时报错**。加 MKSTREAM 选项让
Redis 自动创建空 Stream(本实验用法);或先 XADD 一条再建组。

**坑 2:pending 消息不会自己重投**。XREADGROUP 用 `>` 只取新消息;pending
里的旧消息要用 `0` 游标或 XAUTOCLAIM 主动认领,忘了这一步消息就永远
躺在 pending 里。

**坑 3:pubsub.get_message 要先吃掉 subscribe 确认帧**。订阅成功后
Redis 先推一条 subscribe 确认消息,没吃掉它就把后面的当数据解析会出错。

**Q1:消费组挂了,消息会丢吗?** 不会。Stream 里的条目持久留存,pending
里的未 ACK 也留存;重新拉起消费组用同名组名即可从断点继续。

**Q2:多个消费者同组会重复消费吗?** 不会——`>` 投递是分片的,每条新
消息只投给组内一个消费者;会重复的是 pending 重认领,靠业务幂等消化。

**Q3:Stream 会不会无限涨?** 会,需要 XTRIM 按长度或按 ID 截断;生产
上常设 MAXLEN ~ 保留窗口,消费组的游标独立于截断,只要别截掉未消费
的区间即可。
