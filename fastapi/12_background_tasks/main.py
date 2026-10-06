"""lab 12 · 后台任务三形态 —— 演示应用：邮件通知 API。

同一个伪发送工作（sleep 0.5 模拟 SMTP 耗时，完成后写 outbox 记录），分别交给三种
"响应之后继续干活"的机制，对比它们的时序与可靠性边界：

    POST /notify-bg      BackgroundTasks：Starlette 在响应发送后、同一进程内顺序执行
    POST /notify-task    asyncio.create_task：fire-and-forget（发起后不管），立即调度，
                         返回 Task 对象，没人 await 就没人看异常
    POST /notify-queue   任务队列语义（演示版）：投进进程内 asyncio.Queue，
                         常驻 worker（在 lifespan 里启动）逐件消费
    GET  /outbox         查看已完成 / 已标记失败的"邮件"记录
    POST /fail-bg        bg 形态故意抛异常：工作函数先落账 failed 再 raise，
                         实测异常沿 ASGI 调用链冒到 uvicorn 日志（traceback）
    POST /fail-task      task 形态故意抛异常：裸抛不落账，实测响应照常 202、
                         outbox 无记录——异常被 Task 对象持有，没人取就静默消失
    POST /reset          清空 outbox 与邮件编号（教学装置，保证 demo 可重复跑）

可靠性边界（如实标注）：三形态的"队列"都活在本进程里，进程重启即丢，也无持久化；
生产环境要可靠投递应使用外部队列（Redis / Celery / 云厂商队列），本系列零依赖不装，
只把边界讲清楚。

本机实测结论（fastapi 0.142.2 / starlette 1.7.0 / Python 3.13.9，见 12_background_tasks.sh）：
  1. 三种形态的 POST 都在毫秒级返回 202，伪发送在约 0.5s 后才落进 outbox；
  2. /fail-bg 的 RuntimeError 出现在服务端日志（Exception in ASGI application + traceback），
     outbox 里的 failed 标记是工作函数自己落账的——框架不追踪后台任务的成败；
  3. /fail-task 响应 202 后什么都没发生：outbox 无记录、日志无 traceback，
     异常持有在 Task 对象里直到被 GC（此时 asyncio 才可能补一条
     "Task exception was never retrieved"——这是它唯一的痕迹，时机不确定）。

OUTBOX / QUEUE 是进程内可变状态，多 worker 部署时每个进程各一份，见 README。
运行（由 12_background_tasks.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/12_background_tasks --host 127.0.0.1 --port 8912
"""

from __future__ import annotations

import asyncio
import itertools
import logging
import time
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# outbox：已完成"邮件"的进程内记录（教学装置）。每条 = {id, channel, to, status,
# accepted_at, finished_at, error?}；channel 是来源标记 bg/task/queue，
# status 取 done/failed。demo 的断言全部围着这张列表做。
# ---------------------------------------------------------------------------
OUTBOX: list[dict[str, Any]] = []

# 伪发送的停顿：模拟 SMTP 耗时。0.5s 远大于本机一次请求（约 10ms），
# 让"响应先回、任务后完"的时序肉眼可见、可断言。
SEND_DELAY = 0.5

# 邮件编号：每个被接受的请求领一个 m#N，响应体与 outbox 记录共用，便于对账。
_email_seq = itertools.count(1)

# queue 形态的任务队列：进程内 asyncio.Queue（异步先进先出队列），进程重启即丢。
QUEUE: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

# fire-and-forget 任务的强引用。事件循环对运行中的 Task 只持弱引用
# （不阻止垃圾回收的引用），不留引用的任务可能跑到一半被回收；
# 完成后由 done_callback 自动移出集合。
TASKS: set[asyncio.Task[None]] = set()

# 常驻 worker 任务的引用，lifespan 关闭阶段用它来取消。
_worker: asyncio.Task[None] | None = None


def record(job: dict[str, Any], status: str, error: str | None = None) -> None:
    """把一条邮件记录写进 outbox：来源、收件人、状态与两端时间戳。"""
    OUTBOX.append(
        {
            "id": job["id"],
            "channel": job["channel"],
            "to": job["to"],
            "status": status,
            "accepted_at": job["accepted_at"],
            "finished_at": time.time(),
            "error": error,
        }
    )


# ---------------------------------------------------------------------------
# 伪发送工作：三种形态共用同一份函数体，保证对比只差在"交给谁"。
# fail 模式先落账 failed 再 raise——模拟"自己记录失败 + 让异常照常上报"；
# 注意这是工作函数自己写的落账，框架不会替任何一种形态标记失败。
# ---------------------------------------------------------------------------
async def send_email(job: dict[str, Any]) -> None:
    await asyncio.sleep(SEND_DELAY)  # 模拟 SMTP 发送耗时
    if job["mode"] == "fail":
        record(job, status="failed", error="SMTP 连接被拒绝（实验性异常）")
        raise RuntimeError(f"邮件 {job['id']} 发送失败（实验性异常）")
    record(job, status="done")


async def send_email_silent_fail(job: dict[str, Any]) -> None:
    """task 形态的失败实验：最朴素的写法——只抛异常，不落账。

    异常会被 asyncio 存进 Task 对象；没人 await、没人调 .exception() 取走，
    任何记录都不会产生，这就是 create_task 形态的默认风险。
    """
    await asyncio.sleep(SEND_DELAY)
    raise RuntimeError(f"邮件 {job['id']} 发送失败（实验性异常）")


