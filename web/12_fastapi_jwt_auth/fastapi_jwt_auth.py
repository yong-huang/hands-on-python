"""
12 · JWT + OAuth2 认证 —— 签名 cookie 思想的工业级放大
Web 框架清单项目 12：FastAPI 段收官，把项目 3 的 HMAC 签名 cookie 升级成 JWT

认证全链路（对应 images/fastapi_jwt_auth.svg）:
- 签发:   POST /token（OAuth2 password flow）→ 校验 bcrypt 密码 →
          PyJWT 签发 HS256 token（sub=用户名，exp=15 分钟后）
- 校验:   OAuth2PasswordBearer 提取 Bearer token → get_current_user 依赖解码验签 →
          三重失败各自 401：token 缺失 / 签名不匹配（篡改或错密钥）/ 已过期

与项目 3 的血缘：JWT 的 header.payload.signature 就是签名 cookie 的三段式放大——
签名防篡改、不保密、不防窃取的老结论原样成立，多出来的是标准化的 claims（sub/exp/aud）。

验收断言:
- 正确登录拿 token → /me 200 且 sub=alice；无 token/篡改签名/错密钥/过期 四路全 401
- 用户表只存 bcrypt 哈希（无明文）；错误密码 401

用法:
- source ../.venv/bin/activate && python3 fastapi_jwt_auth.py

交互示意图: 用浏览器打开 images/fastapi_jwt_auth.html
"""

import sys
import time
import warnings
from datetime import datetime, timedelta, timezone

warnings.filterwarnings("ignore", message=".*httpx.*testclient.*deprecated.*")

import bcrypt  # noqa: E402
import jwt  # noqa: E402
from fastapi import Depends, FastAPI, HTTPException  # noqa: E402
from fastapi.security import OAuth2PasswordBearer  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

SECRET = "demo-jwt-secret-0123456789abcdef-32bytes"  # ≥32B（RFC 7518 对 HS256 的建议）；生产从环境变量注入
ALGO = "HS256"
TOKEN_TTL = timedelta(minutes=15)

app = FastAPI(title="JWT 认证实验")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")  # Swagger 右上角会出现 Authorize 按钮

# 用户表：只存 bcrypt 哈希（生产走 DB + 迁移，见项目 6/7）
USERS: dict[str, str] = {}


def register_user(name: str, password: str) -> None:
    USERS[name] = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def make_token(sub: str, expires: timedelta | None = None, key: str = SECRET) -> str:
    claims = {"sub": sub, "iat": int(time.time()),
              "exp": datetime.now(timezone.utc) + (expires or TOKEN_TTL)}
    return jwt.encode(claims, key, algorithm=ALGO)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """依赖里完成验签 + 过期校验——受保护路由声明这个依赖就等于上了锁"""
    try:
        claims = jwt.decode(token, SECRET, algorithms=[ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="token 已过期")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="token 无效")
    if claims.get("sub") not in USERS:
        raise HTTPException(status_code=401, detail="用户不存在")
    return claims["sub"]


@app.post("/token")
async def token(username: str, password: str):
    """演示简化：参数用查询/表单皆可；生产用 OAuth2PasswordRequestForm + HTTPS"""
    password_hash = USERS.get(username)
    if password_hash is None or not bcrypt.checkpw(password.encode(), password_hash.encode()):
        raise HTTPException(status_code=401, detail="用户名或密码错误")  # 统一文案防枚举（项目 7）
    return {"access_token": make_token(username), "token_type": "bearer"}


@app.get("/me")
async def me(user: str = Depends(get_current_user)):
    return {"sub": user, "note": "能到这里说明 token 三关全过"}


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. 签发与校验全流程
# ============================================================

