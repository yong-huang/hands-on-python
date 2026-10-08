"""
窗口函数与 CTE —— hands-on-python 第五系列（数据库）实验 04
核心要点: OVER / PARTITION BY、ROW_NUMBER/RANK/DENSE_RANK、LAG/LEAD、
          CTE 命名分步、WITH RECURSIVE 层级遍历

生命周期:
  create   销售明细表 + 组织架构表(自引用 manager_id)
  load     4 名销售 11 笔订单(3 个月) + 5 层组织树 10 人
  reports  四张报表逐条断言:
             排行榜  三排序函数对同分的处理各不相同
             TopN    每人最近一笔, 每人只出现一次
             环比    CTE 分步 + LAG/LEAD 跨行引用
             组织树  WITH RECURSIVE 遍历 5 层 10 人 4 叶子
  clean    删库文件, 无残留; --keep 保留 shop.db 供 CLI 查看

运行:
  python3 window_cte.py          # 全流程断言, 输出 [PASS], 退出码 0
  python3 window_cte.py --keep   # 同上, 保留库文件
"""

import argparse
import os
import sqlite3
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "shop.db")

PASS_COUNT = 0


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


# ============================================================
# 1. create — 建表(要求 SQLite >= 3.25 才有窗口函数)
# ============================================================

def do_create(conn):
    step("create", "建销售明细与组织架构两张表")
    if sqlite3.sqlite_version_info < (3, 25):
        raise SystemExit("窗口函数需要 SQLite >= 3.25, 当前 " + sqlite3.sqlite_version)
    print(f"    SQLite {sqlite3.sqlite_version}, 窗口函数可用")
    conn.executescript("""
        CREATE TABLE sales_orders (
            id          INTEGER PRIMARY KEY,
            salesperson TEXT NOT NULL,
            amount      REAL NOT NULL CHECK (amount >= 0),
            order_date  TEXT NOT NULL            -- ISO 日期可直接字典序比较
        );
        CREATE TABLE employees (
            id         INTEGER PRIMARY KEY,
            name       TEXT NOT NULL,
            title      TEXT NOT NULL,
            manager_id INTEGER REFERENCES employees(id)  -- NULL = 顶层
        );
    """)
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'")}
    ok("两张表已创建", {"sales_orders", "employees"} <= tables)


# ============================================================
# 2. load — 确定性数据
# ============================================================

def do_load(conn):
    step("load", "灌入 4 名销售 11 笔订单 + 5 层组织树 10 人")
    conn.executemany(
        "INSERT INTO sales_orders (salesperson, amount, order_date) VALUES (?, ?, ?)",
        [("王强", 300, "2026-01-05"), ("王强", 150, "2026-01-20"),
         ("王强", 400, "2026-02-10"), ("王强", 100, "2026-03-01"),
         ("赵敏", 250, "2026-01-15"), ("赵敏", 250, "2026-02-15"),
         ("赵敏", 250, "2026-03-15"),
         ("孙磊", 500, "2026-02-01"), ("孙磊", 50, "2026-03-05"),
         ("周琪", 200, "2026-01-10"), ("周琪", 550, "2026-03-20")])
    conn.executemany(
        "INSERT INTO employees (id, name, title, manager_id) VALUES (?, ?, ?, ?)",
        [(1, "张伟", "CEO", None),
         (2, "李娜", "销售总监", 1), (7, "吴芳", "产品总监", 1),
         (3, "王强", "销售经理", 2), (8, "郑浩", "产品经理", 7),
         (9, "冯雪", "产品经理", 7),
         (4, "赵敏", "销售主管", 3), (10, "陈静", "实习生", 8),
         (5, "孙磊", "销售代表", 4), (6, "周琪", "销售代表", 4)])
    conn.commit()
    n = conn.execute("SELECT COUNT(*) FROM sales_orders").fetchone()[0]
    ok(f"订单 {n} 笔, 组织 10 人", n == 11)


