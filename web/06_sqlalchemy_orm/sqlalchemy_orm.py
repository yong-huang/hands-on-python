"""
06 · SQLAlchemy ORM 实战 —— 声明式模型 / N+1 实测 / session 生命周期 / Alembic 迁移
Web 框架清单项目 6：给留言板换上真数据库，把 ORM 的三个高频坑做成断言

三个实验重点（对应 images/sqlalchemy_orm.svg）:
- N+1:    遍历 20 个作者的帖子，懒加载产生 1 + 20 = 21 条 SQL；
          selectinload 一口气把帖子按 IN 查回，降到 2 条——数字级断言
- session: expire_on_commit 让 commit 后首次读属性再发一条 SELECT（隐式刷新）；
          会话关闭后访问过期属性 → DetachedInstanceError
- Alembic: 手写最小迁移目录（ini + env.py + 两版迁移），
          upgrade 0001 → 插入旧数据 → upgrade head 加列，旧行完好、新列默认值就位

用法:
- source ../.venv/bin/activate && python3 sqlalchemy_orm.py

注意: §1-3 用内存库（干净可重复），§5 迁移用文件库 migration_lab.db（脚本会先清理重建）。
"""

import os
import sqlite3
import subprocess
import sys

from sqlalchemy import ForeignKey, create_engine, event, func, select
from sqlalchemy.orm import (DeclarativeBase, Mapped, Session,
                            mapped_column, relationship, selectinload, sessionmaker)

LAB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(LAB_DIR, "migration_lab.db")


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 声明式模型（SQLAlchemy 2.0 风格：Mapped 注解 + mapped_column）
# ============================================================

class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    posts: Mapped[list["Post"]] = relationship(back_populates="author")  # 懒加载是默认策略

    def __repr__(self):
        return f"User({self.name})"


class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column()
    views: Mapped[int] = mapped_column(default=0, server_default="0")  # 0002 迁移加的列
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    author: Mapped["User"] = relationship(back_populates="posts")


# 统计真实执行的 SQL 条数——比肉眼盯 echo 日志精确，可断言
class SQLCounter:
    def __init__(self, engine):
        self.count = 0
        event.listen(engine, "before_cursor_execute", self._inc)

    def _inc(self, *args, **kwargs):
        self.count += 1

    def reset(self):
        self.count = 0


# ============================================================
# 1. 建库与种子数据 + 关系/聚合查询
# ============================================================

def seed(engine) -> Session:
    Base.metadata.create_all(engine)
    session = sessionmaker(engine)()
    for i in range(20):
        u = User(name=f"user{i:02d}")
        u.posts = [Post(title=f"user{i:02d} 的第 {k} 篇") for k in (1, 2)]
        session.add(u)
    session.commit()
    return session


def demo_relations(session: Session) -> None:
    section("1. 关系与聚合：跨关系、join、count 一个不少")
    total = session.scalar(select(func.count(Post.id)))
    assert total == 40, f"应有 40 篇帖子，实际 {total}"

    u = session.scalars(select(User).where(User.name == "user07")).one()
    assert len(u.posts) == 2 and u.posts[0].author is u, "双向关系应互相可达"
    print(f"  u.posts 懒加载 → {len(u.posts)} 篇；u.posts[0].author is u（back_populates 双向一致）")

    titles = session.scalars(
        select(Post.title).join(Post.author).where(User.name == "user07")).all()
    assert sorted(titles) == ["user07 的第 1 篇", "user07 的第 2 篇"]
    print(f"  join + where 跨关系查询 → {titles}")

    per_author = dict(session.execute(
        select(User.name, func.count(Post.id)).join(Post.author).group_by(User.name)).all())
    assert set(per_author.values()) == {2}, f"每作者应恰 2 篇: {per_author}"
    print(f"  group_by 聚合 → 20 位作者各 2 篇（func.count）")


# ============================================================
# 2. N+1 实测：懒加载 21 条 vs selectinload 2 条
# ============================================================

def demo_n_plus_one(engine) -> None:
    section("2. N+1 实测：同一份遍历，21 条 SQL vs 2 条 SQL")
    counter = SQLCounter(engine)
    SessionLocal = sessionmaker(engine)

    # 懒加载：取 20 个用户 1 条，逐个点 .posts 再各发 1 条 → 21 条
    with SessionLocal() as s:
        counter.reset()
        users = s.scalars(select(User)).all()
        pairs = [(u.name, len(u.posts)) for u in users]
        lazy_count = counter.count
    assert lazy_count == 21, f"懒加载应 21 条 SQL，实际 {lazy_count}"
    assert pairs[0] == ("user00", 2)
    print(f"  懒加载遍历 20 位作者的帖子 → {lazy_count} 条 SQL（1 取用户 + 20 逐个取帖子）")

    # selectinload：用户 1 条 + 帖子按 user_id IN (...) 1 条 → 2 条
    with SessionLocal() as s:
        counter.reset()
        users = s.scalars(select(User).options(selectinload(User.posts))).all()
        pairs = [(u.name, len(u.posts)) for u in users]
        eager_count = counter.count
    assert eager_count == 2, f"selectinload 应 2 条 SQL，实际 {eager_count}"
    assert pairs[0] == ("user00", 2), "eager 加载结果必须与懒加载一致"
    print(f"  selectinload 同一遍历   → {eager_count} 条 SQL（1 取用户 + 1 按 IN 批量取帖子）")
    print(f"  21 → 2：结果一致，开销差 10 倍——这就是'循环里查库'的代价")


