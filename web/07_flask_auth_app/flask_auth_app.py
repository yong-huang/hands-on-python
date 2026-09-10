"""
07 · 蓝图与登录认证 —— 书签应用：Flask 阶段收官
Web 框架清单项目 7：应用工厂 + 双蓝图 + 认证限流，把项目 4-6 全部串起来

这一站是 Flask 阶段的综合应用（对应 images/flask_auth_app.svg）:
- 应用工厂:  create_app(test_config) 每次产出完全独立的应用——各自 engine、各自配置，
            测试/开发/生产只换配置不改代码（§1 实测两个实例数据互不可见）
- 双蓝图:    auth（注册/登录/登出）与 links（书签）按 url_prefix 分区，
            links 蓝图级 before_request 统一做登录保护，视图零重复
- 认证安全:  密码只存 scrypt 哈希（§3 直接查 sqlite 断言无明文）；
            连续 5 次错误密码锁定，第 6 次起 429——先于密码校验（§4）

四节验收（全部 test_client 实测）:
1. 工厂隔离  2. 注册→登录→加书签→登出→守卫重定向全流程
3. 用户表无明文密码  4. 5 次错误后 429（正确密码也进不来）

用法:
- source ../.venv/bin/activate && python3 flask_auth_app.py

交互示意图: 用浏览器打开 images/flask_auth_app.html
"""

import os
import sqlite3
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bookmark_app import create_app  # noqa: E402


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def new_client(tmp: str, tag: str):
    """用工厂产出一个独立 app + test_client：各自独立的 sqlite 文件"""
    app = create_app({"DATABASE": os.path.join(tmp, f"{tag}.db"),
                      "SECRET_KEY": f"key-{tag}"})
    return app, app.test_client()


def register(client, name="alice", password="wonderland"):
    return client.post("/auth/register", data={"name": name, "password": password})


def login(client, name="alice", password="wonderland"):
    return client.post("/auth/login", data={"name": name, "password": password})


# ============================================================
# 1. 应用工厂：两个实例 = 两个世界
# ============================================================

def demo_factory(tmp: str) -> None:
    section("1. 应用工厂与蓝图注册：create_app 的隔离性（验收点）")
    app_a, client_a = new_client(tmp, "a")
    app_b, client_b = new_client(tmp, "b")

    assert set(app_a.blueprints) == {"auth", "links"}, f"蓝图应注册: {app_a.blueprints}"
    rules = {r.rule for r in app_a.url_map.iter_rules()}
    assert {"/auth/login", "/auth/register", "/links/"} <= rules
    print(f"  蓝图注册: {sorted(app_a.blueprints)}；url_map 含 /auth/* 与 /links/*（url_prefix 分区）")

    assert register(client_a).status_code == 302, "app A 注册 alice 应成功"
    # 直接用 sqlite 查 app B 的库文件，证明隔离
    con = sqlite3.connect(os.path.join(tmp, "b.db"))
    users_b = con.execute("SELECT count(*) FROM users").fetchone()[0]
    con.close()
    assert users_b == 0, f"app B 不该看到 app A 的用户，实际 {users_b} 个"
    print(f"  app A 注册了 alice；app B 用户数 = {users_b}——同一份代码，两个独立世界")


# ============================================================
# 2. 全流程：注册 → 登录 → 加书签 → 登出 → 守卫重定向
# ============================================================

