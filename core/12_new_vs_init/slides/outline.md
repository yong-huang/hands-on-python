# Video Outline

> **标题**：一个对象的诞生 —— Python `__new__` 与 `__init__` 各干了什么
> **主题**：待定（Checkpoint Plan 对齐后填入 theme-id）
> **总时长**：约 3 分 23 秒（口播 ~630 汉字 / 含术语英文 ~1160 字符，按系列中值 ~3.5 字/秒；各步估时累加 203 秒）
> **章节数**：8 章 / 35 步
> **内容裁剪说明**：article 的 What / Why / 四场景实现与真实输出全保留（管生管养
> 心智模型、Tracked 调用顺序、缓存 is True、UpperStr / LimitedInt、工厂静默、
> 缓存命中坑）；刻意压缩：职责划分的静态方法声明细节、Q&A 对比表（压成分工卡）、
> Deep Dive「为什么在这里设属性」注释（并进缓存章画面细节）、元类实现单例的展开
> （只在坑章给出口）。诚实预期（内存地址每次不同）保留为一个独立节拍。

---

## 1. hook — 一个对象的诞生（4 steps · ~18s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 悬念原句：`MyClass()` 看似一行代码，背后实际是两步 —— 来源 article 引言 L3
- 两步主角：`__new__` 分配内存返回实例、`__init__` 设置属性 —— 来源 article 引言 L3-4
- 常见误解锚点：平时只写 `__init__` 没问题 —— 来源 article 引言 L4 / §Why L14
- 悬念升级：不知道 `__new__` 的存在就寸步难行 —— 来源 article 引言 L5

**开发计划**：

- step 1 (~4s) — 片头标题页：主标「一个对象的诞生」+ 副标「Python `__new__` vs `__init__`」+ 右下工程图签
- step 2 (~4s) — 一行 `MyClass()` 大字上屏，旁边追问「这一行，背后发生了什么？」
- step 3 (~7s) — 误解对比：写了多年 Python 一次 `__new__` 没写过 vs 第一反应「调 `__init__` 呗」
- step 4 (~3s) — 悬停金句：「对，但只对了一半。」留悬崖

口播节选：
> 今天讲 Python 对象的出生。就一个问题：MyClass() 这一行，背后到底发生了什么。……对，但只对了一半。

---

## 2. two-steps — 管生与管养：两步生命周期（5 steps · ~43s）

**信息池**：
- 职责定义：`__new__` 负责分配内存并返回实例，`__init__` 负责初始化属性 —— 来源 article §What L10
- 心智模型金句：`__new__` 决定「给哪个对象」，`__init__` 只负责「初始化它」 —— 来源 article §What L10
- 实验输出：`__new__ called (#1) -> creating instance of Tracked` / `__init__ called -> initializing <...0x1013e8440>` —— 来源 article 输出 L28-29
- 诚实预期：实例内存地址每次运行都不同，顺序不变 —— 来源 article 诚实预期 L67
- 分工细节：`__new__` 首参 `cls`、`__init__` 首参 `self`、`__init__` 返回 `None` 被忽略 —— 来源 article Q&A 表 L165-168 / 职责划分 L87
- 调用顺序：`MyClass()` → `__new__` → 返回 instance → `__init__` —— 来源 article L88

**开发计划**：

- step 1 (~11s) — 两步流水线：第一步 `__new__`「分配内存，把实例造出来」→ 第二步 `__init__`「往实例里填属性」
- step 2 (~5s) — 金句 hero：「`__new__` 管生，`__init__` 管养」
- step 3 (~8s) — 终端模拟：`Tracked()` 实例化一次，两行日志上屏（`__new__ called (#1)` → `__init__ called`）
- step 4 (~8s) — 顺序结论：先 `__new__` 后 `__init__` 雷打不动；mono 角标「地址每次不同，看顺序」
- step 5 (~11s) — 分工卡两列：`cls` vs `self`、必须返回实例 vs 返回 `None` 被忽略

口播节选：
> 第一步，__new__，分配内存，把实例造出来。第二步，才是 __init__，往实例里填属性。一句话记住：__new__ 管生，__init__ 管养。

---

## 3. when — object 兜底与三个绕不开的场景（3 steps · ~15s）

