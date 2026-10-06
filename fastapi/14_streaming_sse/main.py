"""lab 14 · 流式响应与 SSE —— 演示应用：进度报告 API。

普通响应把整个结果攒在内存里、攒完才发；本实验演示两条"边生成边发送"的路：

    GET /healthz          对照组：普通 JSON 响应，一次性发送（有 Content-Length）
    GET /chunks-buffered  反面教材：同样的 3 块内容，攒齐后一次性返回
    GET /stream-chunks    分块传输：StreamingResponse + async 生成器，逐块 yield、
                        块间 sleep 0.4s；传输层标 Transfer-Encoding: chunked，
                        服务器每生成一块就发一块，客户端逐块收到 —— 只管运输。
    GET /events         SSE（Server-Sent Events，服务器推送事件）：同样是
                        StreamingResponse，但 media_type="text/event-stream"，
                        报文按 SSE 协议逐行手写：retry:/id:/event:/data: 四类行
                        加空行分隔 —— 既管格式，也管断线重连语义（浏览器
                        EventSource 读 retry:/id: 自动恢复，本实验用 python 客户端）。

两条路的分工一句话：chunked 只约定"怎么运"（总长未知、逐块发送），SSE 在它之上
约定"运的是什么"（事件报文格式）与"断了怎么办"（retry 间隔 + Last-Event-ID 续传）。

运行（由 14_streaming_sse.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/14_streaming_sse --host 127.0.0.1 --port 8914
"""

import asyncio
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse

# ---------------------------------------------------------------------------
# 常量：演示用的"生成节奏"。sleep 是刻意的——没有它，3 块会瞬间生成完，
# 客户端看到的到达时刻就分不出先后，"流式"无从演示。
# ---------------------------------------------------------------------------
CHUNK_INTERVAL = 0.4  # 每块 yield 前的停顿（秒）：模拟"下一段还没算出来"
SSE_INTERVAL = 0.3    # SSE 相邻两个事件之间的停顿（秒）

CHUNK_TEXTS: list[str] = [
    "任务已接收，开始处理",
    "处理进行中，进度 50%",
    "处理完成，结果就绪",
]

SSE_STEPS: list[str] = [
    "编译完成",
    "测试通过（18 个用例）",
    "镜像构建完成",
]

app = FastAPI(
    title="lab14 · 流式响应与 SSE",
    description="StreamingResponse 分块传输 vs Server-Sent Events：边生成边发送的两条路",
)


# ---------------------------------------------------------------------------
# 对照组：普通响应 —— 整个 dict 一次返回，框架攒齐后按 Content-Length 发送
# ---------------------------------------------------------------------------
@app.get("/healthz")
async def healthz() -> dict[str, str]:
    """普通 JSON 响应：响应头里有 Content-Length，没有 Transfer-Encoding。

    demo 章节[2]用它对照：内容总长已知 -> 一次发完；流式响应恰恰相反——
    生成器还没跑完，总长未知，所以没有 Content-Length，只能逐块发。
    """
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# 反面教材：同样的 3 块内容，非流式攒齐后一次性返回 —— demo 章节[1]的对照组
# ---------------------------------------------------------------------------
@app.get("/chunks-buffered")
async def chunks_buffered() -> dict[str, str]:
    """非流式对照：先 sleep 完全部生成耗时（3 x 0.4s），再整包返回。

    它和 /stream-chunks 的内容完全相同，客户端体验却不同：整个响应体在
    约 1.2s 后一次性到达（一个 Content-Length、一次交付），期间用户盯着
    空白等待。demo 用它证明"逐块到达"是 StreamingResponse 带来的行为差异，
    不是内容本身的属性。
    """
    await asyncio.sleep(CHUNK_INTERVAL * len(CHUNK_TEXTS))  # 模拟攒齐全部 3 段的耗时
    return {"chunks": "\n".join(f"[chunk {i}] 第 {i + 1}/3 段：{t}" for i, t in enumerate(CHUNK_TEXTS))}


