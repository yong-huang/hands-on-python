"""lab 17 · OAuth2 + JWT 完整链 —— 演示应用：受保护资源 API。

一条完整可验证的认证链：密码表单 -> bcrypt 校验 -> 签发双令牌 -> 验签名/验
过期/验类型 -> 放行或 401。各端点分工：

    POST /token        OAuth2 password flow 的令牌端点：接收 username/password
                       表单（application/x-www-form-urlencoded），bcrypt 校验
                       通过后签发一对令牌 —— access（60s 短命）+ refresh（1h 长命）。
    POST /refresh      用 refresh 令牌换一对新令牌 —— 免去重新输密码。
    GET /me            受保护资源：带 Bearer 令牌访问。服务器验三件事 ——
                       签名（没被改过）、exp（没过期）、type（是 access 而非
                       refresh）；任何一件不过都是 401 + WWW-Authenticate: Bearer。
    GET /whoami-open   对照端点：无鉴权，谁都能访问。
    GET /healthz       就绪探针（demo 脚本用它判断服务起没起来）。

三个安全事实贯穿全篇：JWT 的 payload 只是 base64 编码、人人可读（防篡改不防
窥探）；签名用的是服务器私藏的 SECRET，客户端改一个字符签名就对不上；已签发
的令牌无法当场作废，只能靠短寿命（exp）+ 服务端黑名单兜底。

运行（由 17_oauth2_jwt.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/17_oauth2_jwt --host 127.0.0.1 --port 8917
"""

import time
from typing import Annotated, Any, Literal

import bcrypt
import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# 常量：demo 全部用固定值，为的是脚本可复现。
# 12-factor（主张"配置外置于环境"的应用配置方法论）要求配置与代码分离：
# 生产环境 SECRET 必须从环境变量注入（os.environ["SECRET_KEY"]）并定期轮换；
# 一旦泄露，任何人都能自签合法令牌 —— 比单条密码泄露严重得多。
# ---------------------------------------------------------------------------
SECRET_KEY = "demo-only-secret-key-17-0123456789abcdef"  # 32 字节（RFC 7518 要求 HMAC
# 密钥不短于摘要长度）；生产：从环境变量注入，绝不进代码库
ALGORITHM = "HS256"  # HMAC-SHA256：对称签名，签发与验证共用同一个 SECRET
ACCESS_TOKEN_TTL = 60  # access 寿命（秒）。demo 特意设短：60s 的"短命"可观察、
                       # 可断言；生产常见 15 分钟，原则是"能多短就多短"。
REFRESH_TOKEN_TTL = 3600  # refresh 寿命（秒），比 access 长一到两个数量级

# "用户表"：demo 用 dict 顶替数据库，值是 bcrypt 哈希、不是明文 —— 密码存储的
# 铁律：库被整体拖走，攻击者拿到的也只是哈希。alice 的明文密码是 secret123，
# 哈希由 bcrypt.hashpw 预先生成；$2b$12$ 前缀里，12 是成本因子（算得有多慢）。
FAKE_USERS: dict[str, str] = {
    "alice": "$2b$12$P7e5tSaZHZHHO2KrqArvo.BGpJ9.iYLavFd.p1Li70Jdm2EoaiLcS",
}

app = FastAPI(
    title="lab17 · OAuth2 + JWT 完整链",
    description="password flow 签发双令牌；签名、过期、类型三道 401 关卡",
)

# OAuth2PasswordBearer：FastAPI 内置的令牌提取依赖 —— 读 Authorization:
# Bearer <token> 请求头，缺头直接 401（detail="Not authenticated"）；tokenUrl
# 指向签发端点，Swagger UI 的 Authorize 按钮据此知道往哪里提交表单。
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# ---------------------------------------------------------------------------
# 请求/响应模型：字段名遵循 OAuth2 的线协议约定（access_token/token_type/bearer）
# ---------------------------------------------------------------------------
class TokenPair(BaseModel):
    """POST /token 与 /refresh 的响应体。"""

    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"  # OAuth2 规定固定小写 "bearer"
    expires_in: int  # access 的寿命（秒），客户端据此安排续期时机


class RefreshRequest(BaseModel):
    """POST /refresh 的请求体：客户端保存的 refresh 令牌。"""

    refresh_token: str


# ---------------------------------------------------------------------------
# 密码与令牌的两个工具函数
# ---------------------------------------------------------------------------
def verify_password(plain_password: str, password_hash: str) -> bool:
    """bcrypt 校验：哈希串自带盐与成本因子，checkpw 解出后对明文重算一遍
    哈希再比对 —— 所以只存哈希也能验密码，全程不需要保存明文。"""
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


def create_token(subject: str, token_type: Literal["access", "refresh"], ttl_seconds: int) -> str:
    """签发一个 JWT：payload 只放四个声明，HMAC-SHA256 签名防篡改。

    - sub（subject）：令牌为谁而发，这里放用户名；
    - type：access / refresh，防"长命令牌冒充短命令牌"的关键字段；
    - iat（issued at）：签发时刻；exp（expire）：过期时刻，均为 Unix 秒。
    注意 encode 不做任何校验 —— exp 是否已过，验证发生在 decode（见下）。
    """
    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# 鉴权依赖：/me 的三道关卡（签名 -> exp -> type）全部收敛在这里
