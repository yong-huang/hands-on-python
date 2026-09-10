"""pytest-django 测试：信号审计 / 缓存命中 / cached_property 三件套"""

import pytest
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext

from blog.models import Article, AuditLog


@pytest.mark.django_db
def test_post_save_writes_audit_log():
    Article.objects.create(title="第一篇", content="hello world")
    assert AuditLog.objects.filter(article_title="第一篇", action="created").count() == 1

    article = Article.objects.get(title="第一篇")
    article.title = "第一篇（改）"
    article.save()
    assert AuditLog.objects.filter(article_title="第一篇（改）", action="updated").count() == 1


@pytest.mark.django_db
def test_created_vs_updated_actions():
    article = Article.objects.create(title="动作研究", content="x")
    article.save()
    actions = list(AuditLog.objects.filter(article_title="动作研究")
                   .values_list("action", flat=True))
    assert actions == ["created", "updated"]


@pytest.mark.django_db
def test_cache_second_hit_costs_zero_queries():
    cache.clear()

    def expensive_titles():
        return list(Article.objects.values_list("title", flat=True))

    with CaptureQueriesContext(connection) as first:
        r1 = cache.get_or_set("titles", expensive_titles, timeout=60)
    with CaptureQueriesContext(connection) as second:
        r2 = cache.get("titles")

    assert r1 == r2 == []
    assert len(first) >= 1, "首次应真实查询数据库"
    assert len(second) == 0, "第二次应命中缓存零查询"


def test_cached_property_computes_once():
    article = Article(title="缓存属性", content="one two three")
    assert article.word_count == 3
    article.content = "changed after first access"  # 改了也不重算——缓存挂在实例上
    assert article.word_count == 3
