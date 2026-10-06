#!/usr/bin/env bash
# Lab 22 · 缓存与限流 —— 主演示脚本。
# 用法: ./22_cache_ratelimit.sh demo | all
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
PY="$ROOT/.venv/bin/python"
UVICORN="$ROOT/.venv/bin/uvicorn"
PORT=8922
RUN=".run"
LOG="$RUN/server.log"
BASE="http://127.0.0.1:$PORT"
PASS_COUNT=0

step() { echo; echo "=====> [$1] $2"; }
pass_() { echo "    [PASS] $1"; PASS_COUNT=$((PASS_COUNT + 1)); }

start() {
    mkdir -p "$RUN"
    "$UVICORN" main:app --port $PORT >"$LOG" 2>&1 &
    SERVER_PID=$!
    for _ in $(seq 1 50); do curl -sf "$BASE/healthz" >/dev/null 2>&1 && break; sleep 0.2; done
    curl -sf "$BASE/healthz" >/dev/null
}
stop() { [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true; wait "${SERVER_PID:-}" 2>/dev/null || true; }
cleanup() { stop; rm -rf "$RUN"; }
trap cleanup EXIT

demo() {
    start
    step "1/5" "组件总览"
    cat <<'T'
  TTLCache      命中直接返回;未命中回调后端并记账(TTL 2s)
  SafeCache     同上,但持 asyncio.Lock:同 key 并发未命中只算一次
  TokenBucket   rate=2/s, capacity=3:突发 3 发,之后按速率补充
  后端          模拟慢汇率源:每次真实计算 0.3s 并计数
T
    "$PY" - <<'EOF'
import httpx
r = httpx.post("http://127.0.0.1:8922/admin/reset").json()
print(f"    初始状态: {r}")
EOF

    step "2/5" "缓存命中与过期(无锁 TTLCache, TTL=2s)"
    "$PY" - <<'EOF'
import time
import httpx
base = "http://127.0.0.1:8922"
t0 = time.monotonic()
r1 = httpx.get(f"{base}/rate-cached/USD").json()
first_ms = (time.monotonic() - t0) * 1000
t0 = time.monotonic()
r2 = httpx.get(f"{base}/rate-cached/USD").json()
second_ms = (time.monotonic() - t0) * 1000
print(f"    首次: {first_ms:6.1f}ms  backend_calls={r1['backend_calls']}")
print(f"    二次: {second_ms:6.1f}ms  backend_calls={r2['backend_calls']}")
assert r1["backend_calls"] == 1, "首次应真实计算 1 次"
assert r2["backend_calls"] == 1 and second_ms < 50, "命中不应再算"
print("    [PASS] 未命中算一次, 命中直读缓存")
time.sleep(2.2)  # 越过 TTL=2s
r3 = httpx.get(f"{base}/rate-cached/USD").json()
print(f"    过期后: backend_calls={r3['backend_calls']} (重新计算)")
assert r3["backend_calls"] == 2, "TTL 过期后应重算"
print("    [PASS] TTL 过期后重新计算")
EOF
    pass_ "命中与过期语义成立"

    step "3/5" "缓存击穿实测: 并发 20 打无锁版 vs 带锁版"
    "$PY" - <<'EOF'
import asyncio
import httpx
base = "http://127.0.0.1:8922"

async def burst(path):
    httpx.post(f"{base}/admin/reset")
    async with httpx.AsyncClient() as c:
        rs = await asyncio.gather(*(c.get(f"{base}{path}") for _ in range(20)))
    assert all(r.status_code == 200 for r in rs)
    stats = httpx.get(f"{base}/backend-stats").json()
    return stats["backend_calls"].get("USD", 0)

unlocked = asyncio.run(burst("/rate-cached/USD"))
locked = asyncio.run(burst("/rate-safe/USD"))
print(f"    无锁版: 20 并发未命中 -> 后端被真实计算 {unlocked} 次")
print(f"    带锁版: 20 并发未命中 -> 后端被真实计算 {locked} 次")
assert unlocked >= 5, f"无锁版应明显击穿(实测 {unlocked})"
assert locked == 1, f"带锁版应收敛为 1(实测 {locked})"
print("    [PASS] 击穿现场与锁的收敛作用同时成立")
EOF
    pass_ "无锁击穿(>5 次)与带锁收敛(=1 次)双实测"

    step "4/5" "令牌桶限流: capacity=3, rate=2/s"
    "$PY" - <<'EOF'
import httpx
base = "http://127.0.0.1:8922"
httpx.post(f"{base}/admin/reset")
codes = []
retry_after = None
for i in range(5):
    r = httpx.get(f"{base}/rate-limited/JPY")
    codes.append(r.status_code)
    if r.status_code == 429:
        retry_after = r.headers.get("Retry-After")
print(f"    连打 5 发状态码: {codes}")
assert codes[:3] == [200, 200, 200], "桶容量 3 应放行前 3 发"
assert codes[3:] == [429, 429], "第 4、5 发应被限流"
print(f"    [PASS] 前 3 发放行, 后 2 发 429 (Retry-After={retry_after}s)")
import time
time.sleep(0.6)  # 2/s -> 0.6s 补 ~1.2 枚
r = httpx.get(f"{base}/rate-limited/JPY")
print(f"    等待 0.6s 后再发: {r.status_code}")
assert r.status_code == 200, "令牌补充后应放行"
print("    [PASS] 令牌按速率补充, 恢复 200")
EOF
    pass_ "突发上限与速率补充双语义成立"

    step "5/5" "对比总结"
    cat <<'T'
  +--------------+----------------------------+------------------------+
  | 组件         | 行为                       | 边界                   |
  +--------------+----------------------------+------------------------+
  | TTLCache     | 命中 <50ms, 过期重算       | 无锁并发未命中会击穿   |
  | SafeCache    | 同上, 且并发收敛为 1 次    | 全局锁牺牲一点并发     |
  | TokenBucket  | 突发=容量, 匀速=rate       | 多 worker 各一本账     |
  +--------------+----------------------------+------------------------+
T
    echo
    echo "  演示完成: $PASS_COUNT 组断言全部通过。"
}

all() { demo; }
main() {
    local target="${1:-all}"
    case "${target}" in
        demo|all) demo ;;
        *) echo "可用: demo | all" >&2; exit 1 ;;
    esac
}
main "$@"
