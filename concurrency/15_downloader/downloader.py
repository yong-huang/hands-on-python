"""
🏁 15 · 可切换执行模型的并发下载器 —— sync / thread / process / async 四后端
并发清单项目 15（终极串联）：限流、重试、断点续传、SHA256 校验、并发上限观测

架构:
- 内置本地文件服务（aiohttp，20 个随机内容文件，seed 固定 → 清单跨轮一致，离线可跑）
- 统一入口 download_round(model, limit)：sync / thread / process / async 四后端一键切换
- 限流（--limit）+ 指数退避重试；已存在文件自动跳过（断点续传）；SHA256 逐一校验
- 服务端观测"同时在飞峰值"，断言并发上限真实生效

用法:
- python3 downloader.py --model async --limit 5 --twice    # 单模型 + 续传演示
- python3 downloader.py --verify-all --limit 5             # 四模式全跑 + 全部断言
交互示意图: 用浏览器打开 images/downloader.archify.html
"""

import argparse
import asyncio
import hashlib
import json
import multiprocessing
import os
import random
import shutil
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen
from urllib.error import URLError, HTTPError

import aiohttp
from aiohttp import web

N_FILES = 20
FILE_SIZE = 24 * 1024
MAX_ATTEMPTS = 4
DL_DIR = "/tmp/_downloader_files"
SEED = 7                                    # 固定种子：每轮服务的文件内容一致


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 文件服务：内容 seed 固定（跨轮/跨进程一致）+ 在飞峰值观测
# ============================================================

class FileServer:
    def __init__(self) -> None:
        rng = random.Random(SEED)
        self.contents = {
            f"/file/{i}": bytes(rng.getrandbits(8) for _ in range(FILE_SIZE))
            for i in range(N_FILES)
        }
        self.hashes = {p: hashlib.sha256(d).hexdigest() for p, d in self.contents.items()}
        self.in_flight = 0
        self.peak = 0

    def make_app(self) -> web.Application:
        app = web.Application()

        async def manifest(request: web.Request) -> web.Response:
            return web.json_response({"files": list(self.hashes)})

        async def file_ep(request: web.Request) -> web.Response:
            self.in_flight += 1
            self.peak = max(self.peak, self.in_flight)
            try:
                await asyncio.sleep(0.03)
                return web.Response(body=self.contents[request.path])
            finally:
                self.in_flight -= 1

        app.router.add_get("/manifest", manifest)
        app.router.add_get("/file/{name}", file_ep)
        return app


async def _serve(fs: FileServer, holder: dict) -> None:
    runner = web.AppRunner(fs.make_app())
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    holder["base"] = f"http://127.0.0.1:{runner.addresses[0][1]}"
    holder["runner"] = runner
    await asyncio.Event().wait()            # 常驻：asyncio.run(_serve) 若返回会关循环杀服务


# ============================================================
# 协议层：阻塞抓取（带重试）——sync/thread/process 三后端共用
# ============================================================

def fetch_once_blocking(base: str, path: str, dest: str, expected: str) -> bool:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with urlopen(f"{base}{path}", timeout=10) as resp:
                if resp.status == 200:
                    data = resp.read()
                    if hashlib.sha256(data).hexdigest() != expected:
                        raise IOError("sha256 不符")
                    with open(dest, "wb") as f:
                        f.write(data)
                    return True
        except (URLError, HTTPError, TimeoutError, IOError):
            if attempt == MAX_ATTEMPTS:
                return False
            time.sleep(0.05 * 2 ** (attempt - 1))   # 指数退避
    return False


def reset_dir() -> None:
    shutil.rmtree(DL_DIR, ignore_errors=True)
    os.makedirs(DL_DIR, exist_ok=True)


def pending(manifest_files: dict) -> list:
    return [p for p in manifest_files
            if not os.path.exists(f"{DL_DIR}/{os.path.basename(p)}")]


def verify_all(hashes: dict) -> int:
    good = 0
    for path, expected in hashes.items():
        dest = f"{DL_DIR}/{os.path.basename(path)}"
        with open(dest, "rb") as f:
            assert hashlib.sha256(f.read()).hexdigest() == expected, f"{path} 校验失败"
        good += 1
    return good


# ============================================================
# 四个后端
# ============================================================

def round_sync(fs: FileServer, base: str, hashes: dict, limit: int) -> dict:
    ok = 0
    todo = pending(hashes)
    for path in todo:
        ok += fetch_once_blocking(base, path, f"{DL_DIR}/{os.path.basename(path)}",
                                  hashes[path])
    return {"ok": ok, "todo": len(todo), "peak": fs.peak}


def round_threads(fs: FileServer, base: str, hashes: dict, limit: int) -> dict:
    todo = pending(hashes)
    with ThreadPoolExecutor(max_workers=limit) as pool:
        futs = {pool.submit(fetch_once_blocking, base, p,
                            f"{DL_DIR}/{os.path.basename(p)}", hashes[p]): p
                for p in todo}
        ok = sum(1 for f in futs if f.result())
    return {"ok": ok, "todo": len(todo), "peak": fs.peak}


def _process_fetcher(base: str, paths: list, hashes: dict, done_q) -> None:
    ok = 0
    for p in paths:
        ok += fetch_once_blocking(base, p, f"{DL_DIR}/{os.path.basename(p)}", hashes[p])
    done_q.put(ok)


