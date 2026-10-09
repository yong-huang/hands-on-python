# Video Outline

> **标题**：super() 不是父类 —— MRO 与 Mixin
> **主题**：blueprint（沿用系列前六期，Checkpoint 确认后填入）
> **总时长**：约 3 分 41 秒（口播 ~560 汉字当量；各步估时累加 219 秒）
> **章节数**：5 章 / 21 步
> **口径说明**：延续 slots-memory 压缩口径（~3 分半、真机数字全保留、口播外的
> 细节挂画面）。实现讲足：钻石 MRO（D→B→C→A→object）、B 的 super 跳 C、
> A 恰好一次 vs 直接指定类执行两次、C3 三性质、Mixin __init__ 协作链真机顺序、
> 断链静默 bug、四条设计原则、放左侧的局部优先原理全保留。仅不展开：
> `object.__init__` 末环不可见细节（角标）、Q1/Q2 的完整原文表述（口播已覆盖
> 结论，原文细节挂画面）。

---

## 1. hook — super() 不是父类（4 steps · ~32s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 反差原型：`super()` 名字里带 super，人人以为是「调用父类」，多继承就翻车 —— 来源 article 导语 L3-4
- 心智模型原句：`super()` = 「MRO 中我之后的下一个类」，不是「我的父类」—— 来源 article What L9
- MRO 定义：多继承时 Python 用 C3 线性化算法确定方法查找顺序 —— 来源 article What L9
- 钻石结构：B 和 C 都继承 A，D 继承 B 和 C —— 来源 article C3 L54-55 / What L9

**开发计划**：

- step 1 (~9s) — 反差 hero：`super()` 名字里带 super，你以为它是「调用父类」
- step 2 (~7s) — 翻车卡：一到多继承就出错（真相预告：MRO 中的下一个）
- step 3 (~10s) — 概念卡：MRO = 方法查找顺序，C3 线性化算法算出来
- step 4 (~6s) — 钻石结构图：B(A)、C(A)、D(B, C)（为下一章铺垫）

口播节选：
> super()，名字里带个 super，你一定以为它是「调用父类」。……它其实是「MRO 中的下一个」。

---

## 2. diamond — 钻石继承与 C3（5 steps · ~40s）

**信息池**：
- 真机输出：`D(B, C) MRO: D -> B -> C -> A -> object` —— 来源 article 输出 L26
- 关键反直觉点：B 的 `super()` 跳向 C 而非父类 A —— 来源 article What L9
- 真机输出：`D().greet()` 依次 D[0] / B[1] / C[2] / A[3]，`A.greet() called exactly ONCE (C3 guarantees)` —— 来源 article 输出 L28-33
- 双重执行坑：直接写 `A.greet(self)`，A 的代码执行两次，「恰好一次」保证失效 —— 来源 article 踩坑 L95 / Q1 L101
- C3 三性质：单调性（子类 MRO 中父类顺序与父类自身 MRO 一致）、局部优先（先出现的父类优先）、唯一性（每个类只出现一次）—— 来源 article C3 L59

**开发计划**：

- step 1 (~7s) — 真机：MRO 序列 D → B → C → A → object 逐环点亮
- step 2 (~7s) — 反直觉标注：B 的 super() 跳向 C（不是父类 A）
- step 3 (~8s) — 真机：D().greet() 调用序 D/B/C/A 各带 MRO index
- step 4 (~11s) — 恰好一次盖章：C3 保证 A 只执行一次 vs `A.greet(self)` 两次对照
- step 5 (~7s) — C3 三性质卡：单调性 / 局部优先 / 唯一性

口播节选：
> 真机：D(B, C) 的 MRO 是 D → B → C → A → object。……A 恰好只执行一次——这是 C3 的保证。

---

## 3. mixin — Mixin 协作链（5 steps · ~55s）

**信息池**：
- Mixin 定义：可插拔功能模式，每个 Mixin 提供单一功能，业务类组合多个获得所有能力；能否正确工作完全取决于 `super()` 沿 MRO 协作转发 —— 来源 article Why L13
- 真机代码：`class MyService(MixinLog, MixinValidate, Base)`，`__init__` 里 `super().__init__()` —— 来源 article L64-66
- 真机输出：`MixinLog.__init__` → `MixinValidate.__init__` → `Base.__init__` 依次 called by MyService —— 来源 article 输出 L37-40
- 机制原句：super() 找 MRO 中 MyService 之后的下一个类，每个 `__init__` 再调 super()，链条 MyService → MixinLog → MixinValidate → Base → object 串起来 —— 来源 article Deep Dive L83-86
- 末环角标：`object.__init__` 经 Base 的 super() 调到，只是不打印 —— 来源 article 诚实预期 L50

