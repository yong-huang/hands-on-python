# 01 · WSGI 最小应用手写：框架魔法还原成两个参数

> 全程唯一不装任何第三方包的一站。Flask 的 `@app.route`、Django 的 `urlpatterns`、
> FastAPI 的 `@router.get`——三家的"魔法"底下都是同一份 PEP 3333 合约：
> **app 就是一个接受 `environ` 和 `start_response` 的可调用对象**。
> 本实验用标准库把这份合约手写一遍，再让官方检查器 `wsgiref.validate.validator`
> 给我们的应用背书。

## Background

这节回答三个问题：统一接口出现之前，Python Web 应用怎么写；那个做法在哪里撞墙；统一接口如何应运而生。

没有统一接口的年代，主流做法是 CGI（Common Gateway Interface，通用网关接口）：服务器为每个请求 fork 一个新进程，跑一遍脚本、输出 HTML、进程退出。另一些应用干脆针对特定服务器写扩展模块，换一台服务器就得重写对接层。

痛点在"绑定"二字。框架作者要么只支持一两种服务器，要么为每家服务器各写一个适配层；部署时想把简易测试服务器换成生产级 server，应用代码也得跟着改。CGI 的进程模型还撑不住并发——进程创建开销随流量线性上涨。

转折点：2003 年的 PEP 333（Python Enhancement Proposal，Python 增强提案——规定语言与标准库演进方向的规范文档）定义了一套最小调用约定，把 server 与应用互相解耦。

2010 年的 PEP 3333 面向 Python 3 修订，成为今天通行的 WSGI（Web Server Gateway Interface，Web 服务器与应用之间的统一调用约定）。从此 gunicorn/uwsgi 等任意 server 可搭配 Flask/Django 等任意框架，双方互不绑定。

## What

这节给 WSGI 下定义，并建立一个能装下中间件与校验器的心智模型。

所有 Python Web 框架的底层都是 WSGI，合约只有四句话：

- **应用是可调用对象**（callable——能像函数一样加括号调用的对象），以 `app(environ, start_response)` 的签名被调用
- **environ 是一个 dict**，装着请求的全量信息：方法、路径、查询串、请求头
- **`start_response` 是一个回调**，app 调用它来声明响应行（如 `200 OK`）与响应头
- **返回值是可迭代的 body**，即一堆 bytes 分块

心智模型：可以把整条调用链想象成洋葱——server 只认"可调用对象"这一种形状，中间件就是往洋葱上再包一层，`validator` 则站在洋葱外检查每一层是否守约。但和真洋葱不同的是，每一层都是同一种形状的可调用对象，server 看不出内层 app 与外层中间件的区别。

## When to Use

这节讲什么时候值得绕开框架直接写 WSGI，什么时候不该这么做。

典型场景：

- 排查框架的反直觉行为的时候：Flask 的 `request` 为什么是线程隔离的代理？中间件为什么拿得到响应状态码？部署文档为什么反复提 `close()`？答案全在合约里
- 配置生产部署的时候：gunicorn/uwsgi 的 worker、中间件链等配置项，改的正是洋葱的某一层；不懂合约就只能照抄示例
- 写不需要框架的小组件的时候：一个 health check 端点、一个内部回调接口，一个函数加一台 wsgiref server 就够

何时不用：日常业务开发直接用 Flask/Django/FastAPI，路由、模板、会话这些重复劳动框架已经解决，手写 WSGI 的价值在理解与定制底层，不在生产效率。

需要 WebSocket、长连接或高并发 IO 的时候也不该用它——同步的 WSGI 模型不是为这些场景设计的，应转向 ASGI（机制对比见文末 Q3）。

同类方案对比：

| 方案 | 与 WSGI 的差异 | 什么时候选它 |
|---|---|---|
| CGI | 每请求 fork 一个进程，无组件分层 | 维护遗留脚本 |
| ASGI | 异步消息（`scope/receive/send`）取代同步回调 | WebSocket、长连接、高并发 IO |
| 直接用框架 | 在 WSGI 之上补齐路由、模板、会话等配套 | 一切业务开发 |

## Quick Start

这节把演示跑起来，看清输出里的每类现象；合约的最小实现与机制拆解见 How It Works。

前置条件：仅需 Python 3 标准库，零第三方依赖。

```bash
cd web/01_wsgi_barebones
python3 wsgi_barebones.py    # 完整演示（4 个小节，内置验收断言，零第三方依赖）
```

