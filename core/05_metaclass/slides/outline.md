# Video Outline

> **标题**：class 背后那只手 —— Python 元类与 type
> **主题**：待定（Checkpoint Plan 对齐后填入 theme-id）
> **总时长**：约 4 分 15 秒（口播 ~620 汉字 / 含标点英文 ~1400 字符；各步估时累加 253 秒）
> **章节数**：7 章 / 33 步
> **内容裁剪说明**：延续 descriptor / generator-iterator 口径——**实现讲足**：type 心智
> 模型与层级、自动加 __str__（含尊重已有定义坑）、SingletonMeta `__call__` 拦截、
> OrmMeta `__new__` 字段映射（含真实 SQL 输出）、`__init_subclass__` 轻量替代全保留。
> 仅不展开：close()/GeneratorExit 无关内容无、真实数据库连接（article 本身无）、
> 元类继承链细节。

---

## 1. hook — 谁在创建类（4 steps · ~30s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 反差原型：普通函数调用才执行；`class` 语句定义那一刻就创建类对象 —— 来源 article 导语 L3
- 悬念：这个「创建类」的动作是 `type` 在执行，所有类的默认元类 —— 来源 article 导语 L4-5
- 三大应用预告：自动 `__str__`、单例、ORM 字段收集 —— 来源 article 导语 L5
- 系列衔接：生成器是函数体延迟执行，class 恰恰相反 —— 来源 article 导语 L3

**开发计划**：

- step 1 (~9s) — **片头标题页**：主标「class 背后那只手」+ 副标「Python 元类 · type · 单例与 ORM」+ 右下工程图签（Lab core / 05）
- step 2 (~9s) — 对比卡：普通函数（调用才执行）vs class 语句（定义即创建）
- step 3 (~5s) — 悬念上屏：「创建类的动作，是谁在干活？」（大问号）
- step 4 (~7s) — 答案 hero：`type` 大字 + 「把 type 换成你自己的 = 元类」

口播节选：
> 今天讲 Python 元类。……答案是 type。想让一批类自动获得能力，就把 type 换成你自己的。

---

## 2. type — 类的类（5 steps · ~44s）

**信息池**：
- 心智模型原句：`class Foo` 不是声明而是表达式——Python 调 `type("Foo", bases, namespace)` 创建类对象；写元类就是把这个 type 换成自己的类 —— 来源 article §What L10
- 语法糖代码：`Dog = type("Dog", (Animal,), {"species": "Canine"})` ≙ `class Dog(Animal): species = "Canine"` —— 来源 article L70-73
- 真机输出：`Dog.kingdom = Animalia` / `Dog.species = Canine` / `type(Dog) = type` / `type(type) = type` —— 来源 article 输出 L28-31
- 层级链：`type(42)` 是 int，`type(int)` 是 type —— 来源 article 输出 L57-59
- `isinstance(int, type)` 是 True；type 是所有类的类，也是自身实例 —— 来源 article Q2 L143-149

**开发计划**：

- step 1 (~8s) — 心智模型 hero：`class Foo` 不是声明，是表达式（`type("Foo", bases, namespace)` 三要素标注）
- step 2 (~10s) — 语法糖展开双卡：class 写法 ≙ `type(...)` 调用写法
- step 3 (~9s) — 真机终端：Dog.species / type(Dog)=type / type(type)=type 逐行
- step 4 (~9s) — 层级链：`type(42)→int→type→type` 链条逐环点亮
- step 5 (~8s) — 收束：`isinstance(int, type) = True`（type 是所有类的类，也是自己的实例）

口播节选：
> 心智模型一句话：class Foo 不是声明，是表达式。……type 是所有类的类，也是它自己的实例。

---

## 3. add-str — 自动加方法（4 steps · ~25s）

**信息池**：
- 需求：给一批类自动 `__str__`（打印出完整字段）—— 来源 article 导语 L5 / 输出 L34
- 真机输出：`Person({'name': 'Alice', 'age': 30})` 自动注入成功 —— 来源 article 输出 L34
- 尊重已有定义：类自定义 `__str__` 时元类跳过（`custom str (has custom __str__, metaclass skipped)`）—— 来源 article 输出 L35 / 踩坑 L131
- 坑：不跳过会悄悄覆盖用户实现 —— 来源 article 踩坑 L131

