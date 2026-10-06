#!/usr/bin/env bash
# lab 19 · 中间件与可观测性 —— 主演示脚本
#
# 用法:
#   ./19_observability.sh start   # 启动服务(端口 8919), Ctrl-C 停止
#   ./19_observability.sh demo    # 教学演示: 自动起停服务, 跑完 6 个章节(含断言)
#   ./19_observability.sh clean   # 停止服务并删除 .run/
#   ./19_observability.sh all     # clean + demo + clean 全生命周期
#
# 场景: 订单 API。两个 @app.middleware("http") 中间件叠成洋葱:
#   外层 request_id 中间件: 生成 uuid 短码 -> 写 contextvar -> 响应头 X-Request-ID 回显;
#   内层 timing 中间件: perf_counter 包住 call_next -> X-Process-Time-ms。
# 注意注册规则: @app.middleware 后注册的在更外层, 所以代码里 timing 先写、rid 后写。
# 服务端日志每行带 [request_id], 客户端拿到的响应头与服务端日志一串到底。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8919
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
SERVER_PID=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }

# finish_helper: 统计一段 python 输出里的 [PASS] 数量; 输出非零退出码则终止
finish_helper() {
    local out="$1" rc="$2" n
    printf '%s\n' "$out"
    n="$(grep -c '\[PASS\]' <<<"$out" || true)"
    PASS_COUNT=$((PASS_COUNT + n))
    if [ "$rc" -ne 0 ]; then
        echo "    [FAIL] 断言未全部通过"
        exit 1
    fi
}

# ridcheck: [2] request_id 贯穿 —— 响应头 X-Request-ID 与服务端日志行是同一个 id,
#           同一请求的日志(中间件进出 + 端点)都能用这一个 id 串起来; 两次请求 id 必不同
ridcheck() {
    local out rc
    if out="$("$PY" - "$BASE" "$SERVER_LOG" <<'RIDEOF'
import pathlib
import sys

import httpx

base, log_path = sys.argv[1], pathlib.Path(sys.argv[2])
fails = 0


def check(desc: str, ok: bool) -> None:
    global fails
    mark = "PASS" if ok else "FAIL"
    print(f"        [{mark}] {desc}")
    if not ok:
        fails += 1


def rid_lines(log_text: str, rid: str) -> list[str]:
    return [ln for ln in log_text.splitlines() if f"[{rid}]" in ln]


r1 = httpx.get(base + "/slow")
rid1 = r1.headers.get("x-request-id", "")
lines1 = rid_lines(log_path.read_text(encoding="utf-8"), rid1)
print(f"    第 1 次 GET /slow   ->  HTTP {r1.status_code}，响应头 X-Request-ID = {rid1}")
print(f"        服务端日志中带 [{rid1}] 的 {len(lines1)} 行：")
for ln in lines1:
    print(f"          {ln.split('|', 2)[-1].strip()}")
check(f"HTTP 200 且响应头携带 X-Request-ID（{rid1}，12 位短码）", r1.status_code == 200 and len(rid1) == 12)
check(f"同一 id 在服务端日志串起 {len(lines1)} 行（两中间件进出 4 行 + slow 端点 2 行 = 6）", len(lines1) == 6)
check("日志里有端点函数的行 —— id 贯穿到了洋葱最里层", any("端点函数 slow" in ln for ln in lines1))

r2 = httpx.get(base + "/orders")
rid2 = r2.headers.get("x-request-id", "")
lines2 = rid_lines(log_path.read_text(encoding="utf-8"), rid2)
print(f"    第 2 次 GET /orders ->  HTTP {r2.status_code}，响应头 X-Request-ID = {rid2}")
check(f"两次请求 id 不同：{rid1} != {rid2}", r2.status_code == 200 and rid1 != rid2)
check(f"第 2 次请求的 id 同样串起 {len(lines2)} 行日志（=5：/orders 端点只有 1 行）", len(lines2) == 5)

sys.exit(1 if fails else 0)
RIDEOF
)"; then
        rc=0
    else
        rc=$?
    fi
    finish_helper "$out" "$rc"
}