def demo_full_flow(client: TestClient) -> None:
    section("1. 签发与校验：登录拿 token，带 Bearer 访问 /me")
    r = client.post("/token", params={"username": "alice", "password": "wonderland"})
    assert r.status_code == 200, f"登录应 200，实际 {r.status_code}: {r.text}"
    token = r.json()["access_token"]
    assert r.json()["token_type"] == "bearer"
    assert token.count(".") == 2, f"JWT 应是三段式: {token[:30]}..."
    print(f"  登录成功 → token_type=bearer · token 形如 {token[:32]}...（三段式）")

    r = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200 and r.json()["sub"] == "alice"
    print(f"  带 Bearer 访问 /me → 200 · sub={r.json()['sub']!r}")
    print("  对比项目 3：签名 cookie 换成了 JWT，但'验签→过期→放行'的三关结构一模一样")


# ============================================================
# 2. 四路 401：缺失 / 篡改 / 错密钥 / 过期
# ============================================================

def demo_four_401(client: TestClient, token: str) -> None:
    section("2. 四路 401：缺失、篡改签名、错误密钥、过期 token（验收点）")
    r = client.get("/me")
    assert r.status_code == 401, f"无 token 应 401，实际 {r.status_code}"
    print(f"  ① 无 token              → 401（OAuth2PasswordBearer 直接拦下）")

    head, payload, sig = token.split(".")
    r = client.get("/me", headers={"Authorization": f"Bearer {head}.{payload}.aaaa{sig[4:]}"})
    assert r.status_code == 401, f"篡改签名应 401，实际 {r.status_code}"
    print(f"  ② 篡改签名段            → 401（HS256 验签不过）")

    evil = make_token("alice", key="attacker-secret-0123456789abcdef")  # 错误密钥签发（长度合规但不是 SECRET）
    r = client.get("/me", headers={"Authorization": f"Bearer {evil}"})
    assert r.status_code == 401, f"错密钥 token 应 401，实际 {r.status_code}"
    print(f"  ③ 错误密钥签发的 token  → 401（SECRET 不对，签名必然不匹配）")

    stale = make_token("alice", expires=timedelta(seconds=-10))  # 过期 10 秒
    r = client.get("/me", headers={"Authorization": f"Bearer {stale}"})
    assert r.status_code == 401, f"过期 token 应 401，实际 {r.status_code}"
    print(f"  ④ 过期 token（exp=过去）→ 401（jwt.decode 抛 ExpiredSignatureError）")
    print("  项目 3 的结论原样成立：签名防篡改，不防过期——所以 exp 校验是独立的一关")


# ============================================================
# 3. 密码只存 bcrypt 哈希
# ============================================================

def demo_bcrypt_hash(client: TestClient) -> None:
    section("3. 用户表只存 bcrypt 哈希（验收点）")
    stored = USERS["alice"]
    assert "wonderland" not in stored, f"绝不能存明文: {stored}"
    assert stored.startswith("$2"), f"bcrypt 哈希应以 $2 开头: {stored[:16]}..."
    assert bcrypt.checkpw(b"wonderland", stored.encode())
    assert not bcrypt.checkpw(b"wrong-password", stored.encode())
    print(f"  users 表: {{'alice': '{stored[:24]}...'}}")
    print("  checkpw 恒时校验；错误密码 → /token 返回 401 统一文案（防用户名枚举）")
    r = client.post("/token", params={"username": "alice", "password": "wrong"})
    assert r.status_code == 401
    print(f"  错误密码登录 → 401（与'用户不存在'同文案）")


def main() -> None:
    from importlib.metadata import version as _v
    if tuple(int(x) for x in _v("fastapi").split(".")[:2]) < (0, 100):
        sys.exit(f"本实验需要 fastapi ≥ 0.100（当前 {_v('fastapi')}）。"
                 f"请先激活系列环境：source ../.venv/bin/activate")
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · FastAPI {version('fastapi')} + "
          f"PyJWT {version('pyjwt')} + bcrypt {version('bcrypt')} · JWT 认证实验")
    register_user("alice", "wonderland")
    client = TestClient(app)
    demo_full_flow(client)
    token = client.post("/token", params={"username": "alice",
                                          "password": "wonderland"}).json()["access_token"]
    demo_four_401(client, token)
    demo_bcrypt_hash(client)

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ token 三段式、四路 401、bcrypt 无明文、错误密码统一 401")


if __name__ == "__main__":
    main()
