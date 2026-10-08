"""
备份与时间点恢复(PITR) —— hands-on-python 第五系列（数据库）实验 14
核心要点: pg_dump/pg_restore 逻辑备份、pg_basebackup 物理基础备份、
          WAL 归档(archive_command)、恢复到误删前一秒的时间点恢复

前置: ./backup_pitr.sh start 已拉起容器(端口 55440, WAL 归档到 /bk/archive)
生命周期(由 shell 编排; PITR 恢复靠停主库、还原基准、配 restore_command、
pg_ctl promote, 全部在容器内完成):
  dump      pg_dump 逻辑备份 -> 重建库 -> 行数对账
  pitr      basebackup 基础备份 -> 写入带时间戳的行 -> 误删全部 ->
            基准 + WAL 重放恢复到误删前 -> 误删行 100% 找回
运行: ../.venv/bin/python backup_pitr.py   (由 ./backup_pitr.sh 调用)
"""

import os
import subprocess
import sys
import time

import psycopg

PORT = os.environ.get("LAB14_PORT", "55440")
RESTORE_PORT = os.environ.get("LAB14_RESTORE_PORT", "55441")
CONNINFO = dict(host="127.0.0.1", port=PORT, dbname="lab",
                user="postgres", password="lab")
CONTAINER = "lab14-pg"
BK = "/tmp/lab14_backup"
DUMP = f"{BK}/logic.dump"

PASS_COUNT = 0


def ok(label, cond, detail=""):
    global PASS_COUNT
    if not cond:
        print(f"  [FAIL] {label} {detail}")
        raise AssertionError(label)
    PASS_COUNT += 1
    print(f"  [PASS] {label}")


def step(name, desc):
    print(f"\n=====> [{name}] {desc}")


def connect_pg(dbname="lab", retries=60, delay=1.0, restore=False):
    last = None
    for _ in range(retries):
        try:
            port = RESTORE_PORT if restore else PORT
            return psycopg.connect(**{**CONNINFO, "dbname": dbname, "port": port})
        except psycopg.OperationalError as err:
            last = err
            time.sleep(delay)
    raise SystemExit(f"连不上 {dbname}(已重试 {retries} 次): {last}")


def docker(*args, check=True):
    return subprocess.run(["docker", *args], capture_output=True, text=True,
                          check=check)


def docker_exec(*args, check=True):
    return subprocess.run(["docker", "exec", CONTAINER, *args],
                          capture_output=True, text=True, check=check)


def wait_ready(dbname="lab", timeout=90, restore=False):
    for _ in range(timeout):
        try:
            with connect_pg(dbname, restore=restore):
                return True
        except SystemExit:
            pass
        time.sleep(1)
    return False


def count_rows(conn, table):
    return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


# ============================================================
# 1. dump — 逻辑备份与对账
# ============================================================

def do_dump(cur):
    step("dump", "建三表种子 -> pg_dump 逻辑备份 -> 重建库行数对账")
    cur.execute("""
        CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE items (id INTEGER PRIMARY KEY, owner_id INTEGER,
                            price NUMERIC(10, 2) NOT NULL);
        INSERT INTO users SELECT g, 'user-' || g FROM generate_series(1, 100) g;
        INSERT INTO items SELECT g, g % 100 + 1,
               round((g % 9990 + 10)::numeric / 100, 2)
        FROM generate_series(1, 1000) g;
    """)
    cur.connection.commit()
    src = (count_rows(cur, "users"), count_rows(cur, "items"))
    print(f"    源库: users {src[0]} 行, items {src[1]} 行")

    with open(DUMP, "wb") as f:
        subprocess.run(["docker", "exec", CONTAINER,
                        "pg_dump", "-U", "postgres", "lab"],
                       stdout=f, check=True)
    print(f"    pg_dump 完成: {os.path.getsize(DUMP):,} bytes")

    cur.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public")
    cur.connection.commit()
    with open(DUMP, "rb") as f:
        subprocess.run(["docker", "exec", "-i", CONTAINER,
                        "psql", "-U", "postgres", "-q", "-d", "lab"],
                       stdin=f, check=True)
    dst = (count_rows(cur, "users"), count_rows(cur, "items"))
    print(f"    重建库: users {dst[0]} 行, items {dst[1]} 行")
    ok(f"逻辑备份恢复后行数对账一致 {dst}", src == dst)


# ============================================================
# 2. pitr — 物理基础备份 + 误删 + WAL 重放找回
# ============================================================

