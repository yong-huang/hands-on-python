"""
14 · Django 视图与表单 —— FBV vs CBV、泛型视图与 auth 组件
Web 框架清单项目 14：补齐 MTV 的 T 和 V，列表/详情/创建三条链路全部实测

两条写法路线（对应 images/django_views_forms.svg）:
- CBV 泛型视图: ListView（取数+分页+渲染三合一）/ DetailView /
              CreateView+LoginRequiredMixin——样板代码全部包办
- FBV 函数视图: stats 统计接口对照组——逻辑直白，适合"不属于任何泛型模式"的视图
- ModelForm:   字段与校验从模型长出来，clean_title 再补自定义规则

auth 组件也是免费的：/accounts/login/ 是 Django 自带的 LoginView（CBV 的官方样品），
LoginRequiredMixin 的未登录 302 与 next 参数、分页第二页、非法表单回显——全断言。

用法:
- source ../.venv/bin/activate && python3 views_forms_demo.py

交互示意图: 用浏览器打开 images/django_views_forms.html
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

LAB = Path(__file__).resolve().parent
sys.path.insert(0, str(LAB))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from django.contrib.auth.models import User  # noqa: E402
from django.core.management import call_command  # noqa: E402
from django.test import Client  # noqa: E402

from blog.models import Article, Author  # noqa: E402

DB = LAB / "db.sqlite3"


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def prepare_db() -> None:
    if DB.exists():
        DB.unlink()
    call_command("migrate", verbosity=0, interactive=False)
    luxun = Author.objects.create(name="鲁迅")
    # 固定时间戳：ordering=-created 下，page1 = 06/05/04/03，page2 = 02/01
    for k in range(1, 7):
        Article.objects.create(
            title=f"文章 {k:02d}", content=f"第 {k} 篇的内容", author=luxun,
            created=datetime(2026, 1, k, tzinfo=timezone.utc))
    User.objects.create_user("writer", password="writer-pass-6")


# ============================================================
# 1. ListView 分页：第一页 4 条、第二页 2 条
# ============================================================

def demo_pagination(client: Client) -> None:
    section("1. ListView 分页：每页 4 条，第二页拿走剩下的（验收点）")
    r1 = client.get("/blog/")
    html1 = r1.content.decode()
    assert r1.status_code == 200 and "1 / 2" in html1
    assert "文章 06" in html1 and "文章 02" not in html1, "第一页应含最新 4 篇"
    print(f"  第 1 页 → 200 · 「1 / 2」· 含 06/05/04/03（ordering=-created 生效）")

    r2 = client.get("/blog/?page=2")
    html2 = r2.content.decode()
    assert r2.status_code == 200 and "2 / 2" in html2
    assert "文章 02" in html2 and "文章 01" in html2 and "文章 06" not in html2
    print(f"  第 2 页 → 200 · 「2 / 2」· 恰好是剩下的 02/01，与第一页零重叠")
    print("  paginate_by = 4 一行配置：页码/切页/越界处理全是 ListView 包办的样板")


# ============================================================
# 2. DetailView 与 FBV 统计接口
# ============================================================

def demo_detail_and_fbv(client: Client) -> None:
    section("2. DetailView 单页 + FBV 统计接口（对照组）")
    article = Article.objects.filter(title="文章 03").first()
    r = client.get(f"/blog/{article.pk}/")
    assert r.status_code == 200 and "文章 03" in r.content.decode()
    assert article.author.name in r.content.decode()
    print(f"  GET /blog/{article.pk}/ → 200 · 标题与作者名都在详情页")

    r = client.get("/blog/stats/")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 6 and data["per_author"] == {"鲁迅": 6}, data
    print(f"  GET /blog/stats/ → 200 · {data}（FBV + JsonResponse，直白即美德）")
    print("  对照结论：模式化需求用 CBV 省样板，非模式化需求用 FBV 省绕弯")


# ============================================================
# 3. 登录保护与 ModelForm 校验
# ============================================================

def demo_create_flow(client: Client) -> None:
    section("3. CreateView：未登录 302 带 next、非法表单回显、合法发布（验收点）")
    r = client.get("/blog/new/")
    assert r.status_code == 302, f"未登录应 302，实际 {r.status_code}"
    assert r.headers["Location"] == "/accounts/login/?next=/blog/new/", r.headers["Location"]
    print(f"  未登录 GET /blog/new/ → 302 → {r.headers['Location']}（next 指回原页）")

    assert client.login(username="writer", password="writer-pass-6"), "登录失败"
    r = client.post("/accounts/login/", data={"username": "writer",
                                              "password": "writer-pass-6"})
    assert r.status_code in (200, 302)  # LoginView 可用（登录态已由 client.login 建立）

    author_id = Author.objects.first().pk
    r = client.post("/blog/new/", data={"title": "短", "content": "内容",
                                        "author": author_id})
    assert r.status_code == 200, f"非法表单应 200 回显，实际 {r.status_code}"
    assert "标题至少 4 个字符" in r.content.decode(), "clean_title 的错误应回显"
    assert Article.objects.count() == 6, "非法提交不应落库"
    print(f"  提交 1 字标题 → 200 · 页面含「标题至少 4 个字符」且不落库")

    r = client.post("/blog/new/", data={"title": "狂人日记手记", "content": "救救孩子……",
                                        "author": author_id})
    assert r.status_code == 302, f"合法提交应 302，实际 {r.status_code}"
    assert Article.objects.count() == 7 and Article.objects.filter(title="狂人日记手记").exists()
    print(f"  合法提交 → 302 · 落库 7 篇（ModelForm 字段校验 + clean_title 双闸全过）")
    print("  LoginRequiredMixin + CreateView：登录保护与表单处理各只写了一行声明")


def main() -> None:
    from importlib.metadata import version as _v
    if tuple(int(x) for x in _v("django").split(".")[:2]) < (4, 2):
        sys.exit(f"本实验需要 django ≥ 4.2（当前 {_v('django')}）。"
                 f"请先激活系列环境：source ../.venv/bin/activate")
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · Django {version('django')} · 视图与表单实验")
    try:
        prepare_db()
        client = Client()
        demo_pagination(client)
        demo_detail_and_fbv(client)
        demo_create_flow(client)
    finally:
        if DB.exists():
            DB.unlink()
    print("\n  已清理 db.sqlite3")

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 分页零重叠、FBV/CBV 各就各位、登录保护与表单校验全链路")


if __name__ == "__main__":
    main()
