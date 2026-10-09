# Video Outline

> **主题**：`monochrome-print`（Checkpoint Plan 推荐默认——python 系列自 2026-09 起统一黑白印刷皮肤；用户可在对齐时改）
> **总时长**：约 7 分 30 秒（口播 ~2252 字；估时按本仓库 PLAYBOOK 实测口径 5 字/秒，非 skill 默认 4 字/秒）
> **章节数**：8 章 / 53 步
> **时长说明**：与 thread-lifecycle（7'15"/45 步）体量对齐；§5 mechanism 为全片最密章（58s），与模板 live-demo（78s）同级别的合理超配

---

## 1. hook — 片头：一场没有报错的挂起（8 steps · ~53s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 引用（口播开场自创告警词，非 article 原文）：「服务还活着，也不报错，就是永远不返回。」；article 同义依据：唯一的症状是「怎么还不返回」—— 来源 script 开场 + article §Background L10
- 三症状：不报错、不退出、只挂起；日志安静、CPU 空闲、进程健康 —— 来源 article §Background L10
- 论断：现场无法事后获取，挂起时没人知道每个线程停在哪一行 —— 来源 article §Background L12
- 论断：缺陷概率性——竞争窗口小，调度器不一定命中 —— 来源 article §Background L12
- 四步链：复现 → 取证 → 修复 → 回归 —— 来源 article §Background L14
- 引用：死锁人人背得出四个条件，亲手"造一个、抓一个、修一个"完全不同 —— 来源 article 引言 L3-4

**开发计划**：
- step 1 (~6s) — 片头标题页：主标「死锁」+ 副标「复现、取证、修复——死锁诊断工坊」+ 工程图签（hands-on-python · concurrency 12 · deadlock_workshop.py）
- step 2 (~8s) — 冷开场 hero 引用卡：「服务还活着，也不报错，就是永远不返回。」+ 小注「一条没有错误码的告警」
- step 3 (~5s) — 监控面板三读数：CPU 空闲 / 进程健康 / 日志零新增
- step 4 (~3s) — 重启循环时间轴：重启 → 满血复活 → 过两天又挂
- step 5 (~5s) — 标语三连卡：不报错 / 不退出 / 只挂起
- step 6 (~8s) — 现场缺失示意：挂起时刻每个线程「停在哪一行」的问号悬空 + 小注「日志里不会有」
- step 7 (~10s) — 概率性示意：窄竞争窗口 vs 调度器落点，偶尔命中一次 + 小注「之后再想复现，怎么也撞不上」
- step 8 (~7s) — 路线图：复现 → 取证 → 修复 → 回归 四节点管线 + 标语「一步都不能少」

口播节选：
> 这就是死锁最不讲道理的地方：不报错，不退出，只挂起。

---

## 2. background — 老三招失灵与适用边界（9 steps · ~73s）

**信息池**：
- 判词：加日志重跑——死锁时日志是安静的 —— 来源 article §Background L10
- 判词：加日志 / 重启仅适用于普通逻辑 bug —— 来源 article §When to Use L53
- 四步链全文：概率复现变必然 → 定时拍线程栈的记录仪 → 全局锁顺序拆循环等待 → 守护超时回归验证 —— 来源 article §Background L14
- 词义：守护超时（watchdog timeout）——给每次执行设超时上限，超时判失败强制收尾 —— 来源 article §Background L14
- 前置：纯标准库（faulthandler / subprocess 均内置），零第三方依赖 —— 来源 article §Quick Start L57
- 信号：程序会挂起且 CPU 空闲；多把锁存在嵌套获取 —— 来源 article §When to Use L38
- 边界：纯 asyncio 卡住通常是忘了 await 或协程循环等待，排查手段不同 —— 来源 article §When to Use L46
- 边界：跨进程跨主机的分布式死锁，faulthandler 只看得到本进程线程 —— 来源 article §When to Use L46
- 工具表：py-spy 任意时刻 attach 看栈（生产临时排查、无法预埋时选它）—— 来源 article §When to Use L51
- 工具表：threading.enumerate() 看活着谁 —— 来源 article §How It Works L120

**开发计划**：
- step 1 (~10s) — 老三招总起横幅 + 第一招卡「加日志重跑」亮起 + 判词「死锁的时候，日志是安静的」
- step 2 (~5s) — 第二招卡「对着代码猜」+ 判词「缺的不是猜测，是现场」
- step 3 (~4s) — 第三招卡「重启了事」+ 判词「治好这一次，治不了下次」
- step 4 (~10s) — 对比收束卡：标语「老三招靠不住，靠得住的是流程」+ 四步链管线复现 + 角标「stdlib only · faulthandler / subprocess 内置 · 0 第三方依赖」
- step 5 (~6s) — 问句「什么时候轮到这套流程？」+ 信号一 tile「挂起 + CPU 空闲」
- step 6 (~5s) — 信号二 tile「多把锁：一把还没放，又去拿另一把」，信号一灰化保留
- step 7 (~6s) — 边界卡 1：只有一把锁 → 循环等待凑不成
- step 8 (~11s) — 边界卡 2+3：纯 asyncio（忘了 await，思路不同）/ 分布式死锁（本进程工具看不见，换分布式追踪）
- step 9 (~13s) — 备选工具卡：py-spy 随时附身看栈 + threading.enumerate 看活着谁

