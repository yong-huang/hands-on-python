"""
18 · 生产部署 —— gunicorn worker / 12-factor / Docker（验收点全覆盖）
Web 框架清单项目 18：把 dev server 换成生产姿态

三个部署事实（对应 images/production_deploy.svg）:
- 多 worker:  gunicorn -w 4 起四个进程共享监听 socket——100 个请求实测
            分发到 ≥3 个不同 PID（与项目 10 的 uvicorn --workers 同机制）
- 12-factor:  配置走环境变量——同一镜像/代码，APP_MODE=prod/dev 切出不同行为
- 容器化:     Dockerfile 构建 + 容器内 /healthz 200——"在我机器上能跑"的终结者

用法:
- source ../.venv/bin/activate && python3 deploy_demo.py
- 需 Docker daemon（2026-09-10 实测本机在运行）；首次构建会拉基础镜像

交互示意图: 用浏览器打开 images/production_deploy.html
"""

import httpx
import os
import socket
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LAB = Path(__file__).resolve().parent
VENV_BIN = Path(sys.executable).parent


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_gunicorn(port: int, env_extra: dict) -> subprocess.Popen:
    env = os.environ | {"APP_MODE": env_extra.get("APP_MODE", "prod")}
    return subprocess.Popen(
        [str(VENV_BIN / "gunicorn"), "-w", "4", "--log-level", "warning",
         "-b", f"127.0.0.1:{port}", "wsgi_app:app"],
        cwd=LAB, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def wait_ready(url: str, timeout: float = 20.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if httpx.get(f"{url}/healthz", timeout=2).status_code == 200:
                return
        except httpx.HTTPError:
            time.sleep(0.2)
    raise RuntimeError(f"服务 {url} 未在 {timeout}s 内就绪")


# ============================================================
# 1. gunicorn 多 worker：进程级并发（验收点）
# ============================================================

def demo_workers() -> None:
    section("1. gunicorn -w 4：100 个请求 ≥3 个 worker PID（验收点）")
    port = free_port()
    base = f"http://127.0.0.1:{port}"
    proc = start_gunicorn(port, {})
    try:
        wait_ready(base)
        with ThreadPoolExecutor(max_workers=10) as pool:
            pids = set(pool.map(
                lambda _: httpx.get(f"{base}/pid", timeout=10).json()["pid"],
                range(100)))
        print(f"  100 个请求分发到 {len(pids)} 个 worker: {sorted(pids)}")
        assert len(pids) >= 3, f"应至少 3 个不同 PID，实际 {pids}"
        print("  master 只管拉起与监视，accept 由各 worker 竞争——进程级并发用满多核")
    finally:
        proc.terminate()
        proc.wait(timeout=10)


# ============================================================
# 2. 12-factor：环境变量切换配置
# ============================================================

def demo_env_config() -> None:
    section("2. 12-factor：同一份代码，环境变量切配置（验收点）")
    for mode in ("prod", "dev"):
        port = free_port()
        base = f"http://127.0.0.1:{port}"
        proc = start_gunicorn(port, {"APP_MODE": mode})
        try:
            wait_ready(base)
            r = httpx.get(f"{base}/healthz", timeout=10)
            assert r.status_code == 200
            assert r.headers["X-App-Mode"] == mode, \
                f"配置应来自环境变量: {r.headers.get('X-App-Mode')} != {mode}"
            assert r.json()["mode"] == mode
            print(f"  APP_MODE={mode:<4} → 响应头 X-App-Mode={mode} · body mode={mode}")
        finally:
            proc.terminate()
            proc.wait(timeout=10)
    print("  代码零改动换配置——这是'构建一次、处处部署'的基础")


# ============================================================
# 3. Docker：构建镜像 + 容器健康检查（验收点）
# ============================================================

def demo_docker() -> None:
    section("3. Docker：构建镜像 → 容器内 /healthz 200（验收点）")
    image = "web-lab-18"
    subprocess.run(["docker", "build", "-q", "-t", image, str(LAB)],
                   check=True, capture_output=True, timeout=600)
    print(f"  docker build → 镜像 {image} 就绪")

    host_port = free_port()
    container = subprocess.run(
        ["docker", "run", "-d", "--rm", "-p", f"{host_port}:8000", image],
        check=True, capture_output=True, timeout=60).stdout.decode().strip()
    try:
        base = f"http://127.0.0.1:{host_port}"
        wait_ready(base, timeout=30)
        r = httpx.get(f"{base}/healthz", timeout=10)
        assert r.status_code == 200 and r.json()["container"] is True, r.text
        print(f"  容器内 uvicorn 启动 → 宿主机 {base}/healthz → 200 · {r.json()}")
    finally:
        subprocess.run(["docker", "rm", "-f", container],
                       capture_output=True, timeout=60)
    print("  容器已清理（镜像保留：下次构建走缓存，秒级）")
    print("  选型注：uvicorn 进容器 = 1 容器 1 进程；多实例交给编排层（compose/k8s）")


def main() -> None:
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · gunicorn {version('gunicorn')} · 生产部署实验")
    demo_workers()
    demo_env_config()
    demo_docker()

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ ≥3 worker PID、环境变量切配置、容器 healthz 200")


if __name__ == "__main__":
    main()
