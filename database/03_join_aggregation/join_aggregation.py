"""
JOIN 与聚合查询手册 —— hands-on-python 第五系列（数据库）实验 03
核心要点: INNER/LEFT/CROSS/SELF JOIN、GROUP BY/HAVING、子查询 vs JOIN、
          NULL 三值逻辑、COUNT(*) 与 COUNT(列) 陷阱

生命周期:
  create  四表订单域: 客户/订单/明细/商品
  load    确定性数据: 6 客户 6 订单(1 单散客 NULL) 5 商品 10 条明细
  qa      十个业务问题逐条断言, 同步生成 join_playbook.md 查询手册
  clean   删库文件与手册(默认), 无残留; --keep 保留两者供 CLI 查看

运行:
  python3 join_aggregation.py          # 全流程断言, 输出 [PASS], 退出码 0
  python3 join_aggregation.py --keep   # 同上, 保留 shop.db 与 join_playbook.md
"""

import argparse
import os
import re
import sqlite3
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "shop.db")
PLAYBOOK_PATH = os.path.join(SCRIPT_DIR, "join_playbook.md")

PASS_COUNT = 0
PLAYBOOK = ["# JOIN 与聚合查询手册(实验 03 生成)\n",
            "电商订单域十问:每问一条 SQL,业务描述在前,SQL 与结果在后。\n"]


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


def ask(q_no, business, sql, params=()):
    """执行一问: 打印业务与 SQL, 返回全部行, 并登记进查询手册。"""
    print(f"\n  -- Q{q_no}: {business}")
    print(f"     {sql}")
    rows = CONN.execute(sql, params).fetchall()
    PLAYBOOK.append(f"\n## Q{q_no} {business}\n\n```sql\n{sql}\n```\n")
    if rows:
        head = "| " + " | ".join(str(d[0]) for d in CONN.execute(sql, params).description) + " |"
        bar = "|" + ":--:|" * len(rows[0])
        PLAYBOOK.append(head + "\n" + bar)
        for r in rows:
            PLAYBOOK.append("| " + " | ".join(str(v) for v in r) + " |")
    else:
        PLAYBOOK.append("(0 行)\n")
    return rows


# ============================================================
# 1. create — 四表订单域
# ============================================================

def do_create(conn):
    step("create", "建 客户/订单/明细/商品 四张表, 散客订单允许 customer_id 为 NULL")
    conn.executescript("""
        CREATE TABLE customers (
            id   INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            city TEXT NOT NULL
        );
        CREATE TABLE products (
            id       INTEGER PRIMARY KEY,
            name     TEXT NOT NULL,
            category TEXT NOT NULL,
            price    REAL NOT NULL CHECK (price >= 0)
        );
        CREATE TABLE orders (
            id          INTEGER PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),  -- NULL = 散客(无账户)
            order_date  TEXT NOT NULL,
            coupon      TEXT                               -- NULL = 未用券
        );
        CREATE TABLE order_items (
            id         INTEGER PRIMARY KEY,
            order_id   INTEGER NOT NULL REFERENCES orders(id),
            product_id INTEGER NOT NULL REFERENCES products(id),
            qty        INTEGER NOT NULL CHECK (qty > 0),
            unit_price REAL NOT NULL                      -- 下单时快照价
        );
    """)
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'")}
    ok("四张表已创建", {"customers", "orders", "order_items", "products"} <= tables)


# ============================================================
# 2. load — 确定性数据
# ============================================================