口播节选：
> 排查「程序卡住」的老三招，在死锁面前全部失灵。

---

## 3. model — 死锁是什么：最小交叉模型（7 steps · ~52s）

**信息池**：
- 定义：一组线程互相持有对方要的锁、又都在等对方的锁，谁也无法推进 —— 来源 article §What L20
- 最小模型：T1 持 A 要 B、T2 持 B 要 A，两条「等待中…」谁也不返回 —— 来源 article §What L20
- 论断：循环等待成立，死锁即成 —— 来源 article §What L20
- 类比原文：两个迎面相遇的人各让一步、又恰好挡住对方 —— 来源 article §What L24
- 论断：线程没有「嘴」，不会协商，永远等下去直到外部介入 —— 来源 article §What L24
- 诊断思路：不是「劝和」，是拍下现场、拆掉结构 —— 来源 article §What L24
- 修复：全局约定先 A 后 B，T2 的第二条 acquire 永远排在 B 之后，交叉消失 —— 来源 article §What L22

**开发计划**：
- step 1 (~10s) — 定义卡：互持互等互卡死的关系网（两组「持有→等待」箭头互相咬合）
- step 2 (~7s) — 最小模型双线程图：T1 拿 A 等 B / T2 拿 B 等 A，两条等待线交叉
- step 3 (~6s) — 等待圈闭合：两个「等待中…」连成环 + 标语「循环等待一成立，死锁就成立」
- step 4 (~7s) — 走廊类比场景：两人迎面相让又互相挡住
- step 5 (~7s) — 「线程没有嘴」：不会协商、永远等、直到外部介入（对比人能开口）
- step 6 (~5s) — 诊断思路两件事：拍下现场 / 拆掉结构
- step 7 (~10s) — 修复只改一处：全局先 A 后 B，T2 第二次拿锁排到 B 后，交叉解开

口播节选：
> 人可以开口协商，线程没有嘴。没人让步，就永远等下去，直到外部介入。

---

## 4. live-demo — 真机实验：复现与取证（8 steps · ~70s）

**信息池**：
- 命令：`python3 deadlock_workshop.py`（复现 + 取证 + 修复，约 20 秒）—— 来源 article §Quick Start L60-62
- 前置：纯标准库，会真的挂起一个子进程再击杀取证 —— 来源 article §Quick Start L57
- 手法：两次 acquire 之间 `sleep(0.01)` 放大竞争窗口 —— 来源 article §Quick Start L95
- 诚实预期：死锁 100% 稳定复现（本机 3 次实测）—— 来源 article §Quick Start L93-95
- 输出：`faulthandler 在 3 秒时 dump 了全部线程栈` —— 来源 article §Quick Start L70
- dump 关键两行：`File ".../deadlock_workshop.py", line 39 / line 44 in transfer_bad` —— 来源 article §Quick Start L88-89
- 小注：两行先后次序可能随调度互换，以行号为准；完整现场在 /tmp/_deadlock_dump.txt —— 来源 article §Quick Start L85-90
- 输出：诊断结论「两个线程分别持有 A/B 并等待对方持有的锁 → 循环等待 → 死锁」—— 来源 article §Quick Start L74
- 输出：§2「100 轮全部正常退出（0.3s）——统一锁序消灭循环等待」—— 来源 article §Quick Start L80
- 输出：兜底三件套 `acquire(timeout=)` / 守护超时 / faulthandler 现场 —— 来源 article §Quick Start L82
- 细节：§1 stdout 中过长路径行被截断到 76 字符；结尾「全部断言通过」横幅略 —— 来源 article §Quick Start L64

**开发计划**：
- step 1 (~8s) — 模拟终端窗口：命令 `python3 deadlock_workshop.py` + 小注「约 20 秒 / 真的挂起一个子进程再击杀取证」
- step 2 (~7s) — 第一幕复现：代码两行 acquire 之间 sleep(0.01) 高亮 + 「窗口放大到调度器必然命中」
- step 3 (~5s) — 读数卡：死锁 100% 稳定复现 + 小注「本机连跑三次，次次如此」
- step 4 (~9s) — faulthandler 3 秒倒计时到点拍栈 + 小注「标准库自带的行车记录仪，事先埋好」
- step 5 (~12s) — dump 两行 File line 39 / line 44 in transfer_bad 并排对照高亮 + 小注「次序可能互换，以行号为准」
- step 6 (~9s) — 诊断结论行：互持互等 → 循环等待 → 死锁成立
- step 7 (~7s) — 第二幕修复：100 轮计数器跑满全部正常退出 + 0.3s 读数
- step 8 (~11s) — 兜底三件套：acquire 超时 / 守护超时 / faulthandler 现场 + 小注「防不住时，至少挂起能被发现」

