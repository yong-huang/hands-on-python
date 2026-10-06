#!/usr/bin/env bash
# lab 09 · 测试替身(dependency_overrides) —— 主演示脚本
#
# 用法:
#   ./09_dependency_overrides.sh demo   # 教学演示: 讲解 + pytest -v + 真服务对照
#   ./09_dependency_overrides.sh all    # = demo(主教材是测试文件, 无需多阶段)
#   ./09_dependency_overrides.sh clean  # 兜底停服务, 删除 .run/
#
# 教学要点(与其他实验的差异): 本实验主流程不起长驻服务 —— TestClient(FastAPI
# 配套的进程内测试客户端)把 app 直接搬进 pytest 进程, 请求不经过网络; 而
# dependency_overrides 发生在"框架解析依赖"的那一步, 与有没有 uvicorn 无关。
# 最后一节仍会短暂起一次 uvicorn, 用 curl 对照"没有替身时真网关被真实调用"。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8909
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
LAST_RESP="$RUN_DIR/last_resp.json"
SERVER_PID=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }
ok() { echo "    [PASS] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "    [FAIL] $*"; exit 1; }
assert_eq() { if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (实际: [$2] / 期望: [$3])"; fi; }

jget() { # 从最近一次响应取字段, 表达式形如 d["receipt"]["provider"](eval 仅供本脚本自用)
    "$PY" -c '
import json, sys
with open(sys.argv[2], encoding="utf-8") as f:
    d = json.load(f)
v = eval(sys.argv[1])
print(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
' "$1" "$LAST_RESP"
}

show_resp() { # 打印请求描述与最近一次响应(美化 JSON)
    echo "    \$ $1   =>   HTTP $STATUS"
    "$PY" -c '
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    print(json.dumps(json.load(f), ensure_ascii=False, indent=2))
' "$LAST_RESP" | sed 's/^/        /'
}

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT(仅对照实验用, 结束后自动停止)"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/gateway-stats" 2>/dev/null; then
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
    banner "lab 09 · 测试替身 dependency_overrides —— 主教材是 pytest 测试文件"
    echo "  场景: 支付 API。真网关依赖每次执行都计数并 sleep 0.1 秒冒充网络往返;"
    echo "  测试用一行注册把它换掉: app.dependency_overrides[get_payment_gateway] = 替身。"
    echo "  主流程不起长驻服务: TestClient 在 pytest 进程内直接对 app 发请求, 替换发生"
    echo "  在框架解析依赖的那一步, 与有没有 uvicorn 无关([3] 会起一次真服务做对照)。"

    step "[1/3] 环境与教材"
    "$PY" -c 'import sys, fastapi, pytest; print(f"  Python {sys.version.split()[0]} | fastapi {fastapi.__version__} | pytest {pytest.__version__}")'
    echo "  教材三件套:"
    echo "    main.py           被测应用: 真网关(计数+sleep)/真风控/子依赖/use_cache 端点"
    echo "    conftest.py       pytest 夹具: client(不注册替身)/fake_gateway/counters"
    echo "    test_overrides.py 主教材: 8 个测试 = 6 个机制点 + 1 个泄漏回归检查"
    assert_eq "教材文件齐备" "$(ls main.py conftest.py test_overrides.py 2>/dev/null | wc -l | tr -d ' ')" "3"

    step "[2/3] 运行 pytest -v: 每个测试名就是一个机制点"
    echo "  [1] 无替身基线   真网关计数+1, 响应带 simulated-100ms 延迟标记"
    echo "  [2] 整体置换     假网关接管, 扣款/依赖函数/子依赖三个真计数器纹丝不动"
    echo "  [3] 精确制导     只换 gateway, 真风控照常执行 +1"
    echo "  [4] 签名可简化   无参替身顶替带子依赖的真依赖, 子链不再解析"
    echo "  [5] clear() 恢复 清空 overrides, 真网关立刻回岗"
    echo "  [6] 项目惯例     autouse fixture 自动注册 + teardown 自动 clear"
    mkdir -p "$RUN_DIR"
    if ! "$PY" -m pytest -v test_overrides.py >"$RUN_DIR/pytest.log" 2>&1; then
        sed 's/^/  /' "$RUN_DIR/pytest.log"
        fail "pytest 存在失败用例"
    fi
    sed 's/^/  /' "$RUN_DIR/pytest.log"
    assert_eq "pytest 用例通过数 = 8" "$(grep -c 'PASSED' "$RUN_DIR/pytest.log" | tr -d ' ')" "8"

    step "[3/3] 对照实验: 起真服务, 没有替身时真网关被真实调用"
    echo "  测试里真计数器是 0, 因为替身顶班; 现在不注册任何 override, curl 直打 ——"
    echo "  预期: 响应带 simulated-100ms, 请求耗时约 0.1 秒, gateway-stats 计数 +1。"
    start_server

    STATUS="$(curl -sS -o "$LAST_RESP" -w '%{http_code}' "$BASE/gateway-stats")"
    show_resp "curl $BASE/gateway-stats   (初始: 全 0)"
    assert_eq "初始真网关扣款计数 = 0" "$(jget 'd["charge_calls"]')" "0"

    local timed
    timed="$(curl -sS -o "$LAST_RESP" -w '%{http_code} %{time_total}' -X POST "$BASE/pay" -H 'Content-Type: application/json' -d '{"order_id":"DEMO-1","amount_cents":9900}')"
    STATUS="${timed%% *}"; TIME_TOTAL="${timed##* }"
    show_resp "curl -X POST $BASE/pay -d '{...}'"
    assert_eq "状态码 200" "$STATUS" "200"
    assert_eq "provider = real-gateway(真网关在场)" "$(jget 'd["receipt"]["provider"]')" "real-gateway"
    assert_eq "latency = simulated-100ms(延迟标记在场)" "$(jget 'd["receipt"]["latency"]')" "simulated-100ms"
    if awk -v t="$TIME_TOTAL" 'BEGIN{exit !(t+0 >= 0.09)}'; then
        ok "请求耗时 ${TIME_TOTAL}s >= 0.09s(真网关的 sleep 真实发生)"
    else
        fail "请求耗时 ${TIME_TOTAL}s, 未观测到 0.1 秒延迟"
    fi

    STATUS="$(curl -sS -o "$LAST_RESP" -w '%{http_code}' "$BASE/gateway-stats")"
    show_resp "curl $BASE/gateway-stats   (扣款后: 计数 +1)"
    assert_eq "真网关扣款计数 = 1" "$(jget 'd["charge_calls"]')" "1"
    assert_eq "依赖函数解析计数 = 1" "$(jget 'd["gateway_resolved"]')" "1"

    echo "  顺带验证 use_cache(/pay-twice 两个参数声明同一个依赖):"
    timed="$(curl -sS -o "$LAST_RESP" -w '%{http_code} %{time_total}' -X POST "$BASE/pay-twice" -H 'Content-Type: application/json' -d '{"order_id":"DEMO-2","amount_cents":100}')"
    STATUS="${timed%% *}"; TIME_TOTAL="${timed##* }"
    show_resp "curl -X POST $BASE/pay-twice -d '{...}'"
    assert_eq "两个参数拿到同一实例(same_instance = true)" "$(jget 'd["same_instance"]')" "true"
    STATUS="$(curl -sS -o "$LAST_RESP" -w '%{http_code}' "$BASE/gateway-stats")"
    assert_eq "同一请求只解析一次: 解析计数 1 -> 2" "$(jget 'd["gateway_resolved"]')" "2"
    assert_eq "扣款只执行一次: charge_calls = 2" "$(jget 'd["charge_calls"]')" "2"

    echo
    echo "  收束: 同一个 /pay, 测试里 charge_calls 恒为 0, 这里是 1 —— 差别只有一行"
    echo "  注册: app.dependency_overrides[get_payment_gateway] = 替身函数。"
    echo "  章节速查: [1] 环境与教材 | [2] pytest 8 用例 | [3] 真服务对照(8909 已停)"
    echo "  pytest 完整日志: $RUN_DIR/pytest.log"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_clean() {
    stop_server
    rm -rf "$RUN_DIR"
    echo "已清理 $RUN_DIR"
}

case "${1:-demo}" in
    demo) demo ;;
    all) demo ;;
    clean) cmd_clean ;;
    *)
        echo "用法: $0 demo|all|clean"
        exit 1
        ;;
esac
