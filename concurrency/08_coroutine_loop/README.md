# 08 · 协程与事件循环机制：单线程内的并发

> 第三阶段开幕，切换到 asyncio 世界。前七站的所有并发都靠"多线程被 GIL 串行化"，
> asyncio 反其道而行：**干脆只用一个线程**，靠 `await` 主动让出实现并发。本实验用
> 0.4 秒验证四件事：协程是惰性的、await 让出的是控制权、一切都在主线程上、
> await 链不并发而 create_task 才并发。

## 1. 为什么需要它

asyncio 的语法十分钟就会，但四个误解会跟一辈子：以为调用协程函数就会执行（不会，它只造对象）；以为 await 开了新线程（没有，全在 MainThread）；以为 `await coro()` 就并发了（那是顺序执行）；以为 asyncio.run 和手动循环有什么本质区别（没有，前者是后者的封装）。本实验逐条钉死这四个认知，为后面 TaskGroup（项目 9）、异步流水线（项目 10）、高并发抓取（项目 11）打底。

## 2. 总览：核心机制一图看懂

![事件循环：单线程内的协作式调度](images/coroutine_loop.svg)

一句话心智模型：**协程在 await 处主动交还控制权，事件循环单线程地在协程之间切换，睡眠中的任务挂在定时器堆上，到期再放回可运行队列**。看图闭环：协程 A/B await 让出 → 事件循环接管 → 未到期挂起 → 到期恢复——全程没有第二个线程。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/concurrency/08_coroutine_loop/images/coroutine_loop.html)
> （或本地打开 [`images/coroutine_loop.html`](images/coroutine_loop.html)）。

## 3. 快速开始

```bash
cd concurrency/08_coroutine_loop
python3 coroutine_loop.py      # 四个实测小节 + 全部断言，约 0.5 秒
```

真实输出（macOS, CPython 3.13.9）：

```
========================================================
[1. 调用协程函数 ≠ 执行函数体]
========================================================
  coro = sample() → <coroutine object sample at 0x1051cf4c0>
  此刻函数体执行痕迹: []（一行都没跑）
  asyncio.run(coro) → 'sample-结果'，执行痕迹: ['body-ran']
  忘记 await 是 asyncio 第一大坑：协程对象被 GC 时会警告'never awaited'

========================================================
[2. await 让出控制权：单线程内的交错]
========================================================
  交错序列: A1 B1 A2 B2 A3 B3（sleep(0) 轮转，精确可复现）
  线程断言：全部协程代码跑在同一个线程上
  协程所在线程: MainThread（asyncio 从不创建新线程）
  并发 ≠ 并行：单线程靠 await 主动让出实现'看起来同时'

========================================================
[4. await 链 vs create_task：差的不是语法是并发]
========================================================
  await 链（顺序）:  203ms  ['s1', 's2']
  create_task（并发）: 101ms  ['c1', 'c2']   (2.01×)
  await coro() 只是带异步语法的函数调用；想同时跑，先 create_task 挂上去
```

诚实预期（本机 3 次实测）：

- **§2 的交错序列精确等于 `A1 B1 A2 B2 A3 B3`**：`sleep(0)` 的让出是确定性轮转，可作断言；换成 `sleep(0.01)` 就不该断言顺序了
- **§4 加速比 ≈ 2.0×**：两个 100ms 任务真并发，理论恰为 2×，实测 2.01×（事件循环自身开销可忽略）
- 全部小节零随机性，任何机器任何负载都该 100% 通过

## 4. 核心概念

### 4.1 协程对象：惰性到"一行都不跑"

`sample()` 这样调用协程函数，得到的是一个协程对象（`<coroutine object ...>`）——它把函数体、局部变量、执行位置打包起来，**等事件循环驱动才执行**。不 await 就丢弃它，GC 时会警告 `coroutine was never awaited`。这是 asyncio 第一大坑：`asyncio.run(main())` 忘了写、或者 `main()` 里调了子协程却没 await，程序什么都没做就"成功"退出。

### 4.2 await：主动让出控制权

`await x` 的语义是"我要等 x，先把控制权还给事件循环"。事件循环拿回控制权后调度其他就绪协程——所以两个协程能在**同一个线程**里交错（实测序列 `A1 B1 A2 B2 A3 B3`，`sleep(0)` 让出是确定性轮转）。关键推论：**并发 ≠ 并行**——asyncio 从不创建线程，它只是不让 CPU 闲着等 IO。

### 4.3 事件循环：一个线程 + 一张调度表

`asyncio.run(main())` ≈ `new_event_loop()` + `run_until_complete()` + 清理（实测两者结果完全一致，§3）。循环维护一张调度表：就绪队列（可立即执行）与定时器堆（`sleep` 到期/IO 就绪再入队）。**一个线程同时只能有一个运行中的事件循环**——在协程里再调 `asyncio.run()` 会直接报错。