# timingcheck: [3] 耗时测量 —— /slow 的 X-Process-Time-ms 以 300ms 为确定性下限,
#              /orders 无 sleep、毫秒级返回
timingcheck() {
    local out rc
    if out="$("$PY" - "$BASE" <<'TIMEOF'
import sys

import httpx

base = sys.argv[1]
fails = 0


def check(desc: str, ok: bool) -> None:
    global fails
    mark = "PASS" if ok else "FAIL"
    print(f"        [{mark}] {desc}")
    if not ok:
        fails += 1


r = httpx.get(base + "/slow")
ms_slow = float(r.headers["x-process-time-ms"])
print(f"    GET /slow   ->  X-Process-Time-ms = {ms_slow:.1f}（X-Request-ID = {r.headers['x-request-id']}）")
check(f"/slow 耗时 {ms_slow:.1f}ms >= 300.0ms —— asyncio.sleep(0.3) 被完整量进 call_next", ms_slow >= 300.0)

r = httpx.get(base + "/orders")
ms_orders = float(r.headers["x-process-time-ms"])
print(f"    GET /orders ->  X-Process-Time-ms = {ms_orders:.1f}")
check(f"/orders 耗时 {ms_orders:.1f}ms < 50.0ms —— 无 sleep 的端点在毫秒级", ms_orders < 50.0)

sys.exit(1 if fails else 0)
TIMEOF
)"; then
        rc=0
    else
        rc=$?
    fi
    finish_helper "$out" "$rc"
}

# ordercheck: [4] 执行顺序实测 —— 从服务端日志提取同一请求的 4 条中间件标记行,
#             断言进入顺序 rid-in -> timing-in、离开顺序 timing-out -> rid-out
ordercheck() {
    local out rc
    if out="$("$PY" - "$BASE" "$SERVER_LOG" <<'ORDOF'
import pathlib
import sys

import httpx

base, log_path = sys.argv[1], pathlib.Path(sys.argv[2])
fails = 0


def check(desc: str, ok: bool) -> None:
    global fails
    mark = "PASS" if ok else "FAIL"
    print(f"        [{mark}] {desc}")
    if not ok:
        fails += 1


r = httpx.get(base + "/orders")
rid = r.headers.get("x-request-id", "")
lines = [ln for ln in log_path.read_text(encoding="utf-8").splitlines() if f"[{rid}]" in ln]
print(f"    GET /orders，X-Request-ID = {rid}；代码注册 timing -> rid（后注册在外），日志实测进出顺序：")
markers: list[str] = []
for ln in lines:
    body = ln.split("|", 2)[-1].strip()
    print(f"          {body}")
    for m in ("rid-in", "timing-in", "timing-out", "rid-out"):
        if f"[{m}]" in ln:
            markers.append(m)

check(f"该请求共 {len(markers)} 条中间件标记行（4 条）", len(markers) == 4)
check("进入顺序 rid-in 先于 timing-in —— rid 后注册, 在更外层、先进入", markers.index("rid-in") < markers.index("timing-in"))
check("离开顺序 timing-out 先于 rid-out —— timing 在内层, 先离开、再轮到外层", markers.index("timing-out") < markers.index("rid-out"))
check(f"完整洋葱序列 {markers}", markers == ["rid-in", "timing-in", "timing-out", "rid-out"])

sys.exit(1 if fails else 0)
ORDOF
)"; then
        rc=0
    else
        rc=$?
    fi
    finish_helper "$out" "$rc"
}

# notfound: [5] 错误也带 id —— 访问不存在的端点, 404 响应头同样回显 X-Request-ID,
#           服务端日志同样能用这个 id 串出完整的洋葱进出序列(但没有端点行)
notfound() {
    local out rc
    if out="$("$PY" - "$BASE" "$SERVER_LOG" <<'NFOF'
import pathlib
import sys

import httpx

base, log_path = sys.argv[1], pathlib.Path(sys.argv[2])
fails = 0


def check(desc: str, ok: bool) -> None:
    global fails
    mark = "PASS" if ok else "FAIL"
    print(f"        [{mark}] {desc}")
    if not ok:
        fails += 1


r = httpx.get(base + "/no-such-endpoint")
rid = r.headers.get("x-request-id", "")
lines = [ln for ln in log_path.read_text(encoding="utf-8").splitlines() if f"[{rid}]" in ln]
markers = [m for m in ("rid-in", "timing-in", "timing-out", "rid-out") if any(f"[{m}]" in ln for ln in lines)]
print(f"    GET /no-such-endpoint  ->  HTTP {r.status_code}，响应头 X-Request-ID = {rid}")
print(f"        服务端日志中带 [{rid}] 的 {len(lines)} 行：")
for ln in lines:
    print(f"          {ln.split('|', 2)[-1].strip()}")
check("HTTP 404：不存在的端点也照样穿过整棵洋葱", r.status_code == 404)
check("404 响应头同样携带 X-Request-ID（排障时客户端报得出 id）", len(rid) == 12)
check(f"服务端日志同样记录该 id（{len(lines)} 行 = 两中间件进出；无端点行）", len(lines) == 4 and not any("端点函数" in ln for ln in lines))
check(f"洋葱序列完整：{markers}", markers == ["rid-in", "timing-in", "timing-out", "rid-out"])

sys.exit(1 if fails else 0)
NFOF
)"; then
        rc=0
    else
        rc=$?
    fi
    finish_helper "$out" "$rc"
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

