#!/usr/bin/env bash
# lab 11 · async def 与 def 的执行真相 —— 主演示脚本
#
# 用法:
#   ./11_async_truth.sh start   # 启动服务(端口 8911), Ctrl-C 停止
#   ./11_async_truth.sh demo    # 教学演示: 自动起停服务, 跑完 4 个章节(含断言)
#   ./11_async_truth.sh clean   # 停止服务并删除 .run/
#   ./11_async_truth.sh all     # clean + demo + clean 全生命周期
#
# 场景: 慢任务 API。同一条 0.3s 的 IO 等待, async def/asyncio.sleep 与
# def/time.sleep 各实现一遍, 端点把执行线程的名字与编号印进响应;
# 并发 20 发对比两条轨道, 再用 /blocking 制造一次事件循环停摆的现场。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8911
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

# req: 用 httpx 发一个请求, 打印响应, 并断言状态码与 JSON 字段
# 用法: req METHOD "PATH?QUERY" WANT_STATUS [json表达式 期望值]...
#   表达式在 python 里 eval, 可用变量: d=响应JSON(非 JSON 响应时为 None), r=httpx 响应对象
req() {
    local out rc
    if out="$("$PY" - "$1" "$BASE$2" "$3" "${@:4}" <<'REQEOF'
import json, sys
import httpx

method, url, want_status, *pairs = sys.argv[1:]
r = httpx.request(method, url)
print(f'    $ httpx.request("{method}", "{url}")   ->   HTTP {r.status_code}')
try:
    d = r.json()
except ValueError:
    d = None
if d is not None:
    pretty = json.dumps(d, ensure_ascii=False, indent=2)
    print("\n".join("        " + ln for ln in pretty.splitlines()))
fails = 0
if str(r.status_code) == want_status:
    print(f"        [PASS] 状态码 {want_status}")
else:
    print(f"        [FAIL] 状态码 {r.status_code} != 期望 {want_status}")
    fails += 1
assert len(pairs) % 2 == 0, "表达式与期望值必须成对出现"
for i in range(0, len(pairs), 2):
    expr, want = pairs[i], pairs[i + 1]
    got = str(eval(expr, {"d": d, "r": r}))
    if got == want:
        print(f"        [PASS] {expr} == {want}")
    else:
        print(f"        [FAIL] {expr} = {got} != 期望 {want}")
        fails += 1
sys.exit(1 if fails else 0)
REQEOF
)"; then
        rc=0
    else
        rc=$?
    fi
    finish_helper "$out" "$rc"
}

# burst: 用 httpx.AsyncClient 并发 N 发同一个端点, 打印总耗时/线程名集合/去重线程数
# 用法: burst PATH CONCURRENCY MODE   (MODE: async | def, 决定按哪套轨道做断言)
burst() {
    local out rc
    if out="$("$PY" - "$BASE$1" "$2" "$3" <<'BURSTEOF'
import asyncio, sys, time
from urllib.parse import urlparse

import httpx

url, n, mode = sys.argv[1], int(sys.argv[2]), sys.argv[3]
path = urlparse(url).path


async def main() -> int:
    async with httpx.AsyncClient(timeout=30.0) as client:
        t0 = time.perf_counter()
        responses = await asyncio.gather(*(client.get(url) for _ in range(n)))
        total = time.perf_counter() - t0
    payload = [r.json() for r in responses]
    names = sorted({d["thread_name"] for d in payload})
    idents = {d["thread_ident"] for d in payload}
    elapsed = [d["elapsed"] for d in payload]
    all_ok = all(r.status_code == 200 for r in responses)
    print(f"    $ {n} 个并发 GET {path}")
    print(f"        总耗时      {total:.3f}s (服务端单次 elapsed {min(elapsed):.3f}~{max(elapsed):.3f}s)")
    print(f"        线程名集合  {names}")
    print(f"        去重线程数  {len(idents)} (按 thread_ident 去重)")

    fails = 0

    def check(desc: str, ok: bool) -> None:
        nonlocal fails
        mark = "PASS" if ok else "FAIL"
        print(f"        [{mark}] {desc}")
        if not ok:
            fails += 1

    check("全部请求 HTTP 200", all_ok)
    check(f"总耗时 {total:.3f}s < 1s —— 两种声明面对 IO 等待都能并发", total < 1.0)
    if mode == "async":
        check(f"线程名集合 {names} == ['MainThread'] —— 全部跑在事件循环线程", names == ["MainThread"])
        check(f"去重线程数 {len(idents)} == 1 —— 同一条循环线程轮流让出", len(idents) == 1)
    else:
        check(f"线程名集合 {names} 不含 MainThread —— 函数体不在循环线程上", "MainThread" not in names)
        check(f"去重线程数 {len(idents)} >= 2 —— 散在多条 anyio worker 线程", len(idents) >= 2)
    return 1 if fails else 0


sys.exit(asyncio.run(main()))
BURSTEOF
)"; then
        rc=0
    else
        rc=$?
    fi
    finish_helper "$out" "$rc"
}

