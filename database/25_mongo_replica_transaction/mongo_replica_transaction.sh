#!/usr/bin/env bash
# 实验 25 · 副本集与多文档事务 —— 单节点副本集 + 跨集合转账
# 用法: ./mongo_replica_transaction.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

CONTAINER=lab25-mongo
PORT=55457
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 mongo:7 单节点副本集 (端口 ${PORT}, --rm)"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker run -d --rm --name "$CONTAINER" \
        -p "${PORT}:27017" \
        mongo:7 mongod --replSet rs0 --bind_ip_all
    for _ in $(seq 1 15); do
        if docker exec "$CONTAINER" mongosh --quiet --eval \
            "try { rs.status().ok } catch(e) { rs.initiate({_id: 'rs0', members: [{_id: 0, host: '127.0.0.1:27017'}]}) }" \
            >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    # 等选主完成
    for _ in $(seq 1 30); do
        if "$PY" -c "
from pymongo import ReadPreference
import pymongo
c = pymongo.MongoClient('127.0.0.1', ${PORT},
                        replicaSet='rs0', serverSelectionTimeoutMS=2000)
c.admin.command('ping')" 2>/dev/null; then
            echo "副本集就绪(rs0 PRIMARY)"; break
        fi
        sleep 1
    done
}

do_demo() {
    step "demo" "跨集合转账事务: abort 全回滚 / commit 双集合一致"
    "$PY" mongo_replica_transaction.py
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
