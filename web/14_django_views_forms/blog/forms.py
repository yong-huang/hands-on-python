from django import forms

from .models import Article


class ArticleForm(forms.ModelForm):
    """ModelForm：字段与校验规则从模型长出来，再补自定义规则"""

    class Meta:
        model = Article
        fields = ["title", "content", "author"]

    def clean_title(self):
        title = self.cleaned_data["title"]
        if len(title) < 4:
            raise forms.ValidationError("标题至少 4 个字符")
        return title
