# 15 · SQLAlchemy async：让等待不占线程，认清单写者边界

> 用 create_async_engine + async_sessionmaker 把 SQLAlchemy 2.0 风格 ORM 接入
> FastAPI，session 作为 yield 依赖按请求借还。读完本篇，你能搭出最小可用的异步
> ORM 接入，并用 20 个并发写请求实测 SQLite 文件锁下的串行化行为。

## Background

先看异步驱动普及前的做法。Web 框架配同步 ORM（对象关系映射：把类映射到表、行
映射成对象，用 Python 对象读写数据库），每个请求占用一个 worker 线程。

```python
rows = session.query(Note).all()   # 线程在此停住, 直到数据库返回
```

痛点在并发模型：线程是昂贵资源，单机开到几千个就到头。100 个请求同时等待一条
慢查询时，线程池被"等数据库"占满，新请求只能排队——等待不消耗 CPU，却消耗线程。

驱动层先给出答案：asyncpg、aiosqlite 这类异步驱动把"发查询、等结果"改写成
await 形式，等待期间线程转去处理别的请求。SQLAlchemy 在 1.4 过渡、2.0 定型，
把这套异步用法纳入核心 ORM API。

## What

**定义**：SQLAlchemy async 是同一套 ORM 的异步用法——engine（引擎：持有连接池的
进程级对象，连接池即"建好放着反复借用"的连接仓库）改由 create_async_engine 创建，
数据库操作全部改为 await 推进。

AsyncSession（异步会话）是一个装着待写改动的工作单元，运行在 async 端点函数里：
add 进去的对象不会立刻写库，commit 才把改动一次性发给数据库。

可以把 AsyncSession 想象成**储物柜的临时手环**：进门领手环（从连接池借出连接），
训练中把待写改动放进柜子，离场归还（close），下一位接着用同一个柜子。

但和"包下整个健身房"不同的是：手环租期只覆盖一次请求，归还由 yield 依赖的
收尾段（teardown）保证；拿到手环也不代表独占场地——20 个请求可同时各持一个
session，写库的提交仍要在数据库侧排队。

| 组件 | 角色 | 生命周期 |
|:--|:--|:--|
| `create_async_engine` | 建 engine（连接池挂在 engine 上） | 进程级，建一次 |
| `async_sessionmaker` | session 工厂，负责造 session | 进程级，建一次 |
| `AsyncSession` | 一次工作单元：装改动、发 SQL | 每请求一个 |
| yield 依赖 `get_session` | 借出与归还的样板 | 每请求一对 setup/teardown |

时序图自上而下走完一次写入：yield 前借出 session、端点提交回读，最后的归还段发生在响应发送之后——这就是"借了要还"的完整生命周期。

![Lab 15 · yield 会话依赖：借出、使用、归还](images/async_sqlalchemy.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/15_async_sqlalchemy/images/async_sqlalchemy.html)
> （或本地打开 [`images/async_sqlalchemy.html`](images/async_sqlalchemy.html)）。

## When to Use

三个典型场景，共同点是"等待多"：

- I/O 编排型接口：一个请求要并发发起外部 HTTP、查询多个数据源，await 让等待重叠；
- 高并发读服务：单进程挂起大量"等数据库返回"的请求，不靠堆线程数；
- 已有 async 技术栈的项目：Web 层与驱动层全链路 async，收益才完整。

何时不用：纯 CPU 计算（async 帮不上忙）；几十行的一次性脚本，标准库 `sqlite3`
三行就连上；事件循环调试经验不足的团队首个项目，引入成本先掂量。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 裸驱动（sqlite3 / asyncpg） | 手写 SQL，无对象映射 | 单表脚本、性能敏感路径 |
| 同步 ORM（Session） | 每请求占一个线程等数据库 | 传统部署、CPU 为主的服务 |
| async ORM（AsyncSession） | 等待不占线程，API 多一层 await | I/O 密集的 FastAPI 服务 |

## Quick Start

前置：仓库根有 `.venv`（fastapi 0.142.2、sqlalchemy 2.1.3、aiosqlite 0.22.1、
uvicorn（ASGI 服务器）、httpx）；未创建则先在仓库根执行
`./scripts/load_resources.sh`。演示应用在本目录 `main.py`。

```bash
cd fastapi/15_async_sqlalchemy && ./15_async_sqlalchemy.sh demo
```

真实输出示例（节选）：

```text
---- [1/5] 组件总览: engine 挂池, 工厂造 session, 依赖管借还
    $ httpx -X GET /stats   =>   HTTP 200
        {
          ...
          "dialect": "sqlite+aiosqlite",
          "pool_class": "AsyncAdaptedQueuePool",
          "session_factory": "async_sessionmaker",
          ...
        }
    ...
---- [3/5] 并发写实测: 20 个 POST 同时进, 提交一条接一条出
    单发写耗时(基准): 3.9 ms
    并发 20 个 POST 总耗时: 0.108 s
    状态码: 201 x 20/20    id 去重: 20/20
    提交完成时刻序列(ms, 相对最早进入, 21 条 = 1 条单发 + 20 条并发):
      1.1 13.8 17.0 17.8 19.0 19.7 20.4 20.9 21.7 22.3 23.0 23.9 24.7 25.5 28.7 29.2 35.4 42.0 54.4 79.1 109.2
    相邻提交间隔(ms): 12.7 3.2 0.8 1.2 0.7 0.7 0.5 0.8 0.6 0.7 0.9 0.8 0.8 3.2 0.5 6.2 6.6 12.4 24.7 30.1
    ...
    [PASS] 提交完成时刻单调不减(串行化)
    ...
  演示完成: 15 项断言全部通过
```

