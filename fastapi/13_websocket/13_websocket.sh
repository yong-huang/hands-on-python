#!/usr/bin/env bash
# lab 13 · WebSocket 长连接 —— 主演示脚本
#
# 用法:
#   ./13_websocket.sh start   # 启动服务(端口 8913), Ctrl-C 停止
#   ./13_websocket.sh demo    # 教学演示: 自动起停服务, 跑完 6 个章节(含断言)
#   ./13_websocket.sh clean   # 停止服务并删除 .run/
#   ./13_websocket.sh all     # clean + demo + clean 全生命周期
#
# 场景: 聊天室 API。一条 WebSocket 连接的一生:
#   握手升级(普通 HTTP GET 带 Upgrade 头 -> 101 Switching Protocols)
#   -> 消息循环(while True 收发文本帧, 一条连接 = 一个 asyncio 任务)
#   -> 断线清理(WebSocketDisconnect 触发 finally: 摘出房间 + 广播系统消息)。
# 连接管理器用 dict[房间, set[连接]] 记人; 广播前先 list() 拷贝快照,
# 遍历期间有人进房退房、甚至对端不告而别, 都炸不掉循环。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8913
BASE="http://127.0.0.1:$PORT"
WS_URL="ws://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
SERVER_PID=""
PASS_COUNT=0
TMP_DIR=""   # 演示用客户端脚本的临时目录, trap 里清理

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $SERVER_LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/rooms" 2>/dev/null; then
            echo "  服务就绪: $BASE (pid=$SERVER_PID)"
            return 0
        fi
        sleep 0.3
    done
    echo "  [FAIL] 服务 18s 内未就绪, 日志尾部:"; tail -20 "$SERVER_LOG"
    exit 1
}

stop_server() {
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
        SERVER_PID=""
    fi
    # 兜底清扫: 上一个脚本实例可能留下了同端口残留进程
    if command -v lsof >/dev/null 2>&1; then
        local pids
        pids="$(lsof -ti "tcp:$PORT" 2>/dev/null || true)"
        if [ -n "$pids" ]; then kill $pids 2>/dev/null || true; sleep 0.5; fi
    fi
}

trap 'stop_server; [ -n "$TMP_DIR" ] && rm -rf "$TMP_DIR"' EXIT

# ---------------------------------------------------------------------------
# REST 侧工具
# ---------------------------------------------------------------------------
# rooms_json: 打印当前 /rooms 的紧凑 JSON(键序固定, 供轮询比对)
rooms_json() {
    "$PY" -c "import httpx, json; print(json.dumps(httpx.get('$BASE/rooms', timeout=2).json(), ensure_ascii=False, sort_keys=True))"
}

