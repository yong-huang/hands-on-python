from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Article, AuditLog


@receiver(post_save, sender=Article)
def audit_article_save(sender, instance, created, **kwargs):
    """每篇文章保存后自动写审计日志——业务代码零感知"""
    AuditLog.objects.create(
        action="created" if created else "updated",
        article_title=instance.title,
    )
