"""Lab 20 · 购物车 API —— 测试体系的被测应用。

演示设计:
- 纯函数 `cart_total` 可以不起 HTTP 直接单元测试(测试金字塔的底层);
- 端点走 TestClient 做行为测试(中层);
- 响应里故意泄漏内部字段 `internal_cost`,契约测试(test_contract.py)用
  xfail 标记它——先让契约"应过而过不了",修掉泄漏后去掉 xfail 即转正。
所有状态存进程内存,`POST /reset` 供测试隔离(呼应 conftest 的 autouse fixture)。
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Lab 20 · 购物车")

_cart: list[dict] = []


class ItemIn(BaseModel):
    """创建商品的入参模型:price/qty 只接受正数。"""

    name: str = Field(min_length=1, max_length=40)
    price: float = Field(gt=0, description="单价,元")
    qty: int = Field(ge=1, le=99, description="数量")


def cart_total(items: list[dict]) -> float:
    """总价计算。纯函数——不碰 HTTP、不碰全局状态,单元测试的直接目标。"""
    return round(sum(i["price"] * i["qty"] for i in items), 2)


def _as_out(item: dict) -> dict:
    """把内部记录转成对外形态。

    反面教材:这里多给了 internal_cost(内部成本价,业务上绝不外泄)。
    契约测试会抓住它——见 test_contract.py 的 xfail 用例。
    """
    return {
        "name": item["name"],
        "price": item["price"],
        "qty": item["qty"],
        "subtotal": round(item["price"] * item["qty"], 2),
        "internal_cost": item.get("internal_cost", 0.0),  # 泄漏点
    }


@app.post("/reset")
def reset() -> dict:
    """清空购物车。仅供测试隔离使用(教学装置)。"""
    n = len(_cart)
    _cart.clear()
    return {"cleared": n}


@app.post("/cart/items", status_code=201)
def add_item(item: ItemIn) -> dict:
    """加入一件商品。内部补记成本价(真实系统里来自采购库)。"""
    record = item.model_dump()
    record["internal_cost"] = round(item.price * 0.6, 2)  # 假装来自内部定价
    _cart.append(record)
    return _as_out(record)


@app.get("/cart")
def list_cart() -> dict:
    """列出全部商品与总价。"""
    return {"items": [_as_out(i) for i in _cart], "total": cart_total(_cart)}


@app.delete("/cart/items/{idx}", status_code=204)
def remove_item(idx: int) -> None:
    """按下标删除一件商品。下标越界返回 404。"""
    if not 0 <= idx < len(_cart):
        raise HTTPException(status_code=404, detail=f"下标 {idx} 不存在(共 {len(_cart)} 件)")
    _cart.pop(idx)
