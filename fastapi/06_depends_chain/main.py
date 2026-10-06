"""lab 06 · Depends 依赖链 —— 演示应用：文章发布 API。

三层依赖链与三个观察点：依赖按什么顺序执行、同一请求内会不会重复执行、
依赖失败时请求在哪里停下：

    GET  /posts        依赖 current_user（三层链）——观察深度优先执行顺序与每请求缓存
    GET  /posts/draft  依赖 current_user 两次，其中一次 use_cache=False——绕过每请求缓存
    POST /posts        依赖令牌校验 + current_user——依赖里抛 HTTPException 时整条链短路
    GET  /trace        返回依赖执行记录并清空（教学装置，真实项目不会有）

每个依赖被调用的第一行都向进程级列表 TRACE 追加一条记录，一次 /posts 请求恰好留下
["settings", "db", "user"]；demo 脚本用 /trace 读走记录做精确断言。
运行（由 06_depends_chain.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/06_depends_chain --host 127.0.0.1 --port 8906
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# [0] 执行记录板：每个依赖被调用的第一行就是 _record(自己的名字)。
# TRACE 是进程级全局列表，跨请求累计；/trace 读取即清空，让每个 demo 章节从零开始。
# ---------------------------------------------------------------------------
TRACE: list[str] = []


def _record(step: str) -> None:
    """追加一条依赖执行记录。只是 list.append，包一层是为了让"记录"这个动作显眼。"""
    TRACE.append(step)


# ---------------------------------------------------------------------------
# [1] 第一层：get_settings —— 链的根，不依赖任何东西，链上第一个被执行的。
# 真实项目在这里读环境变量/配置文件；本实验返回固定值，demo 的断言才有确定依据。
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Settings:
    """应用配置。db_dsn 是"连接串"，第二层要拿它开会话——依赖值沿链传递的载体。"""

    app_name: str = "lab06-article-api"
    db_dsn: str = "pseudo://localhost/articles"


async def get_settings() -> Settings:
    """第一层依赖：被调用即记一条 "settings"，然后返回固定配置。"""
    _record("settings")
    return Settings()


# ---------------------------------------------------------------------------
# [2] 第二层：get_db —— 伪数据库会话。参数里的 Depends(get_settings) 把第一层
# 挂到自己身下：要拿到会话，必须先拿到配置。谁依赖它，FastAPI 就先替谁解析 settings。
# ---------------------------------------------------------------------------
class PseudoSession:
    """伪数据库会话：不连任何真实数据库，查询方法返回固定的内存数据。
    保留 dsn 属性，是为了证明"settings 先执行，且它的返回值真的传到了这里"。"""

    def __init__(self, dsn: str) -> None:
        self.dsn = dsn

    def fetch_user(self) -> dict[str, str]:
        """"查会话表取当前用户"的替身：固定返回 alice。"""
        return {"name": "alice", "role": "author"}

    def fetch_posts(self, author: str) -> list[dict[str, str]]:
        """按作者查已发布文章的替身：固定两篇。"""
        return [
            {"title": "依赖解析是深度优先的", "status": "published"},
            {"title": "每请求缓存的键是函数本身", "status": "published"},
        ]

    def fetch_drafts(self, author: str) -> list[dict[str, str]]:
        """按作者查草稿的替身：固定一篇。"""
        return [{"title": "use_cache=False 观察记录", "status": "draft"}]


async def get_db(settings: Annotated[Settings, Depends(get_settings)]) -> PseudoSession:
    """第二层依赖：声明了 Depends(get_settings)，FastAPI 解析完第一层才会调用它。
    参数 settings 就是 get_settings 的返回值——依赖的值就这样一层层往下传。"""
    _record("db")
    return PseudoSession(dsn=settings.db_dsn)


# ---------------------------------------------------------------------------
# [3] 第三层：get_current_user —— 端点真正声明的那层：从"会话"里取当前用户。
# 它只认识 db，不认识 settings；settings 是被 FastAPI 沿着链自动补齐的。
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class User:
    """当前用户：字段来自 db.fetch_user() 的查询结果。"""

    name: str
    role: str


async def get_current_user(db: Annotated[PseudoSession, Depends(get_db)]) -> User:
    """第三层依赖：被调用时 settings 与 db 必定已执行完——深度优先解析保证。"""
    _record("user")
    row = db.fetch_user()
    return User(name=row["name"], role=row["role"])


# ---------------------------------------------------------------------------
# [4] 令牌校验依赖：不准备任何资源，只校验请求头，失败立即抛 HTTPException。
# 它在 POST /posts 的参数列表里排第一位——FastAPI 按参数声明顺序解析依赖，
# 它抛异常时，排在后面的 current_user 三层链根本不会被解析（demo [5] 的空 trace）。
# ---------------------------------------------------------------------------
PUBLISH_TOKEN = "lab06-publish-token"


async def verify_publish_token(
    x_auth_token: Annotated[str, Header(description="发布令牌；值不对触发 403")],
) -> str:
    """先校验、后 _record：校验失败的请求不会在 TRACE 里留下任何记录。"""
    if x_auth_token != PUBLISH_TOKEN:
        # 依赖里抛 HTTPException 与在端点里抛效果相同：变成带 detail 的 403 响应
        raise HTTPException(status_code=403, detail="发布令牌无效")
    _record("token")
    return x_auth_token


app = FastAPI(
    title="lab06 · Depends 依赖链",
    description="三层嵌套依赖的深度优先执行顺序、每请求缓存与 use_cache=False 绕过",
)


# ---------------------------------------------------------------------------
# [5] 端点们：只声明自己需要的那一层，链由 FastAPI 深度优先自动补齐。
# ---------------------------------------------------------------------------
@app.get("/posts")
async def list_posts(
    user: Annotated[User, Depends(get_current_user)],
    # db 与 user 链上的是同一个函数：第二次出现命中每请求缓存，不会再次执行，
    # 所以本端点跑完 TRACE 恰好 3 条记录（demo [3] 的断言依据）。
    db: Annotated[PseudoSession, Depends(get_db)],
) -> dict[str, Any]:
    # 断言式注释：走到这里，TRACE 顺序必为 settings→db→user 且各恰好一次；
    # user 是 get_current_user 新建的 User；这里的 db 与 user 链上是同一个对象。
    return {
        "author": user.name,
        "db_dsn": db.dsn,  # 这个值诞生于第一层 settings，穿过 db 会话传到端点
        "posts": db.fetch_posts(user.name),
    }


@app.get("/posts/draft")
async def list_drafts(
    user_a: Annotated[User, Depends(get_current_user)],
    # use_cache=False：同一个函数第二次出现，但绕过缓存重新执行一遍；
    # 它的子依赖（get_db / get_settings）仍是默认 use_cache=True，照常命中缓存。
    user_b: Annotated[User, Depends(get_current_user, use_cache=False)],
    db: Annotated[PseudoSession, Depends(get_db)],
) -> dict[str, Any]:
    # 断言式注释：user_b 那次重新调用了 get_current_user，新建了另一个 User，
    # 所以 user_a is user_b 必为 False；TRACE 恰好 4 条，第 4 条是重复的 "user"。
    return {
        "author_a": user_a.name,
        "author_b": user_b.name,
        "same_object": user_a is user_b,
        "drafts": db.fetch_drafts(user_a.name),
    }


class PostCreate(BaseModel):
    """发布请求体：只收标题，demo 够用。"""

    title: str


@app.post("/posts")
async def publish_post(
    token: Annotated[str, Depends(verify_publish_token)],
    body: PostCreate,
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    # 断言式注释：第一个参数是令牌校验——能进函数体，说明它已通过且最先执行；
    # TRACE 前 4 条必为 token→settings→db→user（参数声明顺序 = 依赖解析顺序）。
    return {"status": "published", "title": body.title, "author": user.name}


# ---------------------------------------------------------------------------
# [6] 观测端点：返回自上次读取以来的全部执行记录并清空。
# "读取即清空"让每个章节拿到自己请求的完整记录；真实项目不会把依赖执行痕迹
# 暴露成 HTTP 端点——本端点只为 demo 断言而设，别照搬进生产代码。
# ---------------------------------------------------------------------------
@app.get("/trace")
async def read_trace() -> dict[str, Any]:
    """快照当前记录并清空列表，返回 {"trace": [...]}。"""
    snapshot: list[str] = list(TRACE)
    TRACE.clear()
    return {"trace": snapshot}
