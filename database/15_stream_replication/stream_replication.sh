#!/usr/bin/env bash
# 实验 15 · 流复制与故障切换 —— 主从两容器 + promote 演练
# 用法: ./stream_replication.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

PRIMARY=lab15-pg-primary
STANDBY=lab15-pg-standby
PORT_P=55442
PORT_S=55443
PY=../.venv/bin/python
BK=/tmp/lab15_stdby

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起主库 (端口 ${PORT_P})"
    docker rm -f "$PRIMARY" "$STANDBY" >/dev/null 2>&1 || true
    rm -rf "$BK" && mkdir -p "$BK/standby" && chmod 777 "$BK/standby"
    docker run -d --name "$PRIMARY" \
        -e POSTGRES_PASSWORD=lab -e POSTGRES_DB=lab \
        -v "$BK/standby:/sb" \
        -p "${PORT_P}:5432" postgres:16-alpine
    for _ in $(seq 1 60); do
        docker exec "$PRIMARY" pg_isready -q -U postgres 2>/dev/null && break
        sleep 1
    done
    docker exec "$PRIMARY" sh -c \
        "echo 'host replication replicator 0.0.0.0/0 scram-sha-256' >> \"\$PGDATA/pg_hba.conf\""
    docker exec "$PRIMARY" psql -U postgres -c \
        "CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'rep'; SELECT pg_reload_conf()"
}

do_demo() {
    step "demo" "basebackup -R 建从库 -> 延迟实测 -> 25006 -> promote 演练"
    "$PY" stream_replication.py
}

do_clean() {
    step "clean" "删除主从容器与临时目录"
    docker rm -f "$PRIMARY" "$STANDBY"
    rm -rf "$BK"
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
