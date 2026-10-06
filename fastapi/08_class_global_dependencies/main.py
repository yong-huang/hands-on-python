"""lab 08 · 类依赖与全局依赖 —— 演示应用：管理后台 API。

三层挂载 + 两类类依赖的"管理后台"小服务：

    app 级全局依赖   FastAPI(dependencies=[Depends(track_request)])
                     任何请求（含 /docs、被 403/429 拒掉的）都先经过：计数 +1，开出 trace 记录
    router 级依赖    APIRouter(dependencies=[Depends(require_api_key)])
                     /admin 下所有路由共享一次 X-API-Key 校验，端点函数不再重复写
    端点级依赖       Annotated[None, Depends(...)] 写在端点参数里，只作用于单条路由

    RateLimitGuard   可配置的限流守卫：import 时实例化定上限，__call__ 按 IP 进程内计数，超限 429
    Pagination       分页参数包：类本身交给 Depends，FastAPI 每请求按 query 现场实例化

    GET /admin/trace   回显本请求三层依赖的真实执行顺序：["global", "router", "endpoint"]
    GET /admin/stats   全局请求数 + 两个守卫各自的计数表（含被 429 拒掉的尝试）

所有状态都是进程内变量：uvicorn 重启即归零。demo 由 08_class_global_dependencies.sh
每次自行起服务，断言依赖这个"从零开始"；用 start 手动起服务时，计数会跨请求累积。
运行（由 08_class_global_dependencies.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/08_class_global_dependencies --host 127.0.0.1 --port 8908
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query, Request

# ---------------------------------------------------------------------------
# 进程内全局状态：模块级变量与应用同生共死，重启归零
# ---------------------------------------------------------------------------
API_KEY = "lab08-admin-key"  # router 级依赖校验的凭证，demo 里经 X-API-Key 请求头携带
REQUEST_COUNT = 0            # app 级依赖维护的全局请求数：被 403/429 拒掉的也计数


# ---------------------------------------------------------------------------
# [A] 类依赖一：限流守卫。挂载方式是"实例依赖"——Depends(RateLimitGuard(limit=2))。
# 括号里的 RateLimitGuard(limit=2) 在 import 时求值一次：实例只创建这一个，被模块级
# 变量长期持有，于是 self.counts 跨请求累积。FastAPI 每请求调用一次实例的 __call__
# （可调用协议：定义了 __call__ 的实例能像函数一样被调用），返回值 None 没人接收——
# 挂载位置只认副作用："放行，或抛 429"。
# ---------------------------------------------------------------------------
class RateLimitGuard:
    """按 IP 计数的限流守卫：__init__ 收配置，__call__ 收请求。"""

    def __init__(self, limit: int, name: str = "guard") -> None:
        self.limit = limit  # 实例化时定死上限：同一个类，不同端点可以配不同的数
        self.name = name    # 用于 429 文案与 /admin/stats 的展示
        self.counts: dict[str, int] = {}  # ip -> 累计请求数（含被拒的），跨请求存活

    def __call__(self, request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        self.counts[ip] = self.counts.get(ip, 0) + 1
        if self.counts[ip] > self.limit:
            raise HTTPException(
                status_code=429,
                detail=f"IP {ip} 第 {self.counts[ip]} 次请求，超过 {self.name} 守卫的上限 {self.limit}",
            )


# 两个"调好参数"的守卫实例：同一个类、不同配置，计数表互不相通（demo [2] 断言）
HEAVY_GUARD = RateLimitGuard(limit=2, name="heavy")
REPORT_GUARD = RateLimitGuard(limit=5, name="reports")


# ---------------------------------------------------------------------------
# [B] 类依赖二：分页参数包。挂载方式是"类依赖"——Depends(Pagination) 传的是类本身。
# FastAPI 读 __init__ 的参数签名（去掉 self），把 q/size 当 query 参数解析
# （Annotated 里的 ge/le 校验照常生效），每请求现场实例化，实例就是注入值。
# 与 RateLimitGuard 相反：实例是每请求新建的，属性天然只属于本请求。
# ---------------------------------------------------------------------------
class Pagination:
    """q/size 从 query 取值收进 self，端点里当普通对象用。"""

    def __init__(
        self,
        q: Annotated[int, Query(ge=1, description="页码，从 1 起")] = 1,
        size: Annotated[int, Query(ge=1, le=50, description="每页条数，1~50")] = 10,
    ) -> None:
        self.q = q
        self.size = size

    def slice_of(self, items: list[str]) -> list[str]:
        """按当前页切一片：1 起算的页码换算成 0 起算的偏移。"""
        start = (self.q - 1) * self.size
        return items[start : start + self.size]


# ---------------------------------------------------------------------------
# [C] 三层挂载的依赖函数。dependencies 列表只认副作用：返回值被框架丢弃，
# 所以它们把要传下去的信息写进 request.state（每请求一份的属性包）与模块级计数。
# ---------------------------------------------------------------------------
async def track_request(request: Request) -> None:
    """app 级全局依赖：本应用收到的每个请求都先过这里（含 /docs 与被拒的请求）。"""
    global REQUEST_COUNT
    REQUEST_COUNT += 1
    request.state.trace = ["global"]  # 本请求的执行顺序记录，从最外层开始


async def require_api_key(
    request: Request,
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> None:
    """router 级依赖：/admin 下所有路由共享的鉴权，校验失败 403，请求到不了端点函数。"""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="缺少或错误的 X-API-Key 头，/admin 区域需要凭证")
    request.state.trace.append("router")  # 校验通过才记账：403 的 trace 停在 ["global"]


async def record_endpoint(request: Request) -> None:
    """端点级依赖：只挂在 /admin/trace 一条路由上，补上顺序记录的第三格。"""
    request.state.trace.append("endpoint")


# ---------------------------------------------------------------------------
# [D] 应用与路由器：三层挂载在构造参数里一次声明，端点函数零重复
# ---------------------------------------------------------------------------
app = FastAPI(
    title="lab08 · 类依赖与全局依赖",
    description="类依赖（配置与行为同体）、router 级批量挂载、app 级全局依赖与真实执行顺序",
    dependencies=[Depends(track_request)],  # 第 1 层：全局，先于一切路由与路由器依赖
)

router = APIRouter(
    prefix="/admin",
    dependencies=[Depends(require_api_key)],  # 第 2 层：/admin 整组路由共用
)

FAKE_ITEMS = [f"item-{i:02d}" for i in range(1, 21)]  # 20 条假数据，供分页端点切窗


# ---------------------------------------------------------------------------
# [E] 路由。端点级依赖（第 3 层）写在各自参数里
# ---------------------------------------------------------------------------
@router.get("/items")
async def list_items(
    page: Annotated[Pagination, Depends(Pagination)],  # 完整式：实例注入，属性随便用
    _unused: Annotated[None, Depends(Pagination)],     # 简写式：Annotated[None, Depends(...)] 声明"不用返回值"
) -> dict[str, Any]:
    # 依赖缓存：同一请求内同一可调用只实例化一次，两个参数拿到的是同一个实例
    return {
        "q": page.q,
        "size": page.size,
        "total": len(FAKE_ITEMS),
        "items": page.slice_of(FAKE_ITEMS),
        "cache_proof": _unused is page,  # True：简写式与完整式命中同一份缓存
    }


@router.get("/heavy")
async def run_heavy_task(_: Annotated[None, Depends(HEAVY_GUARD)]) -> dict[str, Any]:
    """实例依赖：Depends 收到的是配置好的实例，__call__ 每请求执行一次。"""
    return {"task": "heavy", "status": "ok"}


@router.get("/reports")
async def list_reports(_: Annotated[None, Depends(REPORT_GUARD)]) -> dict[str, Any]:
    """另一台安检机：上限 5，计数表与 heavy 互不相通（见 /admin/stats）。"""
    return {"task": "reports", "status": "ok"}


@router.get("/trace")
async def show_trace(
    request: Request,
    _: Annotated[None, Depends(record_endpoint)],
) -> dict[str, Any]:
    """端点体运行时三层依赖已经全部跑完，trace 即真实执行顺序。"""
    return {
        "trace": request.state.trace,
        "explain": "global=app 级 -> router=路由器级 -> endpoint=端点级",
    }


@router.get("/stats")
async def admin_stats() -> dict[str, Any]:
    """全局计数与两个守卫的计数表：都是进程内状态，重启归零。"""
    return {
        "total_requests": REQUEST_COUNT,
        "guards": {"heavy(limit=2)": HEAVY_GUARD.counts, "reports(limit=5)": REPORT_GUARD.counts},
    }


app.include_router(router)


@app.get("/public/ping")
async def ping(request: Request) -> dict[str, Any]:
    """挂在 app 上、不经 /admin router：没有第 2 层，trace 里没有 "router"。"""
    return {"pong": True, "trace": request.state.trace}
