"""
SQL CRUD 与约束系统 —— hands-on-python 第五系列（数据库）实验 01
核心要点: 建表与五类约束、DB-API 参数绑定、sqlite3.IntegrityError、SQL 注入对比

一次完整生命周期演示（脚本即主教材）:
  create   建表: 五类约束各就各位
  observe  观察正常读写与 sqlite3.Row 行对象
  break    五类约束逐个违反, 每次都被 SQLite 拒绝
  crud     UPDATE / DELETE / SELECT 基本流
  inject   拼接 SQL 被注入 vs 参数绑定被防
  clean    关连接、删库文件, 无残留

运行:
  python3 sql_crud.py          # 全流程, 全部断言通过输出 [PASS], 退出码 0
  python3 sql_crud.py --keep   # 同上, 但保留 shop.db 供 sqlite3 CLI 手工查看
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


def expect_reject(conn, sql, params, label):
    """断言一条 SQL 因约束被拒: 捕获 IntegrityError 才算通过。"""
    global PASS_COUNT
    try:
        conn.execute(sql, params)
    except sqlite3.IntegrityError as err:
        PASS_COUNT += 1
        print(f"  [PASS] {label} -> 已拒绝: {err}")
    else:
        print(f"  [FAIL] {label} -> 非法写入竟然被放行")
        raise AssertionError(label)


def step(name, desc):
    print(f"\n=====> [{name}] {desc}")


# ============================================================
# 1. create — 建表: 五类约束各就各位
# ============================================================

def do_create(conn):
    step("create", "建表 products / orders, 五类约束写进表定义")
    conn.executescript("""
        CREATE TABLE products (
            id      INTEGER PRIMARY KEY,            -- 主键约束: 唯一标识一行
            name    TEXT    NOT NULL,               -- 非空约束: 必填
            price   REAL    CHECK (price >= 0),     -- 检查约束: 业务规则
            sku     TEXT    UNIQUE                  -- 唯一约束: 条形码不重复
        );
        CREATE TABLE orders (
            id          INTEGER PRIMARY KEY,
            product_id  INTEGER REFERENCES products(id),  -- 外键约束: 引用必须存在
            qty         INTEGER NOT NULL CHECK (qty > 0)
        );
    """)
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'")}
    ok("products / orders 两张表已创建", {"products", "orders"} <= tables)


# ============================================================
# 2. observe — 正常写入与 sqlite3.Row
# ============================================================

def do_observe(conn):
    step("observe", "参数绑定写入三件商品, 读回验证")
    conn.executemany(
        "INSERT INTO products (id, name, price, sku) VALUES (?, ?, ?, ?)",
        [(1, "机械键盘", 329.0, "KB-001"),
         (2, "显示器支架", 149.5, "ARM-002"),
         (3, "USB-C 扩展坞", 259.0, "HUB-003")])
    conn.commit()

    conn.row_factory = sqlite3.Row  # 行变成可用列名下标的对象
    rows = conn.execute(
        "SELECT id, name, price FROM products WHERE price > 200 ORDER BY price").fetchall()
    print("    price > 200 的商品:")
    for r in rows:
        print(f"      {r['id']}  {r['name']}  {r['price']}")

    ok("筛选结果恰为 2 行", len(rows) == 2)
    ok("Row 可按列名取值且数值无损",
       rows[0]["name"] == "USB-C 扩展坞" and rows[0]["price"] == 259.0)


# ============================================================
# 3. break — 五类约束逐个违反, 全部被拒
# ============================================================

def do_break(conn):
    step("break", "五类约束各打一枪, 每次非法写入都被 IntegrityError 拦下")
    expect_reject(conn,
                  "INSERT INTO products VALUES (1, '冒名顶替', 1.0, 'FAKE-1')", (),
                  "主键约束: 重复 id=1")
    expect_reject(conn,
                  "INSERT INTO products VALUES (10, NULL, 1.0, 'NN-010')", (),
                  "非空约束: name 为 NULL")
    expect_reject(conn,
                  "INSERT INTO products VALUES (11, '山寨键盘', 99.0, 'KB-001')", (),
                  "唯一约束: sku 与已有行冲突")
    expect_reject(conn,
                  "INSERT INTO products VALUES (12, '负价商品', -0.01, 'CHK-012')", (),
                  "检查约束: price < 0")

    # 外键约束是唯一默认关闭的: 每个连接要显式打开, 这是 SQLite 第一大坑
    fk_off = conn.execute("PRAGMA foreign_keys").fetchone()[0]
    print(f"    默认 PRAGMA foreign_keys = {fk_off} (外键检查未启用)")
    ok("外键默认关闭: 悬空引用被放行(坑点演示)",
       fk_off == 0 and conn.execute(
           "INSERT INTO orders (id, product_id, qty) VALUES (1, 999, 1)").rowcount == 1)
    conn.execute("DELETE FROM orders WHERE id = 1")  # 清掉这条脏数据再继续
    conn.commit()

    conn.execute("PRAGMA foreign_keys = ON")
    expect_reject(conn,
                  "INSERT INTO orders (id, product_id, qty) VALUES (2, 999, 1)", (),
                  "外键约束: product_id=999 不存在")


# ============================================================
# 4. crud — UPDATE / DELETE / SELECT 基本流
# ============================================================

def do_crud(conn):
    step("crud", "改价、下架、复查三步走, 全部用数字断言")
    cur = conn.execute(
        "UPDATE products SET price = price * 0.8 WHERE sku = 'KB-001'")
    conn.commit()
    ok("UPDATE 影响行数 rowcount == 1", cur.rowcount == 1)
    new_price = conn.execute(
        "SELECT price FROM products WHERE sku = 'KB-001'").fetchone()[0]
    ok(f"改价生效 329.0 * 0.8 == {round(new_price, 2)}", round(new_price, 2) == 263.2)

    cur = conn.execute("DELETE FROM products WHERE sku = 'ARM-002'")
    conn.commit()
    ok("DELETE 影响行数 rowcount == 1", cur.rowcount == 1)
    rest = conn.execute("SELECT name FROM products ORDER BY price DESC").fetchall()
    print("    剩余商品(按价格降序):", [r[0] for r in rest])
    ok("下架后剩 2 行且排序正确",
       len(rest) == 2 and rest[0][0] == "机械键盘" and rest[1][0] == "USB-C 扩展坞")


# ============================================================
# 5. inject — 拼接 SQL vs 参数绑定
# ============================================================

def do_inject(conn):
    step("inject", "同一个恶意输入: 拼接被注入, 参数绑定原样当数据")
    total = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    payload = "' OR '1'='1"  # 经典注入载荷: 目标是让 WHERE 恒真

    def search_concat(keyword):
        # 反面教材: 把用户输入直接拼进 SQL 文本
        return conn.execute(
            f"SELECT id, name FROM products WHERE name LIKE '%{keyword}%'").fetchall()

    def search_bound(keyword):
        # 正确姿势: 占位符 ? 由驱动负责转义, 输入永远只是数据
        return conn.execute(
            "SELECT id, name FROM products WHERE name LIKE ?", (f"%{keyword}%",)).fetchall()

    hacked = search_concat(payload)
    print(f"    拼接版命中 {len(hacked)}/{total} 行 —— 库被拖走了")
    ok("注入成功复现: 恒真条件返回全部行", len(hacked) == total and total == 2)

    bound = search_bound(payload)
    print(f"    绑定版命中 {len(bound)} 行 —— 载荷只是普通子串")
    ok("参数绑定防御: 恶意载荷命中 0 行", len(bound) == 0)

    ok("合法输入两种写法结果一致",
       [tuple(r) for r in search_concat("扩展坞")] == [tuple(r) for r in search_bound("扩展坞")])


# ============================================================
# 6. clean — 清理, 无残留
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
    parser = argparse.ArgumentParser(description="实验 01: SQL CRUD 与约束系统")
    parser.add_argument("--keep", action="store_true", help="结束后保留 shop.db")
    keep = parser.parse_args().keep

    if os.path.exists(DB_PATH):  # 上次 --keep 留下的库, 重跑前清场保证确定性
        os.remove(DB_PATH)
    conn = sqlite3.connect(DB_PATH)

    do_create(conn)
    do_observe(conn)
    do_break(conn)
    do_crud(conn)
    do_inject(conn)
    do_clean(conn, keep)

    print(f"\n{'=' * 60}")
    print(f"==== 实验 01 · sql_crud 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
