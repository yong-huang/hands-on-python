"""
事务与 SAVEPOINT —— hands-on-python 第五系列（数据库）实验 05
核心要点: BEGIN/COMMIT/ROLLBACK、SAVEPOINT 部分回滚、崩溃原子性(kill -9)、
          未提交不可见、sqlite3 隐式事务陷阱

生命周期:
  create     银行账户表(余额 CHECK >= 0)
  rollback   显式 BEGIN 两步转账后 ROLLBACK, 分文不动
  commit     同样的两步 COMMIT, 转账生效且总额守恒
  savepoint  事务内写错金额, ROLLBACK TO 存档点重写, 外层照常提交
  kill9      子进程两步转账未提交时 kill -9, 重开库验证分文未动
  isolation  未提交对另一连接不可见 + 隐式事务陷阱(显式 BEGIN 撞车)
  clean      删库文件, 无残留; --keep 保留 bank.db 供 CLI 查看

运行:
  python3 transaction_savepoint.py          # 全流程断言, [PASS], 退出码 0
  python3 transaction_savepoint.py --keep   # 同上, 保留库文件
"""

import argparse
import os
import signal
import sqlite3
import subprocess
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "bank.db")
SENTINEL = os.path.join(SCRIPT_DIR, ".child_ready")

PASS_COUNT = 0

# 子进程代码: 开事务、两步转账(未提交)、写哨兵文件后挂起等被杀
CHILD_CODE = """
import os, sqlite3, sys, time
conn = sqlite3.connect(sys.argv[1])
conn.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
conn.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
with open(sys.argv[2], "w") as f:
    f.write("ready")
time.sleep(60)
"""


def ok(label, cond, detail=""):
    """断言并把结果打进输出: 通过记 [PASS], 失败抛 AssertionError 中止全流程。"""
    global PASS_COUNT
    if not cond:
        print(f"  [FAIL] {label} {detail}")
        raise AssertionError(label)
    PASS_COUNT += 1
    print(f"  [PASS] {label}")


def step(name, desc):
    print(f"\n=====> [{name}] {desc}")


def balances(conn):
    return tuple(r[0] for r in conn.execute(
        "SELECT balance FROM accounts ORDER BY id"))


def reset(conn):
    conn.execute("UPDATE accounts SET balance = 1000 WHERE id IN (1, 2)")
    conn.commit()


# ============================================================
# 1. create — 账户表
# ============================================================

def do_create(conn):
    step("create", "建账户表, 余额 CHECK >= 0 兜住负数")
    conn.executescript("""
        CREATE TABLE accounts (
            id      INTEGER PRIMARY KEY,
            name    TEXT NOT NULL,
            balance REAL NOT NULL CHECK (balance >= 0)
        );
        INSERT INTO accounts VALUES (1, '阿里', 1000), (2, '小熊', 1000);
    """)
    conn.commit()
    ok(f"两个账户各 1000, 总额 {sum(balances(conn)):.0f}", balances(conn) == (1000.0, 1000.0))


# ============================================================
# 2. rollback — 显式回滚: 两步转账原地蒸发
# ============================================================

def do_rollback(conn):
    step("rollback", "BEGIN 后扣款加款两步都执行了, 但 ROLLBACK 让它们全部作废")
    reset(conn)
    conn.execute("BEGIN")
    conn.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    conn.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    mid = balances(conn)
    conn.execute("ROLLBACK")
    after = balances(conn)
    print(f"    事务内可见 {mid}, ROLLBACK 后 {after}")
    ok("事务内自己看得见改动(900, 1100)", mid == (900.0, 1100.0))
    ok("回滚后分文不动(1000, 1000)", after == (1000.0, 1000.0))


# ============================================================
# 3. commit — 提交: 转账生效且总额守恒
# ============================================================

def do_commit(conn):
    step("commit", "同样两步, 这次 COMMIT 落盘")
    reset(conn)
    conn.execute("BEGIN")
    conn.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    conn.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    conn.commit()
    b = balances(conn)
    print(f"    提交后 {b}, 总额 {sum(b):.0f}")
    ok("转账生效 (900, 1100) 且总额守恒 2000", b == (900.0, 1100.0) and sum(b) == 2000)


# ============================================================
# 4. savepoint — 事务内部分回滚
# ============================================================

