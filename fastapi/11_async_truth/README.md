# 11 · async def 与 def 的执行真相：一条慢等待，两条执行轨道

> FastAPI 端点函数的声明方式决定它在哪条线程上执行：async def 跑在事件循环上，普通 def 被
> 派发进线程池。读完本篇，你能用线程名与线程编号的实测输出解释两种声明的并发行为，还能
> 亲手复现一次 async def 里误写阻塞调用导致整个服务停摆的现场。

## Background

没有 async 生态的年代，Python Web 服务跑在 WSGI（Python 早年的 Web 服务器与应用之间的
同步接口标准）上，部署模型是一请求一线程：每个新到的请求占一条线程，线程里同步地读完
请求、等完数据库、写出响应。

绝大多数请求的生命周期耗在等 IO 上——等数据库返回、等下游 HTTP 接口、等文件系统。等待
期间线程不干活却照常占着 MB 级的内存栈；并发上千时线程数量暴涨，操作系统在它们之间来回
切换的开销开始挤占真正干活的 CPU 时间。

async/await 语法（Python 3.5 起）与 ASGI（WSGI 的异步后继标准）为此而生：服务进程用一条
事件循环线程（单线程调度器，下节展开）照看成千上万个等待中的请求，必须真并行的同步代码
再交给线程池补位。

## What

**定义**：async def 与 def 是 FastAPI 端点函数（处理某个路由的函数，下同）的两种声明，
决定函数体在哪条线程上执行。async def 跑在事件循环（event loop，单线程调度器）上；普通
def 被派发进线程池（一组备好的工作线程，由异步库 anyio 管理）。

可以把事件循环想象成一位**单线程调度员**：所有 async def 端点都是她手上的工单，遇到
`await` 就挂起当前工单、转头处理下一张。线程池则像一支**外包工队**：def 端点的工单整张
外包出去，调度员不等结果。

但和真实调度员不同，这位调度员只在工单明确交还控制权（`await`）时才放手——工单里没有
`await`，她就攥着做到底，阻塞调用正是这种工单。工队也受 GIL（全局解释器锁，同一时刻只
允许一条线程执行 Python 字节码）约束，重计算的外包单提速有限。

落到本实验：`/io-async` 是调度员工单，`await asyncio.sleep(0.3)`（asyncio 是标准库的
异步工具箱）一让出，她就处理后续请求；`/io-def` 是外包单，`time.sleep(0.3)` 睡在 worker
线程上。20 个并发请求于是都能在约 0.33s 内完成。

下图把两类端点各自的家与停摆路径画在一起：上半是事件循环，下半是线程池，紫色虚线是反面教材 /blocking 的波及路径（红色框即 /blocking 节点）。

![Lab 11 · 两类端点的执行位置与停摆路径](images/async_truth.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/11_async_truth/images/async_truth.html)
> （或本地打开 [`images/async_truth.html`](images/async_truth.html)）。

## When to Use

端点要等下游 IO 时选 async def——用异步数据库驱动、`httpx.AsyncClient` 调外部接口、收发
消息队列，单条循环线程就能带起大量并发等待。函数体只有同步库可用时选普通 def——老版
ORM、requests、重型 SDK 都被安全隔进线程池，阻塞不到循环。

何时不用：纯 CPU 计算（图像处理、大 JSON 序列化）两种声明都救不了，前者照样停摆循环，
后者占满线程池额度，应改用进程池或任务队列；内部低流量服务两种写法的差距测不出来，选
团队读得懂的那种。

| 维度 | async def 端点 | def 端点 |
|:--|:--|:--|
| 执行位置 | 事件循环线程（主线程） | anyio 线程池的 worker 线程 |
| IO 并发手段 | `await` 让出控制权，轮流执行 | 一请求占一条 worker 线程 |
| 容量 | 同一条线程轮流，无额度 | 默认 40 枚令牌（线程池的并发额度，见 How It Works），超出排队 |
| 典型误用 | 混入阻塞调用，循环停摆 | 想用 `await`，语法错误 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（Python 3.13、fastapi、uvicorn、httpx、anyio），未创建则先在
仓库根执行 `./scripts/load_resources.sh`。

演示应用在本目录 `main.py`，端口 8911，由 uvicorn（把应用跑成 HTTP 服务的 ASGI 服务器）
托管。6 个端点：`/io-async`、`/io-def`、`/blocking`、`/healthz`、`/thread-names`、
`/pool-limit`。

```bash
cd fastapi/11_async_truth && ./11_async_truth.sh demo
```

demo 共 4 步：

1. 并发 20 发 `/io-async` 与 `/io-def`，对比总耗时、线程名集合、去重线程数；
2. 读 `/pool-limit`，打印 anyio 线程池默认容量 40；
3. 先测空闲 `/healthz` 基线，再并发 3 发 `/blocking` 加 1 发 `/healthz`，实测停摆；
4. 打印结论表，读 `/thread-names` 看进程累积见过的线程名。