def do_load(conn):
    step("load", "灌入 6 客户 / 6 订单(1 散客) / 5 商品 / 10 条明细")
    conn.executemany("INSERT INTO customers VALUES (?, ?, ?)",
                     [(1, "阿里", "北京"), (2, "小熊", "上海"), (3, "老陈", "广州"),
                      (4, "阿花", "深圳"), (5, "大雄", "北京"), (6, "小美", "杭州")])
    conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?)",
                     [(1, "机械键盘", "外设", 329.0), (2, "显示器支架", "外设", 149.0),
                      (3, "USB-C 扩展坞", "配件", 259.0), (4, "鼠标垫", "外设", 39.0),
                      (5, "桌面音箱", "配件", 199.0)])
    conn.executemany("INSERT INTO orders VALUES (?, ?, ?, ?)",
                     [(101, 1, "2026-01-10", "JAN10"), (102, 2, "2026-01-12", None),
                      (103, 1, "2026-02-03", "FEB20"), (104, 3, "2026-02-10", None),
                      (105, None, "2026-02-14", "VDAY7"), (106, 2, "2026-03-01", None)])
    conn.executemany("INSERT INTO order_items (order_id, product_id, qty, unit_price) VALUES (?, ?, ?, ?)",
                     [(101, 1, 1, 329.0), (101, 4, 1, 39.0), (101, 3, 1, 259.0),
                      (102, 3, 1, 259.0),
                      (103, 5, 1, 199.0), (103, 4, 2, 39.0),
                      (104, 2, 1, 149.0),
                      (105, 1, 1, 329.0),
                      (106, 5, 1, 199.0), (106, 4, 3, 39.0)])
    conn.commit()
    items = conn.execute("SELECT COUNT(*) FROM order_items").fetchone()[0]
    ok(f"明细 {items} 行(后面十问都以它为底)", items == 10)


# ============================================================
# 3. qa — 十个业务问题
# ============================================================

