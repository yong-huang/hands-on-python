"""pytest 共享夹具:应用、进程内客户端、状态隔离。

fixture 蓝图(呼应 lab 09 的 dependency_overrides 与本篇的分层):
- app      —— 导入被测应用(模块级,整个测试会话一份);
- client   —— TestClient(FastAPI 配套的进程内测试客户端,不发真实网络包),
              function 作用域:每个用例拿一个全新客户端;
- clean_state —— autouse:每个用例开始前自动 POST /reset,用例之间零残留。
"""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="session")
def app_instance():
    return app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def clean_state(client):
    """每个用例开始前清空购物车——隔离靠夹具,不靠用例自觉。"""
    client.post("/reset")
    yield
