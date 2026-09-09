# 09 · 任务编排——TaskGroup、gather、wait 与取消：结构化并发

> 上一篇会"同时跑"了，但跑丢了一个怎么办？这一篇回答 asyncio 的管理问题：
> **TaskGroup 一个失败全员取消**（实测 1 秒的任务在 102ms 内被叫停且清理干净）、
> **wait_for 超时兜底**（finally 必然执行）、**gather 两种收集策略**（收齐 vs 一票否决）。

## 1. 为什么需要它

裸 `create_task` 是"放养式并发"：任务挂上去之后没人负责——失败了静默丢失、卡死了没人取消、退出了没人通知。3.11 引入的 TaskGroup 用结构化并发终结混乱：`async with` 块结束时，任务要么全部完成、要么全部取消，**不存在孤儿**。本实验断言三件事：取消是及时的（102ms << 1000ms）、取消是干净的（finally 必然执行）、收集是可选的（收齐或一票否决）。

## 2. 总览：核心机制一图看懂

![TaskGroup：一个失败，全员取消](images/task_orchestration.archify.svg)

一句话心智模型：**TaskGroup 是"连带责任制"——任一子任务抛异常，组内其余任务立刻收到取消信号，异常打包成 ExceptionGroup 在 async with 出口上抛**。看图：三个任务汇入 TaskGroup，bomber 的 raise 沿强调线击穿；结局三分——fast 的结果作废、slow 沿虚线被 cancel()（先过 finally）、异常组上抛。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/concurrency/09_task_orchestration/images/task_orchestration.archify.html)
> （或本地打开 [`images/task_orchestration.archify.html`](images/task_orchestration.archify.html)）。

## 3. 快速开始

```bash
cd concurrency/09_task_orchestration
python3 task_orchestration.py      # 三个实测小节 + 全部断言，约 0.5 秒
```

真实输出（macOS, CPython 3.13.9）：

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

## 4. 核心概念

### 4.1 TaskGroup：结构化并发

`async with asyncio.TaskGroup() as tg: tg.create_task(...)` 的契约：**块内创建的任务，块结束时必然到达终态**——正常则等齐，有异常则取消其余并把所有异常打包成 `ExceptionGroup` 上抛。它解决裸 `create_task` 的三大问题：异常静默丢失、退出时有孤儿任务、取消无人负责。注意异常不再单独抛出，要从 ExceptionGroup 里解包（`.exceptions` 列表）。

### 4.2 取消的机制：CancelledError 是协作的

取消不是杀线程（Python 做不到），而是向协程注入 `CancelledError`——它在 await 点抛出，沿正常异常路径传播，所以 `try/finally`、`with` 清理全部照常工作（实测 cleanup_ran ✓）。推论：写协程时**清理逻辑必须放 finally**，吞掉 CancelledError（裸 `except:`）会破坏取消机制。

### 4.3 wait_for 与 asyncio.timeout：超时即取消

`wait_for(coro, timeout=0.2)` 超时后取消子协程并抛 `TimeoutError`——"取消"与"超时"是同一机制（实测 finally 执行 ✓）。3.11+ 的 `async with asyncio.timeout(0.2):` 更适合包一段逻辑。二者都遵守"取消是协作的"：协程内部若死循环不让出，超时也无能为力。

### 4.4 gather 的两种收集策略

`gather(*aws, return_exceptions=True)` 把异常对象当作普通结果放进列表——"尽力收齐"，适合批量校验、聚合查询；默认 `False` 则首败即抛——"一票否决"，适合全部必须成功的场景。**它不像 TaskGroup 会取消兄弟任务**：默认模式下抛出异常后，其余任务继续跑完（结果被丢弃）。要"一败全停"选 TaskGroup。

## 5. 关键代码解析

**为什么 §1 能断言"取消及时"？**

