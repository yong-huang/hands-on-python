# 16 · 信号、缓存与测试：Django 段收官的三根支柱

> 功能写完只是半成品——本实验补上工程化的三根支柱：**信号**把审计日志从业务代码里
> 解耦出去（post_save 一行 receiver）、**缓存**用 `CaptureQueriesContext` 把"省了一次
> 查询"变成可断言的数字（第二次调用 0 条 SQL）、**pytest-django + coverage** 用 4 条
> 用例和 97% 覆盖率守住全部回归。三件事都有断言，没有一件靠"应该没问题"。

## What

工程化能力的考察点从"会 API"升级到"会治理"：**副作用解耦**——保存文章要写审计日志，写进视图就是散弹式修改，信号让它一行 receiver 搞定（但要清楚"看不见的调用"的代价）；**缓存有效性**——`get_or_set` 之外，你怎么证明缓存真的省了查询？查询计数器给出 1→0 的硬数字；**回归防线**——覆盖率不是虚荣指标，是"这段代码有没有被任何断言盯着"的最低保障。一句话心智模型：**保存触发信号、信号落审计；缓存把重复查询压成 0 条 SQL；pytest 把以上全部行为钉进回归**。

## Why

三根支柱立起来，前面 15 站的行为才守得住。

## How

```bash
cd web/16_django_signals_cache
source ../.venv/bin/activate
python3 signals_cache_demo.py    # 3 节断言 + subprocess 跑 pytest --cov（收尾清理）
```

真实输出节选（Django 6.1.1）：

```
========================================================
[2. 缓存：get_or_set 首次查库，第二次 0 条 SQL（验收点）]
========================================================
  首次 get_or_set → 1 条 SQL，拿到 1 个标题
  第二次 get      → 0 条 SQL（LocMemCache 命中）
  CaptureQueriesContext 让'缓存省了一次查询'从感觉变成可断言的数字

========================================================
[4. pytest --cov：4 条用例全绿 + 覆盖率 ≥80%（验收点）]
========================================================
  pytest: 4 passed（信号两则 + 缓存命中 + cached_property）
  coverage: blog app 覆盖率 97% ≥ 80% ✓
```

诚实预期：

- **LocMemCache 是进程内缓存**：单进程教学够用；多 worker 部署各缓存各的，生产换 Redis/Memcached 后端（settings 换一行）
- **覆盖率 97% 的含金量说明**：blog app 代码量小（models/handlers/apps），行覆盖高不等于分支全覆盖——指标守底线，不追虚荣
- **信号让调用链"隐身"**：排查"AuditLog 谁写的"需要 grep receiver——本实验 docs 与测试都显式记录了这条链路

### 信号：解耦副作用的代价与收益

`post_save` 在模型 `save()` 后发出，`@receiver(post_save, sender=Article)` 的处理函数自动落审计。信号必须连接在 `AppConfig.ready()` 里——保证只连一次且 import 即生效。收益是业务零侵入、多订阅者互不影响；代价是调用链隐身、顺序不可控——所以信号只放"旁路副作用"（审计/缓存失效/通知），绝不放主流程逻辑。

### 缓存框架与查询计数

`cache.get_or_set(key, fn, timeout)` 把"取不到就算、算完就存"压成一行。有效性的证据来自 `CaptureQueriesContext`：首次调用 SQL ≥1、第二次 0——数字断言。生产换 Redis 只是换 settings 的 BACKEND，代码不动，这正是缓存框架抽象的价值。

### cached_property：实例级缓存的边界

`@cached_property` 首次访问计算并写进实例 `__dict__`，之后直接命中。本实验断言"改了 content，word_count 不变"——这正是它的语义：**缓存绑定实例当时的状态**。输入会变的派生值不能用（要用带失效的 cache 框架）。

### pytest-django 与覆盖率

`pytest.ini` 声明 `DJANGO_SETTINGS_MODULE`，`@pytest.mark.django_db` 给用例开数据库（每个测试独立事务回滚）；`CaptureQueriesContext` 在测试里数 SQL。`--cov=blog` 的覆盖率回答"有没有断言盯着这段代码"——本实验设 80% 为底线，实测 97%。

## Deep Dive

**为什么信号要连在 AppConfig.ready() 而不是 models.py 底部？**

```python
class BlogConfig(AppConfig):
    name = "blog"
    def ready(self):
        from . import handlers  # noqa: F401
```

models.py 在应用注册早期被加载，此时连信号可能在测试（import 两次）或迁移（不加载完整 app）场景下重复连接或丢失连接。`ready()` 是 Django 官方指定的"应用就绪"钩子——文档里那句"signals 放这"不是风格建议，是正确性要求。

踩坑清单：

- **信号 receiver 连接两次**：`post_save` 连两遍审计就翻倍；`ready()` + `dispatch_uid` 双保险
- **在信号里做重活**：每次 save 都触发（含全表更新的循环 save），信号里的慢查询会放大成事故；审计类轻写入可以，重计算进任务队列；循环触发（save 里又 save）也要防
- **缓存永不失效**：`timeout=60` 缺省要显式给；"缓存与 DB 不一致"的窗口期要按业务容忍度设计，不是越久越好
- **覆盖率当 KPI 追 100%**：为凑数给 getter 写断言是噪音；覆盖率守底线（防"零断言代码"），分支质量看断言内容

## Q&A

**Q1: post_save 的 created 参数怎么用？**
`created=True` 表示本次是新建（INSERT），False 是更新（UPDATE）——审计日志区分动作、缓存失效策略差异（新建预热、更新失效）都靠它。

**Q2: Django 缓存层有哪些后端与粒度？**
后端：LocMem（开发）、Redis/Memcached（生产）、Database（低频）。粒度：低级 API（cache.get/set，本实验）、视图装饰器（整页）、模板片段（{% cache %}）。选型按"失效粒度与共享需求"。

**Q3: pytest-django 的数据库隔离是怎么实现的？**
每个测试包在事务里，结束回滚——用例之间零残留；需要迁移外的表结构或事务内无法测的行为（如 `transaction.atomic` 嵌套）用 `pytest.mark.django_db(transaction=True)`。
