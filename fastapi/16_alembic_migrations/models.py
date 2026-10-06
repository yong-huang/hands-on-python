from sqlalchemy import String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """全部模型的公共基类; Base.metadata 是表定义的注册表, autogenerate 靠它和数据库对比。"""


class Article(Base):
    __tablename__ = "articles"

    # ---- 第 1 个迁移(create articles table): 建表 ----
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)

    # ---- 第 2 个迁移(add views and author): 加列 ----
    # default=0 是 Python/ORM 端的默认值, 只在通过 ORM 插入时生效;
    # server_default="0" 才会写进 DDL, 数据库端(PRAGMA 与裸 SQL 插入)可见。
    views: Mapped[int] = mapped_column(default=0, server_default="0")
    author: Mapped[str | None] = mapped_column(String(120), default=None)