def demo_full_flow(tmp: str) -> None:
    section("2. 全流程：注册 / 登录 / 加书签 / 登出 / 未登录守卫（验收点）")
    _, client = new_client(tmp, "flow")

    # 未登录直访受保护蓝图 → 蓝图级 before_request 302 到登录页
    r = client.get("/links/")
    assert r.status_code == 302 and "/auth/login" in r.headers["Location"], \
        f"未登录应 302 去登录页: {r.status_code} {r.headers.get('Location')}"
    print(f"  未登录 GET /links/ → 302 → {r.headers['Location']}（蓝图 before_request 守卫）")

    assert register(client).status_code == 302, "注册应 302 去登录页"
    r = login(client, password="wrong-password")
    assert r.status_code == 401, f"错误密码应 401，实际 {r.status_code}"
    print(f"  注册成功 → 302；错误密码登录 → 401（错误文案与剩余次数回显）")

    r = login(client)
    assert r.status_code == 302 and "/links/" in r.headers["Location"], "登录成功应 302 去书签页"
    print(f"  正确密码登录 → 302 → /links/（session 存 user_id）")

    r = client.post("/links/add", data={"url": "https://flask.palletsprojects.com",
                                        "title": "Flask 官方文档"})
    assert r.status_code == 302, "加书签应 302 回列表"
    html = client.get("/links/").get_data(as_text=True)
    assert "Flask 官方文档" in html and "我的书签（1）" in html, "书签应渲染出来"
    print(f"  添加书签 → 列表页显示「Flask 官方文档」· 我的书签（1）")

    assert client.get("/auth/logout").status_code == 302, "登出应 302"
    r = client.get("/links/")
    assert r.status_code == 302 and "/auth/login" in r.headers["Location"], "登出后再访问应被守卫拦截"
    print(f"  登出 → session 清空 → 再访问 /links/ 又是 302 守卫")


# ============================================================
# 3. 密码只存哈希：直接读 sqlite 用户表
# ============================================================

def demo_hash_only(tmp: str) -> None:
    section("3. 密码只存哈希：直接查库验证（验收点）")
    _, client = new_client(tmp, "hash")
    register(client, name="alice", password="wonderland")

    con = sqlite3.connect(os.path.join(tmp, "hash.db"))
    row = con.execute("SELECT name, password_hash FROM users").fetchone()
    con.close()
    name, password_hash = row
    assert name == "alice" and "wonderland" not in password_hash, f"绝不能存明文: {row}"
    assert password_hash.startswith("scrypt:"), f"werkzeug 默认 scrypt: {password_hash[:20]}..."
    print(f"  用户表 password_hash = {password_hash[:36]}...")
    print(f"  明文 'wonderland' 不在库里（scrypt 单向哈希，盐值内嵌格式串）")


# ============================================================
# 4. 限流：连续 5 次错误后锁定，429 先于密码校验
# ============================================================

def demo_rate_limit(tmp: str) -> None:
    section("4. 限流：5 次错误后锁定，正确密码也进不来（验收点）")
    _, client = new_client(tmp, "lock")
    register(client, name="bob", password="right-password-6")

    for i in range(1, 6):
        r = login(client, name="bob", password=f"guess-{i}")
        assert r.status_code == 401, f"第 {i} 次错误应 401，实际 {r.status_code}"
    print(f"  连续 5 次错误密码 → 5 × 401（每次提示剩余次数）")

    r = login(client, name="bob", password="guess-6")
    assert r.status_code == 429, f"第 6 次应 429，实际 {r.status_code}"
    print(f"  第 6 次（仍错误）→ 429 Too Many Requests")

    r = login(client, name="bob", password="right-password-6")
    assert r.status_code == 429, f"锁定后正确密码也应 429，实际 {r.status_code}"
    print(f"  锁定后用【正确】密码 → 仍是 429：锁定检查先于密码校验，爆破没有第二次机会")
    print("  生产补强：计数带时间窗（如 15 分钟）+ 按 IP 双重限流 + 解锁需过期或管理员介入")


def main() -> None:
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · Flask {version('flask')} · 书签应用（Flask 段收官）")
    with tempfile.TemporaryDirectory() as tmp:  # 所有 DB 进临时目录，收尾自动清理
        demo_factory(tmp)
        demo_full_flow(tmp)
        demo_hash_only(tmp)
        demo_rate_limit(tmp)

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 工厂隔离、全流程 302/401/429、用户表无明文、限流先于密码校验")


if __name__ == "__main__":
    main()
