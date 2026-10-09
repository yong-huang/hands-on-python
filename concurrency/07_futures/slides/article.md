# 07 · concurrent.futures 统一执行器：Future 一等公民

> threading 的 Thread 与 multiprocessing 的 Pool 是两套 API，切换后端就要重写调度代码。
> `concurrent.futures` 把"怎么跑"抽象成 Executor（执行器）接口，把"结果在哪"
> 抽象成 Future（一张结果"欠条"）对象——同一份业务代码，线程池/进程池一键切换；谁先完成谁先出
> （`as_completed`）；worker 里炸的异常原样送到你手上。

## Background

这节讲 `concurrent.futures` 出现之前 Python 并发代码的样子、它在哪里撞墙，以及统一执行器如何应运而生。

在此之前有两条原生路：threading 的 `Thread`——手动 `start()`、`join()`，生命周期全靠自己管；multiprocessing 的 `Pool`——`map` 一次提交一批。两条路形状完全不同，代码写完就长在了各自的接口上。

撞墙点是**调度策略被焊死在业务代码里**：今天用线程池、明天想换进程池对比性能，业务代码要跟着重写；`Pool.map` 全批等齐，快任务被慢任务拖住才一起返回；worker 里抛出的异常，还得自己想办法打包带回来。

`concurrent.futures` 由 PEP 3148 提出，Python 3.2 起进入标准库：把"怎么跑"抽象成 Executor 接口，把"结果在哪"抽象成 Future 对象。业务代码只认识 `submit`/`result` 两个动词，后端是线程还是进程完全透明。

## What

这节给出 `concurrent.futures` 的定义与心智模型：两个抽象、三种能力、一个取货口。

`concurrent.futures` 是标准库的并发执行框架。Executor + Future 把三件事变成一等公民：

1. **提交**——`submit` 返回立即，不阻塞业务代码；
2. **查询**——`result(timeout=)` 随时可等可走；
3. **收集**——`as_completed` 按完成序逐个给出。

可以把一次并发提交想象成餐厅点餐拿到呼叫器：`submit()` 立刻递给你一张小票（Future），后厨（worker）开工；`result()` 是唯一取货口——取值、收异常、带超时都走这一个方法。

但和取餐呼叫器不同的是：没人去取，做坏的餐不会有人收拾——不调 `result()`，worker 的异常就永远藏在 Future 里；而且小票不能让后厨停工——`cancel()` 只对还没下锅的订单有效。

同一份业务代码指向两个后端闸门（线程池/进程池），as_completed 按完成顺序放行，异常沿 result() 原路返回。

## When to Use

这节讲什么场景值得用统一执行器、什么时候用更简单的替代，以及线程/进程两个后端怎么选。

- **批量 IO 扇出**：同时请求几百个 URL 或下游服务、谁先返回先处理谁——`submit` 一把交出去，`as_completed` 按完成序收。
- **后端可切换的计算框架**：业务逻辑写一次，开发机上用线程池、生产环境切进程池，调度代码零改动（输出 [1] 实测两种后端结果一致）。
- **要给单个任务设超时**：第三方调用可能卡死，`result(timeout=)` 让调用者先走，不再被一个坏任务拖住全局。

何时不用：

- 只有一两个后台任务、不在乎生命周期：`threading.Thread` 直接 `start`/`join` 更简单。
- 万级并发连接：每任务一线程/进程都太重，asyncio 事件循环更合适，见 [08_coroutine_loop](../08_coroutine_loop/README.md)。
- 任务均匀、要严格保序整批收：`executor.map` 一行即可，不必 submit + as_completed。

后端选择遵循负载类型：IO 密集 → 线程（等待时释放 GIL——全局解释器锁）；CPU 密集 → 进程（绕开 GIL）。

Executor 统一了接口，但**没改变底层模型**——切换后端前仍要想清楚负载类型（[14_model_benchmark](../14_model_benchmark/README.md) 会全面对决）。

同类方案对比：

