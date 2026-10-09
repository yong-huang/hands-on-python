# Video Outline

> **主题**：`monochrome-print`（python 系列自 2026-09 起统一黑白印刷皮肤；Checkpoint Plan 可改）
> **总时长**：约 8 分 50 秒（口播 ~2650 字；估时按本仓库 PLAYBOOK 实测口径 5 字/秒，非 skill 默认 4 字/秒）
> **章节数**：8 章 / 56 步
> **时长说明**：比 thread-lifecycle（~7 分钟）长，主要长在开场地基拍与 live-demo 四节输出；是否压缩在 Checkpoint Plan 由用户裁定
> **拍-步映射**：script.md 共 51 拍（用户已逐拍修订定稿，2026-09-30）。1 拍 = 1 步为基准；5 个长拍各拆 2 步：拍 30（异常第三节）、拍 35（取舍与对号表）、拍 42（选后端与 G I L）、拍 49（Future 定义）、拍 50（何时不用）；拆分处 narrations 按脚本原文的连续切片切分，不改字、不换序
> **台词层/屏幕层**：口播与 narrations 用拆写形「as completed」「G I L」；屏幕与代码一律写原样 `as_completed` / `GIL`（PLAYBOOK 约定 19）。本 outline step 行里出现的「as completed」「G I L」均为指代该概念的口语写法，上屏时还原原样

---

## 1. hook — 片头：三口气与两个角色（10 steps · ~89s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 引用：「派活儿的代码，是照着线程池写死的。想换进程池比一比？业务代码跟着重写。」—— 来源 article 引言 L3
- 引用：「九个任务早跑完了，就差一个慢的——结果全被摁着，一起才出来。」—— 来源 article §Background L14（Pool.map 全批等齐）
- 引用：「worker 里明明炸了，报错却没了踪影。」—— 来源 article 引言 L6 / §Background L14
- 词义：并发＝让一堆活儿同时干；线程＝一个程序里再开几个干活小分队；进程＝多开几个程序一人一间屋子 —— 来源 script 拍 2 / article §Background L12
- 词义：池＝预先雇好一批、反复用 —— 来源 script 拍 3
- 定义：Executor 执行器管「怎么跑」，Future 欠条管「结果在哪」—— 来源 article 引言 L4-5
- 动词：submit＝提交、result＝取结果，后端（线程/进程）对业务代码透明 —— 来源 article §Background L16

**开发计划**：
- step 1 (~8s) — 片头标题页：主标「Future：一张结果欠条」+ 副标「concurrent.futures 统一执行器」+ 工程图签（hands-on-python · concurrency 07）
- step 2 (~14s) — 十秒地基：并发＝一堆活儿同时干；线程＝再开几个干活小分队；进程＝多开几个程序一人一间屋子
- step 3 (~8s) — 「池」定义卡：小分队和屋子预先雇好一批、反复用 + 转场语「写并发的人，多半咽过三口气」
- step 4 (~8s) — 第一口气引用卡：「派活儿的代码，是照着线程池写死的……」
- step 5 (~7s) — 第二口气引用卡：「九个任务早跑完了，就差一个慢的——」
- step 6 (~9s) — 第三口气引用卡：「worker 里明明炸了，报错却没了踪影。」+ 小注「worker＝池子里干活的工人」
- step 7 (~8s) — 病根卡：派活儿、收结果的整套安排（行话叫调度）焊死在业务代码里
- step 8 (~10s) — 两个角色分工卡：Executor 管怎么跑 / Future 管结果在哪
- step 9 (~11s) — 两个动词：submit＝提交、result＝取结果 + 小注「背后线程还是进程（后端），一概不问」
- step 10 (~6s) — 预告卡：「三个痛点，逐个演示」+「先补一分钟前情」

口播节选：
> 解法，是让两个角色分工。Executor，执行器，管「怎么跑」；Future，欠条，管「结果在哪」。

---

## 2. background — 两条老路与三堵墙（7 steps · ~70s）

**信息池**：
- 机制：threading 的 Thread 手动 start 点火、join 等待，生命周期全靠自己管 —— 来源 article §Background L12
- 机制：multiprocessing 的 Pool map 一次提交一批，只会整批收发 —— 来源 article §Background L12
- 病根：调度策略焊死在业务代码里，换后端要重写 —— 来源 article §Background L14
- 现象：Pool.map 全批等齐，快任务被慢任务拖住才一起返回 —— 来源 article §Background L14
- 现象：worker 异常要自己想办法打包带回主线程（主程序）—— 来源 article §Background L14-15
- 出处：PEP 3148 提出，Python 3.2 起进入标准库 —— 来源 article §Background L16

