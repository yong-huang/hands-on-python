"""lab 13 · WebSocket 长连接 —— 演示应用: 聊天室 API。

一条 WebSocket 连接的一生分三段, 本应用把三段都摆在明面上:

    握手升级   客户端发一条带 Upgrade: websocket 头的普通 HTTP GET, 服务端
               accept() 回 101 Switching Protocols; 此后同一条 TCP 连接不再
               说 HTTP, 改说 WebSocket 帧
    消息循环   端点函数里 while True + receive_text()/send_text(): 每条连接
               由一个 asyncio 任务从头到尾伺服, 函数不返回, 连接就活着
    断线清理   对端断开(正常关闭/进程被杀/拔网线)时 receive_text 抛
               WebSocketDisconnect, finally 把连接摘出房间并广播系统消息

消息协议(JSON 文本帧):
    客户端 -> 服务端: {"type": "join", "user": "alice"}   进房, 触发 join 系统广播
                      {"type": "chat", "text": "你好"}     聊天, 广播给全房间(含发送者)
                      {"type": "leave"}                    主动退房, 服务端广播后关闭连接
    服务端 -> 客户端: {"type": "system", "event": "join"|"leave", "user": .., "online": 人数}
                      {"type": "chat", "user": 发送者, "text": .., "room": .., "online": 人数}

    GET /rooms   REST 旁路: {"房间名": 活连接数}, 与 WebSocket 同进程并存, 随时旁观

运行(由 13_websocket.sh 调用):
    .venv/bin/uvicorn main:app --app-dir labs/13_websocket --host 127.0.0.1 --port 8913
"""
import contextlib
import json
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI(
    title="lab13 · WebSocket 长连接",
    description="握手升级 / 消息循环 / 房间连接管理器 / 断线清理 / 广播容错",
)


class ConnectionManager:
    """连接管理器: 全部房间状态收进一张字典, 全进程共用这一个实例。

    可以把它想成前台的一排格子柜: 每个房间一个格子(set), 谁进房往格子里
    放一张连接凭据, 谁退房就抽走; 但和真柜台不同的是, 整个进程只有一位
    "柜员"(事件循环)在操作它, 这也是无锁也能安全的原因(见 broadcast 注释)。
    """

    def __init__(self) -> None:
        # 房间名 -> 该房间所有已 join 的连接。类型注解即文档:
        # dict[str, set[WebSocket]] 一眼看清"房间到连接集合"的两层结构
        self.active_rooms: dict[str, set[WebSocket]] = {}

    def connect(self, room: str, ws: WebSocket) -> None:
        """进房: setdefault 保证房间第一次有人来才建集合。"""
        self.active_rooms.setdefault(room, set()).add(ws)

    def disconnect(self, room: str, ws: WebSocket) -> None:
        """退房: discard 对不存在的连接也不报错, 所以清理逻辑可以放心重入。"""
        conns = self.active_rooms.get(room)
        if conns is None:
            return
        conns.discard(ws)
        if not conns:
            # 空房间连键一起删: /rooms 里不残留 0 人空房, 字典状态永远真实
            del self.active_rooms[room]

    def count(self, room: str) -> int:
        """房间当前人数; 房间不存在算 0。"""
        return len(self.active_rooms.get(room, set()))

    async def broadcast(self, room: str, text: str) -> None:
        """把一条文本消息发给房间里所有连接(含发送者自己)。

        遍历前必须 list() 拷贝: broadcast 体内有 await, 每发一条都让出事件
        循环; 让出期间可能有别的连接 join/leave —— 那是另一个协程在改同一个
        set, 直接 for ws in set 会撞上 "RuntimeError: Set changed size during
        iteration"。先拷一份快照, 迭代就只跟快照有关, 谁进谁出都不炸循环。
        """
        targets = list(self.active_rooms.get(room, set()))
        for ws in targets:
            try:
                await ws.send_text(text)
            except Exception:
                # 发送失败 = 对端已死, 当场摘除。只靠端点 finally 清理不够:
                # 死连接若仍躺在房里, 之后每一次广播都要撞它一次、失败一次
                self.disconnect(room, ws)


manager = ConnectionManager()  # 模块级单例: 与 app 同生命周期, 跨连接共享


def _system(room: str, event: str, user: str | None) -> str:
    """系统消息(join/leave): 带上广播那一刻的房间人数, 客户端可直接断言。"""
    return json.dumps(
        {"type": "system", "event": event, "user": user, "room": room,
         "online": manager.count(room)},
        ensure_ascii=False,
    )


@app.get("/rooms")
async def list_rooms() -> dict[str, int]:
    """REST 旁路: 返回 {"房间名": 人数}, 供教学断言随时旁观房间状态。"""
    return {room: manager.count(room) for room in sorted(manager.active_rooms)}


@app.websocket("/ws/{room}")
async def chat_room(websocket: WebSocket, room: str) -> None:
    """WebSocket 端点: 一条连接 = 一个 asyncio 任务从头跑到尾地执行本函数。

    函数不返回, 连接就不断; 体内每个 await 都是事件循环可能切去伺服其他
    连接的切换点 —— 所以"同一房间并发来消息"本质是多个协程交错执行。
    """
    # 第一步永远是 accept: 服务端在 101 握手上签字。忘了 accept 就读消息,
    # 握手永远完不成, 客户端会停在建立连接阶段一直等待
    await websocket.accept()
    user: str | None = None
    joined = False
    try:
        # 消息循环: WebSocket 端点没有"一次请求"的概念, 循环本身即服务
        while True:
            raw = await websocket.receive_text()  # 无消息时在此挂起并让出事件循环
            try:
                msg: dict[str, Any] = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps(
                    {"type": "error", "detail": "消息必须是 JSON 文本"}, ensure_ascii=False))
                continue
            if not isinstance(msg, dict):
                await websocket.send_text(json.dumps(
                    {"type": "error", "detail": "消息必须是 JSON 对象"}, ensure_ascii=False))
                continue
            mtype = msg.get("type")
            if mtype == "join":
                user = str(msg.get("user") or "anon")
                manager.connect(room, websocket)
                joined = True
                # 连接此刻已在房里, join 广播会发给自己一份(online 含自己)
                await manager.broadcast(room, _system(room, "join", user))
            elif mtype == "chat":
                if not joined:
                    await websocket.send_text(json.dumps(
                        {"type": "error", "detail": "请先 join 再聊天"}, ensure_ascii=False))
                    continue
                body = json.dumps(
                    {"type": "chat", "user": user, "text": str(msg.get("text", "")),
                     "room": room, "online": manager.count(room)},
                    ensure_ascii=False)
                await manager.broadcast(room, body)
            elif mtype == "leave":
                break  # 主动退房: 跳出循环, 清理统一走 finally, 不写第二份
            else:
                await websocket.send_text(json.dumps(
                    {"type": "error", "detail": f"未知消息类型: {mtype!r}"}, ensure_ascii=False))
    except WebSocketDisconnect:
        # 断线的入口: 对端正常关闭、进程被杀、网络断开, receive_text 都从这里抛
        pass
    finally:
        # 断线清理的唯一出口: 主动 leave 与异常断线汇到同一段代码, 不写两份
        if joined:
            # 先把自己摘出房间再广播: 离开消息只发给还活着的连接, 人数已扣减
            manager.disconnect(room, websocket)
            await manager.broadcast(room, _system(room, "leave", user))
            # 最后补一个关闭握手; 对端已死时这一步会失败, 吞掉即可
            with contextlib.suppress(Exception):
                await websocket.close()
