#!/usr/bin/env bash
# lab 14 · 流式响应与 SSE —— 主演示脚本
#
# 用法:
#   ./14_streaming_sse.sh start   # 启动服务(端口 8914), Ctrl-C 停止
#   ./14_streaming_sse.sh demo    # 教学演示: 自动起停服务, 跑完 5 个章节(含断言)
#   ./14_streaming_sse.sh clean   # 停止服务并删除 .run/
#   ./14_streaming_sse.sh all     # clean + demo + clean 全生命周期
#
# 场景: 进度报告 API。同一段"3 步进度"内容, 两条路发出去:
#   /stream-chunks  StreamingResponse + async 生成器, 逐块 yield(块间 0.4s) ——
#                   Transfer-Encoding: chunked, 只管运输, 客户端逐块到达;
#   /events         SSE(text/event-stream), 报文手写 retry:/id:/event:/data:
#                   四类行 + 空行分隔 —— 管格式, 也管浏览器 EventSource 的重连语义。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8914
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
SERVER_PID=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }

# run_py: 从 stdin 读一段 python 并执行, 透传其余参数; 打印输出并统计 [PASS]
# 用法: out="$(run_py "$BASE" <<'PYEOF' ... PYEOF)"; 失败时 rc 非 0 由调用方处理
run_py() {
    "$PY" - "$@"
}

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $SERVER_LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/healthz" 2>/dev/null; then
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
trap 'stop_server' EXIT

# finish_py: 打印 python 段输出, 统计 [PASS]; rc 非 0 说明有断言失败, 立即退出
finish_py() {
    local out="$1" rc="$2" n
    printf '%s\n' "$out"
    n="$(grep -c '\[PASS\]' <<<"$out" || true)"
    PASS_COUNT=$((PASS_COUNT + n))
    if [ "$rc" -ne 0 ]; then
        echo "    [FAIL] 本节断言未全部通过"
        exit 1
    fi
}

demo() {
    stop_server
    banner "lab 14 · 流式响应与 SSE —— chunked 只管运输, SSE 管格式与重连"
    echo "  场景: 进度报告 API。普通响应要攒齐整个结果才发; 本实验的响应体是一个"
    echo "  async 生成器, 生成一块就 yield 一块, 服务器随之发一块。/stream-chunks"
    echo "  走纯分块传输(chunked), /events 在同样的逐块运输上套 SSE 报文格式。"

    start_server

    # ------------------------------------------------------------------
    step "[1/5] 分块到达: 逐块打印到达时刻, 对照非流式的一次性到达"
    echo "  /stream-chunks 的响应体是 async 生成器: 每 yield 一块, 网络上立刻多一块。"
    echo "  客户端用 httpx 的 aiter_bytes 逐块消费, 记录每块首次出现的时刻:"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import asyncio
import sys
import time

import httpx

base = sys.argv[1]
url = f"{base}/stream-chunks"
MARKERS = ["[chunk 0]", "[chunk 1]", "[chunk 2]"]        # 每块开头的序号标记
TEXTS = ["任务已接收，开始处理", "处理进行中，进度 50%", "处理完成，结果就绪"]
EXPECTED = "".join(f"[chunk {i}] 第 {i + 1}/3 段：{t}\n" for i, t in enumerate(TEXTS))

fails = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    mark = "PASS" if ok else "FAIL"
    extra = f"  ({detail})" if detail else ""
    print(f"        [{mark}] {label}{extra}")
    if not ok:
        fails += 1


async def main() -> int:
    t0 = time.monotonic()
    seen: dict[str, float] = {}   # 标记 -> 首次到达时刻
    parts: list[bytes] = []
    async with httpx.AsyncClient() as client:
        async with client.stream("GET", url) as r:
            print(f'    $ AsyncClient.stream("GET", "{url}")   ->   HTTP {r.status_code}')
            async for piece in r.aiter_bytes():        # 服务器发一块, 这里就醒一次
                parts.append(piece)
                text = b"".join(parts).decode("utf-8")
                for m in MARKERS:
                    if m in text and m not in seen:
                        seen[m] = time.monotonic() - t0
                        print(f"        到达 t={seen[m]:6.3f}s  {m} ...")
    full = b"".join(parts).decode("utf-8")
    gaps = [seen[b] - seen[a] for a, b in zip(MARKERS, MARKERS[1:])]
    check("3 块全部到达", len(seen) == 3)
    check("按序到达", [seen[m] for m in MARKERS] == sorted(seen[m] for m in MARKERS))
    for (a, b), g in zip(zip(MARKERS, MARKERS[1:]), gaps):
        check(f"相邻块到达间隔 {b[7]}-{a[7]} >= 0.3s", g >= 0.3, f"实测 {g:.3f}s")
    check("首块先于整包(流式证据)", seen[MARKERS[0]] < seen[MARKERS[-1]] - 0.3,
          f"首块 t={seen[MARKERS[0]]:.3f}s, 末块 t={seen[MARKERS[-1]]:.3f}s")
    check("拼接结果完整", full == EXPECTED, f"共 {len(full)} 字节")
    return fails


raise SystemExit(1 if asyncio.run(main()) else 0)
PYEOF
)"
    finish_py "$out" "$rc"
    echo "  反面教材 /chunks-buffered: 同样的 3 块内容, 攒齐(约 1.2s)后一次性返回,"
    echo "  到达时刻只有一个 —— 逐块到达是 StreamingResponse 带来的行为差异:"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import sys