**开发计划**：
- step 1 (~5s) — 转场标语「统一执行器出现之前：Python 自带的两条老路」
- step 2 (~12s) — 路 A 卡：threading 的 Thread（线程原生写法）+ start 点火 / join 等待两个动作标注
- step 3 (~12s) — 路 B 卡：multiprocessing 的 Pool（进程池老一套用法）+ map 一次提交一批、整批收发
- step 4 (~10s) — 撞墙一：两条路形状不同（这套固定用法叫接口），代码长成各自形状，换后端＝推倒重来
- step 5 (~8s) — 撞墙二：时间条示意——map 全批等齐，快任务干等慢任务
- step 6 (~11s) — 撞墙三：worker 里炸的异常要自己打包寄回主程序（主线程）
- step 7 (~12s) — 收束卡：三堵墙 → PEP 3148 / Python 3.2 一次推倒，统一执行器进标准库

口播节选：
> 三堵墙立在那儿。直到 Python 3.2，官方通过一份改进提案，编号 PEP 3148，统一执行器进了标准库，三堵墙一次推倒。

---

## 3. mental-model — 一张欠条与一个取货口（6 steps · ~55s）

**信息池**：
- 心智模型：餐厅点餐呼叫器——submit 递小票（Future）、后厨开工、叫号取餐 —— 来源 article §What L28
- 能力：submit 立即返回不阻塞 / result(timeout=) 随时可等可走 / as completed 按完成序逐个给 —— 来源 article §What L24-26
- 取货口：result 是唯一出口——取值、收异常、带超时都走这一个方法 —— 来源 article §What L28 / §Quick Start L116
- 反例一：没人去取，做坏的餐没人收拾——不调 result，异常永远藏在 Future 里 —— 来源 article §What L30
- 反例二：小票不能让后厨停工——cancel 只对还没下锅的订单有效 —— 来源 article §What L30

**开发计划**：
- step 1 (~9s) — submit 卡：提交立刻返回，手里多一张欠条，后厨已经开工
- step 2 (~8s) — result 卡：欠条上唯一取货口——取结果、收异常、带超时都走它
- step 3 (~9s) — as completed 卡：按完成顺序放行，谁先干完谁先出来
- step 4 (~8s) — 餐厅取餐全景：submit 递小票 → 找位子刷手机 → 叫到号取餐走人
- step 5 (~13s) — 呼叫器的坑：没人取没人收拾；异常藏在欠条里，不吵不闹只是消失
- step 6 (~8s) — cancel 边界卡：只对还没下锅的订单有效，已经做上的撤不了

口播节选：
> 把它想象成餐厅取餐：submit 递你一张小票，你找位子刷手机；叫到号，取餐走人。

---

## 4. live-demo — 真机实验：四节输出逐一现形（10 steps · ~96s）

**信息池**：
- 命令：`python3 futures_executor.py`，四个小节 + 断言，约 3 秒，仅标准库 —— 来源 article §Quick Start L62-66
- 输出[1]：ThreadPoolExecutor 50 任务 0.000s；ProcessPoolExecutor 0.051s；两种后端结果完全一致 —— 来源 article L77-79
- 诚实预期：51ms 差值＝进程间 pickle 往返；CPU 大任务才赚回 —— 来源 article L105
- 输出[2]：提交 ['慢任务','中任务','快任务'] → 完成 ['快任务:0.1','中任务:0.2','慢任务:0.3'] —— 来源 article L84-85
- 输出[2]：wait(FIRST_COMPLETED) 先返回 1 个，其余继续跑 —— 来源 article L86-87
- 场景：同时挂几百个网页请求，谁先回来先处理谁 —— 来源 article §When to Use L38
- 输出[3]：ValueError('worker 里爆炸了') 两后端原样重现；进程池跨进程 pickle 传回 —— 来源 article L92-93
- 输出[4]：result(timeout=0.2) 在 205ms 抛 TimeoutError（内核调度粒度）；被放弃任务仍在后台跑完 —— 来源 article L99-100 / L107

**开发计划**：
- step 1 (~10s) — 模拟终端：命令 `python3 futures_executor.py` + 四个小节标题 + 小注「跑完自动核对 · 仅标准库 · 3 秒」
- step 2 (~9s) — 终端[1]：同一份业务代码先线程池再进程池，50 个任务两边对照
- step 3 (~12s) — 耗时对照条：线程池 ≈0 / 进程池 51ms + 快递费标注（同屋递纸条不要钱 vs 跨城寄包裹按趟收费）
- step 4 (~10s) — 运费何时赚回：大活儿（给几百万个数开方）多开几间屋一起算
- step 5 (~14s) — 终端[2]：提交序慢中快 → 完成序快中慢 + 场景注「同时挂几百个网页请求，谁先回来先处理谁」
- step 6 (~7s) — wait 卡：专等第一个完成，一出锅马上端走，其余继续跑
- step 7 (~9s) — 终端[3]：worker 里炸出 ValueError，留言「worker 里爆炸了」
- step 8 (~7s) — 传播对照：线程池 / 进程池两边都原样送到你面前；进程池那份跨进程打包寄回
- step 9 (~12s) — 终端[4]：result 限 0.2 秒 → 205 毫秒准时翻脸 + 小注「多出的几毫秒＝系统安排任务的最小时间单位」
- step 10 (~6s) — 边界金句卡：被放弃的任务没停，还在后台跑完——「翻脸的只是你，不是它」

