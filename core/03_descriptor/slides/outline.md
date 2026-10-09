# Video Outline

> **标题**：obj.attr 背后 —— Python 描述符协议与属性查找链
> **主题**：待定（Checkpoint Plan 对齐后填入 theme-id）
> **总时长**：约 5 分 40 秒（口播 ~1030 汉字 / 含标点英文 ~1760 字符；中值折算约 5 分 10 秒，各步估时累加 346 秒；本期口径为实现走足，比前两期长）
> **章节数**：8 章 / 40 步
> **内容裁剪说明**：按用户反馈「实现讲太少」，本期**实现全保留**——协议三方法、
> `__set_name__`、查找链四步、TypedField / CachedProperty / LazyField 三个实现逐一走读
> （含 article 真实输出行），信息保留度目标 ≥ 75%。
> 仅不展开：LoggedField 细节（一句带过）、demo [4][5] 省略段、性能讨论（L76）。

---

## 1. hook — obj.attr 不是查字典（4 steps · ~35s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 场景原型：`obj.attr` 的访问不是简单查 `obj.__dict__` —— 来源 article 导语 L5
- 三件套同源：`property` / `classmethod` / `staticmethod` 底层同一套协议 —— 来源 article 导语 L4
- 符号主角：定义 `__get__` / `__set__` 的类放在类属性上即可拦截读写 —— 来源 article §What L10
- 系列衔接：上一期 with（`__enter__` / `__exit__` 协议），本期更底层 —— 来源 article 导语 L3

**开发计划**：

- step 1 (~9s) — **片头标题页**：主标「obj.attr 的底牌」+ 副标「Python 描述符协议 · 查找链 · 四个实战模式」+ 右下工程图签
- step 2 (~10s) — 大号 `obj.attr` 代码字样 + 「Python 不是查个字典就完事的」
- step 3 (~7s) — 三件套名字排开：property / classmethod / staticmethod，打上「同一套底层」连接线
- step 4 (~9s) — 巨型「描述符」点名：`__get__` / `__set__` 双钩卡 + 类属性位示意

口播节选：
> 今天讲 Python 描述符。协议怎么写，查找链怎么走，四个实战模式，手写一遍。……它叫描述符。obj.attr 的读写，就归它管。

---

## 2. protocol — 协议三方法（5 steps · ~43s）

**信息池**：
- 协议代码：`__get__(self, obj, objtype=None)` / `__set__(self, obj, value)` / `__delete__(self, obj)` —— 来源 article 代码 L80-93
- obj 语义：实例访问时是实例；类访问 `User.age` 时 obj 为 `None` —— 来源 article 代码 L83 / Q2 L169
- objtype 语义：`User.age` 调用 `__get__(None, User)`，`u.age` 调用 `__get__(u, User)` —— 来源 article Q2 L169
- 挂载位置：描述符实例放**类属性**上，不是实例上 —— 来源 article §What L10
- `__set_name__`：类创建时自动调用 `(self, owner, name)`，自动拿到属性名（3.6+）—— 来源 article L97-104

**开发计划**：

- step 1 (~8s) — 协议代码卡：三个方法逐个高亮（读/写/删三枚标签）
- step 2 (~7s) — `__get__` 签名解剖：`obj` / `objtype` 两个参数分别指什么（引线标注）
- step 3 (~9s) — 类访问陷阱卡：`User.age` → `obj=None`，不判断直接崩（崩的瞬间演示）
- step 4 (~8s) — 挂载位置对错卡：实例身上 ✕（只是普通属性）vs 类属性身上 ✓（读写全经过）
- step 5 (~11s) — `__set_name__` 代码卡：`age = TypedField()` → `age.name` 自动变 `"age"`（箭头自动送名）

口播节选：
> 三个魔法方法：__get__ 管读，__set__ 管写，__delete__ 管删。……写好的描述符往哪放？放类的属性上。

---

## 3. chain — 两类描述符与查找链（6 steps · ~49s）

**信息池**：
- 分类标准：定义 `__set__` 或 `__delete__`（即使没有 `__get__`）= 数据描述符；只定义 `__get__` = 非数据 —— 来源 article §What L12-13
- 查找链伪代码四步：① type(obj).__dict__ 数据描述符 → ② obj.__dict__ → ③ 非数据描述符 → ④ AttributeError —— 来源 article Deep Dive L121-127
- 口诀原句：数据描述符 > 实例 `__dict__` > 非数据描述符 —— 来源 article L129
- 机制位置：`__getattribute__` 每次属性访问都经过 —— 来源 article L119
- 承上启下：四个实战模式全部基于此链 —— 来源 article §Why L17

**开发计划**：

