# Video Outline

> **主题**：`monochrome-print`（python-concurrency 系列统一黑白印刷皮肤，系列既定，不再另选）
> **总时长**：约 10 分钟（mytts zm_009 实测合成 592s；口播 ~3300 字）
> **章节数**：11 章 / 48 步（实现定稿，= 各章 narrations.ts 之和；收尾 API 表已合并为一页）
> **script**：37 拍（用户已 review 定稿）；本章 step 划分 = 拍 × 1~2，最终以各章 narrations.ts 为准

---

## 1. hook — 片头：一行都没跑的函数调用（7 steps · ~48s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 输出：`coro = sample() → <coroutine object sample at 0x1051cf4c0>`，此刻执行痕迹 `[]` —— 来源 article §Quick Start L71-72
- 输出：`asyncio.run(coro) → 'sample-结果'`，执行痕迹 `['body-ran']` —— 来源 article §Quick Start L73
- 警示：忘 await 的协程对象被 GC 时警告 `never awaited` —— 来源 article §Quick Start L74
- 版本：asyncio 3.4 进入标准库，3.5 起 async/await（PEP 492）—— 来源 article §Background L16
- 数据：整个实验约 0.4~0.5 秒 —— 来源 article 引言 L6 / §Quick Start L60
- 词义：线程 = 程序里一条正在干活的执行线 —— 来源 script beat 1

**开发计划**：
- step 1 (~5s) — 片头标题页：主标「协程与事件循环」+ 副标「单线程内的并发」+ 工程图签（hands-on-python · concurrency 08 · asyncio）
- step 2 (~11s) — 邪门现象：hero 大字「调用一个函数，它一行都没跑」+ 小注「程序没报错、照常跑完」
- step 3 (~11s) — 定性卡：标语「这不是 bug，是 asyncio 故意的设计」+ 半秒讲透的承诺
- step 3~6 (~12s) — 四问清单逐个亮（递进列表，1 项 = 1 step）：协程是什么 / await 交出了什么 / 有没有新线程 / 怎么写才真并发
- step 1 备注：hook 实现为 7 步（四问各占一步）

口播节选：
> 先看一件邪门的事。我写好了一个函数。注意，它不是普通函数——开头多了个 async，是协程函数。里面的活儿都备好了。现在，调用它。一行都没跑。不是卡住了。程序没报错、照常跑完，但函数里那摊活儿一行都没干。

---

## 2. background — 线程方案在哪里撞墙（5 steps · ~78s）

**信息池**：
- 数据：上千个并发连接 = 上千个线程，内存与切换成本随并发数线性上涨 —— 来源 article §Background L12
- 词义：抢占式调度——由内核强制切换，任务自己说了不算 —— 来源 article §Background L14
- 词义：GIL 全局解释器锁——同一时刻只允许一个线程执行字节码 —— 来源 article §Background L14
- 机制：异步思路 = 把切换权从内核拿回用户代码，任务在等待点主动让出 —— 来源 article §Background L16
- 版本：asyncio 3.4 进入 / 3.5 起 async、await（PEP 492）—— 来源 article §Background L16
- 数据：单线程同时照看上万条连接 —— 来源 article §Background L16

**开发计划**：
- step 1 (~12s) — 提问页：上万条连接同时在等数据，靠谁处理？+ 默认答案「线程：一任务一线程，切换归操作系统」
- step 2 (~12s) — 成本图：上千连接 = 上千线程的直线上涨示意 + 大多数线程「只是干等」标注
- step 3 (~22s) — 第二撞墙点：抢占式调度「操作系统想切就切」+ G I L 大锁压顶 + 交错不可复现
- step 4 (~15s) — 转向：标语「把切换权从操作系统手里拿回来」+ 让出的白话注解「我先歇会，你先上」
- step 5 (~17s) — asyncio 登场：hero 名牌 + 时间线 3.4 进标准库 / 3.5 起 async、await

口播节选：
> 它是抢占式调度——操作系统想切就切，你的代码根本拦不住。上面还压着 G I L，全局解释器锁，同一时刻只放一个线程干活。

---

