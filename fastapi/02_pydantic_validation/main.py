"""02 · Pydantic 模型与校验体系：订单创建 API 的完整校验链路。

运行方式（由 02_pydantic_validation.sh 拉起，也可手动）：
    ../../.venv/bin/uvicorn main:app --port 8902

本文件演示四件事：
1. 嵌套 BaseModel：Order -> Customer / list[OrderItem]，一个请求体就是一棵模型树
2. Field 约束：gt/ge/le/min_length/pattern 声明在字段上，而不是散落在视图函数里
3. 校验器：field_validator 改写数据（归一化），model_validator 管跨字段规则
4. 422 错误链路：loc=["body","items",1,"price"] 这样的嵌套路径如何逐层拼出
"""
from __future__ import annotations

import itertools
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import (
    BaseModel,
    Field,
    computed_field,
    field_validator,
    model_validator,
)

app = FastAPI(
    title="hands-on-python · 02 Pydantic 模型与校验体系",
    description="订单创建 API：嵌套模型、Field 约束、validator 与 422 错误结构",
)

# ---------------------------------------------------------------- 常量 ----

# model_validator 演示用的跨字段规则上限：任何一张订单总价不得超过 10000 元。
# 数值故意选"一件贵重商品就能触发"的量级，demo 章节 [4] 用 99999 元单件打爆它。
MAX_ORDER_TOTAL: float = 10_000.00

# 优惠券前缀 -> 折扣率。computed_field 演生的 discount 字段据此计算。
COUPON_DISCOUNT: dict[str, float] = {"VIP": 0.90, "SAVE": 0.85}

# 订单号发生器：进程内自增，从 ORD-1001 起。教学环境够用；
# 生产里应该换成数据库序列或带机器位的雪花 ID。
_order_seq: itertools.count[int] = itertools.count(1001)

# 进程内存储：order_no -> 已序列化的订单字典。重启即失，教学环境刻意从简。
ORDERS: dict[str, dict[str, Any]] = {}

# ---------------------------------------------------------- 模型体系 ----


class Customer(BaseModel):
    """嵌套模型第 1 层：演示"模型里套模型"。

    email 不用 EmailStr 而用 pattern 手工校验：EmailStr 依赖 email-validator
    包，本仓库 .venv 刻意不装它（保持最小依赖），故用等价的正则约束演示
    同样的效果；生产项目装上 email-validator 后应优先用 EmailStr。
    """

    name: str = Field(min_length=2, max_length=40, description="收货人姓名")
    # pattern 约束：形如 someone@example.com 的最简邮箱形状。
    # 违约时错误 type 是 string_pattern_mismatch，loc=["body","customer","email"]。
    email: str = Field(pattern=r"^[\w.+-]+@[\w-]+(\.[\w-]+)+$")


class OrderItem(BaseModel):
    """嵌套模型第 2 层：演示 Field 的数值与长度约束。

    gt=0 与 ge=1 的差别是本章考点之一：gt 是严格大于（0 也拒），
    ge 是大于等于。le=100 给 quantity 设上限，防"手滑多打一个 0"。
    """

    name: str = Field(min_length=1, description="商品名，至少 1 个字符")
    price: float = Field(gt=0, description="单价，严格大于 0")
    quantity: int = Field(ge=1, le=100, description="数量，1~100 件")