口播节选：
> 第四节，超时：result 限 0.2 秒，205 毫秒准时翻脸——超时异常当场就抛。

---

## 5. mechanism — 拆开看：欠条、取舍与异常的规矩（8 steps · ~82s）

**信息池**：
- 机制：submit 不等执行完立刻返回 Future（结果欠条）；result() 阻塞到就绪 —— 来源 article §How It Works L126
- 事实：输出[1] 两种后端平方数逐项相等＝业务代码只接触 submit/result，后端差异被 Executor 挡在门外 —— 来源 article L128
- 对比：map 保序但全批等齐 vs as completed 完成即处理；怎么选看任务耗时差异 —— 来源 article L132 / L136
- 惯例：{future: tag} 字典把 future 映射回业务键（对号入座的标准做法）—— 来源 article L134
- 机制：异常被 Future 捕获暂存，只在 result() 被调用时抛出；只 submit 不取＝最常见静默 bug —— 来源 article L140
- 惯例：as_completed 统一取，或 add_done_callback（完工回调）检查 exception() —— 来源 article L142
- 边界：result(timeout=) 只是调用者停止等待，任务仍在跑（线程无法强杀，daemon 语义见 01 讲）—— 来源 article L148
- 边界：cancel 只能取消尚未开始的任务；shutdown(cancel_futures=True)（3.9+）或把超时做进任务内部 —— 来源 article L150-152

**开发计划**：
- step 1 (~11s) — 转场「四段现象，对应四个机制」+ 欠条机制卡：submit 立刻返回 Future，结果没好凭据先到
- step 2 (~13s) — map 对照卡：新执行器自带的 map 一样保序一样全批等齐；耗时差不多要按原序收 → map 省心
- step 3 (~5s) — 取舍卡：耗时差距大、要先完成的先处理 → submit 加 as completed
- step 4 (~8s) — 代价卡：完成顺序不一定是提交顺序 → 对号表示意（提交时建表，收结果查表入座）
- step 5 (~9s) — 异常规矩卡：异常被欠条捕获暂存，只在 result 被调用的那一刻抛出
- step 6 (~13s) — 行规两条卡：as completed 统一取 / 完工提醒（回调）活一干完自动查一遍有没有出错
- step 7 (~10s) — 边界卡：超时只是你先走任务照跑；cancel 只撤排队的，运行中的撤不了
- step 8 (~13s) — 「到点必须停」卡：退出开关做进任务里让任务自己看标志收工 + Python 3.9 起进程池收摊顺手取消正在排队的

口播节选：
> 异常的规矩就一条：worker 的异常被欠条捕获暂存，只在 result 被调用的那一刻抛出。

---

## 6. unify — 统一接口的落地与后端选择（4 steps · ~43s）

**信息池**：
- 落地：工厂字典——键是名字、值创建执行器（ThreadPoolExecutor / ProcessPoolExecutor 两个 lambda）；run_batch(make_executor) 对后端零感知 —— 来源 article L159-167
- 结论：切换成本从「重写调度代码」降到「换一个工厂」—— 来源 article L167
- 底线：Executor 统一接口但没改变底层模型，切换后端前仍要想清楚负载类型 —— 来源 article L50
- 规则：IO 密集 → 线程（等待时释放 GIL——全局解释器锁）；CPU 密集 → 进程（绕开 GIL）—— 来源 article L48
- 展望：全面对决见 14_model_benchmark —— 来源 article L50

**开发计划**：
- step 1 (~14s) — 落地卡：对照表（字典）——左边名字右边创建方法；干活的函数不知道背后是谁，换后端＝换右栏
- step 2 (~7s) — 插头电压卡：统一接口只是换了插头，电压没变——底下还是线程和进程两套模型
- step 3 (~12s) — 选后端：换后端前先看活儿是哪种；等字当头的活（等网页回话、等文件读完）＝IO 用线程，等待时会松开 G I L（Python 的全局解释器锁）
- step 4 (~10s) — G I L 卡：这把锁同一时刻只准一个线程干活；纯算的活用进程，一人一间屋绕开这把锁

口播节选：
> 统一接口怎么落地？做一张对照表——左边写名字，右边写各自的创建方法，这张表术语叫字典。

---

