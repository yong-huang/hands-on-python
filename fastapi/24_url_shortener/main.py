"""Lab 24 · 综合交付:短链接服务。

串联清单(每个实验的落点):
- lab 01/02  参数与 Pydantic 校验:长 URL 字段约束(422 信封)
- lab 04     统一错误信封:所有错误一个形状
- lab 06/08  依赖:admin 鉴权依赖(X-Admin-Key)
- lab 10     依赖工厂:base62 短码生成器按长度参数化
- lab 19     request_id 贯穿日志与响应头
- lab 21     Settings 配置:短码长度/域名走环境
- lab 22     TTL 缓存:热点短码的跳转不查表
"""

import base64
import os
import time
from functools import lru_cache

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field, field_validator

app = FastAPI(title="Lab 24 · 短链接服务")


# ---------- lab 21:配置走环境 ----------
class Settings(BaseSettings := __import__("pydantic_settings").BaseSettings):
    code_length: int = Field(default=6, ge=4, le=12)
    admin_key: str = "lab24-admin"  # 生产从环境注入(演示固定)


@lru_cache
def get_settings() -> Settings:
    return Settings()


# ---------- lab 19:request_id 贯穿 ----------
REQUEST_ID_ATTR = "request_id"


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    rid = os.urandom(6).hex()
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


def error_envelope(status: int, code: str, message: str, request: Request) -> JSONResponse:
    """lab 04 的统一错误信封:所有错误一个形状。"""
    return JSONResponse(
        status_code=status,
        content={"code": code, "message": message,
                 "request_id": getattr(request.state, REQUEST_ID_ATTR, "")},
    )


# ---------- lab 22:TTL 缓存(热点短码跳转不查表) ----------
class TTLCache:
    def __init__(self, ttl: float) -> None:
        self.ttl, self.store, self.lock = ttl, {}, __import__("asyncio").Lock()

    async def get_or_set(self, key, producer):
        entry = self.store.get(key)
        if entry and entry[0] > time.monotonic():
            return entry[1]
        async with self.lock:
            entry = self.store.get(key)
            if entry and entry[0] > time.monotonic():
                return entry[1]
            value = await producer(key)
            self.store[key] = (time.monotonic() + self.ttl, value)
            return value


HOT_CACHE = TTLCache(ttl=5.0)
LINKS: dict[str, dict] = {}  # code -> {url, clicks, created_at}


# ---------- lab 10:依赖工厂(参数化短码长度) ----------
def make_code_generator(length: int):
    def generator() -> str:
        raw = base64.urlsafe_b64encode(os.urandom(length * 6 // 8 + 1)).decode()
        return raw.replace("-", "A").replace("_", "B")[:length].lower()
    return generator


code_gen = make_code_generator(get_settings().code_length)


# ---------- lab 01/02:入参校验 ----------
class LinkIn(BaseModel):
    url: str = Field(min_length=8, max_length=2048)

    @field_validator("url")
    @classmethod
    def must_be_http(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("仅支持 http/https 链接")
        return v


def require_admin(request: Request) -> None:
    """lab 08 的鉴权依赖:管理端点需要 X-Admin-Key。"""
    if request.headers.get("X-Admin-Key") != get_settings().admin_key:
        raise HTTPException(status_code=403, detail="需要有效的 X-Admin-Key")


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(p) for p in first.get("loc", []))
    return error_envelope(422, "VALIDATION_ERROR",
                          f"请求参数不合法: {loc} {first.get('msg', '')}", request)


@app.exception_handler(HTTPException)
async def http_exc_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return error_envelope(exc.status_code, "HTTP_ERROR", str(exc.detail), request)


@app.post("/links", status_code=201)
async def create_link(body: LinkIn) -> dict:
    """创建短链:同一 URL 返回同一短码(查重,不浪费码空间)。"""
    for code, rec in LINKS.items():
        if rec["url"] == body.url:
            return {"code": code, "short_url": f"/{code}", "reused": True}
    code = code_gen()
    while code in LINKS:  # 极小概率碰撞,重抽
        code = code_gen()
    LINKS[code] = {"url": body.url, "clicks": 0, "created_at": time.time()}
    return {"code": code, "short_url": f"/{code}", "reused": False}


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True, "links": len(LINKS)}


@app.get("/{code}")
async def redirect(code: str) -> RedirectResponse:
    """跳转:URL 解析走缓存(热点不查表),点击计数必执行(统计不依赖缓存)。"""

    async def lookup(_key: str) -> str:
        rec = LINKS.get(code)
        if rec is None:
            raise KeyError(code)
        return rec["url"]

    try:
        url = await HOT_CACHE.get_or_set(code, lookup)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"短码 {code} 不存在")
    if code in LINKS:
        LINKS[code]["clicks"] += 1
    return RedirectResponse(url, status_code=307)


@app.get("/links/{code}/stats")
async def stats(code: str) -> dict:
    rec = LINKS.get(code)
    if rec is None:
        raise HTTPException(status_code=404, detail=f"短码 {code} 不存在")
    return {"code": code, "url": rec["url"], "clicks": rec["clicks"]}


@app.post("/admin/reset", dependencies=[Depends(require_admin)])
async def admin_reset() -> dict:
    """清空数据与缓存(教学装置;管理端点演示鉴权依赖)。"""
    LINKS.clear()
    HOT_CACHE.store.clear()
    return {"ok": True, "cleared": True}


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True, "links": len(LINKS)}
