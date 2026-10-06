# 04 · 错误处理体系：四种错误，一个信封

> FastAPI 把"异常翻译成 HTTP 响应"做成了一条可注册的处理器链。读完本篇，你能建立
> 统一的错误契约：所有错误响应用同一个 JSON 信封（code/message/details/request_id），
> 500 只给客户端一句模糊话。

## Background

在没有这类翻译机制的年代，错误响应由每个接口各自负责：函数里套一层
try/except（Python 的异常捕获语法），捕获之后想返回什么就返回什么。

结果是同一个系统里三种形状：A 接口返回 `{"error": "..."}`，B 接口返回
`{"detail": "..."}`（FastAPI 默认），C 接口忘了捕获，调用方只收到没有信息量的 `Internal Server Error`。

调用方还要为每个接口维护一套解析逻辑；排障时缺一个能把客户端错误
与服务端日志串起来的请求标识。

FastAPI 的解法分两步：框架先把常见错误翻译成默认结构，留出注册点让
应用按异常类型接管；应用层再约定一个所有错误共用的响应结构。

## What

**定义**：FastAPI 的错误处理体系是一套"异常 → 响应"的自动转换机制：
应用任意一层 `raise` 的异常，会按类型分发给注册的异常处理器
（exception handler：接收 `request` 与 `exc`、返回 `Response` 的函数）。

可以把这套机制想象成**反向的路由**：正向路由把 URL 路径映射到函数，
错误处理把异常类型映射到函数。但两者不同的是：路由按字符串匹配，
处理器按异常类的继承链匹配，且异常只会被第一个能处理的层接住。

信封是本篇所有错误响应的统一外壳，四个字段：

| 字段 | 含义 | 例子 |
|:--|:--|:--|
| `code` | 机器可读的错误代号，调用方拿它做分支 | `INVENTORY_SHORTAGE` |
| `message` | 给人读的描述 | `库存不足：B2002 还差 5 件` |
| `details` | 结构化补充信息，可为 null | `{"sku": "B2002", "short": 5}` |
| `request_id` | 本次请求的追踪标识，与响应头 `x-request-id` 同值 | `ac1794410c74` |

下图是本篇的主线：一条带着异常的请求自端点（处理某个路由的函数）抛出后，按异常类型分流到对应的
handler，每条分支的终点都是同一个信封。

![异常分发链：四种错误，一个信封](images/error_handling.svg)

> 🌐 **交互版**：[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/fastapi/04_error_handling/images/error_handling.html)
> (或本地打开 [`images/error_handling.html`](images/error_handling.html))。

## When to Use

什么项目值得做统一契约，三种手段怎么选——这节给判断标准。

- 对外提供 API 且调用方不止一个：统一的 `code` 让前端只写一套错误分支；
- 业务规则失败要与程序故障区分：库存不足是 409、可重试；程序崩溃是 500、重试多半没用，两者不该长得一样；
- 排障需要串联日志：`request_id` 让客户端错误能对上服务端日志里的同一次请求。

何时不用：纯内部工具、单人使用、错误只有一两种时，直接 `raise
HTTPException`（FastAPI 内置的 HTTP 错误异常，携带状态码与描述）就够了；
统一契约的价值随调用方数量增长，不随代码量增长。

| 手段 | 差异 | 什么时候选它 |
|:--|:--|:--|
| `HTTPException` | 一行抛出，默认 `{"detail": ...}` 结构 | 404/401 这类通用 HTTP 语义错误 |
| 自定义异常 + handler | 业务字段进 `details`，状态码集中管理 | 业务规则失败，调用方要做程序化分支 |
| `exception_handler(Exception)` | 兜底所有没被接住的异常 | 固定 500 输出，保证堆栈不外泄 |
| 中间件捕获 | 中间件（middleware：包在所有路由外、每个请求都经过的一层）看到的是原始异常 | 记日志、注入 request_id；接管 500 与兜底 handler 职责重叠 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（`./scripts/load_resources.sh`），无其他依赖；演示应用在同目录 `main.py`，端口 8904。

```bash
cd fastapi/04_error_handling && ./04_error_handling.sh demo
```

真实输出示例（节选）：

```text
---- [2/6] 业务异常 InventoryShortage -> 409 信封
    $ curl -X POST /inventory/deduct  -d '{"sku":"B2002","qty":5}'   =>   HTTP 409
        {
          "code": "INVENTORY_SHORTAGE",
          "message": "库存不足：B2002 还差 5 件",
          "details": {
            "sku": "B2002",
            "short": 5
          },
          "request_id": "ac1794410c74"
        }
    [PASS] 信封恰好四字段: code/message/details/request_id
```

