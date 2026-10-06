# 13 · WebSocket 长连接：握手升级、消息循环与断线清理

> FastAPI 的 WebSocket 实验：以聊天室 API 为载体，拆开一条连接从生到死的三个阶段——
> HTTP 握手升级、while True 消息循环、断线时的自动清理。读完本篇，你能写出让多个
> 客户端在同一房间互发消息的服务，并解释连接断掉之后房间人数为什么永远是对的。

## Background

网页要做"服务器主动推"的场景（聊天室最典型）曾只有一条路：轮询（浏览器定时重复发
HTTP 请求，问一句"有新消息吗"）。代码通常是 `setInterval(() => fetch("/messages"), 1000)`，
每次都走完整的请求-响应。

间隔立刻变成两难。设 1 秒，绝大多数请求的回答是"没有"，服务器白建连接、白序列化响应；
设 30 秒，消息平均迟到 15 秒。一个方向撞上浪费，另一个方向撞上延迟，中间没有舒服的位置。

浏览器与服务器需要第三条路：连接只建一次，之后两个方向随时都能说话。2008 年起，浏览器
标准组织 WHATWG 在 HTML5 草案里提出把 HTTP 连接升级成双向通道；IETF（发布互联网协议
标准的机构）在 2011 年把它定为 RFC 6455，这就是 WebSocket 协议。

## What

**定义**：WebSocket 是一种在单条 TCP（传输层的可靠字节流通道）连接上提供全双工（双方
可以同时主动发送）通信的应用层协议。它先用一次 HTTP 请求"敲门"，把这条连接从 HTTP 语义
切换成帧（frame，短定长头加载荷的传输单元）格式，此后消息以帧为单位双向流动。

可以把 HTTP 想成寄信：每封信一来一回，信使送完就走；WebSocket 更像接通一根电话线：
线路一直通着，两端任何时刻都能开口。失效边界：接通不等于有人在说话——连接可以长时间
挂着没有任何消息，对端是否还活着要靠关闭帧或心跳判断，而不是线路本身。

一条连接的一生分三个阶段（端点函数：处理某个路由的 async 函数，下同）：

| 阶段 | 做什么 | 由谁负责 |
|:--|:--|:--|
| 握手升级 | HTTP GET 换来 101 应答，协议切到帧 | 客户端 `connect()`、服务端 `accept()` |
| 消息循环 | `while True` 里逐帧收发 | 端点函数，一条连接一个 asyncio 任务 |
| 断线清理 | 连接断开时摘除并广播系统消息 | 端点函数的 `finally` 块 |

表中的 asyncio 任务（Python 标准库 asyncio 的并发单元，由事件循环单线程逐个推进）是
理解下文的关键：一条连接从头到尾由同一个任务伺服。

时序自上而下：握手进房、广播互发，最后是 alice 断线后的 finally 清理；右侧 ConnectionManager 见证每次人数变化。

![Lab 13 · WebSocket 聊天室：握手、广播与断线清理](images/websocket.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/13_websocket/images/websocket.html)
> （或本地打开 [`images/websocket.html`](images/websocket.html)）。

## When to Use

典型场景：聊天与即时通讯，消息何时到达由人决定，推送比询问合适；协同编辑，多端要近乎
同时看到彼此的光标与修改；行情与监控面板，服务端数据一变就推给所有打开的页面。

何时不用：更新频率低（几分钟一次）时轮询更简单，不必维护长连接的状态；只需要服务端往
浏览器单向推（通知、进度条）时用 SSE（Server-Sent Events，基于 HTTP 的单向流）更省事；
一问一答的接口本来就是 HTTP 的本职。

| 方案 | 通信方向 | 开销与实时性 | 什么时候选它 |
|:--|:--|:--|:--|
| 轮询 | 单向，客户端拉 | 每次完整 HTTP，延迟约等于间隔 | 更新频率低，要最简单的实现 |
| 长轮询 | 单向，客户端拉 | 请求挂住直到有数据，每次到货重建连接 | 服务端没有长连接设施时的折中 |
| SSE | 单向，服务端推 | 一条 HTTP 流，断线自动重连 | 只需要服务端往浏览器推 |
| WebSocket | 双向 | 一次握手，之后帧开销很小 | 双方都要主动发：聊天、协同、实时对局 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（Python 3.13、fastapi、uvicorn[standard]——FastAPI 配套
的 ASGI 服务器），未创建则先在 fastapi 目录执行 `fastapi/scripts/load_resources.sh`。

[standard] 变体自带 websockets 库（即 WebSocket 协议的 Python 实现，客户端与服务端共用）。

演示应用是本目录 `main.py`：`/ws/{room}` 是 WebSocket 端点（join 进房、chat 广播、
leave 或断线退房），`GET /rooms` 返回 `{房间: 人数}`。端口 8913，运行：

```bash
cd fastapi/13_websocket && ./13_websocket.sh demo
```

demo 自动起停服务，共 6 步：

1. 握手升级：打印双方报文头；普通 HTTP GET 打同一路径被 404 拒绝；
2. 消息循环：alice/bob 同房间互发消息，各自收到对方的；
3. 房间状态：连接保持期间，`/rooms` 断言 `{"lobby": 2}`；
4. 断线清理：alice 正常断开，bob 收到系统离房消息，`/rooms` 变 `{"lobby": 1}`；
5. 广播容错：carol 被 `kill -9` 不告而别，其余客户端照常收发；
6. 生命周期三阶段速查表。

