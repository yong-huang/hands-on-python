#!/usr/bin/env bash
# 实验 19 · 缓存一致性 —— 双容器 + 不一致窗口实测
# 用法: ./cache_consistency.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

REDIS=lab19-redis
PG=lab19-pg
PORT_R=55450
PORT_P=55451
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 redis:7-alpine (${PORT_R}) 与 postgres:16-alpine (${PORT_P})"
    docker rm -f "$REDIS" "$PG" >/dev/null 2>&1 || true
    docker run -d --rm --name "$REDIS" -p "${PORT_R}:6379" redis:7-alpine
    docker run -d --rm --name "$PG" \
        -e POSTGRES_PASSWORD=lab -e POSTGRES_DB=lab -p "${PORT_P}:5432" \
        postgres:16-alpine
    for _ in $(seq 1 60); do
        if "$PY" -c "
import redis, psycopg
redis.Redis(host='127.0.0.1', port=${PORT_R}).ping()
psycopg.connect(host='127.0.0.1', port=${PORT_P}, dbname='lab',
                user='postgres', password='lab').close()" 2>/dev/null; then
            echo "双容器就绪"; break
        fi
        sleep 1
    done
}

do_demo() {
    step "demo" "先删缓存不一致复现 -> 延迟双删 -> 对账归零"
    "$PY" cache_consistency.py
}

do_clean() {
    step "clean" "停两容器 (--rm 回收)"
    docker stop "$REDIS" "$PG"
}

main() {
    case "${1:-all}" in
        start) do_start ;;
        demo)  do_demo ;;
        clean) do_clean ;;
        all)   do_start; rc=0; do_demo || rc=$?; do_clean; exit $rc ;;
        *) echo "可用: start | demo | clean | all" >&2; exit 1 ;;
    esac
}
main "$@"
