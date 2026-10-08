#!/usr/bin/env bash
# 实验 11 · 锁与死锁诊断 —— 容器生命周期 + 死锁/并发/阻塞链实测
# 用法: ./locks_deadlock.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

CONTAINER=lab11-pg
PORT=55437
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 postgres:16-alpine (端口 ${PORT}, --rm 即抛即弃)"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true   # 可重入: 清掉同名残留
    docker run -d --rm --name "$CONTAINER" \
        -e POSTGRES_PASSWORD=lab -e POSTGRES_DB=lab \
        -p "${PORT}:5432" postgres:16-alpine
    for _ in $(seq 1 60); do
        if docker exec "$CONTAINER" pg_isready -q -U postgres 2>/dev/null; then
            break
        fi
        sleep 1
    done
    for _ in $(seq 1 10); do
        if out=$(docker exec "$CONTAINER" pg_isready -U postgres 2>&1); then
            echo "$out"; break
        fi
        sleep 2
    done
}

do_demo() {
    step "demo" "死锁 5 连 -> FOR UPDATE 防超卖 -> SKIP LOCKED 队列 -> 阻塞链诊断"
    "$PY" locks_deadlock.py
}

do_clean() {
    step "clean" "停容器 (--rm 回收)"
    docker stop "$CONTAINER"
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
