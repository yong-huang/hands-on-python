"""
流复制与故障切换 —— hands-on-python 第五系列（数据库）实验 15
核心要点: 流复制(物理)、一主一从、只读实例(25006)、pg_promote 手动切换、
          RTO/RPO 概念

前置: ./stream_replication.sh start 已拉起主库(端口 55442)并建复制角色
生命周期(由 shell 编排; 从库容器由本脚本经 basebackup -R 建好后拉起):
  standby   pg_basebackup -R 生成从库数据目录 -> 拉起从库容器(端口 55443)
  lag       主库写入, 轮询从库可见, 实测延迟毫秒(断言 <=1000ms)
  readonly  从库写操作被拒(SQLSTATE 25006)
  promote   pg_promote 后从库转新主, 可写断言; 输出演练时间线
运行: ../.venv/bin/python stream_replication.py   (由 ./stream_replication.sh 调用)
"""

import os
import subprocess
import sys
import time

import psycopg
from psycopg import errors as pgerr

PORT_P = os.environ.get("LAB15_PORT_P", "55442")
PORT_S = os.environ.get("LAB15_PORT_S", "55443")
PRIMARY = dict(host="127.0.0.1", port=PORT_P, dbname="lab",
               user="postgres", password="lab")
STANDBY = dict(host="127.0.0.1", port=PORT_S, dbname="lab",
               user="postgres", password="lab")
BK = "/tmp/lab15_stdby"

PASS_COUNT = 0
TIMELINE = []


def ok(label, cond, detail=""):
    global PASS_COUNT
    if not cond:
        print(f"  [FAIL] {label} {detail}")
        raise AssertionError(label)
    PASS_COUNT += 1
    print(f"  [PASS] {label}")


def step(name, desc):
    print(f"\n=====> [{name}] {desc}")


def log(event):
    ts = time.strftime("%H:%M:%S")
    TIMELINE.append(f"    [{ts}] {event}")
    print(f"    [{ts}] {event}")


def connect(info, retries=60, delay=1.0):
    last = None
    for _ in range(retries):
        try:
            return psycopg.connect(**info)
        except psycopg.OperationalError as err:
            last = err
            time.sleep(delay)
    raise SystemExit(f"连不上(已重试 {retries} 次): {last}")


def docker_exec(container, sql):
    return subprocess.run(
        ["docker", "exec", container, "psql", "-U", "postgres", "-c", sql],
        capture_output=True, text=True)


# ============================================================
# 1. standby — basebackup -R 建从库
# ============================================================

def do_standby():
    step("standby", "pg_basebackup -R 建从库数据目录, 拉起从库容器")
    primary = connect(PRIMARY)
    primary.execute("""CREATE TABLE IF NOT EXISTS sales
                       (id INTEGER PRIMARY KEY, note TEXT NOT NULL)""")
    primary.commit()
    subprocess.run(["docker", "exec", "lab15-pg-primary", "sh", "-c",
                    "rm -rf /tmp/sb && pg_basebackup -U replicator "
                    "-h 127.0.0.1 -D /tmp/sb -Fp -Xs -R -P"],
                   check=True, capture_output=True)
    # 容器内写好的从库目录拷到宿主机(不能 exec 停止的容器, 也不能 rm 挂载点)
    subprocess.run(["docker", "cp", "lab15-pg-primary:/tmp/sb/.",
                    f"{BK}/standby/"], check=True)
    # basebackup -R 写的 primary_conninfo 指向 127.0.0.1, 从库容器里要指向宿主机
    host_dir = f"{BK}/standby"
    auto_path = f"{host_dir}/postgresql.auto.conf"
    auto = open(auto_path).read()
    auto = auto.replace("host=127.0.0.1", "host=host.docker.internal")
    auto = auto.replace("port=5432", f"port={PORT_P}")   # conninfo 里 port 也是容器内的
    auto = auto.replace("user=replicator", "user=replicator password=rep")  # 本地 trust 无密码, 远程要带
    open(auto_path, "w").write(auto)
    ok("基础备份含 standby.signal",
       os.path.exists(f"{host_dir}/standby.signal"))

    subprocess.run(["docker", "rm", "-f", "lab15-pg-standby"],
                   capture_output=True)
    subprocess.run(["docker", "run", "-d", "--name", "lab15-pg-standby",
                    "-v", f"{host_dir}:/stdby", "-e", "PGDATA=/stdby",
                    "-p", f"{PORT_S}:5432", "postgres:16-alpine"],
                   check=True, capture_output=True)
    conn = connect(STANDBY)
    in_rec = conn.execute("SELECT pg_is_in_recovery()").fetchone()[0]
    conn.close()
    print(f"    从库就绪: pg_is_in_recovery = {in_rec}")
    ok("从库处于恢复态(流复制从库)", in_rec is True)
    log("从库上线, 持续接收主库 WAL")


