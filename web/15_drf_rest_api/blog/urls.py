from rest_framework import routers

from .views import ArticleViewSet

# Router 自动为 ViewSet 生成标准 CRUD 路由 + @action 自定义路由
router = routers.DefaultRouter()
router.register("articles", ArticleViewSet)

urlpatterns = router.urls
