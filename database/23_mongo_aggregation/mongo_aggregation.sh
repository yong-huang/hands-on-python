#!/usr/bin/env bash
# 实验 23 · 聚合管道 —— SQL 与聚合管道结果逐行对齐
# 用法: ./mongo_aggregation.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

MONGO=lab23-mongo
SQLITE_DB=/tmp/lab23_sales.db
PORT=55455
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 mongo:7 (端口 ${PORT}, --rm 即抛即弃); SQLite 数据临时文件"
    docker rm -f "$MONGO" >/dev/null 2>&1 || true
    rm -f "$SQLITE_DB"
    docker run -d --rm --name "$MONGO" -p "${PORT}:27017" mongo:7
    for _ in $(seq 1 30); do
        if "$PY" -c "
import pymongo
pymongo.MongoClient('127.0.0.1', ${PORT},
                    serverSelectionTimeoutMS=2000).admin.command('ping')" 2>/dev/null; then
            echo "mongo 就绪"; break
        fi
        sleep 1
    done
}

do_demo() {
    step "demo" "同一销售报表: SQL 版与聚合管道版逐行 diff"
    "$PY" mongo_aggregation.py
}

do_clean() {
    step "clean" "停容器, 删临时库"
    docker stop "$MONGO"
    rm -f "$SQLITE_DB"
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