- step 1 (~6s) — 分类标准上屏：有没有 `__set__`，一条标准切两类
- step 2 (~8s) — 两类对照卡：数据描述符（有 `__set__`）vs 非数据描述符（只有 `__get__`）
- step 3 (~8s) — 查找链引入：`obj.attr` 每次都走固定顺序（`__getattribute__` 角标）
- step 4 (~11s) — 四步链逐段点亮：① 数据描述符 `__get__` → ② 实例 `__dict__` → ③ 非数据描述符 → ④ AttributeError
- step 5 (~8s) — 口诀 hero：数据描述符 > 实例字典 > 非数据描述符（三个词条不等式）
- step 6 (~8s) — 悬念收尾：四个实战模式全在这条链上做文章

口播节选：
> 顺序是：数据描述符最优先。然后实例的 __dict__。然后非数据描述符。……口诀给你。

---

## 4. typed — TypedField 验证字段（6 steps · ~56s）

**信息池**：
- 需求：age 必须 int、范围 0–150 —— 来源 article 四模式 L108 / 输出 L33-37
- 实现要点：`__set_name__` 记属性名供报错；`__set__` 做类型/范围校验 —— 来源 article L98-104 / L108
- 真实输出：`TypeError: age: expected int, got str` —— 来源 article 输出 L34
- 真实输出：`ValueError: age: must >= 0` / `must <= 150` —— 来源 article 输出 L36-37
- 数据描述符权力：`obj.__dict__` 塞同名 key 也拦得住，读仍走 `__get__` —— 来源 article L145 / 输出 L62-66
- 反面坑：漏定义 `__set__` → 降级非数据描述符，验证整个被绕过 —— 来源 article 踩坑 L149

**开发计划**：

- step 1 (~8s) — 需求卡：age 必须 int、0–150（验证规则两条）
- step 2 (~7s) — 代码走读①：`__set_name__` 记下属性名（name 送入示意）
- step 3 (~8s) — 代码走读②：`__set__` 校验逻辑（TypeError / ValueError 两条出口）
- step 4 (~11s) — 真机终端：`TypeError: age: expected int, got str` + `ValueError: age: must <= 150` 逐行输出
- step 5 (~10s) — 权力演示：往 `obj.__dict__` 塞同名 key，读仍走 `__get__` 校验（拦截示意）
- step 6 (~12s) — 反面警示：漏写 `__set__` → 降级非数据 → 坏值直进字典（降级箭头 + 绕过演示）

口播节选：
> __set__ 里做校验。类型不对，抛 TypeError。……但你漏写 __set__，它就降级成非数据描述符。

---

## 5. cached — CachedProperty 缓存属性（7 steps · ~62s）

**信息池**：
- 需求：stats 只算一次 —— 来源 article 四模式 L109 / 输出 L39-42
- 非数据判定：只定义 `__get__` → 自动成为非数据描述符 —— 来源 article 核心代码 L134
- 核心代码：`value = self.factory(obj)` 首次计算；`obj.__dict__[self.name] = value` 写回 —— 来源 article L138-139
- 为什么写回（article 原话）：非数据描述符优先级低于实例 `__dict__`，下次直接命中字典，`__get__` 不再被调用 —— 来源 article L140-141
- 铁证输出：访问两次 `Compute count: 1` —— 来源 article 输出 L42
- 软肋输出：`After override: {'hacked': True}`（非数据：实例字典 wins），是设计不是 bug —— 来源 article 输出 L45 / 踩坑 L151 / Q3 L173

**开发计划**：

- step 1 (~8s) — 需求卡：stats 算一次就够（两次访问、一次计算的对比预设）
- step 2 (~8s) — 代码走读①：只定义 `__get__`（「自动成为非数据描述符」判定标签）
- step 3 (~6s) — 代码走读②：首次访问 `factory(obj)` 计算
- step 4 (~9s) — 核心一行 hero：`obj.__dict__[self.name] = value`（放大 + 划线）
- step 5 (~12s) — 为什么写回：查找链回放——写回字典后，下次字典优先命中，`__get__` 不再被调
- step 6 (~7s) — 真机终端：访问两次 → `Compute count: 1`（铁证章）
- step 7 (~12s) — 软肋演示：字典塞入 stats → `{'hacked': True}`（「设计代价，不是 bug」章）

口播节选：
> 核心的一行来了：obj.__dict__[self.name] = value。……下次访问，字典直接命中，__get__ 根本不会再被调用。

---

## 6. lazy — LazyField 惰性加载（4 steps · ~38s）

