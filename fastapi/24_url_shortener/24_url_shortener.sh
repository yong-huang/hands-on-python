#!/usr/bin/env bash
# Lab 24 · 综合交付:短链接服务 —— 主演示脚本(完整业务流 + 边界现场)。
# 用法: ./24_url_shortener.sh demo | all
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
PY="$ROOT/.venv/bin/python"
UVICORN="$ROOT/.venv/bin/uvicorn"
PORT=8925
RUN=".run"
BASE="http://127.0.0.1:$PORT"
PASS_COUNT=0

step() { echo; echo "=====> [$1] $2"; }
pass_() { echo "    [PASS] $1"; PASS_COUNT=$((PASS_COUNT + 1)); }

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
    step "1/6" "创建短链: 合法 URL -> 201 + 短码"
    "$PY" - <<'EOF'
import httpx
base = "http://127.0.0.1:8925"
r = httpx.post(f"{base}/links", json={"url": "https://example.com/very/long/path?q=1"})
print(f"    POST /links -> {r.status_code} {r.json()}")
assert r.status_code == 201 and len(r.json()["code"]) == 6 and r.json()["reused"] is False
r2 = httpx.post(f"{base}/links", json={"url": "https://example.com/very/long/path?q=1"})
print(f"    重复创建 -> {r2.status_code} reused={r2.json()['reused']} code={r2.json()['code']}")
assert r2.json()["reused"] is True and r2.json()["code"] == r.json()["code"]
print("    [PASS] 短码 6 位, 同 URL 复用同码")
EOF
    pass_ "创建与查重成立"

    step "2/6" "跳转与点击统计"
    "$PY" - <<'EOF'
import httpx
base = "http://127.0.0.1:8925"
code = httpx.post(f"{base}/links", json={"url": "https://example.com/stats-demo"}).json()["code"]
for _ in range(3):
    r = httpx.get(f"{base}/{code}", follow_redirects=False)
    assert r.status_code == 307
    assert r.headers["location"] == "https://example.com/stats-demo"
    assert r.headers["x-request-id"]  # lab 19: request_id 贯穿
s = httpx.get(f"{base}/links/{code}/stats").json()
print(f"    跳转 3 次后 stats -> {s}")
assert s["clicks"] == 3
print("    [PASS] 307 跳转 + 计数精确 + request_id 回显")
EOF
    pass_ "跳转与统计成立"

    step "3/6" "热点缓存: 二次跳转不查表(计数走主表, 缓存存 URL)"
    "$PY" - <<'EOF'
import time
import httpx
base = "http://127.0.0.1:8925"
code = httpx.post(f"{base}/links", json={"url": "https://example.com/hot"}).json()["code"]
t0 = time.monotonic()
httpx.get(f"{base}/{code}", follow_redirects=False)
first = (time.monotonic() - t0) * 1000
t0 = time.monotonic()
httpx.get(f"{base}/{code}", follow_redirects=False)
second = (time.monotonic() - t0) * 1000
print(f"    首跳 {first:.1f}ms(查表), 二跳 {second:.1f}ms(缓存)")
assert second <= first + 5, "缓存后不应更慢"
print("    [PASS] 热点跳转走缓存(TTL 5s)")
EOF
    pass_ "热点缓存成立"

    step "4/6" "边界现场: 422 / 404 / 403 全走统一信封"
    "$PY" - <<'EOF'
import httpx
base = "http://127.0.0.1:8925"
r = httpx.post(f"{base}/links", json={"url": "ftp://not-http"})
assert r.status_code == 422 and r.json()["code"] == "VALIDATION_ERROR"
print(f"    非法协议 -> 422 信封: {r.json()['message']}")
r = httpx.get(f"{base}/no-such-code", follow_redirects=False)
assert r.status_code == 404 and r.json()["code"] == "HTTP_ERROR" and r.json()["request_id"]
print(f"    不存在短码 -> 404 信封(带 request_id)")
r = httpx.post(f"{base}/admin/reset", headers={"X-Admin-Key": "wrong"})
assert r.status_code == 403 and r.json()["code"] == "HTTP_ERROR"
print(f"    错误管理密钥 -> 403 信封: {r.json()['message']}")
print("    [PASS] 三种错误同一形状(呼应 lab 04)")
EOF
    pass_ "统一错误信封成立"

    step "5/6" "管理端点: 正确密钥放行"
    "$PY" - <<'EOF'
import httpx
base = "http://127.0.0.1:8925"
r = httpx.post(f"{base}/admin/reset", headers={"X-Admin-Key": "lab24-admin"})
assert r.status_code == 200 and r.json()["ok"] is True
assert httpx.get(f"{base}/healthz").json()["links"] == 0
print("    [PASS] 正确 X-Admin-Key 清空数据")
EOF
    pass_ "管理鉴权放行成立"

    step "6/6" "串联清单"
    cat <<'T'
  本服务用到的实验件:
    lab 01/02 参数校验(422)   lab 04 统一错误信封   lab 06 依赖生命周期
    lab 08 鉴权依赖            lab 10 依赖工厂(短码长度)
    lab 19 request_id          lab 21 Settings        lab 22 TTL 缓存
  生产化缺位(有意的): 持久化在内存、多 worker 各一本账 —— 正解见 lab 15/23。
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
