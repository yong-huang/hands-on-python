#!/usr/bin/env bash
# 实验 17 · Redis 五大结构与 TTL —— 容器生命周期 + 五场景断言
# 用法: ./redis_datastructures.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

CONTAINER=lab17-redis
PORT=55446
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 redis:7-alpine (端口 ${PORT}, --rm 即抛即弃)"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker run -d --rm --name "$CONTAINER" -p "${PORT}:6379" redis:7-alpine
    for _ in $(seq 1 30); do
        if "$PY" -c "
import redis
redis.Redis(host='127.0.0.1', port=${PORT}).ping()" 2>/dev/null; then
            echo "redis 就绪"; break
        fi
        sleep 0.5
    done
}

do_demo() {
    step "demo" "排行榜/购物车/共同关注/原子计数器/TTL 过期 五场景断言"
    "$PY" redis_datastructures.py
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
