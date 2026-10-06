"""lab 15 · SQLAlchemy async —— 演示应用：笔记 API。

异步 ORM（Object-Relational Mapping，对象关系映射：把类映射到表、对象映射到行，
用 Python 对象操作数据库而不手写 SQL）的最小完整接入，三层各就各位：

    create_async_engine + async_sessionmaker   组件层（进程级，启动时各建一次）
    get_session（yield 依赖）                  请求层（每请求借出一个 AsyncSession）
    POST /notes        写端点：add -> commit -> refresh 回读服务端生成的字段
    GET /notes         读端点：全部笔记
    GET /notes/{id}    读端点：单条，不存在 404
    GET /stats         教学装置：engine 连接池状态 + session 借还计数
    GET /write-trace   教学装置：写请求的进入/提交时刻序列，读后清空

本机实测结论（sqlalchemy 2.1.3 / aiosqlite 0.22.1 / Python 3.13.9，见 demo [3]）：
  文件型 SQLite 在数据库文件上是单写者——20 个并发 POST 的提交时刻一条接一条
  排开（相邻间隔毫秒级），总耗时接近"单次写耗时 x 并发数"，而不是并行任务的
  "约等于最慢一个"。async 改变的是"等待时不占线程"，不是让 SQLite 写并行。

WRITE_TRACE 与 session 借还计数是进程内演示状态，--workers 多进程时各进程一份。
运行（由 15_async_sqlalchemy.sh 调用，建表发生在脚本 start 服务之前）：
    .venv/bin/uvicorn main:app --app-dir labs/15_async_sqlalchemy --host 127.0.0.1 --port 8915
"""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from datetime import datetime
from pathlib import Path
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime, String, func, select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# ---------------------------------------------------------------------------
# [组件 1/3] engine：进程级单例，背后挂着连接池，应用整个生命周期只创建一次。
# URL 三段式：sqlite+aiosqlite = 方言+异步驱动；aiosqlite（SQLite 的异步封装，
# 内部用独立线程包住同步 sqlite3，以 await 形式暴露）。
# ---------------------------------------------------------------------------
DB_PATH = Path(__file__).resolve().parent / "lab15.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL)
# 池的取舍（SQLite 专项）：文件库默认挂 AsyncAdaptedQueuePool，
# pool_size=5（池里常备 5 条连接）+ max_overflow=10（高峰临时多开 10 条，用完即还）。
# - QueuePool：连接复用，省掉每请求反复打开/关闭 SQLite 文件的开销；读请求彼此
#   独立，复用收益最大。
# - NullPool：不缓存，每次现开连接、用完立刻物理关闭。适合低流量脚本，或
#   "必须不留任何存活连接"的场景（测试结束后删库不被文件锁绊住）。
# SQLite 文件锁让写入天然串行，池并不能把写变成并行；本演示直接用默认池，
# 把观察重点留给数据库文件锁本身。

# ---------------------------------------------------------------------------
# [组件 2/3] session 工厂：进程级单例，负责"造 session"，不是 session 本身。
# expire_on_commit=False：commit 之后不把对象属性标记为过期。默认 True 时，
# commit 之后再读 note.content 会触发一次隐式懒加载 SELECT——那是没有被 await
# 的隐式 IO，在 async 上下文里直接抛 MissingGreenlet（见 README 坑 4）。
# ---------------------------------------------------------------------------
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

# ---------------------------------------------------------------------------
# 并发写计数（教学装置）：每个写请求记一条时间戳，单位 time.perf_counter 秒——
#   enter         端点函数进入时刻（依赖已解析、session 已借出）
#   commit_start  await session.commit() 之前
#   commit_done   commit 返回之后 = 数据库文件锁已释放
# 20 个并发请求的 commit_done 一条接一条不重叠地排开，就是单写者串行化的现场。
# ---------------------------------------------------------------------------
WRITE_TRACE: list[dict[str, float]] = []

# session 借还计数：opened 在借出时加一，closed 在 finally 里加一，
# open_now = opened - closed。请求收尾后 open_now 回到 0，
# 就是"yield 依赖的 teardown（finally）确实执行了"的可断言证据。
_SESSION_STATS = {"opened": 0, "closed": 0}


# ---------------------------------------------------------------------------
# [组件 3/3] yield 依赖：把"每请求一个 session"的借还样板收进依赖系统。
# 结构与 lab 07 的事务依赖同构：yield 之前是 setup（借出），yield 之后是
# teardown（归还）；teardown 在响应发送之后执行，端点抛异常时也必经这里。
# ---------------------------------------------------------------------------
async def get_session() -> AsyncIterator[AsyncSession]:
    """每请求借出一个 AsyncSession，请求收尾时在 finally 里归还连接池。"""
    session = async_session_maker()
    _SESSION_STATS["opened"] += 1
    try:
        yield session                 # 端点函数运行在这两行之间
    finally:
        await session.close()         # 归还连接；未 commit 的改动在此回滚
        _SESSION_STATS["closed"] += 1


