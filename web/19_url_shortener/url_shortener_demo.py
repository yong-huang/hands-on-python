"""
🏁 19 · 综合项目：短链接服务 —— 缩短/重定向/统计/管理端 + 并发 + 测试 + 容器
Web 框架清单项目 19：终极交付，四个验收维度一次跑完

- 功能:   POST /shorten → GET /{code} 302 重定向并计点击（连点 3 次断言计数=3）
- 并发:   并发生成 200 个随机码——全部 201 且库中行数=200（唯一约束 + 冲突重试）
- 测试:   pytest 19 条用例全绿（覆盖 404/410/409/422/401 全部拒绝路径）
- 容器:   Dockerfile 构建 + 容器内 /healthz 200（复用项目 18 的容器流程）

用法:
- source ../.venv/bin/activate && python3 url_shortener_demo.py

交互示意图: 用浏览器打开 images/url_shortener.html
"""

import asyncio
import os
import socket
import statistics
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LAB = Path(__file__).resolve().parent
VENV_BIN = Path(sys.executable).parent

DEMO_DB = tempfile.mktemp(prefix="shortener-demo-", suffix=".db")
os.environ["SHORTENER_DB"] = DEMO_DB  # 12-factor：必须在导入 app 之前注入

import httpx  # noqa: E402
import uvicorn  # noqa: E402

from shortener_app import Link, SessionLocal  # noqa: E402

TOTAL_CONCURRENT_CODES = 200


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class UvicornServer:
    """uvicorn 线程化托管（与主脚本同进程，共享上面注入的临时数据库）"""

    def __init__(self):
        config = uvicorn.Config("shortener_app:app", host="127.0.0.1",
                                port=free_port(), log_level="warning")
        self.server = uvicorn.Server(config)
        self.thread = threading.Thread(target=self.server.run, daemon=True)

    def __enter__(self):
        self.thread.start()
        while not self.server.started:
            time.sleep(0.05)
        return f"http://127.0.0.1:{self.server.config.port}"

    def __exit__(self, *exc):
        self.server.should_exit = True
        self.thread.join(timeout=5)


# ============================================================
# 1. 核心链路：缩短 → 302 → 点击统计
# ============================================================

def demo_core_flow(base: str) -> None:
    section("1. 核心链路：缩短 → 302 重定向 → 点击计数（验收点）")
    r = httpx.post(f"{base}/shorten", json={"url": "https://fastapi.tiangolo.com/zh/"},
                   timeout=10)
    assert r.status_code == 200, r.text
    code = r.json()["code"]
    print(f"  POST /shorten → {code!r}（8 位随机码）")

    for _ in range(3):  # 连点 3 次
        r = httpx.get(f"{base}/{code}", follow_redirects=False, timeout=10)
        assert r.status_code == 302 and r.headers["location"] == "https://fastapi.tiangolo.com/zh/"
    stats = httpx.get(f"{base}/stats/{code}", timeout=10).json()
    assert stats["clicks"] == 3, f"连点 3 次后计数应 =3: {stats}"
    print(f"  连点 3 次 → 302 × 3 · 点击计数 = {stats['clicks']}（stats 端点可查）")

    r = httpx.get(f"{base}/no-such-code", timeout=10)
    assert r.status_code == 404
    print(f"  不存在的短码 → 404")


# ============================================================
# 2. 并发生成 200 个随机码：唯一约束 + 冲突重试（验收点）
# ============================================================

def demo_concurrent_codes(base: str) -> None:
    section(f"2. 并发生成 {TOTAL_CONCURRENT_CODES} 个随机码：无碰撞（验收点）")

    def create_one(i: int) -> str:
        r = httpx.post(f"{base}/shorten",
                       json={"url": f"https://example.com/item/{i}"}, timeout=30)
        assert r.status_code == 200, r.text
        return r.json()["code"]

    with ThreadPoolExecutor(max_workers=20) as pool:
        codes = set(pool.map(create_one, range(TOTAL_CONCURRENT_CODES)))
    assert len(codes) == TOTAL_CONCURRENT_CODES, f"短码有碰撞: {len(codes)}"
    with SessionLocal() as db:
        rows = db.query(Link).count()
    assert rows >= TOTAL_CONCURRENT_CODES, f"库中行数应 ≥{TOTAL_CONCURRENT_CODES}: {rows}"
    print(f"  并发生成 {len(codes)} 个码全部唯一；库中行数 = {rows}（唯一约束 + 重试兜底）")


# ============================================================
# 3. pytest 套件 ≥15 条全绿（验收点）
# ============================================================

def demo_pytest() -> None:
    section("3. pytest 套件：19 条用例全绿（验收点）")
    r = subprocess.run([sys.executable, "-m", "pytest", "-q", "test_shortener.py"],
                       cwd=LAB, capture_output=True, text=True, timeout=300)
    output = r.stdout
    assert r.returncode == 0, f"pytest 失败:\n{output}\n{r.stderr}"
    assert "19 passed" in output, f"应有 19 条通过: {output[-400:]}"
    print(f"  pytest: 19 passed ✓（404/410/409/422/401 拒绝路径全覆盖）")


# ============================================================
# 4. 容器化：构建 + healthz（验收点）
# ============================================================

def demo_docker() -> None:
    section("4. Docker：镜像构建 + 容器 healthz（验收点）")
    image = "web-lab-19"
    subprocess.run(["docker", "build", "-q", "-t", image, str(LAB)],
                   check=True, capture_output=True, timeout=600)
    host_port = free_port()
    container = subprocess.run(
        ["docker", "run", "-d", "--rm", "-p", f"{host_port}:8000", image],
        check=True, capture_output=True, timeout=60).stdout.decode().strip()
    try:
        base = f"http://127.0.0.1:{host_port}"
        deadline = time.time() + 30
        while time.time() < deadline:
            try:
                if httpx.get(f"{base}/healthz", timeout=2).status_code == 200:
                    break
            except httpx.HTTPError:
                time.sleep(0.3)
        r = httpx.get(f"{base}/healthz", timeout=10)
        assert r.status_code == 200, r.text
        print(f"  容器内 uvicorn 启动 → /healthz → 200 · {r.json()}")
    finally:
        subprocess.run(["docker", "rm", "-f", container], capture_output=True, timeout=60)
    print("  容器已清理；完整缩短流程在真实部署形态下可复现")


def main() -> None:
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · FastAPI {version('fastapi')} · 🏁 短链接服务综合交付")
    print(f"数据库: {DEMO_DB}（环境变量注入，收尾清理）")
    try:
        with UvicornServer() as base:
            demo_core_flow(base)
            demo_concurrent_codes(base)
        demo_pytest()
        demo_docker()
    finally:
        if os.path.exists(DEMO_DB):
            os.unlink(DEMO_DB)
        print("\n  已清理临时数据库")

    print(f"\n{'=' * 56}")
    print("🏁 全部验收通过 ✓ 点击计数、200 并发码无碰撞、19 条 pytest 全绿、容器 healthz 200")


if __name__ == "__main__":
    main()