def do_savepoint(conn):
    step("savepoint", "事务内写错金额, 回到存档点重写, 外层照常提交")
    reset(conn)
    conn.execute("BEGIN")
    conn.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    conn.execute("SAVEPOINT fix_point")
    conn.execute("UPDATE accounts SET balance = balance + 1000 WHERE id = 2")  # 手滑
    wrong = balances(conn)
    conn.execute("ROLLBACK TO fix_point")     # 撤掉手滑, 存档点之前的扣款保留
    conn.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")   # 正确金额
    conn.commit()
    b = balances(conn)
    print(f"    手滑时 {wrong}, ROLLBACK TO 后重写, 提交后 {b}")
    ok("手滑的 +1000 被存档点回滚吞掉", wrong == (900.0, 2000.0) and b != wrong)
    ok("外层照常提交: (900, 1100) 总额守恒", b == (900.0, 1100.0))


# ============================================================
# 5. kill9 — 崩溃原子性: 未提交事务在 kill -9 后整体消失
# ============================================================

def do_kill9(conn):
    step("kill9", "子进程转账未提交时 kill -9, 重开库验证分文未动")
    conn.close()  # 让出文件锁, 事务舞台完全交给子进程
    reset_conn = sqlite3.connect(DB_PATH)
    reset(reset_conn)
    reset_conn.close()

    with open(SENTINEL, "w") as f:
        f.write("stale")
    os.remove(SENTINEL)
    proc = subprocess.Popen(
        [sys.executable, "-c", CHILD_CODE, DB_PATH, SENTINEL],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(100):  # 等子进程完成两步 UPDATE(最多 10 秒)
        if os.path.exists(SENTINEL):
            break
        time.sleep(0.1)
    ok("子进程已在未提交事务内完成两步 UPDATE(哨兵就位)", os.path.exists(SENTINEL))

    os.kill(proc.pid, signal.SIGKILL)   # 模拟断电: 不给任何清理机会
    proc.wait()
    os.remove(SENTINEL)

    reopened = sqlite3.connect(DB_PATH)  # 重开库: 触发崩溃恢复(回放日志)
    b = balances(reopened)
    print(f"    kill -9 后重开库: {b}")
    ok("未提交的两步转账整体消失, 总额守恒 (1000, 1000)",
       b == (1000.0, 1000.0) and sum(b) == 2000)
    return reopened


# ============================================================
# 6. isolation — 未提交不可见 + 隐式事务陷阱
# ============================================================

def do_isolation(conn):
    step("isolation", "未提交的改动对另一连接不可见; 显式 BEGIN 会撞隐式事务")
    reset(conn)
    conn.execute("UPDATE accounts SET balance = balance + 1 WHERE id = 1")
    other = sqlite3.connect(DB_PATH)
    seen = other.execute(
        "SELECT balance FROM accounts WHERE id = 1").fetchone()[0]
    print(f"    本连接已改 1001 且 in_transaction={conn.in_transaction}, "
          f"另一连接读到 {seen:.0f}")
    ok(f"未提交不可见: 另一连接仍是 {seen:.0f}", seen == 1000.0)
    ok("python 隐式事务已自动开启(in_transaction=True)", conn.in_transaction is True)

    crashed = False
    try:
        conn.execute("BEGIN")
    except sqlite3.OperationalError as err:
        crashed = "within a transaction" in str(err)
    ok("显式 BEGIN 撞上隐式事务被拒(within a transaction)", crashed)

    conn.commit()
    seen2 = other.execute(
        "SELECT balance FROM accounts WHERE id = 1").fetchone()[0]
    other.close()
    print(f"    commit 之后另一连接读到 {seen2:.0f}")
    ok("提交后立即可见(1001)", seen2 == 1001.0)


# ============================================================
# 7. clean — 清理
# ============================================================

def do_clean(conn, keep):
    step("clean", "关闭连接" + (", 保留 bank.db 供 CLI 查看" if keep else ", 删除库文件"))
    conn.close()
    for suffix in ("", "-journal", "-wal", "-shm"):
        path = DB_PATH + suffix
        if not keep and os.path.exists(path):
            os.remove(path)
    if not keep:
        ok("bank.db 及日志文件均无残留", not os.path.exists(DB_PATH))
    else:
        print(f"  [KEEP] {DB_PATH} (自己用 sqlite3 bank.db 看看)")


def main():
    parser = argparse.ArgumentParser(description="实验 05: 事务与 SAVEPOINT")
    parser.add_argument("--keep", action="store_true", help="结束后保留 bank.db")
    keep = parser.parse_args().keep

    for suffix in ("", "-journal", "-wal", "-shm"):  # 重跑前清场保证确定性
        path = DB_PATH + suffix
        if os.path.exists(path):
            os.remove(path)
    conn = sqlite3.connect(DB_PATH)

    do_create(conn)
    do_rollback(conn)
    do_commit(conn)
    do_savepoint(conn)
    conn = do_kill9(conn)
    do_isolation(conn)
    do_clean(conn, keep)

    print(f"\n{'=' * 60}")
    print(f"==== 实验 05 · transaction_savepoint 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