**信息池**：
- 兜底事实：`__new__` 在父类 `object` 里，绝大多数场景只需要 `__init__` —— 来源 article §Why L14
- 转折原句：需要子类化不可变类型、单例/缓存、控制实例创建（如连接池）时，`__init__` 拿到的 `self` 已经是创建完成的实例，改不动了 —— 来源 article §Why L14
- 三场景清单：不可变类型子类化 / 单例缓存 / 工厂返回不同类型 —— 来源 article Q2 L174-178

**开发计划**：

- step 1 (~9s) — 反问上屏「平时只写 `__init__`，为什么从没出过事？」+ 答案：`object` 在背后帮你调
- step 2 (~3s) — 转折 hero：「但有三个场景，`__init__` 真的不够用」
- step 3 (~3s) — 三张场景卡齐亮：实例缓存 / 不可变子类 / 工厂

口播节选：
> 那平时只写 __init__，为什么从来没出过事？因为 __new__ 藏在父类 object 里，Python 悄悄帮你调了。但有三个场景，__init__ 真的不够用。

---

## 4. caching — 场景一：实例缓存，`__new__` 变仲裁者（5 steps · ~29s）

**信息池**：
- 机制代码：`__new__` 里放 `_cache` 字典，进来先查缓存，命中直接返回旧实例 —— 来源 article §实例缓存 L94-102
- 未命中路径：`super().__new__(cls)` 分配新实例，`cls._cache[key] = instance` 存入 —— 来源 article L98-102
- 实测输出：`created new instance for 'a'` → 再次实例化 `returning cached instance for 'a'`，`a1 is a2: True`，`a1 is b: False` —— 来源 article 输出 L33-42
- 应用清单：单例、数据库连接池、配置对象 —— 来源 article L105
- 画面细节：缓存键 `instance.key = key` 由 `__new__` 写入，此刻 `__init__` 尚未运行 —— 来源 article Deep Dive L148-149

**开发计划**：

- step 1 (~6s) — `__new__` 内部视图：一个 `_cache` 字典 + 「进来先查」的判断分支
- step 2 (~4s) — 命中路径：旧实例直接还回去
- step 3 (~5s) — 未命中路径：`super().__new__(cls)` 分配新实例 → 存入缓存
- step 4 (~9s) — 实测输出：`CachedInstance('a')` 建两次 → `a1 is a2: True`；换个 key 再建 → `a1 is b: False`
- step 5 (~5s) — 应用三连：单例 / 连接池 / 配置对象

口播节选：
> 命中了，直接把旧实例还回去。……同一个 key 实例化两次，拿到的是同一个对象。is 一判断，True。

---

## 5. immutable — 场景二：不可变类型，`__init__` 改不动（6 steps · ~36s）

**信息池**：
- 需求代码：`UpperStr(str)`，`__new__` 里 `super().__new__(cls, value.upper())` —— 来源 article §不可变类型的子类化 L108-115
- 核心原理：值在 `__new__` 返回时就已确定，`__init__` 改不动 —— 来源 article L123
- `__init__` 副业：`self.original = value` 记原始值 —— 来源 article L114-115
- 实测输出：`UpperStr('hello world'): 'HELLO WORLD'`、`s.original: hello world`、`isinstance(s, str): True` —— 来源 article 输出 L45-47
- int 佐证：`LimitedInt(150, 0, 100): 100`、`isinstance(n, int): True` —— 来源 article 输出 L49-50 / 代码 L116-120

**开发计划**：

- step 1 (~8s) — 需求上屏：想要一个自动转大写的 str 子类 `UpperStr`
- step 2 (~7s) — 错误尝试：在 `__init__` 里改值 → 「字符串早就铸好了」，改不动
- step 3 (~5s) — 原理 hero：不可变类型的值，在 `__new__` 返回那一刻定死
- step 4 (~5s) — 正确写法：转换写进 `__new__`，`value.upper()` 直接喂给父类
- step 5 (~4s) — `__init__` 的副业：只能记一笔 `original` 原始值
- step 6 (~7s) — int 佐证：`LimitedInt(150)` → `100`，`isinstance` 一查还是 `int`

口播节选：
> 轮到 __init__ 的时候，字符串早就铸好了。不可变类型的值，在 __new__ 返回那一刻就定死了。所以转换必须写进 __new__。

---

## 6. factory — 场景三：工厂，返回别的类型（4 steps · ~17s）

