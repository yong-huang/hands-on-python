# 13 · Django MTV、ORM 与 admin：全家桶的第一课

> Django 是 Python 界的"全家桶"Web 框架：ORM、迁移、路由、模板、管理后台全部内置，
> 核心哲学是**约定大于配置**——Model 声明完，从表结构到后台都自动就位。本实验搭出
> 最小 Django 工程（config + blog 双包），实测三件事：**migrate 后表结构与 models.py
> 逐字段对应**、**ORM 聚合与手写 SQL 逐项相等**、**admin 两行注册换整套后台**。

## Background

这节讲"全家桶"框架要解决的问题：在它之前，搭一个数据库驱动的网站要自己组装哪些件，麻烦在哪里。

没有它之前：用 Flask 这类微框架搭站点，选型是自助餐——ORM（对象关系映射——用 Python 类与对象代替手写 SQL 操作数据库表）选 SQLAlchemy（lab 06）、迁移配 Alembic、管理后台自己写或挑第三方库，目录结构与配置文件每个项目各定一套。

自己拼装的代价在每个新项目重付一次：胶水代码要重写，配置风格要重定，接手别人的项目先花半天读懂个人约定；而"内容管理后台"这种几乎每个内容型项目都需要的件，也得重复造轮子。

Django 把这些重复决策变成了默认约定：目录怎么长、配置放哪、表结构怎么演进、后台从哪来，框架都给了统一答案——这就是"约定大于配置"。它从新闻网站的内容管理实践中演化而来，内置管理后台正源于此。

## What

这节定义 Django 的 MTV 结构与核心约定，并给出贯穿全文的心智模型。

Django 是全家桶式的 Python Web 框架：ORM、迁移（migration——把表结构变更记录成可版本管理、可回放的脚本）、路由、模板、管理后台内置。它把请求处理组织成 MTV 结构——对 MVC（把数据、展示、控制逻辑分开的经典 Web 分层）的一次重新命名：

| 组件 | 职责 | 本实验对应 |
|---|---|---|
| Model | 管数据：字段即表结构，附业务校验 | `blog/models.py` |
| Template | 管展示：Django 模板语言 | 模板渲染（lab 14 展开） |
| View | 管编排：接收请求、返回响应 | 视图函数 |
| urls.py | 路由表：把 URL 分发到 View | `config/urls.py` |
| admin | 注册 Model 即得的管理后台 | `blog/admin.py` 两行注册 |

可以把 Django 想象成连锁餐厅的后厨：门店（项目）开张不用自己设计流程——食材标准（Model）、菜单样式（Template）、出餐动线（View）在总部手册里都定了；但和连锁不同的是，手册允许整本替换：所有约定都落在 settings.py 等配置文件里，约定挡住的是"要不要纠结"，不是"能不能改"。

一句话心智模型：**models.py 是唯一的真相源——字段约束进迁移、迁移进表结构、表结构喂给 QuerySet（Django 的数据库查询对象）和 admin**。admin 则是全家桶哲学的集中体现——Model 声明完，一个管理后台已经存在。

## When to Use

这节讲 Django 值得用的场景、不该用的边界，以及与同类框架的分工。

典型场景：

- 在做内容型或管理密集型网站时——CMS（内容管理系统）、内部运营系统——admin 直接收走后台开发。
- 在做数据驱动的完整站点、要快速出原型时——ORM、迁移、认证、后台开箱即用，不用逐项选型。
- 在做多团队长期维护的项目时——统一约定让接手成本不依赖"原作者的个人风格"。

何时不用：

- 微型 API 服务、追求极简依赖：Flask/FastAPI 更轻，全家桶此时是负重。
- 重度定制的前端界面：Django 模板不是强项，前后端分离时配 DRF（Django REST framework——基于 Django 的 API 框架，lab 15）更顺。

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| Django | 全家桶 + 约定大于配置 | 内容型站点、后台密集项目 |
| Flask | 微框架，组件自选 | 小型服务、自定义程度高的应用 |
| FastAPI | 异步、类型驱动、自动文档 | API 服务（lab 11/12） |
| SQLAlchemy + Alembic 裸组合 | 只取 ORM 与迁移 | 不想引入整个框架时 |

## Quick Start

这节跑通演示脚本，看三节验收断言的实测结果。

前置条件：仓库自带 venv，依赖 Django 6.1.1。

```bash
cd web/13_django_mtv_admin
source ../.venv/bin/activate
python3 mtv_demo.py    # migrate + 灌种子 + 三节断言（收尾自动清理 db.sqlite3）
```

脚本一次跑完三节验收：

| 小节 | 验收点 |
|---|---|
| 1. 表结构对照 | migrate 后表结构与 models.py 逐字段对应 |
| 2. ORM 对账 | 聚合结果与手写 SQL 逐项相等 |
| 3. admin | 两行注册得到完整后台 |

