"""lab 09 · 测试替身(dependency_overrides) —— 被测应用: 一个"支付" API。

同一份代码服务两种跑法:
  * pytest  : test_overrides.py 用 TestClient 把 app 搬进测试进程, 逐条验证替身机制;
  * uvicorn : 09_dependency_overrides.sh 最后一节起真服务, 用 curl 对照
              "没有测试替身时, 请求会真实打在真网关上"。

教学主线(编号与 README / 测试一一对应):
  1. get_payment_gateway  真依赖: 模块级真调用计数器 + sleep 0.1 模拟网络往返;
  2. get_gateway_config   真依赖的子依赖: 证明 override 是"整条链一起换";
  3. get_fraud_score      另一个独立依赖: 证明替换是"按函数对象精确制导";
  4. POST /pay            业务端点: 同时依赖网关与风控;
  5. GET  /gateway-stats  演示端点: 读模块级计数器, 观察真依赖被执行了几次。
"""
import time

from fastapi import Depends, FastAPI
from pydantic import BaseModel

app = FastAPI(title="lab 09 - payment API (test doubles)")


# ============================================================================
# 真网关(真身): 被替换的对象。计数器放在模块级单例上, 进程里任何代码都能读,
# 测试才能拿出"真依赖一次都没执行"的精确证据 —— 而不是靠替身自我证明。
# ============================================================================
class RealGateway:
    """真支付网关(用 sleep 0.1s 冒充一次真实的网络往返)。"""

    def __init__(self) -> None:
        self.charge_calls = 0  # charge() 被真实执行的次数
        self.total_cents = 0   # 累计扣款金额(分), 佐证"真的发生了业务动作"

    def charge(self, order_id: str, amount_cents: int) -> dict:
        self.charge_calls += 1
        time.sleep(0.1)  # 模拟网络往返: 测试变慢的根源, 也是对照实验的"延迟标记"
        self.total_cents += amount_cents
        return {
            "provider": "real-gateway",         # 身份标记: 测试靠它区分响应来自谁
            "txn_id": f"TXN-{self.charge_calls:04d}",
            "latency": "simulated-100ms",       # 延迟标记: 走真网关时响应一定带它
            "amount_cents": amount_cents,
        }


GATEWAY = RealGateway()  # 模块级单例: 同一进程内所有请求共享, 计数跨请求累积


# ============================================================================
# 依赖函数: FastAPI 的依赖以"函数"为单位声明与解析, dependency_overrides 的键
# 也是函数对象本身 —— 这是本实验最关键的事实(换成同名新函数会静默失效)。
# ============================================================================
def get_gateway_config() -> dict:
    """网关配置(子依赖): 真依赖链为 get_payment_gateway -> get_gateway_config。"""
    get_gateway_config.resolved += 1  # 解析计数: 替换后它应当一个都不涨
    return {"endpoint": "https://api.pay.example.com/v1/charge", "timeout_s": 2.0}


get_gateway_config.resolved = 0  # 借函数对象的属性当计数器(与进程同生命周期)


def get_payment_gateway(config: dict = Depends(get_gateway_config)) -> RealGateway:
    """真网关依赖: 每个请求解析一次; 自己还拖着子依赖 get_gateway_config。"""
    get_payment_gateway.resolved += 1  # 依赖函数执行次数(区别于 charge 的业务次数)
    return GATEWAY


get_payment_gateway.resolved = 0


def get_fraud_score() -> dict:
    """风控依赖: 与网关互不相干, 演示"只换 gateway 时, fraud 照常执行"。"""
    get_fraud_score.executed += 1
    return {"risk": "low", "checked_by": "real-fraud"}


get_fraud_score.executed = 0


# ============================================================================
# 端点(处理某个路由的函数, 下同)。/pay 的签名经 Depends 声明两个依赖 ——
# 正因为有这层统一声明, 替换才有统一的下手位置。
# ============================================================================
class PayIn(BaseModel):
    """请求体: 订单号 + 金额(分)。"""

    order_id: str
    amount_cents: int


@app.post("/pay")
def pay(
    payload: PayIn,
    gateway: RealGateway = Depends(get_payment_gateway),  # 依赖 1: 测试替换的对象
    fraud: dict = Depends(get_fraud_score),               # 依赖 2: 演示"只换一个"
) -> dict:
    """扣款端点: 响应同时带回网关回执与风控结论, provider 字段暴露"谁在服务"。"""
    receipt = gateway.charge(payload.order_id, payload.amount_cents)
    return {"order_id": payload.order_id, "ok": True, "fraud": fraud, "receipt": receipt}


@app.post("/pay-twice")
def pay_twice(
    payload: PayIn,
    first: RealGateway = Depends(get_payment_gateway),   # 同一请求第 1 次声明
    second: RealGateway = Depends(get_payment_gateway),  # 同一请求第 2 次声明
) -> dict:
    """use_cache 教学端点: 两个参数声明同一个依赖, 框架一个请求只解析一次,
    两个参数拿到同一实例(缓存键记在原函数对象名下, 替换后语义不变)。"""
    same = first is second
    receipt = first.charge(payload.order_id, payload.amount_cents)
    return {"order_id": payload.order_id, "same_instance": same, "receipt": receipt}


@app.get("/gateway-stats")
def gateway_stats() -> dict:
    """演示端点: 读模块级真计数器。对照实验里 curl 它, 亲眼看到真依赖被执行。"""
    return {
        "gateway_resolved": get_payment_gateway.resolved,  # 依赖函数执行次数
        "config_resolved": get_gateway_config.resolved,    # 子依赖解析次数
        "charge_calls": GATEWAY.charge_calls,              # 真实扣款次数
        "total_cents": GATEWAY.total_cents,                # 累计扣款金额
        "fraud_executed": get_fraud_score.executed,        # 真风控执行次数
    }
