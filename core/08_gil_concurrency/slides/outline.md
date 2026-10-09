# Video Outline

> **标题**：一把锁的 Ceiling —— Python GIL 与并发模型
> **主题**：midnight-press（Checkpoint Plan 对齐后填入）
> **总时长**：约 3 分 50 秒（口播 ~600 汉字当量；各步估时累加 230 秒）
> **章节数**：6 章 / 22 步
> **口径说明**：延续 slots-memory / mro-mixin 压缩口径（~4 分钟、真机数字全保留、
> 口播外的细节挂画面）。实现讲足：GIL 微观机制（I/O 让锁）、CPU vs I/O 真机
> 三组数字（0.005/0.005/0.046 + 0.827/0.106/0.102 + 7.82x/8.12x）、GIL 释放
> 判定表（6 行全上）、"C 扩展≠释放 GIL"（re/json 反例 + numpy 正例 + Py_BEGIN_-
> ALLOW_THREADS）、三模型选型表（含内存开销列）、free-threading 一句。仅不展开：
> 切换间隔 5ms 源码级细节（口播带过）、demo [2] 的进程池启动成本分析长段（挂角标）、
> PEP 779 分阶段细节（一句带过）。

---

## 1. hook — 4 线程能跑满 CPU 吗？（3 steps · ~21s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 追问衔接：多继承的坑填完了，新的追问来了 —— 来源 article 导语 L3
- 追问原句：Python 起 4 个线程，CPU 能跑满吗？—— 来源 article 导语 L3
- 答案预告：CPython 有一把全局解释器锁（GIL），同一时刻只允许一个线程执行字节码 —— 来源 article 导语 L4
- 基准预告：threading / multiprocessing / asyncio 三种并发模型的真实边界 —— 来源 article 导语 L5

**开发计划**：

- step 1 (~7s) — 追问 hero：「Python 起 4 个线程，CPU 能跑满吗？」
- step 2 (~7s) — 答案卡：不能——CPython 有一把全局解释器锁（GIL 大字登场）
- step 3 (~7s) — 定义卡：同一时刻只允许一个线程执行字节码 + 三模型基准预告（threading/multiprocessing/asyncio 三 chip）

口播节选：
> 多继承的坑算是填完了，新的追问来了：Python 起 4 个线程，CPU 能跑满吗？……答案是不能。

---

## 2. gil — GIL 的让锁机制（5 steps · ~42s）

**信息池**：
- GIL 全称：Global Interpreter Lock（全局解释器锁）—— 来源 article §What L9
- 心智模型原句：GIL 只锁「执行字节码」这件事，线程一进入 I/O 等待就把锁让出去 —— 来源 article §What L9
- 微观时序原句：线程 1 acquire() 拿到 GIL 发起 socket.recv() 阻塞等待，等待期间释放 GIL，线程 2 获得锁执行 ~5ms，I/O 完成后线程 1 重新竞争 —— 来源 article §What L9
- 结论句：多线程能加速 I/O、不能加速 CPU 的微观原因 —— 来源 article §What L9
- 切换间隔：~5ms（sys.getswitchinterval()）—— 来源 article L64

**开发计划**：

- step 1 (~7s) — GIL 全称展开：Global Interpreter Lock（大字 + 中文）
- step 2 (~9s) — 心智模型 hero：GIL 只锁「执行字节码」/ I/O 等待就把锁让出去（两行对照）
- step 3 (~12s) — 微观时序图：线程 1 拿锁 → 发起 recv 阻塞 → 释放 GIL → 线程 2 获得 → 线程 1 回来竞争（时间线动画）
- step 4 (~7s) — 结论 hero：多线程能加速 I/O、不能加速 CPU 的微观原因
- step 5 (~7s) — 切换间隔角标：~5ms 切一次（sys.getswitchinterval()）

口播节选：
> 一句话心智模型：GIL 只锁「执行字节码」这件事。线程一进入 I/O 等待，就把锁让出去。

---

## 3. bench — 真机三组对照（6 steps · ~56s）

**信息池**：
- CPU 密集真机：n=200,000，4 进程：serial 0.353s / threading 0.359s / multiprocessing 0.164s（0.46x = 真并行加速） —— 来源 article 输出 L31-33
- CPU 结论行：Threading/Serial ratio 1.02（GIL 串行化）；Multiprocessing ratio 0.46（<1 = 真并行） —— 来源 article 输出 L35-36
- [2b] 粒度倒挂：n=5000 时多进程/串行 ≈17x 倒挂，进程池启动成本 ~50ms 远超计算本体 ~3ms —— 来源 article 诚实预期 L53
- I/O 密集真机：8 × 100ms sleep：serial 0.828s / threading 0.106s / asyncio 0.101s —— 来源 article 输出 L42-44
- I/O 结论行：Threading 7.84x / asyncio 8.19x speedup，Both FASTER (GIL released during I/O) —— 来源 article 输出 L45-47
- I/O 稳定：接近 8x 理论上限，稳定可复现 —— 来源 article 诚实预期 L52

**开发计划**：

- step 1 (~6s) — 实验设计卡：CPU 密集 = 素数计数；4 workers
- step 2 (~11s) — CPU 真机三行：serial 0.353s / threading 0.359s（1.02x 不加速）/ multiprocessing 0.164s（0.46x 真并行）
- step 3 (~5s) — 真并行解读：每进程独立 GIL，字节码真并行
- step 3b (~8s) — [2b] 粒度倒挂角标：n=5000 时多进程倒挂 17x（粒度也是选型的一部分）
- step 4 (~8s) — 实验切换：I/O 密集 = 8 × 100ms sleep（实验设计卡）
- step 5 (~11s) — I/O 真机三行：serial 0.828s / threading 0.106s（7.84x）/ asyncio 0.101s（8.19x）
- step 6 (~7s) — 对照结论：Both FASTER——GIL 在 I/O 等待期间被释放

