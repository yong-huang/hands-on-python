"""lab 01 · 最小应用与参数系统 —— 演示应用: 图书检索 API.

四类参数(路径 / 查询 / 请求头 / Cookie)在这个应用里各占一个端点,
每个端点的 docstring 说明"在演示什么":

    [路径参数] GET /books/{book_id}   book_id: int —— 传 "abc" 现场触发 422
    [查询参数] GET /books             page/size 带默认值与 ge/le 约束, keyword/category 可选过滤
    [请求头]   GET /request-source    fastapi.Header 读 x-request-source, 缺省 unknown
    [Cookie]   GET /last-topic        fastapi.Cookie 读 last_topic; POST /set-topic 负责写入
    [类型坑]   GET /price-preview     声明 float 的参数传 "abc" -> 422, 函数体不会执行
    [健康检查] GET /healthz           演示脚本的 readiness 探针(重试 curl 直到 200)

运行(由 01_minimal_app_routing.sh 调用):
    .venv/bin/uvicorn main:app --app-dir labs/01_minimal_app_routing --host 127.0.0.1 --port 8901
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Cookie, FastAPI, Header, HTTPException, Query, Response

# FastAPI() 创建应用对象: 一个 ASGI 应用(可被 uvicorn 加载的 Python Web 应用接口)
# 加一张路由表。本实验不配置任何额外组件(无数据库、无认证), 最小骨架 =
# 这一行 + 若干个 @app.get / @app.post 装饰器——每个装饰器把一个函数注册进路由表。
app = FastAPI(
    title="lab01 · 最小应用与参数系统",
    description="路径 / 查询 / 请求头 / Cookie 四类参数的声明、类型转换与 422 现场",
)

# ---------------------------------------------------------------------------
# 内存图书表: 8 条数据, 进程重启即复位。查询参数的分页 / 过滤就作用在这张表上。
# id 从 1001 开始是有意为之: 路径参数声明为 int 后, "1001" 能转换成功,
# "abc" 转换失败——路径参数的类型契约(见 get_book)需要这样的数据才好演示。
# ---------------------------------------------------------------------------
BOOKS: dict[int, dict[str, Any]] = {
    1001: {"title": "Python 基础教程", "category": "programming", "price": 59.0},
    1002: {"title": "FastAPI 实战", "category": "programming", "price": 79.0},
    1003: {"title": "Pydantic 深入浅出", "category": "programming", "price": 69.0},
    1004: {"title": "三体", "category": "novel", "price": 45.0},
    1005: {"title": "活着", "category": "novel", "price": 39.0},
    1006: {"title": "人类简史", "category": "history", "price": 68.0},
    1007: {"title": "万历十五年", "category": "history", "price": 55.0},
    1008: {"title": "流畅的 Python", "category": "programming", "price": 139.0},
}


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    """[健康检查] 返回固定 200。

    演示脚本用它做 readiness 探针: 起服务后重试 curl 直到探到 200 才继续,
    不用固定 sleep 猜启动时间。
    """
    return {"status": "ok"}


@app.get("/books/{book_id}")
async def get_book(book_id: int) -> dict[str, Any]:
    """[路径参数] 演示"声明即转换": book_id: int 让框架先转类型再进函数。

    - GET /books/1002 -> 200: 字符串 "1002" 已被转成整数 1002, 函数体拿到的是 int
    - GET /books/abc  -> 422: int 解析失败, 请求根本进不了函数体
    - GET /books/9999 -> 404: 参数合法但查无此书, 属于业务层的另一种失败

    同一个注解还是文档: /docs 的 OpenAPI schema(自动生成的接口描述文档)
    里 book_id 会被标为 integer。
    """
    book = BOOKS.get(book_id)
    if book is None:
        # 422 与 404 的分工: 422 是"参数不合法"(转换不过), 404 是"参数合法但没这条数据"
        raise HTTPException(status_code=404, detail=f"book_id={book_id} 不存在")
    return {"id": book_id, **book}


@app.get("/books")
async def list_books(
    page: Annotated[int, Query(ge=1, le=100)] = 1,
    size: Annotated[int, Query(ge=1, le=20)] = 3,
    keyword: Annotated[str | None, Query(min_length=1)] = None,
    category: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    """[查询参数] 演示默认值、数值约束(ge/le)与可选过滤。

    - 不带参数              -> page=1, size=3: 默认值生效, 函数体里没有一行判空代码
    - ?page=0 / ?size=99    -> 422: ge/le 约束在进入函数之前拦截, 不需要手写 if
    - ?category=programming -> 精确过滤; ?keyword=python -> 标题包含(不区分大小写)
    - keyword / category 不传时是 None: "可选"的含义是"取不到值", 不是"报错"

    Annotated[int, Query(...)] 是"类型注解 + 元数据"的写法: int 说明类型与
    转换规则, Query(...) 说明取值来源(URL ?x= 部分)与附加约束。
    """
    found = list(BOOKS.items())
    if keyword is not None:
        found = [(i, b) for i, b in found if keyword.lower() in str(b["title"]).lower()]
    if category is not None:
        found = [(i, b) for i, b in found if b["category"] == category]
    start = (page - 1) * size
    items = [{"id": i, **b} for i, b in found[start : start + size]]
    return {"page": page, "size": size, "total": len(found), "items": items}


@app.get("/request-source")
async def request_source(
    x_request_source: Annotated[str, Header()] = "unknown",
) -> dict[str, str]:
    """[请求头] 演示 Header 参数的"下划线-连字符"映射。

    HTTP 头字段名用连字符(X-Request-Source), 而 Python 变量名不允许连字符,
    所以参数命名为 x_request_source: fastapi.Header 默认 convert_underscores=True,
    按"下划线换回连字符"去请求头里找 X-Request-Source(头名大小写不敏感)。

    - curl -H 'X-Request-Source: curl-cli' -> 回显 curl-cli
    - 不带该头 -> 默认值 unknown

    请求头常用于传递"与业务无关的环境信息": 请求来源、设备、链路追踪 ID。
    """
    return {"x_request_source": x_request_source}


@app.post("/set-topic")
async def set_topic(
    response: Response,
    topic: Annotated[str, Query(min_length=1)],
) -> dict[str, str]:
    """[Cookie·辅助端点] 演示服务端如何"种"Cookie, 供 curl 先 set 后 get。

    response.set_cookie 会在响应头里写一行:
        Set-Cookie: last_topic=...; HttpOnly; Path=/; SameSite=lax
    HttpOnly 表示 JavaScript 的 document.cookie 读不到; curl 演示时用
    -c <jar> 保存、-b <jar> 回带, 模拟浏览器的自动携带行为。
    """
    response.set_cookie(key="last_topic", value=topic, httponly=True, samesite="lax")
    return {"set": "last_topic", "value": topic}


@app.get("/last-topic")
async def read_last_topic(
    last_topic: Annotated[str | None, Cookie()] = None,
) -> dict[str, str | None]:
    """[Cookie 参数] 演示从请求的 Cookie 里取参数。

    与 Query 的解析规则一致, 区别只在取值位置: Query 从 URL 的 ?x= 取,
    Cookie 从请求头 Cookie: last_topic=... 里取。没有这个 Cookie 时得到
    默认值 None, 与可选 Query 参数的语义相同(不报错)。

    Cookie 适合存"客户端的少量偏好状态", 例如上一次访问的栏目、界面主题。
    """
    return {"last_topic": last_topic}


@app.get("/price-preview")
async def price_preview(
    price: Annotated[float, Query(gt=0)],
    discount: Annotated[float, Query(ge=0, le=1)] = 0.0,
) -> dict[str, float]:
    """[类型坑] 演示"声明 float 不等于什么都能转"。

    直觉上 float 很宽容("1"、"0.5"、"1e2" 都能转), 但 pydantic(FastAPI 的
    校验层)严格执行: discount=abc -> float 解析失败 -> 422, type=float_parsing。
    常见误解是"我在函数里 try/except 一下就行"——根本轮不到函数执行:
    校验发生在进入函数体之前, 这就是"声明即契约"的边界, 契约之外的输入
    永远到不了函数。
    """
    return {
        "price": price,
        "discount": discount,
        "final": round(price * (1 - discount), 2),
    }
