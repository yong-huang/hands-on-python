# 12 · 后台任务三形态：响应之后的活，交给谁、干砸了谁知道

> Web 响应应当尽快返回，发邮件这类慢活不该让用户干等。本篇对比三种"响应之后
> 继续干活"的机制——BackgroundTasks、asyncio.create_task、进程内任务队列——实测
> 各自的执行时序、异常去向与可靠性边界，读完后能按场景选出匹配的形态。

## Background

注册成功后要发一封欢迎邮件：SMTP（发送邮件的网络协议）实测要 0.5 秒以上。把发送
代码直接写进端点函数，这 0.5 秒会原样加进用户等待，而用户并不关心邮件是否此刻送达。

先回响应、再发邮件是显然的改进方向。问题随之而来：这段延后的代码在哪里执行？
异常谁看得见？进程重启后没干完的活去哪找？三个问题划出各机制的可靠性边界，
也是三形态的真实分野。

FastAPI 与 asyncio（Python 标准库的异步 I/O 框架）各自内置了轻量答案，更重的
场景交给专职任务队列（如 Celery）。三者的取舍构成本篇正文。

## What

**BackgroundTasks**：FastAPI 内置的响应后执行机制——端点函数用
`background_tasks.add_task(函数, 参数)` 登记工作，响应体发送完后由
Starlette（FastAPI 底层的 ASGI 框架，ASGI 是异步 Web 应用的标准接口）在同一进程按登记顺序逐个执行。

**create_task 形态**：`asyncio.create_task(协程)` 把工作立即调度到事件循环
（asyncio 推进协程的单线程循环；协程即可暂停的函数调用）上，不等响应发送；
返回的 Task 对象（任务句柄，持有状态与异常）无人 await，即 fire-and-forget（发起后不再过问）。

**队列形态（演示版）**：端点把工作投进 asyncio.Queue（进程内的先进先出队列），
常驻 worker（在 lifespan——应用启动与关闭时各执行一次的钩子——里启动的消费任务）
逐件取用执行；outbox（本实验记录已完成"邮件"的进程内列表）供观察与断言。

可以把三种形态想象成会议结束后的交接：BackgroundTasks 是散会后留堂，主持人送走
参会者后按登记顺序收尾；create_task 是把便签拍给同事就转身走人；队列是传送带，
工人一件一件取活。

失效边界：三者都活在进程内存里，进程一重启，登记簿、便签与在途活件一并消失。

三条泳道各走一种形态：都从"202 立即返回"进入，到各自的证据或边界出口；红色节点标出 create_task 的静默异常与队列的重启丢失，BackgroundTasks 的异常去向见青色节点。

![Lab 12 · 后台任务三形态：执行时机与异常去向](images/background_tasks.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/12_background_tasks/images/background_tasks.html)
> （或本地打开 [`images/background_tasks.html`](images/background_tasks.html)）。

## When to Use

典型场景的共同点是：工作与本次响应的内容无关、失败可容忍、耗时明显长于正常响应。

- 注册、下单成功后发通知邮件或短信；
- 响应返回后写审计日志、上报埋点；
- 请求触发的缩略图生成、缓存预热。

何时不用：用户需要拿到工作结果时（上传后要回显处理结果）就该同步做或提供任务查询端点；工作量大、不允许丢、需要失败重试与高峰缓冲时，直接上外部队列。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| BackgroundTasks | 框架内置，零设施，无重试 | 单请求后的轻量追加工作 |
| create_task | 立即调度，可并发多个 | 请求上下文之外发起的并发工作 |
| 进程内队列 | 有高峰缓冲与串行化，重启即丢 | 单进程内把突发请求排队缓冲、逐件处理（仅演示用，不能跨进程、重启即丢） |
| 外部队列（Redis/Celery） | 跨进程持久化、重试、可观测 | 生产环境的可靠投递 |

## Quick Start

前置：仓库根有 `.venv`（Python 3.13.9、fastapi 0.142.2、uvicorn（把 ASGI 应用跑成
HTTP 服务的服务器）0.54.0、httpx）；未创建则先在仓库根执行
`./scripts/load_resources.sh`。

演示应用为本目录 `main.py`：三个 notify-*、两个 fail-*、GET /outbox、
POST /reset，端口 8912。

```bash
cd fastapi/12_background_tasks && ./12_background_tasks.sh demo
```

真实输出示例（节选）：