**信息池**：
- 工厂代码：`__new__(cls, kind)` 里 `kind == "list"` 返回 `[]`、`"dict"` 返回 `{}` —— 来源 article §工厂模式 L127-134
- 副作用：`__new__` 返回非 `cls` 实例时，`__init__` 不会被调用 —— 来源 article L136 / Deep Dive L157
- 内置同款：`int()`、`str()` 等内置类型就是这样工作的 —— 来源 article L136
- 实测输出：`Factory('list'): [] (type: list)`、`Factory('dict'): {} (type: dict)` —— 来源 article 输出 L53-54

**开发计划**：

- step 1 (~3s) — 需求 hero：`Factory`，一个类当工厂使
- step 2 (~6s) — 分支演示：要 `list` 还你 `[]`，要 `dict` 还你 `{}`（type 标签跟着变）
- step 3 (~4s) — 副作用警示：`__init__` 压根不会执行，静默
- step 4 (~4s) — 内置同款：`int()`、`str()` 就是这么工作的

口播节选：
> __new__ 可以不返回本类的实例。要 list 还你一个 list，要 dict 还你一个 dict。这时候有个副作用：__init__ 压根不会执行。

---

## 7. pitfall — 藏着的坑：缓存命中，`__init__` 仍执行（5 steps · ~24s）

**信息池**：
- 坑的实证：第二次 `CachedInstance('a')` 仍打印 `__init__` 行，不是 bug —— 来源 article 输出 L36-37 / 诚实预期 L68
- 坑的机理：跳过的是创建不是初始化，返回已注册实例后 Python 照样调 `__init__`（重新初始化）—— 来源 article Deep Dive L145-146 / L156
- 解法清单：`__init__` 加标志位检查，或改用元类/装饰器实现单例 —— 来源 article L156
- 关键规则：`__new__` returns non-cls instance → `__init__` NOT called —— 来源 article 输出 L62

**开发计划**：

- step 1 (~8s) — 缓存命中回放：`__new__` 把旧实例还回去了（复用缓存章的分支视图）
- step 2 (~4s) — 反转：日志里 `__init__` 那行还是打了（输出高亮）
- step 3 (~3s) — 金句 hero：跳过的是创建，不是初始化
- step 4 (~3s) — 代价：初始化很贵的代码被白跑一次
- step 5 (~6s) — 两个解法：`__init__` 加标志位 / 换元类做单例

口播节选：
> 缓存命中，__new__ 把旧实例还回去了。但 __init__ 还是会跑一遍。跳过的是创建，不是初始化。

---

## 8. closing — 心智模型与去哪儿练（3 steps · ~21s）

**信息池**：
- 心智模型原句：`__new__` 决定「给哪个对象」，`__init__` 只负责「初始化它」 —— 来源 article §What L10
- 第二条铁律：返回的不是 `cls` 实例，`__init__` 就不执行 —— 来源 article §What L10 / 输出 L62
- 仓库定位：hands-on-python，本实验零第三方依赖 —— 来源 article §How L18-21
- 运行命令：`cd core/12_new_vs_init && python3 new_vs_init.py` —— 来源 article How L19-20

**开发计划**：

- step 1 (~6s) — 心智模型 hero：「`__new__` 决定给哪个对象，`__init__` 只负责初始化它」
- step 2 (~5s) — 第二条铁律：`__new__` 返回的不是本类实例 → `__init__` 直接不执行
- step 3 (~10s) — CTA：hands-on-python 仓库路径 mono 字体，零依赖 `python3` 一跑就有体感，下期见

口播节选：
> __new__ 决定给哪个对象，__init__ 只负责初始化它。……零依赖，python3 一跑就有体感。链接在评论区，下期见。

---

## 素材清单

### 1. hook
- ✓ 全部画面为文字排版 / 图形演示，无需外部图片

### 2. two-steps
- ✓ 两步流水线、分工卡、Tracked 终端模拟，代码 / 图形绘制

### 3. when
- ✓ 三张场景卡，CSS 自绘

### 4. caching
- ✓ `_cache` 字典分支视图、is 对比输出，代码 / 图形绘制

### 5. immutable
- ✓ 铸造意象（字符串定死）、UpperStr / LimitedInt 终端输出，CSS/SVG 自绘

### 6. factory
- ✓ 分支返回演示（`[]` / `{}` + type 标签），代码 / 图形绘制

### 7. pitfall
- ✓ 缓存分支复用 + 输出高亮反转，CSS 自绘

### 8. closing
- ✓ 仓库路径 mono 排版
- ⚠️ 可选：hands-on-python 仓库截图（如需真实截图请用户提供，或用 placeholder）
- ⚠️ 如想挂 Python 官方 logo 需用户提供；否则纯文字「Python」排版
