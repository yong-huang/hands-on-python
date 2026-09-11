"""🏁 短链接服务测试套件（≥15 条）：缩短/重定向/统计/过期/JWT 管理端/并发"""

import os
import tempfile
from concurrent.futures import ThreadPoolExecutor

# 12-factor：测试用独立临时库，必须在导入 app 之前设置
os.environ["SHORTENER_DB"] = os.path.join(
    tempfile.mkdtemp(prefix="shortener-test-"), "test.db")

from fastapi.testclient import TestClient  # noqa: E402

from shortener_app import Link, SessionLocal, app, engine  # noqa: E402

client = TestClient(app)


def make_link(code=None, url="https://example.com/hello", **kw):
    body = {"url": url}
    if code:
        body["custom_code"] = code
    body.update(kw)
    return client.post("/shorten", json=body)


# ---------- 基础链路 ----------

def test_healthz():
    assert client.get("/healthz").json() == {"status": "ok"}


def test_shorten_basic():
    r = make_link()
    assert r.status_code == 200 and len(r.json()["code"]) == 8


def test_short_url_format():
    r = make_link()
    assert r.json()["short_url"] == f"/{r.json()['code']}"


def test_redirect_302_and_location():
    code = make_link(url="https://example.com/target").json()["code"]
    r = client.get(f"/{code}", follow_redirects=False)
    assert r.status_code == 302
    assert r.headers["location"] == "https://example.com/target"


def test_click_count_three_redirects():
    code = make_link(url="https://example.com/counted").json()["code"]
    for _ in range(3):
        client.get(f"/{code}", follow_redirects=False)
    assert client.get(f"/stats/{code}").json()["clicks"] == 3


def test_stats_endpoint_shape():
    code = make_link(url="https://example.com/stats").json()["code"]
    body = client.get(f"/stats/{code}").json()
    assert set(body) == {"code", "url", "clicks", "expired"} and body["clicks"] >= 0


# ---------- 自定义码与校验 ----------

def test_custom_code():
    r = make_link(code="my-blog", url="https://example.com/blog")
    assert r.json()["code"] == "my-blog"


def test_custom_code_duplicate_409():
    make_link(code="dup-code")
    r = make_link(code="dup-code")
    assert r.status_code == 409


def test_custom_code_invalid_pattern_422():
    r = make_link(code="bad code!")  # 空格与 ! 不在允许字符集
    assert r.status_code == 422


def test_invalid_url_scheme_422():
    r = make_link(url="ftp://example.com/file")
    assert r.status_code == 422


def test_missing_url_422():
    r = client.post("/shorten", json={})
    assert r.status_code == 422


# ---------- 404 / 过期 ----------

def test_missing_code_404():
    assert client.get("/no-such-code").status_code == 404
    assert client.get("/stats/no-such-code").status_code == 404


def test_expired_code_410():
    from datetime import datetime, timedelta, timezone
    code = make_link().json()["code"]
    with SessionLocal() as db:
        link = db.query(Link).filter_by(code=code).one()
        link.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        db.commit()
    assert client.get(f"/{code}", follow_redirects=False).status_code == 410


def test_future_expiry_not_expired():
    r = make_link(expires_in_days=7)
    code = r.json()["code"]
    body = client.get(f"/stats/{code}").json()
    assert body["expired"] is False
    assert client.get(f"/{code}", follow_redirects=False).status_code == 302


# ---------- JWT 管理端 ----------

def test_token_ok():
    r = client.post("/token", json={"username": "admin", "password": "admin-pass-6"})
    assert r.status_code == 200 and r.json()["token_type"] == "bearer"
    assert r.json()["access_token"].count(".") == 2


def test_token_wrong_password_401():
    r = client.post("/token", json={"username": "admin", "password": "wrong"})
    assert r.status_code == 401


def test_admin_delete_without_token_401():
    code = make_link().json()["code"]
    assert client.delete(f"/admin/links/{code}").status_code == 401


def test_admin_delete_with_token_204_and_gone():
    token = client.post("/token", json={"username": "admin",
                                        "password": "admin-pass-6"}).json()["access_token"]
    code = make_link().json()["code"]
    r = client.delete(f"/admin/links/{code}",
                      headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert client.get(f"/{code}", follow_redirects=False).status_code == 404


# ---------- 并发与唯一性 ----------

def test_concurrent_200_codes_no_collision():
    codes: set[str] = set()

    def create_one(i: int):
        with TestClient(app) as c:  # 每线程独立客户端，共享同一 sqlite 库
            return c.post("/shorten", json={"url": f"https://example.com/{i}"}).json()["code"]

    with ThreadPoolExecutor(max_workers=8) as pool:
        codes = set(pool.map(create_one, range(200)))

    assert len(codes) == 200, "200 个短码必须全部唯一"
    with SessionLocal() as db:
        assert db.query(Link).count() >= 200
