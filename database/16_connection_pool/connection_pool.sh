#!/usr/bin/env bash
# 实验 16 · 连接池与连接风暴 —— 直连 vs PgBouncer vs 客户端池
# 用法: ./connection_pool.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

PRIMARY=lab16-pg
BOUNCER=lab16-pgbouncer
PORT_P=55444
PORT_B=55445
PY=../.venv/bin/python

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 postgres + pgbouncer (端口 ${PORT_P}/${PORT_B})"
    docker rm -f "$PRIMARY" "$BOUNCER" >/dev/null 2>&1 || true
    docker run -d --name "$PRIMARY" \
        -e POSTGRES_PASSWORD=lab -e POSTGRES_DB=lab \
        -p "${PORT_P}:5432" postgres:16-alpine
    for _ in $(seq 1 60); do
        docker exec "$PRIMARY" pg_isready -q -U postgres 2>/dev/null && break
        sleep 1
    done
    # pgbouncer 的 userlist 需与服务端密码形态一致(SCRAM 场景喂 SCRAM 哈希)
    SCRAM=$(docker exec "$PRIMARY" psql -U postgres -tAc \
        "SELECT rolpassword FROM pg_authid WHERE rolname='postgres'")
    docker run -d --name "$BOUNCER" \
        -e DB_HOST=host.docker.internal -e DB_PORT=${PORT_P} \
        -e DB_NAME=lab -e DB_USER=postgres -e "DB_PASSWORD=${SCRAM}" \
        -e AUTH_TYPE=scram-sha-256 \
        -e POOL_MODE=transaction -e MAX_CLIENT_CONN=500 \
        -e DEFAULT_POOL_SIZE=20 \
        -p "${PORT_B}:5432" edoburu/pgbouncer:latest
    for _ in $(seq 1 30); do
        if "$PY" -c "
import psycopg
psycopg.connect(host='127.0.0.1', port=${PORT_B}, dbname='lab',
                user='postgres', password='lab').close()" 2>/dev/null; then
            echo "pgbouncer 就绪"; break
        fi
        sleep 1
    done
}

do_demo() {
    step "demo" "直连风暴 -> PgBouncer 池化 -> pg_stat_activity 峰值对账"
    "$PY" connection_pool.py
}

do_clean() {
    step "clean" "删除两容器"
    docker rm -f "$PRIMARY" "$BOUNCER"
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
