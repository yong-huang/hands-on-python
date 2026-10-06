"""Lab 22 · 手写 TTL 缓存与令牌桶限流 —— 并发陷阱的两个现场。

两个组件:
- TTLCache: get_or_set 未命中时回调后端;无锁版在并发未命中下会重复计算(击穿),
  SafeCache 用 asyncio.Lock 把同 key 的并发收敛成一次真实计算(实测对比见 demo)。
- TokenBucket: 固定速率补充令牌、桶容量决定突发上限;不足则 429 + Retry-After。
所有状态存进程内存(教学装置);生产跨进程共享见 README 的边界一节。
"""

import asyncio
import time

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="Lab 22 · 缓存与限流")

BACKEND_CALLS: dict[str, int] = {}  # 后端真实计算计数(教学装置)


class TTLCache:
    """带过期时间的备忘录:命中直接返回,未命中回调后端并记账。"""

    def __init__(self, ttl: float) -> None:
        self.ttl = ttl
        self.store: dict[str, tuple[float, float]] = {}  # key -> (expire_at, value)

    async def get_or_set(self, key: str, producer) -> float:
        """无锁版:检查与写入之间有 await 空档——并发未命中会集体真实计算(击穿)。"""
        entry = self.store.get(key)
        if entry and entry[0] > time.monotonic():
            return entry[1]  # 命中:惰性过期判断
        value = await producer(key)  # await 期间,其他协程也查到未命中,跟着算
        self.store[key] = (time.monotonic() + self.ttl, value)
        return value


class SafeCache:
    """带锁版:asyncio.Lock 把同 key 的并发未命中收敛成一次真实计算。

    锁粒度取舍:全局锁实现最简单,代价是不同 key 也互相排队;
    分 key 锁并发更好,本实验聚焦"收敛成一次"的证据,用全局锁。
    """

    def __init__(self, ttl: float) -> None:
        self.ttl = ttl
        self.store: dict[str, tuple[float, float]] = {}
        self.lock = asyncio.Lock()

    async def get_or_set(self, key: str, producer) -> float:
        async with self.lock:
            entry = self.store.get(key)
            if entry and entry[0] > time.monotonic():
                return entry[1]
            value = await producer(key)  # 持锁期间计算,后来者等结果
            self.store[key] = (time.monotonic() + self.ttl, value)
            return value


class TokenBucket:
    """令牌桶:以 rate 枚/秒匀速补充,容量 capacity 决定突发上限。"""

    def __init__(self, rate: float, capacity: int) -> None:
        self.rate = rate
        self.capacity = capacity
        self.tokens = float(capacity)
        self.updated = time.monotonic()

    def consume(self) -> tuple[bool, float]:
        """尝试取一枚令牌;返回 (是否成功, 建议等待秒数)。"""
        now = time.monotonic()
        self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
        self.updated = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True, 0.0
        return False, (1 - self.tokens) / self.rate


CACHE = TTLCache(ttl=2.0)      # 无锁版,演示击穿
SAFE = SafeCache(ttl=2.0)      # 带锁版
BUCKET = TokenBucket(rate=2.0, capacity=3)  # 挂在 /rate-cached 上


async def slow_backend(ccp: str) -> float:
    """模拟慢汇率源:0.3s 延迟 + 计数。"""
    BACKEND_CALLS[ccp] = BACKEND_CALLS.get(ccp, 0) + 1
    await asyncio.sleep(0.3)
    return round(7.2 + len(ccp) * 0.01, 4)


def rate_limit_dependency(request: Request) -> None:
    ok, wait = BUCKET.consume()
    if not ok:
        raise HTTPException(
            status_code=429,
            detail=f"请求过于频繁,约 {wait:.2f}s 后重试",
            headers={"Retry-After": f"{max(1, int(wait) + 1)}"},
        )


@app.get("/rate/{ccp}")
async def rate_plain(ccp: str) -> dict:
    """无缓存直打后端:每次都付 0.3s。"""
    value = await slow_backend(ccp)
    return {"ccp": ccp, "rate": value, "backend_calls": BACKEND_CALLS.get(ccp, 0)}


@app.get("/rate-cached/{ccp}")
async def rate_cached(ccp: str) -> dict:
    """无锁缓存版:命中快,但并发未命中会击穿(见 demo [3])。"""
    value = await CACHE.get_or_set(ccp, slow_backend)
    return {"ccp": ccp, "rate": value, "backend_calls": BACKEND_CALLS.get(ccp, 0)}


@app.get("/rate-safe/{ccp}")
async def rate_safe(ccp: str) -> dict:
    """带锁缓存版:同 key 并发未命中只算一次。"""
    value = await SAFE.get_or_set(ccp, slow_backend)
    return {"ccp": ccp, "rate": value, "backend_calls": BACKEND_CALLS.get(ccp, 0)}


@app.get("/rate-limited/{ccp}", dependencies=[Depends(rate_limit_dependency)])
async def rate_limited(ccp: str) -> dict:
    value = await SAFE.get_or_set(ccp, slow_backend)
    return {"ccp": ccp, "rate": value}


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}


@app.post("/admin/reset")
async def admin_reset() -> dict:
    """清空缓存、计数与令牌桶(教学装置)。"""
    CACHE.store.clear()
    SAFE.store.clear()
    BACKEND_CALLS.clear()
    BUCKET.tokens = float(BUCKET.capacity)
    BUCKET.updated = time.monotonic()
    return {"ok": True}


@app.get("/backend-stats")
async def backend_stats() -> dict:
    return {"backend_calls": BACKEND_CALLS, "cache_entries": len(SAFE.store)}


@app.exception_handler(429)
async def ratelimit_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=429, content={"detail": exc.detail},
                        headers=exc.headers or {})
