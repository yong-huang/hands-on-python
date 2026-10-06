"""lab 07 · yield 依赖与生命周期 —— 演示应用：事务边界 API。

两个 yield 依赖（函数体里带 yield 的依赖函数，yield 之前是 setup、之后是 teardown）
叠加在订单端点上，把完整的生命周期记录进进程内事件列表：

    POST /orders                 正常路径：tx BEGIN -> 端点 -> COMMIT，audit 记录 teardown
    POST /boom                   端点抛 HTTPException(418)：异常从 yield 点穿回生成器，
                                 事务走 ROLLBACK 而非 COMMIT（实测：错误响应要等 teardown
                                 跑完才发出，本实验里被 audit 的 0.5s sleep 拖住）
    GET  /trace                  返回事件列表与时间戳并清空（demo 断言用）
    GET  /teardown-crash         teardown 里抛 RuntimeError：实测客户端照常收到 200，
                                 异常只出现在服务端日志（uvicorn 打印 ASGI 应用异常）
    GET  /teardown-crash-on-error 同上但端点先抛 418：实测 teardown 异常会顶掉业务异常，
                                 客户端收到 500 Internal Server Error（纯文本）

本机实测结论（fastapi 0.142.2 / starlette 1.7.0 / Python 3.13.9）：
  1. 正常路径 teardown 在响应发送之后执行（audit 的 sleep 不拖慢响应，只推迟事件记录）；
  2. 端点抛异常时 teardown 在错误响应发送之前执行（异常必须先穿越 yield 点，
     才能到达异常中间件——即把异常翻译成错误响应的那一层）；
  3. teardown 抛异常改不了已发出的响应：客户端看不到任何异样，异常进服务端日志；
  4. 若端点本身抛了异常、teardown 又抛异常，客户端收到 500 而非业务错误——
     teardown 异常会顶掉业务异常。

EVENTS / TIMES 是演示用的进程内可变状态，多 worker 部署时每个进程各一份，见 README。
运行（由 07_yield_dependencies.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/07_yield_dependencies --host 127.0.0.1 --port 8907
"""

from __future__ import annotations

import asyncio
import itertools
import time
from typing import Annotated, Any, AsyncIterator

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# 事件记录：进程内可变状态，仅供演示与断言。/trace 读取后清空，保证 demo 可重复跑。
# 两个列表按下标对齐：EVENTS[i] 是标签，TIMES[i] 是 time.time() 的记录时刻。
# ---------------------------------------------------------------------------
EVENTS: list[str] = []
TIMES: list[float] = []

# audit teardown 的停顿：让"teardown 在响应之后才跑"变得肉眼可见、可断言。
# 0.5s 远大于本机请求耗时（约 10ms），又短到不拖慢 demo 节奏。
AUDIT_DELAY = 0.5

# 事务序号：给每个事务一个可读的编号，仅用于展示。
_tx_seq = itertools.count(1)


def record(label: str) -> None:
    """记录一条生命周期事件：标签 + 墙钟时刻（与响应里的 responded_at 同一时钟）。"""
    EVENTS.append(label)
    TIMES.append(time.time())


# ---------------------------------------------------------------------------
# 依赖一：伪事务。yield 前 BEGIN；yield 后按"端点是否抛过异常"分流 COMMIT / ROLLBACK。
# 关键写法：yield 放在 try 里，except 捕获的就是"从端点一路穿回来的那个异常"，
# 记录 ROLLBACK 后必须 raise 原样抛出——吞掉它会让 FastAPI 把请求当成功处理。
# ---------------------------------------------------------------------------
async def transaction() -> AsyncIterator[str]:
    tx_id = f"tx#{next(_tx_seq)}"
    record("tx:begin")
    try:
        yield tx_id  # 端点函数在这两行之间运行
    except BaseException:
        # 端点抛出的任何异常（含 HTTPException）都会从 yield 点抛进本生成器
        record("tx:rollback")
        raise
    else:
        # 走到这里说明端点正常返回；注意此刻响应通常已经发送完毕（见 README）
        record("tx:commit")


# ---------------------------------------------------------------------------
# 依赖二：审计。teardown 无条件写 audit:teardown（try/finally 保证异常路径也执行），
# 并故意 sleep：正常路径下它发生在响应之后，异常路径下它拖慢错误响应——两条都能实测。
# ---------------------------------------------------------------------------
async def audit() -> AsyncIterator[str]:
    record("audit:setup")
    try:
        yield "audit"
    finally:
        await asyncio.sleep(AUDIT_DELAY)  # 模拟"写审计日志"的耗时；也放大时序差异
        record("audit:teardown")