真实输出节选（§4 完整输出见脚本，服务端口每次由内核分配）：

```
========================================================
[3. 中间件洋葱与 wsgiref.validate.validator]
========================================================
  经洋葱链后 body: 'WSGI 101: 框架的本质就是 app(environ, start'
  中间件日志（body 消费完才写）: GET  /  200 OK  0.0ms
  坏 app（忘调 start_response）→ validator AssertionError: The application returns and we started iterating ove
  validator 就是这么给我们的路由 app 背书的：每条路径都合规

========================================================
[4. 真实服务自测：127.0.0.1 动态端口，5 个请求全断言]
========================================================
  wsgiref 服务已起: http://127.0.0.1:64780（端口 0 = 由内核分配，避免端口冲突）

  /                      → 200 · 'WSGI 101: 框架的本质就是 app(environ, start_res'
  /hello/WSGI            → 200 · 'Hello, WSGI! 这段 body 由路由表分发出来'
  /info?a=1&b=2          → 200 · environ 回显 QUERY_STRING='a=1&b=2'
  /definitely-missing    → 404 · '404: /definitely-missing 不在路由表里'
  /hello/framework       → 200 · 'Hello, framework! 这段 body 由路由表分发出来'

  中间件请求日志（方法 路径 状态码 耗时ms）:
    GET  /  200 OK  0.3ms
    GET  /hello/WSGI  200 OK  0.1ms
    GET  /info  200 OK  0.1ms
    GET  /definitely-missing  404 Not Found  0.1ms
    GET  /hello/framework  200 OK  0.1ms

========================================================
全部断言通过 ✓ 三类路径 200/200/404 + Content-Type 正确、
validator 包裹下全部请求合规、5 条请求日志一行不少
```

诚实预期：

- **服务端口每次运行都不同**：`make_server("127.0.0.1", 0)` 的端口 0 表示交给内核分配，避免与他人实验冲突；想固定端口自行改成 8000
- **§3 的坏 app 报错发生在"迭代 body"时**而非调用时：WSGI 的返回值是惰性可迭代，validator 只有开始消费才能发现"从头到尾没人调 start_response"——这也是理解"调用 app ≠ 响应已发完"的最好证据

本实验用到的标准库速览：

| 工具 | 作用 |
|---|---|
| `wsgiref.simple_server.make_server` | wsgiref（标准库自带的 WSGI 参考实现）提供的真实 server，起在本机动态端口 |
| `wsgiref.validate.validator` | 守约检查器，具体检查哪些条款见 How It Works |
| `urllib.request` | 标准库 HTTP 客户端，模拟客户端发请求供断言用 |

## How It Works

这节拆开 Quick Start 输出里的每个现象：合约怎么落成代码、environ 从哪来、中间件怎么截获状态码、validator 到底查什么。

### 合约三要素：六行核心代码

```python
def wsgi_app(environ, start_response):          # 框架的本质就长这样
    status, headers, body = route(environ)      # 框架层：路由/业务
    start_response(status, headers)             # 声明响应行与头，body 交付前必须调用
    return [body]                               # 可迭代的 bytes 分块
```

这段在做什么：接住请求信息 dict，交给路由层算出三元组，先声明响应行与头、再把 body 作为可迭代对象交出去——每一行对应合约的一句话。输出里的每个 200/404 响应，都经过这个函数。

### environ 与路由：请求信息的组织

`environ` 按 CGI 风格组织：`REQUEST_METHOD` / `PATH_INFO` / `QUERY_STRING` 是请求行拆出来的，请求头去掉 `-` 改 `_` 加 `HTTP_` 前缀（`User-Agent` → `HTTP_USER_AGENT`）。

另有 `wsgi.input`（请求体流）、`wsgi.version` 等 `wsgi.*` 内控键。输出里 `/info?a=1&b=2` 那行回显的 `QUERY_STRING='a=1&b=2'`，就是路由函数从这里读出来的。

`route()` 是"框架层"的心脏：吃 environ、吐 `(status, headers, body)` 三元组；`wsgi_app()` 这一薄层把三元组翻译成 PEP 3333 约定——所有框架都有这个翻译层。输出里 404 那行，就是 `route()` 查表失败后走兜底分支的结果。

### 中间件：往洋葱上再包一层

