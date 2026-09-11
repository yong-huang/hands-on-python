# ⛓️ 17 · 三框架同题对比：Flask / FastAPI / Django+DRF

> 集成点：把前四个阶段学的三个框架拉到同一道题前——**同一个 TODO API（CRUD + 受保护
> 路由）各写一遍**，共享同一套 HMAC token 认证、跑同一组 14 条 HTTP 断言、上同一个
> 压测（1000 请求 × 并发 50），最后给出 wc -l 实测的代码量与 QPS/p95 对比表。
> 选型从此有数据：不看布道文，看控制变量下的实测。

## 1. 为什么需要它

"三个框架怎么选"的答案大多是情绪。本实验把变量锁死：**同一道题**（同一组端点与语义）、
**同一套认证**（tokenbox.py 共享，HMAC 逻辑零差异）、**同一把尺子**（14 条断言 + 同规格
压测）。实测结论有三条：14 条断言三框架全绿——**同题同解，没有框架做不到**；代码量
62/83/119 行——微框架最短、全家桶最长，长出来的部分是"免费送的基础设施"；QPS
131/131/121——**本地 dev server 的量级同档**，压测绝对值不该进选型论证。

## 2. 总览：核心机制一图看懂

![三框架同题对比：控制变量下的选型数据](images/framework_showdown.svg)

一句话心智模型：**同一道题 → 三种方言的实现 → 同一组断言 → 同一规格压测 → 一张对比
表**。看图主路径是五站流水线；绕行路径上的两个控制变量（共享认证、dev server 数字
判读原则）正是"对比可信"的前提。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/17_framework_showdown/images/framework_showdown.html)
> （或本地打开 [`images/framework_showdown.html`](images/framework_showdown.html)）。

## 3. 快速开始

```bash
cd web/17_framework_showdown
source ../.venv/bin/activate
python3 showdown.py    # 起三个服务器跑断言 + 压测，输出对比表（约 30s）
```

真实输出节选（macOS, CPython 3.14 · Flask 3.1.3 / FastAPI 0.141.1 / Django 6.1.1 + DRF 3.18.1）：

```
========================================================
[Flask：同一组断言 + 压测]
========================================================
  14 条断言全绿（注册/受保护路由/CRUD/404/重复删除）
  压测: 131 req/s · p95 5767.1ms

========================================================
[对比总表]
========================================================
  框架              代码行数       QPS   p95(ms)
  Flask             62       131    5767.1
  FastAPI           83       131    5773.6
  Django+DRF       119       121    6211.5

  判读：QPS 绝对值不重要（本地 dev server），量级同档即说明——
  选型该看生态与团队：微服务/异步密集选 FastAPI，小而美选 Flask，内容密集选 Django
```

诚实预期：

- **QPS ~130 是 werkzeug/uvicorn dev server 的数字**：生产用 gunicorn 多 worker 后是另一个量级；本实验只比较三者的相对方向
- **Flask 与 FastAPI 的 14 条断言状态码完全一致**；唯一的"方言差"是 Django 路由带尾斜杠（适配在 paths 表里）
- **DRF 版没有用 ModelSerializer**：standalone 单文件用 ViewSet + 手写校验，行数因此略占优意义有限——完整 DRF 形态见项目 15

## 4. 核心概念

### 4.1 同题同解：14 条断言的契约

断言序列覆盖注册（401/200）、受保护路由（401/200）、CRUD（201/200/404/204）与重复删除（404）——**状态码序列就是 API 契约**。三个框架跑出完全一致的状态码序列，证明"框架决定的是写法，不是能力"。

### 4.2 三种方言的同一道题

| 维度 | Flask | FastAPI | Django+DRF |
|:---|:---|:---|:---|
| 路由 | 装饰器 + `<int:id>` | 装饰器 + 类型注解 | urls.py + Router |
| 校验 | 手写 if → 400 | Pydantic 模型 → 422/400 | Serializer/手写 → 400 |
| JSON | jsonify | 返回 dict 自动序列化 | Response/JsonResponse |
| 存储 | 进程内 dict | 进程内 dict + asyncio.Lock | sqlite + ORM（standalone） |

### 4.3 控制变量：对比可信的前提

认证逻辑若各写各的，断言差异就分不清是"框架差异"还是"实现差异"——所以 tokenbox.py
共享。压测同理：三个 app 同机同端口规格同跑，且明确"dev server 数字看方向不看绝对值"。

### 4.4 选型判读框架

数据之外的三条经验法则：**异步密集/微服务**（多服务互调、高并发 IO）→ FastAPI；
**小而美/快速原型/已有同步栈** → Flask；**内容密集、需要 admin/ORM/auth 全家桶** →
Django。团队熟悉度权重 ≥ 框架性能差异（本实验证明性能同档）。

