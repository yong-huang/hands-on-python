# Video Outline

> **主题**：`monochrome-print`（python-concurrency 系列统一黑白印刷皮肤，系列既定，不再另选）
> **总时长**：约 7 分半（口播 ~2600 字；按 PLAYBOOK 实测口径 5 字/秒，mytts zm_009 含停顿）
> **章节数**：8 章 / 49 步
> **script**：32 拍（用户已 review 定稿）；step 划分 = 拍 × 1~2，最终以各章 narrations.ts 为准

---

## 1. hook — 片头：挂出去的任务，谁管死活（8 steps · ~52s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 输出：`Task was destroyed but it is pending` 程序退出时的警告 —— 来源 article §Background L11
- 案例：并发请求 10 个 URL，第 3 个抛异常，异常安静留在 Task 对象里，主流程白耗几秒 —— 来源 article §Background L11
- 词义：create_task 把协程提交给事件循环执行，返回 Task 句柄；协程 = async def 定义、能在 await 点暂停恢复的函数；事件循环 = 单线程里调度切换任务的引擎 —— 来源 article §Background L9
- 三坑：失败静默 / 卡死无人取消 / 退出留孤儿，同源 = 任务的生命周期没人负责 —— 来源 article §Background L13
- 数据：实测 1 秒的任务在 102ms 内被叫停且清理干净 —— 来源 article 引言 L3-5
- 定义：任务编排 = 对一组并发任务的启动、失败、取消与结果收集做统一管理 —— 来源 article §What L19

**开发计划**：
- step 1 (~6s) — 片头标题页：主标「任务编排」+ 副标「挂出去的并发任务，谁来管它们的生死」+ 工程图签（hands-on-python · concurrency 09 · asyncio）
- step 2 (~12s) — 背景一句：create_task 把任务挂上事件循环（任务挂上循环同时开跑的示意）+ 问题「万一跑丢了一个，怎么办？」
- step 3 (~9s) — 糟心的事：10 个网址并发、第 3 个抛异常（跑到一半报错）、其余 9 个干等白耗几秒（串行等待时间条示意）
- step 4 (~7s) — 错误去向：异常安静躺在任务对象里，程序看不出来、日志什么都没有
- step 5 (~4s) — 三坑清单（递进列表 1/3）：失败静默——出了错，没人知道
- step 6 (~4s) — 三坑清单（2/3）：卡死无人取消——一个任务卡住，没人叫停（前行灰化保留）
- step 7 (~4s) — 三坑清单（3/3）：退出留孤儿——任务被销毁了可它还没跑完 + `Task was destroyed` 警告条（前两行灰化保留）
- step 8 (~6s) — 收束大字：三个坑同一个根——「任务的生命周期，没人负责」

口播节选：
> 并发请求 10 个网址，第 3 个抛了异常——也就是跑到一半报错了。剩下 9 个还没返回，程序就那么干等，白白浪费好几秒。

---

## 2. solution — 解法：结构化并发与 TaskGroup（5 steps · ~68s）

**信息池**：
- 定义：结构化并发 = 把并发任务的生命周期限制在创建它的代码块内，像函数调用一样有进必有出 —— 来源 article §Background L15
- 版本：Python 3.11 把结构化并发落地进标准库，配套引入能一次携带多个异常的 ExceptionGroup —— 来源 article §Background L15
- 定义：TaskGroup = 3.11 引入的结构化并发容器，`async with` 块结束时块内任务要么全部完成、要么全部取消 —— 来源 article §What L21
- 规则：任一子任务抛异常，其余任务立刻收到取消信号（以 CancelledError 形式），所有异常打包成 ExceptionGroup 在出口上抛 —— 来源 article §What L23
- 类比：登山向导——任何人失足立刻吹哨、全队停下清点撤离、撤离后交完整报告；吹哨生效靠队员配合，吞掉取消信号的队员让全队干等 —— 来源 article §What L25
- 数据：实测 1 秒任务 102ms 被叫停、finally 清理执行 —— 来源 article 引言 L3-5 / §Quick Start L67-70

