# 13 · Django MTV、ORM 与 admin：全家桶的第一课

> 换框架不换知识点：项目 6 的 ORM、项目 7 的工程组织、项目 5 的模板，Django 全都有
> 自己的方言——而且第一次展示"约定大于配置"的威力。本实验搭出最小 Django 工程
> （config + blog 双包），实测三件事：**migrate 后表结构与 models.py 逐字段对应**、
> **ORM 聚合与手写 SQL 逐项相等**、**admin 两行注册换整套后台**。

## 1. 为什么需要它

Django 的学习曲线不在 API（API 很全），在"约定"：`startproject` 生成的目录为什么长这样？`INSTALLED_APPS` 加一个 app 发生了什么？`makemigrations` 与 `migrate` 分成两条命令为什么是 genius 设计（前者生成脚本可审查、后者执行变更可追溯——正是项目 6 Alembic 的同款思想）？本实验把约定拆开看：每个配置项都能指认"它约定掉了哪个决策"。admin 则是全家桶哲学的极致——Model 声明完，一个管理后台已经存在。

## 2. 总览：核心机制一图看懂

![MTV 流水线：从 models.py 到 admin 后台](images/django_mtv_admin.svg)

一句话心智模型：**models.py 是唯一的真相源——字段约束进迁移、迁移进表结构、表结构喂给 QuerySet 和 admin**。看图上半是"定义与落库"（models → makemigrations → migrate，PRAGMA 验收），下半是"使用与后台"（QuerySet 与手写 SQL 对账、admin changelist 展示种子数据）。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/13_django_mtv_admin/images/django_mtv_admin.html)
> （或本地打开 [`images/django_mtv_admin.html`](images/django_mtv_admin.html)）。

## 3. 快速开始

```bash
cd web/13_django_mtv_admin
source ../.venv/bin/activate
python3 mtv_demo.py    # migrate + 灌种子 + 三节断言（收尾自动清理 db.sqlite3）
```

真实输出节选（macOS, CPython 3.14 · Django 6.1.1）：

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

## 4. 核心概念

### 4.1 MTV：Django 对 MVC 的重新命名

Model 管数据（字段即表结构 + 业务校验）、Template 管展示（Django 模板语言，项目 14 展开）、View 管编排（接收请求返回响应）——"控制器"的职责被 urls.py 的路由表和 View 平摊。`INSTALLED_APPS` 是装配清单：一个 app = 可复用的模型+视图+模板包，`blog` 注册后它的 models/admin/migrations 才会被 Django 发现。

### 4.2 迁移两段式：makemigrations 与 migrate 分离

`makemigrations` 把模型变更**编译成 Python 脚本**（进版本库、可审查可手改），`migrate` 才真正执行并记入 `django_migrations` 表——与项目 6 的 Alembic 完全同构（脚本链 + 版本记账）。分离的价值：迁移脚本是代码评审的一部分，"删列会不会丢数据"在执行前就被看见。

### 4.3 QuerySet：惰性的 SQL 生成器

`filter(author__name="鲁迅")` 的双下划线是跨关系语法糖；`values().annotate(Count)` 编译成 JOIN + GROUP BY。QuerySet 是惰性的——链式调用不触发查询，迭代/`list()`/`len()` 才执行。本实验把 ORM 聚合与手写 SQL 逐项对账（相等断言），证明它是可预测的生成器而非黑盒。

### 4.4 admin：Model 注册即后台

`@admin.register(Article)` + `list_display/list_filter/search_fields` 三行配置，得到列表页、过滤器、搜索框、增删改查表单、权限校验、分页——全部由 Model 元数据自动生成。它不只是"后台免费送"，更是 Model 定义质量的试金石：admin 里不好用的模型，API 里通常也别扭。

## 5. 关键代码解析

**为什么 ORM 与 SQL 的对账断言值得写？**

```python
orm_counts = dict(Article.objects.values("author__name").annotate(c=Count("id")))
raw_counts = dict(sqlite3.connect(DB).execute("SELECT a.name, COUNT(p.id) ... GROUP BY a.name"))
assert orm_counts == raw_counts
```

ORM 的价值主张是"生成正确的 SQL"——对账是直接验证这个主张。同时它是学习工具：想知道 `annotate` 生成了什么 SQL，`print(qs.query)` 一行就能看到（本实验用 sqlite3 手写版对照，效果相同且可断言）。

