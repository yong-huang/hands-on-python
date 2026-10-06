#!/usr/bin/env bash
# =====================================================================
# 02 · Pydantic 模型与校验体系 —— 主演示脚本
#
# 用法：
#   ./02_pydantic_validation.sh start   # 后台起服务并保持运行（便于手动 curl）
#   ./02_pydantic_validation.sh demo    # 6 章教学演示 + 确定性断言（结束自动清理）
#   ./02_pydantic_validation.sh clean   # 杀服务、确认端口释放，无残留
#   ./02_pydantic_validation.sh all     # start + demo + clean（默认）
#
# 断言一律用仓库根 .venv 的 python + httpx 解析 JSON，比对 loc/msg/type。
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")"            # 任意 cwd 运行都正确

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"  # .venv 在仓库根（labs/02_xxx 的上一级，即 fastapi 目录），不在实验目录
VENV_PY="$REPO_ROOT/.venv/bin/python"
VENV_UVICORN="$REPO_ROOT/.venv/bin/uvicorn"
PORT=8902
BASE="http://127.0.0.1:${PORT}"
PID_FILE="/tmp/hands-on-python-02.pid"
LOG_FILE="/tmp/hands-on-python-02-uvicorn.log"
TMP_DIR="$(mktemp -d /tmp/hands-on-python-02.XXXXXX)"
KEEP_SERVER=0                   # start 模式置 1：脚本退出时不杀服务

step() { echo; echo "=====> [$1] $2"; }

show_json() {  # 可读 JSON：中文不转义、缩进 2 格（json.tool 会转义中文，故自写）
    "$VENV_PY" -c 'import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
print(json.dumps(data, ensure_ascii=False, indent=2))' "$1"
}

server_ready() {  # 就绪判定必须核对 openapi.json 的标题，防止端口被无关进程占用造成误判
    curl -sf "$BASE/openapi.json" 2>/dev/null | grep -q '"title":"hands-on-python · 02 Pydantic'
}

wait_ready() {  # readiness 重试：每 0.2s 探测一次，最多 15s；不裸 sleep 等固定时长
    local i
    for i in $(seq 1 75); do
        if server_ready; then
            echo "服务就绪：${BASE}"
            return 0
        fi
        sleep 0.2
    done
    echo "错误：端口 ${PORT} 上 15 秒内没有出现本实验的服务，uvicorn 日志尾部：" >&2
    tail -n 20 "$LOG_FILE" >&2 || true
    return 1
}

do_start() {
    if server_ready; then
        echo "服务已在 ${BASE} 运行，跳过启动"
        return 0
    fi
    echo "后台启动 uvicorn main:app --port ${PORT}（日志: ${LOG_FILE}）"
    "$VENV_UVICORN" main:app --host 127.0.0.1 --port "$PORT" >"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
    wait_ready
}

kill_mine() {  # 只杀命令行匹配"本实验 uvicorn"的进程，$1 是信号（TERM/-9）
    local pid cmd
    for pid in $(lsof -ti tcp:"${PORT}" 2>/dev/null || true); do
        cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
        if [[ "$cmd" == *uvicorn* && "$cmd" == *main:app* ]]; then
            kill "$1" "$pid" 2>/dev/null || true
        fi
    done
}

do_kill_server() {  # 幂等：PID 文件与端口兜底都先核对命令行，避免误伤无关进程
    if [[ -f "$PID_FILE" ]]; then
        local pid cmd
        pid="$(cat "$PID_FILE")"
        cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
        if [[ "$cmd" == *uvicorn* && "$cmd" == *main:app* ]]; then
            kill "$pid" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi
    kill_mine TERM
    wait 2>/dev/null || true  # 收割本 shell 的后台作业，抑制 "Terminated" 退出通知
}

