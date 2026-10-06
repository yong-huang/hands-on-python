"""lab 03 · 响应建模 —— 演示应用：用户资料 API。

一条"返回值从函数到 HTTP 字节"的完整管线，四种出口对照：

    1. POST /users         response_model=UserOut + status_code=201 -> 出口闸裁剪敏感字段
    2. POST /users/legacy  无 response_model（反面教材）           -> password/风控分泄漏
    3. GET  /html /redirect /stream /download                      -> 四类非默认响应形态
    4. GET  /stats        返回 JSONResponse 实例                    -> 全权接管,不再过闸

运行（由 03_response_modeling.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/03_response_modeling --host 127.0.0.1 --port 8903
"""

from __future__ import annotations

import csv
import time
from pathlib import Path
from typing import Any, Iterator

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import (
    FileResponse, HTMLResponse, JSONResponse, RedirectResponse, StreamingResponse,
)
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# 内存"数据库"：demo 专用，进程重启即复位。记录是内部形态,带敏感字段。
# ---------------------------------------------------------------------------
USERS: dict[int, dict[str, Any]] = {
    1: {"id": 1, "username": "bob", "email": "bob@example.com", "bio": "后端工程师",
        "password": "bob-pw-0001", "internal_risk_score": 0.3},
    2: {"id": 2, "username": "carol", "email": "carol@example.com", "bio": "测试工程师",
        "password": "carol-pw-0002", "internal_risk_score": 0.5},
}
_next_id = len(USERS) + 1


def fake_risk_score(username: str) -> float:
    """伪造一个风控分：用用户名长度算出确定值,保证 demo 输出可断言。
    真实系统里它来自风控服务,正因为它不该外泄,才需要出口闸。"""
    return round(len(username) / 10, 2)


# ---------------------------------------------------------------------------
# 请求模型 UserIn 与响应模型 UserOut 刻意拆开：
# UserIn 收 password（注册必须给）;UserOut 没有 password,也没有风控分——
# 这两个模型就是对外契约,契约里没有的字段,出口闸一律拦下。
# ---------------------------------------------------------------------------
class UserIn(BaseModel):
    """注册请求体：password 只进不出（进来入库,出去被裁）。"""

    username: str = Field(min_length=3, max_length=20, description="用户名")
    email: str = Field(description="邮箱（demo 不做格式校验,见 lab 02）")
    password: str = Field(min_length=8, description="明文密码,仅用于注册")
    bio: str = Field(default="", max_length=100, description="一句话简介")


class UserOut(BaseModel):
    """对外暴露的用户资料：只有四个字段。这是本篇的"出口白名单"。"""

    id: int
    username: str
    email: str
    bio: str


# ---------------------------------------------------------------------------
# FileResponse 的素材：启动时生成一份确定性 CSV 到 /tmp（clean 时由脚本删除）
# ---------------------------------------------------------------------------
CSV_PATH = Path("/tmp/hands-on-python-lab03-users.csv")


def write_users_csv() -> None:
    """按 id 排序写 3 行用户,内容确定 -> 下载端点可做字节级断言。"""
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "username", "email"])
        for uid in sorted(USERS):
            row = USERS[uid]
            writer.writerow([uid, row["username"], row["email"]])


write_users_csv()  # 模块导入即生成,uvicorn 拉起前文件已就位

app = FastAPI(
    title="lab03 · 响应建模",
    description="response_model 出口闸、status_code 声明与五类响应形态",
)


# ---------------------------------------------------------------------------
# [1] 出口闸：函数返回内部全量记录,response_model=UserOut 裁掉敏感字段
# ---------------------------------------------------------------------------
@app.post("/users", response_model=UserOut, status_code=201)
async def register_user(body: UserIn, response: Response) -> dict[str, Any]:
    """注册用户。

    返回类型标 dict[str, Any]（内部记录的形态）,真正的对外契约由
    response_model=UserOut 决定：FastAPI 拿返回的 dict 重新按 UserOut
    校验一遍,UserOut 里没有的键直接丢弃。这就是"出口闸"。
    """
    global _next_id
    user_id = _next_id
    _next_id += 1
    record: dict[str, Any] = {
        "id": user_id,
        "username": body.username,
        "email": body.email,
        "bio": body.bio,
        "password": body.password,  # 敏感:入库留底,但 UserOut 没这个字段
        "internal_risk_score": fake_risk_score(body.username),  # 敏感:内部风控
    }
    USERS[user_id] = record
    # 201 Created 的语义:创建了新资源,Location 头指明去哪取它（声明写在装饰器里）
    response.headers["Location"] = f"/users/{user_id}"
    return record  # 带敏感字段的全量记录 -> 出口闸 -> 只剩 UserOut 四字段