def do_qa(conn):
    global CONN
    CONN = conn
    step("qa", "十问逐条断言: JOIN 全家族 + 聚合陷阱")

    # Q1 内连接: 散客单没有客户可配, 直接消失
    rows = ask(1, "每笔订单的下单客户是谁?(INNER JOIN)",
               "SELECT o.id, c.name FROM orders o"
               " JOIN customers c ON o.customer_id = c.id ORDER BY o.id")
    total = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    print(f"    订单共 {total} 笔, 连接后只剩 {len(rows)} 笔 —— 散客单被内连接滤掉")
    ok("Q1 内连接 5 行, 散客单(105)被滤掉", len(rows) == 5 and total == 6)

    # Q2 三表连接: 明细展开成"订单-商品-金额"长表
    rows = ask(2, "每条明细买了什么、折多少钱?(三表连接)",
               "SELECT o.id, p.name, i.qty, i.unit_price * i.qty AS amount"
               " FROM order_items i"
               " JOIN orders o ON i.order_id = o.id"
               " JOIN products p ON i.product_id = p.id ORDER BY o.id")
    py_sum = sum(r[3] for r in rows)
    sql_sum = conn.execute(
        "SELECT SUM(i.qty * i.unit_price) FROM order_items i").fetchone()[0]
    print(f"    明细展开 {len(rows)} 行, Python 累加 {py_sum} == SQL SUM {sql_sum}")
    ok("Q2 三表连接 10 行, 两种算法总额一致", len(rows) == 10 and py_sum == sql_sum)

    # Q3 左连接: 内连接永远等不到"没下单的客户"
    inner = ask(3, "哪些客户从没下过单?(内连接写法, 必然失败)",
                "SELECT c.name FROM customers c"
                " JOIN orders o ON c.id = o.customer_id WHERE o.id IS NULL")
    rows = ask(3, "哪些客户从没下过单?(LEFT JOIN 正解)",
               "SELECT c.name FROM customers c"
               " LEFT JOIN orders o ON c.id = o.customer_id WHERE o.id IS NULL ORDER BY c.id")
    names = [r[0] for r in rows]
    print(f"    内连接版本 {len(inner)} 行(它造不出'没匹配上的行'), LEFT JOIN 找到 {names}")
    ok(f"Q3 只有 LEFT JOIN 能解: {names}",
       len(inner) == 0 and names == ["阿花", "大雄", "小美"])

    # Q4 左连接 + 分组计数: 没下单的客户必须出现且计 0
    rows = ask(4, "每个客户各下了几单?(COUNT(o.id), 零单也要出现)",
               "SELECT c.name, COUNT(o.id) AS orders FROM customers c"
               " LEFT JOIN orders o ON c.id = o.customer_id"
               " GROUP BY c.id ORDER BY orders DESC, c.id")
    inner_n = conn.execute(
        "SELECT COUNT(DISTINCT customer_id) FROM orders"
        " WHERE customer_id IS NOT NULL").fetchone()[0]
    daxiong = next(r[1] for r in rows if r[0] == "大雄")
    star = conn.execute(
        "SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON c.id = o.customer_id"
        " GROUP BY c.id HAVING c.name = '大雄'").fetchone()[0]
    print(f"    LEFT JOIN 版 {len(rows)} 人(含零单), 内连接视角只有 {inner_n} 人; "
          f"大雄 COUNT(o.id)={daxiong} 而 COUNT(*)={star}")
    ok(f"Q4 零单客户现身且计 0(左连接 {len(rows)} 人 vs 内连接 {inner_n} 人)",
       len(rows) == 6 and inner_n == 3 and daxiong == 0)
    ok("Q4 佐证: LEFT JOIN 后 COUNT(*) 会把 NULL 行数成 1", star == 1)

    # Q5 COUNT(*) vs COUNT(列): NULL 不进计数
    total, used = ask(5, "总订单数与用券订单数(COUNT(*) vs COUNT(列))",
                      "SELECT COUNT(*) AS all_orders, COUNT(coupon) AS with_coupon"
                      " FROM orders")[0]
    print(f"    COUNT(*)={total}, COUNT(coupon)={used} —— 3 个 NULL 不参与计数")
    ok(f"Q5 {total} 笔订单中 {used} 笔用了券", total == 6 and used == 3)

    # Q6 聚合排序: 消费最高的客户
    rows = ask(6, "消费总额最高的客户是谁?(SUM + ORDER BY + LIMIT)",
               "SELECT c.name, SUM(i.qty * i.unit_price) AS spent"
               " FROM customers c"
               " JOIN orders o ON o.customer_id = c.id"
               " JOIN order_items i ON i.order_id = o.id"
               " GROUP BY c.id ORDER BY spent DESC LIMIT 1")
    print(f"    榜首: {rows[0][0]} {rows[0][1]} 元(散客的 329 元不在其列)")
    ok(f"Q6 榜首 {rows[0][0]} {rows[0][1]} 元", rows[0][0] == "阿里" and rows[0][1] == 904.0)

    # Q7 HAVING: 对分组结果设门槛
    rows = ask(7, "哪些客户累计消费不低于 300 元?(HAVING)",
               "SELECT c.name, SUM(i.qty * i.unit_price) AS spent"
               " FROM customers c"
               " JOIN orders o ON o.customer_id = c.id"
               " JOIN order_items i ON i.order_id = o.id"
               " GROUP BY c.id HAVING SUM(i.qty * i.unit_price) >= 300"
               " ORDER BY spent DESC")
    ok(f"Q7 过线 {[r[0] for r in rows]}", [r[0] for r in rows] == ["阿里", "小熊"])

    # Q8 自连接: 同城客户配对
    rows = ask(8, "谁和谁住在同一座城?(SELF JOIN)",
               "SELECT c1.name, c2.name, c1.city FROM customers c1"
               " JOIN customers c2 ON c1.city = c2.city AND c1.id < c2.id")
    print(f"    同城对: {[(r[0], r[1]) for r in rows]} (id < 防止重复与自身配对)")
    ok("Q8 同城恰一对: 阿里-大雄", [(r[0], r[1]) for r in rows] == [("阿里", "大雄")])

    # Q9 子查询 vs JOIN: 两种写法一个答案
    sub = ask(9, "买过外设类商品的客户(子查询写法)",
              "SELECT name FROM customers WHERE id IN"
              " (SELECT o.customer_id FROM orders o"
              "  JOIN order_items i ON i.order_id = o.id"
              "  JOIN products p ON i.product_id = p.id"
              "  WHERE p.category = '外设') ORDER BY id")
    join = ask(9, "买过外设类商品的客户(JOIN 写法)",
               "SELECT DISTINCT c.name FROM customers c"
               " JOIN orders o ON o.customer_id = c.id"
               " JOIN order_items i ON i.order_id = o.id"
               " JOIN products p ON i.product_id = p.id"
               " WHERE p.category = '外设' ORDER BY c.id")
    print(f"    子查询 {[r[0] for r in sub]} == JOIN {[r[0] for r in join]} (散客两边都进不了名单)")
    ok("Q9 两种写法结果一致",
       [r[0] for r in sub] == [r[0] for r in join] == ["阿里", "小熊", "老陈"])

    # Q10 NOT IN 遇上 NULL: 三值逻辑让整个 NOT IN 失灵
    notin = ask(10, "没用 NOT IN: 哪些客户从没下过单?(LEFT JOIN 对照)",
                "SELECT c.name FROM customers c LEFT JOIN orders o"
                " ON c.id = o.customer_id WHERE o.id IS NULL ORDER BY c.id")
    broken = ask(10, "NOT IN 版本: 子查询里混入一个 NULL, 全军覆没",
                 "SELECT name FROM customers WHERE id NOT IN"
                 " (SELECT customer_id FROM orders)")
    print(f"    LEFT JOIN 找到 {[r[0] for r in notin]}, NOT IN 只剩 {len(broken)} 行 "
          f"(x <> NULL 得 UNKNOWN, AND 上它整句永假)")
    ok("Q10 NOT IN 遇 NULL 全空(0 行), LEFT JOIN 正常 3 行",
       len(broken) == 0 and len(notin) == 3)


