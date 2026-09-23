# 13 · Django MTV、ORM 与 admin：全家桶的第一课

> 换框架不换知识点：SQLAlchemy 的 ORM（lab 06）、应用组织（lab 07）、模板（lab 05），
> Django 全都有自己的方言——而且第一次展示"约定大于配置"的威力。本实验搭出最小
> Django 工程（config + blog 双包），实测三件事：**migrate 后表结构与 models.py 逐字段
> 对应**、**ORM 聚合与手写 SQL 逐项相等**、**admin 两行注册换整套后台**。

## What

Django 的学习曲线不在 API（API 很全），在"约定"：`startproject` 生成的目录为什么长这样？`INSTALLED_APPS` 加一个 app 发生了什么？`makemigrations` 与 `migrate` 分成两条命令为什么是 genius 设计（前者生成脚本可审查、后者执行变更可追溯——正是 lab 06 Alembic 的同款思想）？一句话心智模型：**models.py 是唯一的真相源——字段约束进迁移、迁移进表结构、表结构喂给 QuerySet 和 admin**。admin 则是全家桶哲学的极致——Model 声明完，一个管理后台已经存在。

## Why

本实验把约定拆开看：每个配置项都能指认"它约定掉了哪个决策"。

## How

```bash
cd web/13_django_mtv_admin
source ../.venv/bin/activate
python3 mtv_demo.py    # migrate + 灌种子 + 三节断言（收尾自动清理 db.sqlite3）
```

真实输出节选（Django 6.1.1）：

```
========================================================
[2. ORM 与手写 SQL 对照：跨关系与聚合（验收点）]
========================================================
  跨关系过滤 author__name='鲁迅' → ['呐喊·自序', '阿Q正传']
  聚合对照: ORM {'老舍': 1, '鲁迅': 2} == SQL {'老舍': 1, '鲁迅': 2}；总数/平均浏览量也逐项相等
  结论：ORM 是 SQL 的生成器而不是黑盒——两边随时可以对账

========================================================
[3. admin：两行注册，整套后台（验收点）]
========================================================
  未登录 GET /admin/blog/article/ → 302 → 登录页
  superuser 登录后 → 200 · changelist 含「呐喊·自序」「鲁迅」（list_display 生效）
  admin.py 两行注册换来列表/过滤/搜索/增删改查——全家桶的'后台免费送'
```

诚实预期：

- **Django 是多文件工程**：本实验目录含 `config/`（settings/urls）与 `blog/`（models/admin/migrations）——主 demo `mtv_demo.py` 通过 `django.setup()` 串起全部断言，与单文件实验的阅读方式不同
- **admin changelist 的 HTML 是 Django 模板渲染的**：断言查中文标题与作者名，换了 Django 版本页面结构变化不影响这两个锚点
- **`db.sqlite3` 每次运行前重建、跑完删除**：想保留现场手动注释掉 main 末尾的清理

### MTV：Django 对 MVC 的重新命名

Model 管数据（字段即表结构 + 业务校验）、Template 管展示（Django 模板语言，lab 14 展开）、View 管编排（接收请求返回响应）——"控制器"的职责被 urls.py 的路由表和 View 平摊。`INSTALLED_APPS` 是装配清单：一个 app = 可复用的模型+视图+模板包，`blog` 注册后它的 models/admin/migrations 才会被 Django 发现。

### 迁移两段式：makemigrations 与 migrate 分离

`makemigrations` 把模型变更**编译成 Python 脚本**（进版本库、可审查可手改），`migrate` 才真正执行并记入 `django_migrations` 表——与 lab 06 的 Alembic 完全同构（脚本链 + 版本记账）。分离的价值：迁移脚本是代码评审的一部分，"删列会不会丢数据"在执行前就被看见。

### QuerySet：惰性的 SQL 生成器

`filter(author__name="鲁迅")` 的双下划线是跨关系语法糖；`values().annotate(Count)` 编译成 JOIN + GROUP BY。QuerySet 是惰性的——链式调用不触发查询，迭代/`list()`/`len()` 才执行。本实验把 ORM 聚合与手写 SQL 逐项对账（相等断言），证明它是可预测的生成器而非黑盒。

### admin：Model 注册即后台

`@admin.register(Article)` + `list_display/list_filter/search_fields` 三行配置，得到列表页、过滤器、搜索框、增删改查表单、权限校验、分页——全部由 Model 元数据自动生成。它不只是"后台免费送"，更是 Model 定义质量的试金石：admin 里不好用的模型，API 里通常也别扭。

## Deep Dive

**为什么 ORM 与 SQL 的对账断言值得写？**

```python
orm_counts = dict(Article.objects.values("author__name").annotate(c=Count("id")))
raw_counts = dict(sqlite3.connect(DB).execute("SELECT a.name, COUNT(p.id) ... GROUP BY a.name"))
assert orm_counts == raw_counts
```

ORM 的价值主张是"生成正确的 SQL"——对账是直接验证这个主张。同时它是学习工具：想知道 `annotate` 生成了什么 SQL，`print(qs.query)` 一行就能看到（本实验用 sqlite3 手写版对照，效果相同且可断言）。

踩坑清单：

- **忘了把 app 加进 INSTALLED_APPS**：models 不被发现、makemigrations 报"No changes"、admin 看不到模型——三连症状同一个根因
- **改了模型不 makemigrations 直接 migrate**：migrate 说"OK 没事"（它只执行已生成的脚本），表结构悄悄落后于模型；`manage.py makemigrations --check` 可进 CI
- **`on_delete` 不写**：新版本 Django 必填；`CASCADE`/`SET_NULL`/`PROTECT` 的选择是业务决策不是语法填空
- **在 settings.py 硬编码 SECRET_KEY**：demo 里用了占位值并注明；生产必须环境变量注入（lab 07 同款教训）

## Q&A

**Q1: Django 的 MTV 与 MVC 的对应关系？**
Model 对应 M，Template 对应 V（展示），View 对应 C（编排）——Django 的"View"其实是 MVC 的 Controller 职责，路由由 urls.py 承担。改名是为了强调"模板才是用户看到的视图"。

**Q2: select_related 和 prefetch_related 的区别？（N+1 的 Django 方言）**
select_related 用 SQL JOIN 一次取回外键关联（多对一）；prefetch_related 分两条查询再在内存拼接（多对一/多对多）。都是治 N+1——对应 SQLAlchemy 的 joinedload/selectinload（lab 06）。

**Q3: Django admin 适合什么场景？边界在哪？**
适合内部运营后台、内容管理、数据初始化——Model 驱动、零前端成本。不适合面向 C 端的复杂交互；定制超过三成页面时，改用 DRF + 前端（lab 15）比硬掰 admin 划算。
