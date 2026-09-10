from django.urls import path

from . import views

app_name = "blog"

urlpatterns = [
    path("", views.ArticleListView.as_view(), name="list"),
    path("new/", views.ArticleCreateView.as_view(), name="create"),
    path("<int:pk>/", views.ArticleDetailView.as_view(), name="detail"),
    path("stats/", views.article_stats, name="stats"),
]
