# 14 · Django 视图与表单：FBV vs CBV、泛型视图与 auth 组件

> admin（lab 13）展示了"免费的后台"，这一站补齐 MTV 的 T 和 V：**ListView/DetailView/
> CreateView 三条泛型链路 + 一个 FBV 对照组**，外加 auth 组件自带的 LoginView。
> 分页零重叠、未登录 302 带 next、非法表单回显不落库——三条链路全部 test client 实测。

## What

Django 视图的第一道选择题是 FBV 还是 CBV——背"CBV 更高级"没有意义，答案是**按模式化程度分流**：列表/详情/创建是高度模式化的（取数→分页→渲染、校验→保存→重定向），泛型视图把样板全包办（`paginate_by = 4` 一行就有完整分页）；非模式化的聚合统计用 FBV 直写更省绕弯。一句话心智模型：**读链路交给泛型视图，写链路交给"Mixin 守卫 + CreateView + ModelForm 双闸"**。

## Why

本实验同一资源两种写法并存实测，并验证 auth 组件的三件免费品：LoginView 登录页、`LoginRequiredMixin` 的 302+next 重定向、ModelForm 的双层校验。

## How

```bash
cd web/14_django_views_forms
source ../.venv/bin/activate
python3 views_forms_demo.py    # migrate + 灌 6 篇文章 + 三节断言（收尾清理）
```

真实输出节选（Django 6.1.1）：

```
========================================================
[1. ListView 分页：每页 4 条，第二页拿走剩下的（验收点）]
========================================================
  第 1 页 → 200 · 「1 / 2」· 含 06/05/04/03（ordering=-created 生效）
  第 2 页 → 200 · 「2 / 2」· 恰好是剩下的 02/01，与第一页零重叠

========================================================
[3. CreateView：未登录 302 带 next、非法表单回显、合法发布（验收点）]
========================================================
  未登录 GET /blog/new/ → 302 → /accounts/login/?next=/blog/new/（next 指回原页）
  提交 1 字标题 → 200 · 页面含「标题至少 4 个字符」且不落库
  合法提交 → 302 · 落库 7 篇（ModelForm 字段校验 + clean_title 双闸全过）
```

诚实预期：

- **种子时间戳是固定值**（2026-01-01 至 06）：分页断言要求顺序确定，`auto_now_add` 会用"运行时刻"破坏确定性——改用 `default=timezone.now` 配合显式传值
- **`client.login()` 与 POST LoginView 都测了**：前者建立会话用于后续断言，后者验证 auth 组件视图本身可达
- **Django 5+ 的 LogoutView 只接受 POST**：本实验聚焦登录与创建，登出未纳入断言（lab 07 书签应用有完整登出流程）

### CBV 泛型视图：模式化的代价被框架付掉

`ListView` 用 `model + paginate_by` 两个声明换走"查全表、切页、组装 page_obj、渲染"全套；`DetailView` 按 pk 取单对象；`CreateView` 把"GET 显示表单、POST 校验保存"的分支也包了。泛型视图的可定制点按层级展开：改模板名、改 queryset、重写 `form_valid`——从声明到覆写渐进，不必一步到位。

### FBV 的正当性：非模式化需求更直白

`article_stats` 一个函数 + `JsonResponse` 完成聚合统计——没有要套的泛型模式时，FBV 少一层抽象。判断标准：需求与某个泛型视图的"形状"匹配度超过七成就用 CBV，否则 FBV。两者可以在同一个 urls.py 里混用（本项目就是这么写的）。

### ModelForm 与 clean_<field>：双层校验

ModelForm 从模型长出字段与基础校验（max_length、外键有效性）；`clean_title()` 补业务规则（标题至少 4 字符）。校验失败的表单**重新渲染并携带错误文案**（200 + errors），成功的走 `form_valid` 保存后 302——"非法 200 回显、合法 302 落库"在 Django 方言下重演。

### auth 组件：登录也是泛型视图

`LoginView` 处理 GET 渲染、POST 验证、写 session、按 `next` 跳转全套；`LoginRequiredMixin` 拦下未登录请求 302 到 `settings.LOGIN_URL` 并拼 `?next=` 原地址——登录成功自动回来。两条 settings 约定（LOGIN_URL/LOGIN_REDIRECT_URL）+ 一行 Mixin = 完整的访问控制。

## Deep Dive

**为什么种子数据的时间戳要显式固定？**

```python
Article.objects.create(title=f"文章 {k:02d}", created=datetime(2026, 1, k, tzinfo=timezone.utc))
```

模型的 `ordering = ["-created"]` 决定列表顺序——`auto_now_add` 会让 6 篇文章挤在同一秒内，分页断言（第一页含 06 不含 02）变成抛硬币。**确定性测试的前提是确定性输入**：与排序相关的断言必须先固定排序键。第一版用 `auto_now_add` 时分页内容断言随机红，就是这一课。

踩坑清单：

- **CBV 属性名写错静默失效**：`paginate_by` 拼错只是"没有分页"，不报错；泛型视图的行为靠约定属性名驱动，改完要跑断言
- **`reverse_lazy` 的必要性**：CreateView 的 `success_url` 在类定义时求值，此时 urls.py 还没加载完——必须用 `reverse_lazy`
- **Clean 方法里忘记 return**：`clean_title` 校验后不 `return title`，字段值被清空，"校验通过但数据丢了"
- **把业务逻辑塞进泛型视图的钩子迷宫**：覆写超过三个钩子就该退回 FBV——CBV 的可读性红利有阈值

## Q&A

**Q1: ListView 的分页是怎么工作的？**
`paginate_by` 声明每页条数后，ListView 自动切 QuerySet 并向模板注入 `page_obj/paginator`；URL 参数 `?page=N` 驱动切页，越界抛 404。QuerySet 是惰性的——切页发生在 SQL 层（LIMIT/OFFSET），不是取全量再切片。

**Q2: ModelForm 的校验顺序？**
字段级：`Field.clean()`（内置校验器）→ `clean_<field>()`（自定义单字段）；然后 `form.clean()`（跨字段）。错误收集在 `form.errors` 按字段归位——模板里逐字段回显就是读它。