```text
---- [2/6] BackgroundTasks: POST 立即 202, '邮件'约 0.5s 后才落进 outbox
    $ httpx -X POST /notify-bg -d '{"to":"alice@example.com"}'   =>   HTTP 202
    ...响应体 JSON 与 2 行 PASS 省略...
    [PASS] 落账晚于 accepted_at >= 0.4s(sleep 0.5 在响应之后才跑)
    时序差: 0.503s
    ...章节 [3][4] 省略: task 同样时序; 队列 3 件投递, FIFO, 相邻间隔 0.5s/0.503s...
---- [5/6] 异常去向实测: 同样抛 RuntimeError, 两种形态各去往何处
    $ httpx -X POST /fail-bg -d '{"to":"fb@example.com"}'   =>   HTTP 202
    [PASS] (a) 客户端照常收到 202(异常发生在响应发送之后)
    ...日志摘录(完整 traceback 约 40 行, 中间省略):
        File ".../starlette/responses.py", line 172, in __call__
          await self.background()
        ...
        RuntimeError: 邮件 m#6 发送失败（实验性异常）
    ...echo 与 (b) 段 202 响应省略...
    [PASS] (b) 1.2s 后 outbox 仍无该记录 —— '静默'本身就是要断言的现象
    ...1 行 PASS(请求管线异常仍只有 1 条)与 never-retrieved 日志摘录省略...
    [PASS] (b) 日志出现 'Task exception was never retrieved' + 该 RuntimeError
  演示完成: 24 项断言全部通过
```

诚实预期：多次实测时序差约 0.50s（0.500~0.503s 浮动，阈值 0.4s 留负载余量）。

"Task exception was never retrieved" 由垃圾回收触发，多次实测均出现但有滞后可能。
结论限实测版本（fastapi 0.142.2 / starlette 1.7.0 / Python 3.13.9）。

## How It Works

`add_task` 不启动任何工作，只把函数与参数存进响应对象；响应体发送完毕后，
Starlette 调用 `await self.background()` 逐个执行。

demo [5] (a) 的 traceback（异常的堆栈回溯）倒数几行正是 starlette/responses.py
的这一行——输出里的 "Exception in ASGI application" 就来自这里：异常发生在
请求管线内部，由 uvicorn 记进服务端日志。

async 任务直接在事件循环上 await，同步函数被派进线程池（starlette 的
background.py 按 is_async 分流）。Task 对象是唯一的异常容器，demo [2] 中
登记工作与保留引用的写法如下：

```python
task = asyncio.create_task(send_email(job))  # 立即调度, 返回句柄
TASKS.add(task)                              # 强引用: 防任务被垃圾回收
task.add_done_callback(TASKS.discard)        # 结束后自动移出集合
# 无人 await: 异常只躺在 task.exception() 里
```

demo [5] (b) 实测：RuntimeError 不出现在请求管线日志里；直到 Task 对象被垃圾回收
（GC，解释器回收不再被引用的对象），asyncio 才补一条"Task exception was never retrieved"——该异常唯一的痕迹。

队列形态的可靠性来自 worker 的消费循环：

```python
async def queue_worker() -> None:
    while True:
        job = await QUEUE.get()      # 无活可干时挂起, 不空转
        try:
            await send_email(job)
        except Exception: ...        # worker 是唯一看异常的人: 记录后继续, 不让循环死亡
        finally:
            QUEUE.task_done()
```

worker 在 lifespan 里以 create_task 启动，关闭时被 cancel。输出里"相邻完成间隔:
0.5s / 0.503s"就来自这个串行循环：每件 0.5s、后一件等前一件完工，先进先出（FIFO）顺序与投递顺序一致。

## Pitfalls & Q&A

- **create_task 的异常静默**：响应 202 后无任何记录（demo [5] (b)）；异常存于
  Task 对象，无人 await 就无人取。解法：自留引用，done_callback 里检查
  `task.exception()` 并记日志告警。
- **不留引用的任务会中途消失**：事件循环对运行中的 Task 只持弱引用（不阻止垃圾
  回收的引用），任务可能跑到一半被回收。解法：模块级集合保存句柄，结束后移出。
- **任务里的阻塞调用拖慢所有请求**：async 任务里写 `time.sleep` 会占住事件循环，期间
  所有请求排队——机理同 lab 11 `/blocking` 的实测现场；同步函数任务走线程池，不影响循环。
  解法：async 任务用 `asyncio.sleep`，同步库写成同步函数任务或交线程池。
- **进程重启丢任务**：登记与在途工作都在进程内存里，重启即丢；`--workers N`
  多进程时每进程各持一份队列与 outbox。解法：可靠投递换外部队列，状态放外部存储。
- **worker 循环没兜异常**：一次未捕获异常会杀死常驻 worker，队列静默积压且无报错。
  解法：循环体 try/except 兜底，`task_done()` 放进 finally。
- **Q：三种形态怎么选？** 响应后的单件轻量工作选 BackgroundTasks；非请求上下文
  （lifespan、WebSocket）发起并发工作选 create_task（自兜异常）；要缓冲或串行化选队列；可靠投递上外部队列。
- **Q：BackgroundTasks 失败了能重试吗？** 不能。机制上没有重试与失败登记（demo
  里 outbox 的 failed 标记是工作函数自己写的，框架不代劳），需要重试就投队列。