# ============================================================
# 3. report1 — 排行榜: 三排序函数对同分的处理
# ============================================================

def do_report1(conn):
    step("report1", "排行榜: 赵敏与周琪同分 750, 看三个名次函数各给什么")
    rows = conn.execute("""
        SELECT salesperson, SUM(amount) AS total,
               ROW_NUMBER() OVER (ORDER BY SUM(amount) DESC, salesperson) AS rn,
               RANK()        OVER (ORDER BY SUM(amount) DESC) AS rk,
               DENSE_RANK()  OVER (ORDER BY SUM(amount) DESC) AS drk
        FROM sales_orders GROUP BY salesperson
        ORDER BY total DESC, salesperson
    """).fetchall()
    for r in rows:
        print(f"    {r[0]}  总额 {r[1]:.0f}  ROW_NUMBER={r[2]} RANK={r[3]} DENSE_RANK={r[4]}")
    got = [(r[0], r[2], r[3], r[4]) for r in rows]
    # tiebreaker 是 salesperson 文本序(Unicode 码点: 周 U+5468 < 赵 U+8D75), 周琪在前
    want = [("王强", 1, 1, 1), ("周琪", 2, 2, 2), ("赵敏", 3, 2, 2), ("孙磊", 4, 4, 3)]
    ok("ROW_NUMBER 给唯一序号(并列也分先后, 靠 tiebreaker)", 
       [(r[0], r[1]) for r in got] == [(w[0], w[1]) for w in want])
    ok("RANK 同分同名次但跳号(2,2 后跳 4), DENSE_RANK 不跳号(2,2 后接 3)",
       [(r[2], r[3]) for r in got] == [(w[2], w[3]) for w in want])


# ============================================================
# 4. report2 — TopN-per-group: 每人最近一笔
# ============================================================

def do_report2(conn):
    step("report2", "每人最近一笔订单: PARTITION BY 分组排序后取 rn=1")
    rows = conn.execute("""
        WITH ranked AS (
            SELECT salesperson, order_date, amount,
                   ROW_NUMBER() OVER (
                       PARTITION BY salesperson
                       ORDER BY order_date DESC, id DESC) AS rn
            FROM sales_orders
        )
        SELECT salesperson, order_date, amount FROM ranked
        WHERE rn = 1 ORDER BY salesperson
    """).fetchall()
    for r in rows:
        print(f"    {r[0]}  最近一笔 {r[1]}  {r[2]:.0f} 元")
    # Python 独立推演每人的最大日期, 与 SQL 结果互证
    truth = {}
    for sp, d, a in conn.execute(
            "SELECT salesperson, order_date, amount FROM sales_orders"):
        if sp not in truth or d > truth[sp][0]:
            truth[sp] = (d, a)
    persons = [r[0] for r in rows]
    unique = len(persons) == len(set(persons))
    match = all(truth[r[0]] == (r[1], r[2]) for r in rows)
    ok(f"每人恰一行({persons})", unique and len(rows) == 4)
    ok("每行确为该人最大日期的订单(与 Python 推演互证)", match)


# ============================================================
# 5. report3 — 月度环比: CTE 分步 + LAG/LEAD
# ============================================================

def do_report3(conn):
    step("report3", "月度营收与环比: WITH 拆两步, LAG 看上月 LEAD 看下月")
    rows = conn.execute("""
        WITH monthly AS (
            SELECT substr(order_date, 1, 7) AS m, SUM(amount) AS total
            FROM sales_orders GROUP BY m
        )
        SELECT m, total,
               LAG(total)  OVER (ORDER BY m)          AS prev_month,
               total - LAG(total) OVER (ORDER BY m)   AS delta,
               LEAD(total) OVER (ORDER BY m)          AS next_month
        FROM monthly ORDER BY m
    """).fetchall()
    for r in rows:
        print(f"    {r[0]}  营收 {r[1]:.0f}  上月 {r[2]}  环比 {r[3]}  下月 {r[4]}")
    by_m = {r[0]: r for r in rows}
    ok("环比数字: 2 月 +250, 3 月 -200",
       by_m["2026-02"][3] == 250 and by_m["2026-03"][3] == -200)
    ok("首行 LAG 为 NULL, 尾行 LEAD 为 NULL(窗口到边即空)",
       by_m["2026-01"][2] is None and by_m["2026-03"][4] is None)
    ok("LEAD 反向引用: 1 月的 next_month 恰为 2 月营收",
       by_m["2026-01"][4] == by_m["2026-02"][1])


