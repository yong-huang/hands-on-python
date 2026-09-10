from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("blog/", include("blog.urls")),
    # LoginView/LogoutView 是 auth 组件自带的 CBV——登录页面也是"免费送"的
    path("accounts/", include("django.contrib.auth.urls")),
]
