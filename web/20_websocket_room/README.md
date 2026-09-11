# 20 · ⚠️ 选做——WebSocket 实时聊天室：长连接与广播

> 全系列收官的加餐：HTTP 的"请求-响应"配对在实时场景失灵——聊天室需要**服务端主动推**。
> WebSocket 一次握手升级为长连接，广播就是遍历房间连接列表逐个 send。本实验用
> TestClient 双客户端实测：A 发 → B 收、断开减员、HTTP 端点查在线人数——
> 全程只依赖 FastAPI 自带的 WebSocket 支持。

## 1. 为什么需要它

轮询/长轮询模拟"实时"的时代已经过去，但 WebSocket 的三个事实不亲手做过就不踏实：**连接是有状态的**——服务端必须维护"房间 = 连接列表"，断开要清理否则人数虚高；**广播就是循环 send**——没有魔法，慢消费者需要单独的背压策略；**断线靠 `WebSocketDisconnect` 异常感知**——它是清理与人数准确性的信号源。本实验把三个事实都做成断言。

## 2. 总览：核心机制一图看懂

![聊天室：一次握手，双向长连接](images/websocket_room.svg)

一句话心智模型：**握手一次，连接归会话——此后服务端可随时主动推，客户端也可随时发，没有配对关系**。看图时序：Alice/Bob 先后握手（各自的加入广播）、A 发消息双向收到、Bob 断开触发"离开"广播——与 demo 的执行顺序一一对应。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/20_websocket_room/images/websocket_room.html)
> （或本地打开 [`images/websocket_room.html`](images/websocket_room.html)）。

## 3. 快速开始

```bash
cd web/20_websocket_room
source ../.venv/bin/activate
python3 websocket_room.py    # 内置双客户端断言（TestClient）
# 浏览器手测：注释掉 main 的 demo 部分、改为 uvicorn.run 后打开 / 的极简聊天页
```

真实输出节选（macOS, CPython 3.14 · FastAPI 0.141.1）：

```
========================================================
[1. 双客户端广播：A 发 → B 收；断开后人数减一（验收点）]
========================================================
  Alice 连入 → 广播 '系统：Alice 加入了聊天室' · 房间 1 人
  A 发消息 → A/B 都收到 'Alice: hi'（广播生效）
  Bob 断开 → A 收到 '系统：Bob 离开了聊天室' · 房间剩 1 人
  HTTP 端点核对: /rooms/demo/count → 1
  剩余成员继续聊天: 'Alice: 还在'（房间未因有人离开而不可用）

全部断言通过 ✓ 广播互收、断开减员、HTTP 人数端点、断开后房间继续可用
```

诚实预期：

- **广播包含发送者自己**：A 也会收到 "Alice: hi"（回声），断言里先消费自己的回声再等对方消息——前端通常按昵称把回声渲染成右侧气泡
- **广播是逐个 `await send`**：一个慢客户端会拖慢整个广播循环（背压问题）——生产要按客户端写队列异步刷
- **未实现 Litestar 对照路径**：清单标注二选一，本站选了 WebSocket 主线；Litestar 的 DI 对照可按项目 9 的方法自行扩展
- **TestClient 之外建议浏览器手测**：应用内置 `/` 极简聊天页，真实浏览器多开两个标签页即可体验广播

## 4. 核心概念

### 4.1 WebSocket 握手与生命周期

WebSocket 以 HTTP GET（带 `Upgrade: websocket` 头）开始握手，成功后这条 TCP 连接升级为全双工通道。服务端 `await websocket.accept()` 接纳连接；此后 `receive_text`/`send_json` 双向自由——**没有请求-响应配对**，消息的语义由应用层自己定义（本实验用 JSON 的 text 字段）。

### 4.2 连接管理器：房间就是列表

`ConnectionManager` 的 `rooms: dict[str, list[WebSocket]]` 是全部状态——connect 追加、disconnect 移除、broadcast 遍历。在线人数、房间隔离、私聊（定向 send）、踢人（close 指定连接）都是对这份列表的操作。广播遍历时用**列表拷贝**：断开处理移除连接不会打乱正在进行的迭代。

### 4.3 断线感知与清理

对端断开后，服务端挂起的 `receive_text()` 抛 `WebSocketDisconnect`——except 分支里移除连接并广播离开。人数准确性完全依赖这条清理路径；广播的 `count` 字段随每条消息携带，客户端可实时渲染在线人数（本实验用它断言减员）。

### 4.4 与 HTTP 推文的取舍

轮询（客户端定时 GET）实现最简单、实时性最差；WebSocket 实时性最好、代价是连接状态管理（内存/扩容粘性/断线重连）。聊天/协同编辑/行情推送选 WebSocket；低频状态更新用轮询或 SSE 足矣。

