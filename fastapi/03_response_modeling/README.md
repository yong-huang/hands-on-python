# 03 · 响应建模：一道出口闸，五类响应形态

> FastAPI 的响应不是"函数返回什么就发什么"。读完本篇，你能用 response_model 在出口
> 裁掉敏感字段（password 进得来、出不去），用 status_code 声明成功语义，并在 JSON /
> HTML / 重定向 / 流式 / 文件五类响应形态之间做对选择。

## Background

在没有响应模型的框架里，返回值与 HTTP 响应只隔一步：函数拼一个 dict（Python 的键值
容器）直接返回，框架把它转成 JSON 文本发出去。用户资料接口的常见写法是查库拿到整条
记录，靠人肉记得"删掉不该给的字段"。

这个"记得"迟早失效。某次重构往记录里加了 `internal_risk_score`（内部风控分，只该待
在服务端的字段），没人检查它在不在返回路径上，它就随每次响应出网；调用方若按这个
字段写了逻辑，它就再也删不掉——对外契约（接口给调用方的数据承诺）与内部实现缠死了。

FastAPI 的解法是把"对外给什么"从函数体搬进路由声明：response_model（响应模型，用
Pydantic——基于类型注解做数据校验的库，lab 02 的主角——声明字段清单的类）在出口
逐字段过滤，status_code（HTTP 状态码，标记请求结果的三位数字）在同一处声明成功语义。

## What

**定义**：response_model 是挂在路由上的一张出口白名单，声明"这个端点的响应有哪些
字段"，FastAPI 在函数返回之后、字节出网之前按它过滤。status_code 是同一处声明的
另一半：成功时的状态码由声明决定，不写在函数体里。

可以把请求管线想象成机场安检：入口闸门查你带进来的（请求体校验），出口闸门查你带
出去的（响应过滤）。但和安检不同的是，被拦下的键只是不进响应——函数内部世界毫发
无损，敏感数据照常入库。出不去，不等于不存在。

默认出口只产出 JSON。要发别的正文，换一个响应类，五类各管一种：

| 响应类 | 管什么正文 | 本篇端点 |
|:--|:--|:--|
| JSONResponse | JSON 文本，默认形态 | `GET /stats` |
| HTMLResponse | HTML 网页 | `GET /html` |
| RedirectResponse | 无正文，只给 Location 让客户端去别处 | `GET /redirect` |
| StreamingResponse | 边生成边发，总长度未知 | `GET /stream` |
| FileResponse | 磁盘文件，自动分段发送 | `GET /download` |

一次返回值在出口处的完整决策流如下：主路径经白名单过滤与编码后从五形态
出口离场，Response 实例则走旁路直出，整体绕过过滤与编码。

![Lab 03 · 响应决策流：一道出口闸，五类形态](images/response_modeling.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/03_response_modeling/images/response_modeling.html)
> （或本地打开 [`images/response_modeling.html`](images/response_modeling.html)）。

## When to Use

- 对外 API 且数据里混着敏感字段：出口白名单让"能出去什么"成为一行可见的声明，
  评审与文档都能对得上。
- 调用方不止一个：响应模型同时生成 OpenAPI 文档（框架自动产出的接口说明书），
  字段增删有处可查，契约漂移在发布前暴露。
- 非 JSON 需求：导出 CSV、返回网页、登录后跳转、大结果集边算边发——五类形态各有入口。

何时不用：原型期或单人内部工具，dict 直返改动最小；字段全部公开、调用方只有自己时，
为省两次手写 `del record["password"]` 而多声明一个模型，收益为负。

| 手段 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 裸 dict 直返 | 返回什么发什么，零声明 | 原型期，字段全公开 |
| `response_model=模型` | 白名单过滤，进文档 | 对外接口、含敏感字段 |
| 返回 Response 实例 | 接管状态码/响应头/正文，绕过过滤 | 自定义头、重定向、流式、文件 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（`./scripts/load_resources.sh`），无其他依赖；演示应用在同目录 `main.py`，端口 8903。

```bash
cd fastapi/03_response_modeling && ./03_response_modeling.sh demo
```

真实输出示例（节选）：

```text
---- [1/7] 出口闸: POST /users 收下 password, 响应里却找不到它
  端点返回的内部记录含 password 与 internal_risk_score, 但装饰器声明了
  response_model=UserOut: FastAPI 按白名单重新校验, 多余的键直接丢弃。
    $ curl -X POST /users  -d '{"username":"alice","email":"alice@example.com","password":"alice-pw-2014","bio":"learning fastapi"}'   =>   HTTP 201
        {
          "id": 3,
          "username": "alice",
          "email": "alice@example.com",
          "bio": "learning fastapi"
        }
    [PASS] 状态码 201(status_code 声明)
    [PASS] 响应字段恰好是 UserOut 四字段
    [PASS] 响应字节里没有 password / internal_risk_score / 密码明文
```

