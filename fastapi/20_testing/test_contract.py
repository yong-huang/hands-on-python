"""测试金字塔顶层:契约测试。

契约 = 响应必须长什么样(keys 清单)。它不测业务对错,只测"形状"——
防止实现悄悄改了对外结构、或把内部字段泄出去。

当前实现把 internal_cost 泄漏进响应:契约测试用 xfail(strict=True) 标记——
"当前注定失败,而且必须是它失败";修掉泄漏后去掉 xfail,它会转正并通过。
这是测试先行的工作方式:先让契约红着,再让实现变绿。
"""

import pytest
from fastapi.testclient import TestClient

CART_ITEM_KEYS = {"name", "price", "qty", "subtotal"}  # 对外契约:多一个少一个都算破坏


@pytest.mark.xfail(reason="实现泄漏 internal_cost;修掉后去掉 xfail 即转正", strict=True)
def test_cart_item_contract(client: TestClient) -> None:
    """响应字段必须恰好等于契约清单,且不得含任何内部字段。"""
    client.post("/cart/items", json={"name": "苹果", "price": 2.5, "qty": 4})
    item = client.get("/cart").json()["items"][0]
    assert set(item) == CART_ITEM_KEYS
    assert "internal_cost" not in item