# ============================================================
# 2. lag — 主写从读延迟实测
# ============================================================

def do_lag():
    step("lag", "主库写入 3 条, 从库轮询可见, 实测延迟毫秒")
    p = connect(PRIMARY)
    s = connect(STANDBY)
    p.execute("DELETE FROM sales WHERE id >= 1000")
    p.commit()
    lags = []
    for i in range(3):
        marker = f"wave-{i}-{time.time_ns()}"
        t0 = time.perf_counter()
        p.execute("INSERT INTO sales (id, note) VALUES (%s, %s)",
                  (1000 + i, marker))
        p.commit()
        while True:
            row = s.execute(
                "SELECT note FROM sales WHERE note = %s", (marker,)).fetchone()
            if row:
                break
            if time.perf_counter() - t0 > 5:
                raise AssertionError(f"5 秒未见复制: {marker}")
            time.sleep(0.005)
        lag_ms = (time.perf_counter() - t0) * 1000
        lags.append(lag_ms)
        print(f"    第 {i + 1} 条: 延迟 {lag_ms:.1f} ms")
    print(f"    三次延迟: {[f'{l:.0f}ms' for l in lags]}, "
          f"最大 {max(lags):.0f} ms")
    ok(f"复制延迟 <= 1000ms(实际最大 {max(lags):.0f}ms)", max(lags) <= 1000)
    p.close()
    s.close()
    log(f"延迟实测完成, 最大 {max(lags):.0f} ms")


# ============================================================
# 3. readonly — 从库写被拒 25006
# ============================================================

def do_readonly():
    step("readonly", "从库只读: INSERT 应被拒(SQLSTATE 25006)")
    s = connect(STANDBY)
    err = None
    try:
        s.execute("INSERT INTO sales (id, note) VALUES (9999, 'nope')")
        s.commit()
    except pgerr.ReadOnlySqlTransaction as e:
        err = e
    got = getattr(err, "sqlstate", None)
    print(f"    从库写入收到: {type(err).__name__} sqlstate={got}")
    ok(f"从库写被拒(sqlstate={got}, 期待 25006)", got == "25006")
    s.close()


# ============================================================
# 4. promote — 手动切换
# ============================================================

def do_promote():
    step("promote", "pg_promote 从库转新主: 可写断言 + 演练时间线")
    r = docker_exec("lab15-pg-standby", "SELECT pg_promote()")
    ok("pg_promote 返回成功", r.returncode == 0 and "t" in r.stdout)
    for _ in range(30):
        s = connect(STANDBY)
        in_rec = s.execute("SELECT pg_is_in_recovery()").fetchone()[0]
        if not in_rec:
            break
        s.close()
        time.sleep(0.5)
    print(f"    promote 后: pg_is_in_recovery = {in_rec}")
    ok("从库已脱离恢复态(新主)", in_rec is False)

    s.execute("INSERT INTO sales (id, note) VALUES (20000, 'written-on-new-primary')")
    s.commit()
    n = s.execute(
        "SELECT COUNT(*) FROM sales WHERE note = 'written-on-new-primary'"
    ).fetchone()[0]
    print(f"    新主可写: 写入并读回 {n} 行")
    ok("新主可写断言", n == 1)
    s.close()
    log("promote 完成, 新主接管写入; 旧主容器弃用(生产需重建或回追)")

    print("\n==== 故障切换演练时间线 ====")
    for line in TIMELINE:
        print(line)


# ============================================================
# main
# ============================================================

def main():
    print(f"psycopg {psycopg.__version__}")
    do_standby()
    do_lag()
    do_readonly()
    do_promote()
    print(f"\n{'=' * 60}")
    print(f"==== 实验 15 · stream_replication 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