## 3. mental-model — 两个词 + 一句话心智模型（5 steps · ~85s）

**信息池**：
- 定义：协程 = 用户态的协作式任务，await 处主动暂停交控制权 —— 来源 article §What L22
- 定义：事件循环 = 单线程内反复「取任务—执行—等事件」的循环体 —— 来源 article §What L22
- 心智模型原文：睡眠中的任务挂在定时器堆上，到期再放回可运行队列；全程没有第二个线程 —— 来源 article §What L24
- 类比：独自看全店的服务员——哪桌菜好去上菜，没人喊就擦桌子；阻塞调用让全店停摆 —— 来源 article §What L26
- 对比：并发 = 重叠时段交错推进；并行 = 同一瞬间同时执行；asyncio 只给并发 —— 来源 article §What L28

**开发计划**：
- step 1 (~12s) — 协程定义卡：白话「自己说了算的任务」+ 切不切、几时切由你的代码决定
- step 2 (~13s) — 事件循环定义卡：单线程管家三件事「取任务 / 执行 / 等消息」
- step 3 (~18s) — 一句话心智模型：等待点交还控制权 → 单线程来回切换 → 闹钟表到点放回待命队伍 + 底部「全程没有第二个线程」
- step 4 (~24s) — 服务员类比：一店一服务员 + 上菜（事件就绪）/ 擦桌子（跑待命队伍）/ 死等 = 全店停摆
- step 5 (~18s) — 并发 ≠ 并行双栏定义 + 结论行「asyncio 给的是并发：从不创建线程，只是不让 CPU 闲着等数据」

口播节选：
> 协程一到等待点——就是写 await 的地方——就主动交还控制权。事件循环在单线程里来回切换。全程，没有第二个线程。

---

## 4. when-to-use — 三种该交给协程的活（4 steps · ~59s）

**信息池**：
- 案例：上万并发连接的抓取器、长连接网关——每任务一个协程对象而非一个线程 —— 来源 article §When to Use L34
- 案例：交错序列 `A1 B1 A2 B2 A3 B3` 可写成断言；线程抢占式交错做不到 —— 来源 article §When to Use L35
- 词义：断言 = 写死的自动核对，错一步就报警 —— 来源 script beat 15
- 链接：单机任务编排见 09_task_orchestration —— 来源 article §When to Use L36
- 机制：协作式调度在约定点主动让出 → 交错序列可复现 —— 来源 article §When to Use L35

**开发计划**：
- step 1 (~14s) — 场景一卡：等待特别多的活（抓上万个网页 / 守上万条连接）+ 「一小条记录，不雇一个线程」
- step 2 (~20s) — 场景二铺垫：可复现的交错 + 断言白话卡「写死的自动核对：A 干第一步、B 干第一步……错一步就报警」
- step 3 (~14s) — 活例子预告：序列 A 1 B 1 A 2 B 2 A 3 B 3 每遍都一样 + 对照「线程想切就切，给不了这个保证」
- step 4 (~11s) — 场景三卡：先登录→再取数据→最后存盘的编排示意 + 角标「下一讲主角」

口播节选：
> 你甚至能写一条自动核对：顺序必须正好是 A 干第一步、B 干第一步、A 干第二步……错一步就报警。这种写死的核对，行话叫断言。

---

## 5. boundaries — 三种别用 + 一张表分清三者（5 steps · ~55s）

**信息池**：
- 边界：CPU 密集任务协程不让出就独占循环、其他任务饿死；真并行要进程（05_mp_accel）—— 来源 article §When to Use L40
- 边界：没异步接口的库卡住整个循环，用线程兜底更直接 —— 来源 article §When to Use L41
- 边界：并发量就几个、逻辑简单不值得引入异步生态 —— 来源 article §When to Use L42
- 表：threading 内核抢占式、受 GIL 串行化 → 中低并发 IO / 阻塞库兜底 —— 来源 article §When to Use L48
- 表：multiprocessing 多解释器真并行 → CPU 密集 —— 来源 article §When to Use L49
- 表：asyncio 用户态协作式、切换成本函数调用级 → 海量 IO 等待 —— 来源 article §When to Use L50
- 结论：CPU 密集协程与线程都不行，要进程 —— 来源 article §When to Use L52

