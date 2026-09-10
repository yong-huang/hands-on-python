# 01 · WSGI 最小应用手写：框架魔法还原成两个参数

> 「Python Web 框架」系列第 1 站，也是全程唯一不装任何第三方包的一站。Flask 的
> `@app.route`、Django 的 `urlpatterns`、FastAPI 的 `@router.get`——三家的"魔法"
> 底下都是同一份 PEP 3333 合约：**app 就是一个接受 `environ` 和 `start_response`
> 的可调用对象**。本实验用标准库把这份合约手写一遍，再让官方检查器
> `wsgiref.validate.validator` 给我们的应用背书。

## 1. 为什么需要它

所有 Python Web 框架的底层都是 WSGI：**应用是可调用对象**（`app(environ, start_response)`）、**environ 是请求全量信息的 dict**、**`start_response` 声明响应行与响应头**、**返回值是可迭代的 body**。不理解这四句话，框架学到 `request` 对象就停了——为什么 Flask 的 `request` 是线程隔离的代理？为什么中间件能拿到响应状态码？为什么部署文档总提 close()？答案全在合约里。本实验把路由、404 兜底、日志中间件、合规校验各写一遍，最后起一个真实的 wsgiref 服务用 `urllib` 实测断言。

## 2. 总览：核心机制一图看懂

![WSGI 请求生命周期：洋葱调用链](images/wsgi_barebones.svg)

一句话心智模型：**server 只认"可调用对象"这一种形状——中间件就是往洋葱上再包一层，`validator` 则是站在洋葱外检查每一层是否守约**。看图沿主路径走：客户端请求被组装成 `environ`，穿过日志中间件和 validator，到达路由 app 查表分发；未命中走 404 兜底，违规应用在迭代 body 时被当场抓住。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/01_wsgi_barebones/images/wsgi_barebones.html)
> （或本地打开 [`images/wsgi_barebones.html`](images/wsgi_barebones.html)）。

## 3. 快速开始

```bash
cd web/01_wsgi_barebones
python3 wsgi_barebones.py    # 完整演示（4 个小节，内置验收断言，零第三方依赖）
```

真实输出节选（macOS, CPython 3.14；§4 完整输出见脚本，服务端口每次由内核分配）：

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

## 4. 核心概念

### 4.1 合约三要素：environ / start_response / iterable body

```python
def wsgi_app(environ, start_response):          # 框架的本质就长这样
    status, headers, body = route(environ)      # 框架层：路由/业务
    start_response(status, headers)             # 声明响应行与头，body 交付前必须调用
    return [body]                               # 可迭代的 bytes 分块
```

`environ` 按 CGI 风格组织：`REQUEST_METHOD` / `PATH_INFO` / `QUERY_STRING` 是请求行拆出来的，请求头去掉 `-` 改 `_` 加 `HTTP_` 前缀（`User-Agent` → `HTTP_USER_AGENT`），另有 `wsgi.input`（请求体流）、`wsgi.version` 等 `wsgi.*` 内控键。注意 `SCRIPT_NAME` 是必需键——本实验第一版手工 environ 漏了它，直接被 validator 抓住。

### 4.2 server 看不见 Handler，只看得见洋葱最外层

`route()` 是"框架层"的心智模型（吃 environ、吐三元组），`wsgi_app()` 这一薄层把它翻译成 PEP 3333 约定——所有框架都有这个翻译层。中间件 `log_middleware(app)` 接受一个 app、返回一个新 app：捕获内层的 `start_response` 才能拿到状态行；把耗时日志写在 body 迭代完之后，才能记录真实完成时刻。

### 4.3 close()：最容易被忽略的合约条款

PEP 3333 要求 server 在 body 消费完后**必须调用其 `close()`**（若存在）——数据库游标、文件句柄靠它释放。中间件返回自己的生成器时，必须在 `finally` 里把 `close()` 传播给内层。本实验直接调用洋葱链时也手动 `close()`，否则 validator 的包装迭代器在 GC 时抛 `AssertionError: Iterator garbage collected without being closed`——这是开发期就能抓到的真实违约。

### 4.4 validator：合约的自动阅卷

`wsgiref.validate.validator(app)` 检查双向守约：对 app 侧，查 environ 键齐全、`start_response` 恰好调用一次、body 全是 bytes、迭代器被 close；对 server 侧，查 `start_response` 的返回值（`write` 可调用）没被乱用。开发期把 `validator` 包在最内层、上线前摘掉，是成本最低的合规保险。

## 5. 关键代码解析

**为什么日志写在 body 迭代完之后，而不是 app 返回时？**

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

`wsgi_app` 返回 `[body]` 只是"交出响应"，真正的完成时刻是 server 消费完最后一个 chunk——在 app 返回时计时会把耗时截短。`finally` 里传播 `close()` 则是中间件的法定义务：consumer 关闭外层生成器时，内层资源也必须被释放。

