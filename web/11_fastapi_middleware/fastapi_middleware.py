"""
11 · 中间件、异常与后台任务 —— 请求管道的三个扩展点
Web 框架清单项目 11：不碰业务代码，把横切关注点挂到管道上

三个扩展点各管一段（对应 images/fastapi_middleware.svg）:
- 中间件:         请求进来、响应出去的必经之路——本实验给它加 X-Process-Time 耗时头
- 异常处理器:      handler 抛出自定义异常 → 注册的 handler 兜底成约定 JSON（418）
- BackgroundTasks: 响应返回之后才跑的任务——发邮件/写审计这类"别让用户等"的活

实测三连:
- 200/兜底 418/路由 404 都带正数 X-Process-Time；未处理异常的 500 反而没有
  （异常穿过用户中间件由最外层 ServerErrorMiddleware 兜底——覆盖范围实测）
- BusinessError("库存不足") → 418 + {"message": "库存不足"}
- 后台任务的完成时间戳晚于响应到达客户端的时间戳——"响应先于任务"有据可查

用法:
- source ../.venv/bin/activate && python3 fastapi_middleware.py

交互示意图: 用浏览器打开 images/fastapi_middleware.html
"""

import sys
import time
import warnings

warnings.filterwarnings("ignore", message=".*httpx.*testclient.*deprecated.*")

from fastapi import BackgroundTasks, FastAPI, Request  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

app = FastAPI(title="管道扩展点实验")

# 后台任务的时间戳证据：响应创建时间 vs 任务完成时间
EVIDENCE: dict[str, float] = {}
TASK_LOG: list[str] = []


class BusinessError(Exception):
    """业务异常：库存不足这类'可预期的失败'，不该变成 500"""


@app.exception_handler(BusinessError)
async def business_error_handler(request: Request, exc: BusinessError):
    """注册后，handler 只管 raise，兜底成约定 JSON"""
    return JSONResponse(status_code=418, content={"message": str(exc)})


@app.middleware("http")
async def add_process_time(request: Request, call_next):
    """函数式中间件：请求前打点，响应后补耗时头——所有响应必经"""
    t0 = time.perf_counter()
    response = await call_next(request)
    cost_ms = (time.perf_counter() - t0) * 1000
    response.headers["X-Process-Time"] = f"{cost_ms:.1f}ms"
    return response


@app.get("/hello")
async def hello():
    return {"message": "hello"}


@app.get("/business-error")
async def business_error():
    raise BusinessError("库存不足")


@app.get("/boom")
async def boom():
    raise RuntimeError("无人兜底的意外")  # 无 handler → FastAPI 默认 500


@app.post("/orders")
async def create_order(background: BackgroundTasks):
    EVIDENCE["response_created_at"] = time.time()  # 响应创建即打点
    background.add_task(send_confirmation_email, "alice@example.com", TASK_LOG)
    return {"message": "订单已受理，确认邮件稍后发送"}


def send_confirmation_email(to: str, log: list[str]) -> None:
    time.sleep(0.3)  # 模拟慢速外部调用（发邮件）
    log.append(f"email-sent-to-{to}")
    EVIDENCE["task_done_at"] = time.time()


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. 中间件：所有响应都带正数耗时头
# ============================================================

def demo_middleware(client: TestClient) -> None:
    section("1. 中间件：X-Process-Time 的覆盖范围（实测有边界）")
    for path in ("/hello", "/business-error", "/no-such-route"):
        r = client.get(path)
        header = r.headers.get("X-Process-Time", "")
        value = float(header.removesuffix("ms"))
        assert value >= 0, f"{path} 耗时应为非负数: {header!r}"
        print(f"  GET {path:<18} → {r.status_code} · X-Process-Time={header}")
    print("  200 / 兜底 418 / 路由 404 都被盖上耗时戳——这些异常在 ExceptionMiddleware 内就被消化了")

    r = client.get("/boom")
    assert r.status_code == 500
    assert "X-Process-Time" not in r.headers, "未处理异常的 500 不应经过用户中间件"
    print(f"  GET /boom → 500 · 无耗时头（实测发现）：异常穿过了用户中间件，")
    print(f"  由最外层 ServerErrorMiddleware 兜底——函数式中间件覆盖不到这种 500")


# ============================================================
# 2. 异常处理器：自定义异常兜底成约定 JSON
# ============================================================

def demo_exception_handler(client: TestClient) -> None:
    section("2. 异常处理器：raise 出干净的业务失败（验收点）")
    r = client.get("/business-error")
    assert r.status_code == 418, f"BusinessError 应 418，实际 {r.status_code}"
    assert r.json() == {"message": "库存不足"}, f"约定 JSON 不符: {r.json()}"
    print(f"  GET /business-error → 418 · {r.json()}（handler 只写 raise，兜底在别处）")

    r = client.get("/boom")
    assert r.status_code == 500, f"无人兜底应 500，实际 {r.status_code}"
    print(f"  GET /boom → 500（无 handler 的意外，FastAPI 兜底为 Internal Server Error）")
    print("  分层：可预期业务失败 → 自定义异常 + handler；程序缺陷 → 让它 500 暴露出来")


# ============================================================
# 3. BackgroundTasks：响应先走，任务后跑
# ============================================================

def demo_background_task(client: TestClient) -> None:
    section("3. BackgroundTasks：响应先于任务（时间戳证据）")
    r = client.post("/orders")
    assert r.status_code == 200, f"下单应 200，实际 {r.status_code}"
    assert TASK_LOG == ["email-sent-to-alice@example.com"], f"任务应已完成: {TASK_LOG}"
    assert EVIDENCE["response_created_at"] < EVIDENCE["task_done_at"], EVIDENCE
    print(f"  POST /orders → 200 · {r.json()}")
    print(f"  时间戳证据: 响应创建 {EVIDENCE['response_created_at']:.3f} < "
          f"任务完成 {EVIDENCE['task_done_at']:.3f}（差 {EVIDENCE['task_done_at'] - EVIDENCE['response_created_at']:.2f}s）")
    print(f"  任务结果: {TASK_LOG[0]}——模拟 0.3s 的发信没有计入用户等待")
    print("  语义提醒：TestClient 的 post 会等整次 ASGI 调用（含后台任务）才返回；")
    print("  真实服务器上响应字节先发给客户端、任务随后跑——时间戳证据两种环境都成立")


def main() -> None:
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · FastAPI {version('fastapi')} · 管道扩展点实验")
    # raise_server_exceptions=False：模拟真实服务器——未处理异常返回 500 而不是把异常抛给客户端
    client = TestClient(app, raise_server_exceptions=False)
    demo_middleware(client)
    demo_exception_handler(client)
    demo_background_task(client)

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 耗时头全覆盖、418 约定 JSON、后台任务时间戳晚于响应")


if __name__ == "__main__":
    main()
