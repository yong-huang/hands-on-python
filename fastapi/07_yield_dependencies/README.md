# 07 · yield 依赖与生命周期：把一个函数掰成 setup 与 teardown 两半

> FastAPI 的 yield 依赖让一个函数在 yield 前做预备（setup）、yield 后做收尾
> （teardown），时机与顺序由框架保证。读完本篇，你能解释 teardown 相对响应发送的
> 精确位置、端点异常如何穿越 yield 点，以及 teardown 抛异常时客户端与服务端日志各自的表现。

## Background

先看没有它时怎么管理"请求级资源"。一个写数据库事务的端点要自己完成全套动作：拿连接、
发 BEGIN、跑业务、成功 COMMIT、出错 ROLLBACK、finally 里归还连接。

```python
conn = pool.acquire()
try:
    conn.execute("BEGIN"); do_business(conn); conn.execute("COMMIT")
except Exception:
    conn.execute("ROLLBACK"); raise
finally:
    pool.release(conn)     # 漏写这一行 = 连接泄漏
```

痛点在复制：第二个、第三个事务端点把这段样板再抄一遍；漏写 finally 就泄漏连接；
同时管连接和锁时，try 层层嵌套，业务被埋在缩进中间。

FastAPI 的应对是把样板交给依赖系统：依赖函数允许写成生成器（generator，带 yield
关键字的函数，调用后返回可逐步推进的生成器对象），yield 之前当预备、之后当收尾。

## What

**定义**：yield 依赖是函数体里带 yield 的依赖函数——FastAPI 调用它、把 yield 出去的值
作为端点参数注入（依赖注入：端点只声明需要什么，由框架准备好再传入），请求收尾时再回到
函数里执行 yield 之后的代码。

可以把 yield 依赖想象成**会展搭建队**：先进场布展（yield 前），展会开放（端点函数），结束后
进场撤展（yield 后），无论展会期间出了什么事撤展队都会进场。失效边界：撤展时机不由搭建队
决定——正常路径在响应发送之后，异常路径在错误响应发送之前。

| 阶段 | 执行的代码 | 触发时机 |
|:--|:--|:--|
| setup | yield 之前 | 依赖解析时，端点运行前 |
| 端点函数 | 端点本体 | 全部 setup 完成后 |
| teardown | yield 之后 | 响应发送后；端点异常时在错误响应发送前 |

下图把这个生命周期按时间轴展开：上半段是正常路径（setup 按声明顺序、teardown
后进先出且晚于响应发送），下半段是失败路径（端点异常从 yield 点穿回两个生成器，
teardown 抢在错误响应之前跑完）。

![Lab 07 · yield 依赖生命周期与异常穿越](images/yield_dependencies.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/fastapi/07_yield_dependencies/images/yield_dependencies.html)
> (或本地打开 [`images/yield_dependencies.html`](images/yield_dependencies.html))。

## When to Use

三个典型场景，共同点是"有借有还"：

- 事务边界：yield 前 BEGIN，yield 后按端点成败分流 COMMIT / ROLLBACK；
- 资源借还：数据库连接、临时文件、分布式锁的获取与释放；
- 请求级旁路：审计记录、性能打点这类"无论成败都要收尾"的工作。

何时不用：只准备、不清理的逻辑（取当前用户、读配置）用普通依赖就够；跨请求的初始化
（连接池、加载模型）归 lifespan（应用启动与关闭时各执行一次的钩子）管。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 普通依赖 | 只有 setup | 取当前用户、读配置 |
| yield 依赖 | setup + teardown，每请求一对 | 事务、资源、审计 |
| 中间件 | 包住所有请求，与端点解耦 | 全站计时、统一日志头 |
| lifespan | 应用级，启动/关闭各一次 | 连接池、后台任务 |

## Quick Start

前置：仓库根有 `.venv`（Python 3.13.9、fastapi 0.142.2、uvicorn（把应用跑成 HTTP
服务的 ASGI 服务器）0.54.0、httpx）；未创建则先在仓库根执行
`./scripts/load_resources.sh`。演示应用在本目录 `main.py`，端口 8907。

```bash
cd fastapi/07_yield_dependencies && ./07_yield_dependencies.sh demo
```

真实输出示例（节选）：

```text
---- [2/6] 正常路径: POST /orders -> BEGIN ... COMMIT, teardown 后进先出
    $ httpx -X POST /orders -d '{"item":"coffee","qty":2}'   =>   HTTP 200
        {
          "order": {
            "item": "coffee",
            "qty": 2,
            "total": 20
          },
          "tx": "tx#1",
          "responded_at": 1791127476.5426502
        }
    ...2 行 PASS 与 GET /trace 的 events JSON 省略...
    [PASS] 事件序列(setup 顺序 -> teardown 逆序)
    ...
---- [5/6] teardown 里的异常(本机实测): 客户端看到什么, 日志留下什么
    $ httpx -X GET /teardown-crash   =>   HTTP 200
    ...响应体 JSON 省略...
    [PASS] (a) 客户端照常收到 200(teardown 异常改不了已发送的响应)
    ...2 行 PASS 省略...
        ERROR:    Exception in ASGI application
        Traceback (most recent call last): ...
        RuntimeError: cleanup failed in teardown (lab07 实验性异常)
    $ httpx -X GET /teardown-crash-on-error   =>   HTTP 500
        Internal Server Error
    [PASS] (b) 客户端收到 500(teardown 异常顶掉了业务 418)
  演示完成: 17 项断言全部通过
```