def do_pitr(cur):
    conn = connect_pg()
    cur = conn.cursor()
    step("pitr", "basebackup 物理基础备份(误删前)")
    r = docker_exec("rm", "-rf", "/bk/base/*", check=False)
    r = docker_exec("pg_basebackup", "-U", "postgres", "-D", "/bk/base",
                    "-Fp", "-Xs", "-P")
    print(f"    pg_basebackup 完成: {r.stdout.strip() or '(无输出)'}")
    ok("基础备份已落盘 /bk/base", docker_exec(
        "test", "-f", "/bk/base/PG_VERSION", check=False).returncode == 0)

    step("pitr-write", "写入 500 行带序号的重要数据, 等 WAL 归档落袋")
    cur.execute("""
        CREATE TABLE treasure (id INTEGER PRIMARY KEY, note TEXT NOT NULL);
        INSERT INTO treasure SELECT g, 'treasure-' || g
        FROM generate_series(1, 500) g;
    """)
    cur.connection.commit()
    # archive_timeout=2s: 强制每 2 秒切一段 WAL 进归档; 再保险强制切换一次
    docker_exec("psql", "-U", "postgres", "-d", "lab", "-c",
                "SELECT pg_switch_wal()", check=False)
    time.sleep(4)
    n_arch = len(os.listdir(f"{BK}/archive"))
    print(f"    treasure 500 行已提交; 归档目录 {n_arch} 个 WAL 段")
    ok("WAL 归档已落袋", n_arch > 0)

    step("pitr-loss", "误删: TRUNCATE treasure 且再提交几笔新写入")
    lost_at = time.time()   # 目标时间: 这一刻之前
    cur.execute("TRUNCATE treasure")
    cur.execute("""
        INSERT INTO items SELECT g + 100000, 1, 1.00
        FROM generate_series(1, 50) g
    """)
    cur.connection.commit()
    n_after_loss = count_rows(cur, "treasure")
    print(f"    误删后 treasure 剩 {n_after_loss} 行(目标: 恢复到误删前)")
    ok("误删已发生(0 行, 恢复才有意义)", n_after_loss == 0)

    step("pitr-restore", "独立恢复容器: 还原基准 + recovery.signal + 定时恢复")
    docker("stop", CONTAINER)   # 主库下线, 归档 WAL 已在宿主机 /bk/archive

    ts_target = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(lost_at - 1))
    subprocess.run(["docker", "rm", "-f", "lab14-restore"], capture_output=True)
    sh = f"""
rm -rf /var/lib/postgresql/data/*
cp -a /bk/base/. /var/lib/postgresql/data/
touch /var/lib/postgresql/data/recovery.signal
cat > /var/lib/postgresql/data/postgresql.auto.conf <<CFG
restore_command = 'cp /bk/archive/%f %p'
recovery_target_time = '{ts_target}'
recovery_target_action = promote
CFG
exec docker-entrypoint.sh postgres
"""
    r = subprocess.run(
        ["docker", "run", "-d", "--name", "lab14-restore",
         "-v", f"{BK}:/bk", "-p", "55441:5432",
         "--entrypoint", "sh", "postgres:16-alpine", "-c", sh],
        capture_output=True, text=True)
    if r.returncode != 0:
        print("    恢复容器启动失败:", r.stderr.strip()[:300])
        raise AssertionError("restore container")
    ok("恢复容器已启动(基准 + recovery.signal + 目标时间)", True)
    ok("等待定时恢复与 promote 完成", wait_ready("lab", restore=True))

    conn = connect_pg("lab", restore=True)
    n_recovered = count_rows(conn, "treasure")
    n_items = count_rows(conn, "items")
    in_recovery = conn.execute("SELECT pg_is_in_recovery()").fetchone()[0]
    print(f"    恢复完成: in_recovery={in_recovery}, treasure {n_recovered} 行, "
          f"items {n_items} 行")
    ok(f"误删的 500 行 treasure 100% 找回({n_recovered}/500)", n_recovered == 500)
    ok("误删后的 50 行新写入被回退(时间点之后的不存在)", n_items == 1000)
    conn.close()


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    with connect_pg() as conn, conn.cursor() as cur:
        do_dump(cur)
    # 主库在 PITR 末尾被刻意下线, 后续全在恢复容器(55441)上进行
    do_pitr(None)
    print(f"\n{'=' * 60}")
    print(f"==== 实验 14 · backup_pitr 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
