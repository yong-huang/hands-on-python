from django.contrib import admin

from .models import Article, Author


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "views")
    list_filter = ("author",)
    search_fields = ("title",)


admin.site.register(Author)
