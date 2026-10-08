# 10 · JSONB 与全文检索:半结构化数据的两把钥匙

> 20 万行 JSONB 商品表、1000 篇英文文章、一列标签数组:GIN 倒排索引把
> `@>` 包含查询从 10ms 压到毫秒级(实测 8~11x),tsquery 十词召回 10/10
> 且相关性排序严格两倍,顺带如实记录原生分词的中文边界。9 项断言全绿。

## Background

关系表遇见"每个商品属性都不一样"就难受:鞋有尺码、手机有内存、书有
作者。要么开几十个大多为空的列,要么把属性塞进 TEXT 靠字符串解析——
没法按属性建索引;标签这类"一值对多行"的数据拆表又多一次连接。

正文搜索是同款难题:`LIKE '%关键词%'` 全表逐行扫,而且不懂词形——搜
database 匹配不了 databases。PG 的答案是两条专用管线:JSONB(二进制
存储,解析完成、可索引)与 tsvector/tsquery 全文检索,都靠 GIN 索引
(倒排:从"值"反向查出"哪些行含有它")加速。

中文是原生方案的公开边界:默认分词器不切中文。本实验把这条边界做成
断言如实记录,生产替代方案收进 Q&A。

## What

**定义**:JSONB 存已解析的二进制 JSON,`@>` 判断"左边包含右边";GIN
(通用倒排索引)维护"键值/词素 → 行号"的反向映射。数组列 `TEXT[]`
用 `= ANY` 或 `@>` 查。

全文检索在入库时用 to_tsvector 把正文切成词素集合落列,查询时 tsquery
用 `@@` 匹配,ts_rank 按词频位置打相关性分。

可以把 GIN 想成书末的索引页:词条直接映射页码,不用逐页翻。但和索引页
不同的是,词条必须先被收录——分词器不认识的内容(比如整串中文)进不了
索引页,这就是实测的中文边界。

| 数据形态 | 查询写法 | 加速手段 | 本实验实测 |
|:--|:--|:--|:--|
| JSONB 属性 | `attrs @> '{"name":...}'` | GIN | 10ms → 毫秒级,8~11x |
| 正文全文 | `body_tsv @@ tsquery` | tsvector 落列 | 十词召回 10/10 |
| 标签数组 | `'t5' = ANY(tags)` | GIN | 万行级即时命中 |

![Lab 10 · 半结构化检索三件套:JSONB、全文、数组各配一把钥匙](images/jsonb_fulltext.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/database/10_jsonb_fulltext/images/jsonb_fulltext.html)
> (或本地打开 [`images/jsonb_fulltext.html`](images/jsonb_fulltext.html))。

## When to Use

**典型场景**。商品/租户的多属性过滤(属性随品类变化);标签系统与用户
画像(数组列 + GIN);站内搜索、日志检索(全文管线);配置与 API 响应
的半结构化存档(JSONB)。

**何时不用**。字段固定且强约束的数据老实用列——JSONB 没有列级 NOT NULL
与外键;中文为核心的生产搜索,原生管线只是过渡,直接上分词扩展或外置
引擎(见 Q2)。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 宽列 + NOT NULL | 强约束,可外键 | 属性固定的核心表 |
| JSONB + GIN | 属性自由,倒排可查 | 属性多变的目录/配置 |
| tsvector 全文 | 词素级匹配与排序 | 站内搜索;中文需扩展 |

## Quick Start

前置条件:Docker(OrbStack)在跑、镜像 postgres:16-alpine 就位、venv 装好
psycopg。一条命令跑完整生命周期(含 20 万行种子,约 30 秒):

```bash
cd database/10_jsonb_fulltext && ./jsonb_fulltext.sh all
```

真实输出(节选,完整 9 项断言以实跑为准):

