# 20 · Redis 持久化与分布式锁:丢多少、锁多牢、崩了怎么办

> AOF everysec 持续写入 5 秒后 docker kill:48689 条客户端确认的写入
> 重启后 0 丢失;SET NX PX 互斥抢锁 20 并发恰 1 成功,Lua 校验 token 原子
> 释放,持有者崩溃后 TTL 到期他人可抢。9 项断言跑成全绿。

## Background

Redis 默认把数据放内存,进程一断电全没了——这对缓存无所谓(实验 18
的 miss 大不了回库读取),但如果把锁或计数器也放在 Redis 里,丢数据就从"体验
问题"升级成"正确性问题":两个进程拿到同一把锁,互斥就破产了。

Redis 的两层答案:AOF(Append Only File,把每条写命令追加到日志文件)
保证断电后数据可重放恢复;SET NX PX 加 Lua 脚本(Redis 内置的脚本语言,整段脚本作为单条命令原子
执行)提供"互斥锁 + 崩溃自愈"的标准锁实现。

两者都要实测:AOF 的 everysec 档最多丢约 1 秒写入,锁的 TTL 是持有者
崩溃后的自愈兜底——每个数字都有边界,边界就是选型依据。

本实验断电一次、抢锁 20 次、崩溃一次,把上述承诺全部变成断言。

## What

**定义**:AOF 以 everysec 档运行时,Redis 每秒把写命令缓冲 fsync(强制
把数据刷写到磁盘的系统调用)一次,断电最多丢最后约 1 秒。分布式锁用 `SET key token NX PX 3000` 实现:
NX(不存在才设置)保证互斥,PX 3000(3 秒过期)保证持有者崩溃后锁自动
释放。

token 是每个持有者的随机身份,释放时用 Lua 脚本校验"是自己的锁才删"
(GET 与 DEL 原子执行,防止删掉别人的锁)。

可以把带 TTL 的锁想成带自动回收的会议室门牌:拿到门牌的人用完要摘
(Lua 释放);人突然消失也没关系,门牌 3 秒后自动回收,别人可以接着用。
但门牌回收不等于工作做完——新持有者接手时,前任的进度无人知晓,这是
TTL 兜底的固有代价。

| 机制 | 保证 | 本实验实测 |
|:--|:--|:--|
| AOF everysec | 断电丢 ≤ 约 1 秒 | 48689 条写入 0 丢失 |
| SET NX PX | 互斥:并发恰一人持锁 | 20 并发恰 1 成功 |
| Lua token 释放 | 不能删别人的锁 | 错误 token 被拒 |
| TTL 到期 | 崩溃后锁自愈 | 1.5s 后他人可抢 |

![Lab 20 · 分布式锁的一生:抢锁、用锁、释放或崩溃](images/redis_persistence_lock.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/20_redis_persistence_lock/images/redis_persistence_lock.html)
> (或本地打开 [`images/redis_persistence_lock.html`](images/redis_persistence_lock.html))。

## When to Use

**典型场景**。防止定时任务多实例重复跑:启动前先抢锁,抢到才执行;秒杀
去重与限流:SET NX PX + TTL 组合天然适合"一次性资格";任何"同一时刻
只允许一个进程做某事"的协调需求。

**何时不用**。Redis 单点故障时锁会不可用或双持,强一致锁要求用
ZooKeeper/etcd 这类共识系统;任务本身能容忍重复执行(幂等)时,不加锁
更简单——锁是给"不能重复"的场合准备的。

| 手段 | 正确性 | 复杂度 | 什么时候选它 |
|:--|:--|:--|:--|
| Redis 锁(本实验) | 单点 Redis 下互斥 | 低 | 一般防重;容忍极小故障窗口 |
| RedLock(多独立 Redis 各抢一把,拿到多数派才算持锁) | 多数派互斥 | 高 | Redis 高可用且要求更强互斥 |
| ZooKeeper/etcd | 共识强一致 | 最高 | 资金级互斥 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 redis:7-alpine 就位、venv 装好
redis-py。注意本实验容器不带 --rm(kill 后要重启同一个),clean 才删除。
一条命令跑完整生命周期(约 30 秒):

```bash
cd database/20_redis_persistence_lock && ./redis_persistence_lock.sh all
```