class Order(BaseModel):
    """顶层请求体模型：本章四个主角同台。

    - pattern 约束：status 与 coupon 的合法形状直接写在 Field 里
    - items 用 min_length=1 保证"至少一件商品"（列表长度约束）
    - field_validator(mode="before") 把小写优惠券归一成大写——校验器可以改写数据
    - model_validator(mode="after") 管跨字段规则（总价上限）
    - computed_field 演生 total / discount：它们不是输入，是算出来的
    """

    customer: Customer
    status: str = Field(default="created", pattern="^(created|paid|shipped)$")
    # 可选字段 + pattern：None 跳过校验，传了就必须匹配 6~12 位大写字母数字。
    coupon: str | None = Field(default=None, pattern=r"^[A-Z0-9]{6,12}$")
    items: list[OrderItem] = Field(min_length=1)

    @field_validator("coupon", mode="before")
    @classmethod
    def normalize_coupon_code(cls, value: object) -> object:
        """演示"校验可以改写数据"：strip + upper 归一化优惠券码。

        为什么是 mode="before"？pattern 属于 pydantic 的核心校验，先于
        after 校验器执行——"vip2026" 会在 pattern 检查处直接 422，
        after 校验器根本没机会把它救回来。before 校验器先跑，
        先归一成 "VIP2026"，pattern 再检查就通过了。
        """
        if isinstance(value, str):
            return value.strip().upper()
        return value  # 非 str（如 None）原样交回，让核心校验去报类型错

    @model_validator(mode="after")
    def check_total_cap(self) -> "Order":
        """跨字段规则：总价 = 各 item 的 price*quantity 之和，不得超过上限。

        单个字段约束够不着"多个字段凑起来的值"，这类规则只能放在
        model_validator 里。抛出的 ValueError 会被 pydantic 包装成
        type=value_error，且 loc 停在模型级——FastAPI 里就是 ["body"]，
        不再下钻到任何具体字段。
        """
        total = sum(item.price * item.quantity for item in self.items)
        if total > MAX_ORDER_TOTAL:
            raise ValueError(
                f"订单总价 {total:.2f} 元超过上限 {MAX_ORDER_TOTAL:.2f} 元"
            )
        return self  # mode="after" 必须把模型实例返回去

    @computed_field
    @property
    def total(self) -> float:
        """演生字段：订单总价（打折前）。出现在响应 JSON 与 JSON Schema 里。"""
        return round(sum(item.price * item.quantity for item in self.items), 2)

    @computed_field
    @property
    def discount(self) -> float:
        """演生字段：按优惠券前缀算出的折扣金额；无券则为 0.0。"""
        rate = 1.0
        if self.coupon:
            for prefix, off in COUPON_DISCOUNT.items():
                if self.coupon.startswith(prefix):
                    rate = off
                    break
        return round(self.total * (1 - rate), 2)


# -------------------------------------------------------------- 端点 ----


@app.post("/orders", status_code=201)
def create_order(order: Order) -> dict[str, Any]:
    """合法请求走到这里时，校验已经全部通过——视图函数只管业务。

    参数注解 order: Order 就是入口：FastAPI 看到 BaseModel 注解，
    把 JSON 请求体交给 pydantic 解析，失败时自动回 422（视图不执行）。
    返回体里 order_no 与 created_at 是服务端演生字段，客户端无权提交。
    """
    payload = order.model_dump()  # computed 字段 total/discount 会一并序列化
    order_no = f"ORD-{next(_order_seq)}"
    payload["order_no"] = order_no
    payload["created_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    ORDERS[order_no] = payload
    return payload


@app.get("/orders/{order_no}")
def get_order(order_no: str) -> dict[str, Any]:
    """按订单号查询：验证 201 响应里的数据真的被存下来了。"""
    if order_no not in ORDERS:
        raise HTTPException(status_code=404, detail=f"订单 {order_no} 不存在")
    return ORDERS[order_no]


@app.post("/orders/batch", status_code=201)
def create_orders_batch(orders: list[Order]) -> dict[str, Any]:
    """故意保留的"连锁失败"演示端点：list[Order] 让校验沿数组下标下钻。

    批量创建是全有或全无：任何一条、任何一个嵌套字段失败，
    整批请求都以 422 拒绝，loc 里带上失败条目的下标，
    例如第二条订单的价格错 -> ["body",1,"items",0,"price"]。
    "先整体校验、后进入视图"的顺序保证了不会出现半批成功。
    """
    created: list[str] = []
    for order in orders:
        payload = order.model_dump()
        order_no = f"ORD-{next(_order_seq)}"
        payload["order_no"] = order_no
        payload["created_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        ORDERS[order_no] = payload
        created.append(order_no)
    return {"created": len(created), "order_nos": created}
