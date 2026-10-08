#!/usr/bin/env bash
# 实验 27 · 数据库巡检与压测报告 —— 全线能力收拢为一键巡检 + 可复跑报告
# 用法: ./db_inspection_report.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

PG=lab27-pg
REDIS=lab27-redis
PORT_P=55461
PORT_R=55462
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 PG (${PORT_P}) + Redis (${PORT_R})"
    docker rm -f "$PG" "$REDIS" >/dev/null 2>&1 || true
    docker run -d --rm --name "$PG" \
        -e POSTGRES_PASSWORD=lab -e POSTGRES_DB=lab -p "${PORT_P}:5432" \
        postgres:16-alpine
    docker run -d --rm --name "$REDIS" -p "${PORT_R}:6379" redis:7-alpine
    for _ in $(seq 1 60); do
        if "$PY" -c "
import psycopg, redis
psycopg.connect(host='127.0.0.1', port=${PORT_P}, dbname='lab',
                user='postgres', password='lab', connect_timeout=2).close()
redis.Redis(host='127.0.0.1', port=${PORT_R}).ping()" 2>/dev/null; then
            echo "双库就绪"; break
        fi
        sleep 1
    done
}

do_demo() {
    step "demo" "种子 -> pgbench 压测 -> 巡检指标 -> 优化对比 -> 生成报告"
    "$PY" db_inspection_report.py
}

do_clean() {
    step "clean" "停两容器, 删报告"
    docker stop "$PG" "$REDIS"
    rm -f inspection_report.md
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
