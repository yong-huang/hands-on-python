"""lab 04 · 错误处理体系 —— 演示应用：库存扣减 API。

四条错误路径共用同一个 JSON 信封（code / message / details / request_id）：

    1. 业务异常 InventoryShortage -> exception_handler(InventoryShortage)    -> 409
    2. HTTPException(404)         -> exception_handler(StarletteHTTPException) -> 404
    3. 请求校验失败              -> exception_handler(RequestValidationError)  -> 422（保留 loc）
    4. 未捕获异常 /boom          -> exception_handler(Exception) 兜底          -> 500（堆栈只进日志）

运行（由 04_error_handling.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/04_error_handling --host 127.0.0.1 --port 8904
环境变量 APP_DEBUG=1 时以 FastAPI(debug=True) 启动，用于对比 500 的输出差异。
"""

from __future__ import annotations

import logging
import os
import uuid
from contextvars import ContextVar
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

# ---------------------------------------------------------------------------
# 日志：每个 handler 打一行日志，说明"走到了哪一层"（见 demo 时的 server.log）
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("lab04")

# request_id 放进 contextvar：请求处理链上任何一层（含 500 兜底 handler）都能读到。
# ContextVar 是"每任务独立"的变量，等价于给每个请求一份私有存储。
_request_id: ContextVar[str] = ContextVar("request_id", default="-")


def envelope(code: str, message: str, details: Any = None) -> dict[str, Any]:
    """统一错误信封：本应用所有错误响应的唯一结构。"""
    return {"code": code, "message": message, "details": details, "request_id": _request_id.get()}


def err(status_code: int, code: str, message: str, details: Any = None) -> JSONResponse:
    """按信封结构生成 JSONResponse，避免每个 handler 各拼一遍 dict。"""
    return JSONResponse(status_code=status_code, content=envelope(code, message, details))


# 内存库存表：demo 专用，进程重启即复位
STOCK: dict[str, int] = {"A1001": 10, "B2002": 0, "C3003": 5}


class InventoryShortage(Exception):
    """业务异常：库存不足。

    sku / short 是业务字段，handler 靠它们组装 details。
    业务字段挂在异常对象上而不是拼进 message 字符串，调用方才好做程序化分支。
    """

    def __init__(self, sku: str, short: int) -> None:
        self.sku = sku
        self.short = short
        super().__init__(f"库存不足：{sku} 还差 {short} 件")


class DeductIn(BaseModel):
    """扣减请求体：qty 必须为正数，qty=-1 会触发校验错误（422 路径）。"""

    sku: str = Field(min_length=1, description="商品 SKU")
    qty: int = Field(gt=0, le=999, description="扣减数量，必须为正")


class DeductOut(BaseModel):
    sku: str
    deducted: int
    remaining: int
    request_id: str


class StockOut(BaseModel):
    sku: str
    stock: int
    request_id: str


# APP_DEBUG=1 时以 FastAPI(debug=True) 启动：500 会走 Starlette 调试页而非信封
debug_mode: bool = os.environ.get("APP_DEBUG", "0") == "1"
app = FastAPI(
    title="lab04 · 错误处理体系",
    debug=debug_mode,
    description="四条错误路径，一个统一信封：code/message/details/request_id",
)


# ---------------------------------------------------------------------------
# 中间件：生成 request_id，贯穿所有响应（成功响应回显在头里，错误写进信封里）
# ---------------------------------------------------------------------------
@app.middleware("http")
async def request_id_middleware(request: Request, call_next: RequestResponseEndpoint) -> Response:
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    _request_id.set(rid)
    log.info("[middleware] rid=%s %s %s", rid, request.method, request.url.path)
    # 注意：这里故意不做 contextvar 复位（token.reset）——500 兜底 handler 在
    # 中间件栈"外层"执行，异常向上穿越之后才被调用；若在 finally 里复位，
    # request_id 会先被擦掉。uvicorn 为每个请求开独立 task，不复位也不会串号。
    response: Response = await call_next(request)
    response.headers["x-request-id"] = rid
    return response


