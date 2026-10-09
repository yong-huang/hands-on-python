# Video Outline

> **主题**：`monochrome-print`（Checkpoint Plan 推荐默认——python 系列自 2026-09 起统一黑白印刷皮肤；用户可在对齐时改）
> **总时长**：约 7 分 15 秒（口播 ~2130 字；估时按本仓库 PLAYBOOK 实测口径 5 字/秒，非 skill 默认 4 字/秒）
> **章节数**：7 章 / 45 步
> **时长说明**：新手视角 review 要求术语首现即给白话解释，字数高于系列前作（~3-4 分钟）；是否压缩 / 拆集在 Checkpoint Plan 由用户裁定

---

## 1. hook — 片头：三个没答案的问题（8 steps · ~57s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 引用：「这个 bug，我怎么测都测不出来。」—— 来源 article 引言 L4
- 引用：「我启动的线程怎么还在主线程里跑」—— 来源 article 引言 L4-5
- 引用：「关机钩子怎么没执行」—— 来源 article 引言 L5
- 词义：daemon 即后台守护线程——进程退出时不等待它收尾的线程 —— 来源 article 引言 L5
- 词义：状态机——内部状态随固定事件转移的对象 —— 来源 article 引言 L6
- 输出：`RuntimeError: threads can only be started once` —— 来源 article L95
- 数据：daemon 只来得及打 5/20 条 —— 来源 article L117
- 数据：3 批出现 3 种不同排列 —— 来源 article L104

**开发计划**：
- step 1 (~4s) — 片头标题页：主标「线程的一生」+ 副标「三个不亲眼看过就会踩坑的运行时行为」+ 工程图签（hands-on-python · concurrency 01 · threading.Thread）
- step 2 (~6s) — 冷开场第一问：hero 引用卡「这个 bug，我怎么测都测不出来。」
- step 3 (~9s) — 第二问：hero 引用卡「我明明启动了线程，怎么代码还在主线程里跑？」+ 小注「主线程＝程序一启动自带的那条老线」
- step 4 (~7s) — 第三问：hero 引用卡「程序退出前该收的尾——比如把文件存好——怎么压根没做？」
- step 5 (~8s) — 三问收束为三行为清单（递进列表 1/3）：第 1 条「交错顺序没法复现——谁先谁后，操作系统说了算」
- step 6 (~6s) — 清单（递进列表 2/3）：第 2 条「run() 不开线程——你以为开了新线程，其实没有」
- step 7 (~9s) — 清单（递进列表 3/3）：第 3 条「daemon 说死就死」+ 副标「标记成『不用等它』的后台线程」
- step 8 (~8s) — 预告：线程三阶段示意「还没点火 / 正干着活 / 干完了」+ 标语「挨个演示给你看」

口播节选：
> 写多线程的人，多半说过这句话：「这个 bug，我怎么测都测不出来。」

---

## 2. background — 线程从哪来（6 steps · ~68s）

**信息池**：
- 案例：发 10 个请求就得串行等 10 轮，CPU 空转 —— 来源 article §Background L12
- 词义：并发——让程序在同一时间段内推进多件事 —— 来源 article §Background L12
- 词义：IPC 进程间通信——专门用于跨进程交换数据的机制 —— 来源 article §Background L14
- 词义：调度器——决定哪个线程何时上 CPU 运行的系统组件 —— 来源 article §Background L17-18
- 对比：多进程内存独立 vs 线程共享内存、数据天然可达 —— 来源 article §Background L14-16
- 案例：10 线程并发 10 请求，总耗时接近最慢的一个（而非相加）—— 来源 article §Background L20
- 边界：CPU 密集型计算受 GIL 限制应改用多进程；任务量小串行够快不值得并发 —— 来源 article §When to Use L64-65

