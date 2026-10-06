"""lab 10 · Annotated 与依赖工厂 —— 演示应用：报表 API。

现代依赖声明的推荐写法与参数化：类型提示与依赖声明合进同一个 Annotated 别名，
配置差异由工厂收进闭包，而不是散落在全局变量里：

    Page       = Annotated[PageInfo, Depends(pagination_50)]    # 普通报表：size 上限 50
    AdminPage  = Annotated[PageInfo, Depends(pagination_200)]   # 管理报表：size 上限 200

    GET /reports            普通报表，分页来自 Page 别名（size 上限 50）
    GET /admin/reports      管理报表，同一工厂换参数（上限 200），两套约束彼此独立
    GET /reports/dup        同一依赖函数在依赖树出现两次（直连+嵌套），缓存后只执行一次
    GET /reports/twice-made 同参数调用工厂两次 -> 两个函数对象 -> 两个缓存键 -> 各执行一次
    GET /export/slow|fast   TokenBucket 类依赖经工厂参数化（rate/capacity 不同）
    GET /trace              进程内计数器：每个依赖槽位真实执行了几次

缓存键（FastAPI 依赖去重所依据的钥匙）是依赖的 callable 本身：工厂每调用一次都
返回一个新函数对象，所以"同工厂不同参数"天然不同键、互不共享；而同一个函数对象
（经由别名复用）在同一请求的依赖树里无论出现几次都只执行一次。

运行（由 10_annotated_factories.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/10_annotated_factories --host 127.0.0.1 --port 8910
"""

# 注意：本文件故意不用 from __future__ import annotations——它会把注解变成字符串，
# 而 make_pagination 产出的注解里引用了闭包变量 max_size，字符串注解按模块全局
# 命名空间求值时找不到它，FastAPI 解析会直接报 PydanticUserError
import time
from dataclasses import asdict, dataclass
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Query

# ---------------------------------------------------------------------------
# 进程内计数器：demo 用 GET /trace 读取，证明"依赖函数体到底执行了几次"
# ---------------------------------------------------------------------------
EXEC_COUNTS: dict[str, int] = {}  # 每个依赖槽位的真实执行次数
FACTORY_CALLS: dict[str, int] = {"make_bucket": 0}  # 各工厂在导入期被调用的次数
_dep_seq = 0  # make_pagination 的调用序号：每调用一次 +1，给产物分配唯一槽位


def _next_slot(label: str) -> str:
    """分配计数槽位。同一次工厂调用的产物共用一个槽；每多调用一次工厂就多一个槽。"""
    global _dep_seq
    _dep_seq += 1
    return f"{label}#{_dep_seq}"


@dataclass
class PageInfo:
    """分页信息：依赖函数把 page/size 两个 query 参数收拢成的一个对象。"""

    page: int
    size: int
    max_size: int  # 本套分页依赖的 size 上限，回显进响应供 demo 断言
    offset: int    # 数据库偏移量 (page-1)*size：依赖函数算好，端点函数不再关心


def make_pagination(max_size: int, label: str):
    """依赖工厂：收下 max_size，返回一个依赖函数。

    关键事实：每调用一次 make_pagination，闭包里就铸造一个全新的函数对象。
    FastAPI 的依赖缓存键就是这个函数对象，因此：
      - pagination_50 与 pagination_200 -> 两个键、两套约束、各自计数；
      - 把 make_pagination(50) 调用两次 -> 也是两个键（常见误用，见 /reports/twice-made）。
    """
    slot = _next_slot(label)

    def pagination(
        page: Annotated[int, Query(ge=1, description="页码，从 1 起")] = 1,
        size: Annotated[int, Query(ge=1, le=max_size, description=f"每页条数，上限 {max_size}")] = 10,
    ) -> PageInfo:
        # le=max_size 是工厂参数长进校验规则的地方：不同套依赖，同名参数不同约束。
        # 校验发生在函数体执行之前，所以 422 的请求不会让计数 +1
        EXEC_COUNTS[slot] = EXEC_COUNTS.get(slot, 0) + 1
        return PageInfo(page=page, size=size, max_size=max_size, offset=(page - 1) * size)

    return pagination


# ---------------------------------------------------------------------------
# 铸造两套分页依赖 + Annotated 类型别名（推荐写法：类型与依赖合一，声明处只写一个词）
# ---------------------------------------------------------------------------
pagination_50 = make_pagination(50, "分页50")    # 模块级唯一函数对象：谁引用它，谁共享缓存键
pagination_200 = make_pagination(200, "分页200")

Page = Annotated[PageInfo, Depends(pagination_50)]        # 普通报表别名
AdminPage = Annotated[PageInfo, Depends(pagination_200)]  # 管理报表别名


def page_tag(pg: Page) -> str:
    """嵌套依赖：依赖函数的参数同样能用别名，内部又一次声明了 pagination_50。"""
    return f"p{pg.page}-s{pg.size}"


# 常见误用对照：同参数把工厂调用两次 -> 两个函数对象 -> 两个缓存键，并不会合并
TWICE_MADE_A = make_pagination(50, "再铸50")
TWICE_MADE_B = make_pagination(50, "再铸50")