```python
t0 = time.perf_counter()
try:
    asyncio.run(tg_main())
except ExceptionGroup as eg:
    ...
elapsed = time.perf_counter() - t0
assert elapsed < 0.5    # 慢任务完整要 1.0s
```

时间是最诚实的取消证据：如果慢任务没被取消，async with 要等它 1 秒才退出。0.5s 断言线卡在引爆点（0.1s）与慢任务（1.0s）之间——只有"真取消了"才可能通过。配合 `cleanup_ran` 标志（finally 里置位）双重证明：取消既及时又干净。

坑清单：

- **吞掉 CancelledError**：`except:` 或 `except Exception` 后不 re-raise，任务对取消免疫，TaskGroup 卡死等它——捕获后必须 `raise`
- **从 ExceptionGroup 里盲取**：`.exceptions` 可能有多个异常，逐个按类型分发处理
- **把 gather 默认模式当"全部并行且必成"**：首败即抛时其余任务仍在跑（不像 TaskGroup 会取消）——要取消语义用 TaskGroup
- **在 finally 里再 await 长操作**：取消传播期间的新 await 若也被取消，清理做一半；善后逻辑要短或用 `shield`

## 6. 文件结构

```
09_task_orchestration/
├── README.md                                    # 本教程文档
├── task_orchestration.py                        # 主演示脚本：TaskGroup/wait_for/gather
└── images/
    ├── task_orchestration.archify.json          # 图源（typed JSON IR，可编辑重渲染）
    ├── task_orchestration.archify.html          # 交互示意图（浏览器打开）
    └── task_orchestration.archify.svg           # 双主题矢量图（本 README §2 内嵌）
```

`task_orchestration.py` 内容：`demo_taskgroup()` 一败全停 + 取消清理（验收点 1）/ `demo_wait_for()` 超时兜底（验收点 2）/ `demo_gather()` 双策略收集（验收点 3）。

## 7. 面试要点

**Q1: 什么是结构化并发？TaskGroup 解决什么问题？**
并发的生命周期被限定在词法作用域内：async with 块结束时任务必然到终态——全成或全取消。解决裸 create_task 的孤儿任务、异常静默、取消无人负责三大问题。

**Q2: asyncio 的取消是怎么工作的？**
向协程在 await 点注入 CancelledError，它沿异常路径传播，finally 照常执行——取消是协作式的。协程吞掉 CancelledError 会破坏取消机制；清理必须放 finally。

**Q3: gather(return_exceptions=True) 和 TaskGroup 都能"容错"，怎么选？**
gather=True 把异常当结果收齐（不取消兄弟）；TaskGroup 一败即取消全体并打包上抛。批量独立查询要"能拿多少拿多少"用前者；一组必须全成否则全撤的事务型操作用后者。

**Q4: wait_for 超时后，里面的协程死了吗？**
没有"死"，是被取消：收到 CancelledError，finally 执行完才算退场，wait_for 再抛 TimeoutError。超时 = 定时取消，资源清理依然可靠。

**Q5: ExceptionGroup 怎么处理？**
except* 语法按异常类型分组匹配（3.11+），或手动遍历 `.exceptions`。TaskGroup 把多个子任务异常打包，逐个分发是标准姿势。

## 8. 总结

1. **TaskGroup 连带责任制**：一败全停，异常打包 ExceptionGroup，没有孤儿任务
2. **取消 = 注入 CancelledError**：finally 必然执行，吞掉它会破坏取消
3. **wait_for/timeout = 定时取消**：TimeoutError 准时到，善后依然干净
4. **gather 双策略**：True 尽力收齐，False 一票否决——但都不取消兄弟任务
5. **断言取消用时间**：总耗时是取消是否发生的最诚实证据

下一篇：**10 · 异步生产者-消费者与限流**——asyncio.Queue 背压 + Semaphore 并发上限，把流水线搬到单线程世界（规划见根目录 [python_concurrency.md](../../python_concurrency.md) 项目 10）。