# ---------------------------------------------------------------------------
# 端点：三条正常路径 + 一条必炸路径。端点只管 raise，不管错误长什么样。
# ---------------------------------------------------------------------------
@app.get("/inventory/{sku}", response_model=StockOut)
async def get_stock(sku: str) -> StockOut:
    if sku not in STOCK:
        log.info("[路由层] 未命中 SKU %s -> raise HTTPException(404)", sku)
        raise HTTPException(status_code=404, detail=f"SKU {sku} 不存在")
    return StockOut(sku=sku, stock=STOCK[sku], request_id=_request_id.get())


@app.post("/inventory/deduct", response_model=DeductOut)
async def deduct(body: DeductIn) -> DeductOut:
    current = STOCK.get(body.sku)
    if current is None:
        log.info("[路由层] 未命中 SKU %s -> raise HTTPException(404)", body.sku)
        raise HTTPException(status_code=404, detail=f"SKU {body.sku} 不存在")
    if current < body.qty:
        # 业务规则失败抛"业务异常"，与程序故障（500）在语义上分层
        log.info("[路由层] 库存不足 %s：有 %d 要 %d -> raise InventoryShortage", body.sku, current, body.qty)
        raise InventoryShortage(sku=body.sku, short=body.qty - current)
    STOCK[body.sku] = current - body.qty
    return DeductOut(sku=body.sku, deducted=body.qty, remaining=STOCK[body.sku], request_id=_request_id.get())


@app.get("/boom")
async def boom() -> None:
    """没有任何注册 handler 声明能接 RuntimeError：用于观察 500 的兜底路径。"""
    raise RuntimeError("boom：模拟下游服务超时（未捕获异常）")


# ---------------------------------------------------------------------------
# 异常处理器注册表：按"异常类型的继承链"匹配（MRO），与注册顺序无关。
# ---------------------------------------------------------------------------
@app.exception_handler(InventoryShortage)
async def shortage_handler(request: Request, exc: InventoryShortage) -> JSONResponse:
    """业务异常 -> 409 信封。状态码由 handler 决定，异常本身不带状态码。"""
    log.info("[handler·业务异常] InventoryShortage(sku=%s, short=%d) -> 409 信封", exc.sku, exc.short)
    return err(409, "INVENTORY_SHORTAGE", str(exc), {"sku": exc.sku, "short": exc.short})


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """覆盖默认的 {"detail": ...} 结构。FastAPI 的 HTTPException 是
    StarletteHTTPException 的子类，按继承链匹配自然落到这里，404 无需单独注册。"""
    log.info("[handler·HTTP异常] HTTPException(%d) -> 信封（headers 原样保留）", exc.status_code)
    code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
    # headers 必须透传：401 场景下 WWW-Authenticate 就靠它带出去
    return JSONResponse(status_code=exc.status_code, content=envelope(code, str(exc.detail)), headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """覆盖默认 422：pydantic 的 loc/msg/type 保留进 details，外壳换成信封。
    前端只学一种错误格式，又不会丢"错在哪个字段"的信息。"""
    log.info("[handler·校验异常] RequestValidationError(%d 处) -> 422 信封（保留 loc）", len(exc.errors()))
    details = [
        {
            "loc": list(item.get("loc", [])),
            "msg": str(item.get("msg", "")),
            "type": str(item.get("type", "")),
        }
        for item in exc.errors()
    ]
    return err(422, "VALIDATION_ERROR", "请求参数不合法", details)


@app.exception_handler(Exception)
async def fallback_500_handler(request: Request, exc: Exception) -> JSONResponse:
    """注册 Exception 等于接管 ServerErrorMiddleware 的兜底 handler：
    客户端拿到信封、看不到任何堆栈；traceback 由 uvicorn 记进服务端日志。"""
    log.info("[兜底·ServerErrorMiddleware] 未捕获 %s -> 500 信封（堆栈只进日志）", type(exc).__name__)
    return err(500, "INTERNAL_ERROR", "服务器内部错误，请稍后重试（详情见服务端日志）")
