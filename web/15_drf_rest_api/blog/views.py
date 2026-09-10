from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Article
from .serializers import ArticleSerializer


class ArticleViewSet(viewsets.ModelViewSet):
    """一个 ViewSet = list/retrieve/create/update/destroy 五个视图"""

    queryset = Article.objects.select_related("author")
    serializer_class = ArticleSerializer
    # 权限来自 settings 的 DEFAULT_PERMISSION_CLASSES（IsAuthenticatedOrReadOnly）

    @action(detail=False, methods=["get"])
    def recent(self, request):
        """自定义动作：/api/articles/recent/ —— 最近 3 篇"""
        recent = self.get_queryset()[:3]
        serializer = self.get_serializer(recent, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