**开发计划**：
- step 1 (~15s) — 解法命名卡：结构化并发「有进必有出」（函数调用进出场对照示意）+ 3.11 收进官方工具箱 + 小注「ExceptionGroup 异常组：一个异常里能装下好多异常」
- step 2 (~10s) — 三主角卡按口播先后亮：核心 TaskGroup（任务组，同生共死）→ wait_for（超时兜底）→ gather（批量收结果）
- step 3 (~11s) — TaskGroup 写法：async with 块示意（小注「语法不展开，记住『块』就行」），块结束必然收场——全成 / 全取消两个出口，标语「不存在孤儿」
- step 4 (~13s) — 连带责任制（五个字，hero）：一个任务爆 → 其余立刻收取消信号（小注「那是一个专门的报错」）→ 异常打包成异常组在块出口统一上抛（传播示意）
- step 5 (~19s) — 登山向导类比连播：队伍行进 → 一人失足 → 吹哨全队停 → 清点撤离 → 交报告（每人状况写在异常组里）；分支注记「吞掉取消信号装死 = 全队陪他干等」

口播节选：
> 想象一位登山向导。队里任何人失足，向导立刻吹哨：全队就地停下，清点人数，一起撤离。

---

## 3. when-to-use — 局部工具与选型（9 steps · ~70s）

**信息池**：
- 定义：wait_for / asyncio.timeout 给单个操作加超时兜底，到点取消子协程抛 TimeoutError —— 来源 article §What L31
- 定义：gather 批量收集多个协程结果，return_exceptions=True 异常当结果收齐；默认首败即抛、其余任务继续跑 —— 来源 article §What L32
- 判断主线：任务间关联强度——一损俱损 TaskGroup / 彼此独立 gather / 单个外部调用怕慢 wait_for —— 来源 article §When to Use L36
- 场景：事务型扇出——下单同时调库存、支付、风控，一个失败整个放弃 —— 来源 article §When to Use L40
- 场景：给慢依赖加 deadline——wait_for 设 0.5 秒保证拖不垮主链路 —— 来源 article §When to Use L41
- 场景：聚合型抓取——100 个页面建索引，个别失败可接受，成功先落库 —— 来源 article §When to Use L42
- 何时不用：只有两三个顺序步骤直接顺序写 / 任务毫无关联裸 create_task 自兜三坑 / CPU 密集考虑进程池 —— 来源 article §When to Use L44

**开发计划**：
- step 1 (~11s) — wait_for 卡：给单个调用设时限 0.2 秒，到点里面的协程被取消、抛超时异常；主流程不被时快时慢的外部接口拖垮
- step 2 (~9s) — gather 卡：一批任务的返回值收进一个列表；两种收集策略，差别很大待会儿细讲
- step 3 (~8s) — 判断主线：任务之间的关联强度——一损俱损 / 彼此独立 / 单个怕慢，三条线分别指向三个工具
- step 4 (~7s) — 场景 1/3 下单：同时调库存、支付、风控，一个失败整个请求放弃——TaskGroup 的地盘
- step 5 (~7s) — 场景 2/3 慢接口：wait_for 设半秒时限，拖不垮整体
- step 6 (~7s) — 场景 3/3 抓 100 个页面：gather 打开容错开关——允许个别出错不影响收其他的，成功先存进数据库
- step 7 (~7s) — 别用 1/3：就两三步、没有并发——直接顺序写，别折腾
- step 8 (~7s) — 别用 2/3：任务毫无关联——不加管理直接 create_task + 自己的异常处理，但三个坑得自己兜
- step 9 (~7s) — 别用 3/3：纯计算（批量压缩图片）——asyncio 帮不上忙，多个分身一起算叫进程池，这里不展开

口播节选：
> 活儿该交给谁？判断主线就一条：任务之间的关联强度。

---

## 4. live-demo — 真机实验：三节实测（8 steps · ~71s）

