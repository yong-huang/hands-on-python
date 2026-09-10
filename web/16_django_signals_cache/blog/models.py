from django.db import models
from django.utils.functional import cached_property


class Article(models.Model):
    title = models.CharField(max_length=80)
    content = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)

    @cached_property
    def word_count(self) -> int:
        """重计算属性：首次访问算一次，结果缓存在实例上"""
        return len(self.content.split())

    def __str__(self):
        return self.title


class AuditLog(models.Model):
    """post_save 信号的落点：每篇文章的保存历史"""

    action = models.CharField(max_length=10)  # created / updated
    article_title = models.CharField(max_length=80)
    at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action}: {self.article_title}"
