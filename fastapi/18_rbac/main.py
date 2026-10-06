"""lab 18 · 依赖链做 RBAC —— 演示应用：文档管理 API。

认证（authentication，回答"你是谁"）与授权（authorization，回答"你能做什么"）
是两件事：前者失败返回 401 Unauthorized，后者失败返回 403 Forbidden。本应用把
授权拆成三层依赖，逐层收紧、层层复用：

    POST /token            登录：校验密码（bcrypt），签发 JWT（PyJWT）——不挂 router
    GET  /healthz          存活探针——同样不挂 router，供脚本 readiness 探测
    ── 以下端点挂在一个 APIRouter 上，router 级 Depends(require_login) 先拦一道 ──
    GET  /docs-list        第 1 层已拦未登录；登录即可看（user 与 admin 都行）
    POST /docs             第 2 层：端点级角色闸 require_role("admin")，user 被拒
    DELETE /docs/{doc_id}  第 3 层：对象级闸 get_doc_and_check_owner——admin
                           或该文档 owner 才能删，判断依据是"这一篇"的归属

三层各答一问：router 级答"登录了吗"（401 由 get_current_user 抛出）；端点级答
"角色够吗"；对象级答"这份资源是你的吗"。前两层与具体资源无关，第三层必须同时
拿到路径参数 doc_id 与当前用户才下得了判。

运行（由 18_rbac.sh 调用）：
    .venv/bin/uvicorn main:app --app-dir labs/18_rbac --host 127.0.0.1 --port 8918
"""

import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated, Any

import bcrypt
import jwt
from fastapi import APIRouter, Depends, FastAPI, Form, Header, HTTPException

# ---------------------------------------------------------------------------
# 配置与预置数据：进程内存储是教学装置，重启即复位（id 从头发号，demo 可复现）
# ---------------------------------------------------------------------------
SECRET_KEY = "lab18-demo-secret-key"  # 生产环境从配置/密钥管理系统注入，不能硬编码
JWT_ALGORITHM = "HS256"
TOKEN_TTL_SECONDS = 3600


@dataclass
class User:
    """认证依赖的产出：身份标识 + 角色，后面两层授权依赖都从它出发。"""

    username: str
    role: str  # "admin" 或 "user"