真实输出节选：

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

## How It Works

这节把"约定"逐个拆开看，并解释输出里两节验收现象各自来自哪里。

### INSTALLED_APPS：装配清单

`INSTALLED_APPS`（settings.py 里的应用列表）是装配清单：一个 app——Django 的可复用功能包，模型、视图、模板打在一起——注册之后，它的 models/admin/migrations 才会被框架发现。本实验的 `blog` 就是这样接入工程的；忘了注册，见踩坑清单第一条。

### 迁移两段式：生成与执行分离

`makemigrations` 把模型变更**编译成 Python 脚本**（进版本库、可审查可手改），
`migrate` 才真正执行并把版本记入 `django_migrations` 表——
与 lab 06 的 Alembic 完全同构（脚本链 + 版本记账）。

分离的价值：迁移脚本是代码评审的一部分，
"删列会不会丢数据"在执行前就被看见。

### QuerySet：惰性的 SQL 生成器

`filter(author__name="鲁迅")` 的双下划线是跨关系语法糖；
`values().annotate(Count)` 会被编译成 JOIN + GROUP BY。
QuerySet 是惰性的——链式调用不触发查询，迭代、`list()`、`len()` 才真正执行。

你在输出里看到的 `ORM {'老舍': 1, '鲁迅': 2} == SQL {'老舍': 1, '鲁迅': 2}`，
就是同一条聚合的两种写法在对账：ORM 是 SQL 的生成器而不是黑盒。

### admin：Model 注册即后台

`@admin.register(Article)` 加 `list_display/list_filter/search_fields` 几行配置，
得到列表页、过滤器、搜索框、增删改查表单、权限校验、分页——
全部由 Model 元数据自动生成。

你在输出里看到的 changelist（admin 的模型列表页）含「呐喊·自序」「鲁迅」，
就是 `list_display` 生效的结果。

admin 还是 Model 定义质量的试金石：admin 里不好用的模型，API 里通常也别扭。

### 对账断言：直接验证 ORM 的价值主张

```python
orm_counts = dict(Article.objects.values("author__name").annotate(c=Count("id")))
raw_counts = dict(sqlite3.connect(DB).execute("SELECT a.name, COUNT(p.id) ... GROUP BY a.name"))
assert orm_counts == raw_counts
```

这段在做什么：同一份聚合，ORM 与手写 SQL 各算一遍，断言逐项相等——ORM 的价值主张是"生成正确的 SQL"，对账就是在直接验证这个主张。想知道 `annotate` 究竟生成了什么 SQL，`print(qs.query)` 一行就能看到；本实验用 sqlite3 手写版对照，效果相同且可断言。

## Pitfalls & Q&A

这节收四个工程里的坑，再答三个概念与选型问题；每条坑按现象、原因、解法展开。

踩坑清单：

- **忘了把 app 加进 INSTALLED_APPS**。现象：models 不被发现、makemigrations 报"No changes"、admin 看不到模型。原因：三连症状同一个根因——装配清单里没有它。解法：注册 app 后重新 makemigrations。
- **改了模型不 makemigrations 直接 migrate**。现象：migrate 说"OK 没事"（它只执行已生成的脚本）。原因：表结构悄悄落后于模型，无报错。解法：`manage.py makemigrations --check` 可进 CI 拦截。
- **`on_delete` 不写**。现象：定义外键时报错。原因：新版本 Django 必填。解法：`CASCADE`（删作者连着删文章）/`SET_NULL`（置空）/`PROTECT`（禁止删除有引用的行）的选择是业务决策，不是语法填空。
- **在 settings.py 硬编码 SECRET_KEY**。现象：密钥进版本库。原因：demo 用占位值的习惯带进了生产。解法：生产必须环境变量注入（lab 07 同款教训）。

深入问答：

**Q1: Django 的 MTV 与 MVC 的对应关系？**
Model 对应 M，Template 对应 V（展示），View 对应 C（编排）——Django 的"View"其实是 MVC 的 Controller 职责，路由由 urls.py 承担。改名是为了强调"模板才是用户看到的视图"。

**Q2: select_related 和 prefetch_related 的区别？（N+1 的 Django 方言）**
select_related 用 SQL JOIN 一次取回外键关联（多对一）；
prefetch_related 分两条查询再在内存拼接（多对一/多对多）。

都是治 N+1——列表页先发 1 条主查询、再对每行各发 1 条关联查询的反模式——
对应 SQLAlchemy 的 joinedload/selectinload（lab 06）。

**Q3: Django admin 适合什么场景？边界在哪？**
适合内部运营后台、内容管理、数据初始化——Model 驱动、零前端成本。不适合面向 C 端的复杂交互；定制超过三成页面时，改用 DRF + 前端（lab 15）比硬掰 admin 划算。
