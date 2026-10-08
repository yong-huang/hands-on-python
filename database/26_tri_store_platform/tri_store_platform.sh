#!/usr/bin/env bash
# 实验 26 · 三库协作内容平台 —— PG + Redis + Mongo 各司其职 + 降级演练
# 用法: ./tri_store_platform.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

PG=lab26-pg
REDIS=lab26-redis
MONGO=lab26-mongo
PORT_P=55458
PORT_R=55459
PORT_M=55460
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起三库容器 (PG:${PORT_P} Redis:${PORT_R} Mongo:${PORT_M})"
    docker rm -f "$PG" "$REDIS" "$MONGO" >/dev/null 2>&1 || true
    docker run -d --rm --name "$PG" \
        -e POSTGRES_PASSWORD=lab -e POSTGRES_DB=lab -p "${PORT_P}:5432" \
        postgres:16-alpine
    docker run -d --rm --name "$REDIS" -p "${PORT_R}:6379" redis:7-alpine
    docker run -d --rm --name "$MONGO" -p "${PORT_M}:27017" mongo:7
    for _ in $(seq 1 60); do
        if "$PY" -c "
import psycopg, redis, pymongo
psycopg.connect(host='127.0.0.1', port=${PORT_P}, dbname='lab',
                user='postgres', password='lab', connect_timeout=2).close()
redis.Redis(host='127.0.0.1', port=${PORT_R}).ping()
pymongo.MongoClient('127.0.0.1', ${PORT_M},
                    serverSelectionTimeoutMS=2000).admin.command('ping')" 2>/dev/null; then
            echo "三库就绪"; break
        fi
        sleep 1
    done
}

do_demo() {
    step "demo" "发布→浏览→评论全链路 + kill Redis 降级演练"
    "$PY" tri_store_platform.py
}

do_clean() {
    step "clean" "停三容器 (--rm 回收)"
    docker stop "$PG" "$REDIS" "$MONGO"
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
