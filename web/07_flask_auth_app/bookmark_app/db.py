"""数据库层：SQLAlchemy 模型 + 每请求一个 session（挂在 g 上）"""

from flask import current_app, g
from sqlalchemy import ForeignKey, create_engine
from sqlalchemy.orm import (DeclarativeBase, Mapped, mapped_column,
                            relationship, sessionmaker)
from werkzeug.security import check_password_hash, generate_password_hash

MAX_ATTEMPTS = 5  # 连续错误密码达到该值即锁定（返回 429）


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    password_hash: Mapped[str]  # 只存哈希，永不存明文（§3 直接查库断言）
    failed_attempts: Mapped[int] = mapped_column(default=0)  # 限流计数器
    links: Mapped[list["Link"]] = relationship(back_populates="user")


class Link(Base):
    __tablename__ = "links"
    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str]
    title: Mapped[str] = mapped_column(default="")
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user: Mapped["User"] = relationship(back_populates="links")


def init_app(app) -> None:
    """工厂调用：给**每个 app 实例**配一个专属 engine——实例之间完全隔离"""
    engine = create_engine(f"sqlite:///{app.config['DATABASE']}")
    Base.metadata.create_all(engine)  # 教学用 create_all；生产用 Alembic（项目 6）
    app.extensions["db"] = sessionmaker(engine)


def get_db():
    """请求内第一次调用时创建 session，之后整个请求复用同一份（g 的本职工作）"""
    if "db" not in g:
        g.db = current_app.extensions["db"]()
    return g.db


def close_db(exc=None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def hash_password(password: str) -> str:
    return generate_password_hash(password)  # werkzeug 默认 scrypt


def verify_password(user: User, password: str) -> bool:
    return check_password_hash(user.password_hash, password)
