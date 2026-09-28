# 06 · SQLAlchemy ORM 实战：N+1 实测与 session 生命周期

> 内存 list 存数据到头了。本实验换上 SQLAlchemy 2.0 + SQLite：声明式模型建表、
> 跨关系与聚合查询都不难；难的是三个看不见的坑——**循环里点关系属性，21 条 SQL 悄悄
> 出门**（N+1）、**commit 之后读个属性又发一条 SELECT**（expire_on_commit）、**会话
> 关了对象还在，一摸属性就 DetachedInstanceError**。全部用 SQL 计数器做成数字级断言，
> 附一套手写的最小 Alembic 迁移目录：加列不丢数据。

## Background

这节回答两个问题：ORM 出现之前工程师怎么操作数据库，以及 ORM 普及之后撞上的新墙。

没有 ORM 的年代，工程师用 DB-API（各数据库驱动共用的底层接口，如 `sqlite3`、`psycopg2`）手写 SQL 字符串，取回的是一行行元组，再逐字段搬进自己定义的类：

```python
# 没有 ORM 的做法：手写 SQL，取回元组，手工搬进对象
cur.execute("SELECT id, name FROM users WHERE id = ?", (uid,))
row = cur.fetchone()
user = User(id=row[0], name=row[1])   # 每张表都要把这套样板重复一遍
```

痛点在于：每张表都要重复"写 SELECT、取元组、手工赋值"的胶水代码；过滤条件用字符串拼接时容易引入 SQL 注入；换数据库方言（SQLite 换 PostgreSQL）往往要改写一批 SQL。表一多，胶水代码本身就成为 bug 集中地。

于是 ORM（Object-Relational Mapping，对象关系映射）应运而生：把表映射成类、行映射成对象，由库自动生成并执行 SQL。但新的墙随之出现——SQL 的发出时机从"你写下的每个字符串"变成"库的内部策略"，肉眼看不见了。

列表页每读一行就多查一次关联表；commit 之后读个属性会冒出一条补查；会话关了对象还在，一摸属性就抛异常。表结构（schema）变更也不再是一条 ALTER 语句的事，而要跟着代码版本走——这些正是本实验要量化的几堵墙。

## What

这节给出 ORM 与 SQLAlchemy 的定义、一个心智模型，以及全文要覆盖的机制总览。

SQLAlchemy 是 Python 生态使用最广的 ORM 框架——一种"把数据库表映射为 Python 类、把行映射为对象，让你用对象属性和表达式表达查询，由它负责生成并执行 SQL"的工具库。

可以把 ORM 想象成一位替你跑腿的档案管理员：你只说"把这个用户和他的帖子都拿来"，他负责翻译成 SQL、执行、把结果装进对象。但和真人管理员不同的是，他默认"不催不动"——你没访问的关联数据，他绝不预先去取。

先记两个核心词：session（会话——程序与数据库之间的一次工作上下文，负责管理你手里的对象）和懒加载（首次访问关系属性才去查库的策略）。

贯穿全文的一句话心智模型：**访问关系属性 = 可能触发一次查询，在循环里访问 = N+1（1 条主查询 + 循环里 N 条逐行补查）；预加载（提前批量取回关联数据的策略）把 N 次合并成 1 次 IN 批查**。

| 机制 | 默认行为 | 踩坑现场 |
|---|---|---|
| 关系加载 | 懒加载：查询 User 不带 Post | 循环里访问关系属性 → N+1 |
| expire_on_commit | commit 后所有实例过期 | 下次读属性隐式补发一条 SELECT |
| 对象与 session 绑定 | 对象依附于加载它的 session | 会话关闭后访问过期属性 → DetachedInstanceError |
| schema 演进 | 模型类与表结构需要同步 | 直接加列可能丢存量数据，需要迁移工具 |

## When to Use

这节补判断力：什么项目值得上 ORM，什么情况下手写 SQL 更合适。

典型场景：

- 在做以增删改查为主、表之间有外键关系的 Web 数据层时——模型类加关系声明比散落的 SQL 字符串可维护，"取用户连同帖子"是一行属性访问
- 在做表结构会随版本演进的项目时——配套的 Alembic（SQLAlchemy 官方的迁移工具，给表结构变更建立版本链）能让加列不丢存量数据
- 在做开发用 SQLite、生产换 PostgreSQL 的跨库项目时——同一套模型代码，方言差异由 ORM 屏蔽

何时不用：

