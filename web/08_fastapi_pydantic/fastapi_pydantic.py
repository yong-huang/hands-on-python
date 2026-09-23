"""
08 · Pydantic 校验与自动文档 —— 类型驱动的新范式
Web 框架清单项目 8：FastAPI 段开篇，声明一次类型，校验/文档/过滤三件事全办妥

Flask 里校验靠 WTForms 显式声明，文档靠手写；FastAPI 把两者都从类型注解里"长"出来
（对应 images/fastapi_pydantic.svg）:
- 路径/查询/Body 三类参数:  函数签名即接口契约——注解是什么类型，进来的数据就得是什么
- Pydantic BaseModel:      Field(ge=0, max_length=20, pattern=...) 把约束写在字段上，
                           违规请求进不了 handler，422 的 loc 直接指到字段名
- response_model:          出口闸——internal_price 等内部字段被剔除，多配的也不会泄露
- OpenAPI:                 /docs 交互文档与 /openapi.json 都由模型自动生成，零手写

Pydantic v2 要点（相对 v1）: regex= → pattern=、.dict() → model_dump()、
parse_obj → model_validate——网上旧教程的写法注意甄别。

用法:
- source ../.venv/bin/activate && python3 fastapi_pydantic.py
"""

import sys
import warnings

# starlette 新版提示"testclient 配 httpx2 更好"——本实验用 httpx 是刻意的（清单实测组合），静音
warnings.filterwarnings("ignore", message=".*httpx.*testclient.*deprecated.*")

from fastapi import FastAPI, HTTPException, Path, Query  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

app = FastAPI(
    title="商品目录 API",
    description="项目 8：类型驱动校验与自动文档的教学演示",
    version="1.0",
)

# 内存库：本实验只关心校验与文档，不关心持久化
DB: dict[int, dict] = {}
NEXT_ID = 1


class ItemIn(BaseModel):
    """输入模型：约束全写在字段上——这段注解同时是校验规则与文档"""

    name: str = Field(min_length=1, max_length=20, description="商品名")
    price: float = Field(ge=0, description="售价，不能为负")
    sku: str = Field(pattern=r"^[A-Z]{3}-\d{4}$", description="编码，如 ABC-1234")


class ItemOut(BaseModel):
    """输出模型：故意不含 internal_price / owner / id——出口闸的素材"""

    name: str
    price: float
    sku: str


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


@app.post("/items", response_model=ItemOut, tags=["商品"], summary="创建商品")
def create_item(item: ItemIn):
    """内部价 internal_price 只存内部账本——response_model 保证它永不外泄"""
    global NEXT_ID
    record = item.model_dump() | {
        "id": NEXT_ID,
        "internal_price": round(item.price * 0.8, 2),  # 内部结算价（敏感）
        "owner": "ops@corp.internal",                  # 内部字段（敏感）
    }
    DB[NEXT_ID] = record
    NEXT_ID += 1
    return record  # 返回的是全量 dict，response_model 负责裁剪


@app.get("/items/{item_id}", response_model=ItemOut, tags=["商品"], summary="查询商品")
def get_item(item_id: int = Path(ge=1, description="商品 ID，从 1 开始")):
    if item_id not in DB:
        raise HTTPException(status_code=404, detail="商品不存在")
    return DB[item_id]


@app.get("/search", tags=["查询"], summary="按关键字搜索")
def search(
    keyword: str = Query(min_length=2, max_length=10, description="关键字 2-10 字"),
    limit: int = Query(5, ge=1, le=20, description="条数上限 1-20"),
):
    hits = [i for i in DB.values() if keyword in i["name"]][:limit]
    return {"keyword": keyword, "limit": limit, "hits": hits}


# ============================================================
# 1. 三类参数与合法创建
# ============================================================

def demo_legal(client: TestClient) -> None:
    section("1. 三类参数（path / query / body）与合法创建（验收点）")
    r = client.post("/items", json={"name": "机械键盘", "price": 399.0, "sku": "KBX-0001"})
    assert r.status_code == 200, f"合法创建应 200，实际 {r.status_code}: {r.text}"
    assert r.json() == {"name": "机械键盘", "price": 399.0, "sku": "KBX-0001"}
    print(f"  POST /items 合法 body → 200，响应只含输出模型的三个字段: {r.json()}")

    r = client.get("/items/1")
    assert r.status_code == 200 and r.json()["sku"] == "KBX-0001"
    print(f"  GET /items/1（路径参数）→ 200 · price={r.json()['price']}")

    r = client.get("/search", params={"keyword": "键盘", "limit": 3})
    assert r.status_code == 200 and r.json()["limit"] == 3
    print(f"  GET /search?keyword=键盘&limit=3（查询参数）→ 200 · hits={len(r.json()['hits'])} 条")