# ---------------------------------------------------------------------------
# 类依赖 + 工厂：TokenBucket 本身是类，由 make_bucket 工厂产出"固定了速率"的提供者
# ---------------------------------------------------------------------------
class TokenBucket:
    """令牌桶限流器（类依赖）：rate 是每秒补充的令牌数，capacity 是桶容量上限。"""

    def __init__(self, rate: float, capacity: int) -> None:
        self.rate = rate
        self.capacity = capacity
        self.tokens = float(capacity)    # 桶初始为满
        self.updated = time.monotonic()  # 单调时钟：只用来算时间差，不受系统对时影响

    def try_take(self, cost: int) -> bool:
        """按流逝时间补充令牌后尝试扣减 cost 个；不足返回 False 且不扣。"""
        now = time.monotonic()
        self.tokens = min(float(self.capacity), self.tokens + (now - self.updated) * self.rate)
        self.updated = now
        if self.tokens < cost:
            return False
        self.tokens -= float(cost)
        return True


_BUCKETS: dict[str, TokenBucket] = {}  # 桶必须跨请求存活：同名桶存模块级字典，速率状态不丢


def make_bucket(name: str, rate: float, capacity: int):
    """类依赖工厂：返回提供者函数，由它实例化并复用同一个 TokenBucket。

    为什么不直接 Depends(TokenBucket)：那会要求 rate/capacity 都能被 FastAPI
    注入（来自 query 等），而限流速率是部署期决定的事，应当由工厂在导入期冻结。
    """
    FACTORY_CALLS["make_bucket"] += 1

    def provide_bucket() -> TokenBucket:
        if name not in _BUCKETS:  # 首次请求时建桶，之后所有请求共享同一只桶
            _BUCKETS[name] = TokenBucket(rate=rate, capacity=capacity)
        return _BUCKETS[name]

    return provide_bucket


SlowExport = Annotated[TokenBucket, Depends(make_bucket("slow", rate=1.0, capacity=5))]
FastExport = Annotated[TokenBucket, Depends(make_bucket("fast", rate=10.0, capacity=20))]


app = FastAPI(
    title="lab10 · Annotated 与依赖工厂",
    description="Annotated 别名复用 / 依赖工厂参数化 / 缓存键 / 类依赖",
)


def take_or_429(bucket: TokenBucket, cost: int, name: str) -> dict[str, Any]:
    """扣令牌的公共逻辑：失败抛 429，成功回显桶参数（供 demo 断言 rate/capacity）。"""
    if not bucket.try_take(cost):
        reason = "cost_exceeds_capacity" if cost > bucket.capacity else "insufficient_tokens"
        raise HTTPException(status_code=429, detail={
            "reason": reason,
            "message": f"导出被限流：本次要 {cost} 个令牌，桶容量 {bucket.capacity}",
            "cost": cost,
            "capacity": bucket.capacity,
        })
    return {
        "export": name,
        "cost": cost,
        "allowed": True,
        "rate": bucket.rate,
        "capacity": bucket.capacity,
        "tokens_left": round(bucket.tokens, 1),
    }


@app.get("/reports")
async def list_reports(pg: Page) -> dict[str, Any]:
    """普通报表。整个分页声明只有一个词：Page —— 别名把类型与依赖合在一处。"""
    return {"report": "normal", **asdict(pg)}


@app.get("/admin/reports")
async def list_admin_reports(pg: AdminPage) -> dict[str, Any]:
    """管理报表。同一工厂、不同参数：size 上限 200，与 /reports 的 50 互不干涉。"""
    return {"report": "admin", **asdict(pg)}


@app.get("/reports/dup")
async def reports_dup(pg: Page, tag: Annotated[str, Depends(page_tag)]) -> dict[str, Any]:
    """pagination_50 在依赖树里出现两次（本路由直连 + page_tag 嵌套）。

    Depends 默认 use_cache=True，同一缓存键在一次请求里只执行一次，
    所以 /trace 里 分页50#1 每个请求只 +1，而不是 +2。
    """
    return {"report": "dup", "tag": tag, **asdict(pg)}


@app.get("/reports/twice-made")
async def reports_twice_made(
    a: Annotated[PageInfo, Depends(TWICE_MADE_A)],
    b: Annotated[PageInfo, Depends(TWICE_MADE_B)],
) -> dict[str, Any]:
    """同参数调用工厂两次的对照：A/B 是不同对象 -> 两个缓存键 -> 各执行一次。"""
    return {
        "report": "twice-made",
        "same_object": TWICE_MADE_A is TWICE_MADE_B,
        "a": asdict(a),
        "b": asdict(b),
    }


@app.get("/export/slow")
async def export_slow(bucket: SlowExport, cost: Annotated[int, Query(ge=1)] = 1) -> dict[str, Any]:
    """慢速导出：rate=1/s、capacity=5 的桶。"""
    return take_or_429(bucket, cost, "slow")


@app.get("/export/fast")
async def export_fast(bucket: FastExport, cost: Annotated[int, Query(ge=1)] = 1) -> dict[str, Any]:
    """快速导出：rate=10/s、capacity=20 的桶，与 slow 出自同一个 make_bucket 工厂。"""
    return take_or_429(bucket, cost, "fast")


@app.get("/trace")
async def trace() -> dict[str, Any]:
    """进程内证据：每个依赖槽位真实执行了几次 / 工厂被调用了几次 / 桶的状态。"""
    return {
        "exec_counts": dict(sorted(EXEC_COUNTS.items())),
        "factory_calls": {
            "make_pagination": _dep_seq,
            "make_bucket": FACTORY_CALLS["make_bucket"],
        },
        "buckets": {
            name: {"rate": b.rate, "capacity": b.capacity, "tokens_left": round(b.tokens, 1)}
            for name, b in sorted(_BUCKETS.items())
        },
    }
