# 15 · DRF 构建 REST API：Serializer、ViewSet 与 Router

> 前端分离时代，Django 模型需要以 JSON API 的形态出场。DRF 的三层抽象各管一段：
> **Serializer 管模型 ↔ JSON 翻译**（读写分离建模）、**ViewSet 一个类五个视图**、
> **Router 自动生成路由**。权限、分页、400 字段级错误全部实测——匿名写 403、
> 创建 201、删除 204、`?page=2` 拿剩下的 2 条。

## What

把 Django 模型直接变成 JSON API 有三层必须答对的问题：**序列化边界**——读的时候要嵌套作者完整信息，写的时候只收 `author_id`，一个序列化器怎么表达两种形状（读写分离字段）；**权限分层**——匿名可读、登录可写，403/401/400 三种拒绝各是谁发的（权限层/认证层/校验层）；**契约错误**——缺字段的 400 响应以字段名为键，前端直接按字段渲染错误。一句话心智模型：**请求先过权限闸（403 再说），再过序列化校验闸（400 指向字段），然后才是 ViewSet 的业务与 Router 的自动路由**。

## Why

DRF 把三件事做成声明，本实验全部断言验证。

## How

```bash
cd web/15_drf_rest_api
source ../.venv/bin/activate
python3 rest_demo.py    # migrate + 灌 7 篇 + 三节断言（收尾清理）
```

真实输出节选（Django 6.1.1 + DRF 3.18.1）：

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

### Serializer：读嵌套、写主键的分离建模

`ArticleSerializer` 里 `author = AuthorSerializer(read_only=True)` 让读出的 JSON 带作者完整对象；`author_id = PrimaryKeyRelatedField(write_only=True)` 让写入只收主键——**一份契约、两种视图**，与 lab 08 的 ItemIn/ItemOut 异曲同工。`ModelSerializer` 从模型字段自动派生校验（必填、长度），`is_valid()` 失败时 `errors` 以字段名为键——400 响应的形状直接可用。

### ViewSet：五个视图一个类

`ModelViewSet` 组合出 list/retrieve/create/update/partial_update/destroy 六个端点；`queryset` 与 `serializer_class` 两个声明定死数据与形状。`@action(detail=False)` 往上挂自定义业务端点（recent），Router 自动为它注册 URL——扩展点与生成机制是同一套。

### 权限、分页与 Router

权限是"每个请求的第一道闸"：`IsAuthenticatedOrReadOnly` 让 SAFE_METHODS（GET/HEAD/OPTIONS）放行匿名、写操作要求登录。分页是全局配置 + 局部覆盖：`PAGE_SIZE=5` 让所有 list 自动带 `count/next/previous/results` 信封。`DefaultRouter` 注册 ViewSet 生成 RESTful URL 树，还附送可浏览 API 页（/api/articles/ 的 HTML 视图）。

## Deep Dive

**为什么路由断言查 `pattern` 而不是 `url`？**

```python
route_strs = [str(getattr(p, "pattern", "")) for p in router.urls]
assert any("recent" in s for s in route_strs)
```

第一版写的 `p.url` 是老 Django 的 URLPattern 属性，现代 Django 用 `p.pattern`（`getattr` 兜底更稳）——实测 `AttributeError` 后改的。断言路由注册要顺着当前版本的 API 走；这类"版本方言"正是踩坑清单存在的理由。

踩坑清单：

- **SessionAuthentication + POST 被 CSRF 拦**：DRF 的 Session 认证对已登录请求强制 CSRF；测试用 APIClient（默认不检查），生产前端要么带 CSRF token 要么换 JWT
- **嵌套序列化器默认只读**：想嵌套写入要自定义 `create()`；先用"读嵌套 + 写主键"的分离建模，成本最低
- **匿名写期待 401 却拿到 403**：DRF 规则——未提供凭证是 403，提供了但无效/过期才是 401；断言前先想清场景
- **ViewSet 忘了 queryset 或 get_queryset**：`AssertionError` 模糊报错；`get_queryset()` 动态过滤（按当前用户）时必须显式实现

## Q&A

**Q1: DRF 的请求处理管线经过哪几层？**
认证（是谁）→ 权限（能不能）→ 节流（频不频繁）→ 序列化校验（数据合不合法）→ 视图逻辑 → 渲染。401 来自认证、403 来自权限、400 来自校验——三种拒绝各归其位。

**Q2: Serializer 的 validated_data 与 instance 的关系？**
反序列化产出 `validated_data`（校验过的 dict）；`save()` 时若有 instance 则 update、没有则 create。序列化方向则把 instance 按字段声明转成原生类型——双向翻译、单向锁定的读写分离靠 `read_only`/`write_only` 表达。

**Q3: ViewSet 相比一组函数视图的价值与代价？**
价值：Router 自动路由、同资源行为集中、`get_queryset` 按请求动态过滤天然支持；代价：抽象层数多，"哪个 Mixin 提供了哪个行为"需要查阅。行为高度标准的资源用 ViewSet，特殊端点用 @action 或 APIView。

**Q4: DRF 的分页有哪些策略？**
PageNumberPagination（页码）、LimitOffsetPagination（窗口）、CursorPagination（游标，适合无限滚动与高频写入）。分页改变响应信封（count/next/previous/results），前端契约要同步。

**Q5: IsAuthenticatedOrReadOnly 与自定义 permission 的写法？**
前者是"SAFE_METHODS 放行 + 其余要求认证"；自定义权限实现 `has_permission`（视图级）与 `has_object_permission`（对象级，如"只能改自己的文章"）——两层的调用时机不同，对象级只在拿到对象后调用。
