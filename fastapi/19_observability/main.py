"""lab 19 · 中间件与可观测性 —— 演示应用：订单 API。

两个 @app.middleware("http") 中间件按注册顺序叠成洋葱，演示三件事：

    1. request_id 贯穿：外层中间件生成 uuid 短码 -> 写入 contextvar ->
       日志每行带 [request_id] -> 响应头 X-Request-ID 回显给调用方；
    2. 耗时测量：内层中间件用 perf_counter 包住 call_next，
       耗时写进响应头 X-Process-Time-ms；
    3. 洋葱顺序：两个中间件各在进入/离开时打印标记行——
       注册顺序 timing -> rid（后注册的在更外层），
       实测进入 rid -> timing、离开 timing -> rid。

端点一览：
    GET /orders   订单列表：从 contextvar 读回 request_id 放进响应体
    GET /slow     慢端点：await asyncio.sleep(0.3)，给耗时断言提供下限
    GET /healthz  健康检查：演示脚本的 readiness 探测

运行（由 19_observability.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/19_observability --host 127.0.0.1 --port 8919
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from contextvars import ContextVar
from typing import Any

from fastapi import FastAPI, Request
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

# ---------------------------------------------------------------------------
# 日志装置：logging 的格式化字符串拿不到 request_id（它属于请求上下文，
# 不是全局状态），所以全应用统一走 req_log()：每行手动带上"当前请求"的 id
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("lab19")

# request_id 放进 ContextVar（contextvars：每个 asyncio 任务一份独立拷贝的变量存储）。
# 并发请求各自 set 自己的值、互不串号——这是它能安全"贯穿"单条请求的前提。
# 为什么不用普通全局变量：全局的 _request_id = "..." 是全进程一份，
# 并发时后到的请求会覆盖先到的，日志里张冠李戴；ContextVar 以任务为单位隔离，
# 每个 await 点之间读到的都是自己这份。
_request_id: ContextVar[str] = ContextVar("request_id", default="-")


def req_log(message: str) -> None:
    """统一日志函数：每行以 [request_id] 开头，服务端日志因此能按请求串起来。

    中间件与端点函数都调它而不是直接调 log——调用方不必关心 id 存在哪，
    从 contextvar 里 get 一下，拿到的就是当前正在处理的这条请求的 id。
    排障路径因此定型：客户端报 404 -> 附上 X-Request-ID -> 服务端
    grep 这个 id，这一次请求的全部日志行（中间件/端点/错误）一次捞出。
    """
    log.info("[%s] %s", _request_id.get(), message)


# ---------------------------------------------------------------------------
# 应用与演示数据
# ---------------------------------------------------------------------------
ORDERS: list[dict[str, Any]] = [
    {"id": "SO-1001", "item": "机械键盘", "qty": 2},
    {"id": "SO-1002", "item": "USB-C 扩展坞", "qty": 1},
    {"id": "SO-1003", "item": "显示器支架", "qty": 3},
]

app = FastAPI(
    title="lab19 · 中间件与可观测性",
    description="洋葱模型、contextvars 贯穿 request_id、X-Process-Time-ms 耗时测量",
)


# ---------------------------------------------------------------------------
# 注册顺序与洋葱层次："后注册的在更外层"。add_middleware 用 insert(0) 把
# 新中间件插到 user_middleware 列表头，build_middleware_stack 再 reversed
# 依次包起来——两步合成"后注册在外"。要让 request_id 当最外层，就把它的
# @app.middleware 写在后面（timing 先注册、rid 后注册），实测顺序：
#   进入：rid-in -> timing-in -> 端点函数
#   离开：端点函数 -> timing-out -> rid-out
# 完整的洋葱还不止这两层：Starlette（FastAPI 底层框架）自己还包了
# ServerErrorMiddleware（500 兜底，最外）与 ExceptionMiddleware（异常翻译，
# 路由内侧），它们不占 @app.middleware 的注册位，但顺序事实一致。
# ---------------------------------------------------------------------------
# 中间件 1/2（先注册 -> 内层）：耗时测量
@app.middleware("http")
async def timing_middleware(
    request: Request, call_next: RequestResponseEndpoint
) -> Response:
    """perf_counter 包住 call_next：量出更里面全部层的总耗时。

    perf_counter 是单调高精度时钟（只前进、不随系统对时回拨），测耗时的标准选择；
    它量的是 call_next 内侧的总和——端点函数 + 更内层中间件，不含本层之外的开销。
    """
    req_log("[timing-in]  内层中间件进入：开始计时")
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["x-process-time-ms"] = f"{elapsed_ms:.1f}"
    req_log(f"[timing-out] 内层中间件离开：本次请求共耗时 {elapsed_ms:.1f}ms")
    return response


# 中间件 2/2（后注册 -> 外层）：request_id 的生成、贯穿与回显
@app.middleware("http")
async def request_id_middleware(
    request: Request, call_next: RequestResponseEndpoint
) -> Response:
    """每个请求最先进出的层：生成 id、写 contextvar，响应时回显到响应头。

    @app.middleware("http") 是 BaseHTTPMiddleware 的装饰器写法：
    函数签名固定为 (request, call_next)，call_next 代表洋葱里更里面的全部层。
    """
    rid = uuid.uuid4().hex[:12]  # 12 位短码：够区分请求，日志里也不占地方
    _request_id.set(rid)         # 此后同一条请求链上的任何代码都能 get 到它
    req_log("[rid-in]  外层中间件进入：request_id 已生成并写入 contextvar")
    response: Response = await call_next(request)
    response.headers["x-request-id"] = rid
    req_log("[rid-out] 外层中间件离开：X-Request-ID 已写入响应头")
    return response


# ---------------------------------------------------------------------------
# 端点
# ---------------------------------------------------------------------------
@app.get("/orders")
async def list_orders() -> dict[str, Any]:
    """订单列表：从 contextvar 读回 request_id 放进响应体。

    证明"贯穿"不只是响应头回显：链上任何一层（依赖、端点函数、后台任务）
    读 contextvar，拿到的都是当前这条请求自己的 id。
    """
    req_log("端点函数 list_orders 处理中：从 contextvar 读 request_id 放进响应体")
    return {"orders": ORDERS, "count": len(ORDERS), "request_id": _request_id.get()}


@app.get("/slow")
async def slow() -> dict[str, Any]:
    """慢端点：await asyncio.sleep(0.3)，给耗时断言提供确定性的下限。

    X-Process-Time-ms 量的是整个 call_next，所以它必然 >= 300ms——
    sleep 的 0.3s 是端点函数贡献的，计时器在外侧把它一并量了进去。
    """
    req_log("端点函数 slow 进入：await asyncio.sleep(0.3) 模拟慢下游")
    await asyncio.sleep(0.3)
    req_log("端点函数 slow 返回")
    return {"message": "slow done", "request_id": _request_id.get()}


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    """健康检查：演示脚本起服务后的 readiness 探测打这里。"""
    return {"status": "ok"}