诚实预期：耗时随机器浮动。本机多次实测：单发写约 2~6 ms，20 个并发 POST 总
耗时约 0.05~0.25 s，提交间隔毫秒级、偶有几十毫秒抖动；断言只锁与机器无关的
三条——全部 201、id 唯一、提交完成时刻单调不减。

`./15_async_sqlalchemy.sh start` 单独起服务（端口 8915）后可用 curl 逐条试；
`clean` 会删除 `lab15.db`，数据不保留。

## How It Works

**session 的生命周期挂在 yield 依赖上**。get_session 与 lab 07 的事务依赖同构：
yield 之前借出，finally 里归还；teardown 在响应发送之后执行，异常路径先经过它。

端点函数只声明需要什么——NoteIn 请求体（Pydantic 校验模型）与 SessionDep
（session 依赖），构造由框架完成。

```python
async def get_session() -> AsyncIterator[AsyncSession]:
    session = async_session_maker()      # setup: 从工厂领一个 session
    try:
        yield session                    # 端点函数运行在这一行的停顿期间
    finally:
        await session.close()            # teardown: 归还连接, 未 commit 的改动回滚
```

demo [4] 的 `opened == closed`、`open_now == 0` 就是这段 finally 的执行证据；
池状态里 `Checked out connections: 0` 说明每条连接都回了池。

**连接池在 async 下的形态**。engine 挂的池类是 `AsyncAdaptedQueuePool`：
pool_size=5 常备连接，max_overflow=10 允许高峰临时多开，超出后请求在池上排队。

取舍只有两档：QueuePool 复用连接，省掉反复打开/关闭 SQLite 文件的开销；
NullPool 不缓存、用完即关，适合低流量脚本或删库前必须不留存活连接的场景。
engine 演示中建在模块层；生产上常在 lifespan（应用启动与关闭钩子）里初始化。

**SQLite 单写者锁与串行化实测**。文件型 SQLite 同一时刻只允许一个写入者：
commit 持有数据库文件锁、写完释放，后来的 commit 等锁。demo [3] 里 20 个并发
请求同时进入端点函数，提交完成时刻仍排成一条不回头的序列。

总耗时约等于"单发耗时 x 20"，而不是并行任务的"约等于最慢一个"；输出里的
毫秒级相邻间隔，就来自"上一把文件锁刚释放、下一个 commit 才拿得到锁"的排队
过程。async 的贡献只是等待锁的协程不占线程，它不能让写并行——那是引擎层约束。

## Pitfalls & Q&A

- **忘 commit，数据静默丢**：`session.add(note)` 后直接返回，客户端看到 201，重启后数据消失。原因：close 回滚未提交的事务，全程无报错。解法：写路径末尾一律 `await session.commit()`（本实验放在端点函数里，边界可见）。
- **在端点函数里手动开 session**：`async_session_maker()` 散落在各端点，绕开 get_session 依赖。后果：关闭时机各写各的，异常路径漏 close，连接池被占满时表现为请求卡住。解法：session 只经 yield 依赖注入，借还样板只写一次。
- **SQLite 并发写报 `database is locked`**：写入过重时，后来的写者在 busy timeout（SQLite 的锁等待上限，默认约 5 秒）内拿不到文件锁，驱动抛此错。解法：写请求串行化、调大 timeout，或迁到 PostgreSQL/MySQL 让写真正并行。
- **greenlet 缺失报错的长相**：`sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called`。常见触发：commit 后访问被标记过期的属性——那次隐式 SELECT 没有被 await。解法：`async_sessionmaker(expire_on_commit=False)`，要最新值就显式 `await session.refresh(obj)`。
- **Q：async 让单条查询更快吗？** 不。单查询耗时不变；收益是等待期间线程被让出去伺服别的请求，同一进程能挂起更多在途请求。
- **Q：只读的 GET 要不要 commit？** 不需要。读不开写事务，session 关闭即归还；demo [2] 的两个读端点都没有 commit。
- **Q：换 PostgreSQL 要改多少代码？** URL 换 `postgresql+asyncpg`，连接池参数按负载调，建表交给 Alembic（数据库迁移工具）；模型与依赖写法不变。
- **Q：expire_on_commit=False 会不会读到脏数据？** 不会。它只是 commit 后不把对象属性标记为过期；要数据库里的最新值用 refresh 显式回读（demo [2] 的 created_at 就是这样取到的）。