# blocktest: 循环停摆实验 —— 先测空闲 healthz 基线, 再 3 发 /blocking + 1 发 /healthz
blocktest() {
    local out rc
    if out="$("$PY" - "$BASE" <<'BLKEOF'
import asyncio, sys, time

import httpx

base = sys.argv[1]


async def main() -> int:
    fails = 0

    def check(desc: str, ok: bool) -> None:
        nonlocal fails
        mark = "PASS" if ok else "FAIL"
        print(f"        [{mark}] {desc}")
        if not ok:
            fails += 1

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 对照组: 事件循环空闲时, /healthz 三连发, 逐次计时
        baseline = []
        for _ in range(3):
            t0 = time.perf_counter()
            r = await client.get(base + "/healthz")
            baseline.append(time.perf_counter() - t0)
        assert r.status_code == 200
        print(f"    对照: 空闲循环下 /healthz 三连发, 延迟 " + ", ".join(f"{x * 1000:.1f}ms" for x in baseline))
        check(f"空闲时 healthz 每次响应都 < 0.1s", max(baseline) < 0.1)

        # 实验组: 先发 3 个 /blocking 把循环钉死, 0.2s 后再发 /healthz
        async def fire(path: str):
            t0 = time.perf_counter()
            r = await client.get(base + path)
            return path, r, time.perf_counter() - t0

        tasks = [asyncio.create_task(fire("/blocking")) for _ in range(3)]
        await asyncio.sleep(0.2)  # 确保 3 个 /blocking 先被服务端接收并开始执行
        tasks.append(asyncio.create_task(fire("/healthz")))
        results = await asyncio.gather(*tasks)

        blocking = [x for x in results if x[0] == "/blocking"]
        hz_path, hz_resp, hz_lat = next(x for x in results if x[0] == "/healthz")
        for _, r, lat in blocking:
            d = r.json()
            print(f"    GET /blocking -> 线程 {d['thread_name']}, 服务端 elapsed {d['elapsed']:.3f}s, 客户端延迟 {lat:.3f}s")
        print(f"    GET /healthz  -> 客户端延迟 {hz_lat:.3f}s (它出发时 3 个阻塞任务已占住循环)")

        check("3 个 /blocking 全部 200, 且都执行在 MainThread 上 —— 被阻塞的正是循环线程",
              all(r.status_code == 200 and r.json()["thread_name"] == "MainThread" for _, r, _ in blocking))
        check("每个 /blocking 服务端耗时都在 0.9~2.0s —— time.sleep(1) 的真实体感",
              all(0.9 <= r.json()["elapsed"] <= 2.0 for _, r, _ in blocking))
        check(f"healthz 延迟 {hz_lat:.3f}s > 1.5s —— 被阻塞任务卡住, 循环停摆现场成立", hz_lat > 1.5)
        check(f"最慢的 /blocking 客户端延迟 {max(l for _, _, l in blocking):.3f}s > 2.5s —— 三条 1s 等待首尾相接",
              max(l for _, _, l in blocking) > 2.5)
    return 1 if fails else 0


sys.exit(asyncio.run(main()))
BLKEOF
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
    banner "lab 11 · async def 与 def 的执行真相 —— 谁在哪个线程跑, 谁会卡住整条循环"
    echo "  场景: 慢任务 API。同一条 0.3s 的 IO 等待, /io-async 用 async def + asyncio.sleep,"
    echo "  /io-def 用普通 def + time.sleep 各实现一遍; 端点把执行线程的名字与编号印进响应。"
    echo "  并发 20 发对比两条轨道, 再用反面教材 /blocking 制造一次循环停摆的现场。"

    start_server

    step "[1/4] 并发 20 发: 两种声明都能并发, 但执行轨道不同"
    echo "  先发 async 版: 20 个 await asyncio.sleep(0.3) 在同一条事件循环线程上轮流让出:"
    burst "/io-async" 20 async
    echo "  再发 def 版: 20 个 time.sleep(0.3) 各占一条 anyio worker 线程同时睡:"
    burst "/io-def" 20 def

    step "[2/4] 线程池容量: anyio 默认 40 枚令牌"
    echo "  def 端点靠线程池并发, 池的并发额度读出来看 (total_tokens=40 是 anyio 默认值):"
    req GET "/pool-limit" 200 \
        'd["total_tokens"]' "40"

    step "[3/4] 阻塞现场: async def 里写 time.sleep, 整条循环停摆"
    echo "  /blocking 是 async def, 函数体却是 time.sleep(1) —— 阻塞的就是事件循环线程:"
    blocktest

    step "[4/4] 结论表 + 累积证据"
    echo "  ┌────────────────────────┬──────────────────────┬───────────────┬─────────────────────────────┐"
    echo "  | 声明 + 函数体          | 执行位置             | IO 并发?      | 函数体写成阻塞调用的后果    |"
    echo "  ├────────────────────────┼──────────────────────┼───────────────┼─────────────────────────────┤"
    echo "  | async def + await      | 事件循环(主线程)     | 能, 让出控制权| 循环停摆: 全进程请求排队    |"
    echo "  | def + 任意阻塞代码     | anyio 线程池         | 能, 各占一线程| 无碍循环, 但占池额度(共40)  |"
    echo "  └────────────────────────┴──────────────────────┴───────────────┴─────────────────────────────┘"
    echo "  累积证据: 本进程至今见过的线程名集合 (模块级 set 一路记录):"
    req GET "/thread-names" 200 \
        'd["count"]' "2"

    echo
    echo "  章节速查: [1] 20 并发: 两版总耗时均 <1s, 线程轨道 MainThread vs AnyIO worker"
    echo "            [2] 池容量 total_tokens=40 | [3] healthz 从 ~2ms 涨到 ~2.8s"
    echo "            [4] 结论表 + /thread-names"
    echo "  服务端日志保留在 $SERVER_LOG, 各端点可用 curl 随时复测"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl '$BASE/io-async'       # async def 版慢任务, thread_name=MainThread"
    echo "    curl '$BASE/io-def'         # def 版慢任务, thread_name=AnyIO worker thread"
    echo "    curl '$BASE/pool-limit'     # 线程池默认容量 40"
    echo "    curl '$BASE/thread-names'   # 进程见过的线程名集合"
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