**信息池**：
- 需求：HeavyResource 重资源，创建时零初始化，用到才建 —— 来源 article 输出 L48 / 四模式 L110
- 实现要点：`__init__` 只存 factory；`__get__` 查实例字典，没有才调 factory 并写回 —— 来源 article 四模式 L110 / 输出 L49-52
- 真实输出：`HeavyResource created (nothing initialized yet)` —— 来源 article 输出 L48
- 真实输出：`[LazyField] Initializing database connection...`；二次访问 `same object: True` —— 来源 article 输出 L50-53
- 同族：LoggedField 读写审计（数据描述符，同骨架）—— 来源 article 四模式 L111 / 输出 [4] 省略 L58

**开发计划**：

- step 1 (~9s) — 需求卡：HeavyResource 很重，创建时什么都别连
- step 2 (~11s) — 代码走读：`__init__` 存 factory（零动作）→ `__get__` 查字典→没有才建→写回（三拍流程）
- step 3 (~11s) — 真机终端：`HeavyResource created (nothing initialized yet)` → 访问 database 才 `Initializing...`
- step 4 (~7s) — 二次访问 `same object: True` + LoggedField 一句带过（同骨架角标）

口播节选：
> HeavyResource created，此时啥也没连。访问 database，才打印 Initializing database connection。

---

## 7. stdlib — property 与标准库（5 steps · ~40s）

**信息池**：
- 论断：`property` 本质是数据描述符；`@property` 是语法糖（创建描述符挂类属性）—— 来源 article Q1 L157-165
- 验证代码：`hasattr(p, "__get__")` / `hasattr(p, "__set__")` 均 True —— 来源 article Q1 L159-163
- 同族：`classmethod` / `staticmethod` 也是描述符，借装饰器语法挂类属性 —— 来源 article L115 / Q4 L177
- 与装饰器对比：都在不改调用方代码的前提下改行为；装饰器拦**函数调用**层面，描述符拦**属性访问**层面 —— 来源 article Q4 L177

**开发计划**：

- step 1 (~8s) — 论断卡：property = 数据描述符（回放第 3 章两分法定 位）
- step 2 (~10s) — hasattr 真机验证：`__get__` True / `__set__` True 逐行输出
- step 3 (~6s) — 语法糖展开：`@property` ≈ 创建描述符并挂到类属性
- step 4 (~8s) — 同族点名：classmethod / staticmethod 同为描述符（三件套回收 hook）
- step 5 (~8s) — 对比卡：装饰器拦 `f()` 调用 vs 描述符拦 `obj.attr` 读写（两个层面并列）

口播节选：
> hasattr 一查，__get__、__set__ 全在。……装饰器拦函数调用，描述符拦属性读写。

---

## 8. closing — 会用 vs 理解（3 steps · ~24s）

**信息池**：
- 收束：验证 / 缓存 / 惰性全是查找链上的把戏 —— 来源 article §Why L17 / L129
- 金句：分得清「会用 Python」和「理解 Python」—— 来源 article 导语 L6
- 仓库：hands-on-python，零依赖，`cd core/03_descriptor && python3 descriptor.py` —— 来源 article §How L22-23
- 系列回收：装饰器（函数层）→ 上下文管理器（with 协议）→ 描述符（属性访问层）—— 来源系列前两期

**开发计划**：

- step 1 (~8s) — 链条回收：三模式（验证/缓存/惰性）汇入同一条查找链（converge 线）
- step 2 (~7s) — 金句卡：会用 Python vs 理解 Python（对照排版）
- step 3 (~9s) — CTA：终端卡 `cd core/03_descriptor` + `python3 descriptor.py` + 双 chip（decorator 同款收尾）

口播节选：
> 分得清「会用 Python」和「理解 Python」的，就是这种东西。……链接在评论区，下期见。

---

## 素材清单

### 1. hook
- ✓ 大号代码字排版 / 三件套连接线 / 双钩卡，CSS/SVG 自绘

### 2. protocol
- ✓ 协议代码卡逐方法高亮、签名引线标注、`__set_name__` 送名箭头，代码 / 图形绘制

### 3. chain
- ✓ 四步查找链逐段点亮、口诀不等式排版，CSS/SVG 自绘

### 4. typed
- ✓ 代码走读卡、真机终端（article 真实输出行）、字典塞值拦截示意，CSS/SVG 自绘

### 5. cached
- ✓ 核心一行放大、查找链回放、`Compute count: 1` 铁证章、hacked 覆盖演示，CSS/SVG 自绘

### 6. lazy
- ✓ 三拍流程图、真机终端（HeavyResource 输出），CSS/SVG 自绘

### 7. stdlib
- ✓ hasattr 终端验证、语法糖展开、两层面对比卡，CSS/SVG 自绘

### 8. closing
- ✓ 三模式 converge 汇入查找链、金句对照排版、decorator 同款终端 CTA，CSS/SVG 自绘
- ⚠️ Python 官方 logo 如需使用请用户提供；否则纯文字排版
