# 15 · DRF 构建 REST API：Serializer、ViewSet 与 Router

> 前端分离时代，Django 模型需要以 JSON API 的形态出场。DRF 的三层抽象各管一段：
> **Serializer 管模型 ↔ JSON 翻译**（读写分离建模）、**ViewSet 一个类五个视图**、
> **Router 自动生成路由**。权限、分页、400 字段级错误全部实测——匿名写 403、
> 创建 201、删除 204、`?page=2` 拿剩下的 2 条。

## Background

这节讲 API 层的由来：在前后端分离成为常态之前，Django 的模型是怎么"出场"的，缺了什么。

没有它之前：Django 视图配合模板渲染整页 HTML，浏览器是唯一消费者。要让移动端或单页应用（SPA——页面逻辑在浏览器里跑、靠接口取数据的应用）拿到数据，就得另写一套裸 JSON 视图：逐字段手工拼 dict、每个视图里各写一遍权限判断。

手工接口的痛点在契约上：错误响应一个接口一个格式，前端没法统一处理；权限逻辑散落在各视图里，"匿名能不能写"要逐个检查；分页参数和返回形状每个接口自己定。

DRF（Django REST framework）的应对是把 API 层标准件化：
序列化、认证、权限、分页、路由全部做成声明式配置，
并复用 Django 的 ORM 与 auth。

REST API——用资源化 URL 加 HTTP 动词（GET/POST/PUT/DELETE）组织接口的风格——
从此在 Django 侧有了成体系的实现。

## What

这节定义 DRF 的三层核心抽象，并给出贯穿全文的请求处理心智模型。

| 组件 | 一句话职责 | 本实验对应 |
|---|---|---|
| Serializer（序列化器） | 模型 ↔ JSON 的双向翻译，兼字段校验 | `ArticleSerializer`：读嵌套、写主键 |
| ViewSet | 一个类组合出一组端点（endpoint——一个 URL 加方法组成的接口） | `ModelViewSet` 的增删改查全套 |
| Router | 自动为 ViewSet 生成 RESTful URL 树 | `DefaultRouter` |

可以把这套三层想象成海关：Router 是通道指示（哪个请求去哪个柜台），权限是边检（先看证件，不合格 403），Serializer 是物品申报与查验（申报不合规格 400，且指到具体物品），ViewSet 是柜台业务本身。但和海关不同的是，查验流程由框架固定——DRF 的请求管线顺序是约定好的，不是每关自定义的。

一句话心智模型：**请求先过权限闸（403 再说），再过序列化校验闸（400 指向字段），然后才是 ViewSet 的业务与 Router 的自动路由**。

## When to Use

这节讲 DRF 值得用的场景、不该用的边界，以及同类方案怎么选。

典型场景：

- 在做前后端分离或移动端后端时——浏览器之外的客户端需要以 JSON 消费同一套模型。
- 在给第三方或多个前端开放接口时——权限、分页、错误契约需要标准化，而不是每个接口各定一套。
- 在已有 Django 项目上补 API 层时——ORM、auth、admin 都能直接复用。

何时不用：

- 服务端渲染的传统网站：模板直接出页面，API 层是多余的一跳。
- 极小的内部工具：裸 Django 视图 + `JsonResponse` 两三个接口就够，不值得引入整套抽象。

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| DRF | 声明式、组件全、生态成熟 | Django 项目上建正式 API |
| 裸 Django JSON 视图 | 零抽象，全手工 | 一两个内部小接口 |
| FastAPI | 独立异步框架、类型驱动 | 不依赖 Django 生态的 API 服务（lab 11/12） |

## Quick Start

这节跑通演示脚本，看权限、写链路与校验三节验收的实测结果。

前置条件：仓库自带 venv，依赖 Django 6.1.1 + DRF 3.18.1。

```bash
cd web/15_drf_rest_api
source ../.venv/bin/activate
python3 rest_demo.py    # migrate + 灌 7 篇 + 三节断言（收尾清理）
```