def _hash(password: str) -> str:
    """bcrypt 哈希。rounds=4 是刻意调低的成本因子，教学演示要快；
    生产用默认 12（单次约几百毫秒，慢正是它抗暴力破解的手段）。"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=4)).decode()


USERS: dict[str, dict[str, str]] = {
    "alice": {"password": _hash("alice-pw"), "role": "admin"},
    "bob": {"password": _hash("bob-pw"), "role": "user"},
}

DOCS: dict[int, dict[str, Any]] = {
    1: {"id": 1, "title": "架构评审纪要（admin 的文档）", "owner": "alice"},
    2: {"id": 2, "title": "bob 的学习笔记", "owner": "bob"},
}
_next_id = 3  # POST /docs 的发号器：进程内自增，demo 断言依赖它的确定性


# ---------------------------------------------------------------------------
# 第 0 层（认证）：解码 JWT -> User。失败一律 401 + WWW-Authenticate 响应头
# ---------------------------------------------------------------------------
def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """认证依赖：从 Authorization: Bearer <token> 解出并校验 JWT，返回 User。

    为什么 401 而不是 403：没登录 = 身份未知，规范（RFC 6750）要求状态码 401
    并携带 WWW-Authenticate: Bearer，告诉客户端"该怎样把凭证带上来"。

    角色为什么从 USERS 查而不是从令牌读：令牌签发后在过期前始终有效，角色写进
    令牌就无法即时吊销/变更；令牌只放身份标识（sub），角色每次以服务端为准。
    """
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="未登录：请在 Authorization 头携带 Bearer 令牌（先 POST /token）",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.removeprefix("Bearer ")
    try:
        payload: dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, detail="令牌已过期，请重新登录",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401, detail="令牌无效",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    record = USERS.get(str(payload.get("sub")))
    if record is None:
        raise HTTPException(
            status_code=401, detail="令牌对应的用户不存在",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return User(username=str(payload["sub"]), role=record["role"])


# ---------------------------------------------------------------------------
# 第 1 层（router 级）：require_login —— 只回答"登录了吗"，不向端点注入用户
# ---------------------------------------------------------------------------
def require_login(user: Annotated[User, Depends(get_current_user)]) -> None:
    """router 级登录闸：挂在该 router 的每个端点之前先执行。

    函数体什么都不做、返回 None——价值在于"强制 get_current_user 执行"：未登录
    的请求在这里就被 401 拦下，根本走不到端点函数。依赖缓存保证 get_current_user
    在同一请求里只执行一次（呼应 lab 06 的每请求缓存）。
    """


# ---------------------------------------------------------------------------
# 第 2 层（端点级）：require_role(role) 依赖工厂 —— 参数化的角色闸
# ---------------------------------------------------------------------------
def require_role(role: str) -> Callable[..., User]:
    """依赖工厂：收下角色名，返回一个"角色闸"依赖函数（呼应 lab 10 的工厂）。

    为什么用工厂而不是给每个角色手写一个依赖：admin/user 各写一个函数，判断逻辑
    就要复制两份；工厂把差异（角色名）收进闭包，逻辑只写一遍。每次调用都返回
    新函数对象，而 FastAPI 以函数对象为缓存键，所以 require_role("admin") 与
    require_role("user") 是两个互不共享结果的依赖。
    """

    def role_checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role != role:
            # 403：身份已知（登录成功），但角色不够。detail 写清"要什么、你是什么"
            raise HTTPException(
                status_code=403,
                detail=f"角色权限不足：本操作需要 {role} 角色，你的角色是 {user.role}",
            )
        return user  # 放行并把用户交给端点，端点不必再声明一遍 get_current_user

    return role_checker


# ---------------------------------------------------------------------------
# 第 3 层（对象级）：同时收路径参数与当前用户，判断"这份资源的归属"
# ---------------------------------------------------------------------------
def get_doc_and_check_owner(
    doc_id: int,
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    """对象级依赖：doc_id 来自路径参数（按参数名自动匹配），user 来自认证依赖。

    对象级判断为什么必须同时拿这两个值：角色够不够只看用户，资源归属却必须看
    "具体哪一篇"。顺序也有讲究：先查资源（404），再查归属（403）——资源不存在
    与无权访问是两回事。
    """
    doc = DOCS.get(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"文档 {doc_id} 不存在")
    if user.role != "admin" and doc["owner"] != user.username:
        raise HTTPException(
            status_code=403,
            detail=f"对象权限不足：文档 {doc_id} 的 owner 是 {doc['owner']}，"
                   f"你不是 owner 且不具备 admin 角色",
        )
    return doc


# ---------------------------------------------------------------------------
# 受保护路由：router 级挂第 1 层，端点级按需叠加第 2/3 层
# ---------------------------------------------------------------------------
router = APIRouter(dependencies=[Depends(require_login)])  # 第 1 层：全员先过认证


@router.get("/docs-list")
def docs_list(user: Annotated[User, Depends(get_current_user)]) -> dict[str, Any]:
    """登录即可访问：router 级已拦未登录，端点里只剩业务，无一行权限 if。"""
    return {"you": user.username, "role": user.role, "docs": list(DOCS.values())}


@router.post("/docs", status_code=201)
def create_doc(
    title: Annotated[str, Form(min_length=1)],
    user: Annotated[User, Depends(require_role("admin"))],  # 第 2 层：角色闸
) -> dict[str, Any]:
    """新建文档：只有 admin 过得了 require_role("admin") 这道闸。"""
    global _next_id
    doc: dict[str, Any] = {"id": _next_id, "title": title, "owner": user.username}
    DOCS[_next_id] = doc
    _next_id += 1
    return doc


@router.delete("/docs/{doc_id}", status_code=204)
def delete_doc(
    doc: Annotated[dict[str, Any], Depends(get_doc_and_check_owner)],  # 第 3 层
) -> None:
    """删除文档：admin 或 owner 过闸，依赖的返回值就是已获准删除的那篇文档。"""
    DOCS.pop(doc["id"])
    return None


app = FastAPI(
    title="lab 18 · 依赖链做 RBAC",
    description="认证与授权分离：router 级登录闸 -> 端点级角色闸 -> 对象级归属闸",
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """存活探针：不挂受保护 router，供脚本 readiness 探测。"""
    return {"status": "ok"}


@app.post("/token")
def issue_token(
    username: Annotated[str, Form()],
    password: Annotated[str, Form()],
) -> dict[str, str]:
    """登录端点：校验密码 -> 签发 JWT。不在受保护 router 上，天然无需先登录。"""
    record = USERS.get(username)
    if record is None or not bcrypt.checkpw(password.encode(), record["password"].encode()):
        raise HTTPException(
            status_code=401, detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    now = int(time.time())
    token = jwt.encode(
        {"sub": username, "iat": now, "exp": now + TOKEN_TTL_SECONDS},
        SECRET_KEY, algorithm=JWT_ALGORITHM,
    )
    return {"access_token": token, "token_type": "bearer"}


app.include_router(router)