**开发计划**：
- step 1 (~10s) — 标语「同一时刻只干一件事」+ 程序逐行执行的串行示意 + 小注「想同时干几件事，叫『并发』」
- step 2 (~8s) — I/O 干等场景：10 根串行等待时间条 + CPU 空转标注
- step 3 (~13s) — 多进程方案与撞墙：两个进程框各自圈住独立内存（小注「进程＝正在运行的程序」），中间「传话通道」标注开销
- step 4 (~14s) — 线程登场：同一程序里的多条「干活小分队」共享同一块内存；角落 mono 角标「调度器＝操作系统里的排班管理员」
- step 5 (~9s) — 收束对比：10 条等待时间条重叠成接近一根的长度 + 标语「谁先跑完，你说了不算」
- step 6 (~14s) — 边界卡：标语「纯计算，别用线程」+ GIL 全局大锁示意（小注「同一时刻只放一个线程真干活」）+ 出路「并行计算换多进程」

口播节选：
> 线程为此而生：在同一个程序里，再开几条干活的小分队。它们共用同一份内存，传数据不用绕路。

---

## 3. state-machine — 一枚烟花：Thread 状态机（8 steps · ~71s）

**信息池**：
- 定义：`threading.Thread` 是标准库最底层的线程接口，线程池以它为地基 —— 来源 article §What L29-30
- 心智模型原文：「Thread 对象是 start() 驱动的单次状态机——NEW → RUNNABLE → TERMINATED 走完即报废」—— 来源 article §What L32-34
- 类比：烟花——构造是摆设、start() 是点火、烧完报废、想再放只能换新 —— 来源 article §What L36
- 状态表：NEW/is_alive=False/构造未 start；RUNNABLE/True/调 start()；TERMINATED/False/run() 返回 —— 来源 article §What L40-44
- 词义：GIL 全局解释器锁——同一时刻只允许一个线程执行字节码 —— 来源 article §When to Use L64
- 事实：RUNNABLE 不等于正在 CPU 上跑，is_alive()=True 只说明没死 —— 来源 article §How It Works L172-175

**开发计划**：
- step 1 (~12s) — hero 代码名 `threading.Thread` + 副标「Python 自带、最底层的线程工具」+ 角标「线程池＝预先雇好一批反复用，底层都是它」
- step 2 (~13s) — 单行道主视觉：NEW → RUNNABLE → TERMINATED 三节点管线（还没点火 / 正干着活 / 干完报废）+ 小注「这种对象叫状态机」
- step 3 (~13s) — 烟花类比：静置 → 点火升空 → 熄灭废弃三态对应三状态；daemon 半空被掐灭的分支虚线
- step 4 (~5s) — 状态入口表（递进列表 1/3）：「创建完，没 start」→ NEW
- step 5 (~4s) — 入口表 2/3：「调 start()」→ RUNNABLE，前行灰化保留
- step 6 (~3s) — 入口表 3/3：「run() 跑完」→ TERMINATED，前两行灰化保留
- step 7 (~8s) — is_alive 验证卡：三状态旁 True / False 读数，RUNNABLE 独占 True
- step 8 (~13s) — 反直觉补刀：标语「RUNNABLE ≠ 正在 CPU 上跑」+ GIL 大锁下单线程过闸门示意 + 小注「True 只说明它没死」

口播节选：
> 把它想象成一枚烟花：构造出来只是个摆设，start() 是点火。烧完就报废，想再放，只能换新的。

---

## 4. live-demo — 真机实验：三个行为逐一现形（7 steps · ~78s）

**信息池**：
- 命令：`python3 thread_lifecycle.py`（完整演示，4 个小节，内置验收断言）—— 来源 article §Quick Start L82-84
- 输出：`t.run() → 函数体执行了，但线程是 MainThread（没有新线程！）`—— 来源 article L93
- 输出：`t.start() → 函数体跑在新线程 born-by-start 里`—— 来源 article L94
- 输出：`RuntimeError: threads can only be started once`—— 来源 article L95
- 输出：批次 0/1/2 三行交错序列互不相同 —— 来源 article L100-102
- 结论行：「3 批出现了 3 种不同的排列 → 线程间顺序不可预测」「每个线程自己内部的 t0→t1→t2 永远有序」—— 来源 article L104-105
- 数据：daemon 要打 20 条，主线程睡 0.3s，实际只打出 5/20 条，exit code = 0 —— 来源 article L111-118
- 诚实预期：交错排列每次运行都不同（本机 5 次全不同，断言只要求 ≥2）—— 来源 article L123