import time

import httpx

base = sys.argv[1]
t0 = time.monotonic()
arrivals = []
with httpx.stream("GET", f"{base}/chunks-buffered") as r:
    print(f'    $ httpx.stream("GET", "{base}/chunks-buffered")   ->   HTTP {r.status_code}')
    for piece in r.iter_bytes():                       # 网络上只醒来一次
        arrivals.append(time.monotonic() - t0)
        print(f"        到达 t={arrivals[-1]:6.3f}s  {len(piece)} 字节")
ok = len(arrivals) == 1 and arrivals[0] >= 0.9
print(f"        [{'PASS' if ok else 'FAIL'}] 非流式 = 攒齐后一次性到达  (到达 {len(arrivals)} 次, t={arrivals[0]:.3f}s)")
raise SystemExit(0 if ok else 1)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[2/5] 响应头对照: chunked 有 Transfer-Encoding, 没有 Content-Length"
    echo "  为什么没有 Content-Length: 响应头发出去时生成器还没跑完, 总长未知,"
    echo "  HTTP/1.1 只能改用 Transfer-Encoding: chunked 声明\"逐块发, 块长自述\":"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import sys

import httpx

base = sys.argv[1]
fails = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    extra = f"  ({detail})" if detail else ""
    print(f"        [{'PASS' if ok else 'FAIL'}] {label}{extra}")
    if not ok:
        fails += 1


with httpx.stream("GET", f"{base}/stream-chunks") as r:
    r.read()  # 先消费完响应体, 再检查响应头
    print(f'    $ GET {base}/stream-chunks')
    for k in ("content-type", "transfer-encoding", "content-length", "x-chunk-count"):
        print(f"        {k + ':':22} {r.headers.get(k, '(无)')}")
    check("Transfer-Encoding: chunked", r.headers.get("transfer-encoding") == "chunked")
    check("没有 Content-Length", "content-length" not in r.headers)
    check("X-Chunk-Count: 3", r.headers.get("x-chunk-count") == "3")

with httpx.stream("GET", f"{base}/healthz") as r:
    r.read()
    print(f'    $ GET {base}/healthz  (对照组: 普通 JSON)')
    for k in ("content-type", "transfer-encoding", "content-length"):
        print(f"        {k + ':':22} {r.headers.get(k, '(无)')}")
    check("普通响应有 Content-Length", r.headers.get("content-length") is not None,
          f"值={r.headers.get('content-length')}")
    check("普通响应无 Transfer-Encoding", r.headers.get("transfer-encoding") is None)

raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[3/5] SSE 报文原文: /events 的原始字节流与四类行逐行标注"
    echo "  SSE 不是新传输协议 —— 报文同样以 chunked 逐块到达, 它约定的是报文格式:"
    echo "  event:/id:/data:/retry: 四类行, 每条事件以一个空行收尾。先看原文:"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import sys

import httpx

base = sys.argv[1]
url = f"{base}/events"
fails = 0

with httpx.stream("GET", url) as r:
    ctype = r.headers.get("content-type", "")
    is_chunked = r.headers.get("transfer-encoding") == "chunked"
    has_cl = "content-length" in r.headers
    raw = b"".join(r.iter_bytes())
text = raw.decode("utf-8")

print(f'    $ GET {url}   ->   HTTP {r.status_code}, Content-Type: {ctype}')
print("    ---------------- 原始 SSE 字节流(原样, 含空行) ----------------")
print(text, end="")
print("    ---------------------------------------------------------------")
MEANING = {
    "retry": "retry 行: 浏览器 EventSource 断线后等待的重连毫秒数(默认约 3000)",
    "id":    "id 行: 事件 ID, EventSource 记住最后一条, 重连时经 Last-Event-ID 头带回",
    "event": "event 行: 事件类型, 客户端按它分发监听器(省略时默认 message)",
    "data":  "data 行: 事件载荷, 可多行, 客户端用换行拼接",
}
print("    逐行标注:")
lines = text.split("\n")
if lines and lines[-1] == "":
    lines.pop()   # 报文以换行收尾, split 出的最后一个空串是结尾符, 不是事件边界
for line in lines:
    field = line.partition(":")[0]
    if line == "":
        desc = "空行 = 事件边界: 攒齐上面的字段, 派发为一条事件"
    elif field in MEANING:
        desc = MEANING[field]
    else:
        desc = "未知行"
    shown = line if line else "(空行)"
    print(f"        {shown:<34} <- {desc}")

def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    extra = f"  ({detail})" if detail else ""
    print(f"        [{'PASS' if ok else 'FAIL'}] {label}{extra}")
    if not ok:
        fails += 1

