# 14 · 流式响应与 SSE：chunked 管运输，SSE 管格式与重连

> FastAPI 的响应体不必攒齐再发：服务器每生成一段就发送一段。读完本篇，你能用
> StreamingResponse 做分块传输，按 SSE 协议手写事件报文，并分清两条路的分工——
> chunked 解决"怎么发"，SSE 解决"发的是什么、断了怎么办"。

## Background

默认情况下，HTTP 响应"整进整出"：端点函数（处理某个路由的函数）把结果全部拼好、
交出完整响应体，服务器量出总长度填进 Content-Length，再一次性发给客户端。内容小，
这样做没有任何问题。

撞墙出现在大文件场景：几个 GB 的日志导出，服务端要先把整个文件装进内存，客户端也
要等全部传完才见第一个字节。

长任务场景同样撞墙：一个要跑 3 分钟的部署流程，用户盯着空白页面等 3 分钟，拿不到
任何中间进度。

分块传输（chunked，把响应体拆成小块逐块发送的 HTTP 传输方式）与 SSE（Server-Sent
Events，服务器推送事件）为这两类场景而生：前者让总长未知的响应也能边生成边发，
后者在这条逐块通道上规定了事件报文格式与断线重连语义。

## What

**定义**：流式响应指响应体由生成器（每次 yield 产出一个片段的函数）逐段供给的响应，
FastAPI 里就是 `StreamingResponse`——把生成器包成响应对象，yield 一次，网络上多一块。

SSE 是构建在分块传输之上的报文格式约定：Content-Type 固定为 text/event-stream，
内容按 `event:`/`id:`/`data:`/`retry:` 四类行组织，每条事件以一个空行收尾。

可以把 chunked 想象成**水桶接力**：水一桶一桶递过去，不必等蓄满整个水池。但和水桶
不同的是，接力只管"一桶一桶递"，桶里装什么、洒了怎么办它一概不管。

可以把 SSE 想象成**有格式的新闻推送**：每条新闻有编号（id）、栏目（event）、正文
（data）。但和新闻客户端不同的是，SSE 不管传输本身——它仍要坐 chunked 的车出门。

| 部件 | 分块传输（chunked） | SSE |
|:--|:--|:--|
| 传输层 | `Transfer-Encoding: chunked` | 同样是 chunked |
| 内容格式 | 无约定，纯字节流 | 四类行 + 空行分隔的事件 |
| 断线重连 | 无 | `retry:` 间隔 + `Last-Event-ID` 续传 |

`Transfer-Encoding: chunked` 是 HTTP/1.1 里声明"逐块发送、每块自带长度"的响应头。

上下两条管线对照：上面 chunked 只管运输，下面 SSE 在运输之上加格式与重连语义；红色独立节点是攒齐一次发的反面教材。

![Lab 14 · 流式两条管线：chunked 管运输，SSE 管格式](images/streaming_sse.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/14_streaming_sse/images/streaming_sse.html)
> （或本地打开 [`images/streaming_sse.html`](images/streaming_sse.html)）。

## When to Use

典型场景：LLM 式输出（token 逐个产出、逐个上屏）；大文件导出（边读磁盘边发，不占
整块内存）；进度与通知推送（任务进行到第几步就推第几步，前端用 EventSource——
浏览器原生的 SSE 客户端对象——逐条接收）。

何时不用：一次性小响应。几百字节的 JSON 攒齐不过几微秒，套 StreamingResponse 反而
失去 Content-Length，沿途的缓存、压缩、测量都要多担一分不确定。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 整体 JSON | 攒齐一次发，有 Content-Length | 小响应、需要缓存与内容协商 |
| chunked 流 | 逐块发，内容格式自定义 | 大文件、生成式输出、自定义协议 |
| SSE | 事件格式 + 自动重连，单向推送 | 进度、通知、行情等服务器推送 |
| WebSocket | 双向通道，独立协议 | 客户端也要持续发消息的场景 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（Python 3.13、fastapi、httpx），未创建则先在仓库根
执行 `./scripts/load_resources.sh`。

演示应用在本目录 `main.py`，由 uvicorn（FastAPI 配套的 ASGI 服务器，监听端口并把
HTTP 请求翻译成对应用的调用）托管在端口 8914。

```bash
cd fastapi/14_streaming_sse && ./14_streaming_sse.sh demo
```

demo 共 5 步：分块到达时刻对照、响应头对照、SSE 报文原文逐行标注、SSE 事件解析、
chunked 与 SSE 对比表。真实输出（节选，`...` 处省略了中间输出）：

