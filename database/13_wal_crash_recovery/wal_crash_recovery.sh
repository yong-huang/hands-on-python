#!/usr/bin/env bash
# 实验 13 · WAL 与崩溃恢复 —— 容器生命周期 + 断电实测
# 注意: 本实验容器不用 --rm(kill 后要重启同一容器), clean 时才 rm -f
# 用法: ./wal_crash_recovery.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

CONTAINER=lab13-pg
PORT=55439
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 postgres:16-alpine (端口 ${PORT}, 不带 --rm: 要 kill 后重启)"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker run -d --name "$CONTAINER" \
        -e POSTGRES_PASSWORD=lab -e POSTGRES_DB=lab \
        -p "${PORT}:5432" postgres:16-alpine
    for _ in $(seq 1 60); do
        if docker exec "$CONTAINER" pg_isready -q -U postgres 2>/dev/null; then break; fi
        sleep 1
    done
    for _ in $(seq 1 10); do
        if out=$(docker exec "$CONTAINER" pg_isready -U postgres 2>&1); then echo "$out"; break; fi
        sleep 2
    done
}

do_demo() {
    step "demo" "持续写入 -> docker kill 断电 -> 重启恢复校验 -> TPS 对比"
    "$PY" wal_crash_recovery.py
}

do_clean() {
    step "clean" "删除容器(数据随容器走)"
    docker rm -f "$CONTAINER"
}

main() {
    case "${1:-all}" in
        start) do_start ;;
        demo)  do_demo ;;
        clean) do_clean ;;
        all)   do_start; do_demo; do_clean ;;
        *) echo "可用: start | demo | clean | all" >&2; exit 1 ;;
    esac
}
main "$@"
