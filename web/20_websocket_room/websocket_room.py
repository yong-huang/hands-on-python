"""
20 · WebSocket 实时聊天室 —— 长连接与广播（选做前沿）
Web 框架清单项目 20：HTTP 之外的第二种通信形态——服务端可以主动推消息了

WebSocket 与 HTTP 的本质差异（对应 images/websocket_room.svg）:
- 一次握手:  GET 升级为 WebSocket 连接后，这条 TCP 长连接就"归"这个会话了——
            双向都可主动发消息，不再有"请求-响应"的配对关系
- 连接管理器: 房间 = 连接列表；广播 = 遍历列表逐个 send——在线人数、私聊、房间
            踢人，全是对这个列表的操作
- 断线感知:  对端断开后 receive_text 抛 WebSocketDisconnect——这是清理连接的信号，
            也是"在线人数"准确性的来源

验收断言:
- 双客户端互收消息（A 发 → B 收到广播）；一方断开后房间人数减一且不再收消息
- HTTP 端点可查房间人数（/rooms/{room}/count）

用法:
- source ../.venv/bin/activate && python3 websocket_room.py
- 浏览器手测: 起服务后打开 / 的极简聊天页

交互示意图: 用浏览器打开 images/websocket_room.html
"""

import sys
import warnings

warnings.filterwarnings("ignore", message=".*httpx.*testclient.*deprecated.*")

from fastapi import FastAPI, WebSocket, WebSocketDisconnect  # noqa: E402
from fastapi.responses import HTMLResponse  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

app = FastAPI(title="WebSocket 聊天室")


class ConnectionManager:
    """房间 = 连接列表。广播 = 遍历列表逐个 send；断开 = 从列表移除"""

    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, room: str, ws: WebSocket) -> None:
        await ws.accept()
        self.rooms.setdefault(room, []).append(ws)

    def disconnect(self, room: str, ws: WebSocket) -> None:
        if ws in self.rooms.get(room, []):
            self.rooms[room].remove(ws)

    async def broadcast(self, room: str, text: str) -> None:
        for ws in list(self.rooms.get(room, [])):  # 拷贝遍历：断开时不影响迭代
            await ws.send_json({"text": text, "count": len(self.rooms[room])})

    def count(self, room: str) -> int:
        return len(self.rooms.get(room, []))


manager = ConnectionManager()


@app.websocket("/ws/{room}/{name}")
async def chat(websocket: WebSocket, room: str, name: str):
    await manager.connect(room, websocket)
    await manager.broadcast(room, f"系统：{name} 加入了聊天室")
    try:
        while True:
            text = await websocket.receive_text()
            await manager.broadcast(room, f"{name}: {text}")
    except WebSocketDisconnect:
        manager.disconnect(room, websocket)
        await manager.broadcast(room, f"系统：{name} 离开了聊天室")


@app.get("/rooms/{room}/count")
def room_count(room: str):
    return {"room": room, "count": manager.count(room)}


PAGE = """<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<title>聊天室</title><body>
<ul id="log"></ul>
<input id="text" placeholder="说点什么…"><button onclick="send()">发送</button>
<script>
const ws = new WebSocket(`ws://${location.host}/ws/demo/浏览器用户`);
ws.onmessage = (e) => {
  const li = document.createElement("li");
  li.textContent = JSON.parse(e.data).text;
  document.getElementById("log").appendChild(li);
};
function send() {
  const el = document.getElementById("text");
  ws.send(el.value); el.value = "";
}
</script></body></html>"""


@app.get("/")
def index():
    return HTMLResponse(PAGE)


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def demo_websocket(client: TestClient) -> None:
    section("1. 双客户端广播：A 发 → B 收；断开后人数减一（验收点）")
    with client.websocket_connect("/ws/demo/Alice") as ws_a:
        first = ws_a.receive_json()  # A 收到自己的加入广播
        assert "Alice 加入了" in first["text"] and first["count"] == 1
        print(f"  Alice 连入 → 广播 {first['text']!r} · 房间 {first['count']} 人")

        with client.websocket_connect("/ws/demo/Bob") as ws_b:
            join_b = ws_b.receive_json()
            assert "Bob 加入了" in join_b["text"] and join_b["count"] == 2
            join_a_echo = ws_a.receive_json()  # A 也收到 B 的加入广播
            assert "Bob 加入了" in join_a_echo["text"]

            ws_a.send_text("hi")  # 聊天消息就是纯文本帧
            echo_a = ws_a.receive_json()  # 广播含发送者：A 也会收到自己的消息
            got_b = ws_b.receive_json()
            assert got_b["text"] == "Alice: hi" and got_b["count"] == 2
            assert echo_a["text"] == "Alice: hi"
            print(f"  A 发消息 → A/B 都收到 {got_b['text']!r}（广播生效）")

            ws_b.close()
            left = ws_a.receive_json()
            assert "Bob 离开了" in left["text"] and left["count"] == 1, left
            print(f"  Bob 断开 → A 收到 {left['text']!r} · 房间剩 {left['count']} 人")

        assert client.get("/rooms/demo/count").json() == {"room": "demo", "count": 1}
        print(f"  HTTP 端点核对: /rooms/demo/count → 1")

        ws_a.send_text("还在")  # B 走了广播照常：A 能收到自己的消息
        echo = ws_a.receive_json()
        assert echo["text"] == "Alice: 还在"
        print(f"  剩余成员继续聊天: {echo['text']!r}（房间未因有人离开而不可用）")


def main() -> None:
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · FastAPI {version('fastapi')} · WebSocket 聊天室（选做）")
    client = TestClient(app)
    demo_websocket(client)
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 广播互收、断开减员、HTTP 人数端点、断开后房间继续可用")


if __name__ == "__main__":
    main()
