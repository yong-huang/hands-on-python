"""Lab 25 · 压测基准的被测应用:快慢两个端点。"""

import asyncio

from fastapi import FastAPI

app = FastAPI(title="Lab 25 · 压测基准")


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}


@app.get("/fast")
async def fast() -> dict:
    """无等待端点:测的是框架与客户端的每请求开销。"""
    return {"ok": True, "n": 1}


@app.get("/slow")
async def slow() -> dict:
    """0.1s IO 等待端点:测的是并发模型对等待的重叠能力。"""
    await asyncio.sleep(0.1)
    return {"ok": True, "slept": 0.1}