check("Content-Type 以 text/event-stream 开头", ctype.startswith("text/event-stream"), ctype)
check("报文以 retry: 2000 开场", text.startswith("retry: 2000\n"))
check("同样逐块运输(chunked, 无 Content-Length)", is_chunked and not has_cl)
check("5 个空行边界(1 开场块 + 4 条事件)", text.count("\n\n") == 5, f"实测 {text.count(chr(10) + chr(10))} 个")

raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[4/5] SSE 事件解析: 客户端按协议把字节流还原成 4 个事件"
    echo "  解析规则: 按 \\n\\n 切块 -> 每块按行读字段名 -> 有 data 的块才是事件"
    echo "  (开场 retry:/id: 块没有 data, 所以不派发 —— 4 条 = 3 个 progress + 1 个 done):"
    rc=0
    out="$(run_py "$BASE" <<'PYEOF' || rc=$?
import sys

import httpx

base = sys.argv[1]
url = f"{base}/events"
fails = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    extra = f"  ({detail})" if detail else ""
    print(f"        [{'PASS' if ok else 'FAIL'}] {label}{extra}")
    if not ok:
        fails += 1


def parse_sse(text: str) -> list[dict[str, str]]:
    """按 SSE 协议把报文还原成事件列表(与浏览器 EventSource 同一套规则)。"""
    events: list[dict[str, str]] = []
    for block in text.replace("\r\n", "\n").split("\n\n"):
        if not block.strip():
            continue
        ev: dict[str, str] = {"event": "message", "id": "", "data": ""}
        data_lines: list[str] = []
        for line in block.split("\n"):
            if line.startswith(":"):            # 冒号开头的行是注释, 忽略
                continue
            field, sep, value = line.partition(":")
            if sep and value.startswith(" "):
                value = value[1:]               # 协议规定剥掉冒号后的一个空格
            if field == "event":
                ev["event"] = value
            elif field == "id":
                ev["id"] = value
            elif field == "data":
                data_lines.append(value)
        if data_lines:                          # 没有 data 的事件不派发
            ev["data"] = "\n".join(data_lines)
            events.append(ev)
    return events


with httpx.stream("GET", url) as r:
    r.read()
    events = parse_sse(r.text)

print(f'    $ GET {url}  ->  解析出 {len(events)} 个事件')
for i, ev in enumerate(events):
    print(f"        事件{i + 1}: event={ev['event']:<9} id={ev['id']:<2} data={ev['data']!r}")

check("共 4 个事件(3 progress + 1 done)", len(events) == 4, f"实测 {len(events)} 个")
check("event 名依次为 progress x3 + done",
      [e["event"] for e in events] == ["progress", "progress", "progress", "done"])
check("id 依次为 1/2/3/4", [e["id"] for e in events] == ["1", "2", "3", "4"])
check("data 带序号 [1/3] -> [3/3]",
      [e["data"].split(" ", 1)[0] for e in events[:3]] == ["[1/3]", "[2/3]", "[3/3]"])
check("最后一条是 done", events[-1]["event"] == "done" if events else False,
      f"data={events[-1]['data']!r}" if events else "")

raise SystemExit(1 if fails else 0)
PYEOF
)"
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[5/5] 对比表: chunked vs SSE —— 同一条逐块运输, 不同的分工"
    echo
    cat <<'TABLE'
    +----------------+--------------------------------+----------------------------------------+
    | 维度           | chunked 分块传输               | SSE (text/event-stream)                |
    +----------------+--------------------------------+----------------------------------------+
    | 管什么         | 只管运输(怎么发)               | 运输 + 格式 + 重连语义                 |
    | Content-Type   | 任意(text/plain/json/...)      | 固定 text/event-stream                 |
    | 报文格式       | 无约定, 就是字节流             | retry:/id:/event:/data: + 空行分隔     |
    | 断线自动重连   | 无, 断了就断了                 | 有, EventSource 按 retry: 重连,        |
    |                |                                | 经 Last-Event-ID 头从断点续传          |
    | 浏览器原生消费 | 无(fetch 流式读要自己写)       | 有, EventSource 一行 JS                |
    | 典型场景       | 大文件/LLM 生成式下载          | 进度推送/消息通知/行情推送             |
    +----------------+--------------------------------+----------------------------------------+
TABLE
    echo "  一句话分工: 章节[3]里 SSE 报文同样标着 Transfer-Encoding: chunked ——"
    echo "  chunked 是地基, SSE 是地基上盖的格式房; 只要逐块发就用前者, 要事件语义就上后者。"
    echo
    echo "  章节速查: [1] 3 块按序到达, 相邻间隔 ~0.4s | [2] chunked 有 TE 无 CL"
    echo "            [3] SSE 原文 + 四类行标注 | [4] 解析出 4 事件(3 progress + 1 done)"
    echo "            [5] chunked vs SSE 对照表"
    echo "  服务端日志保留在 $SERVER_LOG"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl -N '$BASE/stream-chunks'   # 分块传输, 逐块到达(-N 关闭 curl 自己的缓冲)"
    echo "    curl -N '$BASE/events'          # SSE 报文原文"
    echo "    curl '$BASE/chunks-buffered'    # 反面教材: 攒齐后一次性到达"
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