**开发计划**：

- step 1 (~5s) — 需求卡：元类能干什么 · 第一件，自动加方法（__str__ 示例）
- step 2 (~6s) — 真机：`Person({'name': 'Alice', 'age': 30})` 注入成功（打钩章）
- step 3 (~7s) — 转折输出：`custom str (metaclass skipped)`——类自己写了就跳过
- step 4 (~7s) — 原则卡：批量注入必须尊重已有定义，否则悄悄覆盖

口播节选：
> 元类能干什么？第一件：给一批类自动加方法。……类自己定义了 __str__，元类就跳过。

---

## 4. singleton — 单例拦截（6 steps · ~46s）

**信息池**：
- 需求：一个类全局只有一个实例 —— 来源 article 实战 L75-76
- SingletonMeta 代码：类级字典 `_instances` + `__call__(cls, ...)` 判断并缓存 —— 来源 article L77-84
- 关键代码行：`if cls not in cls._instances: cls._instances[cls] = super().__call__(*args, **kwargs)` / `return cls._instances[cls]` —— 来源 article L82-83
- 核心机制（article 原话）：`ClassName()` 触发 `type(cls).__call__` 即元类的 `__call__`，是「实例创建」的必经之路；首次真正执行 `__new__`/`__init__`，之后返回缓存 —— 来源 article Deep Dive L117-125
- 真机输出：`db1 is db2: True` / `db1.host: localhost (first creation wins)` / query 走 localhost —— 来源 article 输出 L37-40
- 预期陷阱：第二次 `Database("remotehost")` 参数被忽略，首次创建胜出 —— 来源 article 诚实预期 L66

**开发计划**：

- step 1 (~6s) — 需求卡：元类第二件，单例（一个类全局一个实例）
- step 2 (~9s) — SingletonMeta 代码卡：`_instances = {}` + `__call__` 判断缓存（三段高亮）
- step 3 (~11s) — 为什么拦 `__call__`：`ClassName()` → `type(cls).__call__` → 实例创建必经之路（拦截点示意）
- step 4 (~9s) — 首次 vs 之后：首次真创建入库 / 之后返回缓存（双通道流程）
- step 5 (~5s) — 真机：`db1 is db2: True`
- step 6 (~6s) — 预期陷阱：第二次参数被忽略（first creation wins 角标）

口播节选：
> 为什么拦 __call__？ClassName() 这种写法，触发的就是元类的 __call__——实例创建的必经之路。

---

## 5. orm — ORM 字段映射（6 steps · ~50s）

**信息池**：
- 需求：类里声明 Field，表结构自动生成 —— 来源 article 实战 L88-89
- OrmMeta 代码：`__new__(mcs, name, bases, namespace)` 扫描 namespace 收集 Field → `cls._fields` / `cls._table = name.lower()` —— 来源 article L90-99
- 关键代码行：`cls._fields = {k: v for k, v in namespace.items() if isinstance(v, Field)}` —— 来源 article L94
- 时机对比（article 原话）：`__call__` 管「实例怎么创建」，`__new__` 管「类怎么创建」—— 拦截时机不同 —— 来源 article L127
- 真机输出：`User._table: user` / `User._fields: ['id', 'name', 'email']` —— 来源 article 输出 L43-44
- SQL 三连真机：`CREATE TABLE user (id int PRIMARY KEY, ...)` / `SELECT id, name, email FROM user` / `INSERT INTO user ... VALUES (1, 'Alice', ...)` —— 来源 article 输出 L45-47
- 零样板：用户类里一行样板都没有 —— 来源 article Q3 L153

**开发计划**：

- step 1 (~7s) — 需求卡：元类第三件，ORM 字段映射（类里声明 Field → 表结构自动来）
- step 2 (~10s) — OrmMeta 代码卡：`__new__` 扫描 namespace → 收集 Field → `_fields` / `_table`
- step 3 (~9s) — 时机对比卡：`__call__` 管实例创建 vs `__new__` 管类创建（双层拦截示意）
- step 4 (~8s) — 真机：`User._table: user` / `User._fields: ['id', 'name', 'email']`
- step 5 (~10s) — SQL 三连真机：CREATE / SELECT / INSERT 逐行（全部从两个类属性生成）
- step 6 (~6s) — 零样板点题：用户类一行样板都没有（拦截前移的价值）

