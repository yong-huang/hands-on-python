"""
15 · DRF 构建 REST API —— Serializer / ViewSet / Router 三件套
Web 框架清单项目 15：把 blog 模型暴露成标准 REST API，权限/分页/自定义动作全实测

DRF 的三个抽象层（对应 images/drf_rest_api.svg）:
- Serializer:  模型 ↔ JSON 的双向翻译——读时嵌套作者、写时主键直传（读写分离建模）
- ViewSet:     一个类 = list/retrieve/create/update/destroy 五个视图 + @action 扩展
- Router:      自动注册标准路由，自定义动作自动获得 /articles/recent/ 这样的 URL

验收断言（APIClient 全实测）:
- 匿名读 200（分页 count=7，第二页 2 条）；匿名写 403（IsAuthenticatedOrReadOnly）
- 登录创建 201（嵌套 author）、改 200、删 204；非法 payload 400 指向 title
- recent 自定义动作路由注册且响应正确

用法:
- source ../.venv/bin/activate && python3 rest_demo.py

交互示意图: 用浏览器打开 images/drf_rest_api.html
"""

import os
import sys
from pathlib import Path

LAB = Path(__file__).resolve().parent
sys.path.insert(0, str(LAB))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

import logging  # noqa: E402

# 403/400 是本实验的"预期失败"断言，静音 django.request 对它们的警告日志
logging.getLogger("django.request").setLevel(logging.CRITICAL)

from django.core.management import call_command  # noqa: E402
from django.contrib.auth.models import User  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402

from blog.models import Article, Author  # noqa: E402
from blog.urls import router  # noqa: E402

DB = LAB / "db.sqlite3"


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def prepare_db() -> tuple[User, list[Author]]:
    if DB.exists():
        DB.unlink()
    call_command("migrate", verbosity=0, interactive=False)
    luxun = Author.objects.create(name="鲁迅")
    laoshe = Author.objects.create(name="老舍")
    for k in range(1, 8):  # 7 篇：第一页 5 条 + 第二页 2 条
        Article.objects.create(title=f"文章 {k:02d}",
                               author=luxun if k % 2 else laoshe)
    editor = User.objects.create_user("editor", password="editor-pass-6")
    return editor, [luxun, laoshe]


# ============================================================
# 1. 匿名读：200 + 分页；匿名写：403
# ============================================================

def demo_anonymous() -> None:
    section("1. 匿名读 200 分页生效；匿名写 403 被权限拦下（验收点）")
    anon = APIClient()
    r = anon.get("/api/articles/")
    assert r.status_code == 200, r.status_code
    body = r.json()
    assert body["count"] == 7 and len(body["results"]) == 5, body["count"]
    assert set(body["results"][0]) >= {"id", "title", "author"}, "嵌套 author 应在响应里"
    print(f"  GET /api/articles/ → 200 · count=7 · 第一页 5 条 · author 嵌套: "
          f"{body['results'][0]['author']}")

    r = anon.get("/api/articles/?page=2")
    assert len(r.json()["results"]) == 2, "第二页应是剩下的 2 条"
    print(f"  ?page=2 → 200 · 第二页 {len(r.json()['results'])} 条（PageNumberPagination）")

    r = anon.post("/api/articles/", data={"title": "匿名投稿", "author_id": 1},
                  format="json")
    assert r.status_code == 403, f"匿名写应 403，实际 {r.status_code}"
    print(f"  匿名 POST → 403（IsAuthenticatedOrReadOnly：写操作必须登录）")


# ============================================================
# 2. 登录写：201 / 200 / 204 全流程
# ============================================================

def demo_authenticated(editor: User) -> None:
    section("2. 登录写：创建 201 → 改 200 → 删 204（验收点）")
    client = APIClient()
    client.force_authenticate(user=editor)

    r = client.post("/api/articles/",
                    data={"title": "狂人日记", "content": "救救孩子……", "author_id": 1},
                    format="json")
    assert r.status_code == 201, f"创建应 201，实际 {r.status_code}: {r.data}"
    created = r.json()
    assert created["author"] == {"id": 1, "name": "鲁迅"}, "嵌套 author 应完整返回"
    print(f"  POST → 201 · 嵌套 author={created['author']}（写传 author_id、读出完整对象）")

    r = client.patch(f"/api/articles/{created['id']}/",
                     data={"content": "救救孩子……（修订）"}, format="json")
    assert r.status_code == 200 and "修订" in r.json()["content"]
    print(f"  PATCH → 200 · 内容已更新")

    r = client.delete(f"/api/articles/{created['id']}/")
    assert r.status_code == 204, f"删除应 204，实际 {r.status_code}"
    assert Article.objects.count() == 7, "删完应回到 7 篇"
    print(f"  DELETE → 204 · 回到 7 篇")


# ============================================================
# 3. 校验与自定义动作
# ============================================================

def demo_validation_and_action(client: APIClient) -> None:
    section("3. 校验 400 指向字段；recent 自定义动作路由（验收点）")
    client.force_authenticate(user=User.objects.get(username="editor"))

    r = client.post("/api/articles/", data={"content": "没有标题"}, format="json")
    assert r.status_code == 400, f"缺标题应 400，实际 {r.status_code}"
    assert "title" in r.json(), f"错误应指向 title: {r.json()}"
    print(f"  缺 title → 400 · {r.json()}（serializer 校验，错误键与字段同名）")

    route_strs = [str(getattr(p, "pattern", "")) for p in router.urls]
    assert any("recent" in s for s in route_strs), f"recent 动作应被 Router 注册: {route_strs}"
    r = client.get("/api/articles/recent/")
    assert r.status_code == 200 and len(r.json()) == 3, f"recent 应返回 3 条: {len(r.json())}"
    print(f"  GET /api/articles/recent/ → 200 · 最近 3 篇（@action 自动注册路由）")
    print("  一个 @action 装饰器 = 自定义业务端点，无需手写 urls.py")


def main() -> None:
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · Django {version('django')} + DRF "
          f"{version('djangorestframework')} · REST API 实验")
    try:
        editor, _authors = prepare_db()
        demo_anonymous()
        demo_authenticated(editor)
        client = APIClient()
        demo_validation_and_action(client)
    finally:
        if DB.exists():
            DB.unlink()
    print("\n  已清理 db.sqlite3")

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 匿名读/写权限、CRUD 状态码、400 指向字段、recent 动作")


if __name__ == "__main__":
    main()