**开发计划**：
- step 1 (~10s) — 模拟终端窗口显示命令 `python3 thread_lifecycle.py` 与四个小节标题 + 小注「跑完自动帮你核对结果」
- step 2 (~11s) — 终端节选 [2. start() vs run()]：`t.run() → …MainThread（没有新线程！）`高亮
- step 3 (~11s) — 同终端续行：`t.start() → …新线程 born-by-start`高亮与上行对照 + 小注「born-by-start＝演示给新线程起的名字」
- step 4 (~9s) — 再 start() 触发 `RuntimeError: threads can only be started once`终端错误行 + 小注「想重跑，换新对象」
- step 5 (~10s) — 交错矩阵：4 线程 × 3 步 × 3 批的输出矩阵，三批排列互不相同
- step 6 (~12s) — 双带对照：「每个线程自己 —— t0→t1→t2 永远有序」（4 行）+「线程之间 —— 相对先后每次不同」（两次运行的真实交错序列）+ 结论「行内有序，行间无序 —— 你的序列一定和我不一样」
- step 7 (~15s) — daemon 截断：20 格进度只填 5 格即停在半格 + 终端行「主线程退出！exit code = 0」+ 小注「系统眼里它『正常结束』」

口播节选：
> 3 批出现 3 种不同排列——线程之间，顺序不可预测。

---

## 5. mechanism — 拆开看：start / join / daemon 的真实语义（7 steps · ~69s）

**信息池**：
- 机制：start() 做两件事——请 OS 创建真正的线程 + 在新线程里回调 run()；直接调 t.run() 是当前线程的普通方法调用 —— 来源 article §How It Works L160
- 推论：对已死线程 join() 立即返回；join(timeout) 超时不杀目标线程，只是调用者不等了 —— 来源 article §How It Works L164
- 机制：主函数 return 时解释器对全部非 daemon 线程做隐式 join（threading._shutdown）—— 来源 article §How It Works L166
- 规则：daemon=True 必须在 start() 之前设置；强杀无清理机会，「写到一半的文件停在半个字节上」—— 来源 article §How It Works L168
- 边界：心跳 / 监控打点 / 缓存刷新适合 daemon；带落盘语义的收尾不适合 —— 来源 article §How It Works L170
- 词义：阻塞——调用者原地停住直到目标线程终止 —— 来源 article §How It Works L164 语义

**开发计划**：
- step 1 (~8s) — start() 内部两步流程：请求 OS 建线程 → 新线程里跑 run()（标语「先回到那个一字之差」）
- step 2 (~8s) — run() 直调对照：单步普通方法调用，执行者标注分叉（start＝新线程 / run＝你自己）
- step 3 (~9s) — join() 语义：调用者「我等你跑完再走」+ 代码原地停住的阻塞标注
- step 4 (~8s) — join 两个推论卡：对已死线程立即返回 / 超时到点只是「你不等了」，对方照跑不被杀
- step 5 (~10s) — 隐式 join 兜底：程序退出前 Python 自动等全部普通线程 + 对照「daemon 没这个待遇」
- step 6 (~13s) — daemon 强杀时刻：主线程时间线走到头，daemon 输出拦腰截断停在半格 + mono 角标「daemon=True 要在 start() 之前设」
- step 7 (~13s) — 分界线两栏：能交给 daemon（报平安 / 记监控数字）vs 一概不行（写硬盘 / 写数据库）

口播节选：
> start() 做两件事：请操作系统创建真正的线程，再在新线程里跑 run()。

---

## 6. pitfalls — 证据采集与四个坑（6 steps · ~60s）