**信息池**：
- 命令：`python3 task_orchestration.py`，三个实测小节 + 全部断言，约 0.5 秒 —— 来源 article §Quick Start L56-58
- 输出 §1：三个任务 0.05s 成功 / 1.0s 慢 / 0.1s 引爆；引爆后总耗时 102ms（远小于 1000ms）→ 慢任务被自动取消 —— 来源 article §Quick Start L66-68
- 输出 §1：慢任务的 finally 清理已执行 ✓，异常打包为 ExceptionGroup 上抛；结构化并发没有孤儿任务 —— 来源 article §Quick Start L69-70
- 输出 §2：0.2s 准时抛 TimeoutError（实测 201ms）；stubborn() 的 finally 清理已执行 ✓ —— 来源 article §Quick Start L74-76
- 输出 §2：3.11 新写法 `async with asyncio.timeout(0.2)` 语义相同 —— 来源 article §Quick Start L77
- 输出 §3：return_exceptions=True → `['A', ValueError('gather-内错误'), 'B']` 三个结果收齐；False 首败即抛 —— 来源 article §Quick Start L81-84
- 诚实预期：§1 总耗时 102ms 任何机器稳定；清理断言是本实验的灵魂；§3 异常对象在结果列表第 2 位 —— 来源 article §Quick Start L88-93

**开发计划**：
- step 1 (~5s) — 模拟终端窗：命令 `python3 task_orchestration.py` + 三个小节标题预告 + 小注「断言自动核对」
- step 2 (~10s) — §1 三道任务时间轴：0.05s 成功 / 1.0s 慢 / 0.1s 引爆（三根任务条推进）
- step 3 (~10s) — §1 hero 大数字：引爆后总耗时 102ms vs 慢任务 1000ms——被叫停对照（「它真的被取消了」）
- step 4 (~10s) — §1 慢任务清理代码也执行了（关文件、断连接勾选）+ 异常打包异常组出口上抛；标语「取消不是掐断，是善后」
- step 5 (~10s) — §2 时限 0.2 秒、实测 201 毫秒准时触发；死硬协程不退但清理照样执行（善后一件没落）
- step 6 (~9s) — §2 新老写法对照：老写法包一个调用 / 3.11 新写法包一整段逻辑——效果一模一样
- step 7 (~9s) — §3 容错开关打开：三个结果收齐 `['A', ValueError('gather-内错误'), 'B']`——异常对象夹在中间，失败不拖累别人
- step 8 (~8s) — §3 默认：第一个失败立刻抛异常、后面结果不要；收束「要尽力收齐开开关，要一票否决用默认」

口播节选：
> 慢任务要 1000 毫秒，102 毫秒就被叫停——所以它真的被取消了。

---

## 5. mechanism — 机制：取消如何传播（6 steps · ~58s）

**信息池**：
- 机制：Python 取消的不是线程（语言层面做不到杀线程），而是向协程注入 CancelledError，在最近 await 点抛出，沿普通异常路径传播 —— 来源 article §How It Works L101-103
- 词义：await 点 = 协程让出执行权、交还事件循环的位置 —— 来源 article §How It Works L103
- 推论：清理逻辑必须放 finally；裸 except 吞掉 CancelledError 会让任务对取消免疫 —— 来源 article §How It Works L105
- 契约：块结束必达终态——正常等齐 / 有异常取消其余并打包 ExceptionGroup 上抛 —— 来源 article §How It Works L107-109
- 契约逐条解决三坑：异常不再静默（出口必抛）/ 退出无孤儿 / 取消有人负责 —— 来源 article §How It Works L111
- 细节：异常不再单独抛出，要从 `.exceptions` 列表解包 —— 来源 article §How It Works L113