def round_process(fs: FileServer, base: str, hashes: dict, limit: int) -> dict:
    """真子进程：每个子进程走网络访问父进程的服务（服务端峰值可观测）"""
    todo = pending(hashes)
    share = [[] for _ in range(limit)]
    for i, p in enumerate(todo):
        share[i % limit].append(p)
    done_q = multiprocessing.Queue()
    procs = [multiprocessing.Process(target=_process_fetcher,
                                     args=(base, share[i], hashes, done_q))
             for i in range(limit) if share[i]]
    for p in procs:
        p.start()
    ok = sum(done_q.get() for _ in procs)
    for p in procs:
        p.join()
    return {"ok": ok, "todo": len(todo), "peak": fs.peak}


async def round_async(fs: FileServer, limit: int) -> tuple:
    holder: dict = {}
    server = asyncio.create_task(_serve(fs, holder))   # 常驻任务：本轮结束才取消
    while "base" not in holder:
        await asyncio.sleep(0.05)
    base = holder["base"]
    sem = asyncio.Semaphore(limit)
    ok = 0
    hashes = fs.hashes

    async def one(session, path: str) -> None:
        nonlocal ok
        dest = f"{DL_DIR}/{os.path.basename(path)}"
        async with sem:
            for attempt in range(1, MAX_ATTEMPTS + 1):
                try:
                    async with session.get(f"{base}{path}") as resp:
                        if resp.status != 200:
                            raise IOError(f"HTTP {resp.status}")
                        data = await resp.read()
                        if hashlib.sha256(data).hexdigest() != hashes[path]:
                            raise IOError("sha256 不符")
                        with open(dest, "wb") as f:
                            f.write(data)
                        ok += 1
                        return
                except (aiohttp.ClientError, asyncio.TimeoutError, IOError):
                    if attempt == MAX_ATTEMPTS:
                        return
                    await asyncio.sleep(0.05 * 2 ** (attempt - 1))

    async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10)) as session:
        async with session.get(f"{base}/manifest") as resp:
            files = (await resp.json())["files"]
        todo = pending(hashes)
        await asyncio.gather(*(one(session, p) for p in todo))
    peak = fs.peak
    await holder["runner"].cleanup()
    server.cancel()
    return hashes, {"ok": ok, "todo": len(todo), "peak": peak}


def download_round(model: str, limit: int, reset: bool = True) -> tuple:
    """统一入口：四种后端一键切换。返回 (hashes, 统计)。reset=False 时断点续传"""
    if reset:
        reset_dir()
    if model == "async":
        return asyncio.run(round_async(FileServer(), limit))
    fs = FileServer()
    holder: dict = {}
    t = threading.Thread(target=lambda: asyncio.run(_serve(fs, holder)), daemon=True)
    t.start()
    for _ in range(50):
        if "base" in holder:
            break
        time.sleep(0.1)
    base = holder["base"]
    if model == "sync":
        result = round_sync(fs, base, fs.hashes, limit)
    elif model == "thread":
        result = round_threads(fs, base, fs.hashes, limit)
    elif model == "process":
        result = round_process(fs, base, fs.hashes, limit)
    else:
        raise ValueError(model)
    return fs.hashes, result


# ============================================================
# 主流程
# ============================================================

def main() -> None:
    parser = argparse.ArgumentParser(description="🏁 可切换执行模型的并发下载器")
    parser.add_argument("--model", default="async",
                        choices=["sync", "thread", "process", "async"])
    parser.add_argument("--limit", type=int, default=5, help="并发上限")
    parser.add_argument("--twice", action="store_true", help="断点续传演示")
    parser.add_argument("--verify-all", action="store_true", help="四模式全跑 + 断言")
    args = parser.parse_args()

    if args.verify_all:
        section(f"四模式全跑（--limit {args.limit}）")
        report = {}
        for model in ["sync", "thread", "process", "async"]:
            hashes, result = download_round(model, args.limit)
            good = verify_all(hashes)
            report[model] = result
            print(f"  {model:<8} 补下 {result['todo']:>2} → 成功 {result['ok']:>2}，"
                  f"服务端在飞峰值 {result['peak']:>2}，SHA256 校验 {good}/{N_FILES}")
            assert result["ok"] == result["todo"]
            assert good == N_FILES, f"{model} 校验失败"
            assert result["peak"] <= args.limit, f"{model} 并发超限: {result['peak']}"
        print("\n  断言：四模式全部成功 ✓ 并发上限全部生效 ✓ 校验全部通过 ✓")
        print("  同一套协议代码，四种执行模型结果完全一致 —— 统一接口的价值")
        return

    section(f"下载：--model {args.model} --limit {args.limit}")
    hashes, result = download_round(args.model, args.limit)
    print(f"  补下 {result['todo']} → 成功 {result['ok']}，服务端在飞峰值 = {result['peak']}")
    assert result["peak"] <= args.limit, f"并发超限: {result['peak']}"
    print(f"  SHA256 校验通过 {verify_all(hashes)}/{N_FILES}")

    if args.twice:
        section("断点续传：删掉一半文件再跑（只补缺失）")
        files = sorted(os.listdir(DL_DIR))
        for f in files[: len(files) // 2]:
            os.remove(f"{DL_DIR}/{f}")
        hashes, result = download_round(args.model, args.limit, reset=False)
        good = verify_all(hashes)
        print(f"  第二轮补下 {result['todo']} 个（其余跳过），最终校验 {good}/{N_FILES}")
        assert good == N_FILES
        print("  断点续传 ✓")


if __name__ == "__main__":
    main()