- 一次性的小脚本：数据量小、查询就一两条，直接用 `sqlite3` 更省事
- 复杂分析查询（多表聚合、报表）：手写 SQL 表达力更直接，硬套对象模型反而绕
- 需要逐条控制 SQL 形态的性能热点：ORM 生成的 SQL 不完全受你控制

同类方案对比：

| 方案 | 与 SQLAlchemy ORM 的差异 | 什么时候选它 |
|---|---|---|
| DB-API 驱动（`sqlite3` / `psycopg2`） | 手写 SQL、返回元组，零映射 | 小脚本；要对每条 SQL 完全掌控 |
| SQLAlchemy Core | 同一框架的 SQL 表达式层：程序化拼 SQL，但不映射成对象 | 要生成 SQL 的灵活性，不想要对象图（ORM 把行包成对象、对象间互相引用成一张关系网） |
| Django ORM | 与 Django 框架深度绑定，自带 admin 与迁移 | 项目已经基于 Django |
| Peewee | 轻量的微型 ORM | 小型工具，依赖越少越好 |

## Quick Start

这节把演示跑起来：一条命令、一段真实输出、三条诚实预期，最后看模型是怎么声明的。

本实验把三件事全部断言化：N+1 是 21 条 vs 2 条的数字对比，隐式刷新是 +1 条的精确捕捉，迁移是"旧行完好 + 新列默认 0"的 PRAGMA 验证（PRAGMA 是 SQLite 内置的查看/配置命令，这里用 `PRAGMA table_info(posts)` 列出新列及其默认值来核对）。

```bash
cd web/06_sqlalchemy_orm
source ../.venv/bin/activate
python3 sqlalchemy_orm.py    # 完整演示（4 个小节，内置验收断言）
```

真实输出节选（SQLAlchemy 2.0.52 + Alembic 1.19.2）：

```
========================================================
[2. N+1 实测：同一份遍历，21 条 SQL vs 2 条 SQL]
========================================================
  懒加载遍历 20 位作者的帖子 → 21 条 SQL（1 取用户 + 20 逐个取帖子）
  selectinload 同一遍历   → 2 条 SQL（1 取用户 + 1 按 IN 批量取帖子）
  21 → 2：结果一致，开销差 10 倍——这就是'循环里查库'的代价

========================================================
[3. session 生命周期：commit 之后的隐式 SELECT 与 detached]
========================================================
  commit 后首次读 u.name → 隐式补发 1 条 SELECT（expire_on_commit 默认开）
  会话关闭后读过期属性 → DetachedInstanceError（对象还在，加载它的会话没了）
  对策：Web 里一请求一 session（Flask-SQLAlchemy 的 g/依赖注入都这么干），别让对象活过会话

========================================================
[4. Alembic 迁移：0001 建表 → 插旧数据 → head 加列（验收点）]
========================================================
  upgrade 0001 → users/posts 建表；插入老数据 id=1（此时无 views 列）
  upgrade head → posts 多出 views 列，旧行 title 完好、views 自动填默认 0
  alembic_version = 0002——数据库自己记得走到哪一版，团队机器各升各的
  （迁移目录：alembic.ini + alembic/env.py + alembic/versions/0001、0002，全部手写可读）

  已清理 migration_lab.db（下次运行会重新迁移一遍）

========================================================
全部断言通过 ✓ 关系聚合查询、N+1 21→2、expire/detached 行为、Alembic 加列不丢数据
```

诚实预期：

- **SQL 计数用 `before_cursor_execute` 事件而不是 echo 日志**：echo 打印受日志级别影响且不便断言；事件计数精确到每条真实执行的语句（BEGIN/COMMIT 这类连接级操作不计入本实验的数字）
- **`migration_lab.db` 每次运行前清理重建、跑完删除**：迁移演示要"从 0001 走一遍"才完整；想保留现场，注释掉 main 末尾的清理循环即可
- **内存库与文件库并存**：§1-3 用 `sqlite:///:memory:`（干净可重复），§4 迁移必须用文件库——Alembic 要跨进程访问它

模型用 SQLAlchemy 2.0 的声明式风格声明：

```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    posts: Mapped[list["Post"]] = relationship(back_populates="author")  # 懒加载是默认策略
```

这段在做什么：`Mapped[int]` 注解声明列类型，`mapped_column()` 把类属性绑定成表列，`relationship(back_populates=...)` 建立与 `Post` 的双向关系——类对应表，实例对应行。

## How It Works

这节拆开四个机制：N+1 的病根与药方、SQL 计数器的挂载点、session 的过期与分离、Alembic 的版本链，并与 Quick Start 的输出互相印证。

