"""🏁 短链接服务 —— 项目 19 综合交付（FastAPI + SQLAlchemy + JWT + pytest + Docker）

端点一览:
- POST /shorten            缩短链接（支持自定义码与过期天数，随机码唯一约束 + 冲突重试）
- GET  /{code}             302 重定向并累加点击；不存在 404；已过期 410
- GET  /stats/{code}       点击统计
- POST /token              管理员登录（bcrypt）签发 JWT
- DELETE /admin/links/{code}  删除短码（JWT 保护）
- GET  /healthz            健康检查（容器探针用）

数据库走环境变量 SHORTENER_DB（12-factor，项目 18），默认实验目录内 shortener.db。
"""

import os
import secrets
import string
import typing
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import (DeclarativeBase, Mapped, mapped_column,
                            sessionmaker)

DB_PATH = os.environ.get("SHORTENER_DB",
                         str(Path(__file__).resolve().parent / "shortener.db"))
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(engine)

SECRET = "shortener-demo-secret-32bytes-minimum"  # ≥32B；生产从环境变量注入
ALPHABET = string.ascii_letters + string.digits


class Base(DeclarativeBase):
    pass


class Link(Base):
    __tablename__ = "links"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(unique=True, index=True)
    url: Mapped[str]
    clicks: Mapped[int] = mapped_column(default=0)
    expires_at: Mapped[datetime | None] = mapped_column(default=None)
    created: Mapped[datetime] = mapped_column(default=datetime.utcnow)


Base.metadata.create_all(engine)

ADMIN = {"username": "admin", "password": "admin-pass-6"}

app = FastAPI(title="短链接服务", version="1.0")


class ShortenIn(BaseModel):
    url: str
    custom_code: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{4,20}$")
    expires_in_days: int | None = Field(default=None, ge=1, le=365)

    @field_validator("url")
    @classmethod
    def must_be_http(cls, v: str) -> str:
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("仅支持 http(s) URL")
        return v


class TokenIn(BaseModel):
    username: str
    password: str


def random_code(n: int = 8) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(n))


def make_token(sub: str) -> str:
    claims = {"sub": sub, "exp": datetime.now(timezone.utc) + timedelta(minutes=30)}
    return jwt.encode(claims, SECRET, algorithm="HS256")


def get_admin(authorization: typing.Annotated[str, Header()] = "") -> str:
    """管理员依赖：Bearer JWT 解码 + 身份校验，任一失败 401"""
    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="无效 token")
    if claims.get("sub") != "admin":
        raise HTTPException(status_code=401, detail="需要管理员权限")
    return claims["sub"]


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/shorten")
def shorten(body: ShortenIn):
    expires_at = (datetime.utcnow() + timedelta(days=body.expires_in_days)
                  if body.expires_in_days else None)  # SQLite 存 naive UTC，全库统一 naive
    code = body.custom_code
    with SessionLocal() as db:
        for _ in range(5):  # 随机码冲突重试（唯一约束兜底，理论碰撞率 ~0）
            code = code or random_code()
            link = Link(code=code, url=body.url, expires_at=expires_at)
            db.add(link)
            try:
                db.commit()
                break
            except IntegrityError:
                db.rollback()
                if body.custom_code:  # 自定义码被占：明确拒绝，不悄悄换码
                    raise HTTPException(status_code=409, detail="自定义码已存在")
                code = None  # 随机码撞了就换一个重试
        else:
            raise HTTPException(status_code=500, detail="随机码连续碰撞（不可能发生）")
    return {"code": code, "short_url": f"/{code}", "expires_at": str(expires_at)}


@app.get("/stats/{code}")
def stats(code: str):
    with SessionLocal() as db:
        link = db.scalars(select(Link).where(Link.code == code)).first()
        if link is None:
            raise HTTPException(status_code=404, detail="短码不存在")
        expired = bool(link.expires_at and link.expires_at < datetime.utcnow())
        return {"code": link.code, "url": link.url, "clicks": link.clicks,
                "expired": expired}


@app.get("/{code}")
def redirect_code(code: str):
    with SessionLocal() as db:
        link = db.scalars(select(Link).where(Link.code == code)).first()
        if link is None:
            raise HTTPException(status_code=404, detail="短码不存在")
        if link.expires_at and link.expires_at < datetime.utcnow():
            raise HTTPException(status_code=410, detail="短码已过期")
        link.clicks += 1
        db.commit()
        return RedirectResponse(link.url, status_code=302)


@app.post("/token")
def issue_token(body: TokenIn):
    password_hash = bcrypt.hashpw(ADMIN["password"].encode(), bcrypt.gensalt())
    ok = (body.username == ADMIN["username"]
          and bcrypt.checkpw(body.password.encode(), password_hash))
    if not ok:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return {"access_token": make_token(body.username), "token_type": "bearer"}


@app.delete("/admin/links/{code}")
def delete_link(code: str, admin: str = Depends(get_admin)):
    with SessionLocal() as db:
        link = db.scalars(select(Link).where(Link.code == code)).first()
        if link is None:
            raise HTTPException(status_code=404, detail="短码不存在")
        db.delete(link)
        db.commit()
    return {"deleted": code, "by": admin}
