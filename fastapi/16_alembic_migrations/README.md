# 16 · Alembic 迁移：模型变了，表怎么跟着变

> 模型类和数据库表是两份各自演化的定义，改了模型，表不会自己跟着变。读完本篇，
> 你能用 Alembic 把模型变更记录成可重放、可回退的迁移链，并逐列验证生效。

## Background

没有迁移工具之前，表结构靠手写 SQL 脚本维护：建表写一个 `CREATE TABLE` 文件，
改表就再写一个 `ALTER TABLE` 文件，每个环境（开发机、测试库、生产库）由人排队执行。

撞墙出现在第二个环境之后：开发库按文件改过了，测试库漏执行一条，应用在一边
正常、在另一边报 no such column。这就是环境漂移——同一套结构在不同库里长成了
不同样子，而没人说得清每个库当前处于哪个版本。

改不回来是第二堵墙：加列的 `ALTER` 好写，删列的反向脚本没人补。三个月后要回滚
某次变更，只能对着表结构人肉考古，找回当时到底动了什么。

Alembic（SQLAlchemy 官方的数据库迁移工具）为此而生：每次结构变更记录成一个带
版本号的脚本文件，工具负责按链执行、把进度记在库里，也能反着执行来回滚。

## What

**定义**：迁移（migration）是描述数据库结构一次变更的脚本，带一对函数：
`upgrade()`（怎么变过去）与 `downgrade()`（怎么变回来）；Alembic 负责生成脚本、
沿链执行，并把当前版本号写进库里的 `alembic_version` 表。

可以把迁移链想象成**数据库的 git commit**：每个脚本有一个 revision（本次变更的
随机哈希编号）和一个 down_revision（指向上一个脚本），像 commit 记录父提交一样
串成一条线性历史。

但和 git 不同的是：commit 存内容快照，迁移存"怎么变"的操作，回滚靠反向执行；
删掉的列不会找回数据，所以 downgrade 只还原结构，不还原数据。

autogenerate（自动生成）是 Alembic 的差异生成器：对比模型声明与数据库实际结构，
把差集写成迁移脚本。本实验让文章表演进两步，看这条链从一节长成两节。

