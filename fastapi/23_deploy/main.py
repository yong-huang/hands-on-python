"""Lab 23 · workers 模型的观察窗口:PID 与每进程独立计数。"""

import os

from fastapi import FastAPI

app = FastAPI(title="Lab 23 · workers 模型")
COUNT: dict[int, int] = {}  # pid -> 该进程处理过的请求数(进程内存,不共享)


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}


@app.get("/pid")
def pid() -> dict:
    """返回当前进程号与该进程的累计请求数。"""
    COUNT[os.getpid()] = COUNT.get(os.getpid(), 0) + 1
    return {"pid": os.getpid(), "count": COUNT[os.getpid()]}


@app.get("/stats")
def stats() -> dict:
    """回显本进程眼中的全部计数(多 worker 下各答各的)。"""
    return {"seen_by_this_process": os.getpid(), "counts": COUNT}