| 方案 | 与 concurrent.futures 的差异 | 什么时候选它 |
|---|---|---|
| `Thread` / `Pool` 原生 API | 两套形状不同的接口，生命周期手动管理、全批等齐 | 任务数固定、不需要统一接口的极简场景 |
| `multiprocessing.Pool.map` / `imap` | 保序整批 / 流式产出，但接口自成一家 | 已深度绑定 multiprocessing 的存量代码 |
| `asyncio` 协程 | 单线程事件循环，单任务开销极小 | 万级并发 IO，见 [08_coroutine_loop](../08_coroutine_loop/README.md) |

## Quick Start

实验只依赖标准库，无需安装第三方包，完整脚本在实验目录的 `futures_executor.py`。

```bash
cd concurrency/07_futures
python3 futures_executor.py      # 四个实测小节 + 全部断言，约 3 秒
```

这段命令在做什么：脚本用同一份业务代码在两种后端间切换并验证结果一致，再逐个验证 as_completed 完成序、异常传播、result 超时三个能力，最后运行全部断言。

真实输出（节选，略去首行解释器版本横幅与末行断言汇总）：

```
========================================================
[1. 统一接口：同一份代码，线程/进程一键切换]
========================================================
  ThreadPoolExecutor     50 个任务完成，耗时 0.000s
  ProcessPoolExecutor    50 个任务完成，耗时 0.051s
  两种后端结果完全一致（50 个平方数逐项相等）——submit/result 接口与后端解耦

========================================================
[2. as_completed：谁先完成谁先出]
========================================================
  提交顺序: ['慢任务', '中任务', '快任务']（最慢的先提交）
  完成顺序: ['快任务:0.1', '中任务:0.2', '慢任务:0.3']
  对照 wait(FIRST_COMPLETED)：也以'完成'为事件单位
  FIRST_COMPLETED 先返回 1 个（j1:0.1），其余 1 个继续跑

========================================================
[3. 异常传播：类型和消息原样重现]
========================================================
  线程池: ValueError('worker 里爆炸了') 在 result() 处重现
  进程池: ValueError('worker 里爆炸了') 跨进程 pickle 传回，同样重现
  关键差异：不调 result() 异常就被吞——future 是异常的载体，也是唯一的出口

========================================================
[4. result(timeout=)：卡住的任务能被'暂时放弃']
========================================================
  result(timeout=0.2) 在 205ms 抛 TimeoutError（任务本身还要跑很久）
  注意：超时只是调用者不等了，任务线程仍在跑——取消要靠 cancel()（未启动才有效）
```

诚实预期（本机 3 次实测）：

- **§1 线程池 50 个微任务 0ms、进程池 51ms**：差值就是进程间 pickle（Python 的对象序列化机制）往返——CPU 密集大任务时进程池才赚回来
- **§2 完成顺序稳定可断言**：sleep 时长 3 倍间隔，调度抖动不会翻越；真实 IO 任务请只断言"无重复无丢失"不断言顺序
- **§4 TimeoutError 在 ~200ms 抛出**（等 205ms 是内核调度粒度）；被放弃的任务仍在后台跑完

日常用得最多的几个 API：

| API | 作用 | 一句话备注 |
|---|---|---|
| `ThreadPoolExecutor(max_workers=n)` | 线程版执行器 | IO 密集负载 |
| `ProcessPoolExecutor(max_workers=n)` | 进程版执行器 | CPU 密集；worker 须可 pickle（可序列化） |
| `executor.submit(fn, *args)` | 提交任务，立刻返回 Future | 不等执行完 |
| `future.result(timeout=None)` | 阻塞取结果，异常原样抛出 | 唯一取货口 |
| `as_completed(fs)` | 按完成顺序逐个 yield Future | 完成序 ≠ 提交序 |
| `future.cancel()` | 取消尚未开始的任务 | 运行中的撤不了（`wait` 见 How It Works 节） |

## How It Works

这节把输出里的四段现象对应到 Executor/Future 的四个机制，最后看"统一接口"在实验代码里如何落地。

### Executor 与 Future：提交与结果的解耦

`executor.submit(fn, *args)` 不执行完才返回，而是**立刻**返回 `Future`——一张"结果欠条"。`future.result()` 阻塞到就绪：正常返回值、worker 异常原样抛出、可带 `timeout=`。

输出 [1] 里两种后端"50 个平方数逐项相等"，正是因为业务代码只接触 submit/result，后端差异被 Executor 挡在门外。

### as_completed 与 wait：谁先完成谁先出

