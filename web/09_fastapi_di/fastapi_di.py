"""
09 · FastAPI 依赖注入系统 —— Depends 链 / yield 依赖 / 测试替身
Web 框架清单项目 9：FastAPI 的第二个魔法——把"准备资源"从业务里抽出来

Depends 的三种玩法（对应 images/fastapi_di.svg）:
- 嵌套链:      依赖自己还能 Depends 别的——配置 → 会话 → 用户，深度优先逐层解析
- yield 依赖:  setup 在 handler 前执行，teardown 在其后"必执行"——连接类资源的
              标准姿势，端点抛 HTTPException 也逃不掉（§2 实测）
- 测试替身:    dependency_overrides 一行换掉真依赖——测试时假 DB 上岗，真依赖
              零调用（调用计数断言，§4）

另有两个容易忽略的细节:
- 请求级缓存: 同一依赖在请求内被引用多次，默认只执行一次（use_cache=False 可关）
- 全局依赖:   FastAPI(dependencies=[...]) 对所有路由生效——API Key 校验的惯用法

用法:
- source ../.venv/bin/activate && python3 fastapi_di.py

交互示意图: 用浏览器打开 images/fastapi_di.html
"""

import sys
import warnings

warnings.filterwarnings("ignore", message=".*httpx.*testclient.*deprecated.*")

from typing import Annotated  # noqa: E402

from fastapi import Depends, FastAPI, HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

LOG: list[str] = []          # 嵌套链与 yield 的执行顺序证据
CALLS = {"probe": 0, "real": 0, "fake": 0, "global": 0}


def dep_global() -> None:
    """全局依赖：挂在 FastAPI(dependencies=[...]) 上，对所有路由生效（含 OPTIONS 预检等）"""
    CALLS["global"] += 1


app = FastAPI(dependencies=[Depends(dep_global)])


# ============================================================
# 1. 三层嵌套链：配置 → 会话 → 用户（深度优先解析）
# ============================================================

def dep_settings() -> dict:
    LOG.append("settings")
    return {"db_url": "sqlite://:memory:"}


def dep_session(settings: Annotated[dict, Depends(dep_settings)]) -> dict:
    LOG.append("session")
    return {"conn": f"conn({settings['db_url']})"}


def dep_current_user(session: Annotated[dict, Depends(dep_session)]) -> dict:
    LOG.append("user")
    return {"name": "alice", "conn": session["conn"]}


@app.get("/profile")
def profile(user: Annotated[dict, Depends(dep_current_user)]) -> dict:
    LOG.append("handler")
    return user


# ============================================================
# 2. yield 依赖：setup → handler → teardown（异常也不豁免）
# ============================================================

def dep_conn() -> dict:
    LOG.append("conn:setup")
    conn = {"open": True, "queries": 0}
    try:
        yield conn  # yield 之前是 setup，之后是 teardown
    finally:
        conn["open"] = False
        LOG.append("conn:teardown")  # 端点抛 HTTPException 也必到——finally 语义


@app.get("/report")
def report(conn: Annotated[dict, Depends(dep_conn)]) -> dict:
    conn["queries"] += 1
    return {"queries": conn["queries"], "open": conn["open"]}


@app.get("/boom")
def boom(conn: Annotated[dict, Depends(dep_conn)]):
    raise HTTPException(status_code=418, detail="handler 爆炸")


# ============================================================
# 3. 请求级缓存：同一依赖多处引用，默认只执行一次
# ============================================================

def dep_probe() -> dict:
    CALLS["probe"] += 1
    return {"call_no": CALLS["probe"]}


@app.get("/cached")
def cached(a: Annotated[dict, Depends(dep_probe)],
           b: Annotated[dict, Depends(dep_probe)],
           c: Annotated[dict, Depends(dep_probe)]) -> dict:
    return {"a": a, "b": b, "c": c}


@app.get("/uncached")
def uncached(a: Annotated[dict, Depends(dep_probe)],
             b: Annotated[dict, Depends(dep_probe, use_cache=False)]) -> dict:
    return {"a": a, "b": b}


# ============================================================
# 4. 真假 DB 依赖：dependency_overrides 的测试替身
# ============================================================

def dep_real_db() -> dict:
    CALLS["real"] += 1
    return {"rows": ["real-row"], "source": "real-db"}


def dep_fake_db() -> dict:
    CALLS["fake"] += 1
    return {"rows": ["fake-row"], "source": "fake-db"}


def dep_real_db_endpoint(rows: Annotated[dict, Depends(dep_real_db)]) -> dict:
    return rows


app.dependency_overrides[dep_real_db] = dep_fake_db  # 测试替身上岗


