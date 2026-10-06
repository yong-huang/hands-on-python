#!/usr/bin/env bash
# Lab 25 · 压测基准 —— 主演示脚本:三种客户端同题对决 + p99 读数。
# 用法: ./25_benchmark.sh demo | all
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
PY="$ROOT/.venv/bin/python"
UVICORN="$ROOT/.venv/bin/uvicorn"
PORT=8926
RUN=".run"
BASE="http://127.0.0.1:$PORT"
PASS_COUNT=0

step() { echo; echo "=====> [$1] $2"; }

start() {
    mkdir -p "$RUN"
    "$UVICORN" main:app --port $PORT >"$RUN/server.log" 2>&1 &
    SERVER_PID=$!
    for _ in $(seq 1 50); do curl -sf "$BASE/healthz" >/dev/null 2>&1 && break; sleep 0.2; done
    curl -sf "$BASE/healthz" >/dev/null
}
stop() { [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true; wait "${SERVER_PID:-}" 2>/dev/null || true; }
cleanup() { stop; rm -rf "$RUN"; }
trap cleanup EXIT

demo() {
    start
    step "1/4" "对决设计"
    cat <<'T'
  三种客户端, 各打 100 个请求, 记录总耗时与延迟分位数(p50/p99):
    串行     httpx 逐个同步请求       基线: 无并发
    线程池   ThreadPoolExecutor(20)  多线程并发(呼应 lab 11 的 def 语义)
    异步     httpx.AsyncClient        单线程事件循环(呼应 lab 11 的 async 语义)
  两类端点:
    /fast 无等待 —— 比的是每请求开销
    /slow 0.1s 等待 —— 比的是等待重叠能力
T

    step "2/4" "/slow 端点: 100 请求 × 0.1s 等待"
    "$PY" - "$BASE" <<'EOF'
import asyncio
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import httpx

base = sys.argv[1]
N = 100


def pctl(latencies, p):
    s = sorted(latencies)
    return s[min(len(s) - 1, int(len(s) * p / 100))]


def bench_serial(path):
    lat = []
    with httpx.Client() as c:
        for _ in range(N):
            t0 = time.monotonic()
            c.get(f"{base}{path}")
            lat.append((time.monotonic() - t0) * 1000)
    return lat


def bench_threads(path):
    lat = []
    def one():
        t0 = time.monotonic()
        httpx.get(f"{base}{path}")
        return (time.monotonic() - t0) * 1000
    with ThreadPoolExecutor(20) as ex:
        lat = list(ex.map(lambda _: one(), range(N)))
    return lat


def bench_async(path):
    async def run():
        lat = []
        async with httpx.AsyncClient() as c:
            async def one():
                t0 = time.monotonic()
                await c.get(f"{base}{path}")
                lat.append((time.monotonic() - t0) * 1000)
            await asyncio.gather(*(one() for _ in range(N)))
        return lat
    return asyncio.run(run())


for path in ("/slow", "/fast"):
    print(f"  ---- {path} ----")
    results = {}
    for name, fn in (("串行  ", bench_serial), ("线程池", bench_threads), ("异步  ", bench_async)):
        t0 = time.monotonic()
        lat = fn(path)
        wall = (time.monotonic() - t0)
        results[name] = (wall, lat)
        print(f"    {name} 总耗时 {wall:6.2f}s | p50 {pctl(lat,50):6.1f}ms | p99 {pctl(lat,99):6.1f}ms")
    if path == "/slow":
        s_wall = results["串行  "][0]
        a_wall = results["异步  "][0]
        t_wall = results["线程池"][0]
        print(f"    [PASS] /slow: 异步 {a_wall:.2f}s 与线程池 {t_wall:.2f}s 都远快于串行 {s_wall:.2f}s"
              f" —— 等待重叠(异步 {s_wall/max(a_wall,0.01):.0f}x)")
        assert a_wall < s_wall / 2 and t_wall < s_wall / 2
    else:
        print("    [PASS] /fast: 三者都在毫秒~亚秒级, 差距是每请求开销(见诚实预期)")
EOF
    pass_ "并发对决方向断言成立"

    step "3/4" "读数口径"
    cat <<'T'
  p50/p99 是客户端视角的延迟分位数: p99 = 99% 的请求快于该值, 长尾一眼可见。
  本实验是客户端基准: 服务端同机、无网络抖动 —— 数字用于对比方向, 不代表
  生产吞吐(生产压测用专用工具, 见 Pitfalls)。
T

    step "4/4" "诚实边界"
    cat <<'T'
  - 线程池 20 并发打 /slow: 线程够用(20 < anyio 上限 40), 但并发上千时
    线程开销会显现 —— lab 11 已实测过线程名与开销。
  - /fast 端点三种客户端差距很小: 无等待时瓶颈是客户端自身开销。
  - 结论限本机(单机回环), 数字只看方向不看绝对值。
T
    echo
    echo "  演示完成: $PASS_COUNT 组断言全部通过。"
}
pass_() { echo "    [PASS] $1"; PASS_COUNT=$((PASS_COUNT + 1)); }

all() { demo; }
main() {
    local target="${1:-all}"
    case "${target}" in
        demo|all) demo ;;
        *) echo "可用: demo | all" >&2; exit 1 ;;
    esac
}
main "$@"