**开发计划**：
- step 1 (~14s) — 别用一：纯计算的活「不算完不让位，别的全饿死」+ 出路「真并行靠多进程」
- step 2 (~14s) — 别用二/三双卡：不配合协程的库卡死循环 → 线程兜底；就几个并发不值得引入
- step 2 (~12s) — 三者对比表第一行：线程（调度方式 + 何时选它）
- step 3 (~12s) — 对比表后两行逐行亮：进程 / 协程
- step 4 (~15s) — 收束行：纯计算的活线程和协程都不行，只有进程 + 大字「等待选协程，计算选进程」

口播节选：
> 线程：操作系统想切就切，上面压着 G I L 那把大锁。进程：多开几个独立的 Python，真的能同时干活。协程：切换的开销，跟普通函数调用差不多。

---

## 6. demo-lazy — 真机实验：调用 ≠ 执行（4 steps · ~63s）

**信息池**：
- 命令：`cd concurrency/08_coroutine_loop && python3 coroutine_loop.py`，四个小节 + 全部断言，约 0.5 秒 —— 来源 article §Quick Start L58-60
- 输出 [1]：`coro = sample() → <coroutine object sample at 0x1051cf4c0>`，执行痕迹 `[]` —— 来源 article L71-72
- 输出 [1]：`asyncio.run(coro) → 'sample-结果'`，执行痕迹 `['body-ran']` —— 来源 article L73
- 输出 [1]：忘 await 被 GC 时警告 `never awaited` —— 来源 article L74
- 机制：协程对象把函数体、局部变量、执行位置打包，等事件循环驱动才执行 —— 来源 article §How It Works L114
- 坑：`asyncio.run(main())` 忘写或子协程没 await → 程序什么都没做就"成功"退出 —— 来源 article §How It Works L116

**开发计划**：
- step 1 (~7s) — 模拟终端：命令行 `python3 coroutine_loop.py` + 四个小节标题 + 小注「全部断言自动核对」
- step 2 (~12s) — 终端节选 [1]：调用 sample 返回协程对象 + 执行痕迹「空：一行都没跑」高亮
- step 3 (~19s) — 续行对照：asyncio.run 驱动后痕迹变「跑过了」+ 打包示意（要干的活 / 用到的变量 / 干到哪一行）
- step 4 (~25s) — never awaited 警示卡：清理时报警 + 第一大坑说明「程序什么都没干，就成功退出」

口播节选：
> 调用 sample，拿回来的不是结果，是一个协程对象。此刻函数里的执行痕迹：空。一行都没跑。

---

## 7. single-thread — await 让出的是控制权：单线程交错（3 steps · ~65s）

**信息池**：
- 输出 [2]：交错序列精确等于 `A1 B1 A2 B2 A3 B3`（sleep(0) 轮转，精确可复现）—— 来源 article §Quick Start L79
- 输出 [2]：线程断言：全部协程代码跑在同一个线程上；协程所在线程 MainThread —— 来源 article L80-81
- 结论：并发 ≠ 并行——asyncio 从不创建线程，只是不让 CPU 闲着等 IO —— 来源 article L82
- 机制：`await x` = 「我要等 x，先把控制权还给事件循环」—— 来源 article §How It Works L120
- 机制：sleep(0) = 让出但立刻回就绪队列，确定性轮转可断言 —— 来源 article §How It Works L143
- 诚实预期：换成 sleep(0.01) 就不该断言顺序 —— 来源 article §Quick Start L94

**开发计划**：
- step 1 (~20s) — 交错时间带：A、B 两条泳道按 A1 B1 A2 B2 A3 B3 轮流点亮 + 断言核对行「一字不差，跑多少遍都一样」
- step 2 (~20s) — 线程断言卡：全部协程 → MainThread（程序一启动自带的线程）+ 结论「从不创建新线程；并发 ≠ 并行」
- step 3 (~25s) — 设计心得卡：断言要建立在分毫不差的机制上 + 对照「零秒轮转能核对 vs 真实几十毫秒睡眠闹钟有误差、系统卡一下就变序」