预期说明：`[5b/6]` 章节的 debug=True 对照组会故意让响应体出现异常名
`RuntimeError`，演示堆栈泄漏给调用方的样子。

500 的行为与框架版本相关：不注册 `exception_handler(Exception)` 时，FastAPI
默认只回纯文本 `Internal Server Error`；本篇的 500 信封来自自定义兜底处理器。

## How It Works

一条带着异常的请求自内向外穿三层，服务端日志里每层各打一行"走到了哪"：

1. 端点（处理某个路由的函数）`raise`：业务异常、HTTPException，或没料到的 bug；
2. `ExceptionMiddleware`（Starlette——FastAPI 底层框架——的异常中间件）
   沿 `type(exc)` 的继承链查注册表，找到就地生成响应，409/404/422 都停在这一层；
3. 没人接住（如 `RuntimeError`）时异常穿出中间件，到达最外层
   `ServerErrorMiddleware`（500 兜底中间件）：先看 debug 开关，开着就把堆栈
   发给客户端，关着才调用注册的 `exception_handler(Exception)`。

`RequestValidationError`（请求参数未通过校验时抛出的异常）也在第 2 层被
接住：`exc.errors()` 里的 `loc`（出错位置）/`msg`/`type` 原样搬进信封
`details`，外壳换掉、信息不丢。

最核心的一处注册：

```python
@app.exception_handler(InventoryShortage)
async def shortage_handler(request: Request, exc: InventoryShortage) -> JSONResponse:
    # 状态码写在这里而不是写在异常里: 异常类描述"出了什么事",
    # handler 决定"对外怎么翻译", 分开后同一个异常可以在多处复用
    return err(409, "INVENTORY_SHORTAGE", str(exc), {"sku": exc.sku, "short": exc.short})
```

现象都能对上号：409 信封来自上面的 handler；500 时服务端日志里的
`Exception in ASGI application` 与完整 traceback（堆栈回溯，即逐层函数调用
记录）是 uvicorn（把 FastAPI 应用跑成 HTTP 服务的服务器，demo 脚本启动的就是它）打的。

兜底 handler 响应后异常仍会重新抛给服务器，客户端拿到的只有信封。

**为什么 500 默认不是 JSON**：没人接管时 Starlette 只回纯文本
`Internal Server Error`——框架不知道你的信封长什么样，不敢替你编
`code` 字段；注册 `exception_handler(Exception)` 就是接管这里的翻译权。

**注册顺序**：handler 之间不存在"先注册先匹配"，查表沿异常类继承链
（MRO，Python 沿继承链查找成员的固定顺序）进行，子类先于父类命中；
注册为 `Exception` 的 handler 不进这张表，被单独安到最外层兜底中间件。

## Pitfalls & Q&A

- **handler 里再抛异常**：409 handler 里顺手查库存又出错，这次没人接，直接变
  500。解法：handler 只做格式翻译，要查的数据在业务层查好，挂到异常对象上。
- **覆盖 422 丢掉原始结构**：按默认 422 结构取 `detail` 数组的前端会取不到值。
  解法：`loc`/`msg`/`type` 原样保留进 `details`，改契约必须同步所有调用方。
- **HTTPException 漏传 headers**：401 时应传
  `headers={"WWW-Authenticate": "Bearer"}`，标准客户端靠它识别认证方案，
  自定义 handler 里也要透传 `exc.headers`。
- **`except Exception` 吞掉 HTTPException**：端点里包一层 `try: ... except
  Exception: raise HTTPException(500)` 会把内部的 404 也吞成 500。解法：
  先 `except HTTPException: raise`，再接兜底。

问答：

- **Q：两个 handler 注册的类有继承关系，谁生效？** 子类。匹配沿继承链
  从具体到基类，与注册先后无关；基类统一接、子类特判就注册两个。
- **Q：500 信封里的 request_id 从哪来？** 中间件在请求开始时把 id 写进
  contextvar（每请求独立一份的变量存储），兜底 handler 与中间件在同一条调用链上，
  读得到；只挂响应头做不到——异常路径上没有响应头的机会。
- **Q：校验错误可以不覆盖吗？** 可以。代价是前端要同时解析默认
  `{"detail": [...]}` 与信封两种结构；调用方只有自己团队时，不覆盖改动更小。
