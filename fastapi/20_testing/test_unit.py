"""测试金字塔底层:纯函数单元测试。

cart_total 是纯函数——不起 HTTP、不碰全局状态,直接传参断言。
跑得最快、定位最准,金字塔要求这一层最厚。
"""

import pytest

from main import cart_total


@pytest.mark.parametrize(
    "items,expected",
    [
        ([], 0.0),  # 空购物车
        ([{"price": 2.5, "qty": 4}], 10.0),  # 单件
        ([{"price": 2.5, "qty": 4}, {"price": 0.99, "qty": 3}], 12.97),  # 多件累加
    ],
)
def test_cart_total(items: list[dict], expected: float) -> None:
    assert cart_total(items) == expected


def test_cart_total_rounds_to_cents() -> None:
    """浮点累加必须四舍五入到分——0.1+0.2 类陷阱的护栏。"""
    items = [{"price": 0.1, "qty": 1}, {"price": 0.2, "qty": 1}]
    assert cart_total(items) == 0.3