真实输出(节选,完整 9 项断言以实跑为准):

```text
=====> [persistence] AOF everysec 持续写入 5 秒 -> docker kill -> 重启数丢失
    断电前客户端确认 48,689 条写入
  [PASS] 写入量足够(48,689 > 500)
    docker kill (SIGKILL, 模拟断电)...
  [PASS] 重启完成且可响应
    重启后存活 48,689/48,689, 丢失 0 条
=====> [lock] SET NX PX: 20 并发抢同一把锁, 恰 1 个成功
  [PASS] 互斥: 恰 1 个成功(1/20)
=====> [lock-ttl] 持有者崩溃: TTL 到期后锁自动可抢(兜底)
  [PASS] TTL 到期后他人可获取锁(自愈兜底)
==== 实验 20 · redis_persistence_lock 全部 9 项断言通过 [PASS] ====
```

诚实预期:丢失条数与写入条数都随机器波动(断言只要求写入 >500;丢失
取决于 fsync 速度,实测两次均 0,极端慢盘可能丢几十至几百条),断言锁"丢失 < 20%"以覆盖 everysec 语义;TTL 剩余毫秒
数有抖动;崩溃分支用 docker kill 一次性注入,重跑 `all` 会重建容器。

## How It Works

### AOF everysec:用 1 秒窗口换 3 倍吞吐

everysec 档下,写命令先进缓冲,后台线程每秒 fsync 一次;客户端的确认
不等 fsync,所以吞吐高(实验 13 的 synchronous_commit=off 同理)。断电
时缓冲里未落盘的命令丢失——上限约 1 秒,实际往往更少。

要求零丢失把配置 appendfsync(Redis 的刷盘档位开关,everysec 就是它的
一个取值)改为 always,每次写都落盘,吞吐会跌到与 PostgreSQL(实验 13)
的同步提交相当。

### Lua 释放:GET 与 DEL 之间不能插队

"先 GET 判断是不是自己的锁、再 DEL"是两步操作,中间锁可能恰好过期且
被他人抢走——DEL 就会误删别人的锁。Lua 脚本在 Redis 单线程里原子执行
"匹配才删",窗口归零。这是"检查与执行必须原子"的又一例:凡是判断和
动作分离的写路径,都要考虑用 Lua 或事务打包。

### TTL 兜底:崩溃自愈的代价是进度未知

持有者持有锁期间崩溃(不释放),锁靠 PX 的 TTL 自动消失,其他节点随后
可正常抢锁——系统自愈,没有死锁残留。代价是:前任拿着锁做到一半的
工作无人接管,新持有者从头开始。所以持锁任务必须设计成可重入或幂等
(重复执行不产生额外副作用),TTL 的选取则要大于任务的最长执行时间。

## Pitfalls & Q&A

**坑 1:释放锁不用 Lua、先 GET 再 DEL**。两步之间锁过期且被他人抢走,
DEL 误删他人锁,互斥瞬间破裂;必须用 Lua 把匹配与删除打包成原子操作。

**坑 2:SET 不带 NX/PX**。`SET key value` 永远成功,不构成互斥;NX 保证
"只有没人持有时才发锁",PX 保证"持有者消失后锁有寿命"——两者缺一不可。

**坑 3:AOF 重启后 first write 竞态**。docker start 后 Redis 可响应
不等于 AOF 重放完成;重启后立刻写入的命令会排队在重放之后,实验用
ping 就绪探测加自然延迟覆盖了这一窗口。

**Q1:everysec 实测 0 丢失,是不是说它就是零丢失?** 不是。0 丢失是
本机 fsync 快于写入峰值的巧合;everysec 的语义承诺是"最多约 1 秒",
零丢失只有 always(或换支持同步提交的系统)能承诺。

**Q2:锁的 TTL 设多长?** 大于持锁任务 P99 耗时,并配合"看门狗续期"
(持有者定期延长 TTL)使用;太短会未做完就被抢,太长崩溃后系统停摆
同长。

**Q3:Redis 挂了锁就没了,怎么办?** 接受"极小概率双持"并让业务幂等,
或上 RedLock/ZooKeeper;先算清故障概率与业务损失,再决定复杂度。