坑清单：

- **忘了把 app 加进 INSTALLED_APPS**：models 不被发现、makemigrations 报"No changes"、admin 看不到模型——三连症状同一个根因
- **改了模型不 makemigrations 直接 migrate**：migrate 说"OK 没事"（它只执行已生成的脚本），表结构悄悄落后于模型；`manage.py makemigrations --check` 可进 CI
- **`on_delete` 不写**：新版本 Django 必填；`CASCADE`/`SET_NULL`/`PROTECT` 的选择是业务决策不是语法填空
- **在 settings.py 硬编码 SECRET_KEY**：demo 里用了占位值并注明；生产必须环境变量注入（项目 7 同款教训）

## 6. 文件结构

```
13_django_mtv_admin/
├── README.md                          # 本教程文档
├── mtv_demo.py                        # 主演示脚本：migrate/ORM 对照/admin 三节实测
├── manage.py                          # Django 管理入口
├── config/
│   ├── __init__.py
│   ├── settings.py                    # 最小配置：apps/middleware/模板/数据库
│   └── urls.py                        # 目前只挂 admin
├── blog/
│   ├── __init__.py
│   ├── models.py                      # Author/Article（外键 + related_name）
│   ├── admin.py                       # 两行注册整套后台
│   └── migrations/0001_initial.py     # makemigrations 生成的迁移脚本
└── images/
    ├── django_mtv_admin.json          # 图源（typed JSON IR，可编辑重渲染）
    ├── django_mtv_admin.html          # 交互示意图（浏览器打开）
    └── django_mtv_admin.svg           # 双主题矢量图（本 README §2 内嵌）
```

`mtv_demo.py` 内容：`demo_migrate()` migrate + PRAGMA 表结构断言（验收点）/ `demo_orm_vs_sql()` 跨关系过滤与 ORM==SQL 聚合对账（验收点）/ `demo_admin()` superuser 登录 200 + 未登录 302（验收点）。环境：`web/.venv`（django）。

## 7. 面试要点

**Q1: Django 的 MTV 与 MVC 的对应关系？**
Model 对应 M，Template 对应 V（展示），View 对应 C（编排）——Django 的"View"其实是 MVC 的 Controller 职责，路由由 urls.py 承担。改名是为了强调"模板才是用户看到的视图"。

**Q2: makemigrations 和 migrate 为什么分开？**
前者把模型差异编译成可审查的 Python 迁移脚本（进版本库），后者执行脚本并记账到 django_migrations 表。分离让迁移成为代码评审对象、让"执行前发现问题"成为可能——Alembic/Django 都是这个设计。

**Q3: select_related 和 prefetch_related 的区别？（N+1 的 Django 方言）**
select_related 用 SQL JOIN 一次取回外键关联（多对一）；prefetch_related 分两条查询再在内存拼接（多对一/多对多）。都是治 N+1——对应 SQLAlchemy 的 joinedload/selectinload（项目 6）。

**Q4: Django admin 适合什么场景？边界在哪？**
适合内部运营后台、内容管理、数据初始化——Model 驱动、零前端成本。不适合面向 C 端的复杂交互；定制超过三成页面时，改用 DRF + 前端（项目 15）比硬掰 admin 划算。

**Q5: 双下划线跨关系查询的原理？**
`author__name="鲁迅"` 被 ORM 编译成 JOIN blog_author 后 WHERE name=...；可以无限跨（`author__profile__city`），代价是 JOIN 数增长。它是声明式的"关系导航语言"，生成的 SQL 可用 `qs.query` 直接检查。

## 8. 总结

1. **models.py 是唯一真相源**：字段约束进迁移、进表结构、进 admin、进 QuerySet
2. **迁移两段式**：生成脚本（可审查）与执行（可追溯）分离，Alembic 同思想
3. **ORM 对账断言**：values+annotate == JOIN+GROUP BY，生成器不是黑盒
4. **admin 是全家桶哲学的样品**：声明元数据，基础设施（后台/权限/分页）全部免费
5. 下一篇 [14 · 视图与表单](../14_django_views_forms/README.md)：FBV vs CBV、泛型视图与 auth 组件——MTV 的 T 和 V 补齐