真实输出（节选，`...` 处省略了中间输出）：

```text
    $ 20 个并发 GET /io-async
        总耗时      0.328s (服务端单次 elapsed 0.302~0.303s)
        线程名集合  ['MainThread']
        去重线程数  1 (按 thread_ident 去重)
    ...2 行 PASS 省略...
        [PASS] 线程名集合 ['MainThread'] == ['MainThread'] —— 全部跑在事件循环线程
...
    $ 20 个并发 GET /io-def
        总耗时      0.339s (服务端单次 elapsed 0.303~0.310s)
        线程名集合  ['AnyIO worker thread']
        去重线程数  20 (按 thread_ident 去重)
...
    GET /blocking -> 线程 MainThread, 服务端 elapsed 1.003s, 客户端延迟 1.006s
...
    GET /healthz  -> 客户端延迟 2.825s (它出发时 3 个阻塞任务已占住循环)
    ...2 行 PASS 省略...
        [PASS] healthz 延迟 2.825s > 1.5s —— 被阻塞任务卡住, 循环停摆现场成立
```

诚实预期（本机三次实测，复现命令即上面的 demo，机器不同数值会浮动）：两版 20 并发总耗时
均落在 0.32~0.35s；空闲 `/healthz` 约 2~20ms（启动后首个请求有预热尖峰，其余约 2~4ms），
停摆后涨到约 2.8s。断言阈值（<1s、>1.5s）已为慢机器留了余量。

## How It Works

执行位置由声明一锤定音：async def 端点的协程（coroutine，可挂起再恢复的函数）直接在
事件循环上被驱动；def 端点则被 Starlette（FastAPI 底层的路由分派框架层）包一层
`run_in_threadpool`，交给线程池执行。

```python
@app.get("/io-def")
def io_def() -> dict[str, Any]:
    started = time.perf_counter()
    who = _snapshot()     # 在哪个线程执行？答案：AnyIO worker thread（线程池工作线程）
    time.sleep(IO_WAIT)   # 阻塞的是 worker 线程，不是事件循环
    ...
```

demo [1] 的两条轨道互相印证：async 版 20 个请求的 `thread_ident` 去重后只有 1 个——同一条
主线程轮流让出；def 版去重后有 20 个——`time.sleep` 不让出，anyio 只好每人发一条 worker，
线程名却都叫 "AnyIO worker thread"。

线程池的容量按令牌计：每个 def 端点执行前借一枚、执行完归还。默认 40 枚（anyio 4.x 的
缺省值，即 `/pool-limit` 读到的 `total_tokens`），第 41 个并发 def 请求排队等令牌，而
不是无限制地开新线程。

停摆机理看 `/blocking`：协程体在循环线程上同步执行，`time.sleep(1)` 期间循环既读不了
新请求、也驱动不了其他协程。三条 1s 的等待因此首尾相接占满约 3s，0.2s 后出发的
`/healthz` 被压到最后——实测延迟 2.825s，就是它排队等循环腾出手的时长。

## Pitfalls & Q&A

- **async def 里混入阻塞调用**：现象是全线周期性变慢、`/healthz` 超时（demo [3] 的 2.8s
  即现场）。原因：阻塞代码占住循环线程，全进程请求排队。解法：改成 def，或用
  `asyncio.to_thread` 把阻塞段外包给线程池。
- **def 端点里想 `await asyncio.sleep`**：`await` 只能写在 async 函数里，直接写是语法
  错误；写不带 await 的 `asyncio.sleep(1)` 则什么也不等——协程对象即刻被丢弃，仅收到
  RuntimeWarning。解法：要异步等待就改 async def；def 里老实用 `time.sleep`。
- **把 CPU 密集当 IO 等待**：`await` 救不了计算——async def 里跑 1s 的纯循环同样停摆
  循环，def 版则占死一条 worker。解法：进程池（`ProcessPoolExecutor`）或任务队列。
- **线程名会误导**：anyio 给所有 worker 起同一个名字，20 条线程在输出里只是同一个
  "AnyIO worker thread"；数线程要靠 `thread_ident` 去重（demo 的做法）。worker 还会被
  复用与闲置回收，线程数稳定在额度内，不随请求数无界增长。
- **Q：40 枚令牌耗尽会怎样？** 第 41 个 def 请求排队，延迟 = 等令牌 + 执行；与循环停摆
  的区别是 `/healthz` 不受影响——循环还活着。需要调大时在启动处设
  `anyio.to_thread.current_default_thread_limiter().total_tokens = 100`。
- **Q：def 端点有没有可能跑回主线程？** 实测没有：demo [1] 里 20 并发 def 的线程名集合
  不含 MainThread。FastAPI 对 def 端点一律走线程池，不存在主线程快速路径。
- **Q：uvicorn 换成 `--workers 4` 会怎样？** 变成 4 个进程，各有一条事件循环、各一个
  40 额度线程池；`/thread-names` 记录的是单进程内的集合，四个进程互不可见。