口播节选：
> 两个协程轮流干活，交错序列精确等于 A 1 B 1 A 2 B 2 A 3 B 3——跟断言里写的一字不差。

---

## 8. real-concurrency — await 链 vs create_task：差的不是语法是并发（4 steps · ~43s）

**信息池**：
- 输出 [4]：`await 链（顺序）: 203ms ['s1', 's2']` —— 来源 article §Quick Start L87
- 输出 [4]：`create_task（并发）: 101ms ['c1', 'c2']   (2.01×)` —— 来源 article §Quick Start L88
- 结论行：await coro() 只是带异步语法的函数调用；想同时跑，先 create_task 挂上去 —— 来源 article L89
- 代码：`r.append(await slow_step("s1", 0.1))` vs `t = asyncio.create_task(slow_step("c2", 0.1))` —— 来源 article §How It Works L133-134
- 诚实预期：加速比 ≈ 2.0×，理论恰为 2×，事件循环自身开销可忽略 —— 来源 article §Quick Start L95
- 链接：TaskGroup 是 create_task 的结构化升级版（09）—— 来源 article §How It Works L139

**开发计划**：
- step 1 (~12s) — 排队写法：s1、s2 两根 100ms 时间条首尾相接 = 203ms + 标注「排着队挨个 await」
- step 2 (~10s) — create_task 写法：c1、c2 两根时间条重叠 = 101ms + 大字「实测 2.01 倍」
- step 3 (~11s) — 本质差异：await 一个协程函数 = 按顺序调用、只允许中途插一脚；不并发
- step 4 (~10s) — 正确姿势：先 create_task 挂上循环立刻参与调度 → 之后的 await 只收结果

口播节选：
> 排着队跑两个 100 毫秒的任务：203 毫秒。create_task 真并发：101 毫秒。实测 2.01 倍。

---

## 9. mechanism — 拆开看：asyncio.run 与循环里的两张表（3 steps · ~44s）

**信息池**：
- 机制：`asyncio.run(main())` ≈ `new_event_loop()` + `run_until_complete()` + 清理，实测两者结果完全一致 —— 来源 article §How It Works L126
- 机制：循环维护一张调度表——就绪队列（可立即执行）+ 定时器堆（sleep 到期 / IO 就绪再入队）—— 来源 article §How It Works L128
- 铁律：一个线程同时只能有一个运行中的事件循环；协程里再调 `asyncio.run()` 直接报错 —— 来源 article §How It Works L128
- API：`loop = asyncio.new_event_loop()` 是 asyncio.run 的底层部件 —— 来源 article §Quick Start L106

**开发计划**：
- step 1 (~19s) — asyncio.run 三步拆解：新建事件循环 → 跑到结束 → 清理 + 角标「跟手动一步步建循环实测一致，只是打包」
- step 2 (~15s) — 调度表示意：就绪队列（立刻能跑）+ 定时器堆（睡着的闹钟表，到点搬回队伍）
- step 3 (~10s) — 铁律卡：一个线程同时只能有一个运行中的事件循环 + 协程里再调 asyncio.run → 直接报错

口播节选：
> asyncio.run 到底做了什么。三步：新建事件循环，跑到结束，最后清理。它只是替你把这几步打包好了，没有别的名堂。

---

## 10. pitfalls — 五个真坑（6 steps · ~94s）

**信息池**：
- 坑 1：以为调用协程函数就会执行——什么都没做成功退出、GC 警告 never awaited；解法 await 或 create_task —— 来源 article §Pitfalls L151
- 坑 2：以为 await 创建了新线程——实测全部协程都在 MainThread；解法理解单线程交错、真并行交进程 —— 来源 article §Pitfalls L152
- 坑 3：把 await coro() 当并发——总耗时等于各任务之和；解法先 create_task 再收结果 —— 来源 article §Pitfalls L153
- 坑 4：协程里调 time.sleep()——整个循环卡死全部停摆；解法只准 await asyncio.sleep —— 来源 article §Pitfalls L154
- 坑 5：CPU 密集放进协程——循环被独占全部饿死；解法 run_in_executor 移出循环 —— 来源 article §Pitfalls L155
- 词义：run_in_executor = 把阻塞/计算活儿转交给别的线程或进程的外包窗口 —— 来源 script beat 35

