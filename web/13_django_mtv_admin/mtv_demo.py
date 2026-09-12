"""
13 · Django MTV、ORM 与 admin —— 全家桶的第一课
Web 框架清单项目 13：多文件工程的开始，"约定大于配置"怎么落成目录

MTV 三层各就各位（对应 images/django_mtv_admin.svg）:
- Model:   blog/models.py——Author/Article 声明式定义，字段约束即表结构
- Template: 本站暂不写模板，admin 自带的渲染就是 Template 层的展示（14 站补齐）
- View:    admin 两行注册自动生成的整套增删改查视图——"后台免费送"

三个实测验收:
- migrate 后 PRAGMA 断言 blog_author/blog_article 表与字段齐全
- ORM 聚合（values+annotate）与手写 SQL（JOIN+GROUP BY）结果逐项相等
- superuser 登录后 test client 访问 /admin/blog/article/ 200 且含种子数据

用法:
- source ../.venv/bin/activate && python3 mtv_demo.py

交互示意图: 用浏览器打开 images/django_mtv_admin.html
"""

import os
import sqlite3
import sys
from pathlib import Path

LAB = Path(__file__).resolve().parent
sys.path.insert(0, str(LAB))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from django.contrib.auth.models import User  # noqa: E402
from django.core.management import call_command  # noqa: E402
from django.db import connection  # noqa: E402
from django.db.models import Avg, Count  # noqa: E402
from django.test import Client  # noqa: E402

from blog.models import Article, Author  # noqa: E402

DB = LAB / "db.sqlite3"


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


def demo_migrate() -> None:
    section("1. migrate 建表：PRAGMA 验证表与字段（验收点）")
    if DB.exists():
        DB.unlink()  # 干净重建，可重复运行
    call_command("migrate", verbosity=0, interactive=False)

    con = sqlite3.connect(DB)
    tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"blog_author", "blog_article"} <= tables, f"业务表缺失: {tables}"
    cols = {r[1] for r in con.execute("PRAGMA table_info(blog_article)")}
    assert {"id", "title", "content", "views", "author_id", "created"} <= cols, cols
    con.close()
    print(f"  业务表: blog_author / blog_article（外加 auth/session 等 Django 内建表）")
    print(f"  blog_article 字段: {sorted(cols)}——models.py 的字段约束原样落进表结构")


def demo_orm_vs_sql() -> None:
    section("2. ORM 与手写 SQL 对照：跨关系与聚合（验收点）")
    luxun = Author.objects.create(name="鲁迅")
    laoshe = Author.objects.create(name="老舍")
    Article.objects.create(title="呐喊·自序", author=luxun, views=30)
    Article.objects.create(title="阿Q正传", author=luxun, views=50)
    Article.objects.create(title="骆驼祥子", author=laoshe, views=20)

    # ORM：双下划线跨关系过滤 + annotate 聚合
    lu_articles = list(Article.objects.filter(author__name="鲁迅")
                       .values_list("title", flat=True))
    assert set(lu_articles) == {"呐喊·自序", "阿Q正传"}, lu_articles
    orm_counts = {row["author__name"]: row["c"]
                  for row in Article.objects.values("author__name").annotate(c=Count("id"))}
    totals = Article.objects.aggregate(total=Count("id"), avg_views=Avg("views"))

    # 手写 SQL 对照
    raw_con = sqlite3.connect(DB)
    raw_counts = dict(raw_con.execute(
        "SELECT a.name, COUNT(p.id) FROM blog_article p "
        "JOIN blog_author a ON a.id = p.author_id GROUP BY a.name"))
    raw_total = raw_con.execute("SELECT COUNT(*), AVG(views) FROM blog_article").fetchone()
    raw_con.close()

    assert orm_counts == raw_counts, f"ORM 与 SQL 聚合不一致: {orm_counts} vs {raw_counts}"
    assert totals["total"] == raw_total[0] == 3
    assert abs(totals["avg_views"] - raw_total[1]) < 1e-9
    print(f"  跨关系过滤 author__name='鲁迅' → {sorted(lu_articles)}")
    print(f"  聚合对照: ORM {orm_counts} == SQL {raw_counts}；总数/平均浏览量也逐项相等")
    print("  结论：ORM 是 SQL 的生成器而不是黑盒——两边随时可以对账")


def demo_admin() -> None:
    section("3. admin：两行注册，整套后台（验收点）")
    User.objects.create_superuser("admin", "admin@example.com", "admin-pass-123")
    client = Client()

    r = client.get("/admin/blog/article/")
    assert r.status_code == 302 and "/admin/login" in r.headers["Location"], \
        f"未登录访问 admin 应 302: {r.status_code}"
    print(f"  未登录 GET /admin/blog/article/ → 302 → 登录页")

    assert client.login(username="admin", password="admin-pass-123"), "superuser 登录失败"
    r = client.get("/admin/blog/article/")
    assert r.status_code == 200, f"登录后应 200，实际 {r.status_code}"
    html = r.content.decode()
    assert "呐喊·自序" in html and "鲁迅" in html, "changelist 应展示种子数据"
    print(f"  superuser 登录后 → 200 · changelist 含「呐喊·自序」「鲁迅」（list_display 生效）")
    print("  admin.py 两行注册换来列表/过滤/搜索/增删改查——全家桶的'后台免费送'")


def main() -> None:
    from importlib.metadata import version as _v
    if tuple(int(x) for x in _v("django").split(".")[:2]) < (4, 2):
        sys.exit(f"本实验需要 django ≥ 4.2（当前 {_v('django')}）。"
                 f"请先激活系列环境：source ../.venv/bin/activate")
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · Django {version('django')} · MTV 与 admin 实验")
    try:
        demo_migrate()
        demo_orm_vs_sql()
        demo_admin()
    finally:
        if DB.exists():
            DB.unlink()  # 收尾清理：实验可重复跑
    print("\n  已清理 db.sqlite3（下次运行重新 migrate + 灌种子）")

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 表结构 PRAGMA、ORM==SQL 对照、admin 登录 200")


if __name__ == "__main__":
    main()