口播节选：
> 行号不同，就是两个线程交叉等待的实锤。

---

## 5. mechanism — 拆开看：四条件、锁序与行车记录仪（5 steps · ~59s）

**信息池**：
- 四条件：互斥、持有并等待、不可剥夺、循环等待，四个同时成立才死锁 —— 来源 article §How It Works L108
- 论断：工程上唯一能安全拆除的就是循环等待 —— 来源 article §How It Works L108
- 实现：transfer_good 无论业务方向如何都先 LOCK_A 再 LOCK_B，反序调用方只是「业务上反了」—— 来源 article §How It Works L110
- 机制：`faulthandler.dump_traceback_later(3, file=stderr)` 起看门狗线程，3 秒后写所有线程的 Python 栈，进程挂起也能写 —— 来源 article §How It Works L114
- 词义：GIL 全局解释器锁——CPython 中同一时刻仅一个线程执行字节码；阻塞等锁的线程会让出持有权 —— 来源 article §How It Works L116
- 类比原文：行车记录仪平时不碍事，出事留下完整影像；区别是按预设时间拍快照、不识别事件 —— 来源 article §How It Works L118
- 推论：要靠窗口工程保证「3 秒到点时死锁已发生」—— 来源 article §How It Works L118

**开发计划**：
- step 1 (~10s) — 死锁四条件四 tile + 循环等待高亮 + 标语「四个同时成立，才死锁」
- step 2 (~15s) — 全局锁序管线：所有线程同序拿锁交叉消失 + 对策卡「少用多锁：临界区合并成一把锁」（口播白话：只用一把锁，全归它管）
- step 3 (~10s) — faulthandler 原理：dump_traceback_later(3) 看门狗线程到点写栈（挂起进程也能写）
- step 4 (~11s) — GIL 闸门示意：阻塞等锁的线程已让出 GIL，所以挂着也能写
- step 5 (~14s) — 记录仪对比卡：行车记录仪留完整影像 vs faulthandler 定时快照不识别事件 → 窗口工程保证到点已死锁

口播节选：
> 记录仪出事留下完整影像，它只按预设时间拍快照，不认得「出事了」。

---

## 6. defense-lines — 修完之后：两道保险与核心代码（3 steps · ~30s）

**信息池**：
- 三道防线全文：预防（统一锁序治本 / 少用多锁合并临界区）、检测（acquire(timeout=0.5) 报警 + faulthandler dump 找对手）、兜底（守护超时 future.result(timeout=)）—— 来源 article §How It Works L124-126
- 细节：被放弃的线程还挂着，进程退出时会等它 —— 来源 article §How It Works L126
- 核心代码：`subprocess.Popen([sys.executable, __file__, "--deadlock-child"], stderr=open(dump_path,"w"))` + `time.sleep(5)` + `p.kill(); p.wait()` + 读 dump —— 来源 article §How It Works L131-136
- 论断：死锁进程本来就救不活，直接击杀；演示故障要给「故障现场」留好退路 —— 来源 article §How It Works L134/L140

**开发计划**：
- step 1 (~8s) — 防线阶梯：锁序（已讲，灰化垫底）→ 检测卡「拿锁设超时，永久挂起降级成可发现的失败」
- step 2 (~11s) — 兜底卡「守护超时：挂起总能被发现」+ 警示小注「被放弃的线程还挂着，进程退出时会等它」
- step 3 (~11s) — 核心代码卡：Popen 子进程 + 睡 5 秒 + 击杀 + 读 dump 取证 + 标语「给故障现场留好退路」

口播节选：
> 演示故障，要给故障现场留好退路。

---

## 7. pitfalls — 四个踩过的坑（8 steps · ~69s）

**信息池**：
- 坑 1 全文：死锁线程放主进程 → 脚本永远退不出（实测挂死 90 秒）→ 挂死 worker 是非 daemon 线程，`shutdown(wait=True)` 永远等它 → 演示、测试必须子进程隔离 —— 来源 article §Pitfalls L146 / §How It Works L138
- 词义：daemon 线程进程退出时不被等待；非 daemon 必须等它结束 —— 来源 article §How It Works L138
- 坑 2 全文：复现靠碰运气 → 死锁时有时无测试红绿随机 → 竞争窗口太小 → sleep 放大窗口把概率变必然 —— 来源 article §Pitfalls L147
- 坑 3 全文：断言字符串抄文档 → dump 正常断言失败 → 实际输出 `Timeout (0:00:03)!` 而非想当然的 `Timeout (3 seconds)` → 断言以实测为准，第一版就栽在这 —— 来源 article §Pitfalls L148
- 坑 4 全文：修复只改一处却不回归 → 「看起来修了」上线偶发复发 → 连跑 100 次守护超时循环 —— 来源 article §Pitfalls L149