### N+1：病根与两种药方

病根就是上一节代码注释里的"懒加载是默认策略"：查询 User 时不带 Post，首次访问 `user.posts` 才发 SQL。这个默认对单对象很合理（按需加载），对列表页就是 N+1 温床。

你在输出 [2] 里看到的 21 条 SQL，正是 20 位作者逐个触发懒加载的结果；换成 `selectinload` 后的 2 条，来自那条 `WHERE user_id IN (…)` 批量取回。

药方一 **selectinload**：额外发一条 `WHERE user_id IN (…)` 批量取回，2 条 SQL——适合一对多；药方二 **joinedload**：LEFT OUTER JOIN 一条 SQL 拿全，但行数 = 主行 × 子行（去重靠 ORM），适合多对一。

本实验断言的是 selectinload 路径：21 → 2，结果逐项一致。

取舍规则：一对多用 selectinload（2 条简单 SQL，无行膨胀）；多对一/单个关联用 joinedload（1 条 SQL）；深层关系可组合——行数膨胀是 joinedload 对多的一侧的固有代价，ORM 靠去重补救但内存与带宽照付。

### SQL 计数器为什么挂在 engine 事件上

```python
class SQLCounter:
    def __init__(self, engine):
        self.count = 0
        event.listen(engine, "before_cursor_execute", self._inc)
```

echo 是给人看的日志（受级别配置影响、混着 BEGIN/COMMIT 噪音）；事件是给程序用的钩子——每条真正下发的 SQL 精确 +1，`assert counter.count == 21` 才立得住。

Quick Start 输出里所有"21 条 vs 2 条"的数字都出自这套计数器。给慢查询定责时，它可以直接搬进项目当诊断工具。

### session 生命周期：过期与分离

`expire_on_commit=True`（默认）让 commit 后所有实例过期——下次读属性**隐式补发 SELECT** 刷新，输出 [3] 里那"+1 条"就是它。

会话关闭后，过期属性无人刷新 → `DetachedInstanceError`（对象引用还在，加载它的会话没了）。Web 实践：**一请求一 session**（请求开始创建、响应后关闭），对象不活过会话，两个坑一起消失。

### Alembic：schema 的版本控制

每个迁移是一个带 `revision`/`down_revision` 链的脚本，`alembic_version` 表记录当前版本——升级就是沿链执行 `upgrade()`。

本实验的 0002 给 posts 加 `views` 列：`server_default="0"` 让 ALTER TABLE 时旧行自动填 0，**加列不丢数据**。手写的最小目录（ini + env.py + 两版脚本）总共 60 行，比官方模板少了全部日志噪音，每行都可读。

## Pitfalls & Q&A

这节先列五个真实踩过的坑（现象、原因、解法），再补两个有增量的深入问题。

踩坑清单：

- **循环里点关系属性**：N+1 的最小病根，一行 `selectinload` 治好；代码审查时盯紧"列表 + 关系访问"的组合
- **以为 commit 之后对象还是"热"的**：它已过期，下一次读属性是隐式 SELECT——循环里逐个读"刚提交"的对象，就是隐形的 N+1
- **把 ORM 对象塞进缓存/跨请求复用**：会话一关就是 detached（脱离会话状态），读到过期属性直接抛异常；缓存序列化后的 dict，别缓存活对象
- **加列忘 `server_default`**：`nullable=False` 的新列在没有默认值时，旧行填充会失败（或全成 NULL）；`server_default="0"` 让迁移对存量数据无感
- **手写迁移顺序搞反 `down_revision`**：版本链断了 Alembic 无法确定执行顺序；每个新脚本的 `down_revision` 必须指向当前 head

**Q1: selectinload 和 joinedload 怎么选？**
见 How It Works 的「N+1：病根与两种药方」——取舍规则已完整写在那里。

**Q2: expire_on_commit 是什么？利与弊？**
commit 后所有实例过期，下次访问属性隐式刷新（保证读到的与库一致）。利：事务后数据新鲜；弊：隐藏 SELECT——循环里读"刚提交"的对象就是隐形 N+1。可 `expire_on_commit=False` 或明确 `refresh()`。

**Q3: DetachedInstanceError 什么时候发生？**
访问 detached（会话已关闭）实例上未加载/已过期的属性时。预防：对象不活过 session（一请求一 session）；需要离线使用，就在关闭前 `expunge`（把对象从会话摘除但保留可用），并确保属性已加载或序列化成普通数据。