**开发计划**：
- step 1 (~7s) — 章节引子：「最后，五个真坑，每个都有真实现象」+ 坑 1~5 编号预告条
- step 2 (~12s) — 坑一卡：现象（什么都没做成功退出）/ 原因（只造对象没人驱动）/ 解法（await 或 create_task）
- step 3 (~16s) — 坑二卡：以为 await 开新线程 / 实测全在主线程 / 真并行交进程
- step 4 (~15s) — 坑三卡：await 链总耗时 = 各任务之和 / 先 create_task 再收结果
- step 5 (~23s) — 坑四卡：time.sleep 站着死等一步不让 → 全循环停摆 / 只准用会谦让的 asyncio.sleep
- step 6 (~21s) — 坑五卡：纯计算独占循环全饿死 / run_in_executor 外包窗口转交，别堵在店里

口播节选：
> time.sleep 是站着死等，等的时候一步不让，别人全插不进来。在 asyncio 的世界里睡觉，只准用会谦让的 asyncio.sleep。

---

## 11. closing — 常用入口 + 收尾（2 steps · ~24s）

**信息池**：
- API 表：`async def`/`await` 定义与让出；`asyncio.run` 主入口用一次；`create_task` 真并发入口；`asyncio.sleep` 非阻塞睡眠（换 time.sleep 全局停摆）—— 来源 article §Quick Start L100-105
- API：`loop = asyncio.new_event_loop()` 手动建循环，asyncio.run 的底层部件 —— 来源 article §Quick Start L106
- 仓库：hands-on-python · concurrency/08_coroutine_loop，python3 直跑 —— 来源 article §Quick Start L58
- 预告：任务编排 TaskGroup / 超时 / 取消，见 09_task_orchestration —— 来源 article §When to Use L36 / §How It Works L139

**开发计划**：
- step 1 (~16s) — API 速查表一页：五行按口播点名逐个亮（上一行随之转灰）+ 警示行「换 time.sleep，全店停摆」
- step 2 (~8s) — 收尾：仓库路径 + 下一讲预告（任务编排：TaskGroup、超时、取消）+ 下期见

口播节选：
> 常用入口就五个，收好。create_task 是真并发的入口。asyncio.sleep 是会谦让的睡眠——换成 time.sleep，全店停摆。

---

## 素材清单

### 1. hook
- ✓ 标题页排版（主标 / 副标 / 工程图签）、邪门现象 hero 卡、四问清单 —— 程序化绘制

### 2. background
- ✓ 连接/线程成本上涨图、抢占式 + GIL 大锁示意、asyncio 时间线 —— 程序化绘制

### 3. mental-model
- ✓ 定义卡、心智模型管线、服务员类比图、并发 vs 并行双栏 —— 程序化绘制

### 4. when-to-use
- ✓ 场景卡、断言白话卡、A1B1 序列示意、编排步骤条 —— 程序化绘制

### 5. boundaries
- ✓ 三者对比表、收束大字卡 —— 程序化绘制

### 6. demo-lazy
- ✓ 模拟终端窗口（真实输出取自 article §Quick Start）、打包示意、never awaited 警示卡 —— 程序化绘制

### 7. single-thread
- ✓ 双泳道交错时间带、MainThread 断言卡、设计心得对照卡 —— 程序化绘制

### 8. real-concurrency
- ✓ 串行 vs 重叠时间条对比、create_task 流程示意 —— 程序化绘制

### 9. mechanism
- ✓ 三步拆解图、就绪队列 + 定时器堆示意、铁律卡 —— 程序化绘制

### 10. pitfalls
- ✓ 五张坑卡（现象 / 原因 / 解法三段式）—— 程序化绘制

### 11. closing
- ✓ API 速查表、收尾卡 —— 程序化绘制

> 无外部图片素材需求，无待提供素材（⚠️ 项：无）。