do_clean() {
    step "clean" "杀掉 uvicorn，确认端口 ${PORT} 释放，无残留"
    do_kill_server
    local i cmd
    for i in $(seq 1 50); do
        if ! lsof -ti tcp:"${PORT}" >/dev/null 2>&1; then
            echo "端口 ${PORT} 已释放，PID/日志/临时文件已清理"
            rm -f "$LOG_FILE"
            rm -rf "$TMP_DIR"
            return 0
        fi
        if (( i == 15 )); then  # 3s 仍不退出：升级为 SIGKILL（仍只限本实验进程）
            kill_mine -9
        fi
        sleep 0.2
    done
    if lsof -ti tcp:"${PORT}" >/dev/null 2>&1; then
        cmd="$(ps -p "$(lsof -ti tcp:"${PORT}" | head -1)" -o command= 2>/dev/null || true)"
        if [[ "$cmd" != *uvicorn* ]]; then
            echo "警告：端口 ${PORT} 被非本实验进程占用，已跳过清理：$cmd" >&2
            return 0
        fi
        echo "错误：本实验的 uvicorn 未能退出" >&2
        return 1
    fi
}

on_exit() {  # trap 清理：demo/all 退出时兜底杀服务 + 删临时文件；start 模式保留服务
    if [[ "${KEEP_SERVER}" != "1" ]]; then
        do_kill_server
    fi
    rm -rf "$TMP_DIR"
}
trap on_exit EXIT

# ------------------------------------------------------------ 演示章节 ----

