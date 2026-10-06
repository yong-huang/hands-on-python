"""Lab 21 · 配置类:优先级链、类型校验、多环境。

pydantic-settings 的读取顺序(实测见演示 [1]):
环境变量 LAB21_* > env_file 指定的 .env 文件 > 字段默认值。
"""

import os
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """配置的门卫:按优先级收件、验类型、不合格拒收(启动即报错)。"""

    app_name: str = "lab21"
    debug: bool = False
    threshold: int = Field(default=10, ge=1, le=100)
    max_retries: int = Field(default=3, ge=0, le=10)
    secret_set_by_env: str = ""  # 演示敏感配置走环境注入(生产语义见 lab 17)

    model_config = SettingsConfigDict(
        env_prefix="LAB21_",  # 只认 LAB21_ 开头的环境变量
        env_file=os.getenv("LAB21_ENV_FILE") or None,  # 启动方决定挂哪套环境
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """配置全程单例:进程内读一次,处处复用(缓存键=函数本身,呼应 lab 10)。"""
    return Settings()