诚实预期：teardown 异常行为与框架版本相关，结论限实测版本（fastapi 0.142.2 /
starlette 1.7.0）：成功路径的 teardown 异常对客户端不可见（200 照发），只进服务端
日志；端点异常叠加 teardown 异常时，客户端收到 500。

fastapi 0.106 之前 teardown 在响应发送之前执行，行为不同，升级时留意。耗时断言基于 audit 的 0.5s 停顿，机器高负载时个别数值可能波动。

## How It Works

机制核心是生成器协议。推进生成器用 anext()：第一次推进执行到 yield 停下并交出值；
正常收尾再推进一次，函数从 yield 之后继续跑到结尾。异常收尾用 athrow(exc)：把异常
从暂停点（yield 所在行）抛进函数体，except 与 finally 照常生效。

FastAPI 的接线只有两条：正常路径收尾等于"再推进一次"；异常路径收尾等于
"athrow(端点的异常)"。所以事务依赖能感知成败：

```python
async def transaction() -> AsyncIterator[str]:
    record("tx:begin")          # setup: 依赖解析阶段执行
    try:
        yield tx_id             # 端点函数运行窗口 = 停在这行的期间
    except BaseException:       # 端点的异常从 yield 点抛进来
        record("tx:rollback")   # 由此区分事务该回滚
        raise                   # 必须 re-raise, 吞掉会被框架判为错误写法
    else:
        record("tx:commit")     # 此刻响应通常已发送完毕
```

teardown 的触发位置由请求处理结构决定：每个 yield 依赖注册进 AsyncExitStack（异步
退出栈：收尾按注册逆序逐个执行），栈在 `await response(...)` 之后才退出。demo [4]
里 teardown 晚于 responded_at 约 0.5s，就来自这里。

异常路径的顺序不同：端点抛异常后，退出栈带着异常收尾，athrow 让 transaction 记下
rollback，异常继续向上，最后由异常中间件（把异常翻译成错误响应的一层）生成 418。因此
demo [3] 的 418 响应耗时大于 audit 停顿——teardown 先于错误响应执行。

多个 yield 依赖叠加时是严格的后进先出（LIFO，栈的取用顺序）：声明顺序 transaction
在前、audit 在后，收尾就逆序为 audit:teardown、tx:commit。"事务在外、审计在内"的
声明方式，天然得到 begin 最先、commit 最后的正确事务边界。

teardown 异常的实测结论有三条：成功路径下响应已发送，客户端照常 200，异常只出现在
服务端日志；端点已抛异常时，teardown 的异常顶掉业务异常，客户端收到 500 纯文本；
在 except 里吞掉端点异常不 re-raise，框架抛 FastAPIError，客户端同样 500。

## Pitfalls & Q&A

- **清理静默失败**：`/teardown-crash` 客户端 200 无异样，清理实际没完成，只有服务端日志有 traceback（teardown 在响应之后，异常无路可达客户端）。解法：teardown 内部 try/except 记日志并告警，不让清理异常外冒。
- **裸 yield 丢 teardown**：端点异常时 rollback 分支没执行。原因：异常从 yield 点抛入生成器，yield 之后的行被直接跳过（实测：依赖没有 try/finally 时，after-yield 代码不运行）。解法：yield 放进 try/finally，要区分成败再加 except + raise。
- **teardown 异常顶掉业务异常**：客户端收到 500 纯文本，原来的 418 信息消失，排查方向被带偏。原因：异常收尾阶段，后抛的异常替换先到的异常。解法同第一条。
- **teardown 里写阻塞调用**：async 依赖的 teardown 里 `time.sleep(2)` 会让并发请求全部卡住——teardown 在事件循环线程上执行，同步阻塞停摆整个循环。解法：`await asyncio.sleep(...)`，同步库用 run_in_threadpool。
- **模块级可变状态**：EVENTS 列表只在单进程演示里成立；uvicorn `--workers N` 时每个进程各一份，并发请求交叉写入，`/trace` 断言会乱。解法：演示用单 worker，生产把状态放外部存储。
- **Q：teardown 里能修改响应吗？** 不能。teardown 在响应发送之后，状态码与响应体已定型（实测 `/teardown-crash` 照常 200）。要干预响应，用普通依赖拿 Response 参数，或写中间件。
- **Q：在 except 里吞掉端点的异常会怎样？** 实测：客户端 500，服务端日志是
  `FastAPIError: Response not awaited ...`——框架用这条报错提示 yield 依赖吞了异常。
- **Q：多个 yield 依赖的 teardown 谁先谁后？** 后进先出，与 setup 严格相反，由退出栈决定；事务在外、审计在内的声明顺序即可获得正确边界。
- **Q：与 BackgroundTasks 怎么选？** 都在响应后运行。teardown 属于依赖生命周期，通过 athrow 能感知请求异常，适合清理；BackgroundTasks 拿不到异常，适合响应后的追加工作（发邮件、记埋点）。