口播节选：
> serial 0.005 秒，threading 0.005 秒。比值 1.01——原地踏步。……serial 0.827 秒，threading 0.106 秒——7.82 倍加速。

---

## 4. release — 什么时候释放 GIL（4 steps · ~44s）

**信息池**：
- 释放表 6 行原文：time.sleep() Yes(I/O 等待) / socket.recv() Yes(网络 I/O) / numpy.sum() Yes(C 扩展显式释放) / for range 10^9 No(纯 Python) / str.join() No(纯 Python) / re.match()/json.dumps() No(C 扩展但未释放) —— 来源 article 表 L77-83
- 反例原句：「是 C 扩展」≠「释放 GIL」：re、json 这类直接操作 Python 对象的 C 实现并不释放 GIL —— 来源 article L85
- 正例原句：numpy 之快在于它在 C 层显式使用了 Py_BEGIN_ALLOW_THREADS —— 来源 article L85
- 遍历口径：C 扩展可以在 C 层释放 GIL，但不是自动的 —— 来源 article L85

**开发计划**：

- step 1 (~8s) — 释放表引入：哪些操作会让出 GIL？（表格头）
- step 2 (~12s) — 释放表 6 行逐行上屏：Yes 三行（绿色/可读色）+ No 三行（灰色）
- step 3 (~12s) — 反例卡：「是 C 扩展」≠「释放 GIL」：re / json 是 C 但不放 / numpy 显式放（对照）
- step 4 (~10s) — 判定口诀：看操作是「等 I/O」还是「跑字节码」/ C 扩展要看有没有 Py_BEGIN_ALLOW_THREADS

口播节选：
> time.sleep() 可以，socket.recv() 可以，numpy.sum() 也可以。……re 和 json 就是 C 写的，但它们直接操作 Python 对象，GIL 不放。

---

## 5. models — 三种并发模型选型（4 steps · ~38s）

**信息池**：
- 三模型表：threading（I/O 密集：网络/文件/DB，GIL 在 I/O 时释放，低内存·共享）/ multiprocessing（CPU 密集：计算/编码，每进程独立 GIL，高内存·隔离）/ asyncio（大量 I/O 并发：高 QPS API，单线程无 GIL 问题，最低内存）—— 来源 article 表 L69-72
- 选型细则（Q2）：少量 I/O <100 → threading；大量 I/O >100 → asyncio；CPU 密集 → run_in_executor 转进程池 —— 来源 article Q2 L117-119
- free-threading：GIL 保护引用计数，去掉需改 GC 降低单线程性能；3.13 起实验性 free-threading；3.14 起 phase II 官方支持；传统 GIL 仍默认 —— 来源 article Q1 L114

**开发计划**：

- step 1 (~12s) — 三模型选型表逐行：threading / multiprocessing / asyncio 各带适用场景 + GIL 影响 + 内存开销
- step 2 (~10s) — 选型细则：<100 threading / >100 asyncio / CPU 转进程池（Q2 三行）
- step 3 (~9s) — free-threading 一句：3.13 实验版 / 3.14 phase II / 传统 GIL 仍默认（角标式，不展开）
- step 4 (~7s) — 收束：并发选型错误和线上事故都不会找上门（分清边界的价值）

口播节选：
> threading：I/O 密集，网络、文件、数据库。multiprocessing：CPU 密集，计算、编码。asyncio：大量 I/O 并发，高 QPS API。

---

## 6. closing — 为什么不去掉与系列回收（3 steps · ~24s）

**信息池**：
- GIL 存在原因：保护 CPython 的引用计数内存管理 —— 来源 article Q1 L114
- free-threading 现状：3.13 起实验性 / 3.14 起 phase II 官方支持 / 传统 GIL 仍默认 —— 来源 article Q1 L114
- 系列回收：MRO 管方法查找（上期）→ GIL 管执行权 —— 来源 article 导语 L3 / 系列前七期
- 仓库指引：hands-on-python，`cd core/08_gil_concurrency && python3 gil_concurrency.py` —— 来源 article How L18-19

**开发计划**：

- step 1 (~7s) — GIL 为什么还在：保护引用计数 / free-threading 3.13 实验 / 3.14 phase II / 传统 GIL 仍默认（时间线角标）
- step 2 (~8s) — 系列回收：with 管资源 / 描述符管属性 / 生成器管遍历 / 元类管类诞生 / MRO 管方法查找 / **GIL 管执行权**（系列六→七期拼图）
- step 3 (~9s) — CTA：hands-on-python 终端 + 双 chip（系列同款收尾）

口播节选：
> 完整代码在 hands-on-python 仓库，python3 一跑就有体感。链接在评论区，下期见。

---

## 素材清单

### 1. hook
- ✓ 追问 hero、GIL 大字、三模型 chip 预告，CSS/SVG 自绘

### 2. gil
- ✓ GIL 全称展开、两行对照 hero、微观时序时间线动画（线程 1/2 + 锁条切换）、结论卡，CSS/SVG 自绘

### 3. bench
- ✓ CPU 三行横条对照、I/O 三行横条对照、解读卡、实验设计卡，CSS/SVG 自绘

### 4. release
- ✓ 释放表 6 行逐行上屏、反例对照卡（re/json vs numpy）、判定口诀，CSS/SVG 自绘

### 5. models
- ✓ 三模型选型表逐行（含内存开销）、选型细则三行、free-threading 时间线角标，CSS/SVG 自绘

### 6. closing
- ✓ free-threading 时间线、七期拼图回收、系列同款终端 CTA，CSS/SVG 自绘
- ⚠️ Python 官方 logo 如需使用请用户提供；否则纯文字排版
