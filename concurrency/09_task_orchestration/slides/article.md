# 09 · 任务编排——TaskGroup、gather、wait 与取消：结构化并发

> `create_task` 会让任务"同时跑"，可跑丢了一个怎么办？本实验回答 asyncio 的管理问题：
> **TaskGroup 一个失败全员取消**（实测 1 秒的任务在 102ms 内被叫停且清理干净）、
> **wait_for 超时兜底**（finally 必然执行）、**gather 两种收集策略**（收齐 vs 一票否决）。

## Background

这节讲任务编排的问题从哪来。asyncio 里跑并发的基础动作是 `create_task`：把协程（用 `async def` 定义、能在 `await` 点暂停和恢复的函数）提交给事件循环（event loop，在单线程里调度并切换多个任务的引擎）执行，返回一个 Task 句柄（被调度协程的包装对象）。

挂上去之后全靠自己管。具体到一次批量抓取：并发请求 10 个 URL，第 3 个抛了异常。因为没人 `await` 它，异常安静地留在 Task 对象里；主流程继续等其余 9 个，白白耗掉几秒。程序退出时事件循环还可能警告 `Task was destroyed but it is pending`。

失败静默、卡死无人取消、退出留孤儿——三个坑同源：任务的生命周期没人负责。

社区对此的回应叫结构化并发（structured concurrency）：把并发任务的生命周期限制在创建它的代码块内，像函数调用一样有进必有出。Python 3.11 把这一思路落地进标准库，并配套引入了能一次携带多个异常的容器 ExceptionGroup。具体设施见下一节。

## What

这节给出定义与心智模型。任务编排（task orchestration）指对一组并发任务的启动、失败、取消与结果收集做统一管理，本实验涉及三个设施。

核心是 TaskGroup——3.11 引入的结构化并发容器：`async with asyncio.TaskGroup() as tg:` 块内创建的任务，块结束时要么全部完成、要么全部取消，不存在孤儿。

它的规则是"连带责任制"：任一子任务抛异常，组内其余任务立刻收到取消信号（以 `CancelledError` 异常的形式），所有异常打包成 ExceptionGroup 在 `async with` 出口上抛。

可以把 TaskGroup 想象成带队的登山向导：队里任何人失足，向导立刻吹哨，全队就地停下、清点人数一起撤离；但和向导不同的是，撤离后它会交出一份包含每个人状况的完整报告（ExceptionGroup），而且"吹哨"要生效得靠队员配合——吞掉取消信号的队员会让全队干等（机制见 How It Works）。

另外两个设施管更细的局部：

| 工具 | 一句话定位 | 失败/超时时的行为 |
|---|---|---|
| `wait_for` / `asyncio.timeout` | 给单个操作加超时兜底 | 到点取消子协程，抛 `TimeoutError` |
| `gather` | 批量收集多个协程的结果 | `return_exceptions=True` 时异常当结果收齐；默认首败即抛，其余任务继续跑 |

## When to Use

这节补判断力：什么活儿该交给谁。判断主线看任务间的关联强度——一损俱损选 TaskGroup，彼此独立选 gather，单个外部调用怕慢选 wait_for。

典型场景：

- **事务型扇出**：下单流程要同时调库存、支付、风控三个服务，任何一个失败整个请求就应放弃——TaskGroup 的一败全停正合适。
- **给慢依赖加 deadline**：主链路里要调一个响应时快时慢的外部接口，`wait_for(调用, timeout=0.5)` 保证它拖不垮整体。
- **聚合型抓取**：抓 100 个页面建索引，个别失败可接受、成功的先落库——`gather(..., return_exceptions=True)`。

何时不用：只有两三个顺序步骤、没有并发需求时，直接顺序写；任务彼此毫无关联且失败互不影响时，裸 `create_task` 加自己的异常处理也能胜任（但要自己兜 Background 列的三个坑）；CPU 密集型计算 asyncio 帮不上忙，考虑进程池。

| 方案 | 与 TaskGroup 的差异 | 什么时候选它 |
|---|---|---|
| 裸 `create_task` | 无统一管理，失败静默、退出留孤儿 | 后台长驻任务，生命周期完全自定义 |
| `gather` | 只收集不取消：默认模式首败即抛后，兄弟任务继续跑完 | 结果互相独立的批量收集 |
| `wait_for` / `asyncio.timeout` | 只管单个操作的超时，不管任务组 | 给单个外部调用加截止时间 |

## Quick Start

前置条件：Python 3.11+（`TaskGroup`、`asyncio.timeout`、`except*` 均为 3.11 引入）。实验是一个脚本，含三个实测小节和全部断言：

```bash
cd concurrency/09_task_orchestration
python3 task_orchestration.py      # 三个实测小节 + 全部断言，约 0.5 秒
```

真实输出（首行的 Python 版本行与结尾"全部断言通过"横幅略）：

```
========================================================
[1. TaskGroup：一个失败，全员自动取消]
========================================================
  三个任务：0.05s 成功 / 1.0s 慢任务 / 0.1s 引爆
  引爆后总耗时 102ms（远小于慢任务的 1000ms）→ 慢任务被自动取消
  慢任务的 finally 清理已执行 ✓  异常打包为 ExceptionGroup 上抛
  结构化并发：async with 块结束时，要么全成、要么全停——没有孤儿任务

========================================================
[2. wait_for：0.2s 超时，子协程被取消但清理了]
========================================================
  0.2s 准时抛 TimeoutError（实测 201ms）
  stubborn() 的 finally 清理已执行 ✓ —— 取消不是消失，是温和地善后
  3.11+ 新写法：async with asyncio.timeout(0.2): ...（语义相同）

========================================================
[3. gather：return_exceptions 的两种策略]
========================================================
  return_exceptions=True: ['A', ValueError('gather-内错误'), 'B']
  → 3 个结果收齐：1 个异常对象 + 2 个正常值，失败不拖累别人
  return_exceptions=False: 首败即抛 ValueError(gather-内错误)——后面的结果不要了
  选型：要'尽力收齐'用 True（批量校验）；要'一票否决'用默认 False
```

