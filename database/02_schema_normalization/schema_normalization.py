"""
表设计与三范式 —— hands-on-python 第五系列（数据库）实验 02
核心要点: 1NF 原子性、更新/插入/删除三类异常、2NF/3NF 拆表依据、外键级联(CASCADE/RESTRICT)

同一份"学生选课"数据,三个设计阶段各跑一遍生命周期:
  bad_1nf   单表设计,课程列逗号分隔(违反 1NF) → 三类异常现场
  flat      只修 1NF 的平铺表 → 更新异常仍在(2NF/3NF 违规的证据)
  three_nf  3NF 三表 + 外键 → 异常消失,级联与限制各断言一次
  clean     删库文件,无残留

运行:
  python3 schema_normalization.py          # 全流程,断言全过输出 [PASS],退出码 0
  python3 schema_normalization.py --keep   # 同上,但保留 school.db 供 CLI 手工查看
"""

import argparse
import os
import sqlite3
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "school.db")

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
        print(f"  [FAIL] {label} -> 非法操作竟然被放行")
        raise AssertionError(label)


def step(name, desc):
    print(f"\n=====> [{name}] {desc}")


# ============================================================
# 1. bad_1nf — 单表 + 逗号分隔课程列: 违反第一范式(1NF)
# ============================================================

def do_bad_1nf(conn):
    step("bad_1nf", "单表登记选课,课程塞进一个格子用逗号隔开")
    conn.executescript("""
        CREATE TABLE students_bad (
            id      INTEGER PRIMARY KEY,
            name    TEXT NOT NULL,
            courses TEXT NOT NULL      -- 逗号分隔: '高等数学,大学物理'
        );
    """)
    conn.executemany(
        "INSERT INTO students_bad (id, name, courses) VALUES (?, ?, ?)",
        [(1, "张三", "高等数学,大学物理"),
         (2, "李四", "高等数学"),
         (3, "王五", "高等数学,线性代数"),
         (4, "赵六", "大学物理")])
    conn.commit()

    total = conn.execute("SELECT COUNT(*) FROM students_bad").fetchone()[0]
    picked = conn.execute(
        "SELECT COUNT(*) FROM students_bad WHERE courses LIKE '%高等数学%'").fetchone()[0]
    print(f"    {total} 名学生, 其中 {picked} 行含'高等数学'(LIKE 模糊计数)")
    ok("4 名学生入库", total == 4)
    ok("3 行含'高等数学'", picked == 3)
    return picked


# ============================================================
# 2. anomalies — 单表设计的三类异常现场
# ============================================================

def do_anomalies(conn):
    step("anomalies", "改课名、新课入驻、学生退学,逐个演示异常")
    cur = conn.execute(
        "UPDATE students_bad SET courses = REPLACE(courses, '高等数学', '数学分析')"
        " WHERE courses LIKE '%高等数学%'")
    conn.commit()
    print(f"    改一门课名影响了 {cur.rowcount} 行 —— 每处重复都要跟着改")
    ok(f"更新异常: 课名改动波及 {cur.rowcount} 行(漏一行就脏数据)", cur.rowcount == 3)

    conn.execute(
        "INSERT INTO students_bad (name, courses) VALUES ('__占位_非学生__', '机器学习引论')")
    conn.commit()
    fake = conn.execute(
        "SELECT COUNT(*) FROM students_bad WHERE name = '__占位_非学生__'").fetchone()[0]
    print("    新课没人选就没地方放,只能伪造一个'学生'行来驮着它")
    ok(f"插入异常: 库里混入 {fake} 行假学生", fake == 1)

    conn.execute("DELETE FROM students_bad WHERE name = '王五'")
    conn.commit()
    left = conn.execute(
        "SELECT COUNT(*) FROM students_bad WHERE courses LIKE '%线性代数%'").fetchone()[0]
    print("    王五是唯一选'线性代数'的人,人一走课也跟着蒸发")
    ok("删除异常: 删学生后'线性代数'在校内无迹可寻", left == 0)


# ============================================================
# 3. flat — 只修 1NF 的平铺表: 更新异常仍在
# ============================================================

def do_flat(conn):
    step("flat", "拆开逗号、一行一条选课,但课程信息仍在每行重复")
    conn.executescript("""
        CREATE TABLE enrollments_flat (
            id      INTEGER PRIMARY KEY,
            student TEXT NOT NULL,
            course  TEXT NOT NULL,
            teacher TEXT NOT NULL      -- 授课教师随选课行重复登记
        );
    """)
    conn.executemany(
        "INSERT INTO enrollments_flat (student, course, teacher) VALUES (?, ?, ?)",
        [("张三", "数学分析", "张教授"),
         ("李四", "数学分析", "张教授"),
         ("王五", "数学分析", "张教授"),
         ("赵六", "大学物理", "钱教授")])
    conn.commit()

    cur = conn.execute(
        "UPDATE enrollments_flat SET teacher = '张国立教授' WHERE course = '数学分析'")
    conn.commit()
    dup = conn.execute(
        "SELECT COUNT(*) FROM enrollments_flat WHERE teacher = '张国立教授'").fetchone()[0]
    print(f"    换一次授课教师改了 {cur.rowcount} 行 —— 原子性问题解决了,重复问题没解决")
    ok("平铺表更新异常仍在: 一个事实改动波及 N 行", cur.rowcount == 3 and dup == 3)