### 4.4 await 链 vs create_task：顺序执行与真并发

```python
r.append(await slow_step("s1", 0.1))   # 顺序：等 s1 完才开 s2（共 200ms）
t = asyncio.create_task(slow_step("c2", 0.1))   # 并发：先挂上任务再收结果（共 101ms）
```

`await coro()` 只是"带异步语法的函数调用"——它不并发，只是允许中途让出。想同时跑，必须先 `create_task()` 把协程挂上循环（项目 9 的 TaskGroup 是它的结构化升级版），然后 `await` 只负责收结果。

## 5. 关键代码解析

**为什么 §2 用 `sleep(0)` 而不是 `sleep(0.01)`？**

`sleep(0)` 是"让出但立刻回就绪队列"——事件循环按固定顺序轮转，交错序列精确为 `A1 B1 A2 B2 A3 B3`，可以写成断言。换成真实毫秒级 sleep，定时器精度和系统抖动会让顺序波动——**断言要建立在确定性的机制上**，否则测试本身成为 flake 源。

坑清单：

- **调用了协程函数却没 await**：静默不执行，GC 才给一行 RuntimeWarning——IDE 的灰色提示要认真看
- **在协程里调 `time.sleep()`**：整个事件循环被卡死，所有协程一起停摆；异步世界只准 `await asyncio.sleep()`
- **以为 await 创建了线程**：实测全部协程都在 MainThread——CPU 密集任务放进协程会独占循环，要用 `run_in_executor` 丢给线程/进程池
- **在协程里嵌套 `asyncio.run()`**：一个线程只允许一个运行中的循环，直接 RuntimeError
- **`await` 链当并发用**：10 个 `await fetch(i)` 串行 10 次；要并发先 `gather`/`create_task`（项目 9）

## 6. 文件结构

```
08_coroutine_loop/
├── README.md                                # 本教程文档
├── coroutine_loop.py                        # 主演示脚本：惰性/交错/等价/对比
└── images/
    ├── coroutine_loop.json          # 图源（typed JSON IR，可编辑重渲染）
    ├── coroutine_loop.html          # 交互示意图（浏览器打开）
    └── coroutine_loop.svg           # 双主题矢量图（本 README §2 内嵌）
```

`coroutine_loop.py` 内容：`demo_lazy()` 惰性协程 / `demo_interleave()` 单线程交错 + 线程断言 / `demo_run_equivalence()` 两种启动方式等价 / `demo_await_vs_task()` await 链 vs create_task。

## 7. 面试要点

**Q1: 协程和线程的区别？**
协程是用户态的协作式任务：单线程、主动让出（await）、切换成本是函数调用级；线程是内核抢占式调度，切换要陷入内核且受 GIL 串行化。协程适合海量 IO 等待，线程适合阻塞库兜底，CPU 密集两者都不行（要进程）。

**Q2: await 到底做了什么？**
把控制权（和当前执行位置）交还事件循环，注册一个"何时唤醒我"的回调（定时器/IO 事件），等条件满足后从上次位置恢复执行。它不创建任何线程。

**Q3: `asyncio.run()` 和 `loop.run_until_complete()` 的区别？**
无本质区别：前者是后者的封装（自动建循环、跑完关闭、清理异步 generator）。一个线程同时只能有一个运行中的循环——嵌套调用 asyncio.run 直接 RuntimeError。

**Q4: `await coro()` 和 `asyncio.create_task(coro())` 的区别？**
前者是顺序调用（等完才走，项目实测 2 个 100ms 任务 203ms）；后者立刻把协程包装成 Task 挂上循环与其他任务并发（实测 101ms）。await Task 时才是在收结果。

**Q5: 协程里能调 `time.sleep()` 吗？**
语法能、效果是灾难：它阻塞整个事件循环，所有协程停摆。异步世界一切等待都要 await（asyncio.sleep / 异步 IO）；必须调阻塞函数时用 `loop.run_in_executor` 丢给线程池。

## 8. 总结

1. **协程对象是惰性的**：调用只造对象，await/事件循环驱动才执行
2. **await = 主动让出控制权**：单线程内交错可精确复现（sleep(0) 轮转）
3. **asyncio.run 是 run_until_complete 的封装**：一切都在 MainThread
4. **await 链 ≠ 并发**：create_task/gather 才是；实测 2.01×
5. **并发 ≠ 并行**：asyncio 用一个线程吃满 IO 等待，项目 11 将用它跑真实网络

下一篇进入 [09 · 任务编排——TaskGroup、gather、wait 与取消](../09_task_orchestration/README.md)——结构化并发把"同时跑"管理得井井有条：一个失败全取消、超时兜底、收齐结果。