do_demo() {
    local http_code

    step "1" "模型体系总览：Customer / OrderItem / Order 三层模型树"
    echo "请求体是一棵模型树：Order 顶层，嵌套 Customer 对象与 items 列表（元素是 OrderItem）。"
    echo "每个模型的 model_json_schema() 顶层 keys 与字段约束如下，约束都声明在字段上："
    "$VENV_PY" - <<'PY'
from main import Customer, OrderItem, Order

for m in (Customer, OrderItem, Order):
    s = m.model_json_schema()
    print(f"\n[{m.__name__}]  顶层 keys = {list(s)}")
    for name, spec in s["properties"].items():
        cons = {k: spec[k] for k in ("type", "pattern", "minimum", "maximum",
                                     "exclusiveMinimum", "default", "$ref") if k in spec}
        print(f"  {name}: {cons}")
    print(f"  required = {s.get('required')}")
PY

    step "2" "合法创建：完整请求 -> 201，computed_field 现场算出 total 与 discount"
    cat >"$TMP_DIR/valid.json" <<'JSON'
{
  "customer": { "name": "阿珍", "email": "zhen@example.com" },
  "coupon": "VIP2026",
  "items": [
    { "name": "机械键盘", "price": 399.0, "quantity": 2 },
    { "name": "USB-C 扩展坞", "price": 259.5, "quantity": 1 }
  ]
}
JSON
    echo "请求体（优惠券 VIP2026：9 折）："
    show_json "$TMP_DIR/valid.json"
    echo
    echo "\$ curl -s -X POST ${BASE}/orders -H 'Content-Type: application/json' -d @valid.json"
    http_code="$(curl -s -o "$TMP_DIR/resp.json" -w '%{http_code}' \
        -X POST "$BASE/orders" -H 'Content-Type: application/json' \
        --data @"$TMP_DIR/valid.json")"
    echo "HTTP ${http_code}"
    show_json "$TMP_DIR/resp.json"
    echo
    echo "响应里的 order_no / created_at 是服务端演生字段；total 与 discount"
    echo "来自 @computed_field，客户端没有提交它们。下面用 httpx 断言："
    BASE_URL="$BASE" "$VENV_PY" - <<'PY'
import os, re, httpx

base = os.environ["BASE_URL"]
payload = {
    "customer": {"name": "阿珍", "email": "zhen@example.com"},
    "coupon": "VIP2026",
    "items": [
        {"name": "机械键盘", "price": 399.0, "quantity": 2},
        {"name": "USB-C 扩展坞", "price": 259.5, "quantity": 1},
    ],
}
r = httpx.post(f"{base}/orders", json=payload, timeout=5)
body = r.json()
assert r.status_code == 201, (r.status_code, body)
assert re.fullmatch(r"ORD-\d+", body["order_no"]), body["order_no"]
assert "T" in body["created_at"] and body["created_at"].endswith("+00:00")
assert body["total"] == 1057.5, body["total"]          # 399*2 + 259.5
assert body["discount"] == 105.75, body["discount"]    # 1057.5 * 0.10
print(f"[OK] 201；order_no={body['order_no']}；total={body['total']}；discount={body['discount']}")

g = httpx.get(f"{base}/orders/{body['order_no']}", timeout=5)
assert g.status_code == 200 and g.json() == body
g404 = httpx.get(f"{base}/orders/ORD-999999", timeout=5)
assert g404.status_code == 404
print(f"[OK] GET /orders/{body['order_no']} 回读一致（200）；不存在的订单号 -> 404")
PY

    step "3" "嵌套校验失败：第二个 item 的 price=-1 -> 422，loc 精确到 ['body','items',1,'price']"
    cat >"$TMP_DIR/bad_nested.json" <<'JSON'
{
  "customer": { "name": "阿珍", "email": "zhen@example.com" },
  "coupon": "VIP2026",
  "items": [
    { "name": "机械键盘", "price": 399.0, "quantity": 2 },
    { "name": "坏数据样例", "price": -1, "quantity": 1 }
  ]
}
JSON
    echo "只有第二个 item 的 price 违反 gt=0，注意 422 全文里 loc 的下钻路径："
    echo "\$ curl -s -X POST ${BASE}/orders -d @bad_nested.json"
    http_code="$(curl -s -o "$TMP_DIR/resp422.json" -w '%{http_code}' \
        -X POST "$BASE/orders" -H 'Content-Type: application/json' \
        --data @"$TMP_DIR/bad_nested.json")"
    echo "HTTP ${http_code}"
    show_json "$TMP_DIR/resp422.json"
    BASE_URL="$BASE" "$VENV_PY" - <<'PY'
import os, httpx

base = os.environ["BASE_URL"]
payload = {
    "customer": {"name": "阿珍", "email": "zhen@example.com"},
    "items": [
        {"name": "机械键盘", "price": 399.0, "quantity": 2},
        {"name": "坏数据样例", "price": -1, "quantity": 1},
    ],
}
r = httpx.post(f"{base}/orders", json=payload, timeout=5)
err = r.json()["detail"][0]
assert r.status_code == 422, r.status_code
assert err["loc"] == ["body", "items", 1, "price"], err["loc"]
assert err["type"] == "greater_than", err["type"]
assert "greater than 0" in err["msg"], err["msg"]
print("[OK] 422；loc=['body','items',1,'price']（body -> items 列表 -> 下标 1 -> price 字段）")
print(f"[OK] type={err['type']}；msg={err['msg']!r}")
PY

    step "4" "跨字段规则：单件 99999 元打爆总价上限，model_validator 在模型级拦截"
    echo "每个字段单独看都合法，但 price*quantity 加起来超过 MAX_ORDER_TOTAL=10000。"
    echo "这类跨字段规则由 @model_validator(mode='after') 把守，loc 停在模型级 ['body']："
    cat >"$TMP_DIR/over_cap.json" <<'JSON'
{
  "customer": { "name": "阿珍", "email": "zhen@example.com" },
  "items": [
    { "name": "天价单品", "price": 99999, "quantity": 1 }
  ]
}
JSON
    http_code="$(curl -s -o "$TMP_DIR/resp_cap.json" -w '%{http_code}' \
        -X POST "$BASE/orders" -H 'Content-Type: application/json' \
        --data @"$TMP_DIR/over_cap.json")"
    echo "HTTP ${http_code}"
    show_json "$TMP_DIR/resp_cap.json"
    BASE_URL="$BASE" "$VENV_PY" - <<'PY'
import os, httpx

base = os.environ["BASE_URL"]
payload = {
    "customer": {"name": "阿珍", "email": "zhen@example.com"},
    "items": [{"name": "天价单品", "price": 99999, "quantity": 1}],
}
r = httpx.post(f"{base}/orders", json=payload, timeout=5)
err = r.json()["detail"][0]
assert r.status_code == 422, r.status_code
assert err["loc"] == ["body"], err["loc"]                # 模型级：不再下钻到字段
assert err["type"] == "value_error", err["type"]
assert "超过上限" in err["msg"], err["msg"]
print("[OK] 422；loc=['body']（model_validator 的错误归模型所有）")
print(f"[OK] type={err['type']}；msg={err['msg']!r}")
PY

    step "5" "validator 改写数据：小写带空格的优惠券进来，大写归一后出去"
    echo 'coupon 字段带 pattern ^[A-Z0-9]{6,12}$，但传 "  vip2026  " 也能过——'
    echo "因为 field_validator(mode='before') 先于 pattern 执行，strip+upper 救回了它："
    cat >"$TMP_DIR/lower_coupon.json" <<'JSON'
{
  "customer": { "name": "阿珍", "email": "zhen@example.com" },
  "coupon": "  vip2026  ",
  "items": [
    { "name": "机械键盘", "price": 399.0, "quantity": 2 }
  ]
}
JSON
    http_code="$(curl -s -o "$TMP_DIR/resp_coupon.json" -w '%{http_code}' \
        -X POST "$BASE/orders" -H 'Content-Type: application/json' \
        --data @"$TMP_DIR/lower_coupon.json")"
    echo "HTTP ${http_code}"
    show_json "$TMP_DIR/resp_coupon.json"
    BASE_URL="$BASE" "$VENV_PY" - <<'PY'
import os, httpx

base = os.environ["BASE_URL"]
payload = {
    "customer": {"name": "阿珍", "email": "zhen@example.com"},
    "coupon": "  vip2026  ",
    "items": [{"name": "机械键盘", "price": 399.0, "quantity": 2}],
}
r = httpx.post(f"{base}/orders", json=payload, timeout=5)
body = r.json()
assert r.status_code == 201, (r.status_code, body)
assert body["coupon"] == "VIP2026", body["coupon"]       # 归一化生效
assert body["total"] == 798.0, body["total"]             # 399*2
assert body["discount"] == 79.8, body["discount"]        # 798 * 0.10，按归一后的券码计算
print("[OK] 201；请求 '  vip2026  ' -> 响应 coupon='VIP2026'（strip+upper）")
print(f"[OK] 折扣按归一后的券码计算：total={body['total']}，discount={body['discount']}")
PY

    step "6" "约束违约一览：5 种违约各打一枪，看第一条错误的 loc / msg / type"
    BASE_URL="$BASE" "$VENV_PY" - <<'PY'
import os, httpx

base = os.environ["BASE_URL"]
item = {"name": "机械键盘", "price": 399.0, "quantity": 2}
cases = [
    ("email 不匹配 pattern",
     {"customer": {"name": "阿珍", "email": "not-an-email"}, "items": [item]},
     ["body", "customer", "email"], "string_pattern_mismatch"),
    ("quantity=0 违反 ge=1",
     {"customer": {"name": "阿珍", "email": "zhen@example.com"},
      "items": [{"name": "键盘", "price": 10.0, "quantity": 0}]},
     ["body", "items", 0, "quantity"], "greater_than_equal"),
    ("items 空列表违反 min_length=1",
     {"customer": {"name": "阿珍", "email": "zhen@example.com"}, "items": []},
     ["body", "items"], "too_short"),
    ("coupon 'abc' 违反 6~12 位 pattern",
     {"customer": {"name": "阿珍", "email": "zhen@example.com"},
      "coupon": "abc", "items": [item]},
     ["body", "coupon"], "string_pattern_mismatch"),
    ("缺少 customer 字段",
     {"items": [item]},
     ["body", "customer"], "missing"),
]
for label, payload, want_loc, want_type in cases:
    r = httpx.post(f"{base}/orders", json=payload, timeout=5)
    err = r.json()["detail"][0]
    assert r.status_code == 422, (label, r.status_code)
    assert err["loc"] == want_loc, (label, err["loc"])
    assert err["type"] == want_type, (label, err["type"])
    print(f"[OK] {label}")
    print(f"     loc={err['loc']}  type={err['type']}")
    print(f"     msg={err['msg']!r}")
print("\n[OK] 5 种违约的 loc/msg/type 全部符合预期")
PY

    echo
    echo "=====> [done] 6 章演示与断言全部通过"
}

# ------------------------------------------------------------ 入口分发 ----

usage() {
    echo "用法: $0 {start|demo|clean|all}" >&2
    echo "  start  后台起服务并保持运行" >&2
    echo "  demo   6 章演示 + 断言（结束自动清理）" >&2
    echo "  clean  杀服务、清理残留" >&2
    echo "  all    start + demo + clean（默认）" >&2
}

main() {
    local target="${1:-all}"
    case "$target" in
        start)
            KEEP_SERVER=1
            do_start
            ;;
        demo)
            server_ready || do_start   # 未启动则自动拉起；EXIT trap 会负责清理
            do_demo
            ;;
        clean)
            do_clean
            ;;
        all)
            do_start
            do_demo
            do_clean
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