# ---------------------------------------------------------------------------
# [2] 反面教材:同一个返回值,只是忘了挂 response_model,敏感字段原样出网
# ---------------------------------------------------------------------------
@app.post("/users/legacy")
async def register_user_legacy(body: UserIn) -> dict[str, Any]:
    """对照端点:没有 response_model,返回什么就发什么。

    返回注解 dict[str, Any] 会被 FastAPI 当作响应模型,而 Any 不做任何
    裁剪 —— password 与 internal_risk_score 全部出现在响应 JSON 里。
    这不是框架的 bug,是"函数内部结构 = 对外契约"这种耦合的必然结果。
    """
    global _next_id
    user_id = _next_id
    _next_id += 1
    record: dict[str, Any] = {
        "id": user_id,
        "username": body.username,
        "email": body.email,
        "bio": body.bio,
        "password": body.password,
        "internal_risk_score": fake_risk_score(body.username),
    }
    USERS[user_id] = record
    return record


@app.get("/users/{user_id}", response_model=UserOut)
async def get_user(user_id: int) -> dict[str, Any]:
    """按 id 查资料:同样过出口闸。Location 头指过来的就是这里。"""
    record = USERS.get(user_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"user {user_id} 不存在")  # 错误体系见 lab 04
    return record


# ---------------------------------------------------------------------------
# [3] JSONResponse:返回 Response 实例 = 全权接管,跳过 response_model
# ---------------------------------------------------------------------------
@app.get("/stats")
async def stats() -> JSONResponse:
    """显式返回 JSONResponse:状态码、响应头、响应体全由这个对象决定。

    边界:一旦函数返回的是 Response 实例,response_model 完全不参与——
    所以"返回 Response"是逃生门,也是绕过出口闸的后门,慎用。
    """
    return JSONResponse(
        content={"users": len(USERS), "csv_path": str(CSV_PATH)},
        headers={"x-lab-note": "raw JSONResponse bypasses response_model"},
    )


# ---------------------------------------------------------------------------
# [4] HTMLResponse:迷你页面。response_class 与它的分工见 /html-class
# ---------------------------------------------------------------------------
HTML_PAGE = """<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"><title>lab03 · 响应建模</title></head>
<body>
  <h1>lab03 · 响应建模</h1>
  <p>这一页由 HTMLResponse 直接渲染,Content-Type 是 text/html。</p>
</body>
</html>"""


@app.get("/html")
async def html_page() -> HTMLResponse:
    """函数亲手构造 HTMLResponse:最直白的非 JSON 响应形态。"""
    return HTMLResponse(content=HTML_PAGE)


@app.get("/html-class", response_class=HTMLResponse)
async def html_by_class():
    """response_class 的用法:函数只管返回 str,包装成 HTMLResponse 的活
    交给 response_class。注意返回注解留空 —— 若标 -> str,FastAPI 会把
    str 当响应模型做 JSON 编码,正文反而带上引号。"""
    return "<p>由 response_class=HTMLResponse 包装,函数只返回了 str</p>"


# ---------------------------------------------------------------------------
# [5] RedirectResponse:重定向。GET 场景 307 与 302 等效,307 额外承诺
# "方法不变"(POST 重定向时必须用 307,浏览器才不会把 POST 偷换成 GET)
# ---------------------------------------------------------------------------
@app.get("/redirect")
async def redirect_to_html() -> RedirectResponse:
    return RedirectResponse(url="/html", status_code=307)


# ---------------------------------------------------------------------------
# [6] StreamingResponse:生成器逐块吐 3 块文本。
# 关键性质:第一块发出时,整个响应的状态码与响应头已经定死(200),
# 生成器里后来发生的任何异常都无法再改状态码 —— 这是流式的固有约束。
# ---------------------------------------------------------------------------
STREAM_CHUNKS: tuple[str, ...] = (
    "block 1: 状态码与响应头已发出,正文开始流动\n",
    "block 2: 数据仍在生成,逐块发送,不攒成完整正文\n",
    "block 3: 生成完毕,连接关闭\n",
)


def stream_chunks() -> Iterator[str]:
    """同步生成器:FastAPI 会把它丢进线程池逐块驱动,每块间隔 0.4s,
    让客户端能"看到"分块到达的时间差。"""
    for chunk in STREAM_CHUNKS:
        time.sleep(0.4)
        yield chunk


@app.get("/stream")
async def stream() -> StreamingResponse:
    """Transfer-Encoding: chunked —— 没有应用层 Content-Length,
    总长度在发送完成前未知,这正是流式与普通响应的分水岭。"""
    return StreamingResponse(stream_chunks(), media_type="text/plain")


# ---------------------------------------------------------------------------
# [7] FileResponse:把磁盘文件交给 Starlette 高效发送(大文件自动分段)
# ---------------------------------------------------------------------------
@app.get("/download")
async def download_csv() -> FileResponse:
    """filename 参数生成 Content-Disposition: attachment; filename=...
    浏览器据此触发"另存为",而不是把 CSV 当网页打开。"""
    return FileResponse(path=CSV_PATH, media_type="text/csv", filename="users.csv")