# ---------------------------------------------------------------------------
# 依赖三：易碎清理。teardown 里故意抛 RuntimeError，用于实测 teardown 异常的行为。
# yield 放在 try/finally 里：异常路径下 finally 也必须执行，实验才成立。
# ---------------------------------------------------------------------------
async def fragile_cleanup() -> AsyncIterator[str]:
    try:
        yield "fragile"
    finally:
        raise RuntimeError("cleanup failed in teardown (lab07 实验性异常)")


TxDep = Annotated[str, Depends(transaction)]
AuditDep = Annotated[str, Depends(audit)]
FragileDep = Annotated[str, Depends(fragile_cleanup)]


class OrderIn(BaseModel):
    """POST /orders 的请求体：两个字段都有限制，校验失败会得到 422。"""

    item: str = Field(min_length=1, max_length=30, description="商品名")
    qty: int = Field(ge=1, le=99, description="数量，1~99")


async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """启动时清空事件列表：demo 反复跑时断言依赖确定的初始状态。"""
    EVENTS.clear()
    TIMES.clear()
    yield


app = FastAPI(
    title="lab07 · yield 依赖与生命周期",
    lifespan=lifespan,
    description="yield 依赖的 setup/teardown 时机、异常穿越 yield 点、teardown 异常的实测行为",
)


# ---------------------------------------------------------------------------
# [A] 正常路径：依赖声明顺序 transaction 在前、audit 在后。
# setup 顺序：tx:begin -> audit:setup；teardown 顺序（后进先出）：audit:teardown -> tx:commit。
# ---------------------------------------------------------------------------
@app.post("/orders")
async def create_order(body: OrderIn, tx: TxDep, _audit: AuditDep) -> dict[str, Any]:
    # tx 参数的值就是 transaction() yield 出去的编号；端点函数体运行在
    # "所有依赖的 setup 之后、任何一个 teardown 之前"这个窗口里
    return {
        "order": {"item": body.item, "qty": body.qty, "total": body.qty * 10},
        "tx": tx,
        # responded_at 是构建响应对象的时刻，demo 用它对照 teardown 的记录时刻
        "responded_at": time.time(),
    }


# ---------------------------------------------------------------------------
# [B] 异常路径：端点抛 HTTPException(418)。
# 实测时序：异常先穿回两个生成器（audit:teardown、tx:rollback 都在错误响应之前记录），
# 然后异常中间件才把 HTTPException 翻译成 418 响应——客户端测到的耗时 >= AUDIT_DELAY。
# ---------------------------------------------------------------------------
@app.post("/boom")
async def boom(tx: TxDep, _audit: AuditDep) -> dict[str, Any]:
    raise HTTPException(status_code=418, detail=f"boom: 订单在事务 {tx} 中失败")


# ---------------------------------------------------------------------------
# [C] 事件出口：返回记录并清空。demo 每个章节结束都来读一次，断言顺序。
# ---------------------------------------------------------------------------
@app.get("/trace")
async def trace() -> dict[str, Any]:
    events, times = list(EVENTS), list(TIMES)
    EVENTS.clear()
    TIMES.clear()
    return {"events": events, "times": times}


# ---------------------------------------------------------------------------
# [D] teardown 异常实验一：端点成功、teardown 抛 RuntimeError。
# 实测：客户端照常收到 200 和完整响应体；uvicorn 在响应发送后继续跑 teardown，
# 异常沿 ASGI 调用链冒到服务器，日志出现 "Exception in ASGI application" 与 traceback。
# ---------------------------------------------------------------------------
@app.get("/teardown-crash")
async def teardown_crash(fragile: FragileDep) -> dict[str, Any]:
    return {"ok": True, "fragile": fragile, "note": "本响应送达后，teardown 将抛 RuntimeError"}


# ---------------------------------------------------------------------------
# [E] teardown 异常实验二：端点先抛 418、teardown 再抛 RuntimeError。
# 实测：客户端收到 500 Internal Server Error（纯文本）而非 418 JSON——
# finally 里抛出的 RuntimeError 顶掉了业务异常，成为最终到达中间件的异常。
# ---------------------------------------------------------------------------
@app.get("/teardown-crash-on-error")
async def teardown_crash_on_error(fragile: FragileDep) -> dict[str, Any]:
    raise HTTPException(status_code=418, detail="业务异常（将被 teardown 异常顶掉）")
