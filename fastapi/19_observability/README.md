# 19 · 中间件与可观测性：洋葱、耗时与一个贯穿请求的 id

> FastAPI 的中间件（middleware：包在所有路由外侧、每个请求进出各经过一次的函数层）
> 是挂横切关注点的标准位置。读完本篇，你能给应用装上 request_id 与耗时测量两层，
> 让响应头、服务端日志、错误响应共享同一个追踪 id。

## Background

没有这层机制时，观测逻辑只能复制粘贴进每个端点函数：测耗时就首尾各写一次计时，
要日志就手动把请求参数拼进每条消息，十几个端点就有十几份大同小异的代码。

痛点在出事之后。线上反馈"下单慢"，你去翻服务端日志：几百行混在一起，
分不清哪几行属于这次请求，各端点的日志格式还不一致，无从 grep。
出了事没有现场，也没有能把客户端报障与服务端日志串起来的凭据。

这类需要跨全部端点生效、又与业务无关的逻辑（横切关注点）因此被抽到统一的层：
请求进来时生成一个追踪 id，写进 contextvars（标准库 `contextvars`，
按 asyncio 任务隔离的变量存储），日志与错误响应都带上它。
lab 04 错误信封的 `request_id` 字段，数据正来自这套机制。

## What

**定义**：中间件是一种包在 ASGI 应用（ASGI：Python 异步 Web 应用的接口约定，
uvicorn——把应用跑成 HTTP 服务的服务器——按它调用应用）外侧的层，
请求进入与响应离开时各执行一次。

可以把中间件栈想象成一颗洋葱：请求从外皮一层层剥到芯（端点函数），
响应再原路包回去。但和真洋葱不同的是：每层都是可编程函数，
在读请求、写响应两头各有一次做事的机会。

本篇的两层中间件：

| 层 | 注册时机 | 进入时 | 离开时 |
|:--|:--|:--|:--|
| request_id（外层） | 后注册 | 生成 uuid 短码，set 进 contextvar | 响应头回显 `X-Request-ID` |
| timing（内层） | 先注册 | `perf_counter`（单调高精度时钟）开始计时 | 耗时写入 `X-Process-Time-ms` |

时序图的上下两段就是洋葱的进入与离开：外层 request_id 先入后出，内层 timing 后入先出，端点函数在最里层。

![Lab 19 · 中间件洋葱：request_id 外层，timing 内层](images/observability.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/19_observability/images/observability.html)
> （或本地打开 [`images/observability.html`](images/observability.html)）。

## When to Use

什么时候值得挂中间件，三个典型场景：

- 每个请求都要做的事：发追踪 id、统一计时、注入安全响应头；
- 访问日志：一行日志记下方法、路径、状态码与耗时；
- 认证：进业务逻辑前统一校验令牌，拒绝的响应不必走到路由。

何时不用：只作用于个别端点的逻辑——比如只有下单接口要限流——
写成依赖（`Depends`）更合适。中间件包住全部路由，每个请求都付一次执行成本，
用范围换普适时才算划算。

| 手段 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 中间件 | 同时看得到请求与响应，包住全部路由 | 每个请求都要做的事：发号、计时、统一响应头 |
| 依赖（Depends） | 只在匹配到的路由内执行，可按路由取舍 | 单个或一组路由的鉴权、取参、一次性判断 |
| 后台任务 | 响应发出后才执行，摸不到响应对象 | 响应之后的收尾：发通知、写统计 |

## Quick Start

前置：fastapi 目录 `.venv`（未创建则先在 fastapi 目录执行 `fastapi/scripts/load_resources.sh`），
无其他依赖；演示应用是同目录 `main.py`，端口 8919。

```bash
cd fastapi/19_observability && ./19_observability.sh demo
```

真实输出示例（节选；uuid 短码每次运行都不同，日志行数固定）：

```text
---- [2/6] request_id 贯穿: 响应头与服务端日志是同一个 id
    第 1 次 GET /slow   ->  HTTP 200，响应头 X-Request-ID = b297d8733f15
        服务端日志中带 [b297d8733f15] 的 6 行：
          [b297d8733f15] [rid-in]  外层中间件进入：request_id 已生成并写入 contextvar
          ...
          [b297d8733f15] [rid-out] 外层中间件离开：X-Request-ID 已写入响应头
        [PASS] 同一 id 在服务端日志串起 6 行（两中间件进出 4 行 + slow 端点 2 行 = 6）
...
    GET /slow   ->  X-Process-Time-ms = 301.9（X-Request-ID = fe5c05c7e0d6）
    GET /orders ->  X-Process-Time-ms = 0.2
...
        [PASS] 完整洋葱序列 ['rid-in', 'timing-in', 'timing-out', 'rid-out']
```