# ============================================================
# 4. playbook — 手册落盘与校验
# ============================================================

def do_playbook():
    step("playbook", "生成 join_playbook.md(每问业务描述 + SQL + 结果表)")
    PLAYBOOK.append(f"\n---\n共 10 问, 由实验 03 演示脚本生成, 数据随脚本清理。\n")
    md = "\n".join(PLAYBOOK)
    with open(PLAYBOOK_PATH, "w", encoding="utf-8") as f:
        f.write(md)
    q_nos = set(re.findall(r"^## Q(\d+)", md, flags=re.M))  # 一问多写法按题号去重
    ok(f"手册已生成, 覆盖 {len(q_nos)} 问", q_nos == {str(i) for i in range(1, 11)})


# ============================================================
# 5. clean — 清理
# ============================================================

def do_clean(conn, keep):
    step("clean", "关闭连接" + (", 保留库与手册" if keep else ", 删除库文件与手册"))
    conn.close()
    leftovers = [DB_PATH, PLAYBOOK_PATH] if keep else [DB_PATH, PLAYBOOK_PATH]
    for path in leftovers:
        if not keep and os.path.exists(path):
            os.remove(path)
    if not keep:
        ok("shop.db 与 join_playbook.md 均已清理",
           not os.path.exists(DB_PATH) and not os.path.exists(PLAYBOOK_PATH))
    else:
        print(f"  [KEEP] {DB_PATH} / {PLAYBOOK_PATH} (sqlite3 shop.db 看看)")


def main():
    parser = argparse.ArgumentParser(description="实验 03: JOIN 与聚合查询手册")
    parser.add_argument("--keep", action="store_true", help="保留库文件与查询手册")
    keep = parser.parse_args().keep

    for path in (DB_PATH, PLAYBOOK_PATH):  # 重跑前清场保证确定性
        if os.path.exists(path):
            os.remove(path)
    conn = sqlite3.connect(DB_PATH)

    do_create(conn)
    do_load(conn)
    do_qa(conn)
    do_playbook()
    do_clean(conn, keep)

    print(f"\n{'=' * 60}")
    print(f"==== 实验 03 · join_aggregation 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
