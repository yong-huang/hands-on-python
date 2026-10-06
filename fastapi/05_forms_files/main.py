"""lab 05 · 表单与文件上传 —— 演示应用：资料上传 API。

两类表单体（Content-Type 决定解析器）与两种文件参数（bytes 全量进内存 / UploadFile 溢出落盘）：

    POST /profiles        urlencoded 表单：name + age（Form 声明，解析为 str / int）
    POST /profiles-json   只认 JSON 的对照端点：拿表单体喂它，观察 422 与 loc 的差别
    POST /upload          单文件 UploadFile：1MB 分块异步读、流式落盘，报告分块次数
    POST /upload-multi    多文件 list[UploadFile]，逐个落盘并汇总
    POST /upload-guard    防线端点：扩展名白名单（415）在读之前断；大小上限 200KB（413）边读边断
    GET  /files           列出已落盘文件（demo 断言用）

FastAPI 没有内置的请求体大小上限，两条防线（413 / 415）都是本文件手写的，
"防线要挂在读完之前"是本实验的核心教学点。

落盘目录 /tmp/fastapi_lab05_uploads：lifespan 启动时清空（demo 要反复跑，断言依赖"初始为空"），
由 05_forms_files.sh clean 删除。
运行（由 05_forms_files.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/05_forms_files --host 127.0.0.1 --port 8905
"""

from __future__ import annotations

import shutil
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# 常量：分块大小与防线参数。两个"1MB"互不相干，见注释
# ---------------------------------------------------------------------------
UPLOAD_DIR = Path("/tmp/fastapi_lab05_uploads")
CHUNK_SIZE = 1024 * 1024      # /upload 读取侧的分块大小（1MB）：只影响 read() 调用几次
GUARD_CHUNK_SIZE = 64 * 1024  # 防线端点改用 64KB 小块：块越小，超限断得越早、白读的越少
GUARD_MAX_BYTES = 200 * 1024  # 防线上限 200KB：边读边计数，超过立即 413，不等请求读完
ALLOWED_EXTS = {".txt", ".csv", ".md"}  # 扩展名白名单：之外的扩展名直接 415


def envelope(code: str, message: str, details: Any = None) -> dict[str, Any]:
    """统一错误信封：413 / 415 共用同一外壳（code / message / details）。"""
    return {"code": code, "message": message, "details": details}


class FileTooLarge(Exception):
    """内部信号：边读边计数时超限。read_bytes 记录读到多少字节时被掐断。"""

    def __init__(self, read_bytes: int) -> None:
        self.read_bytes = read_bytes
        super().__init__(f"已读 {read_bytes} 字节，超过大小上限")


async def save_stream(
    src: UploadFile, dest: Path, chunk_size: int, max_bytes: int | None = None
) -> dict[str, int]:
    """把上传文件分块读、边读边写进 dest，返回 {"size": ..., "chunks": ...}。

    为什么不用 src.read() 一把读完：那是 bytes 参数的路线，文件多大内存就吃多大。
    分块读让端点的内存占用恒等于一块的大小，与文件总大小无关；max_bytes 不为 None
    时边读边计数，超限在读的中途抛 FileTooLarge——防线必须挂在"读完之前"，
    等整个请求读完再判，大文件已经全量穿过网络、进过临时区了。
    """
    size = 0
    chunks = 0
    try:
        # out 是本地磁盘句柄，write 是内存量级的操作，不会阻塞事件循环
        with dest.open("wb") as out:
            while True:
                # 异步读一块：等待数据期间事件循环可以服务其他请求
                block: bytes = await src.read(chunk_size)
                if not block:
                    break  # 空块即 EOF，正常收尾
                chunks += 1
                size += len(block)
                out.write(block)
                if max_bytes is not None and size > max_bytes:
                    raise FileTooLarge(size)  # 半途掐断，不等读完
    except FileTooLarge:
        dest.unlink(missing_ok=True)  # 半成品不留在磁盘上
        raise
    return {"size": size, "chunks": chunks}


@asynccontextmanager
async def lifespan(_: FastAPI):
    """start 时清空上传目录：保证 demo 可重复执行，断言依赖确定的初始状态。"""
    if UPLOAD_DIR.exists():
        shutil.rmtree(UPLOAD_DIR)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="lab05 · 表单与文件上传",
    lifespan=lifespan,
    description="urlencoded / multipart 两类表单体；bytes 与 UploadFile 两种文件参数；手写大小与类型防线",
)


# ---------------------------------------------------------------------------
# [A] urlencoded 表单：curl -d "name=alice&age=30" 走这里。
# Form() 声明的字段不在 URL 上，而在请求体里；请求体按什么格式解析由 Content-Type 决定。
# ---------------------------------------------------------------------------
@app.post("/profiles")
async def create_profile(
    name: Annotated[str, Form(min_length=1, max_length=20, description="姓名，1~20 字符")],
    age: Annotated[int, Form(ge=0, le=130, description="年龄，0~130 的整数")],
) -> dict[str, Any]:
    # 走到这里 name/age 已被表单解析器取成 str/int，age="abc" 这类在解析后由 pydantic 拦下
    return {"name": name, "age": age, "age_next_year": age + 1}