## 7. pitfalls — 五个真实踩过的坑（6 steps · ~60s）

**信息池**：
- 坑 1：只 submit 不取 result → 异常静默蒸发、任务白跑；Future 是异常的载体也是唯一出口 —— 来源 article §Pitfalls L175
- 坑 2：as_completed 里忘了 future→业务键映射 → 完成序乱后结果对不上号；解法提交时建 {future: tag} —— 来源 article §Pitfalls L176
- 坑 3：指望 cancel() 停运行中的任务 → 返回 False 照跑；解法协作式取消（Event 标志）或 shutdown(cancel_futures=True) —— 来源 article §Pitfalls L177
- 坑 4：进程池 submit 不可 pickle 对象（lambda、打开的文件）→ 打包当场报错；解法顶层函数 + 可序列化参数 —— 来源 article §Pitfalls L178
- 坑 5：线程池跑 CPU 密集又 max_workers=100 → 不升反降（GIL 下纯添乱）；解法线程数≈IO 等待比例、CPU 任务＝核数 —— 来源 article §Pitfalls L179

**开发计划**：
- step 1 (~3s) — 转场标语「五个真实踩过的坑」
- step 2 (~10s) — 坑 1 卡（现象＋解法）：只 submit 不取 result，异常静默蒸发；欠条是异常唯一的出口，不取就没有
- step 3 (~10s) — 坑 2 卡：as completed 忘了对号入座，完成的顺序一乱结果张冠李戴；提交时建好对号表
- step 4 (~8s) — 坑 3 卡：指望 cancel 停运行中的任务，它只回一句「撤不了」任务照跑
- step 5 (~15s) — 坑 4 卡：往进程池塞传不走的东西（lambda 随手写的临时小函数、打开着的文件）打包员当场报错；跨进程一切都要能打包，干这个活的叫 pickle
- step 6 (~14s) — 坑 5 卡：线程池跑计算还开一百个线程＝一百个人抢一把锤子；等待多的活线程多开些，计算多的活进程开到 CPU 核数就到顶

口播节选：
> 第五，线程池里跑计算，还开一百个线程——一百个人抢一把锤子，纯添乱。

---

## 8. qa-closing — 最后一问与收尾（5 steps · ~33s）

**信息池**：
- Q&A：Future 是什么——一张「结果欠条」，提交与获取解耦；submit 立即返回不阻塞，result() 随时取、可超时、异常原样重抛 —— 来源 article §Q&A L183-185
- 金句：把「等待」从业务的控制流里抽出来，变成可传递、可组合的对象 —— 来源 article §Q&A L185
- 何时不用：一两个后台任务用 threading.Thread；万级并发连接用 asyncio（单线程事件循环，见 08_coroutine_loop）—— 来源 article §When to Use L44-45
- 仓库：hands-on-python / concurrency / 07_futures，python3 直跑 —— 来源 article §Quick Start L64-66

**开发计划**：
- step 1 (~10s) — 定义卡：Future＝一张结果欠条——submit 立刻给凭据，result 随时来取，能超时、能收异常
- step 2 (~6s) — 金句卡：把「等待」从业务代码里抽出来，变成一件可以拿着走的物件
- step 3 (~5s) — 何时不用 ①：一两个后台小任务，直接 Thread 更省事
- step 4 (~9s) — 何时不用 ②：上万条连接同时处理用 asyncio——一个接待员转着圈同时招呼一屋子客人（事件循环）
- step 5 (~3s) — 收尾：完整代码的地址放在评论区 +「下期见」

口播节选：
> 它把「等待」从业务代码里抽出来，变成一件可以拿着走的物件。

---

## 素材清单

### 1. hook
- ✓ 标题页排版（主标 / 副标 / 工程图签）—— 程序化绘制
- ✓ 三口气引用卡、两角色分工卡 —— 程序化绘制

### 2. background
- ✓ 两条老路卡、时间条（全批等齐）、三堵墙收束卡 —— 程序化绘制

### 3. mental-model
- ✓ 欠条 / 取货口卡、餐厅取餐全景示意 —— 程序化绘制

### 4. live-demo
- ✓ 模拟终端窗口（真实输出文本取自 article §Quick Start）、耗时对照条 —— 程序化绘制

### 5. mechanism
- ✓ 欠条机制卡、map 对照卡、对号表示意、边界卡 —— 程序化绘制

### 6. unify
- ✓ 对照表（字典）卡、插头电压示意、G I L 大锁示意 —— 程序化绘制

### 7. pitfalls
- ✓ 五张坑卡片（现象 + 解法双栏）—— 程序化绘制

### 8. qa-closing
- ✓ 定义卡、金句卡、asyncio 接待员示意 —— 程序化绘制

> 无外部图片素材需求，无待提供素材（⚠️ 项：无）。