**开发计划**：
- step 1 (~4s) — 四坑预告横幅：现象 → 原因 → 解法 三段式卡式
- step 2 (~9s) — 坑一（现象）：第一版把死锁演在自己进程里，挂的就是自己——脚本永远退不出 + 90 秒挂死计时 + 小注「主进程演＝挂自己 / 子进程演＝挂完还能取证」
- step 3 (~14s) — 坑一（原因+解法）：非 daemon 线程被 shutdown(wait=True) 永远等 → 一律子进程隔离
- step 4 (~12s) — 坑二：红绿随机的测试 + 窗口太小 → sleep 放大把概率变必然
- step 5 (~6s) — 坑三（现象）：dump 正常、断言一直失败的对照
- step 6 (~9s) — 坑三（实锤+解法）：实测输出 `Timeout (0:00:03)!` vs 抄文档写法 → 断言以实测为准
- step 7 (~6s) — 坑四（现象）：「看起来修了」→ 上线偶发复发
- step 8 (~9s) — 坑四（解法）：100 次守护超时循环跑满 + 标语「看起来修了，和 100 次都过，是两回事」

口播节选：
> 实际输出是 Timeout (0:00:03)!，不是想当然的那种写法。

---

## 8. qa-closing — 三问收尾（5 steps · ~46s）

**信息池**：
- Q1：给锁编号（按资源层级）、封装统一「多锁获取函数」内部 `sorted` 后依次 acquire、代码评审检查反序 —— 来源 article §Q&A L152
- Q1 同理：数据库行锁、两把 mutex 嵌套 —— 来源 article §Q&A L152
- Q2：acquire(timeout=) 不能防只能检测——超时可能是死锁也可能是慢，抛错/告警把永久挂起降级为可发现的失败；防死锁还是锁序 —— 来源 article §Q&A L154-155
- Q3：try/finally 保证异常路径也放锁（「持有并等待」不变「永久持有」），但防不了循环等待——不同层面的卫生 —— 来源 article §Q&A L157-158
- 仓库：hands-on-python / concurrency / 12_deadlock_workshop，`python3 deadlock_workshop.py` 直跑约 20 秒 —— 来源 article §Quick Start L60-62

**开发计划**：
- step 1 (~10s) — Q1 卡：锁编号 + 统一多锁获取函数（内部按编号排序依次拿）
- step 2 (~6s) — Q1 补刀：代码评审盯反序 + 小注「数据库行锁、嵌套 mutex 同理」
- step 3 (~11s) — Q2 卡：acquire 超时只能检测不能防 → 真正防死锁还是锁序
- step 4 (~14s) — Q3 卡：try/finally 防永久持有、不防循环等待（放不放锁 ≠ 按什么顺序拿）
- step 5 (~7s) — 收尾：仓库路径 hands-on-python · concurrency/12 + 标语「python3 一跑就有体感」+「下期见」

口播节选：
> 真正防死锁，还是锁序。

---

## 素材清单

### 1. hook
- ✓ 标题页排版（主标 / 副标 / 工程图签）—— 程序化绘制
- ✓ 引用卡 / 监控读数 / 重启时间轴 / 窗口示意 / 四节点路线图 —— 程序化绘制

### 2. background
- ✓ 老三招卡片、四步链管线、信号 tile、边界卡、工具卡 —— 程序化绘制

### 3. model
- ✓ 互持互等关系网、双线程交叉图、等待圈、走廊类比、锁序修复示意 —— 程序化绘制

### 4. live-demo
- ✓ 模拟终端窗口（真实输出文本取自 article §Quick Start）、倒计时、dump 两行对照、100 轮计数器 —— 程序化绘制

### 5. mechanism
- ✓ 四条件 tile、锁序管线、看门狗线程写栈、GIL 闸门、记录仪对比卡 —— 程序化绘制

### 6. defense-lines
- ✓ 防线阶梯、兜底警示卡、核心代码卡 —— 程序化绘制

### 7. pitfalls
- ✓ 90 秒计时器、红绿随机测试、断言对照、100 次循环跑满 —— 程序化绘制

### 8. qa-closing
- ✓ Q1/Q2/Q3 卡片、仓库路径收尾页 —— 程序化绘制

> 无外部图片素材需求，无待提供素材（⚠️ 项：无）。
