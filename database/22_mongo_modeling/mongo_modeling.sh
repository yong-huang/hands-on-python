#!/usr/bin/env bash
# 实验 22 · MongoDB 文档建模与 CRUD —— 容器生命周期 + 内嵌 vs 引用实测
# 用法: ./mongo_modeling.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

CONTAINER=lab22-mongo
PORT=55454
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 mongo:7 (端口 ${PORT}, --rm 即抛即弃)"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker run -d --rm --name "$CONTAINER" -p "${PORT}:27017" mongo:7
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
    step "demo" "同一博客需求两套建模: 内嵌 1 次查询 vs 引用 N+1"
    "$PY" mongo_modeling.py
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
        all)   do_start; rc=0; do_demo || rc=$?; do_clean; exit $rc ;;
        *) echo "可用: start | demo | clean | all" >&2; exit 1 ;;
    esac
}
main "$@"
