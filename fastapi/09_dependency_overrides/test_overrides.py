"""lab 09 · 主教材: 8 个测试讲透 dependency_overrides。

跑法: .venv/bin/python -m pytest -v   (或 ./09_dependency_overrides.sh demo)

编号对应 README 的机制点:
  [1] 无替身基线 : 真网关照常执行, 计数 +1, 响应带延迟标记;
  [2] 整体置换   : override 后假网关接管, 真依赖与其子依赖链零执行;
  [3] 精确制导   : 只换 get_payment_gateway, 不影响 get_fraud_score;
  [4] 签名可简化 : 无参替身也能顶替带子依赖的真依赖;
  [5] clear()    : 清空 overrides, 真网关立刻回岗;
  [6] 项目惯例   : 类作用域 autouse fixture 托管注册与清理(含 2 个用例)。
另有 test_07: 回归检查 [6] 的类作用域替身没有泄漏到模块级。
"""
import time

import pytest

from main import app, get_payment_gateway  # 键必须是 import 进来的原依赖函数对象


# --- [1] 基线: 没有替身时 /pay 打真网关 —— 先记录真实世界, 替换才有对照 ---------
def test_01_no_override_real_gateway_runs(client, counters):
    before = counters()
    start = time.monotonic()
    resp = client.post("/pay", json={"order_id": "A-001", "amount_cents": 9900})
    elapsed = time.monotonic() - start

    assert resp.status_code == 200
    body = resp.json()
    assert body["receipt"]["provider"] == "real-gateway"    # 响应来自真网关
    assert body["receipt"]["latency"] == "simulated-100ms"  # 延迟标记在场
    assert body["fraud"]["checked_by"] == "real-fraud"      # 风控也是真身
    assert elapsed >= 0.09                                  # 0.1s sleep 真实发生
    after = counters()
    assert after["charge"] == before["charge"] + 1          # 真扣款 +1
    assert after["gateway_resolved"] == before["gateway_resolved"] + 1
    assert after["config_resolved"] == before["config_resolved"] + 1  # 子依赖也解析了


# --- [2] 整体置换: 一个 override, 真依赖与整条子依赖链从执行路径上消失 ----------
def test_02_override_replaces_whole_chain(client, fake_gateway, counters):
    before = counters()
    app.dependency_overrides[get_payment_gateway] = lambda: fake_gateway  # 注册就一行
    try:
        resp = client.post("/pay", json={"order_id": "B-002", "amount_cents": 100})
        body = resp.json()
        assert resp.status_code == 200
        assert body["receipt"]["provider"] == "fake-gateway"  # 响应来自替身
        assert body["receipt"]["latency"] == "none"           # 零延迟标记
        assert fake_gateway.charge_calls == 1                 # 替身确实被执行
        after = counters()
        # "真依赖完全不执行"的三重证据 —— 三个真计数器纹丝不动:
        assert after["charge"] == before["charge"]            # 真扣款没发生
        assert after["gateway_resolved"] == before["gateway_resolved"]  # 真依赖没执行
        assert after["config_resolved"] == before["config_resolved"]    # 子依赖没解析
    finally:
        # finally: 断言失败也要清理, 否则替身会漏进后面的测试(见 README 的坑)
        app.dependency_overrides.clear()


# --- [3] 精确制导: overrides 是 dict, 没登记的依赖原样执行 ---------------------
def test_03_override_is_per_function(client, fake_gateway, counters):
    before = counters()
    app.dependency_overrides[get_payment_gateway] = lambda: fake_gateway
    try:
        body = client.post("/pay", json={"order_id": "C-003", "amount_cents": 500}).json()
        assert body["receipt"]["provider"] == "fake-gateway"  # 网关已被替换
        assert body["fraud"]["checked_by"] == "real-fraud"    # 风控还是真身
    finally:
        app.dependency_overrides.clear()
    after = counters()
    assert after["fraud_executed"] == before["fraud_executed"] + 1  # 真风控照常 +1


# --- [4] 签名可简化: 替身参数表与原依赖无关, 无参也能顶带子依赖的真依赖 --------
def test_04_override_signature_can_be_simpler(client, fake_gateway, counters):
    before = counters()

    def zero_arg_gateway():  # 故意无参: 原依赖的 config=Depends(...) 在替身这里不存在
        return fake_gateway

    app.dependency_overrides[get_payment_gateway] = zero_arg_gateway
    try:
        body = client.post("/pay", json={"order_id": "D-004", "amount_cents": 700}).json()
        assert body["receipt"]["provider"] == "fake-gateway"  # 无参替身照常生效
    finally:
        app.dependency_overrides.clear()
    after = counters()
    # 整体置换: 框架只按替身自己的参数表求解, 原签名的子依赖链不参与解析
    assert after["config_resolved"] == before["config_resolved"]


# --- [5] clear(): 清空这本字典, 请求立刻回到"没有替身"的真实世界 --------------
def test_05_clear_restores_real(client, fake_gateway, counters):
    app.dependency_overrides[get_payment_gateway] = lambda: fake_gateway
    body = client.post("/pay", json={"order_id": "E-005", "amount_cents": 300}).json()
    assert body["receipt"]["provider"] == "fake-gateway"   # 替换期: 假网关

    app.dependency_overrides.clear()
    assert app.dependency_overrides == {}                  # dict 已空, 回到初始状态

    before = counters()
    body = client.post("/pay", json={"order_id": "E-006", "amount_cents": 400}).json()
    assert body["receipt"]["provider"] == "real-gateway"   # clear 后: 真网关回岗
    after = counters()
    assert after["charge"] == before["charge"] + 1         # 真扣款重新发生


# --- [6] 项目惯例: autouse fixture 托管注册与清理(autouse = 自动作用于本类) ----
class TestAutouseBlueprint:
    """生产写法: fixture 里 yield 前注册、yield 后 clear —— pytest 保证断言失败
    也会执行 yield 之后的清理代码, "忘 clear 污染其他测试"由此根治。实际项目把
    fixture 放进 conftest.py, 用类/目录作用域圈住需要替身的用例。"""

    @pytest.fixture(autouse=True)
    def fake_gw(self, fake_gateway):
        app.dependency_overrides[get_payment_gateway] = lambda: fake_gateway
        yield fake_gateway          # 测试体在 yield 期间运行
        app.dependency_overrides.clear()

    def test_06_autouse_registers(self, client, fake_gw):
        """测试体里没有一行 override 代码, 替身已由 fixture 静默挂上。"""
        body = client.post("/pay", json={"order_id": "F-007", "amount_cents": 800}).json()
        assert body["receipt"]["provider"] == "fake-gateway"
        assert fake_gw.charge_calls == 1

    def test_06_fresh_fake_each_test(self, client, fake_gw):
        """函数级 fake_gateway fixture: 本测试拿到全新替身, 无上一测试的计数残留。"""
        body = client.post("/pay", json={"order_id": "F-008", "amount_cents": 900}).json()
        assert fake_gw.charge_calls == 1  # 只执行了本测试这一次


# --- 回归检查: [6] 的 autouse 限定在类作用域, 模块级用例不受任何残留影响 -------
def test_07_no_leak_after_blueprint(client, counters):
    """pytest 按定义顺序执行: 类内 fixture 的 teardown 已跑完, 这里必须干干净净。"""
    assert app.dependency_overrides == {}                     # 无残留注册
    body = client.post("/pay", json={"order_id": "G-009", "amount_cents": 1000}).json()
    assert body["receipt"]["provider"] == "real-gateway"      # 真网关回岗
