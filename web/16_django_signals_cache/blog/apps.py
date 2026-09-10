from django.apps import AppConfig


class BlogConfig(AppConfig):
    name = "blog"

    def ready(self):
        """App 启动完成时连接信号——放这里保证只连一次、import blog 即生效"""
        from . import handlers  # noqa: F401