## 5. 关键代码解析

**为什么 Django 用文件库而不是 `:memory:`？**

```python
DATABASES={"default": {..., "NAME": DB_PATH}}   # 第一版是 ":memory:"，踩坑
```

werkzeug 多线程服务下每个请求各开一条连接——SQLite 的 `:memory:` 是**每连接独立**
的数据库，主线程 `ensure_db()` 建的表在其他线程"消失"（500: no such table）。
换成文件库即解。这类"连接私有状态"的坑在连接池语境下同样存在。

坑清单：

- **压测客户端用了相对 URL**：`client.get("/todos")` 在带 `base_url` 的 AsyncClient 下报
  `UnsupportedProtocol`——压测函数要拿完整 URL
- **空标题校验三个框架写法不一**：FastAPI 的 `title: str` 不拦空串（拦的是缺失/类型），
  handler 里补 `strip()` 后 400——统一契约要自己保证，类型注解只管类型
- **Django 401/400 日志刷屏**：`django.request` 对预期失败每次告警；用声明式
  `LOGGING`（settings.configure 里）静音——命令式 `setLevel` 会被 `get_wsgi_application()`
  内部的二次 `django.setup()` 重放默认配置覆盖（实测踩中）
- **standalone Django 的模型 app_label**：单文件没有 app 包，挂靠已有 app（`app_label="auth"`）
  是教学取巧；真实项目老老实实建 app + migrations

## 6. 文件结构

```
17_framework_showdown/
├── README.md               # 本教程文档
├── showdown.py             # 主演示脚本：断言分发/压测/对比表
├── tokenbox.py             # 共享 HMAC token（三框架零差异的控制变量）
├── app_flask.py            # Flask 实现（62 行）
├── app_fastapi.py          # FastAPI 实现（83 行）
├── app_django.py           # Django+DRF standalone 实现（119 行）
└── images/                 # 图三件套（json/html/svg）
```

`showdown.py` 内容：`WSGIThreadServer`/`ASGIThreadServer` 双服务器托管 / `run_checks()`
14 条同一组断言 / `bench()` 1000×50 压测（QPS + p95）/ `line_count()` wc -l / 对比总表。
环境：`web/.venv`（flask + fastapi + uvicorn + django + djangorestframework + httpx）。

## 7. 面试要点

**Q1: 三个框架的适用场景？（要求给出理由而不是偏好）**
FastAPI：异步 IO 密集、微服务、需要自动文档与类型契约；Flask：小服务、原型、需要最小
依赖面；Django：内容驱动、需要 admin/ORM/auth/迁移全家桶的项目。同题实测证明三者能力
同档，差异在"自带多少基础设施"与"同步/异步模型"。

**Q2: 为什么三者压测 QPS 同档？瓶颈在哪？**
瓶颈在 dev server 与本地回环（werkzeug 每请求线程、日志 IO），不在框架路由开销——框架
本身的分派成本是微秒级。生产对比要用 gunicorn/uvicorn 多 worker + 真实依赖（DB/网络）。

**Q3: WSGI 与 ASGI 的服务模型差异？**
WSGI：一个可调用对象同步处理单请求，并发靠线程/进程池；ASGI：单线程事件循环 + 协程，
等待不占线程，原生支持 WebSocket/长连接。项目 10 的线程名与容量数据是两者差异的实证。

**Q4: 如何设计一个公平的框架对比实验？**
控制变量（同一需求、同一认证、同一数据层）、断言契约（状态码序列）、多轮压测看方向、
区分"框架差异"与"实现差异"（本实验的坑清单里三条都是实现差异）。

**Q5: 迁移成本角度，三者互迁的方向性结论？**
Flask→FastAPI：视图函数签名变注解，成本低收益高（自动文档/校验）；Flask/Django→Django：
引入 ORM 与迁移成本高；Django→Flask：丢掉 admin/auth 需自建——"往全家桶迁"比
"往微框架迁"贵。

## 8. 总结

1. **同题同解**：14 条断言三框架全绿——能力同档，差异在写法与自带设施
2. **代码量 62/83/119**：微框架最短，全家桶最长——多出来的行是"少写的配置"
3. **压测量级同档**：dev server 数字只看方向；选型看生态与团队
4. **控制变量是对比的生命**：共享认证、同一断言、同一压测规格，缺一不可信
5. 下一篇 [18 · 生产部署](../18_production_deploy/README.md)：gunicorn/uvicorn worker、
   Docker 与 12-factor——把 dev server 换成生产姿态