诚实预期（本机 3 次实测）：

- **§1 总耗时 102ms**：引爆点 0.1s + 取消传播毫秒级，远低于断言线 0.5s；任何机器都稳定
- **清理断言是本实验的灵魂**：被取消的协程会收到 CancelledError，`try/finally` 的清理必然执行——"取消是温和的善后，不是断电"
- **§3 的异常以对象形式出现在结果列表里**，位置与提交顺序一致（本例第 2 位）
- 运行结束看到"全部断言通过 ✓"即断言全过

输出 §1 演示 TaskGroup 的连带取消，§2 演示 wait_for 超时后的善后，§3 对比 gather 的两种收集策略；这三个现象在 How It Works 里逐一对回代码。

## How It Works

这节按"取消如何传播"的主线拆开机制，并与上面的输出互相印证。

### 取消是协作的：CancelledError 从 await 点注入

Python 取消的不是线程（语言层面做不到杀线程），而是向协程注入 `CancelledError`。它在协程最近的 `await` 点（协程让出执行权、交还事件循环的位置）抛出，沿普通异常路径传播。

因此 `try/finally`、`with` 等清理逻辑照常工作——输出里两条"finally 清理已执行 ✓"（§1 慢任务、§2 stubborn()）就是这条机制的效果。推论：清理逻辑必须放 `finally`；裸 `except:` 吞掉 `CancelledError` 会让任务对取消免疫。

### TaskGroup 的契约：块结束必达终态

`async with asyncio.TaskGroup() as tg: tg.create_task(...)` 的契约：块内创建的任务，块结束时必然到达终态——正常则等齐，有异常则取消其余并把所有异常打包成 `ExceptionGroup` 上抛。

它逐条解决 Background 的三个坑：异常不再静默（出口必抛）、退出无孤儿、取消有人负责。

异常不再单独抛出，要从 `.exceptions` 列表解包。输出 §1 的"引爆后总耗时 102ms"对应契约后半句：慢任务没等满 1000ms 就被终止。

### wait_for 与 asyncio.timeout：超时即取消

`wait_for(coro, timeout=0.2)` 超时后取消子协程并抛 `TimeoutError`——"超时"与"取消"在这里是同一机制，输出 §2 的实测 201ms 准时触发、finally 执行 ✓ 即证据。

3.11+ 的 `async with asyncio.timeout(0.2):` 语义相同，更适合包一段逻辑而非单个调用。二者同样受协作式约束：协程若死循环不让出，超时也无能为力。

### gather 的两种收集策略

`gather(*aws, return_exceptions=True)` 把异常对象当普通结果放进列表——"尽力收齐"，适合批量校验、聚合查询；默认 `False` 则首败即抛——"一票否决"。

关键差异：gather 不像 TaskGroup 会取消兄弟任务，默认模式下抛出异常后其余任务继续跑完，只是结果被丢弃。输出 §3 的两种结果形态分别对应这两条路径。

### 最核心的一处代码：用时间证明取消真的发生

```python
t0 = time.perf_counter()
try:
    asyncio.run(tg_main())
except ExceptionGroup as eg:
    ...
elapsed = time.perf_counter() - t0
assert elapsed < 0.5    # 慢任务完整要 1.0s
```

为什么这样写：时间是最诚实的取消证据——如果慢任务没被取消，`async with` 要等满 1 秒才退出。断言线 0.5s 卡在引爆点（0.1s）与慢任务（1.0s）之间，只有"真取消了"才可能通过。

配合 `cleanup_ran` 标志（finally 里置位）构成双重证明：取消既及时又干净。输出 §1 的"总耗时 102ms"就是这里的 `elapsed`。

## Pitfalls & Q&A

这节收四个常见踩坑点和两个选型问题，踩坑按"现象 → 原因 → 解法"组织。

- **吞掉 CancelledError**。现象：TaskGroup 卡死，一直等一个不结束的任务。原因：`except:` 或 `except Exception` 捕获后不 re-raise，任务对取消免疫。解法：捕获后必须 `raise`（机制见"取消是协作的"一节）。
- **从 ExceptionGroup 里盲取**。现象：拿到一个异常后，组里其余错误被漏掉。原因：`.exceptions` 可能有多个异常。解法：逐个按类型分发处理。
- **把 gather 默认模式当"全部并行且必成"**。现象：一处失败抛了异常，其余任务却仍在后台继续跑。原因：默认模式首败即抛，但不像 TaskGroup 会取消兄弟任务。解法：要取消语义用 TaskGroup。
- **在 finally 里再 await 长操作**。现象：清理执行到一半又收到新的取消，善后做了一半。原因：取消传播期间的新 `await` 若也被取消，清理会中断。解法：善后逻辑要短，必要时用 asyncio.shield（保护壳：把内部协程包起来后，外层任务即使被取消，被包住的清理协程也不受影响、能继续跑完）保护。

**Q1: gather(return_exceptions=True) 和 TaskGroup 都能"容错"，怎么选？**
gather=True 把异常当结果收齐（不取消兄弟）；TaskGroup 一败即取消全体并打包上抛。批量独立查询要"能拿多少拿多少"用前者；一组必须全成否则全撤的事务型操作用后者。

**Q2: ExceptionGroup 怎么处理？**
except* 语法按异常类型分组匹配（3.11+），或手动遍历 `.exceptions`。TaskGroup 把多个子任务异常打包，逐个分发是标准姿势。