# ---------------------------------------------------------------------------
# 路 1：分块传输（chunked）—— 生成器每 yield 一次，服务器就把这一块发出去
# ---------------------------------------------------------------------------
@app.get("/stream-chunks")
async def stream_chunks() -> StreamingResponse:
    """分块传输：async 生成器是响应体本身，yield 一次 = 网络上到一块。

    为什么用 async 生成器而不是普通函数拼字符串：普通函数必须把 3 块全攒齐、
    return 一次交出整个响应体；生成器把"生成"拆成 3 次 yield，服务器每次
    yield 都能立刻把这一块推给客户端，客户端不用等后两块生成完。
    """

    async def body() -> AsyncIterator[bytes]:
        for i, text in enumerate(CHUNK_TEXTS):
            await asyncio.sleep(CHUNK_INTERVAL)  # yield 前停顿：模拟逐段生成的耗时
            yield f"[chunk {i}] 第 {i + 1}/3 段：{text}\n".encode("utf-8")

    return StreamingResponse(
        body(),
        media_type="text/plain; charset=utf-8",
        headers={
            # X-Chunk-Count 提前告诉客户端"共 3 块"——chunked 传输本身不带块数，
            # 总长未知，客户端只能数到流结束；这个头仅供 demo 对照
            "X-Chunk-Count": str(len(CHUNK_TEXTS)),
            "X-Chunk-Interval": f"{CHUNK_INTERVAL}",
        },
    )


# ---------------------------------------------------------------------------
# 路 2：SSE —— 在 chunked 之上定义"事件报文"格式与重连语义
# ---------------------------------------------------------------------------
def sse_event(event_name: str, data: str, event_id: str) -> str:
    """把一条事件编成 SSE 报文：event:/id:/data: 三类行 + 一个空行收尾。

    行序协议不关心（客户端按行首字段名解析），但末尾空行是硬性要求——
    它是事件的边界，漏掉它客户端会把相邻两条事件攒成一条，永远不派发。
    每个字段行格式固定为"字段名: 值"（冒号后可选一个空格）。
    """
    return f"event: {event_name}\nid: {event_id}\ndata: {data}\n\n"


@app.get("/events")
async def events() -> StreamingResponse:
    """SSE 端点：先发 retry:/id: 两条控制行，再发 3 条 progress + 1 条 done。

    浏览器侧的 EventSource 对象拿到 retry 行会记住"断线后等 2000ms 再重连"，
    拿到 id 行会记住"最后收到的事件 ID"，重连时经 Last-Event-ID 请求头带回，
    服务端据此从断点续传。本实验用 python 客户端演示协议原文，不做重连。
    """

    async def body() -> AsyncIterator[str]:
        # 开场控制块：retry 行约定重连间隔（省略时浏览器默认约 3s）；id 行
        # 先把"最后事件 ID"置 0。注意这两行后面没有 data: 行，所以不构成
        # 事件、客户端不派发——SSE 规定只有攒到 data 的事件才会触发监听器。
        yield "retry: 2000\nid: 0\n\n"

        for i, text in enumerate(SSE_STEPS, start=1):
            await asyncio.sleep(SSE_INTERVAL)  # 停顿：让客户端观察到事件逐个到达
            yield sse_event("progress", data=f"[{i}/{len(SSE_STEPS)}] {text}", event_id=str(i))

        yield sse_event(
            "done",
            data=f"全部 {len(SSE_STEPS)} 步完成",
            event_id=str(len(SSE_STEPS) + 1),
        )

    return StreamingResponse(
        body(),
        media_type="text/event-stream",  # SSE 协议规定的固定 Content-Type
        headers={
            "Cache-Control": "no-cache",  # 事件流不许被缓存
            # 反向代理（如 nginx）默认会把上游响应攒进缓冲区再转发，事件流会
            # 被憋成一坨；X-Accel-Buffering: no 逐响应关掉它（详见 lab 23）
            "X-Accel-Buffering": "no",
        },
    )
