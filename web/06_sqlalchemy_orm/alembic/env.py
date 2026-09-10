"""Alembic 迁移环境：手写最小版，不用官方模板的日志配置

职责只有两件事：
1. 把实验根目录加进 sys.path，导入业务模型的 Base（含全部表的元数据）
2. 用 ini 里的 sqlalchemy.url 建连接，跑迁移
"""

import os
import sys

from sqlalchemy import create_engine
from alembic import context

# 让 env.py 能 import 实验根目录下的 sqlalchemy_orm（模型定义所在）
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy_orm import Base  # noqa: E402

config = context.config
target_metadata = Base.metadata


def run_migrations_online() -> None:
    url = config.get_main_option("sqlalchemy.url")
    connectable = create_engine(url)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
