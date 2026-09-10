from django.db import models
from django.utils import timezone


class Author(models.Model):
    name = models.CharField(max_length=30, unique=True)

    def __str__(self):
        return self.name


class Article(models.Model):
    title = models.CharField(max_length=80)
    content = models.TextField(blank=True)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name="articles")
    # 用 default 而非 auto_now_add：演示脚本需要写入确定的时间戳，分页断言才稳定
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created"]

    def __str__(self):
        return self.title
