#!/usr/bin/env bash
# 实验 14 · 备份与时间点恢复(PITR) —— 容器生命周期 + 误删找回实测
# 用法: ./backup_pitr.sh start | demo | clean | all(默认)
set -euo pipefail
cd "$(dirname "$0")"

CONTAINER=lab14-pg
PORT=55440
PY=../.venv/bin/python
BK=/tmp/lab14_backup   # 基础备份与归档 WAL 都放宿主机临时目录

step() { echo; echo "=====> [$1] $2"; }

do_start() {
    step "start" "拉起 postgres:16-alpine (端口 ${PORT}, 开 WAL 归档, 无 --rm)"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    sudo rm -rf "$BK" 2>/dev/null || rm -rf "$BK"
    mkdir -p "$BK/base" "$BK/archive" && chmod 777 "$BK/base" "$BK/archive"
    docker run -d --name "$CONTAINER" \
        -e POSTGRES_PASSWORD=lab -e POSTGRES_DB=lab \
        -v "$BK:/bk" \
        -p "${PORT}:5432" postgres:16-alpine \
        -c archive_mode=on \
        -c "archive_command=test ! -f /bk/archive/%f && cp %p /bk/archive/%f" \
        -c archive_timeout=2
    for _ in $(seq 1 60); do
        if docker exec "$CONTAINER" pg_isready -q -U postgres 2>/dev/null; then break; fi
        sleep 1
    done
    for _ in $(seq 1 10); do
        if out=$(docker exec "$CONTAINER" pg_isready -U postgres 2>&1); then echo "$out"; break; fi
        sleep 2
    done
}

do_demo() {
    step "demo" "pg_dump 对账 -> basebackup -> 误删 -> 基准+WAL 重放找回"
    "$PY" backup_pitr.py
}

do_clean() {
    step "clean" "删除两个容器与临时备份目录"
    docker rm -f "$CONTAINER" lab14-restore
    rm -rf "$BK"
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