诚实预期：`/slow` 的耗时实测约 302ms（301.9~302.5，下限由 `asyncio.sleep(0.3)`
决定）；`/orders` 实测约 0.2ms，远低于脚本 50ms 的断言上限。
脚本共 6 章 15 项断言，`./19_observability.sh all` 全绿。

## How It Works

先把两件观测对上号：输出里响应头与服务端日志是同一个 id，来自外层中间件
set 进 contextvar 后、全链路统一从它取值；洋葱序列里进入 rid 先、离开 timing 先，
来自注册顺序与洋葱层次的对应关系。

### 注册顺序与洋葱层次是反的

`add_middleware` 的实现是 `user_middleware.insert(0, ...)`，把新中间件插到列表头；
`build_middleware_stack` 构建时再 `reversed` 依次包裹。两步合成的规则：
**后注册的 `@app.middleware` 在更外层**。

所以本篇想让 request_id 当最外层，代码里反而要把它写在后面：timing 先注册、
rid 后注册。实测日志给出铁证——进入顺序 `rid-in -> timing-in`，
离开顺序 `timing-out -> rid-out`，谁先谁后与"注册书写顺序"相反。

### contextvars 为什么并发下不串号

uvicorn（demo 脚本启动的服务器）为每个请求开一个独立的 asyncio 任务，
任务持有自己的 context 拷贝，`ContextVar.set` 只改自己任务里的这份。
并发 100 个请求就是 100 份互不可见的 id，读到的永远是当前请求的。

普通全局变量做不到：它全进程只有一份，并发时后到的请求会覆盖先到的，
日志张冠李戴。set 过的值还会随任务派生向内传递——内层中间件与端点函数
读到的正是外层刚 set 的那个 id，这就是"贯穿"的机制本源。

### BaseHTTPMiddleware 的代价

`@app.middleware("http")` 的本质是 Starlette 的 BaseHTTPMiddleware——
把 ASGI 调用包装成 request/response 风格的通用基类，每层会在
anyio 任务组里多一次流转发。

纯 ASGI 中间件（直接实现 `async def __call__(self, scope, receive, send)`）
没有这层包装，吞吐更高。热路径上的计时、限流值得换写法，对比见 lab 23。

## Pitfalls & Q&A

- **在 `call_next` 之前改响应**：`response` 是 `await call_next(request)` 的返回值，
  之前它不存在。现象：加了头却没生效或直接报错。解法：所有对响应的修改写在
  `call_next` 之后、`return response` 之前，本篇两层中间件都是这个顺序。
- **中间件顺序记反**：以为先注册的在更外层，把 rid 写在前面，结果是内层 timing
  先进入、外层 rid 后进入，全部顺序颠倒。解法：记住"后注册在外层"，
  拿 demo 第 4 章的标记行实测验证，不靠背。
- **耗时测量包含了下游**：timing 量的是 `call_next` 内侧的全部——更内层的
  中间件加端点函数。想单测端点自身，得在端点里自己计时；它也不含客户端到
  服务器的网络时间，与压测工具看到的延迟数值不同源。
- **后台任务里读不到 id**：在脱离请求链的任务（如启动时创建的 worker）里读
  contextvar，拿到的是默认值 `-`。contextvar 只在"这条请求的任务树"内有效，
  跨出去就显式把 id 作为参数传。

问答：

- **Q：404 也有 id，靠的是什么？** 中间件包住的是整个路由与异常处理层，
  不存在的路径同样穿过两层洋葱，离开时照样回显响应头。客户端报障带上它，
  服务端 `grep <id>` 一次捞出这次请求的全部日志行。
- **Q：id 能由调用方指定吗？** 可以，常见做法是优先读请求头里已有的
  `x-request-id`（网关可能已生成），没有才自己生成：一行
  `request.headers.get("x-request-id") or uuid.uuid4().hex[:12]`。
- **Q：contextvars 与线程局部变量（threading.local）选哪个？** 异步场景必须
  前者。asyncio 在一条线程上轮流执行多个请求，线程局部变量会互相覆盖；
  contextvars 按任务隔离，才是异步时代的正确粒度。
- **Q：两层各自减一层行不行？** 行，两个关注点也可以合并进一个中间件函数。
  拆开的理由是可组合：计时的层可以单独摘掉，发号的层能原样搬去下一个项目。