# ---------------------------------------------------------------------------
def _unauthorized(detail: str) -> HTTPException:
    """401 的统一构造。WWW-Authenticate: Bearer 是 RFC 6750 对 401 的要求，
    告诉客户端"下次该带 Bearer 令牌来"，客户端据此触发登录/刷新流程。"""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def decode_access_claims(token: Annotated[str, Depends(oauth2_scheme)]) -> dict[str, Any]:
    """验签名 -> 验 exp -> 验 type，三关全过才把 claims 交给端点函数。

    jwt.decode 先用 SECRET 验签名（payload 改一个字符即失败），再校验声明
    —— exp 早于当前时间就抛 ExpiredSignatureError。type 不归 PyJWT 管
    （它不认识业务字段），必须自己查：这一步漏了，refresh 就能当 access
    用，短命设计形同虚设（demo 章节[5]实测这条 401）。
    """
    try:
        claims: dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise _unauthorized("令牌已过期（exp 已过），请用 refresh 令牌换新") from None
    except jwt.InvalidSignatureError:
        raise _unauthorized("签名校验失败：令牌内容与签名不符（疑似篡改）") from None
    except jwt.InvalidTokenError:  # 其余一切无效情形（格式坏、算法不符等）的基类
        raise _unauthorized("无效令牌：无法解码或校验") from None
    if claims.get("type") != "access":
        raise _unauthorized(f"需要 access 令牌，收到的是 {claims.get('type')!r}")
    return claims


# ---------------------------------------------------------------------------
# 端点：签发 -> 换新 -> 受保护资源 -> 对照
# ---------------------------------------------------------------------------
@app.post("/token", response_model=TokenPair)
async def issue_tokens(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> TokenPair:
    """password flow 的令牌端点：表单校验密码，换一对双令牌。

    OAuth2PasswordRequestForm 把请求体按 x-www-form-urlencoded 解析出
    username/password —— 这是 OAuth2 对 password flow 的硬性约定（不是
    JSON）。用户名不存在与密码错误返回同一句 401 文案：不给攻击者
    "这个用户名存在"的探测线索。
    """
    password_hash = FAKE_USERS.get(form.username)
    if password_hash is None or not verify_password(form.password, password_hash):
        raise _unauthorized("用户名或密码错误")
    return TokenPair(
        access_token=create_token(form.username, "access", ACCESS_TOKEN_TTL),
        refresh_token=create_token(form.username, "refresh", REFRESH_TOKEN_TTL),
        expires_in=ACCESS_TOKEN_TTL,
    )


@app.post("/refresh", response_model=TokenPair)
async def refresh_tokens(body: RefreshRequest) -> TokenPair:
    """refresh 换新：验证逻辑与 /me 相同，唯独 type 要求反过来。

    refresh 令牌同样会过期（1h）：过期、签名不符、type 不是 refresh，
    统统 401 —— 过期后只能重新走密码登录。响应顺带轮换了 refresh
    （rotation）：旧 refresh 作废，泄露窗口随之缩短。
    """
    try:
        claims: dict[str, Any] = jwt.decode(body.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise _unauthorized("refresh 令牌已过期，请重新登录") from None
    except jwt.InvalidTokenError:
        raise _unauthorized("无效 refresh 令牌：签名不符或格式错误") from None
    if claims.get("type") != "refresh":
        raise _unauthorized(f"需要 refresh 令牌，收到的是 {claims.get('type')!r}")
    sub = str(claims.get("sub", ""))
    return TokenPair(
        access_token=create_token(sub, "access", ACCESS_TOKEN_TTL),
        refresh_token=create_token(sub, "refresh", REFRESH_TOKEN_TTL),
        expires_in=ACCESS_TOKEN_TTL,
    )


@app.get("/me")
async def me(claims: Annotated[dict[str, Any], Depends(decode_access_claims)]) -> dict[str, Any]:
    """受保护资源：进入函数体时，令牌已过签名/exp/type 三道关卡。

    端点函数本体不出现任何鉴权代码 —— 三道关卡全部收敛在依赖
    decode_access_claims 里，FastAPI 在调用本函数之前先把它跑完。
    """
    return {
        "sub": claims["sub"],
        "type": claims["type"],
        "exp": claims["exp"],
        "message": f"你好, {claims['sub']}! 这是带有效 access 令牌才能看到的资源",
    }


@app.get("/whoami-open")
async def whoami_open() -> dict[str, str]:
    """对照端点：没有鉴权依赖，不需要令牌 —— 与 /me 形成"有无鉴权"对照。"""
    return {"open": "true", "message": "这是公开端点, 不需要任何令牌"}


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    """就绪探针：demo 脚本轮询它判断服务是否已可接客。"""
    return {"status": "ok"}