## 5. 关键代码解析

**为什么广播遍历用 `list(self.rooms[room])` 拷贝？**

```python
async def broadcast(self, room: str, text: str) -> None:
    for ws in list(self.rooms.get(room, [])):  # 拷贝遍历
        await ws.send_json({"text": text, "count": ...})
```

`await send` 期间事件循环可能调度其他协程（某客户端断开 → `disconnect` 修改了原列表）——直接遍历原列表会 `RuntimeError`（列表在迭代中被修改）或跳过/重复。拷贝一份遍历是并发容器的标准防御。

坑清单：

- **用 `send_json` 发聊天内容**：服务端 `receive_text` 收到的是 JSON 字符串原样文本，广播出去变成 `Alice: {"text":"hi"}`——消息协议两端要约定一致（本实验真实踩中）
- **忘记处理 `WebSocketDisconnect`**：断开的连接留在列表里，人数只增不减、广播持续向死连接发送
- **广播不含发送者时漏掉回声断言**：客户端消息队列顺序（加入广播 → 回声 → 对方消息）必须逐条对齐，跳一条后面全错位
- **房间人数只信客户端**：以服务端列表为准并暴露 HTTP 端点核对——本实验 count 断言走的就是服务端状态

## 6. 文件结构

```
20_websocket_room/
├── README.md                 # 本教程文档
├── websocket_room.py         # 主演示脚本：连接管理器 + 双客户端断言 + 极简聊天页
└── images/
    ├── websocket_room.json   # 图源（typed JSON IR，可编辑重渲染）
    ├── websocket_room.html   # 交互示意图（浏览器打开）
    └── websocket_room.svg    # 双主题矢量图（本 README §2 内嵌）
```

`websocket_room.py` 内容：`ConnectionManager`（rooms 列表 / connect / disconnect / broadcast）/ `chat` WS 端点（加入广播 → 收发循环 → 断开清理）/ `/rooms/{room}/count` 人数端点 / 极简 HTML 聊天页 / `demo_websocket()` 双客户端全流程断言。环境：`web/.venv`（fastapi + httpx）。

## 7. 面试要点

**Q1: WebSocket 与 HTTP 轮询/SSE 的区别与选型？**
轮询：客户端定时拉，实时性差、无效请求多；SSE：服务端单向推（文本），实现简单；WebSocket：全双工、二进制/文本帧、实时性最好，代价是连接状态管理。聊天/协同/游戏选 WS，通知推送 SSE 足够。

**Q2: WebSocket 连接在多 worker/多实例部署下的问题？**
连接是有状态资源且分散在各进程内存里——A 在 worker1、B 在 worker2 时广播够不着。解法：消息走 Redis Pub/Sub 等共享通道，各 worker 订阅后推给自己的连接；或会话粘性 + 房间路由。

**Q3: 服务端怎么感知客户端断线？心跳的意义？**
TCP 断开时 `receive` 抛 WebSocketDisconnect；但半开连接（拔网线）感知不到——需要应用层心跳（定时 ping/pong + 超时踢除），否则"在线人数"虚高、死连接堆积。

**Q4: 广播的性能瓶颈与背压？**
逐个 `await send`：慢客户端阻塞整个广播循环。解法：每连接独立发送队列 + 异步刷写、慢消费者限流或踢除；消息体尽量小、房间分组广播缩小扇出。

**Q5: FastAPI 里 WebSocket 端点和 HTTP 端点能共存吗？认证怎么做？**
同一 app 天然共存（同一 ASGI 栈）。WS 认证通常在握手阶段做：cookie/token 作为查询参数或首帧凭证，依赖 `websocket.headers` 读取——拒绝就在 accept 之前 close。

## 8. 总结

1. **WebSocket = 一次握手 + 全双工长连接**：服务端可主动推，没有请求-响应配对
2. **房间就是连接列表**：广播是循环 send（拷贝遍历防并发修改），人数以服务端列表为准
3. **断线靠 WebSocketDisconnect 感知**：清理连接才有准确的在线人数，心跳防半开连接
4. **消息协议两端约定一致**：send_json 配 receive_json 转发会带出原始 JSON 字符串（实测）
5. **全系列 20 站收官**：零依赖地基 → Flask → FastAPI → Django → 三框架对比 → 生产部署 → 综合交付——从 environ 到实时聊天室，Python Web 的主干已经打通

---

## 🏁 全系列毕业

20 站全部完成：**能力上，你可以独立完成"选型 → 开发 → 测试 → 部署"的完整闭环**。面试时，每个实验 README §7 的问答式考点都是从实测里长出来的答案——不是背的，是跑出来的。
