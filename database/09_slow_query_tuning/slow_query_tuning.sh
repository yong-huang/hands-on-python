#!/usr/bin/env bash
# 实验 09 · 慢查询诊断与重写 —— 容器生命周期 + pg_stat_statements 实测
# 用法: ./slow_query_tuning.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

CONTAINER=lab09-pg
PORT=55435
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 postgres:16-alpine (端口 ${PORT}, preload pg_stat_statements)"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true   # 可重入: 清掉同名残留
    docker run -d --rm --name "$CONTAINER" \
        -e POSTGRES_PASSWORD=lab -e POSTGRES_DB=lab \
        -p "${PORT}:5432" \
        postgres:16-alpine -c shared_preload_libraries=pg_stat_statements
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
    step "demo" "20 万行种子 -> 三类慢查询 -> Top 命中断言 -> keyset/JOIN 重写"
    "$PY" slow_query_tuning.py
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
