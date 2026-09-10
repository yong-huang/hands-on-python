from rest_framework import serializers

from .models import Article, Author


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ["id", "name"]


class ArticleSerializer(serializers.ModelSerializer):
    # 读：嵌套展示作者完整信息；写：author_id 主键直传——读写分离的项目 8 同款思想
    author = AuthorSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=Author.objects.all(), source="author", write_only=True)

    class Meta:
        model = Article
        fields = ["id", "title", "content", "created", "author", "author_id"]
