# 13 · WAL 与崩溃恢复:docker kill 之后,一行都不少

> 持续写入 8 秒、登记每个已提交的 id,中途 docker kill 断电再重启:5079 个
> 已确认的提交逐行校验 100% 存活;顺带实测 synchronous_commit=on/off 的
> 吞吐差(776 vs 2396 tps)与 pg_wal 的增长。6 项断言跑成全绿。

## Background

数据库往磁盘写数据有两样东西:数据页(表的真实内容)和日志。如果提交时
只写数据页,崩溃就是赌局——改动散在内存里的多个页,刷盘刷到一半断电,
提交过的数据缺一块,表直接损坏。

WAL(Write-Ahead Log,预写日志)是 PostgreSQL(下文简称 PG)的答案:
改动先顺序追加进 WAL 并落盘,然后才改数据页;数据页可以慢慢刷。崩溃恢复时引擎重放 WAL,
把所有已提交的改动在数据页上重建一遍——数据页丢了多少,WAL 都能补出来。
顺序写日志还比随机写页快,这是顺带的设计红利。

本实验把"提交返回后断电不丢"变成断言:写入线程逐条提交并登记 id,
主进程 docker kill 模拟断电,重启后逐行校验。

## What

**定义**:WAL 是只追加的顺序日志,每条改动先记日志再动数据页;提交返回
意味着 WAL 已落盘(on 档严格成立)。崩溃恢复=从检查点(checkpoint,上次
批量落盘并记下的进度点)重放 WAL,重建已提交改动。

synchronous_commit 是持久性分级开关:on 提交等落盘,off 提交即返回、
由后台批量落盘。

可以把 WAL 想成账房的流水账:伙计先记流水再整理账本,账本乱了按流水
重抄一遍就行。但和手工账本不同的是,流水必须先于账本落墨且不可跳过
——这正是名字里"先写"的含义,也是断电安全的全部来源。

| 配置 | 提交返回时机 | 断电后果 | 本实验实测 |
|:--|:--|:--|:--|
| synchronous_commit=on | WAL 落盘(fsync)后 | 已提交事务零丢失 | 5079/5079 行存活 |
| synchronous_commit=off | 记入缓冲即返回 | 可能丢最后几百毫秒 | 2396 tps(每秒提交数),on 的 3 倍 |

![Lab 13 · 一笔提交的持久性:WAL 落盘才回 ACK,断电后回放](images/wal_crash_recovery.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/13_wal_crash_recovery/images/wal_crash_recovery.html)
> (或本地打开 [`images/wal_crash_recovery.html`](images/wal_crash_recovery.html))。

## When to Use

**典型场景**。资金/订单类提交保持 on(默认):丢一笔就是事故;批量导入
临时切 off:吞吐换"最后几百毫秒可丢",导完切回;理解 checkpoint:
WAL 不能无限涨,checkpoint 把脏页(已改未落盘的数据页)刷盘后截断回收,本实验观测的
增长就是它的前半段。

**何时不用**。off 不该用于任何"丢了会赔钱"的写入;也别用同步复制(提交额外等一台从库确认的
方案)以外的手段追求"更快的持久"——那是分级,不是豁免。

| 分级 | 吞吐 | 断电窗口 |
|:--|:--|:--|
| synchronous_commit=on | 基准(实测 776 tps) | 无 |
| =off | 约 3 倍(实测 2396) | 最后几百毫秒 |
| =remote_apply | 低于 on(等备库,即上述从库) | 无,且从库可见 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 postgres:16-alpine 就位、venv 装好
psycopg。注意本实验容器不带 --rm(kill 后要重启同一个),clean 才删除。
一条命令跑完整生命周期(约 40 秒):

```bash
cd database/13_wal_crash_recovery && ./wal_crash_recovery.sh all
```

真实输出(节选,完整 6 项断言以实跑为准):

```text
=====> [durability] 持续写入 8 秒(每条独立提交并登记 id) -> docker kill 断电
    pg_wal 累计写入量采样(Bytes): [26525016, ..., 27430648]
  [PASS] 断电前已提交并登记 5,079 行(>1000 才有说服力)
    docker kill (SIGKILL, 模拟断电)...
  [PASS] 容器重启, 等待崩溃恢复完成
    重启后表内 5,079 行; 已登记 id 逐段校验缺失 0 行
  [PASS] 提交确认过的 id 100% 存在(缺失 0)
=====> [tps] synchronous_commit=on/off 各 4 秒: 持久性分级换吞吐
    on : 776 tps (每次提交等 WAL 落盘)
    off: 2,396 tps (提交即返回, 由后台批量落盘)
==== 实验 13 · wal_crash_recovery 全部 6 项断言通过 [PASS] ====
```

诚实预期:断电前行数与两组 TPS 随机器浮动(第二次实测 5001 行、
483/2588 tps),断言只锁"零丢失"与"off 高于 on";docker kill 对容器等于
拔电源,PostgreSQL 进程没有任何清理机会——这正是要测的场景。

## How It Works

### 提交返回的那一刻,承诺了什么

synchronous_commit=on 时,COMMIT 要等 WAL 记录 fsync 到磁盘才向客户端
返回——返回即承诺"这台机器再断电也不丢这一笔"。

写线程逐条提交并登记 id,登记发生在 commit 返回之后,所以登记表就是
"持久性承诺清单"。kill 后重启,清单上的 5079 个 id 逐一在表里出现,
一个不少,这就是承诺兑现的证据。

### 崩溃恢复:重放即重建

引擎启动时发现数据页落后于 WAL(上次没刷完),从最近的检查点开始重放:
已提交的改动前滚重建,未提交的丢弃。实验的重启等待窗口就是在等这段
回放——5 千行的量级秒级完成,量越大恢复越久,checkpoint 频率是其中
的权衡杠杆。

### pg_wal 观测:用 LSN 而不是目录大小

WAL 落在数据目录的 pg_wal/ 子目录,由 16MB 段文件预分配组成,几千行
写入撑不满一个段,du 看不出
变化。正确观测是 `pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')`:LSN
(日志序列号)是 WAL 的字节游标,本实验 8 秒内涨了约 1MB,写多少涨多少。

## Pitfalls & Q&A

**坑 1:本实验容器不能 --rm**。kill 掉 --rm 容器,容器连数据一起蒸发,
"重启同一容器"无从谈起;要脱离 --rm,clean 时补 rm -f。

**坑 2:登记 id 必须在 commit 返回之后**。先登记再提交,断电可能登记了
但没提交,校验必然失败——那测的是自己的 bug 不是 WAL。实验把 append
放在 commit() 之后,正是为了让登记表等于承诺清单。

**坑 3:重启等待要给足窗口**。崩溃恢复的回放需要时间,pg_isready 在
回放完成前不会就绪;60 秒重试窗口对本实验量级绰绰有余,量级大了要按
比例放宽。

**Q1:off 丢了的事务去哪了?** 客户端收到了提交成功的返回,但服务端没
来得及落盘——是最危险的一类丢失:双方都以为成功了。所以 off 只配
"丢了能重跑"的场景。

**Q2:WAL 会不会无限涨?** 会,直到 checkpoint。checkpoint 把脏页全部
刷盘后,旧 WAL 就不再需要,可回收复用;checkpoint 太频繁伤写入吞吐,
太稀疏拉长恢复时间,PG 自动调权衡。

**Q3:和实验 05 的"kill -9 子进程"有什么不同?** 那次杀的是客户端,
事务没提交,回滚即可;这次杀的是数据库本体,提交过的都要活着——
前者靠事务原子性,后者靠 WAL 持久性,两根柱子各管一段。
