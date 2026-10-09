# Video Outline

> **标题**：看不见的字典税 —— `__slots__` 与实例内存
> **主题**：待定（Checkpoint Plan 对齐后填入 theme-id）
> **总时长**：约 3 分 42 秒（口播 ~540 汉字当量；各步估时累加 221.5 秒（含静默标题 1.5 秒））
> **章节数**：6 章 / 23 步（step 1 为静默标题页，不配音）
> **版本说明**：压缩版（原 36 步 5min18s → 22 步 3min42s，口播砍 30%）。
> 裁掉口播的数字**不丢**，按双源原则移到画面承载：整机 150~350 bytes 刻度、
> 3.10/3.13 字典膨胀刻度、速度对照 3.10 写 1.38x / 读 1.08x、pickle 序列化
> 正常——全部挂角标 / 刻度图 / 数据浮层。机制（member_descriptor 直达槽位）、
> 核心数字（48/296/344/64.7%）、三个代价、getsizeof 口径坑、速度真相全保留。

---

## 1. hook — 看不见的字典税（5 steps · ~40s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 实测数字：两属性实例本体 48 bytes，背后 `__dict__` 296 bytes，真实总计 344 vs 48 —— 来源 article 输出 L27-30
- 默认行为：Python 默认给每个实例挂 `__dict__` 哈希表，属性存表里 —— 来源 article 导语 L4 / What L10
- 版本浮动：实例字典 3.10 约 100~104 B → 3.13 实测 296 B；整机 150~350 bytes（口播只念 3.13/296，刻度图承载 3.10 与 150~350）—— 来源 article Why L14 / 内存原理 L66
- 上量场景：坐标点、配置项、ORM 模型实例成千上万 —— 来源 article Why L14
- 判词原句：百万级小对象时字典比业务数据本身还占内存 —— 来源 article 导语 L4-5

**开发计划**：

- step 1 (~1.5s) — **片头标题页**：主标「看不见的字典税」+ 副标「__slots__ 与实例内存」+ 右下工程图签（静默，不配音）
- step 2 (~6s) — 悬念 hero：一个两属性的小对象，占多少内存？
- step 3 (~10s) — 揭晓双数字：本体 48 字节 + 字典 296 字节（重 6 倍）
- step 4 (~14s) — 默认行为：每实例附赠 `__dict__` 哈希表 + 版本膨胀刻度（3.10 → 3.13，150~350B 角标）
- step 5 (~9s) — 上量场景：坐标点 / 配置项 / ORM 实例 × 上万，字典比业务数据重

口播节选：
> 我实测了：本体 48 字节，背后却挂着一张 296 字节的字典——字典比对象本身重了 6 倍。

---

## 2. slots — 一行声明的机制（4 steps · ~37s）

**信息池**：
- 声明代码：`__slots__ = ("x", "y")` 是类级声明 —— 来源 article What L10 / L78
- 机制原句：Python 据此为每个名字在类上建一个 member_descriptor，属性值直接存进实例的固定槽位数组 —— 来源 article Deep Dive L103
- 写入路径：`p.x = 1` 经 member_descriptor 直达槽位，不查/建 `__dict__` —— 来源 article What L10
- 真机输出：`SlotPoint: 48 bytes, has __dict__: False`（字典消失）—— 来源 article 输出 L28
- 本体构成：对象头 16 + GC 头 16 + 指针/槽位 8×n，本体 48 B 前后没变 —— 来源 article 诚实预期 L56
- 总对比：RegularPoint 48 + 296 = 344 bytes vs SlotPoint 48 bytes —— 来源 article 输出 L30
- 定性原句：`__dict__` 是哈希表（动态、灵活、开销大），`__slots__` 是描述符数组（固定、紧凑、开销小）—— 来源 article 内存原理 L73

**开发计划**：

- step 1 (~8s) — 解法 hero：一行声明 `__slots__ = ("x", "y")`
- step 2 (~14s) — 机制图：x / y → 类上各建 member_descriptor → `p.x = 1` 直达固定槽位（哈希表 vs 描述符数组定性挂角标）
- step 3 (~7s) — 真机：`has __dict__: False`（字典消失盖章）
- step 4 (~8s) — 本体解剖：48 B 没变（对象头 + GC 头 + 两槽位），省的是哈希表，344 对 48

口播节选：
> Python 给 x 和 y 各建一个 member_descriptor，p.x = 1 直接写进固定槽位，不查字典。

---

## 3. bulk — 万级实例实测（3 steps · ~30s）

**信息池**：
- 真机输出：10,000 instances，Regular 1328.1 KB / Slotted 468.8 KB / Savings 64.7% —— 来源 article 输出 L33-36
- 版本差异：3.10 实测 68.4%（两版实例字典大小不同所致）—— 来源 article 诚实预期 L56
- 口径坑原句：`getsizeof` 只算对象本体，两个类都显示 48 bytes 不是 bug —— 来源 article 诚实预期 L56 / Deep Dive L107
- 正确口径：真实开销 = `getsizeof(p) + getsizeof(p.__dict__)`，或直接看批量对比 —— 来源 article 诚实预期 L56 / 输出 L30

**开发计划**：

- step 1 (~11s) — 批量实测横条：一万实例 1328.1 KB vs 468.8 KB，省 64.7%
- step 2 (~6s) — 版本角标：3.10 能省到 68.4%（字典大小不同）
- step 3 (~13s) — 口径坑：getsizeof 只算本体（48 = 48 不是 bug），真开销看批量对比

口播节选：
> 真机跑批量：一万个实例。普通版 1328 KB，slots 版 468 KB，省 64.7%。

