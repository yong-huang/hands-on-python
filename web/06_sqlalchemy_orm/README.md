# 06 · SQLAlchemy ORM 实战：N+1 实测与 session 生命周期

> 内存 list 存数据到头了。本实验换上 SQLAlchemy 2.0 + SQLite：声明式模型建表、
> 跨关系与聚合查询都不难；难的是三个看不见的坑——**循环里点关系属性，21 条 SQL 悄悄
> 出门**（N+1）、**commit 之后读个属性又发一条 SELECT**（expire_on_commit）、**会话
> 关了对象还在，一摸属性就 DetachedInstanceError**。全部用 SQL 计数器做成数字级断言，
> 附一套手写的最小 Alembic 迁移目录：加列不丢数据。

## What

ORM 的 API 半天学会，但生产事故常出在三处：**N+1 查询**——列表页每行再查一次关联表，接口耗时随行数线性爆炸，本地测不出来（数据少）、上线就慢；**session 生命周期**——对象什么时候过期、什么时候 detached，决定你写的代码会不会发出"看不见的 SQL"甚至直接抛异常；**schema 演进**——模型加了字段，线上库怎么办？一句话心智模型：**访问关系属性 = 可能触发一次查询，在循环里访问 = N+1；预加载把 N 次合并成 1 次 IN 批查**。

## Why

本实验把三件事全部断言化：N+1 是 21 条 vs 2 条的数字对比，隐式刷新是 +1 条的精确捕捉，迁移是"旧行完好 + 新列默认 0"的 PRAGMA 验证。

## How

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

========================================================
[4. Alembic 迁移：0001 建表 → 插旧数据 → head 加列（验收点）]
========================================================
  upgrade 0001 → users/posts 建表；插入老数据 id=1（此时无 views 列）
  upgrade head → posts 多出 views 列，旧行 title 完好、views 自动填默认 0
  alembic_version = 0002——数据库自己记得走到哪一版，团队机器各升各的

========================================================
全部断言通过 ✓ 关系聚合查询、N+1 21→2、expire/detached 行为、Alembic 加列不丢数据
```

诚实预期：

- **SQL 计数用 `before_cursor_execute` 事件而不是 echo 日志**：echo 打印受日志级别影响且不便断言；事件计数精确到每条真实执行的语句（BEGIN/COMMIT 这类连接级操作不计入本实验的数字）
- **`migration_lab.db` 每次运行前清理重建、跑完删除**：迁移演示要"从 0001 走一遍"才完整；想保留现场，注释掉 main 末尾的清理循环即可
- **内存库与文件库并存**：§1-3 用 `sqlite:///:memory:`（干净可重复），§4 迁移必须用文件库——Alembic 要跨进程访问它

### 声明式模型与关系：Lazy 是默认策略

SQLAlchemy 2.0 的声明式风格用 `Mapped[int]` + `mapped_column()` 注解建模，`relationship(back_populates=...)` 建立双向关系。关键默认值：**关系是懒加载**——查询 User 不带 Post，首次访问 `user.posts` 才发 SQL。这个默认对单对象很合理（按需加载），对列表页就是 N+1 温床。

### session 生命周期：过期与分离

`expire_on_commit=True`（默认）让 commit 后所有实例过期——下次读属性**隐式补发 SELECT** 刷新，本实验精确捕捉到这 +1 条。会话关闭后，过期属性无人刷新 → `DetachedInstanceError`（对象引用还在，加载它的会话没了）。Web 实践：**一请求一 session**（请求开始创建、响应后关闭），对象不活过会话，两个坑一起消失。

### Alembic：schema 的版本控制

每个迁移是一个带 `revision`/`down_revision` 链的脚本，`alembic_version` 表记录当前版本——升级就是沿链执行 `upgrade()`。本实验的 0002 给 posts 加 `views` 列：`server_default="0"` 让 ALTER TABLE 时旧行自动填 0，**加列不丢数据**。手写的最小目录（ini + env.py + 两版脚本）总共 60 行，比官方模板少了全部日志噪音，每行都可读。

## Deep Dive

**N+1 的病根与两种药方。** 病根：循环里逐个触发懒加载。药方一 **selectinload**：额外发一条 `WHERE user_id IN (…)` 批量取回，2 条 SQL——适合一对多；药方二 **joinedload**：LEFT OUTER JOIN 一条 SQL 拿全，但行数 = 主行 × 子行（去重靠 ORM），适合多对一。本实验断言的是 selectinload 路径：21 → 2，结果逐项一致。selectinload 与 joinedload 的取舍：一对多用 selectinload（2 条简单 SQL，无行膨胀）；多对一/单个关联用 joinedload（1 条 SQL）；深层关系可组合——行数膨胀是 joinedload 对多的一侧的固有代价，ORM 靠去重补救但内存与带宽照付。

**为什么计数器挂在 engine 事件上而不是数 echo？**

```python
class SQLCounter:
    def __init__(self, engine):
        self.count = 0
        event.listen(engine, "before_cursor_execute", self._inc)
```

echo 是给人看的日志（受级别配置影响、混着 BEGIN/COMMIT 噪音）；事件是给程序用的钩子——每条真正下发的 SQL 精确 +1，`assert counter.count == 21` 才立得住。给慢查询定责时，这套计数器可以直接搬进项目当诊断工具。

踩坑清单：

- **循环里点关系属性**：N+1 的最小病根，一行 `selectinload` 治好；代码审查时盯紧"列表 + 关系访问"的组合
- **以为 commit 之后对象还是"热"的**：它已过期，下一次读属性是隐式 SELECT——循环里逐个读"刚提交"的对象，就是隐形的 N+1
- **把 ORM 对象塞进缓存/跨请求复用**：会话一关就是 detached，读到过期属性直接炸；缓存序列化后的 dict，别缓存活对象
- **加列忘 `server_default`**：`nullable=False` 的新列在没有默认值时，旧行填充会失败（或全成 NULL）；`server_default="0"` 让迁移对存量数据无感
- **手写迁移顺序搞反 `down_revision`**：版本链断了 Alembic 直接迷路；每个新脚本的 `down_revision` 必须指向当前 head

## Q&A

**Q1: selectinload 和 joinedload 怎么选？**
一对多用 selectinload（2 条简单 SQL，无行膨胀）；多对一/单个关联用 joinedload（1 条 SQL）；深层关系可组合。行数膨胀是 joinedload 对多的一侧的固有代价，ORM 靠去重补救但内存与带宽照付。

**Q2: expire_on_commit 是什么？利与弊？**
commit 后所有实例过期，下次访问属性隐式刷新（保证读到的与库一致）。利：事务后数据新鲜；弊：隐藏 SELECT——循环里读"刚提交"的对象就是隐形 N+1。可 `expire_on_commit=False` 或明确 `refresh()`。

**Q3: DetachedInstanceError 什么时候发生？**
访问 detached（会话已关闭）实例上未加载/已过期的属性时。预防：对象不活过 session（一请求一 session）、需要离线使用就在关闭前 `expunge` 前确保属性已加载或序列化成普通数据。