@app.get("/data")
def data(rows: Annotated[dict, Depends(dep_real_db_endpoint)]) -> dict:
    return rows


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def demo_chain(client: TestClient) -> None:
    section("1. 三层嵌套链：settings → session → user（深度优先）")
    LOG.clear()
    r = client.get("/profile")
    assert r.status_code == 200 and r.json()["name"] == "alice"
    assert LOG == ["settings", "session", "user", "handler"], f"顺序异常: {LOG}"
    print(f"  执行顺序: {LOG}")
    print("  深度优先：handler 的依赖 user 要先拿到 session，session 又要先拿到 settings")
    print("  心智模型：依赖树自底向上求解——最里层的叶子最先执行")


def demo_yield_dep(client: TestClient) -> None:
    section("2. yield 依赖：setup → handler → teardown（异常也不豁免）")
    LOG.clear()
    r = client.get("/report")
    assert r.status_code == 200 and r.json() == {"queries": 1, "open": True}
    assert LOG == ["conn:setup", "conn:teardown"], f"顺序异常: {LOG}"
    print(f"  正常请求: {LOG}（handler 返回后 teardown 立即执行，连接关闭）")

    LOG.clear()
    r = client.get("/boom")
    assert r.status_code == 418, f"HTTPException 应 418，实际 {r.status_code}"
    assert LOG == ["conn:setup", "conn:teardown"], f"异常路径顺序异常: {LOG}"
    print(f"  端点抛 418: {LOG}——teardown 照样执行（finally 语义），资源不泄漏")
    print("  这就是'yield 依赖管连接'的底气：不管 handler 成败，teardown 必到")


def demo_cache(client: TestClient) -> None:
    section("3. 请求级缓存：三处引用只执行一次，use_cache=False 可关")
    CALLS["probe"] = 0
    r = client.get("/cached")
    assert CALLS["probe"] == 1, f"同请求内应只执行 1 次，实际 {CALLS['probe']}"
    body = r.json()
    assert body["a"] == body["b"] == body["c"], "三处引用应拿到同一份结果"
    print(f"  /cached 三处引用 → 执行 {CALLS['probe']} 次，结果相同（请求级缓存默认开）")

    CALLS["probe"] = 0
    r = client.get("/uncached")
    assert CALLS["probe"] == 2, f"use_cache=False 应各执行一次，实际 {CALLS['probe']}"
    assert r.json()["a"] != r.json()["b"], "关闭缓存后两次调用结果应不同"
    print(f"  /uncached use_cache=False → 执行 {CALLS['probe']} 次，结果不同")
    print("  注意缓存的边界是'单个请求'：跨请求必然重新执行——它防的是请求内重复求值")


def demo_overrides(client: TestClient) -> None:
    section("4. dependency_overrides：测试替身上岗，真依赖零调用")
    CALLS.update(real=0, fake=0)
    r = client.get("/data")
    assert r.json()["source"] == "fake-db" and r.json()["rows"] == ["fake-row"]
    assert CALLS["real"] == 0, f"替身上岗时真依赖应零调用: {CALLS}"
    print(f"  替身生效: 响应来自 {r.json()['source']}；真依赖调用 {CALLS['real']} 次、假依赖 {CALLS['fake']} 次")

    app.dependency_overrides.clear()  # 测试结束拆掉替身
    CALLS.update(real=0, fake=0)
    r = client.get("/data")
    assert r.json()["source"] == "real-db" and CALLS["real"] == 1 and CALLS["fake"] == 0
    print(f"  overrides.clear() 后: 响应回到 {r.json()['source']}，真依赖恢复调用")
    print("  模式：conftest 里 app.dependency_overrides[get_db] = fake_db，业务测试零改代码")


def main() -> None:
    from importlib.metadata import version as _v
    if tuple(int(x) for x in _v("fastapi").split(".")[:2]) < (0, 100):
        sys.exit(f"本实验需要 fastapi ≥ 0.100（当前 {_v('fastapi')}）。"
                 f"请先激活系列环境：source ../.venv/bin/activate")
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · FastAPI {version('fastapi')} · 依赖注入实验")
    client = TestClient(app)
    demo_chain(client)
    demo_yield_dep(client)
    demo_cache(client)
    demo_overrides(client)
    assert CALLS["global"] == 7, f"全局依赖应对每个请求执行一次: {CALLS['global']} vs 7 个请求"
    print(f"\n  全局依赖计数 = {CALLS['global']}（与本实验发出的 7 个请求一一对应）")

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 嵌套链深度优先、yield teardown 异常不豁免、缓存与替身计数吻合")


if __name__ == "__main__":
    main()
