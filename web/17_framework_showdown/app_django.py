"""同题 TODO API · Django+DRF 实现（全家桶方言：Model + Serializer + ViewSet）

单文件 standalone：settings.configure + schema_editor 建表，免 manage.py 工程。
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
from django.conf import settings

LAB = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(LAB, "showdown.sqlite3")  # 文件库：:memory: 每线程各一份，表会"消失"

settings.configure(
    DEBUG=True,
    SECRET_KEY="demo-insecure-key",
    ALLOWED_HOSTS=["*"],
    INSTALLED_APPS=[
        "django.contrib.contenttypes",
        "django.contrib.auth",
        "rest_framework",
    ],
    DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": DB_PATH}},
    ROOT_URLCONF=__name__,
    # 声明式静音：401/400/404 是本对比的预期断言；命令式 setLevel 会被
    # get_wsgi_application() 内部的二次 django.setup() 重放默认配置覆盖
    LOGGING={
        "version": 1,
        "disable_existing_loggers": False,
        "loggers": {"django.request": {"level": "CRITICAL"}},
    },
)
django.setup()

from django.db import connection, models  # noqa: E402
from django.urls import path  # noqa: E402
from rest_framework import status, viewsets  # noqa: E402
from rest_framework.decorators import action, api_view  # noqa: E402
from rest_framework.response import Response  # noqa: E402

from tokenbox import make_token, verify_token  # noqa: E402

USERS = {"alice": "wonderland"}


class Todo(models.Model):
    title = models.CharField(max_length=100)
    done = models.BooleanField(default=False)

    class Meta:
        app_label = "auth"  # standalone 单文件：挂靠已注册 app（教学演示的取巧）


def ensure_db() -> None:
    """standalone 免迁移：schema_editor 直接建表（真实项目走 makemigrations/migrate）"""
    with connection.schema_editor() as se:
        se.create_model(Todo)


class TodoViewSet(viewsets.ViewSet):
    """ViewSet 管行为；校验与 JSON 渲染由 DRF 管缺省兜底（400 自动指向字段）"""

    def list(self, request):
        rows = Todo.objects.all().order_by("id")
        return Response([{"id": r.pk, "title": r.title, "done": r.done} for r in rows])

    def create(self, request):
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"title": ["This field is required."]},
                            status=status.HTTP_400_BAD_REQUEST)
        todo = Todo.objects.create(title=title)
        return Response({"id": todo.pk, "title": todo.title, "done": todo.done},
                        status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        todo = Todo.objects.filter(pk=pk).first()
        if todo is None:
            return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"id": todo.pk, "title": todo.title, "done": todo.done})

    def destroy(self, request, pk=None):
        deleted, _ = Todo.objects.filter(pk=pk).delete()
        if not deleted:
            return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
def issue_token(request):
    if USERS.get(request.data.get("username")) != request.data.get("password"):
        return Response({"error": "bad credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"token": make_token(request.data["username"])})


@api_view(["GET"])
def secret(request):
    auth = request.headers.get("Authorization", "")
    user = verify_token(auth.removeprefix("Bearer ")) if auth.startswith("Bearer ") else None
    if user is None:
        return Response({"error": "unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"secret": f"{user} 的私密数据"})


# Django 的路由约定带尾斜杠——与 Flask/FastAPI 的无斜杠形成"方言差异"（showdown 里适配）
urlpatterns = [
    path("token/", issue_token),
    path("secret/", secret),
    path("todos/", TodoViewSet.as_view({"get": "list", "post": "create"})),
    path("todos/<int:pk>/", TodoViewSet.as_view({"get": "retrieve", "delete": "destroy"})),
]

# WSGI 入口：showdown.py 用 werkzeug 托管它（与 Flask 同一条服务路径）
from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