坑清单：

- **手工构造 environ 漏键**：`SCRIPT_NAME` 是必需键（根挂载是空串），漏掉会被 validator 抓 `KeyError: 'SCRIPT_NAME'`——本实验第一版真实踩中
- **忘调 `close()`**：直接 `b"".join(chain(...))` 消费完就走，validator 的 `IteratorWrapper` 会在 GC 时补刀 `Iterator garbage collected without being closed`；坏 app 演示里连"迭代中途抛异常"都要在 `finally` 里收尾
- **校验日志格式用 `parts[-2].isdigit()`**：状态行自带空格（`200 OK`、`404 Not Found`），按双空格切完不等于数字——用正则 `^\S+  \S+  \d{3} [A-Za-z ]+  [\d.]+ms$`
- **固定端口起服务**：多人/多实验同跑 8000 直接 `Address already in use`；测试代码用端口 0 + `server.server_port` 取实际值

## 6. 文件结构

```
01_wsgi_barebones/
├── README.md                             # 本教程文档
├── wsgi_barebones.py                     # 主演示脚本：合约/路由/洋葱中间件/真实服务自测
└── images/
    ├── wsgi_barebones.json       # 图源（typed JSON IR，可编辑重渲染）
    ├── wsgi_barebones.html       # 交互示意图（浏览器打开）
    └── wsgi_barebones.svg        # 双主题矢量图（本 README §2 内嵌）
```

`wsgi_barebones.py` 内容：`home()/greet()/info()/not_found()` 处理函数 / `route()` 查表分发 / `wsgi_app()` WSGI 合约翻译层 / `log_middleware()` 洋葱中间件（计时 + close 传播）/ `fake_environ()` 手工 environ / `demo_contract()` 合约直调 / `demo_routing()` 路由断言 / `demo_middleware_and_validator()` 洋葱与坏 app 实测 / `demo_real_server()` 起服务 + urllib 5 请求全断言（验收点）。

## 7. 面试要点

**Q1: 什么是 WSGI？为什么需要它？**
PEP 3333 定义的 Web server 与 Python 应用之间的统一接口：`app(environ, start_response)` 返回可迭代 body。有了它，uwsgi/gunicorn 等任意 server 可以搭配 Flask/Django 等任意框架，双方互不绑定。

**Q2: `start_response` 为什么存在？直接 return (status, headers, body) 不行吗？**
历史与流式两个原因：其一，保持与 CGI 的兼容心智；其二，body 是惰性可迭代，`start_response` 允许 app 在"交付 body 前"先声明响应行/头，支持错误时的 exc_info 二次调用与 `write()` 热路径。新一代 ASGI 直接把这两步合进消息里，正是因为 WSGI 这套回调式设计晦涩。

**Q3: 中间件是什么？怎么实现一个记录耗时的中间件？**
"接受 app、返回新 app"的包装函数。要点：包装 `start_response` 才能捕获状态行；把耗时统计放在自己返回的迭代器被消费完之后；在 `finally` 中把 `close()` 传播给内层。

**Q4: WSGI 和 ASGI 的核心区别？**
同步回调 vs 异步消息：WSGI 一请求一线程（线程池扛并发），environ 是 dict、回调式发响应；ASGI（PEP 3333 的异步继任者）基于 event loop + `scope/receive/send` 三消息，原生支持 WebSocket、长连接与高并发 IO。FastAPI/Starlette 是 ASGI，Flask/Django 传统视图是 WSGI（Django 3.0 起双栈）。

**Q5: 为什么 server 消费完 body 必须调 `close()`？**
body 迭代器可能持有数据库游标、文件句柄等外部资源，生成器的 `finally` 只有 `close()` 才会确定性触发（否则要等 GC）。PEP 3333 把它写成 server 的义务，wsgiref.validate 会在"迭代器被 GC 而未 close"时直接断言失败。

## 8. 总结

1. **WSGI 合约只有四句话**：可调用对象、environ 进、start_response 声明响应、iterable body 出
2. **框架 = 路由/ORM/模板 + 一个 wsgi_app 翻译层**：server 永远只看见洋葱最外层
3. **中间件是包一层的可调用对象**：捕获 start_response 拿状态、body 消费完才算完成、close() 必须传播
4. **validator 是免费的合规阅卷**：手工 environ 漏 `SCRIPT_NAME`、忘调 `start_response`、漏 `close()` 全部当场被抓（均本实验实测）
5. **下一站 Flask**：`@app.route` 与 `request` 代理，就是本实验路由表和 environ 的封装

下一篇进入 [02 · HTTP 协议观察器](../02_http_protocol/README.md)：下到 socket 层手搓报文，看看 wsgiref 替我们隐藏的 HTTP 逐字节细节。