**开发计划**：
- step 1 (~12s) — 问题卡：取消到底怎么发生？Python 取消不了线程——系统管的干活人手，做不到直接掐死（对比卡）
- step 2 (~11s) — 注入示意：取消异常沿协程执行线飞向最近的 await 点（让出控制权、回去排队的位置）落地，顺普通报错路径往外传
- step 3 (~9s) — 解释实验现象：取消走普通报错的路 → try、finally 这些清理逻辑照常工作（「清理代码为什么每次都执行了」的答案）
- step 4 (~9s) — 两条推论双卡：清理逻辑必须放 finally / except 全接住又不抛 = 任务「取消不动」
- step 5 (~9s) — 契约卡：块结束必定收场——正常等齐再出门 / 有异常取消其余打包上抛；开头三个坑逐条划掉（出口必抛 / 没有孤儿 / 有人负责）
- step 6 (~8s) — 细节卡：异常不再单独抛——从异常组的列表里逐个取出来（.exceptions 示意）

口播节选：
> 它的做法是：往协程里，注入一个「取消异常」。

---

## 6. boundaries — 边界与铁证（4 steps · ~41s）

**信息池**：
- 边界：wait_for 超时即取消——「超时」与「取消」同一机制，201ms 准时触发是证据；同样协作式，死循环不让出超时无能为力 —— 来源 article §How It Works L115-119
- 边界：gather 只收集不取消——默认模式抛异常后其余任务继续跑完，只是结果被丢弃；「一个失败全员叫停」是 TaskGroup —— 来源 article §How It Works L123-125
- 核心代码：t0 记时 → 跑 tg_main → 捕获 ExceptionGroup → elapsed = perf_counter 差值，assert elapsed < 0.5（慢任务完整要 1.0s）—— 来源 article §How It Works L129-136
- 双重证明：时间断言线 0.5s 卡在引爆点 0.1s 与慢任务 1.0s 之间 + cleanup_ran 标志 finally 置位——取消既及时又干净 —— 来源 article §How It Works L139-141

**开发计划**：
- step 1 (~9s) — 超时 = 取消同一件事：201 毫秒准时触发就是证据；注记「协程死循环不让出，超时也拿它没办法」
- step 2 (~13s) — gather 边界对照：只收集、不取消——首败抛异常后其余任务继续跑完、结果被丢 vs「一个失败、全员叫停」是 TaskGroup 的活
- step 3 (~11s) — 秒表演示：起秒表跑实验、断言总耗时小于 0.5 秒；断言线卡在引爆点 0.1 秒与慢任务 1 秒之间（0.1 — 0.5 — 1.0 数轴示意）
- step 4 (~8s) — 双重证明：清理记号「我清理过了」置位 + 时间证据——取消，既及时，又干净

口播节选：
> 这条线卡得很合理：引爆点 0.1 秒，慢任务 1 秒。只有慢任务真被取消，才可能跑进 0.5 秒。

---

## 7. pitfalls — 四个真实的坑（4 steps · ~54s）

**信息池**：
- 坑 1 吞掉 CancelledError：现象任务组卡死一直等 / 原因 except 捕获后不 re-raise / 解法捕完必须 raise —— 来源 article §Pitfalls L147
- 坑 2 从 ExceptionGroup 盲取：拿到一个开工、其余错误漏掉 / 解法逐个按类型分发处理 —— 来源 article §Pitfalls L148
- 坑 3 把 gather 默认模式当「全部并行且必成」：一处失败抛异常其余仍在跑 / 解法要取消语义用 TaskGroup —— 来源 article §Pitfalls L149
- 坑 4 在 finally 里再 await 长操作：取消传播期间的新 await 若也被取消、清理中断 / 解法善后要短、必要时 shield 保护 —— 来源 article §Pitfalls L150
- 词义：asyncio.shield 保护壳——外层任务被取消，被包住的清理协程不受影响、能继续跑完 —— 来源 article §Pitfalls L150