脚本三节验收对应三类契约：

| 小节 | 验收点 |
|---|---|
| 1. 读与权限 | 匿名读 200 且分页生效；匿名写 403 |
| 2. 登录写 | 创建 201 → 改 200 → 删 204 |
| 3. 校验与自定义路由 | 400 以字段名为键；`recent` 动作路由可达 |

真实输出节选：

```
========================================================
[1. 匿名读 200 分页生效；匿名写 403 被权限拦下（验收点）]
========================================================
  GET /api/articles/ → 200 · count=7 · 第一页 5 条 · author 嵌套: {'id': 1, 'name': '鲁迅'}
  ?page=2 → 200 · 第二页 2 条（PageNumberPagination）
  匿名 POST → 403（IsAuthenticatedOrReadOnly：写操作必须登录）

========================================================
[2. 登录写：创建 201 → 改 200 → 删 204（验收点）]
========================================================
  POST → 201 · 嵌套 author={'id': 1, 'name': '鲁迅'}（写传 author_id、读出完整对象）
  DELETE → 204 · 回到 7 篇

========================================================
[3. 校验 400 指向字段；recent 自定义动作路由（验收点）]
========================================================
  缺 title → 400 · {'title': ['This field is required.'], ...}
  GET /api/articles/recent/ → 200 · 最近 3 篇（@action 自动注册路由）
```

诚实预期：

- **匿名写返回 403 而非 401**：`IsAuthenticatedOrReadOnly` 下匿名请求未提供凭证，DRF 判 403 Forbidden；配 Token 认证并带错误凭证时才是 401——两者语义有别（"没带"vs"带错了"）
- **stderr 静音了 django.request 的 403/400 警告日志**：这些状态码是本实验的预期断言，不是异常
- **认证用 SessionAuthentication**：教学最短路径；生产 API 通常换 JWT（lab 12 的方案在 Django 侧是 simplejwt）

## How It Works

这节按请求管线顺序拆机制，并与输出里的三节验收现象互相印证。

### 请求管线：三种拒绝各归其位

DRF 每个请求依次经过：认证（是谁）→ 权限（能不能）→ 节流（频不频繁）→
序列化校验（数据合不合法）→ 视图逻辑 → 渲染。
三种拒绝各有出处——401 来自认证层、403 来自权限层、400 来自校验层。

输出里匿名 POST 直接 403：它在权限闸就被拦下，根本没走到校验；
缺 `title` 的已登录请求才轮到 400 出场，且以字段名为键。

### Serializer：读嵌套、写主键的分离建模

`ArticleSerializer` 里 `author = AuthorSerializer(read_only=True)` 让读出的 JSON 带作者完整对象；

`author_id = PrimaryKeyRelatedField(write_only=True)` 让写入只收主键——
**一份契约、两种视图**，与 lab 08 的 ItemIn/ItemOut 异曲同工。

输出第 2 节"写传 author_id、读出完整对象"就是这两个声明的实测。

`ModelSerializer` 从模型字段自动派生校验（必填、长度），
`is_valid()` 失败时 `errors` 以字段名为键——
你在输出里看到的 `{'title': ['This field is required.'], ...}` 直接可被前端按字段渲染。

### ViewSet 与 Router：一个类打包 CRUD，路由自动生成

`ModelViewSet` 组合出 list/retrieve/create/update/partial_update/destroy 六个端点；
`queryset` 与 `serializer_class` 两个声明定死数据与形状。

输出里的 POST → 201、DELETE → 204，分别是 create 与 destroy 端点；
`@action(detail=False)` 往上挂自定义业务端点（recent），
Router 自动为它注册 URL——扩展点与生成机制是同一套。

`DefaultRouter` 生成 RESTful URL 树，
还附送可浏览 API 页（`/api/articles/` 的 HTML 视图）。

