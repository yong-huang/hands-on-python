# 07 · concurrent.futures 统一执行器：Future 一等公民

> 前两篇学了两套 API（threading 的 Thread、multiprocessing 的 Pool），切换后端就要
> 重写调度代码。`concurrent.futures` 把"怎么跑"抽象成 Executor 接口，把"结果在哪"
> 抽象成 Future 对象——同一份业务代码，线程池/进程池一键切换；谁先完成谁先出
> （`as_completed`）；worker 里炸的异常原样送到你手上。

## 1. 为什么需要它

原生 API 的问题不是不能用，而是**把调度策略焊死在业务代码里**：Thread 要手动管理生命周期，Pool.map 要全批等齐。Executor + Future 把三件事变成一等公民：提交（`submit` 返回立即）、查询（`result(timeout=)` 随时可等可走）、收集（`as_completed` 按完成序）。本实验用同一份业务代码在两种后端间切换并验证结果一致，再逐个验证 Future 的三大能力。

## 2. 总览：核心机制一图看懂

![concurrent.futures：统一执行器](images/futures_executor.archify.svg)

一句话心智模型：**submit() 立刻返回一个 Future（"欠条"），result() 是唯一取货口——取值、收异常、带超时都走这一个方法**。看图：同一份业务代码指向两个后端闸门（线程池/进程池），欠条从两边汇到同一个收集口；as_completed 按完成顺序放行，异常沿 result() 原路返回。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/concurrency/07_futures/images/futures_executor.archify.html)
> （或本地打开 [`images/futures_executor.archify.html`](images/futures_executor.archify.html)）。

## 3. 快速开始

```bash
cd concurrency/07_futures
python3 futures_executor.py      # 四个实测小节 + 全部断言，约 3 秒
```

真实输出（macOS, CPython 3.13.9）：

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

- **§1 线程池 50 个微任务 0ms、进程池 51ms**：差值就是进程间 pickle 往返——CPU 密集大任务时进程池才赚回来
- **§2 完成顺序稳定可断言**：sleep 时长 3 倍间隔，调度抖动不会翻越；真实 IO 任务请只断言"无重复无丢失"不断言顺序
- **§4 TimeoutError 在 ~200ms 抛出**（等 205ms 是内核调度粒度）；被放弃的任务仍在后台跑完

## 4. 核心概念

### 4.1 Executor 与 Future：提交与结果的解耦

`executor.submit(fn, *args)` 不执行完才返回，而是**立刻**返回 `Future`——一张"结果欠条"。`future.result()` 阻塞到就绪：正常返回值、worker 异常原样抛出、可带 `timeout=`。业务代码只认识 submit/result 两个动词，后端是线程还是进程完全透明——项目 15 的下载器就是靠这一点做到 `--model` 一键切换。

### 4.2 as_completed vs map：两种收集哲学

`map` 保序但全批等齐（项目 5）；`as_completed(futures)` 按完成顺序逐个 yield——先完成的先处理，慢任务不拖累快任务的下游。配合 `wait(fs, return_when=FIRST_COMPLETED)` 可以"来一个处理一个"。代价：完成序不等于提交序，需要把 future 映射回业务键（`{future: tag}` 字典是标准姿势）。

### 4.3 异常传播的陷阱：不取就没有

worker 里的异常被 Future 捕获暂存，**只在 `result()` 被调用时抛出**。如果只 `submit` 不 `result`，异常连同任务结果一起人间蒸发——这是 concurrent.futures 最常见的静默 bug。工程惯例：要么 `as_completed` 统一 `result()`，要么给每个 future 挂 `add_done_callback` 检查 `exception()`。

### 4.4 timeout 与 cancel 的边界

`result(timeout=)` 只是**调用者停止等待**，任务仍在跑（线程无法被强杀——项目 1 的 daemon 语义）；`future.cancel()` 只能取消**尚未开始**的任务（排队中的能撤，运行中的撤不了）。真要"超时就必须停"，进程池可以 `shutdown(cancel_futures=True)`（3.9+），或者把超时做进任务内部。