**开发计划**：
- step 1 (~12s) — 坑 1 卡片（现象 → 原因 → 解法）：吞掉取消异常——任务组卡死等一个不结束的任务 / except 捕获后没再抛 / 捕完必须再抛（代码行示意）
- step 2 (~10s) — 坑 2 卡片：从异常组里盲取——拿到一个就开工、其余错误全漏 / 解法：一个一个看是什么错，分别处理
- step 3 (~11s) — 坑 3 卡片：把 gather 默认当「全部并行、必须全成」——一处失败抛了异常其余却在后台继续跑 / 解法：要「一个失败、全员叫停」用 TaskGroup
- step 4 (~21s) — 坑 4 卡片：善后的时候又去等长操作——因果链示意（取消来 → finally 收尾 → 收尾里的 await 被再取消 → 善后断一半）+ shield 保护壳示意（外壳挡取消、壳内清理跑完）

口播节选：
> 解法：善后要短；实在要保护，用 shield——一层保护壳，外面的取消进不来，壳里的清理能跑完。

---

## 8. qa-closing — 两问与收尾（5 steps · ~39s）

**信息池**：
- Q1：gather 容错 = 哪个失败就把错误本身当一份结果收进列表、其余任务一个不停（100 页面挂 3 拿回 97）；TaskGroup = 一个失败全员取消、必须全成否则全撤（比如下单） —— 来源 article §Q&A L152-153
- Q2：ExceptionGroup 处理两条路——except* 按异常类型分组匹配（3.11+）/ 手动遍历 `.exceptions` 逐个分发 —— 来源 article §Q&A L155-156
- 仓库：hands-on-python / concurrency / 09_task_orchestration，`python3 task_orchestration.py` 直跑 —— 来源 article §Quick Start L56-58
- 预告：下一讲异步流水线——asyncio.Queue、Semaphore、背压（系列第 10 讲主题） —— 来源 hands-on-python/concurrency/10_async_pipelines

**开发计划**：
- step 1 (~12s) — Q1 gather 侧：哪个任务失败就把错误本身当一份结果收进列表、其余一个不停照常跑完——100 个页面挂了 3 个，还能拿回 97 个
- step 2 (~9s) — Q1 TaskGroup 侧对照收束：一个失败、全员取消——必须全成否则全撤的活儿，比如下单
- step 3 (~10s) — Q2 异常组处理：两条路——3.11 新写法按错误类型分组接住 / 笨办法把组里的错误一个一个过一遍，是什么错就怎么处理
- step 4 (~4s) — 仓库卡：hands-on-python · concurrency/09 · python3 直跑，完整代码在仓库里
- step 5 (~4s) — 终屏：下一讲「异步流水线：把生产者消费者，搬进单线程世界」+ 下期见

口播节选：
> 完整代码在仓库里。下一讲，异步流水线：把生产者消费者，搬进单线程世界。下期见。

---

## 素材清单

### 1. hook
- ✓ 标题页排版 / 串行等待时间条 / 三坑清单 / `Task was destroyed` 警告条 —— 程序化绘制

### 2. solution
- ✓ 有进必有出对照 / 三主角卡 / async with 块双出口 / 取消传播示意 / 登山向导连播 —— 程序化绘制

### 3. when-to-use
- ✓ 工具卡 / 关联强度三分指向 / 三场景卡 / 三条边界卡 —— 程序化绘制

### 4. live-demo
- ✓ 模拟终端（真实输出取自 article §Quick Start）/ 三任务时间轴 / 102ms hero / 结果列表 —— 程序化绘制

### 5. mechanism
- ✓ 线程对比卡 / 注入示意 / 推论双卡 / 契约卡划坑 / `.exceptions` 列表 —— 程序化绘制

### 6. boundaries
- ✓ 201ms 证据卡 / 收集 vs 取消对照 / 数轴断言线 / 清理记号 —— 程序化绘制

### 7. pitfalls
- ✓ 四坑卡片（现象→原因→解法）/ 因果链 / shield 保护壳 —— 程序化绘制

### 8. qa-closing
- ✓ 两工具对照 / 两条路 / 仓库卡 / 终屏 —— 程序化绘制

> 无外部图片素材需求，无待提供素材（⚠️ 项：无）。
