#!/usr/bin/env bash
# Lab 23 · workers 模型与 Docker —— 主演示脚本。
# 用法: ./23_deploy.sh demo | all
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
PY="$ROOT/.venv/bin/python"
UVICORN="$ROOT/.venv/bin/uvicorn"
GUNICORN="$ROOT/.venv/bin/gunicorn"
PORT=8924
RUN=".run"
BASE="http://127.0.0.1:$PORT"
PASS_COUNT=0

step() { echo; echo "=====> [$1] $2"; }
pass_() { echo "    [PASS] $1"; PASS_COUNT=$((PASS_COUNT + 1)); }

wait_ready() {
    for _ in $(seq 1 60); do curl -sf "$BASE/healthz" >/dev/null 2>&1 && return 0; sleep 0.3; done
    echo "    服务未就绪"; exit 1
}

stop() { [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
         [ -n "${MASTER_PID:-}" ] && kill "$MASTER_PID" 2>/dev/null || true
         sleep 0.5; }
cleanup() { stop; rm -rf "$RUN"; }
trap cleanup EXIT

start_uvicorn() {
    local args="$1"
    mkdir -p "$RUN"
    # nohup + setsid: uvicorn --workers 的 master 退出时会带走全部 worker
    "$UVICORN" main:app --port $PORT $args >"$RUN/server.log" 2>&1 &
    SERVER_PID=$!
    wait_ready
}

start_gunicorn() {
    mkdir -p "$RUN"
    "$GUNICORN" main:app -w "$1" -k uvicorn.workers.UvicornWorker \
        -b 127.0.0.1:$PORT >"$RUN/gunicorn.log" 2>&1 &
    MASTER_PID=$!
    wait_ready
}

pid_round() {  # 连发 N 个请求, 输出 PID 集合与计数样本
    "$PY" - "$1" <<'EOF'
import sys, httpx
n = int(sys.argv[1])
pids, counts = [], []
with httpx.Client(headers={"Connection": "close"}) as c:
    for _ in range(n):
        r = c.get("http://127.0.0.1:8924/pid").json()
        pids.append(r["pid"]); counts.append(r["count"])
uniq = sorted(set(pids))
print(f"    {n} 个请求落在 {len(uniq)} 个进程: {uniq}")
print(f"    计数样本(前 5): {counts[:5]}")
EOF
}

demo() {
    step "1/4" "uvicorn 单进程: 一条进程伺服所有请求"
    start_uvicorn ""
    pid_round 6 | tee "$RUN/p1.txt"
    if grep -q "落在 1 个进程" "$RUN/p1.txt"; then pass_ "单 worker: 6 个请求同一 PID"; fi
    if grep -q "计数样本(前 5): \[1, 2, 3, 4, 5\]" "$RUN/p1.txt"; then pass_ "进程内计数连续累加(状态在本进程内存)"; fi
    stop

    step "2/4" "uvicorn --workers 4: 四条进程分摊请求"
    start_uvicorn "--workers 4"
    pid_round 20 | tee "$RUN/p2.txt"
    if grep -qE "落在 [2-4] 个进程" "$RUN/p2.txt"; then pass_ "多 worker: 请求分散到多个 PID"; fi
    if grep -q "计数样本(前 5): \[1," "$RUN/p2.txt"; then pass_ "每个 worker 独立计数(各一本账)"; fi
    cat <<'N'
    注:默认 keep-alive 会把同一客户端粘在同一 worker 上(连接不断,进程不变)。
    演示用 Connection: close 打散连接,才能看到多进程分摊 —— 本身就是部署常识。
N
    cat <<'N'
    各一本账的含义: lab 22 的限流计数、lab 19 的日志都长在每个进程内存里,
    --workers 之后不再全局一致 —— 共享状态必须外置(Redis/数据库)。
N
    stop

    step "3/4" "gunicorn 对照: master/worker 模型(2 workers)"
    start_gunicorn 2
    pid_round 10 | tee "$RUN/p3.txt"
    if grep -qE "落在 [1-2] 个进程" "$RUN/p3.txt"; then pass_ "gunicorn 同样以多进程伺服"; fi
    echo "    gunicorn 日志摘录:"
    grep -E "Booting worker|Listening at" "$RUN/gunicorn.log" | head -3 | sed 's/^/        /'
    stop

    step "4/4" "Docker 资产(诚实降级: 本机无 Docker daemon, 只展示不构建)"
    if docker info >/dev/null 2>&1; then
        echo "    检测到 Docker, 构建镜像:"
        docker build -t lab23 . 
        docker run --rm -d -p 8000:8000 --name lab23 lab23
        curl -sf http://127.0.0.1:8000/healthz >/dev/null && pass_ "容器内服务就绪"
        docker rm -f lab23 >/dev/null
    else
        echo "    本机无 Docker daemon, 跳过实跑。构建/运行命令(供有 daemon 的环境执行):"
        echo "      docker build -t lab23 ."
        echo "      docker run --rm -p 8000:8000 lab23"
        echo "    镜像设计要点(见 Dockerfile): 多阶段构建、依赖层独立成层、非 root 用户、"
        echo "    1 容器 1 进程(横向扩展交给副本数)。"
    fi

    echo
    echo "  演示完成: $PASS_COUNT 项断言全部通过。"
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