**信息池**：
- 证据法：list.append 在 GIL 下是单字节码原子操作（原子＝不会被线程切换打断的执行单元）；print 受行缓冲影响顺序不可信 —— 来源 article §How It Works L180-187
- 坑 1：手动 run() 后对同对象 start() → 新线程 AttributeError；run() 的 finally 会删掉 _target/_args/_kwargs（CPython 3.13 实测）—— 来源 article §Pitfalls L197
- 坑 2：print 顺序当证据 → 行缓冲 + 输出撕裂，两头顺序都不可信 —— 来源 article §Pitfalls L198
- 坑 3：daemon 里落盘/提交事务 → 强杀不等待不通知，半截数据比没数据糟 —— 来源 article §Pitfalls L199
- 坑 4：start() 后再设 daemon → RuntimeError，状态机离开 NEW 属性冻结 —— 来源 article §Pitfalls L200

**开发计划**：
- step 1 (~12s) — 证据采集对照：events 列表 append「一口气做完、中间插不进手」+ 小注「专业说法：原子操作」
- step 2 (~9s) — print 行缓冲示意：攒够一整行才吐出 + 标语「你看到的打印顺序，可能是假的」
- step 3 (~8s) — 坑 1 卡片（现象）：代码两行对照 t.run() 后 t.start() + 终端 AttributeError 错误行
- step 4 (~8s) — 坑 1 卡片（原因）：对象里「要干的活」被手动 run 清掉、再 start 找不到活的示意
- step 5 (~13s) — 坑 2 / 坑 3 双卡对照：print 两头都不可信（收集数据用 queue.Queue）/ daemon 写文件半截数据
- step 6 (~10s) — 坑 4 卡片：状态机 NEW 节点外属性冻结 + RuntimeError 提示「设置要赶在 start() 之前」

口播节选：
> append 这一下「一口气做完、中间插不进手」，专业说法叫原子操作——记下的顺序可信，也不丢。

---

## 7. qa-closing — 最后一问与收尾（3 steps · ~29s）

**信息池**：
- Q&A：append 不会坏（单字节码原子）；counter += 1 会丢更新——拆成 LOAD/ADD/STORE 多步可被切换 —— 来源 article §Q&A L207-211
- 词义：竞态——更新被悄悄丢掉的现象，02_race_gil 实测丢失率与 dis 字节码 —— 来源 article §Q&A L211-212
- 仓库：hands-on-python / concurrency / 01_thread_lifecycle，python3 直跑 —— 来源 article §Quick Start L82-84

**开发计划**：
- step 1 (~11s) — 双栏对照演示：list.append 一次只写一格、写完不再变化 vs counter += 1 读-加-写三格中间被切换、数字丢失
- step 2 (~10s) — 命名卡：标语「更新被悄悄丢掉，这叫竞态」+ 预告「下一讲实测它能丢多少」
- step 3 (~8s) — 收尾：仓库路径 hands-on-python · concurrency/01 + 标语「python3 一跑就有体感」+「下期见」

口播节选：
> counter += 1 会丢更新——它拆成读、加、写三步，中间可以被切换。这就是竞态的最小样本。

---

## 素材清单

### 1. hook
- ✓ 标题页排版（主标 / 副标 / 工程图签）—— 程序化绘制
- ✓ 三问引用卡 —— 程序化绘制

### 2. background
- ✓ 串行 / 并发对比示意、时间条、进程内存框、传话通道、GIL 大锁 —— 程序化绘制

### 3. state-machine
- ✓ 状态机管线、烟花三态、状态表、is_alive 读数卡 —— 程序化绘制

### 4. live-demo
- ✓ 模拟终端窗口（真实输出文本取自 article §Quick Start）、交错矩阵、daemon 进度格 —— 程序化绘制

### 5. mechanism
- ✓ start 两步流程图、join 等待箭头、daemon 强杀时间线、分界线两栏 —— 程序化绘制

### 6. pitfalls
- ✓ append / print 对照、坑卡片、属性冻结示意 —— 程序化绘制

### 7. qa-closing
- ✓ append vs counter += 1 双栏对照、竞态命名卡 —— 程序化绘制

> 无外部图片素材需求，无待提供素材（⚠️ 项：无）。