中间件（接受一个 app、返回一个新 app 的包装函数）想记录状态行，就必须捕获内层的 `start_response`：server 把它传给洋葱最外层，再逐层向内传递，中间件在传递路上先截获一份。

server 看不见内层路由函数，只看得见洋葱最外层——输出里"中间件日志"能打印 `200 OK`，靠的就是这份截获。

### 日志写在 body 迭代完之后，而不是 app 返回时

```python
def body_iter():
    try:
        yield from inner
    finally:
        if hasattr(inner, "close"):
            inner.close()                    # 合约：close 必须传播给内层
        cost = (time.perf_counter() - t0) * 1000
        REQUEST_LOG.append(f"{environ['REQUEST_METHOD']}  ...  {cost:.1f}ms")
```

`wsgi_app` 返回 `[body]` 只是"交出响应"，真正的完成时刻是 server 消费完最后一个 chunk——在 app 返回时计时会把耗时截短。输出里 `GET  /  200 OK  0.3ms` 的耗时数字，全部产自这个 `finally` 块。

`finally` 里传播 `close()` 则是中间件的法定义务：消费方关闭外层生成器时，内层资源也必须被释放。

### close()：最容易被忽略的合约条款

PEP 3333 要求 server 在 body 消费完后**必须调用其 `close()`**（若存在）——数据库游标、文件句柄靠它释放。

本实验直接调用洋葱链时也手动 `close()`；若漏掉，validator 的包装迭代器会在 GC（垃圾回收）时抛 `AssertionError: Iterator garbage collected without being closed`——这是开发期就能抓到的真实违约。

### validator：合约的自动阅卷

`wsgiref.validate.validator(app)` 检查双向守约。对 app 侧：查 environ 键齐全、`start_response` 恰好调用一次、body 全是 bytes、迭代器被 close。

对 server 侧：查 `start_response` 的返回值（`write` 可调用）没被乱用。开发期把 `validator` 包在最内层、上线前摘掉，是成本最低的合规保险。

输出里"坏 app（忘调 start_response）"触发的 `AssertionError`，正是 app 侧检查的现场。

## Pitfalls & Q&A

这节收录四个真实踩过的坑（现象 + 原因 + 解法）与两个有增量的深入问题。

- **手工构造 environ 漏键**：现象是 validator 抓 `KeyError: 'SCRIPT_NAME'`。原因是 `SCRIPT_NAME` 是必需键（根挂载是空串），手工构造时容易漏。解法是补上它——本实验第一版真实踩中
- **忘调 `close()`**：现象是 GC 时冒出 `Iterator garbage collected without being closed`。原因是直接 `b"".join(chain(...))` 消费完就走，validator 的 `IteratorWrapper` 在被回收时检查 close 是否调用过。解法是消费完显式 `close()`；连"迭代中途抛异常"都要在 `finally` 里收尾
- **校验日志格式误判**：现象是用 `parts[-2].isdigit()` 校验状态码段永远为 False。原因是状态行自带空格（`200 OK`、`404 Not Found`），按双空格切完不等于数字。解法是用正则 `^\S+  \S+  \d{3} [A-Za-z ]+  [\d.]+ms$`
- **固定端口起服务**：现象是多人/多实验同跑 8000 直接 `Address already in use`。原因是默认端口被占用。解法是测试代码用端口 0 + `server.server_port` 取实际值（即 Quick Start 的诚实预期第一条）

**Q1：什么是 WSGI？为什么需要它？**

已在 Background 与 What 回答，不再重复。

**Q2：`start_response` 为什么存在？直接 return (status, headers, body) 不行吗？**

历史与流式两个原因：其一，保持与 CGI 的兼容心智；其二，body 是惰性可迭代，`start_response` 允许 app 在"交付 body 前"先声明响应行/头，支持错误时的 exc_info（异常信息，允许 app 二次调用 `start_response` 改写响应）与 `write()` 热路径。

新一代 ASGI 直接把这两步合进消息里，正是因为 WSGI 这套回调式设计晦涩。

**Q3：WSGI 和 ASGI 的核心区别？**

同步回调 vs 异步消息：WSGI 一请求一线程（线程池扛并发），environ 是 dict、回调式发响应；ASGI（PEP 3333 的异步继任者）基于 event loop（事件循环）+ `scope/receive/send` 三消息，原生支持 WebSocket、长连接与高并发 IO。

FastAPI/Starlette 是 ASGI，Flask/Django 传统视图是 WSGI（Django 3.0 起双栈）。