```text
    $ AsyncClient.stream("GET", "http://127.0.0.1:8914/stream-chunks")   ->   HTTP 200
        到达 t= 0.442s  [chunk 0] ...
        到达 t= 0.844s  [chunk 1] ...
        到达 t= 1.246s  [chunk 2] ...
        [PASS] 3 块全部到达
        [PASS] 按序到达
        [PASS] 相邻块到达间隔 1-0 >= 0.3s  (实测 0.402s)
        [PASS] 相邻块到达间隔 2-1 >= 0.3s  (实测 0.402s)
        [PASS] 首块先于整包(流式证据)  (首块 t=0.442s, 末块 t=1.246s)
        [PASS] 拼接结果完整  (共 88 字节)
...
    $ GET http://127.0.0.1:8914/events  ->  解析出 4 个事件
        事件1: event=progress  id=1  data='[1/3] 编译完成'
...
        事件4: event=done      id=4  data='全部 3 步完成'
        [PASS] 共 4 个事件(3 progress + 1 done)  (实测 4 个)
```

诚实预期：到达时刻由代码里的 sleep 决定，断言只设下限、不与机器比快。3 次实测：
首块到达 0.43~0.45s，相邻块间隔 0.40~0.41s，SSE 恒定解析出 4 个事件；对照组
/chunks-buffered 单次到达 1.22~1.23s。

## How It Works

chunked 编码回答"总长未知怎么发"。响应头先于响应体发出，生成器此刻还没跑完，
Content-Length 无从填起；chunked 把长度声明下放到每个块，块前写明本块字节数，末尾
再发一个长度为 0 的块收尾。demo[2] 的响应头对照正是这条规则的产物。

生成器与响应生命周期的关系：`StreamingResponse(body())` 返回时生成器尚未执行，迭代
发生在响应发送阶段——Starlette（FastAPI 底层的 web 框架）逐次 await 生成器，每拿到
一块就发给服务器进程。

迭代中途抛异常时，200 状态行早已发出，客户端只能收到半截内容（坑见下节第一条）。

SSE 四类行逐个看（对应 demo[3] 的逐行标注）：

- `retry: 2000`：告诉 EventSource 断线后等 2000ms 再重连，省略时默认约 3000ms；
- `id: 1`：事件编号，EventSource 记住最后一条，重连时经 `Last-Event-ID` 请求头带回，
  服务端据此从断点续传；
- `event:`/`data:`：事件类型与载荷，只有攒到 `data:` 的事件才派发，所以开场块里没有
  `data:` 的 `id: 0` 不会触发监听器；
- 空行：事件边界，漏掉它相邻两条事件会被攒成一条，永不派发。

还有一层常被忽略的干扰：反向代理（nginx 等）默认把上游响应攒进缓冲区再转发，逐块
到达会被憋成一次性到达；nginx 下用 `X-Accel-Buffering: no` 逐响应关闭，本实验的
/events 已带上该响应头（代理层的更多行为见 lab 23）。

## Pitfalls & Q&A

- **生成器抛异常时，响应已经 200**：StreamingResponse 在首次迭代前就发出状态行，
  生成器中途抛错只能断流、记日志，客户端收到半截内容。解法：校验、鉴权、资源准备
  全部放在生成器之前（端点函数体内、构造 StreamingResponse 之前），lab 03 的"出口
  闸"同理。
- **中间件或代理把流憋成一坨**：GZipMiddleware（压缩中间件）等会攒满缓冲再发出，
  逐块到达退化成一次性到达。解法：流式路由跳过压缩；nginx 场景配 `X-Accel-Buffering: no`
  响应头（见 How It Works 末段）。
- **SSE 忘写空行，客户端收不到事件**：每条事件必须以空行收尾，缺了它解析器一直在等
  事件结束。解法：把报文编进 sse_event 这类小函数，让 `\n\n` 成为固定后缀。
- **media_type 没设 text/event-stream**：EventSource 只认这个 Content-Type，缺省的
  text/plain 会让浏览器拒绝建流。解法：SSE 端点显式声明 media_type。
- **Q：SSE 与 WebSocket 怎么选？** 单向推送选 SSE：走普通 HTTP、代理友好、断线重连
  协议自带；双向实时（聊天、协同编辑）才上 WebSocket。
- **Q：EventSource 重连后事件会从断点继续吗？** 协议支持但不自动生效：浏览器只负责
  带回 Last-Event-ID，服务端要自己实现"按 id 跳过已发事件"，不实现就从头再推。
- **Q：客户端怎么消费？** python 用 httpx 的 `aiter_bytes()`（demo[1] 的用法），浏览器
  用一行 `new EventSource("/events")`，再按事件名 addEventListener 逐条接收。