# ============================================================
# 6. report4 — WITH RECURSIVE: 组织树遍历
# ============================================================

def do_report4(conn):
    step("report4", "组织树: 递归 CTE 从 CEO 走到每个工位")
    rows = conn.execute("""
        WITH RECURSIVE tree(id, name, title, manager_id, lvl) AS (
            SELECT id, name, title, manager_id, 1
            FROM employees WHERE manager_id IS NULL
            UNION ALL
            SELECT e.id, e.name, e.title, e.manager_id, t.lvl + 1
            FROM employees e JOIN tree t ON e.manager_id = t.id
        )
        SELECT lvl, COUNT(*) FROM tree GROUP BY lvl ORDER BY lvl
    """).fetchall()
    for r in rows:
        print(f"    第 {r[0]} 层 {r[1]} 人")
    leaves = conn.execute("""
        SELECT COUNT(*) FROM employees
        WHERE id NOT IN (SELECT manager_id FROM employees WHERE manager_id IS NOT NULL)
    """).fetchone()[0]
    chain = conn.execute("""
        WITH RECURSIVE chain(pid, name, lvl) AS (
            SELECT id, name, 1 FROM employees WHERE name = '孙磊'
            UNION ALL
            SELECT m.id, m.name, c.lvl + 1
            FROM chain c
            JOIN employees e ON e.id = c.pid
            JOIN employees m ON m.id = e.manager_id
            WHERE c.lvl < 10
        )
        SELECT name FROM chain ORDER BY lvl DESC LIMIT 1
    """).fetchone()[0]
    total = sum(r[1] for r in rows)
    print(f"    共 {total} 人, 最深层 {rows[-1][0]} 层, 叶子 {leaves} 人, 汇报链顶: {chain}")
    ok(f"全树 {total} 人遍历无遗漏, 最深 5 层", total == 10 and rows[-1][0] == 5)
    ok(f"叶子节点恰 {leaves} 人(无下属的员工)", leaves == 4)
    ok("自底向上汇报链: 孙磊 一路追到 CEO 张伟", chain == "张伟")


# ============================================================
# 7. clean — 清理
# ============================================================

def do_clean(conn, keep):
    step("clean", "关闭连接" + (", 保留 shop.db 供 CLI 查看" if keep else ", 删除库文件"))
    conn.close()
    if not keep:
        os.remove(DB_PATH)
        ok("shop.db 已删除, 目录无残留", not os.path.exists(DB_PATH))
    else:
        print(f"  [KEEP] {DB_PATH} (自己用 sqlite3 shop.db 看看)")


def main():
    parser = argparse.ArgumentParser(description="实验 04: 窗口函数与 CTE")
    parser.add_argument("--keep", action="store_true", help="结束后保留 shop.db")
    keep = parser.parse_args().keep

    if os.path.exists(DB_PATH):  # 重跑前清场保证确定性
        os.remove(DB_PATH)
    conn = sqlite3.connect(DB_PATH)

    do_create(conn)
    do_load(conn)
    do_report1(conn)
    do_report2(conn)
    do_report3(conn)
    do_report4(conn)
    do_clean(conn, keep)

    print(f"\n{'=' * 60}")
    print(f"==== 实验 04 · window_cte 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