# ============================================================
# 3. session 生命周期：expire_on_commit 与 DetachedInstanceError
# ============================================================

def demo_session_lifecycle(engine) -> None:
    section("3. session 生命周期：commit 之后的隐式 SELECT 与 detached")
    counter = SQLCounter(engine)
    SessionLocal = sessionmaker(engine)  # expire_on_commit 默认 True

    with SessionLocal() as s:
        u = s.scalars(select(User).where(User.name == "user03")).one()
        counter.reset()
        _ = u.name  # 刚加载，属性在内存里：0 条
        assert counter.count == 0
        s.commit()  # commit 使全部实例过期（expire_on_commit）
        counter.reset()
        _ = u.name  # 过期后首次访问 → 隐式刷新，又发 1 条 SELECT
        assert counter.count == 1, f"过期属性访问应触发 1 条 SELECT，实际 {counter.count}"
        print(f"  commit 后首次读 u.name → 隐式补发 {counter.count} 条 SELECT（expire_on_commit 默认开）")

    # detached：会话关了，过期属性没人给刷 → DetachedInstanceError
    with SessionLocal() as s:
        u = s.scalars(select(User).where(User.name == "user05")).one()
        s.expire(u)
    try:
        _ = u.name
        raise AssertionError("detached 实例不该还能刷出属性")
    except Exception as e:
        assert type(e).__name__ == "DetachedInstanceError", f"应 DetachedInstanceError，实际 {type(e).__name__}"
        print(f"  会话关闭后读过期属性 → DetachedInstanceError（对象还在，加载它的会话没了）")
    print("  对策：Web 里一请求一 session（Flask-SQLAlchemy 的 g/依赖注入都这么干），别让对象活过会话")


# ============================================================
# 4. Alembic 迁移：加列不丢数据
# ============================================================

def run_alembic(*args: str) -> None:
    r = subprocess.run([sys.executable, "-m", "alembic", *args],
                       cwd=LAB_DIR, capture_output=True, text=True)
    assert r.returncode == 0, f"alembic {' '.join(args)} 失败:\n{r.stdout}\n{r.stderr}"


def demo_migration() -> None:
    section("4. Alembic 迁移：0001 建表 → 插旧数据 → head 加列（验收点）")
    for suffix in ("", "-wal", "-shm"):
        path = DB_FILE + suffix
        if os.path.exists(path):
            os.remove(path)  # 干净重建，可重复运行

    run_alembic("upgrade", "0001")
    con = sqlite3.connect(DB_FILE)
    tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"users", "posts"} <= tables, f"0001 后应有 users/posts 表: {tables}"
    con.execute("INSERT INTO users (name) VALUES ('legacy_user')")
    cur = con.cursor()
    cur.execute("INSERT INTO posts (title, author_id) VALUES ('迁移前的老帖子', 1)")
    old_post_id = cur.lastrowid
    con.commit()
    cols_before = {r[1] for r in con.execute("PRAGMA table_info(posts)")}
    assert "views" not in cols_before, "0001 阶段还不该有 views 列"
    print(f"  upgrade 0001 → users/posts 建表；插入老数据 id={old_post_id}（此时无 views 列）")
    con.close()

    run_alembic("upgrade", "head")
    con = sqlite3.connect(DB_FILE)
    cols = {r[1] for r in con.execute("PRAGMA table_info(posts)")}
    assert "views" in cols, f"head 后应有 views 列: {cols}"
    row = con.execute("SELECT title, views FROM posts WHERE id = ?", (old_post_id,)).fetchone()
    assert row == ("迁移前的老帖子", 0), f"旧行应完好且 views 默认 0: {row}"
    version = con.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    assert version == "0002", f"版本应停在 0002: {version}"
    con.close()
    print(f"  upgrade head → posts 多出 views 列，旧行 title 完好、views 自动填默认 0")
    print(f"  alembic_version = {version}——数据库自己记得走到哪一版，团队机器各升各的")
    print(f"  （迁移目录：alembic.ini + alembic/env.py + alembic/versions/0001、0002，全部手写可读）")


def main() -> None:
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · SQLAlchemy {version('sqlalchemy')} · ORM 实战实验")
    engine = create_engine("sqlite:///:memory:")
    session = seed(engine)
    demo_relations(session)
    session.close()
    demo_n_plus_one(engine)
    demo_session_lifecycle(engine)
    demo_migration()
    for suffix in ("", "-wal", "-shm"):
        path = DB_FILE + suffix
        if os.path.exists(path):
            os.remove(path)  # 收尾删干净：实验可重复跑，目录无残留
    print("\n  已清理 migration_lab.db（下次运行会重新迁移一遍）")

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 关系聚合查询、N+1 21→2、expire/detached 行为、Alembic 加列不丢数据")


if __name__ == "__main__":
    main()