websockets 客户端由演示脚本运行时写入临时目录执行，脚本退出即清理。真实输出（节选，
`...` 处省略了中间章节；`sec-websocket-key`/`sec-websocket-accept` 每次运行都不同）：

```text
    客户端发出的握手请求: GET /ws/lobby
      upgrade: websocket
      connection: Upgrade
      sec-websocket-key: WNdYiux/iaG/HitKSKhchQ==
    服务端回来的握手响应:
      状态码: 101 (101 = Switching Protocols)
      upgrade: websocket
      sec-websocket-accept: +nVPsoU/bfyBLjvZfaHPMvG3F9g=
        [PASS] 握手状态码 = 101
        [PASS] 响应头 upgrade = 'websocket'
...
    bob 收到: {"type": "system", "event": "leave", "user": "alice", "room": "lobby", "online": 1}
        [PASS] bob 收到系统消息 event = 'leave'
        [PASS] 离房的是 alice = 'alice'
        [PASS] 人数已扣减 online = 1
    GET http://127.0.0.1:8913/rooms -> {"lobby": 1}
        [PASS] /rooms(alice 已被清出) = {'lobby': 1}
...
  演示完成: 28 项断言全部通过
```

预期与实测一致：三次完整运行均为 28 项断言全部通过。消息里的 `online` 与 `/rooms` 的
数字只由进房/退房次序决定，时序全部由脚本编排，断言不含随机的消息次序。

## How It Works

**握手升级**：客户端发出的是一条普通 HTTP GET，但带三个头——`Upgrade: websocket`（想
把协议换成 WebSocket）、`Connection: Upgrade`（提醒链路上的代理别缓存这次应答）。

`Sec-WebSocket-Key` 是 16 字节随机数的 base64；服务端应答 101，并回
`Sec-WebSocket-Accept: base64(SHA1(Key + 固定 GUID))`。

Key/Accept 成对的作用：应答必须用本次的 Key 现算，缓存代理拿旧应答回放无效，普通 HTTP
响应也冒充不了握手。demo [1] 看到的 `101` 与 `upgrade: websocket` 就是这次协商。

**消息循环**：每条连接由一个 asyncio 任务从头跑到尾执行端点函数，函数体是
`while True: raw = await websocket.receive_text()`——没有帧时这一步挂起、让出事件循环，
帧到达才醒来。任务不返回，连接就不断；每个 `await` 都是事件循环切去伺服其他连接的位置。

**连接管理器为何无锁**：`ConnectionManager.active_rooms` 是一张
`dict[str, set[WebSocket]]`。

asyncio 是协作式调度，协程只在 `await` 处让出；
`connect`/`disconnect` 是不含 `await` 的同步代码，执行中途插不进别的协程，无锁也不会
改坏这张表。

`broadcast` 不同——它体内有 `await`，遍历期间其他连接可能正好 join/leave，改的又是
同一个 set，直接迭代会撞 `Set changed size during iteration`：

```python
targets = list(self.active_rooms.get(room, set()))  # 遍历前拷贝快照
for ws in targets:              # 只跟快照有关, 期间谁进谁出都不影响本次循环
    try:
        await ws.send_text(text)
    except Exception:
        self.disconnect(room, ws)  # 发送失败 = 对端已死, 当场摘除
```

demo [5] 印证容错：carol 的进程被 `kill -9`，TCP 直接断开，服务端 `receive_text` 抛出
`WebSocketDisconnect`（Starlette——FastAPI 基于的路由框架——表示对端断开的异常）。

`finally` 摘除并广播 leave；死连接若仍在快照里，发送失败的 `except` 也会当场清走它。

## Pitfalls & Q&A

- **忘了 accept，客户端永远连不上**：端点函数不先 `await websocket.accept()` 就去收
  消息，101 发不出去，客户端 `connect()` 停在握手上直到超时。解法：`accept()` 永远是
  端点函数的第一句。
- **广播遍历时集合被修改**：并发进出房期间广播偶发 `Set changed size during iteration`。
  原因与解法见 How It Works——遍历前 `list()` 拷贝快照。
- **只靠 finally 清理一次不够**：`finally` 只在断开连接自己的任务里执行；广播时若对端
  已死而服务端尚未感知，`send_text` 抛错，死连接留在房里，之后每次广播都撞它一次。
  解法：`broadcast` 里捕获发送异常并当场 `disconnect`——发送失败也要清。
- **多 worker 部署时房间字典不共享**：`active_rooms` 是进程内对象，`uvicorn --workers 4`
  时同一房间的人被分到不同进程，互不可见，`/rooms` 的数字对不上。解法：房间状态与广播
  外移到共享层（如 Redis pub/sub）；进程隔离的机制见 lab 23。
- **Q：网线被拔，服务端多快知道？** TCP 层断开（正常关闭、进程被杀）几乎立刻——demo
  [5] 在 `kill -9` 后毫秒级收到 leave 广播；拔网线这类静默断连收不到任何信号，连接进入
  半开状态（一方以为还连着，另一方已消失），只能靠心跳兜底：websockets 库默认每 20 秒
  发一次 ping，连续收不到 pong 才判定断开。
- **Q：消息必须是 JSON 吗？** 协议只认字节：`receive_text`/`receive_bytes` 收文本或
  二进制帧，`receive_json` 只是"收文本再 `json.loads`"的快捷方式，解析失败会抛异常。
  demo 用 JSON 只为让断言里的字段可读。
- **Q：广播为什么发给发送者自己？** 房间广播的语义是"房里每人一份"，发送者也在房里
  （demo [2] 的回显断言即证据）。要"只发给别人"，在快照循环里跳过发送者即可。