| 部件 | 在哪 | 职责 |
|:--|:--|:--|
| alembic.ini | 工程根 | 总配置，`sqlalchemy.url` 指向目标数据库 |
| env.py | alembic/ | 接线处：`target_metadata = Base.metadata` 把模型交给迁移系统 |
| versions/*.py | alembic/ | 迁移脚本，一个文件是链上的一环 |
| alembic_version | 数据库内 | 记录当前版本号，`alembic current` 靠它回答"库走到哪了" |

数据流从左到右：模型与库内现状两侧输入，autogenerate 对比出 diff 脚本，upgrade 应用到库，最右 PRAGMA 对账验证。

![Lab 16 · Alembic 迁移：对比差异，生成可重放的脚本链](images/alembic_migrations.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/16_alembic_migrations/images/alembic_migrations.html)
> （或本地打开 [`images/alembic_migrations.html`](images/alembic_migrations.html)）。

## When to Use

典型场景：多人多环境开发，模型迭代要同步到测试库与生产库；发版后新列出问题，
需要把表结构退回上一版；CI 从空库按链建到最新再跑测试，保证环境结构一致。

何时不用：原型期的一次性 demo。数据是丢弃型的，`Base.metadata.create_all(engine)`
一行建齐全部表，模型改了就删库重建，比维护迁移链省事。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| `create_all` | 只建缺失的表，不改已有表，无版本记录 | 原型期，数据可随时丢弃 |
| autogenerate | 对比模型与库生成脚本，仍需人工检查 | 迭代期项目的日常选择 |
| 手写迁移 | 自己写 upgrade 与 downgrade 的每一步 | 改名、数据回填等对比器写不对的变更 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（Python 3.13、SQLAlchemy 2.1、Alembic 1.20），未创建
则先在仓库根执行 `./scripts/load_resources.sh`。

本实验不起 web 服务，纯 CLI 演示；迁移工程 `lab16_workspace/` 与数据库由脚本现场
生成，`clean` 一并删除。

每步模型变更后，脚本用 PRAGMA（SQLite 管理命令，`table_info` 逐列返回表的真实
结构）直接问库，不经 ORM（对象关系映射，把类映射成表、对象映射成行）。

```bash
cd fastapi/16_alembic_migrations && ./16_alembic_migrations.sh demo
```

demo 共 6 章：目录职责、建表、加列、回退、迁移链断言、速查。真实输出（节选，
`...` 处省略 INFO 日志；revision 哈希每次随机生成，下同）：

```text
---- [2/6] 第一个迁移: autogenerate 对比模型与库, 生成建表脚本
INFO  [alembic.autogenerate.compare.tables] Detected added table 'articles'
Generating .../versions/38bbeb6960b3_create_articles_table.py ...  done
    def upgrade() -> None:
        op.create_table('articles',
...
    $ PRAGMA table_info(articles)   <-   .../lab16_workspace/lab16.db
        cid  name     type          notnull dflt_value  pk
          0  id       INTEGER       1       None        1
          1  title    VARCHAR(200)  1       None        0
          2  content  TEXT          1       None        0
        [PASS] 列齐: id,title,content  (共 3 列)
...
---- [3/6] 模型演进: models.py 加 views/author -> 第二个迁移
    +    views: Mapped[int] = mapped_column(default=0, server_default="0")
    +    author: Mapped[str | None] = mapped_column(String(120), default=None)
INFO  [alembic.autogenerate.compare.tables] Detected added column 'articles.views'
        op.add_column('articles', sa.Column('views', sa.Integer(), server_default='0', nullable=False))
...
          3  views    INTEGER       1       '0'         0
          4  author   VARCHAR(120)  0       None        0
        [PASS] 列齐: id,title,content,views,author  (共 5 列)
        [PASS] server_default 生效: views 的 dflt_value = 0  (实测 "'0'")
    插入后读回: title='迁移验证'  views=0  author=None
        [PASS] views 取到 server_default 的 0, author 保持 NULL
...
---- [4/6] 时光倒流: downgrade -1 回退一个迁移, 再前进恢复
INFO  [alembic.runtime.migration] Running downgrade 046e79c26577 -> 38bbeb6960b3, add views and author to articles
        [PASS] 无列: views,author
...
---- [5/6] 迁移链: history 是线性历史, current 指向 head
    $ alembic history -> 2 行:
        38bbeb6960b3 -> 046e79c26577 (head), add views and author to articles
        <base> -> 38bbeb6960b3, create articles table
        [PASS] 线性成链: 第二个迁移的 down_revision 指向第一个  (38bbeb6960b3 == 38bbeb6960b3)
        [PASS] 库内 alembic_version 表 == current  (version_num=046e79c26577)
...
====================================================================
  演示完成: 15 项断言全部通过
====================================================================
```

诚实预期：迁移脚本由 alembic 现场生成，revision 哈希、Create Date、路径均与上面
不同（本篇取自一次真实运行）；断言是确定性的，连跑 3 次 `all` 实测均 15 项 PASS。

## How It Works

env.py 是模型与引擎的接线处，Alembic 每次执行命令都先运行它：
`target_metadata = Base.metadata` 把模型注册表交给迁移系统；执行 upgrade 时，
env.py 再按 alembic.ini 的 `sqlalchemy.url` 建引擎连上库。

autogenerate 的对比是双向的：从 `Base.metadata` 拿模型要的结构，用 reflect（从
数据库反向读出实际表结构）拿库里的现状，差集写成 `op.*` 调用（op 是迁移脚本里
执行这些变更的操作命名空间，如 `op.add_column`）。

demo[2] 的 `Detected added table` 就是对比器日志：库空、模型有一张表。demo[3]
演进后差异变成两条 add_column，生成的脚本里多出两个 `op.add_column`，
与 PRAGMA 里多出的两行一一对应。

执行进度记在库内的 alembic_version 表：每跑完一个迁移就写入它的 revision。

`alembic current` 要连库读这张表（demo[5] 里它前面的 INFO 日志就是建连接）；
`history` 只看 versions/ 目录里的文件，沿 down_revision 从新到旧回溯，不连库。

downgrade 执行脚本里的 `downgrade()` 函数：第二个迁移回退就是两条 drop_column，
列连同数据一起消失。SQLite 3.35+ 支持直接 DROP COLUMN（本机实测 3.51），更老的
库要走 batch 模式（建临时表拷数据再换名）完成同样的结构变化。

## Pitfalls & Q&A

- **忘接 target_metadata，autogenerate 会朝错误方向生成**：模板默认
  `target_metadata = None`，模型没接进 env.py 时对比器认为模型是空的——库里有表
  就会生成 drop_table。解法：接上 `Base.metadata`，空迁移或删除方向是异常信号。
- **autogenerate 检不出列改名**：把 `name` 改成 `title` 再生成，得到的是
  `add_column(title)` 加 `drop_column(name)`——结构对比只看差异、不懂语义，
  照单全收会丢数据。解法：手工改成一条 `op.alter_column(..., new_column_name=...)`。
- **Python `default` 与 `server_default` 是两个世界的默认值**：`default=0` 只在经
  ORM 插入时由 Python 填，DDL（CREATE/ALTER 一类改结构的 SQL）里没有；
  `server_default="0"` 写进 DDL，PRAGMA 可见，裸 SQL 插入也生效。
- **迁移里顺手改业务数据，可能在生产锁表**：大表上全表 `UPDATE` 或改列类型，
  SQLite 拿整库写锁，PostgreSQL 的 ALTER 拿排他锁，业务写入全部排队。解法：
  结构迁移与数据迁移分开写，大表分批执行。
- **Q：两个开发者各自 autogenerate，会出现两个 head 吗？** 会，两条链指向同一个
  父节点；`alembic heads` 列出分支，用 `alembic merge` 生成合并迁移即可。
- **Q：能前进或回退到任意版本吗？** 能：`upgrade <哈希前缀>` 到指定版本，
  `downgrade -1` 回退一步（demo[4] 的写法），`downgrade base` 退回空库。
- **Q：迁移脚本要提交进版本库吗？** 要。脚本链是工程资产，随代码走，数据库文件
  本身不进版本库；他人拉下代码后 `upgrade head` 即可得到一致的表结构。