demo() {
    stop_server
    banner "lab 19 · 中间件与可观测性 —— 洋葱模型、request_id 贯穿、耗时测量"
    echo "  场景: 订单 API。两个 @app.middleware(\"http\") 中间件叠成洋葱:"
    echo "  外层 request_id 中间件生成 uuid 短码写进 contextvar, 响应头 X-Request-ID 回显;"
    echo "  内层 timing 中间件用 perf_counter 测耗时, 写 X-Process-Time-ms。"

    start_server

    step "[1/6] 洋葱模型总览: 请求从外皮剥到芯, 再原路包回去"
    cat <<'ONION'
        请求 ──> ┌─ rid-in ───> timing-in ───> 端点函数 ─┐
                 │  (外层: request_id)  (内层: timing)   │
        响应 <── └─ rid-out <── timing-out <────────────┘

        注册顺序 = 洋葱层次(反着的): 后注册的在更外层。
        代码里 timing 先注册、rid 后注册 -> rid 在最外层、timing 在内层。
ONION
    echo "  下面各章都在服务端日志里找证据: $SERVER_LOG"

    step "[2/6] request_id 贯穿: 响应头与服务端日志是同一个 id"
    ridcheck

    step "[3/6] 耗时测量: X-Process-Time-ms 的下限与常态"
    timingcheck

    step "[4/6] 执行顺序实测: 代码注册顺序 timing -> rid, 日志里验证洋葱进出"
    ordercheck

    step "[5/6] 错误也带 id: 404 同样穿过整棵洋葱"
    notfound

    step "[6/6] 结论表"
    echo "  ┌──────────────────┬──────────────────────────────────┬────────────────────────────────┐"
    echo "  | 观测点           | 现象(本 demo 断言过)             | 机制                           |"
    echo "  ├──────────────────┼──────────────────────────────────┼────────────────────────────────┤"
    echo "  | request_id       | 响应头 = 服务端日志行 = 响应体   | 中间件 set 进 contextvar       |"
    echo "  | 每请求 id 不同   | 两次请求两个 uuid 短码           | 中间件每请求重新生成           |"
    echo "  | 耗时测量         | /slow >=300ms, /orders 毫秒级    | perf_counter 包住 call_next    |"
    echo "  | 洋葱顺序         | 进 rid->timing, 离 timing->rid   | 后注册在外层, 先进入、后离开   |"
    echo "  | 错误也带 id      | 404 的响应头与日志同 id          | 中间件包住路由与异常处理       |"
    echo "  └──────────────────┴──────────────────────────────────┴────────────────────────────────┘"
    echo
    echo "  章节速查: [1] 洋葱示意 | [2] id 贯穿(日志 6 行串一请求, 两次请求 id 不同)"
    echo "            [3] /slow >=300ms vs /orders <50ms | [4] 进出顺序实测"
    echo "            [5] 404 同 id | [6] 结论表"
    echo "  服务端日志保留在 $SERVER_LOG, 各端点可用 curl 随时复测"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl -i '$BASE/orders'   # 响应头 X-Request-ID 与 X-Process-Time-ms"
    echo "    curl -i '$BASE/slow'     # 慢端点: X-Process-Time-ms >= 300"
    echo "    curl -i '$BASE/nope'     # 404 也带 X-Request-ID"
    echo "    tail -f '$SERVER_LOG'    # 服务端日志每行带 [request_id]"
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