`map` 保序但全批等齐；`as_completed(futures)` 按完成顺序逐个 yield——先完成的先处理，慢任务不拖累快任务的下游。配合 `wait(fs, return_when=FIRST_COMPLETED)` 可以"来一个处理一个"。

代价：完成序不等于提交序，需要把 future 映射回业务键（`{future: tag}` 字典是标准做法）。

两者怎么选：要保序、任务均匀、全批收 → `map`（简洁）；要完成即处理、任务耗时差异大、需要对号入座 → submit + as_completed。输出 [2] 的提交序与完成序正好相反，就是这条机制的现场。

### 异常传播：不取就没有

worker 里的异常被 Future 捕获暂存，**只在 `result()` 被调用时抛出**。如果只 `submit` 不 `result`，异常连同任务结果一起人间蒸发——这是 concurrent.futures 最常见的静默 bug。

工程惯例：要么 `as_completed` 统一 `result()`，要么给每个 future 挂 `add_done_callback`（完成后自动触发的钩子）检查 `exception()`。

输出 [3] 里 `ValueError('worker 里爆炸了')` 在两种后端都原样重现——进程池一侧还是异常对象跨进程 pickle 传回的。

### timeout 与 cancel 的边界

`result(timeout=)` 只是**调用者停止等待**，任务仍在跑（线程无法被强杀——见 [01_thread_lifecycle](../01_thread_lifecycle/README.md) 的 daemon 语义：daemon 线程无法被单独终止，只能随主进程退出而消失）。

`future.cancel()` 只能取消**尚未开始**的任务（排队中的能撤，运行中的撤不了）。

真要"超时就必须停"，进程池可以 `shutdown(cancel_futures=True)`（3.9+），或者把超时做进任务内部。

输出 [4] 的 TimeoutError 在 ~200ms 抛出，而被放弃的任务仍在后台跑完——正是这条边界的现场。

### 统一接口的落地：用创建函数参数化后端

```python
factories = {
    "ThreadPoolExecutor": lambda: ThreadPoolExecutor(max_workers=4),
    "ProcessPoolExecutor": lambda: ProcessPoolExecutor(max_workers=4),
}
for name, factory in factories.items():
    results[name] = run_batch(factory, 50)
```

这段代码在做什么：把“创建哪种执行器”收进一个工厂字典（工厂函数——只负责创建并返回对象、不含业务逻辑的函数，这里字典的值就是两个创建 Executor 的 lambda），`run_batch(make_executor)` 对后端零感知——这就是“统一接口”的全部含义。切换成本从“重写调度代码”降到“换一个工厂”。

## Pitfalls & Q&A

这节收集五个常见坑（现象 + 原因 + 解法）和一个延伸问答。

### 踩坑清单

- **只 submit 不取 result**：现象是异常静默蒸发、任务白跑。原因：异常暂存在 Future 里，只有 `result()`/`exception()` 会读它。解法：`as_completed` 统一取，或 `add_done_callback` 检查 `exception()`（机制见 How It Works 节）。
- **在 as_completed 里忘了 future→业务键 的映射**：现象是完成序乱序后结果对不上号。原因：完成序不等于提交序。解法：提交时建 `{future: tag}` 字典，收结果时查表。
- **指望 cancel() 停掉运行中的任务**：现象是 `cancel()` 返回 False、任务照跑。原因：它只撤排队的。解法：把协作式取消（Event 标志）做进任务，或进程池 `shutdown(cancel_futures=True)`。
- **进程池里 submit 不可 pickle 的对象**：现象是 pickle 当场报错。原因：与 multiprocessing 同一条纪律——跨进程一切都要序列化。解法：worker 用顶层函数、参数可序列化（见 [05_mp_accel](../05_mp_accel/README.md)）。
- **ThreadPoolExecutor 里跑 CPU 密集又调 max_workers=100**：现象是不升反降。原因：GIL 下纯添乱。解法：线程数 ≈ IO 等待比例，CPU 任务 = 核数。

### 深入问答

**Q1: Future 是什么？解决什么问题？**

一张"结果欠条"：提交与获取解耦。submit 立即返回不阻塞，result() 随时取、可超时、异常原样重抛——把"等待"从业务的控制流里抽出来，变成可传递、可组合的对象。