# ============================================================
# 4. three_nf — 3NF 三表 + 外键: 异常消失
# ============================================================

def do_three_nf(conn):
    step("three_nf", "拆成 学生/课程/选课 三张表,外键守住引用")
    conn.commit()  # PRAGMA foreign_keys 不能在事务内执行, 先落账再开开关
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript("""
        CREATE TABLE students (
            id   INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE courses (
            id      INTEGER PRIMARY KEY,
            name    TEXT NOT NULL UNIQUE,
            teacher TEXT NOT NULL
        );
        CREATE TABLE enrollments (
            id         INTEGER PRIMARY KEY,
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
            UNIQUE (student_id, course_id)
        );
    """)
    conn.executemany("INSERT INTO students (id, name) VALUES (?, ?)",
                     [(1, "张三"), (2, "李四"), (3, "王五"), (4, "赵六")])
    conn.executemany("INSERT INTO courses (id, name, teacher) VALUES (?, ?, ?)",
                     [(1, "数学分析", "张教授"),
                      (2, "大学物理", "钱教授"),
                      (3, "线性代数", "孙教授"),
                      (4, "机器学习引论", "周教授")])
    conn.executemany("INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)",
                     [(1, 1), (1, 2), (2, 1), (3, 1), (3, 3), (4, 2)])
    conn.commit()

    # 插入异常消失: 无人选的课凭自己的一行即可存在
    lonely = conn.execute(
        "SELECT COUNT(*) FROM courses c WHERE c.name = '机器学习引论'").fetchone()[0]
    enrolled = conn.execute(
        "SELECT COUNT(*) FROM enrollments e JOIN courses c ON e.course_id = c.id"
        " WHERE c.name = '机器学习引论'").fetchone()[0]
    ok("插入异常消失: 新课独立成行,0 人选也真实存在", lonely == 1 and enrolled == 0)

    # 更新异常消失: 课名只存一处, 改 1 行, 选课关系原样保留
    cur = conn.execute("UPDATE courses SET name = '微积分' WHERE name = '数学分析'")
    conn.commit()
    joined = conn.execute(
        "SELECT COUNT(*) FROM enrollments e JOIN courses c ON e.course_id = c.id"
        " WHERE c.name = '微积分'").fetchone()[0]
    print(f"    同样是改课名,这次只动了 {cur.rowcount} 行, {joined} 条选课关系原样保留")
    ok(f"更新异常消失: 只改 {cur.rowcount} 行, 选课关系无损", cur.rowcount == 1 and joined == 3)


# ============================================================
# 5. cascade_restrict — 外键的两种删除行为
# ============================================================

def do_cascade_restrict(conn):
    step("cascade_restrict", "删学生级联清选课, 删有人的课被 RESTRICT 拦下")
    before = conn.execute(
        "SELECT COUNT(*) FROM enrollments e JOIN students s ON e.student_id = s.id"
        " WHERE s.name = '张三'").fetchone()[0]
    conn.execute("DELETE FROM students WHERE name = '张三'")
    conn.commit()
    after = conn.execute(
        "SELECT COUNT(*) FROM enrollments e JOIN students s ON e.student_id = s.id"
        " WHERE s.name = '张三'").fetchone()[0]
    total = conn.execute("SELECT COUNT(*) FROM enrollments").fetchone()[0]
    print(f"    张三退学: 他名下 {before} 条选课被级联清除, 选课总账剩 {total} 条")
    ok(f"CASCADE: 删学生后其选课 {before} -> {after}(无孤儿行)", before == 2 and after == 0)

    expect_reject(conn, "DELETE FROM courses WHERE name = '大学物理'", (),
                  "RESTRICT: 有人选的课不允许删")

    conn.execute("DELETE FROM courses WHERE name = '机器学习引论'")
    conn.commit()
    left = conn.execute("SELECT COUNT(*) FROM courses").fetchone()[0]
    ok(f"对照: 无人选的课可以删, 删后剩 {left} 门", left == 3)


# ============================================================
# 6. clean — 清理, 无残留
# ============================================================

def do_clean(conn, keep):
    step("clean", "关闭连接" + (", 保留 school.db 供 CLI 查看" if keep else ", 删除库文件"))
    conn.close()
    if not keep:
        os.remove(DB_PATH)
        ok("school.db 已删除, 目录无残留", not os.path.exists(DB_PATH))
    else:
        print(f"  [KEEP] {DB_PATH} (自己用 sqlite3 school.db 看看)")


def main():
    parser = argparse.ArgumentParser(description="实验 02: 表设计与三范式")
    parser.add_argument("--keep", action="store_true", help="结束后保留 school.db")
    keep = parser.parse_args().keep

    if os.path.exists(DB_PATH):  # 上次 --keep 留下的库, 重跑前清场保证确定性
        os.remove(DB_PATH)
    conn = sqlite3.connect(DB_PATH)

    do_bad_1nf(conn)
    do_anomalies(conn)
    do_flat(conn)
    do_three_nf(conn)
    do_cascade_restrict(conn)
    do_clean(conn, keep)

    print(f"\n{'=' * 60}")
    print(f"==== 实验 02 · schema_normalization 全部 {PASS_COUNT} 项断言通过 [PASS] ====")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError:
        print("\n==== 存在断言失败, 退出码 1 ====")
        sys.exit(1)
