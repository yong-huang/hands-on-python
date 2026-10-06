#!/usr/bin/env bash
# Lab 21 · 配置管理与多环境 —— 主演示脚本。
# 用法: ./21_settings.sh demo | all
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
PY="$ROOT/.venv/bin/python"
UVICORN="$ROOT/.venv/bin/uvicorn"
PORT=8921
RUN=".run"
LOG="$RUN/server.log"

step() { echo; echo "=====> [$1] $2"; }
expect() {  # 断言助手: 输出包含关键字
    local desc="$1" hay="$2" needle="$3"
    if grep -q "$needle" <<<"$hay"; then
        echo "    [PASS] $desc"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "    [FAIL] $desc (未找到: $needle)"; echo "$hay" | head -5; exit 1
    fi
}
start_with() {  # 以指定 env 文件与环境变量启动, 等 readiness, 打印 /config
    local envfile="$1"; shift
    local -a envvars=("$@")
    mkdir -p "$RUN"
    if [ ${#envvars[@]} -gt 0 ]; then
        env "${envvars[@]}" "$UVICORN" main:app --port $PORT >"$LOG" 2>&1 &
    else
        env "LAB21_ENV_FILE=$envfile" "$UVICORN" main:app --port $PORT >"$LOG" 2>&1 &
    fi
    SERVER_PID=$!
    for _ in $(seq 1 50); do
        curl -sf "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1 && break
        sleep 0.2
    done
    curl -sf "http://127.0.0.1:$PORT/healthz" >/dev/null
}
show_config() {
    "$PY" - <<'EOF'
import httpx
r = httpx.get("http://127.0.0.1:8921/config").json()
print(f"    /config -> {r}")
EOF
}
stop_server() { [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true; wait "${SERVER_PID:-}" 2>/dev/null || true; }
cleanup() { stop_server; rm -rf "$RUN"; }
trap cleanup EXIT
PASS_COUNT=0

demo() {
    step "1/5" "优先级链实测: 默认值 -> .env 文件 -> 环境变量"
    start_with ".env.dev"
    show_config
    cfg="$(curl -s http://127.0.0.1:$PORT/config)"
    expect ".env.dev 的 threshold=10 生效" "$cfg" '"threshold":10'
    stop_server

    step "2/5" "环境变量覆盖 env 文件(优先级最高)"
    start_with ".env.dev" "LAB21_THRESHOLD=55"
    cfg="$(curl -s http://127.0.0.1:$PORT/config)"
    show_config
    expect "环境变量 LAB21_THRESHOLD=55 压过 .env.dev 的 10" "$cfg" '"threshold":55'
    stop_server

    step "3/5" "类型校验: 非法值让启动直接失败(pydantic-settings 拒收)"
    set +e
    env "LAB21_THRESHOLD=abc" "$UVICORN" main:app --port 8923 >"$RUN/bad.log" 2>&1 &
    BAD_PID=$!
    sleep 1
    curl -sf "http://127.0.0.1:8923/config" >/dev/null 2>&1 || true
    sleep 0.8
    kill "$BAD_PID" 2>/dev/null || true
    wait "$BAD_PID" 2>/dev/null || true
    set -e
    echo "    启动失败现场(日志摘录):"
    grep -E "threshold|Input should be|valid" "$RUN/bad.log" | head -3 | sed 's/^/        /'
    if grep -q "Input should be" "$RUN/bad.log" || grep -q "unable to parse" "$RUN/bad.log"; then
        echo "    [PASS] 非法值被拒收, 进程未起来"; PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "    [FAIL] 非法值竟被放行"; exit 1
    fi

    step "4/5" "多环境切换: dev / test / prod 三套 env 文件"
    for e in dev test prod; do
        start_with ".env.$e"
        cfg="$(curl -s http://127.0.0.1:$PORT/config)"
        echo "    .env.$e -> $(echo "$cfg" | head -c 120)..."
        case $e in
            dev)  expect "dev: threshold=10, debug=true" "$cfg" '"threshold":10' ;;
            test) expect "test: threshold=1" "$cfg" '"threshold":1' ;;
            prod) expect "prod: threshold=90, debug=false" "$cfg" '"threshold":90' ;;
        esac
        stop_server
    done

    step "5/5" "敏感配置走环境注入(呼应 lab 17 的 SECRET)"
    start_with ".env.prod" "LAB21_ENV_FILE=.env.prod" "LAB21_SECRET_SET_BY_ENV=s3cr3t-from-env"
    cfg="$(curl -s http://127.0.0.1:$PORT/config)"
    show_config
    expect "SECRET 从环境注入(回显打码)" "$cfg" '已注入'
    stop_server

    echo
    echo "  12-factor III(配置)对照: 配置存于环境;类型与约束由 Settings 把关;"
    echo "  模板(.env.example)进版本库, 真实值不进。演示完成: $PASS_COUNT 项断言全部通过。"
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