# ---------------------------------------------------------------------------
# queue 形态的常驻 worker：死循环取任务、执行、标记完成。
# try/except 包住执行体是队列形态的可靠性来源——worker 是唯一"看异常的人"，
# 单件失败不杀死消费循环；task_done() 放 finally，投递方才能可靠地 join 统计。
# ---------------------------------------------------------------------------
async def queue_worker() -> None:
    while True:
        job = await QUEUE.get()
        try:
            await send_email(job)
        except Exception as exc:
            # send_email 已把该件落账为 failed；这里不再重复落账，
            # 只记录并保住消费循环——常驻 worker 死一次，队列就永久积压
            logging.getLogger(__name__).warning("queue worker 吞掉单件异常: %r", exc)
        finally:
            QUEUE.task_done()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """lifespan（应用启动与关闭时各执行一次的钩子）：启动时开 worker，关闭时取消。"""
    global _worker, _email_seq
    OUTBOX.clear()
    _email_seq = itertools.count(1)  # demo 反复跑时从确定状态出发
    _worker = asyncio.create_task(queue_worker(), name="outbox-worker")
    yield
    _worker.cancel()
    try:
        await _worker
    except asyncio.CancelledError:
        pass  # 关闭阶段取消常驻任务属预期路径，吞掉取消异常即可


app = FastAPI(
    title="lab12 · 后台任务三形态",
    lifespan=lifespan,
    description="BackgroundTasks / asyncio.create_task / 进程内队列的时序与异常去向对比",
)


class Recipient(BaseModel):
    """POST 三个 notify 端点共用的请求体。"""

    to: str = Field(min_length=3, description="收件人地址，演示用任意字符串")


def _accept(channel: str, body: Recipient, mode: str = "ok") -> dict[str, Any]:
    """登记一件新邮件：领编号、记接受时刻，返回 job（工作函数用）与响应体共用的底稿。"""
    return {
        "id": f"m#{next(_email_seq)}",
        "channel": channel,
        "to": body.to,
        "mode": mode,
        "accepted_at": time.time(),
    }


def _accepted(job: dict[str, Any], note: str) -> dict[str, Any]:
    """统一的 202 响应体：accepted_at 用于和 outbox 的 finished_at 对时序。"""
    return {
        "id": job["id"],
        "channel": job["channel"],
        "status": "accepted",
        "accepted_at": job["accepted_at"],
        "note": note,
    }


# ---------------------------------------------------------------------------
# [1] BackgroundTasks 形态：add_task 只是把 (函数, 参数) 挂到响应对象上，
# 端点照常返回；Starlette 发完响应体后逐个 await 它们。
# ---------------------------------------------------------------------------
@app.post("/notify-bg", status_code=202)
async def notify_bg(body: Recipient, background_tasks: BackgroundTasks) -> dict[str, Any]:
    job = _accept("bg", body)
    background_tasks.add_task(send_email, job)
    return _accepted(job, "响应发送后由 BackgroundTasks 执行")


# ---------------------------------------------------------------------------
# [2] create_task 形态：立即在事件循环上调度，不等响应发送；Task 对象没人
# await（等待其完成并取结果），异常无人消费。必须保留强引用防 GC。
# ---------------------------------------------------------------------------
@app.post("/notify-task", status_code=202)
async def notify_task(body: Recipient) -> dict[str, Any]:
    job = _accept("task", body)
    task = asyncio.create_task(send_email(job))
    TASKS.add(task)
    task.add_done_callback(TASKS.discard)
    return _accepted(job, "已由 create_task 立即调度，无人 await")


# ---------------------------------------------------------------------------
# [3] queue 形态：只投递不执行，await QUEUE.put 在队列有界满时会等待（背压）；
# 消费节奏完全由常驻 worker 决定，本实验里逐件串行，每件 SEND_DELAY。
# ---------------------------------------------------------------------------
@app.post("/notify-queue", status_code=202)
async def notify_queue(body: Recipient) -> dict[str, Any]:
    job = _accept("queue", body)
    await QUEUE.put(job)
    return _accepted(job, f"已入队，队列积压 {QUEUE.qsize()} 件")


# ---------------------------------------------------------------------------
# [4] outbox 出口与教学装置 /reset：demo 每个章节先 reset，再对记录数与顺序断言。
# ---------------------------------------------------------------------------
@app.get("/outbox")
async def outbox() -> dict[str, Any]:
    return {"count": len(OUTBOX), "items": list(OUTBOX)}


@app.post("/reset")
async def reset() -> dict[str, Any]:
    OUTBOX.clear()
    return {"ok": True, "count": 0}


# ---------------------------------------------------------------------------
# [5] 失败实验端点：同样的 202，两种形态的异常分别流向服务端日志与 Task 对象。
# ---------------------------------------------------------------------------
@app.post("/fail-bg", status_code=202)
async def fail_bg(body: Recipient, background_tasks: BackgroundTasks) -> dict[str, Any]:
    job = _accept("bg", body, mode="fail")
    background_tasks.add_task(send_email, job)
    return _accepted(job, "工作函数将先落账 failed，再抛 RuntimeError 进服务端日志")


@app.post("/fail-task", status_code=202)
async def fail_task(body: Recipient) -> dict[str, Any]:
    job = _accept("task", body, mode="fail")
    task = asyncio.create_task(send_email_silent_fail(job))
    TASKS.add(task)
    task.add_done_callback(TASKS.discard)  # 引用随完成移除，异常随后无人取——静默
    return _accepted(job, "异常将被 Task 对象持有，无人 await 即不可见")