### 权限、分页：全局配置的两道声明

权限是"每个请求的第一道闸"：`IsAuthenticatedOrReadOnly` 让 SAFE_METHODS（GET/HEAD/OPTIONS）
放行匿名、写操作要求登录。

分页是全局配置 + 局部覆盖：`PAGE_SIZE=5` 让所有 list 自动带 `count/next/previous/results` 信封
（包裹数据列表的统一外层结构）——`?page=2 → 200 · 第二页 2 条` 就是这套信封在翻页。

### 路由断言为什么查 pattern 而不是 url

```python
route_strs = [str(getattr(p, "pattern", "")) for p in router.urls]
assert any("recent" in s for s in route_strs)
```

这段在做什么：遍历 Router 注册的路由对象，断言 recent 端点确实注册成功。
第一版写的 `p.url` 是老 Django 的 URLPattern 属性，
现代 Django 用 `p.pattern`（`getattr` 兜底更稳）——实测 `AttributeError` 后改的。

断言路由注册要顺着当前版本的 API 走；这类"版本方言"正是踩坑清单存在的理由。

## Pitfalls & Q&A

这节收四个实测踩过的坑，再留四个有增量的问答；每条坑按现象、原因、解法展开。

踩坑清单：

- **SessionAuthentication + POST 被 CSRF 拦**。现象：已登录但写请求 403。原因：DRF 的 Session 认证对已登录请求强制 CSRF（跨站请求伪造——利用浏览器自动携带 cookie 的攻击，故登录态请求要带 token）。解法：测试用 APIClient（默认不检查）；生产前端要么带 CSRF token 要么换 JWT。
- **嵌套序列化器默认只读**。现象：嵌套字段写入不生效。原因：嵌套写需要自定义 `create()`。解法：先用"读嵌套 + 写主键"的分离建模，成本最低。
- **匿名写期待 401 却拿到 403**。现象：断言 401 失败。原因：DRF 规则——未提供凭证是 403，提供了但无效/过期才是 401。解法：断言前先想清场景是"没带"还是"带错了"。
- **ViewSet 忘了 queryset 或 get_queryset**。现象：`AssertionError` 模糊报错。原因：ViewSet 靠这两个声明取数据，缺失时无从下手。解法：固定数据用 `queryset`；需要动态过滤（按当前用户）时显式实现 `get_queryset()`。

深入问答：

**Q1: DRF 的请求处理管线经过哪几层？**
完整管线与 401/403/400 的归属已拆进 How It Works 的"请求管线"小节，不在此重复。

**Q2: Serializer 的 validated_data 与 instance 的关系？**
反序列化产出 `validated_data`（校验过的 dict）；
`save()` 时若有 instance 则 update、没有则 create。

序列化方向则把 instance 按字段声明转成原生类型——
双向翻译、单向锁定的读写分离靠 `read_only`/`write_only` 表达。

**Q3: ViewSet 相比一组函数视图的价值与代价？**
价值：Router 自动路由、同资源行为集中、`get_queryset` 按请求动态过滤天然支持；代价：抽象层数多，"哪个 Mixin 提供了哪个行为"需要查阅。行为高度标准的资源用 ViewSet，特殊端点用 @action 或 APIView。

**Q4: DRF 的分页有哪些策略？**
PageNumberPagination（页码）、LimitOffsetPagination（窗口）、CursorPagination（游标，适合无限滚动与高频写入）。分页改变响应信封（count/next/previous/results），前端契约要同步。

**Q5: 想加"只能改自己的文章"这类规则，权限怎么写？**
自定义权限实现 `has_permission`（视图级）与 `has_object_permission`（对象级）——
两层的调用时机不同，对象级只在拿到对象后调用，
"只能改自己的"正属于这一层。

`IsAuthenticatedOrReadOnly` 则是"SAFE_METHODS 放行 + 其余要求认证"的现成组合
（机制见 How It Works）。
