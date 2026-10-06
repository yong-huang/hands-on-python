"""测试金字塔中层:端点行为测试。

走 TestClient 发真实请求,断言状态码与响应结构——
校验(422)、增删查、越界删除各成一组。
"""

from fastapi.testclient import TestClient


def test_add_and_list(client: TestClient) -> None:
    r = client.post("/cart/items", json={"name": "苹果", "price": 2.5, "qty": 4})
    assert r.status_code == 201
    assert r.json()["subtotal"] == 10.0

    r = client.get("/cart")
    body = r.json()
    assert body["total"] == 10.0
    assert len(body["items"]) == 1


def test_validation_rejects_bad_input(client: TestClient) -> None:
    """price=0 与 qty=99+ 都该被 Pydantic 拦成 422。"""
    for bad in [{"name": "x", "price": 0, "qty": 1}, {"name": "x", "price": 1, "qty": 100}]:
        r = client.post("/cart/items", json=bad)
        assert r.status_code == 422
        assert r.json()["detail"][0]["loc"][-1] in ("price", "qty")


def test_remove_and_out_of_range(client: TestClient) -> None:
    client.post("/cart/items", json={"name": "苹果", "price": 2.5, "qty": 1})
    assert client.delete("/cart/items/0").status_code == 204
    assert client.get("/cart").json()["items"] == []
    assert client.delete("/cart/items/5").status_code == 404