## 5. 关键代码解析

**为什么 executor 用工厂函数参数化？**

```python
factories = {
    "ThreadPoolExecutor": lambda: ThreadPoolExecutor(max_workers=4),
    "ProcessPoolExecutor": lambda: ProcessPoolExecutor(max_workers=4),
}
for name, factory in factories.items():
    results[name] = run_batch(factory, 50)
```

`run_batch(make_executor)` 对后端零感知——这就是"统一接口"的全部含义。切换成本从"重写调度代码"降到"换一个工厂"。项目 14 的四模型对决、项目 15 的下载器都复用这个形状。

坑清单：

- **只 submit 不取 result**：异常静默蒸发，任务白跑
- **在 as_completed 里忘了 future→业务键 的映射**：完成序乱序后对不上号
- **指望 cancel() 停掉运行中的任务**：它只撤排队的；运行中的要么等，要么把协作式取消（Event）做进任务
- **进程池里 submit 不可 pickle 的对象**：与项目 5 同一条纪律——worker 顶层函数、参数可序列化
- **ThreadPoolExecutor 里跑 CPU 密集又调 max_workers=100**：GIL 下纯添乱，线程数 ≈ IO 等待比例，CPU 任务 = 核数

## 6. 文件结构

```
07_futures/
├── README.md                            # 本教程文档
├── futures_executor.py                  # 主演示脚本：统一接口/as_completed/异常/超时
└── images/
    ├── futures_executor.archify.json    # 图源（typed JSON IR，可编辑重渲染）
    ├── futures_executor.archify.html    # 交互示意图（浏览器打开）
    └── futures_executor.archify.svg     # 双主题矢量图（本 README §2 内嵌）
```

`futures_executor.py` 内容：`demo_unified()` 双后端一致性（验收点 1）/ `demo_as_completed()` 完成序收集（验收点 2）/ `demo_exception()` 异常传播（验收点 3）/ `demo_timeout()` 超时保护。

## 7. 面试要点

**Q1: Future 是什么？解决什么问题？**
一张"结果欠条"：提交与获取解耦。submit 立即返回不阻塞，result() 随时取、可超时、异常原样重抛——把"等待"从业务的控制流里抽出来，变成可传递、可组合的对象。

**Q2: map 和 submit+as_completed 怎么选？**
要保序、任务均匀、全批收 → map（简洁）；要完成即处理、任务耗时差异大、需要对号入座 → submit+as_completed。后者是流式消费的标准形。

**Q3: worker 里的异常去哪了？**
暂存在 Future 里，result() 调用时在调用方原样抛出（跨进程经 pickle 送回）。不调 result 就静默丢失——所以生产代码里每个 future 必须有出口（result 或 add_done_callback）。

**Q4: 什么时候用 ThreadPoolExecutor，什么时候用 ProcessPoolExecutor？**
IO 密集 → 线程（等待时释放 GIL）；CPU 密集 → 进程（绕开 GIL）。Executor 统一了接口，但**没改变底层模型**——切换后端前仍要想清楚负载类型（项目 14 会全面对决）。

**Q5: future.cancel() 为什么经常返回 False？**
它只能取消还在排队、没进 worker 的任务；已在运行的线程任务无法强杀（Python 没有杀线程的安全手段）。要"运行中可取消"，把检查停止标志的逻辑做进任务内部。

## 8. 总结

1. **Executor 统一接口**：submit/result 与后端解耦，线程/进程一键切换且结果一致
2. **Future 是欠条**：值、异常、超时全走 result() 一个出口
3. **as_completed 按完成序收集**：慢任务不再拖累全批
4. **异常必须有人认领**：不取 result 就静默蒸发
5. **cancel 只撤队队的**：运行中的任务要靠协作式取消

下一篇进入 [08 · 协程与事件循环机制](../08_coroutine_loop/README.md)——切换到 asyncio 世界：单线程如何并发，await 到底让出了什么。