**开发计划**：

- step 1 (~6s) — 转场卡：有了确定的顺序，才有 Mixin 这场好戏
- step 2 (~11s) — Mixin 概念卡：可插拔功能件，一个 Mixin 一件事，组合即能力
- step 3 (~11s) — 真机代码卡：`MyService(MixinLog, MixinValidate, Base)`
- step 4 (~15s) — 真机终端：`__init__` 执行序 MixinLog → MixinValidate → Base 逐行点亮（正是 MRO 的下一个）
- step 5 (~12s) — 链条机制图：每个 `__init__` 调 `super().__init__()`，一环扣一环（object 末环角标）

口播节选：
> 造一个实例，__init__ 的执行顺序：MixinLog → MixinValidate → Base——正是 MRO 的下一个。

---

## 4. pitfalls — 断链与四原则（4 steps · ~58s）

**信息池**：
- 断链坑原句：Mixin 的 `__init__` 不调 `super().__init__()`，链条静默中断，后面的类都不被初始化——多继承最常见的静默 bug —— 来源 article 诚实预期 L49 / 踩坑 L93
- 四条设计原则：不维护状态（只提供方法，`__init__` 要么不用、要么调 super）/ 放继承列表左侧 / 以 Mixin 后缀命名 / 不独立使用（依赖业务类基础属性）—— 来源 article L71-74
- 放左侧原理：MRO 局部优先，Mixin 方法先于业务类同名方法被找到；业务类 `__init__` 仍经 super 链最后完成 —— 来源 article L72 / Q2 L105
- 绕链坑：`ClassName.__init__(self)` 直接指定类，绕过 MRO 链式调用破坏整条链；Mixin 中永远用 `super()` —— 来源 article 踩坑 L94

**开发计划**：

- step 1 (~14s) — 断链示意：某一环忘调 super，链静默断在那，后面全灰（最常见静默 bug）
- step 2 (~13s) — 四原则卡：不维护状态 / 放左侧 / Mixin 后缀 / 不独立使用（逐条上屏）
- step 3 (~14s) — 放左侧原理：局部优先——Mixin 方法先于业务类同名方法；业务类初始化仍由 super 链收尾
- step 4 (~17s) — 绕链坑：`ClassName.__init__(self)` 直接指定类 = 绕断 MRO 链，Mixin 里永远用 super

口播节选：
> 前提是每一环都协作。哪个 Mixin 忘了调 super，链就静默断在那。

---

## 5. closing — 一句话与系列回收（3 steps · ~34s）

**信息池**：
- 金句原句：`super()` = 「MRO 中我之后的下一个类」，不是「我的父类」—— 来源 article What L9
- 系列衔接：描述符管属性存取、slots 管实例开销、MRO 管方法查找（第六期 slots / 第四期描述符 callback）—— 来源 article 导语 L3 / 系列
- 仓库指引：hands-on-python，`cd core/07_mro_mixin && python3 mro_mixin.py` —— 来源 article How L17-20

**开发计划**：

- step 1 (~8s) — 金句 hero：super() 是 MRO 中我之后的下一个，不是父类
- step 2 (~13s) — 系列回收：描述符（属性）→ slots（实例开销）→ **MRO（方法查找）**，Python 每个环节都有协议
- step 3 (~13s) — CTA：hands-on-python 终端（系列同款收尾，下期见）

口播节选：
> 一句话记住：super() 是 MRO 中我之后的下一个，不是父类。……链接在评论区，下期见。

---

## 素材清单

### 1. hook
- ✓ 反差 hero、翻车卡、概念卡、钻石结构图，CSS/SVG 自绘

### 2. diamond
- ✓ MRO 序列逐环点亮、反直觉标注、调用序终端、恰好一次 vs 两次对照、三性质卡，CSS/SVG 自绘

### 3. mixin
- ✓ 概念卡、真机代码卡、__init__ 执行序终端、super 链条机制图，CSS/SVG 自绘

### 4. pitfalls
- ✓ 断链示意（链断后全灰）、四原则卡、局部优先对照、绕链坑卡，CSS/SVG 自绘

### 5. closing
- ✓ 金句 hero、系列回收链、系列同款终端 CTA，CSS/SVG 自绘
- ⚠️ Python 官方 logo 如需使用请用户提供；否则纯文字排版