# ============================================================
# 2. 校验实测：违规请求进不了 handler
# ============================================================

def demo_validation(client: TestClient) -> None:
    section("2. 校验实测：422 的 loc 精确指向违例字段（验收点）")
    cases = [
        ({"name": "负价商品", "price": -1.0, "sku": "NEG-0001"}, "price"),   # ge=0 违例
        ({"name": "x" * 21, "price": 1.0, "sku": "LNG-0001"}, "name"),       # max_length 违例
        ({"name": "坏编码", "price": 1.0, "sku": "bad-sku"}, "sku"),          # pattern 违例
        ({"name": "缺价格", "sku": "MIS-0001"}, "price"),                    # 缺字段
    ]
    for payload, field in cases:
        r = client.post("/items", json=payload)
        assert r.status_code == 422, f"{payload!r} 应 422，实际 {r.status_code}"
        locs = [tuple(e["loc"]) for e in r.json()["detail"]]
        assert ("body", field) in locs, f"errors 应指向 body.{field}: {locs}"
        print(f"  {str(payload)[:42]:<44} → 422 · loc 指向 body.{field}")

    r = client.get("/items/0")  # 路径参数 ge=1 违例
    assert r.status_code == 422 and any("item_id" in str(e["loc"]) for e in r.json()["detail"])
    print(f"  GET /items/0（路径参数 ge=1 违例）→ 422 · loc 指向 path.item_id")
    print("  对比项目 5 的 WTForms：约束写在类型注解里，handler 一行校验代码都不用写")


# ============================================================
# 3. response_model 出口闸：内部字段被剔除
# ============================================================

def demo_response_filter(client: TestClient) -> None:
    section("3. response_model 出口闸：internal_price 永不外泄（验收点）")
    r = client.get("/items/1")
    keys = set(r.json().keys())
    assert keys == {"name", "price", "sku"}, f"响应字段应被裁剪到输出模型: {keys}"
    assert "internal_price" not in keys and "owner" not in keys, "敏感字段被 response_model 剔除"
    print(f"  handler 返回了 5 个字段的 dict，响应只有 3 个: {sorted(keys)}")
    print("  出口闸的意义：新增内部字段时（如 owner），忘了改接口也不会泄露——模型说了算")


# ============================================================
# 4. 自动文档：OpenAPI 由模型生成
# ============================================================

def demo_openapi(client: TestClient) -> None:
    section("4. 自动文档：/openapi.json 与 /docs 同源（验收点）")
    r = client.get("/openapi.json")
    assert r.status_code == 200
    spec = r.json()
    assert spec["info"]["title"] == "商品目录 API", "自定义 title 应出现在 OpenAPI"
    schemas = spec["components"]["schemas"]
    assert {"ItemIn", "ItemOut"} <= set(schemas), f"模型应成为 schema: {schemas.keys()}"
    price_schema = schemas["ItemIn"]["properties"]["price"]
    assert price_schema.get("minimum") == 0, f"ge=0 应编译进 schema: {price_schema}"
    assert schemas["ItemIn"]["properties"]["sku"].get("pattern") == "^[A-Z]{3}-\\d{4}$"
    assert {"/items", "/items/{item_id}", "/search"} <= set(spec["paths"])
    print(f"  openapi.json: title={spec['info']['title']!r} · schemas={sorted(schemas)}")
    print(f"  ItemIn.price 带 minimum=0、sku 带 pattern——约束自动进了文档")
    assert client.get("/docs").status_code == 200
    print(f"  GET /docs → 200（Swagger 交互页，与本 JSON 同源，零手写）")


def main() -> None:
    from importlib.metadata import version as _v
    if tuple(int(x) for x in _v("fastapi").split(".")[:2]) < (0, 100):
        sys.exit(f"本实验需要 fastapi ≥ 0.100（当前 {_v('fastapi')}）。"
                 f"请先激活系列环境：source ../.venv/bin/activate")
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · FastAPI {version('fastapi')} + "
          f"Pydantic {version('pydantic')} · 类型驱动校验实验")
    client = TestClient(app)
    demo_legal(client)
    demo_validation(client)
    demo_response_filter(client)
    demo_openapi(client)

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 三类参数、4 组 422 精确指向、内部字段被剔除、OpenAPI 含约束")


if __name__ == "__main__":
    main()