# wait_rooms WANT: 轮询 /rooms 直到与期望 JSON 一致。断线清理发生在服务端的
# 协程里, 客户端发出 close 后有毫秒级延迟, 与其 sleep 硬等, 不如轮询等它收敛
wait_rooms() {
    local want="$1" got="" i
    for i in $(seq 1 20); do
        got="$(rooms_json 2>/dev/null || true)"
        [ "$got" = "$want" ] && break
        sleep 0.3
    done
    echo "    \$ GET $BASE/rooms"
    if [ "$got" = "$want" ]; then
        echo "        -> $got"
        echo "        [PASS] /rooms == $want"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "        -> $got"
        echo "        [FAIL] /rooms = $got != 期望 $want"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# WebSocket 客户端侧工具
# ---------------------------------------------------------------------------
# write_clients: 把演示用的 websockets 客户端脚本写进临时目录(退出时清理)。
# 客户端与服务端共用同一个 websockets 库(uvicorn[standard] 自带)
write_clients() {
    TMP_DIR="$(mktemp -d /tmp/lab13_ws.XXXXXX)"

    # 公共件: 断言/收消息/排空队列的助手, 各章节脚本 import 它
    cat > "$TMP_DIR/ws_common.py" <<'PYEOF'
import asyncio
import json

import httpx

WS = "ws://127.0.0.1:8913/ws"
HTTP = "http://127.0.0.1:8913"
FAILS = 0


def check(label: str, got, want) -> None:
    """断言一对值: 相等打 PASS 并计数, 不等打 FAIL 且最终让进程退出非零。"""
    global FAILS
    ok = got == want
    tail = "" if ok else f", 期望 {want!r}"
    print(f"        [{'PASS' if ok else 'FAIL'}] {label} = {got!r}{tail}", flush=True)
    if not ok:
        FAILS += 1


async def recv_json(ws, who: str, timeout: float = 5.0) -> dict:
    """收一条消息(带超时: 客户端永不无限等待, 演示必须可终止), 打印出来。"""
    raw = await asyncio.wait_for(ws.recv(), timeout)
    msg = json.loads(raw)
    print(f"    {who} 收到: {json.dumps(msg, ensure_ascii=False)}", flush=True)
    return msg


async def drain_until(ws, who: str, pred) -> dict:
    """一直收直到 pred 成立。join 广播的到达顺序随编排而异,
    用"收到某条为止"吸收队列差异, 之后的断言次序才是确定的。"""
    while True:
        msg = await recv_json(ws, who)
        if pred(msg):
            return msg


def finish() -> None:
    raise SystemExit(1 if FAILS else 0)
PYEOF

    # [1] 握手升级: 打印双方握手报文头, 断言 101 与 upgrade: websocket
    cat > "$TMP_DIR/c1_handshake.py" <<'PYEOF'
import asyncio

import websockets

from ws_common import WS, check, finish


async def main() -> None:
    # connect() 亲手完成一次握手升级: 库把握手阶段的请求/响应都留存了下来
    async with websockets.connect(f"{WS}/lobby") as ws:
        req, resp = ws.request, ws.response
        print("    客户端发出的握手请求: GET /ws/lobby")
        print(f"      upgrade: {req.headers['upgrade']}")
        print(f"      connection: {req.headers['connection']}")
        print(f"      sec-websocket-key: {req.headers['sec-websocket-key']}")
        print("    服务端回来的握手响应:")
        print(f"      状态码: {resp.status_code} (101 = Switching Protocols)")
        print(f"      upgrade: {resp.headers['upgrade']}")
        print(f"      sec-websocket-accept: {resp.headers['sec-websocket-accept']}")
        check("握手状态码", resp.status_code, 101)
        check("响应头 upgrade", resp.headers["upgrade"].lower(), "websocket")
        check("sec-websocket-accept 已生成", bool(resp.headers.get("sec-websocket-accept")), True)
        # 没发 join 就关闭: 进房以 join 消息为准, 未 join 者不进任何房间
        await ws.close()
        print("    ws 连接建立成功(协议已从 HTTP 切到 WebSocket 帧), 未 join 不占房")

asyncio.run(main())
finish()
PYEOF

    # [2] 两客户端同房间聊天: 互发消息, 各自收到对方的
    cat > "$TMP_DIR/c2_chat.py" <<'PYEOF'
import asyncio
import json

import websockets

from ws_common import WS, check, drain_until, finish, recv_json


async def main() -> None:
    async with websockets.connect(f"{WS}/lobby") as aw, websockets.connect(f"{WS}/lobby") as bw:
        await aw.send(json.dumps({"type": "join", "user": "alice"}))
        await bw.send(json.dumps({"type": "join", "user": "bob"}))
        # alice 要等到"bob 入房"的广播才算排空自己的 join 队列
        m = await drain_until(aw, "alice",
                              lambda m: m.get("event") == "join" and m.get("user") == "bob")
        check("alice 看到 bob 入房后的 online", m["online"], 2)
        await drain_until(bw, "bob",
                          lambda m: m.get("event") == "join" and m.get("user") == "bob")

        await aw.send(json.dumps({"type": "chat", "text": "bob 你好, 我是 alice"}))
        m = await recv_json(aw, "alice")
        check("alice 收到自己的回显 user", m["user"], "alice")
        m = await recv_json(bw, "bob")
        check("bob 收到 alice 消息 user", m["user"], "alice")
        check("bob 收到 alice 消息 text", m["text"], "bob 你好, 我是 alice")
        check("bob 视角 online", m["online"], 2)

        await bw.send(json.dumps({"type": "chat", "text": "alice 你好, 我是 bob"}))
        m = await recv_json(aw, "alice")
        check("alice 收到 bob 回话 user", m["user"], "bob")
        check("alice 收到 bob 回话 text", m["text"], "alice 你好, 我是 bob")
        m = await recv_json(bw, "bob")
        check("bob 收到自己的回显 user", m["user"], "bob")
        print("    两条连接互发互收: 下行广播把同一条消息发给房间里的每个人(含发送者)")

asyncio.run(main())
finish()
PYEOF

    # [3] 房间状态: 连接保持期间用 REST /rooms 旁观, 断言 {"lobby": 2}
    cat > "$TMP_DIR/c3_rooms.py" <<'PYEOF'
import asyncio
import json

import httpx
import websockets

from ws_common import HTTP, WS, check, drain_until, finish


async def main() -> None:
    async with websockets.connect(f"{WS}/lobby") as aw, websockets.connect(f"{WS}/lobby") as bw:
        await aw.send(json.dumps({"type": "join", "user": "alice"}))
        await bw.send(json.dumps({"type": "join", "user": "bob"}))
        # 排空 join 广播后再查: 保证服务端已把两个人都登记进房间, 断言才确定
        await drain_until(aw, "alice",
                          lambda m: m.get("event") == "join" and m.get("user") == "bob")
        await drain_until(bw, "bob",
                          lambda m: m.get("event") == "join" and m.get("user") == "bob")
        r = httpx.get(f"{HTTP}/rooms", timeout=2)
        print(f"    GET {HTTP}/rooms -> HTTP {r.status_code}")
        print(f"        {json.dumps(r.json(), ensure_ascii=False, sort_keys=True)}")
        check("/rooms(两条连接都活着)", r.json(), {"lobby": 2})
        print("    REST 与 WebSocket 同进程并存: /rooms 是观察房间状态的旁路窗口")

asyncio.run(main())
finish()
PYEOF

    # [4] 断线清理: alice 正常关闭 -> 服务端 finally 清理 + 广播 leave
    cat > "$TMP_DIR/c4_disconnect.py" <<'PYEOF'
import asyncio
import json

import httpx
import websockets

from ws_common import HTTP, WS, check, drain_until, finish, recv_json


async def main() -> None:
    async with websockets.connect(f"{WS}/lobby") as aw, websockets.connect(f"{WS}/lobby") as bw:
        await aw.send(json.dumps({"type": "join", "user": "alice"}))
        await bw.send(json.dumps({"type": "join", "user": "bob"}))
        await drain_until(aw, "alice",
                          lambda m: m.get("event") == "join" and m.get("user") == "bob")
        await drain_until(bw, "bob",
                          lambda m: m.get("event") == "join" and m.get("user") == "bob")

        print("    alice 关闭连接(正常关闭, close code 1000)...")
        await aw.close()
        # 服务端 receive_text 抛 WebSocketDisconnect -> finally: 摘除 + 广播 leave,
        # 所以 bob 接下来收到的第一条就是系统离房消息
        m = await recv_json(bw, "bob")
        check("bob 收到系统消息 event", m.get("event"), "leave")
        check("离房的是 alice", m.get("user"), "alice")
        check("人数已扣减 online", m["online"], 1)
        r = httpx.get(f"{HTTP}/rooms", timeout=2)
        print(f"    GET {HTTP}/rooms -> {json.dumps(r.json(), ensure_ascii=False, sort_keys=True)}")
        check("/rooms(alice 已被清出)", r.json(), {"lobby": 1})
        print("    断线清理全程无人工介入: WebSocketDisconnect -> finally 摘除 + 广播")

asyncio.run(main())
finish()
PYEOF

    # [5a] carol: 独立进程, 入房后原地不动, 等着被 kill -9(不告而别)
    cat > "$TMP_DIR/c5_carol.py" <<'PYEOF'
import asyncio
import json

import websockets

from ws_common import WS


async def main() -> None:
    async with websockets.connect(f"{WS}/lobby") as ws:
        await ws.send(json.dumps({"type": "join", "user": "carol"}))
        # 等服务端把自己登记进房间的回执(join 广播), 之后才允许 bash 动手
        while True:
            m = json.loads(await asyncio.wait_for(ws.recv(), 5))
            if m.get("event") == "join" and m.get("user") == "carol":
                break
        print(f"READY carol 已入房(online={m['online']}), 进程停住等 kill -9", flush=True)
        await asyncio.sleep(300)  # 永远等不到的自然死亡, 只会死于 SIGKILL

asyncio.run(main())
PYEOF

    # [5b] alice/bob: 见证 carol 被 kill -9 前后, 广播与收发始终正常
    cat > "$TMP_DIR/c5_duo.py" <<'PYEOF'
import asyncio
import json

import httpx
import websockets

from ws_common import HTTP, WS, check, drain_until, finish, recv_json


async def main() -> None:
    async with websockets.connect(f"{WS}/lobby") as aw, websockets.connect(f"{WS}/lobby") as bw:
        await aw.send(json.dumps({"type": "join", "user": "alice"}))
        await bw.send(json.dumps({"type": "join", "user": "bob"}))
        m = await drain_until(aw, "alice",
                              lambda m: m.get("event") == "join" and m.get("user") == "bob")
        check("bob 入房时房间已 3 人(carol 先在)", m["online"], 3)
        await drain_until(bw, "bob",
                          lambda m: m.get("event") == "join" and m.get("user") == "bob")
        await aw.send(json.dumps({"type": "chat", "text": "carol 也在吗"}))
        m = await recv_json(bw, "bob")
        check("3 人在房时消息照常到达", m["text"], "carol 也在吗")
        check("3 人满员 online", m["online"], 3)
        await recv_json(aw, "alice")  # 排掉 alice 自己的回显
        print("STABLE 两人已就位", flush=True)  # 给 bash 的动手信号

        # carol 被 kill -9: TCP 断开, 服务端 receive_text 抛 WebSocketDisconnect,
        # finally 清理后广播 leave -> bob 的下一条消息就该是它
        m = await recv_json(bw, "bob", timeout=15)
        check("bob 收到 carol 离房系统消息 event", m.get("event"), "leave")
        check("不告而别的是 carol", m.get("user"), "carol")
        check("人数从 3 扣到 2", m["online"], 2)
        r = httpx.get(f"{HTTP}/rooms", timeout=2)
        print(f"    GET {HTTP}/rooms -> {json.dumps(r.json(), ensure_ascii=False, sort_keys=True)}")
        check("/rooms(carol 已被清出)", r.json(), {"lobby": 2})

        await aw.send(json.dumps({"type": "chat", "text": "广播还活着"}))
        m = await recv_json(bw, "bob")
        check("kill -9 之后 alice 消息仍能到 bob", m["text"], "广播还活着")
        # alice 的队列里会先排进 carol 的 leave 系统广播(她也在房), 吸掉再等回显
        m = await drain_until(aw, "alice", lambda m: m.get("type") == "chat")
        check("kill -9 之后回显也正常", m["text"], "广播还活着")
        print("    死连接被 finally 摘除, 服务端没炸、广播没断: 其余客户端照常收发")

asyncio.run(main())
finish()
PYEOF
}

# run_client FILE: 运行演示用 websockets 客户端脚本, 转发输出并统计 PASS
run_client() {
    local file="$1" out rc n
    if out="$("$PY" "$file" 2>&1)"; then
        rc=0
    else
        rc=$?
    fi
    printf '%s\n' "$out"
    n="$(grep -c '\[PASS\]' <<<"$out" || true)"
    PASS_COUNT=$((PASS_COUNT + n))
    if [ "$rc" -ne 0 ]; then
        echo "    [FAIL] websocket 客户端断言未全部通过(退出码 $rc)"
        exit 1
    fi
}

# wait_marker FILE PATTERN TIMEOUT_SEC: 轮询等后台客户端在日志里打出就绪标记
wait_marker() {
    local file="$1" pattern="$2" deadline=$((SECONDS + $3))
    while [ "$SECONDS" -lt "$deadline" ]; do
        grep -q "$pattern" "$file" 2>/dev/null && return 0
        sleep 0.2
    done
    echo "    [FAIL] 等待客户端标记 '$pattern' 超时, 该客户端输出:"; sed 's/^/      /' "$file"
    exit 1
}

# wait_py PID TIMEOUT_SEC LOG: 等后台客户端退出; 超时或断言失败即终止演示
wait_py() {
    local pid="$1" timeout="$2" log="$3" deadline=$((SECONDS + $2)) rc=0
    while kill -0 "$pid" 2>/dev/null && [ "$SECONDS" -lt "$deadline" ]; do
        sleep 0.2
    done
    if kill -0 "$pid" 2>/dev/null; then
        echo "    [FAIL] 客户端进程 $pid 在 ${timeout}s 内未退出, 输出:"; sed 's/^/      /' "$log"
        exit 1
    fi
    wait "$pid" || rc=$?
    if [ "$rc" -ne 0 ]; then
        echo "    [FAIL] websocket 客户端断言未全部通过(退出码 $rc), 输出:"; sed 's/^/      /' "$log"
        exit 1
    fi
}

demo() {
    stop_server
    banner "lab 13 · WebSocket 长连接 —— 握手升级, 消息循环, 断线清理"
    echo "  场景: 聊天室 API。ws 端点 /ws/{room}: join 消息进房, 聊天下行广播,"
    echo "  leave/断线自动退房; REST 端点 GET /rooms 随时旁观每个房间的人数。"
    echo "  一条连接的一生 = 握手升级(101) -> while True 收发帧 -> 断线时 finally 清理。"
    write_clients
    start_server

    step "[1/6] 握手升级: WebSocket 先以普通 HTTP GET 敲门, 再切换协议"
    echo "  看 websockets 客户端记录的握手报文: 请求带 Upgrade 头, 响应 101:"
    run_client "$TMP_DIR/c1_handshake.py"
    echo "  对照: 不带 Upgrade 头的普通 HTTP GET 打到同一路径 —— ws 路由只认升级"
    echo "  请求, HTTP 路由表里根本没有 /ws/{room}, 直接 404:"
    code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/ws/lobby")"
    echo "    \$ curl -s -o /dev/null -w '%{http_code}' $BASE/ws/lobby   ->   HTTP $code"
    if [ "$code" = "404" ]; then
        echo "        [PASS] 普通 HTTP 请求被拒(404), 协议没升级就没有连接"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "        [FAIL] 期望 404, 实际 $code"
        exit 1
    fi

    step "[2/6] 消息循环: 两个客户端同房间聊天, 下行广播人人有份(含发送者)"
    echo "  alice/bob 先后向 /ws/lobby 发 join 进房, 然后互发 chat:"
    run_client "$TMP_DIR/c2_chat.py"

    step "[3/6] 房间状态: 连接保持期间, REST /rooms 旁观到 2 条活连接"
    echo "  服务端用一张 dict[房间, set[连接]] 记人; /rooms 把它投影成 {房间: 人数}:"
    run_client "$TMP_DIR/c3_rooms.py"

    step "[4/6] 断线清理: alice 正常断开 -> WebSocketDisconnect -> finally 摘除"
    echo "  客户端 close(1000) 后, 服务端 receive_text 抛 WebSocketDisconnect,"
    echo "  finally 把她摘出房间并向剩余成员广播系统离房消息:"
    run_client "$TMP_DIR/c4_disconnect.py"
    wait_rooms "{}"
    echo "  (演示收尾时 bob 也退出, 房间空了连字典键一起删, /rooms 回到空对象。)"

    step "[5/6] 广播容错: 对端不告而别(kill -9), 服务端与广播都炸不了"
    echo "  carol 用独立进程连入, 入房后原地不动; 随后 kill -9 模拟网线被拔 ——"
    echo "  没有关闭握手, TCP 直接断开。服务端广播前 list() 拷贝快照 + finally 清理,"
    echo "  死连接要么已不在房里、要么当场被摘, 其余客户端照常收发:"
    CAROL_LOG="$RUN_DIR/carol.log"
    DUO_LOG="$RUN_DIR/duo.log"
    : > "$CAROL_LOG"
    : > "$DUO_LOG"
    "$PY" "$TMP_DIR/c5_carol.py" >"$CAROL_LOG" 2>&1 &
    CAROL_PID=$!
    wait_marker "$CAROL_LOG" "READY" 10
    echo "    carol 就绪: $(head -1 "$CAROL_LOG")"
    "$PY" "$TMP_DIR/c5_duo.py" >"$DUO_LOG" 2>&1 &
    DUO_PID=$!
    wait_marker "$DUO_LOG" "STABLE" 10
    kill -9 "$CAROL_PID"
    wait "$CAROL_PID" 2>/dev/null || true
    echo "    carol 已被 kill -9(无关闭握手), 等 alice/bob 收到系统广播..."
    wait_py "$DUO_PID" 30 "$DUO_LOG"
    sed 's/^/    /' "$DUO_LOG"
    n="$(grep -c '\[PASS\]' "$DUO_LOG" || true)"
    PASS_COUNT=$((PASS_COUNT + n))

    step "[6/6] 生命周期速查: 一条连接从生到死的三阶段"
    cat <<'TBL'
    阶段        发生了什么                                     代码锚点(main.py)
    ----------  ---------------------------------------------  ----------------------------------------
    握手升级    客户端: GET + Upgrade: websocket + Key         端点函数第一行 await websocket.accept()
                服务端: accept() 应答 101, 协议切到 ws 帧
    消息循环    一条连接 = 一个 asyncio 任务; while True       receive_text() 挂起收帧 / send_text() 发
                里逐帧收发, 任务不返回连接就不断
    断线清理    对端断开 -> WebSocketDisconnect -> finally     manager.disconnect() + 广播 leave + close
                摘除连接并广播系统消息, 人数永远真实
TBL
    echo "  终局对账: 所有客户端都已退场, 房间字典应为空 ——"
    wait_rooms "{}"

    echo
    echo "  服务端日志保留在 $SERVER_LOG(可见每次 connection open / WebSocket Disconnect)"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    write_clients_empty() { :; }  # start 模式不需要客户端脚本
    start_server
    echo "  试一试(浏览器控制台或任何 ws 客户端):"
    echo "    new WebSocket('ws://127.0.0.1:8913/ws/lobby')"
    echo "    发送 {\"type\":\"join\",\"user\":\"alice\"} 后再发 {\"type\":\"chat\",\"text\":\"hi\"}"
    echo "    另开一个终端: curl $BASE/rooms   # 旁观房间人数"
    echo "  停止: Ctrl-C"
    wait "$SERVER_PID"
}

cmd_clean() {
    stop_server
    rm -rf "$RUN_DIR"
    echo "已停止服务并清理 $RUN_DIR"
}

case "${1:-demo}" in
    start) cmd_start ;;
    demo) demo ;;
    clean) cmd_clean ;;
    all)
        cmd_clean
        demo
        cmd_clean
        ;;
    *)
        echo "用法: $0 start|demo|clean|all"
        exit 1
        ;;
esac