预期说明：`[2/7]` 的对照端点是反面教材，password 会故意出现在响应里；`[6/7]`
流式章节的到达时刻（`+0.44s` 一类读数）随每次运行浮动；请求体里的密码是演示假数据。

## How It Works

普通 JSON 响应的生产线有四步，每一步都能在本篇输出里对上号：

1. 端点函数 `return`：返回值可以是 dict、Pydantic 模型，或 Response 实例（走旁路，见下）；
2. response_model 过滤：把返回值当作 `UserOut` 的输入重新校验一遍，白名单外的键丢弃——
   `[1/7]` 的 201 响应只剩四个字段，就来自这一步；
3. jsonable_encoder（框架内置的"Python 对象转 JSON 兼容类型"转换器）：datetime、UUID、
   模型实例在这里变成纯字典与标量；
4. 响应类编码：response_class 默认 JSONResponse，把字典写成 UTF-8 字节，配上
   Content-Type: application/json（标识正文格式的响应头），交给 uvicorn（把本应用
   跑成 HTTP 服务的服务器）发上网络。

分工规则一句话：返回普通值，第 2~4 步全走，response_class 决定最后一步用哪个类包装；
返回 Response 实例，第 2~4 步整体跳过，对象的状态码、响应头、正文就是最终响应。

`/stats` 用这条旁路加自定义响应头——也因此它是绕过出口闸的后门，塞什么要自己负责。
response_class 只在"返回普通值"时生效；`/html` 返回的是手工构造的 HTMLResponse 实例，
response_class 对它没有发言权。

流式为什么没有 Content-Length（预告正文总长度的响应头）：它要求发第一个字节前就知道
总长，而流式正文来自生成器，发送时还不知道后面有什么。

HTTP 为此备了 Transfer-Encoding: chunked（分块传输编码，每块自带长度前缀，以一块空块
收尾）。`[6/7]` 里 200 先到、正文每 0.4s 一块，正是"先定头、后流水"的发送顺序。

`[3/7]` 的 201 与 Location 是一对：status_code=201 声明"成功即创建了新资源"，
Location 响应头（端点里手写一行）指明去哪取——`GET /users/5` 拿回 dave 就是闭环。

## Pitfalls & Q&A

- **response_model 与返回注解各说各话**：注解标 `-> UserOut`、函数却返回内部全量
  dict，两处契约不一致时行为以 response_model 为准，但读代码的人会读错。解法：对外
  契约只声明一次，内部形态统一写 `dict[str, Any]`。
- **StreamingResponse 生成器中途抛异常**：第一块发出时状态码与响应头已定死（200），
  生成器随后出错，客户端拿到的是截断的 200 而不是 500。解法：把可能失败的动作
  （开文件、查数据）放到生成器之外、首个字节之前。
- **FileResponse 路径遍历**：文件名来自请求参数直接拼路径时，请求 `..%2F..%2Fetc%2Fpasswd`
  （URL 编码的 `../`）就能读基目录之外的文件。解法：`Path.resolve()` 后断言结果仍在
  基目录内，或用数据库 id 间接映射真实路径。
- **response_class 遇上 `-> str` 返回注解**：注解被当成响应模型，str 先被 JSON 编码，
  正文多出一层引号。解法：返回裸 str 就留空返回注解（见 `main.py` 的 `/html-class`）。

问答：

- **Q：response_model 会改函数返回值吗？** 不会。过滤发生在序列化阶段，内存里的
  USERS 照样存着密码；它只裁响应，不裁数据——"出不去"与"不存在"是两回事。
- **Q：只删一两个字段，也要新建模型吗？** 可用 `response_model_exclude={"password"}`
  做黑名单；但新增敏感字段时黑名单默认放行，白名单默认拦截，对外接口优先白名单。
- **Q：重定向选 307 还是 302？** GET 场景两者等效；重定向 POST 时必须 307/308，
  302 会被浏览器改写成 GET，表单提交的数据就丢了。
- **Q：一个响应能同时是两种形态吗？** 不能，正文形态唯一。"网页里带下载"的正确
  组合是返回 HTML、页内 `<a href>` 指向 FileResponse 端点，而不是塞两种正文。
