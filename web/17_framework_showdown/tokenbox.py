"""三个框架共用的最小 token 方案：HMAC 签名的 base64 payload

三框架对比要控制变量——认证逻辑必须完全一致，所以抽出来共享。
格式与项目 3 的签名 cookie / 项目 12 的 JWT 同思想：payload.签名。
"""

import base64
import hashlib
import hmac

SECRET = b"showdown-shared-secret"


def make_token(user: str) -> str:
    payload = base64.urlsafe_b64encode(user.encode()).decode()
    sig = hmac.new(SECRET, payload.encode(), hashlib.sha256).hexdigest()[:32]
    return f"{payload}.{sig}"


def verify_token(token: str) -> str | None:
    try:
        payload, sig = token.rsplit(".", 1)
    except ValueError:
        return None
    expected = hmac.new(SECRET, payload.encode(), hashlib.sha256).hexdigest()[:32]
    if hmac.compare_digest(sig, expected):
        return base64.urlsafe_b64decode(payload).decode()
    return None