class ProfileIn(BaseModel):
    """只认 JSON 的对照端点的请求模型：字段与 /profiles 相同，解析器不同。"""

    name: str = Field(min_length=1)
    age: int = Field(ge=0, le=130)


@app.post("/profiles-json")
async def create_profile_json(body: ProfileIn) -> dict[str, Any]:
    """声明了 Pydantic 模型，FastAPI 就按 JSON 读请求体。
    拿表单体（curl -F）喂它会得到 422，且 loc 与"表单端点收到 JSON"时不同，见 demo [7]。"""
    return {"parsed_as": "json", **body.model_dump()}


# ---------------------------------------------------------------------------
# [B] 单文件上传：UploadFile 是"文件句柄 + 元数据"，内容放在 SpooledTemporaryFile 里
# （内存中最多存 1MB，超出自动溢出到磁盘临时文件），所以端点里要分块读，而不是一把读。
# ---------------------------------------------------------------------------
@app.post("/upload")
async def upload(
    file: Annotated[UploadFile, File(description="任意扩展名，无大小限制")],
) -> dict[str, Any]:
    # Path(...).name 剥掉客户端可能伪造的路径成分（filename="../etc/passwd" 这类）
    dest = UPLOAD_DIR / Path(file.filename or "unnamed").name
    stats = await save_stream(file, dest, CHUNK_SIZE)  # 响应里的 chunks 就来自这里
    await file.close()  # 触发 SpooledTemporaryFile 清理磁盘上的临时文件
    return {
        "filename": file.filename,          # 元数据：客户端声明的原始文件名
        "content_type": file.content_type,  # 元数据：客户端声称的 MIME 类型（可伪造，见 README）
        "size": stats["size"],              # 自己数的落盘字节数，不拿元数据当凭据
        "chunks": stats["chunks"],          # 分块次数：2.5MB 文件 = 3 块（1MB+1MB+0.5MB）
        "chunk_size": CHUNK_SIZE,
        "saved_to": str(dest),
    }


@app.post("/upload-multi")
async def upload_multi(
    files: Annotated[list[UploadFile], File(description="同名表单字段重复出现，一次带多个文件")],
) -> dict[str, Any]:
    """与单文件唯一的差别是声明：list[UploadFile] 收齐同名字段的全部出现。"""
    results: list[dict[str, Any]] = []
    for f in files:
        dest = UPLOAD_DIR / Path(f.filename or "unnamed").name
        stats = await save_stream(f, dest, CHUNK_SIZE)
        await f.close()
        results.append(
            {"filename": f.filename, "content_type": f.content_type, "size": stats["size"]}
        )
    return {"count": len(files), "files": results}


# ---------------------------------------------------------------------------
# [C] 防线端点：白名单在"读一个字节之前"断（415）；大小上限在"读的中途"断（413）。
# 注意两条防线都在应用层：multipart 报文在端点运行之前已被解析进临时区，
# 应用层防线挡的是"写进你的存储"，"不接收"要靠反向代理层（见 README）。
# ---------------------------------------------------------------------------
@app.post("/upload-guard")
async def upload_guard(
    file: Annotated[UploadFile, File(description="只收 .txt/.csv/.md，且不超过 200KB")],
) -> JSONResponse:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        # 415 Unsupported Media Type：此刻还没有复制任何字节，半成品也不会出现
        return JSONResponse(
            status_code=415,
            content=envelope(
                "UNSUPPORTED_MEDIA_TYPE",
                f"扩展名 {ext or '(无)'} 不在白名单",
                {"filename": file.filename, "ext": ext, "allowed": sorted(ALLOWED_EXTS)},
            ),
        )
    dest = UPLOAD_DIR / Path(file.filename or "unnamed").name
    try:
        stats = await save_stream(file, dest, GUARD_CHUNK_SIZE, max_bytes=GUARD_MAX_BYTES)
    except FileTooLarge as exc:
        # 413 Payload Too Large：read_bytes 大于上限且小于文件实际大小，
        # 这个数字本身就是"中途断"的证据——读完再判是拿不到它的
        return JSONResponse(
            status_code=413,
            content=envelope(
                "FILE_TOO_LARGE",
                f"文件超过 {GUARD_MAX_BYTES} 字节上限，已在中途截断",
                {"filename": file.filename, "read_bytes": exc.read_bytes, "max_bytes": GUARD_MAX_BYTES},
            ),
        )
    return JSONResponse(
        status_code=200,
        content={
            "filename": file.filename,
            "size": stats["size"],
            "chunks": stats["chunks"],
            "saved_to": str(dest),
        },
    )


@app.get("/files")
async def list_files() -> dict[str, Any]:
    """列出上传目录：demo 断言用它确认"哪些文件真的落了盘"。"""
    items = [
        {"filename": p.name, "size": p.stat().st_size}
        for p in sorted(UPLOAD_DIR.iterdir())
        if p.is_file()
    ]
    return {"dir": str(UPLOAD_DIR), "count": len(items), "files": items}
