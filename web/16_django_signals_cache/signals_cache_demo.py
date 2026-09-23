"""
16 · Django 信号、缓存与测试 —— 工程化的三根支柱
Web 框架清单项目 16：Django 段收官——解耦副作用、管住重复查询、守住回归

三个工程化机制（对应 images/django_signals_cache.svg）:
- 信号:      post_save receiver 自动写 AuditLog——业务保存零感知，审计解耦完成
- 缓存:      cache.get_or_set + CaptureQueriesContext——第二次调用 0 条 SQL（断言）
- 测试:      pytest-django 4 条用例 + --cov 覆盖率 ≥80%（subprocess 实测解析）

用法:
- source ../.venv/bin/activate && python3 signals_cache_demo.py
"""

import os
import re
import subprocess
import sys
from pathlib import Path

LAB = Path(__file__).resolve().parent
sys.path.insert(0, str(LAB))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from django.core.cache import cache  # noqa: E402
from django.core.management import call_command  # noqa: E402
from django.db import connection  # noqa: E402
from django.test.utils import CaptureQueriesContext  # noqa: E402

from blog.models import Article, AuditLog  # noqa: E402

DB = LAB / "db.sqlite3"


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. 信号：保存即审计，业务代码零感知
# ============================================================

def demo_signal() -> None:
    section("1. post_save 信号：保存自动写审计日志（验收点）")
    article = Article.objects.create(title="呐喊·自序", content="年青时候……")
    logs = list(AuditLog.objects.filter(article_title="呐喊·自序")
                .values_list("action", flat=True))
    assert logs == ["created"], f"创建后应有 created 审计: {logs}"

    article.title = "呐喊·自序（再版）"
    article.save()
    actions = list(AuditLog.objects.order_by("id").values_list("action", flat=True))
    assert actions == ["created", "updated"], actions
    print(f"  create → 审计 {actions[0]!r}；再次 save → 追加 {actions[1]!r}")
    print("  Article 的业务代码里没有一行审计逻辑——副作用被 receiver 解耦到信号层")
    print("  代价提示：信号是'看不见的调用'，链路一多排查就要靠 docs 里写清楚")


# ============================================================
# 2. 缓存：第二次调用 0 条 SQL
# ============================================================

def expensive_titles() -> list[str]:
    return list(Article.objects.values_list("title", flat=True))


def demo_cache() -> None:
    section("2. 缓存：get_or_set 首次查库，第二次 0 条 SQL（验收点）")
    cache.clear()
    with CaptureQueriesContext(connection) as first:
        r1 = cache.get_or_set("titles", expensive_titles, timeout=60)
    assert len(first) >= 1, "首次调用应真实查库"
    with CaptureQueriesContext(connection) as second:
        r2 = cache.get("titles")
    assert r1 == r2 and len(second) == 0, f"第二次应命中缓存零查询: {len(second)}"
    print(f"  首次 get_or_set → {len(first)} 条 SQL，拿到 {len(r1)} 个标题")
    print(f"  第二次 get      → {len(second)} 条 SQL（LocMemCache 命中）")
    print("  CaptureQueriesContext 让'缓存省了一次查询'从感觉变成可断言的数字")


# ============================================================
# 3. cached_property：实例级缓存
# ============================================================

def demo_cached_property() -> None:
    section("3. cached_property：算一次，挂在实例上")
    article = Article(title="热风", content="one two three four")
    first = article.word_count
    article.content = "内容已经完全变了 many many words"
    assert article.word_count == first == 4, "第二次访问不应重算"
    assert "word_count" in article.__dict__, "缓存值应写在实例 __dict__"
    print(f"  content 改了，word_count 仍是 {article.word_count}（缓存在实例 __dict__）")
    print("  适用边界：不可变派生值；可变输入要用带失效机制的缓存（如上面的 cache 框架）")


# ============================================================
# 4. pytest-django + coverage：回归防线
# ============================================================

def demo_pytest_coverage() -> None:
    section("4. pytest --cov：4 条用例全绿 + 覆盖率 ≥80%（验收点）")
    r = subprocess.run(
        [sys.executable, "-m", "pytest", "blog/test_blog.py",
         "--cov=blog", "--cov-report=term", "-q"],
        cwd=LAB, capture_output=True, text=True, timeout=120,
    )
    output = r.stdout
    assert r.returncode == 0, f"pytest 失败:\n{output}\n{r.stderr}"
    print("  pytest: 4 passed（信号两则 + 缓存命中 + cached_property）")

    match = re.search(r"TOTAL\s+\d+\s+\d+\s+(\d+)%", output)
    assert match, f"coverage 报告解析失败:\n{output}"
    total_pct = int(match.group(1))
    assert total_pct >= 80, f"覆盖率应 ≥80%，实际 {total_pct}%\n{output}"
    print(f"  coverage: blog app 覆盖率 {total_pct}% ≥ 80% ✓")


def main() -> None:
    from importlib.metadata import version as _v
    if tuple(int(x) for x in _v("django").split(".")[:2]) < (4, 2):
        sys.exit(f"本实验需要 django ≥ 4.2（当前 {_v('django')}）。"
                 f"请先激活系列环境：source ../.venv/bin/activate")
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · Django {version('django')} · 信号缓存与测试")
    try:
        if DB.exists():
            DB.unlink()
        call_command("migrate", verbosity=0, interactive=False)
        demo_signal()
        demo_cache()
        demo_cached_property()
        demo_pytest_coverage()
    finally:
        cache.clear()
        if DB.exists():
            DB.unlink()
    print("\n  已清理 db.sqlite3 与缓存")

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ created/updated 审计、第二次 0 条 SQL、覆盖率达标")


if __name__ == "__main__":
    main()