口播节选：
> 注意这里拦的是 __new__。它管「类怎么创建」；单例的 __call__ 管「实例怎么创建」。时机不同。

---

## 6. init-subclass — 轻量替代（4 steps · ~27s）

**信息池**：
- 轻量替代：只需要子类注册/校验时，不必动用元类这么重的机制 —— 来源 article §Why L14
- 真机输出：`Registered handlers: ['click', 'key']` / `click handler: handling click` / `All subclasses: ['ClickEvent', 'KeyEvent']` —— 来源 article 输出 L49-52
- 对比表：子类注册/校验 → `__init_subclass__`；修改命名空间/单例/ORM → 元类；简单钩子 → `__init_subclass__` —— 来源 article 表 L103-108
- 原则原句：能用 `__init_subclass__` 就不用元类 —— 来源 article L110

**开发计划**：

- step 1 (~5s) — 转折卡：不是所有需求都配动用元类
- step 2 (~6s) — 轻量版登场：`__init_subclass__`（Python 3.6+，只管子类注册/校验）
- step 3 (~9s) — 真机：handlers 注册 `['click', 'key']` + 子类列表
- step 4 (~7s) — 原则 hero：能用 `__init_subclass__`，就不用元类（选择对比表）

口播节选：
> 只是注册一下子类？Python 3.6+ 有轻量版：__init_subclass__。……能用 __init_subclass__，就不用元类。

---

## 7. closing — 三层拦截（4 steps · ~31s）

**信息池**：
- 三层回收：元类 `__new__` 创建类、元类 `__call__` 管实例、`__init_subclass__` 管子类钩子 —— 来源 article Q1 L135-139 / L127 / §Why L14
- 系列拼图回收（第五块）：装饰器管函数增强、with 管资源、描述符管属性、生成器管遍历、元类管类的诞生 —— 来源系列前四期 / article 导语 L3
- 应用收束：ORM 字段映射、框架单例、插件自动注册，底层全是这套 —— 来源 article Q3 L153 / §Why L14
- 仓库：hands-on-python，`cd core/05_metaclass && python3 metaclass.py` —— 来源 article §How L19-20

**开发计划**：

- step 1 (~8s) — 三层回收：`__new__` 创建类 / `__call__` 管实例 / `__init_subclass__` 管子类（三层塔逐层点亮）
- step 2 (~10s) — 系列拼图：装饰器函数增强 → with 资源 → 描述符属性 → 生成器遍历 → **元类类诞生**（五块拼图汇合，末块高亮 = 本期）
- step 3 (~6s) — 应用收束：ORM / 单例 / 插件注册，底层全是这套
- step 4 (~9s) — CTA：hands-on-python 终端 + 双 chip（系列同款收尾）

口播节选：
> 回收一下三层：__new__ 创建类，__call__ 管实例，__init_subclass__ 管子类钩子。……链接在评论区，下期见。

---

## 素材清单

### 1. hook
- ✓ 对比卡、悬念问号、type hero，CSS/SVG 自绘

### 2. type
- ✓ 心智模型三要素标注、语法糖双卡、真机终端、层级链条图，CSS/SVG 自绘

### 3. add-str
- ✓ 需求卡、真机输出、skipped 章、原则卡，CSS/SVG 自绘

### 4. singleton
- ✓ 代码卡三段高亮、拦截点示意、双通道流程、真机终端，CSS/SVG 自绘

### 5. orm
- ✓ OrmMeta 代码卡、双层拦截示意、真机终端、SQL 三连逐行，CSS/SVG 自绘

### 6. init-subclass
- ✓ 轻量版登场卡、真机注册输出、原则对比表，CSS/SVG 自绘

### 7. closing
- ✓ 三层塔、四期拼图汇合、系列同款终端 CTA，CSS/SVG 自绘
- ⚠️ Python 官方 logo 如需使用请用户提供；否则纯文字排版