SessionDep = Annotated[AsyncSession, Depends(get_session)]


# ---------------------------------------------------------------------------
# ORM 模型：DeclarativeBase 子类挂 metadata（表定义的登记处），Note 映射 notes 表。
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    """全部模型的公共基类。"""


class Note(Base):
    """notes 表：id 由 SQLite 自增主键分配，created_at 由数据库在 INSERT 时生成。"""

    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ---------------------------------------------------------------------------
# Pydantic（校验库）模型：请求体入口与响应出口，把 ORM 对象翻译成 JSON。
# ---------------------------------------------------------------------------
class NoteIn(BaseModel):
    """POST /notes 的请求体：长度校验不过直接 422。"""

    content: str = Field(min_length=1, max_length=200)


class NoteOut(BaseModel):
    """响应模型：from_attributes 允许直接从 ORM 对象按属性取值。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    created_at: datetime


async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """应用 lifespan（启动/关闭钩子）里清空教学装置，demo 反复跑可复现。"""
    WRITE_TRACE.clear()
    _SESSION_STATS.update(opened=0, closed=0)
    yield


app = FastAPI(
    title="lab15 · SQLAlchemy async",
    lifespan=lifespan,
    description="create_async_engine + async_sessionmaker + yield 依赖 + SQLite 单写者并发写实测",
)


# ---------------------------------------------------------------------------
# 写端点：commit 与回读 id 都发生在端点函数体内，事务边界清晰可见。
# ---------------------------------------------------------------------------
@app.post("/notes", status_code=201)
async def create_note(body: NoteIn, session: SessionDep) -> NoteOut:
    """add -> commit -> refresh：commit 把 INSERT 发给数据库并结束事务（文件锁
    在这一步被持有再释放）；refresh 在新事务里发一条 SELECT，回读服务端生成的
    id 与 created_at。三枚时间戳进 WRITE_TRACE，demo [3] 用它呈现串行化现场。"""
    record = {"enter": time.perf_counter()}
    note = Note(content=body.content)
    session.add(note)
    record["commit_start"] = time.perf_counter()
    await session.commit()
    record["commit_done"] = time.perf_counter()
    WRITE_TRACE.append(record)
    await session.refresh(note)
    return NoteOut.model_validate(note)


# ---------------------------------------------------------------------------
# 读端点：只读请求不需要 commit，session 在 finally 里关闭、连接物归原池。
# ---------------------------------------------------------------------------
@app.get("/notes")
async def list_notes(session: SessionDep) -> list[NoteOut]:
    """全部笔记，按 id 升序。"""
    rows = await session.execute(select(Note).order_by(Note.id))
    return [NoteOut.model_validate(row) for row in rows.scalars()]


@app.get("/notes/{note_id}")
async def get_note(note_id: int, session: SessionDep) -> NoteOut:
    """单条笔记；查不到抛 404，由异常处理层翻译成 JSON 错误响应。"""
    row = await session.execute(select(Note).where(Note.id == note_id))
    note = row.scalars().first()
    if note is None:
        raise HTTPException(status_code=404, detail=f"note {note_id} 不存在")
    return NoteOut.model_validate(note)


# ---------------------------------------------------------------------------
# 教学装置端点：/stats 是组件与池状态的快照；/write-trace 是并发写时间线。
# ---------------------------------------------------------------------------
@app.get("/stats")
async def stats() -> dict[str, Any]:
    """组件身份 + 连接池状态 + session 借还计数，demo 的断言数据源。"""
    return {
        "database_url": str(engine.url),
        "dialect": f"{engine.dialect.name}+{engine.dialect.driver}",
        "db_file": DB_PATH.name,
        "pool_class": type(engine.pool).__name__,
        "pool_status": engine.pool.status(),
        "session_factory": type(async_session_maker).__name__,
        "sessions": {
            "opened": _SESSION_STATS["opened"],
            "closed": _SESSION_STATS["closed"],
            "open_now": _SESSION_STATS["opened"] - _SESSION_STATS["closed"],
        },
        "writes_recorded": len(WRITE_TRACE),
    }


@app.get("/write-trace")
async def write_trace() -> dict[str, Any]:
    """返回写请求时间线（毫秒，相对最早进入者）并清空，保证 demo 可重复跑。

    按记录顺序原样返回（即提交完成顺序）；demo 断言 commit_done_ms 单调不减。
    """
    if not WRITE_TRACE:
        return {"count": 0, "writes": []}
    t0 = min(r["enter"] for r in WRITE_TRACE)
    writes = [
        {
            "enter_ms": round((r["enter"] - t0) * 1000, 1),
            "commit_start_ms": round((r["commit_start"] - t0) * 1000, 1),
            "commit_done_ms": round((r["commit_done"] - t0) * 1000, 1),
        }
        for r in WRITE_TRACE
    ]
    WRITE_TRACE.clear()
    return {"count": len(writes), "writes": writes}


async def init_db() -> None:
    """建表：脚本在 start 服务之前调用；表已存在时 create_all 不做任何改动。"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
