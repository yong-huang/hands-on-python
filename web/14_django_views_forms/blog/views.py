from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Count
from django.http import JsonResponse
from django.urls import reverse_lazy
from django.views.generic import CreateView, DetailView, ListView

from .forms import ArticleForm
from .models import Article


class ArticleListView(ListView):
    """CBV：泛型视图把'取数据 + 分页 + 渲染'的样板代码全部包办"""
    model = Article
    template_name = "blog/article_list.html"
    context_object_name = "articles"
    paginate_by = 4  # 每页 4 条——分页断言的依据


class ArticleDetailView(DetailView):
    model = Article
    template_name = "blog/article_detail.html"


class ArticleCreateView(LoginRequiredMixin, CreateView):
    """未登录访问 → 302 到 settings.LOGIN_URL 并带 next 参数（断言点）"""
    model = Article
    form_class = ArticleForm
    template_name = "blog/article_form.html"
    success_url = reverse_lazy("blog:list")


def article_stats(request):
    """FBV 对照组：同样的统计需求，函数写法更直白——两种风格各有地盘"""
    per_author = Article.objects.values("author__name").annotate(total=Count("id"))
    return JsonResponse({
        "total": Article.objects.count(),
        "per_author": {row["author__name"]: row["total"] for row in per_author},
    })