```text
=====> [jsonb] attrs @> '"name":"product-77777"': GIN 前后耗时对比
    GIN 前 3 次: ['10 ms', '11 ms', '11 ms'], 取最好 10 ms
    GIN 后 3 次: ['1.2 ms', '0.3 ms', '0.4 ms'], 取最差 1.2 ms
    提速 9x
  [PASS] GIN 前后耗时对比 >= 5x (实际 9x, 前取最好后取最差)
    ...
=====> [fulltext-and] AND 语义与 rank 排序: 含两词的排 ahead of 只含一词的
    database & index 命中 1 篇(硬过滤, 单词文章不入围)
  [PASS] 双词 9001 全表第一, 且 rank 严格高于单词 9002(0.0608 > 0.0304, 9001 vs 9002)
=====> [fulltext-zh] 中文边界: 原生分词器把整串中文当一个 token
  [PASS] 中文词检索 0 命中(边界实录, 中文方案见 README 选做)
==== 实验 10 · jsonb_fulltext 全部 9 项断言通过 [PASS] ====
```

诚实预期:GIN 前后倍数随缓存波动(实测 8~11x),断言口径取"前取最好、
后取最差"的保守比较;中文 0 命中是如实记录的能力边界,不是缺陷——
正文检索语料为英文,中文方案见 Q2。

## How It Works

### GIN 为什么通吃三种数据

JSONB 的键值对、数组元素、tsvector 的词素,共同点是"一个值对应多行"——
正适合倒排:索引里存"值 → 行号集合",`@>` 与 `= ANY` 先查字典再取行,
跳过整表解析。B-tree 按大小排序只能答"大于/小于",答不了"包含",
这是 GIN 在半结构化世界当家的原因。

### 全文检索管线:& 硬过滤,| 加分排序

入库时 `to_tsvector('english', body)` 切词、还原词干(database/databases
归一)、去停用词(the/and 这类无实义词),结果落 body_tsv 列;查询 `@@ tsquery` 匹配词素集合。

`&` 是硬过滤:`database & index` 只留双词文章,单词文章不入围;要比"谁
更相关"用 `|` 配 ts_rank——双词 rank 0.0608,单词 0.0304,严格两倍,这
就是搜索引擎"最相关的排最前"的机制。

### 中文边界:整串一个 token

默认分词器按空格与标点切英文,连续中文没有分隔符,`数据库索引与查询
优化详解` 整串成一个词素。于是查"索引"零命中——不是没收录,是收录
的词条是整串。

生产方案两条路:装 zhparser/pg_jieba 分词扩展,或外置 Elasticsearch/
Meilisearch;本实验按清单约定只做边界实录。

## Pitfalls & Q&A

**坑 1:tsvector 要入库时算好落列**。查询里现算 `to_tsvector(body)` 会让
每一行都重新切词,索引也用不上;落列 + 查询列才是标配姿势。

**坑 2:GIN 对比口径要公平**。GIN 后首次查询可能还在加载缓存,前后各跑
多次、前取最好后取最差仍 >= 5x 才算硬结论,单次对比会高估。

**坑 3:tsquery 有专门的构造函数**。`to_tsquery('english', 'databases')`
会还原词干命中 database;手拼裸字符串不还原词形,召回会莫名变少。

**Q1:GIN 写入慢吗?** 慢于 B-tree(一个新行要更新多个词条),PG 用
fastupdate 待缓列表缓冲;写极多读极少的场景才需要权衡。

**Q2:中文生产搜索怎么选?** 数据不出库选 zhparser/pg_jieba 扩展(容器内
编译链长,清单列为选做);已有多搜索引擎运维经验选 Elasticsearch/
Meilisearch,换来的是分词质量与运维成本。

**Q3:JSONB 与 JSON 列有什么区别?** JSON 存原文串,每次读取重新解析、
不可索引;JSONB 存解析后的二进制,可 GIN 索引,代价是写入时多一次解析
与约 10%~20% 略大的体积,业务表一律选 JSONB。
