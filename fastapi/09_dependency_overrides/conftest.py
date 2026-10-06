"""lab 09 · pytest 公共夹具(fixture: pytest 的夹具机制, 测试前后自动准备/清理资源)。

conftest.py 是 pytest 的约定文件: 同目录的测试模块自动获得这里的 fixture,
不需要 import —— fixture 函数名即测试的参数名。本文件准备三样东西:
  * client       : TestClient(FastAPI 配套的进程内测试客户端), 不起服务也能发请求;
  * fake_gateway : 可计数的假网关替身, 函数级作用域, 每个测试全新实例;
  * counters     : 真依赖侧计数器快照函数, 测试一律比较前后差值。
"""
import warnings

# 环境噪音: 本仓库的 starlette 用 httpx 跑 TestClient 会发一次"建议改用 httpx2"
# 的弃用警告, 与本实验无关; 警告在 fastapi 导入时触发, 过滤必须写在最前面。
warnings.filterwarnings("ignore", message=r".*starlette.testclient.*deprecated.*")

import pytest  # noqa: E402  (上面的 filterwarnings 必须先执行)
from fastapi.testclient import TestClient  # noqa: E402

from main import GATEWAY, app, get_fraud_score, get_gateway_config, get_payment_gateway


class FakeGateway:
    """假网关: 与真身同名 charge() 方法(鸭子类型), 零延迟零副作用, 自带计数器。"""

    def __init__(self) -> None:
        self.charge_calls = 0

    def charge(self, order_id: str, amount_cents: int) -> dict:
        self.charge_calls += 1
        return {
            "provider": "fake-gateway",
            "txn_id": f"FAKE-{self.charge_calls:04d}",
            "latency": "none",  # 替身不 sleep: 对照真网关的 simulated-100ms
            "amount_cents": amount_cents,
        }


@pytest.fixture
def fake_gateway() -> FakeGateway:
    """函数级作用域: 每个测试一个新替身, 计数从 0 开始, 测试之间互不串扰。"""
    return FakeGateway()


@pytest.fixture
def client() -> TestClient:
    """进程内客户端。它不注册任何 override —— 换不换替身由测试自己决定,
    测试 [1] 才能先拍下"无替身"时的基线行为。"""
    return TestClient(app)


@pytest.fixture
def counters():
    """返回真依赖侧计数器快照函数。模块级计数跨测试累积, 断言只用前后差值。"""

    def snap() -> dict:
        return {
            "charge": GATEWAY.charge_calls,                    # 真扣款次数
            "gateway_resolved": get_payment_gateway.resolved,  # 真依赖函数执行次数
            "config_resolved": get_gateway_config.resolved,    # 子依赖解析次数
            "fraud_executed": get_fraud_score.executed,        # 真风控执行次数
        }

    return snap