---

## 4. price — 三个代价与一个误会（4 steps · ~44s）

**信息池**：
- 代价一真机：`p.z = 3` → `AttributeError: 'SlotPoint' object has no attribute 'z' and no __dict__ for setting new attributes`（3.10 无后缀，3.11+ 追加，角标）—— 来源 article 输出 L38-40 / 诚实预期 L58
- 代价二真机：`weakref.ref(SlotPoint(...))` → `TypeError: cannot create weak reference`；解法：slots 中声明 `__weakref__` —— 来源 article 输出 L42-43 / 注意事项 L97
- 代价三原句：父类的 slots 仍生效；子类不声明自己的 `__slots__`，会额外获得 `__dict__`，整条继承链省内存失效 —— 来源 article L84-87 / 注意事项 L95 / Deep Dive L108
- 误会：`SlotWithDefault(1, 2): z=0`，默认值来自 `__init__` 形参默认值，slots 本身不存储默认值 —— 来源 article 输出 L31 / L89 / 注意事项 L99
- 角标素材：pickle 能正确处理 slots 对象，但 `__getstate__`/`__setstate__` 行为略有不同 —— 来源 article Q2 L118-120

**开发计划**：

- step 1 (~9s) — 代价一：`p.z = 3` → AttributeError 真机（完整报错文案原样上屏）
- step 2 (~12s) — 代价二：weakref TypeError + 解法声明 `__weakref__`
- step 3 (~12s) — 代价三：子类忘声明 `__slots__` → 悄悄长回 `__dict__` → 整条链归零（继承链示意）
- step 4 (~11s) — 误会：z=0 来自 `__init__` 形参不是 slots（pickle 正常工作角标）

口播节选：
> 第三个最阴：子类忘了声明 __slots__，会悄悄长回 __dict__，整条链省的内存归零。

---

## 5. speed — 速度真相（3 steps · ~31s）

**信息池**：
- 历史提速：约 3.10 及以前属性访问有 10%~40% 提速 —— 来源 article Why L14
- 3.13 真机：write 0.91x / read 0.99x（多次运行 0.9~1.05x 浮动）；原始数据 regular_write 0.6052s / slot_write 0.6676s / regular_read 0.6560s / slot_read 0.6643s —— 来源 article 输出 L45-51 / 诚实预期 L57
- 3.10 对照：write 1.38x / read 1.08x，速度比值随版本差异巨大（口播不念，对照角标承载）—— 来源 article 诚实预期 L57
- 旧经验值："slots 快 20-30%" 是旧版本经验，别当普适结论 —— 来源 article 诚实预期 L57
- 定论原句：3.11+ 属性访问优化后两者基本持平——今天用 slots 的主要理由是内存，不是速度 —— 来源 article Why L14

**开发计划**：

- step 1 (~9s) — 历史：3.10 及以前属性访问提速 10%~40%
- step 2 (~11s) — 真机基准：3.13 写 0.91x / 读 0.99x 基本持平（3.10 写 1.38x / 读 1.08x 对照角标）
- step 3 (~11s) — 定论 hero：理由是内存，不是速度（"快 20-30%" 是旧经验值）

口播节选：
> 我实测 3.13：写 0.91 倍，读 0.99 倍——基本持平，偶尔反超。

---

## 6. closing — 何时用与系列回收（4 steps · ~39s）

**信息池**：
- Q1 三场景原句：大量（成千上万）轻量对象 / 属性固定不需要动态添加 / 内存敏感（缓存、游戏实体）—— 来源 article Q1 L112-116
- 描述符彩蛋：`SlotPoint.x` 是描述符（member_descriptor），描述符协议 Python 内部自用 —— 来源 article 注意事项 L98 / What L10
- 系列衔接原句：元类在"类创建期"做文章，`__slots__` 把镜头对准"实例运行期"的开销 —— 来源 article 导语 L3
- 角标素材：pickle 序列化正常工作 —— 来源 article Q2 L118-120
- 仓库指引：hands-on-python，`cd core/06_slots_memory && python3 slots_memory.py` —— 来源 article How L18-20

**开发计划**：

- step 1 (~8s) — 三场景卡：上万轻量对象 / 属性固定 / 内存敏感（缓存、游戏实体）
- step 2 (~12s) — 彩蛋：member_descriptor 就是描述符协议（描述符那期 callback）
- step 3 (~6s) — 系列衔接：元类管类的诞生 → slots 管实例的开销
- step 4 (~13s) — CTA：hands-on-python 终端（系列同款收尾）

口播节选：
> 上期元类管类的诞生，这期 slots 管实例的开销。……链接在评论区，下期见。

---

## 素材清单

### 1. hook
- ✓ 悬念 hero、双数字揭晓、实例+字典示意 + 版本刻度、场景卡，CSS/SVG 自绘

### 2. slots
- ✓ 声明代码卡、member_descriptor 机制图、真机终端、本体解剖图，CSS/SVG 自绘

### 3. bulk
- ✓ 万实例横条对比图、版本角标、getsizeof 口径卡，CSS/SVG 自绘

### 4. price
- ✓ AttributeError 真机终端、weakref 报错卡、继承链示意、默认值真机输出，CSS/SVG 自绘

### 5. speed
- ✓ 历史提速卡、基准测试真机终端 + 3.10 对照角标、定论 hero，CSS/SVG 自绘

### 6. closing
- ✓ 三场景卡、描述符彩蛋、系列衔接图、系列同款终端 CTA，CSS/SVG 自绘
- ⚠️ Python 官方 logo 如需使用请用户提供；否则纯文字排版
