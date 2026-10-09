# Video Outline

> **标题**：魔术方法 —— 让自定义类像内置类型一样自然
> **主题**：待定（Checkpoint Plan 对齐后填入）
> **总时长**：约 3 分 20 秒（口播 ~500 汉字当量；各步估时累加 200 秒）
> **章节数**：6 章 / 20 步
> **口径说明**：延续系列压缩口径。实现讲足：`__repr__`/`__str__` 对比、`__eq__`+
> `__hash__` 契约、运算符重载全套、NotImplemented 哨兵回退、`@total_ordering`、
> `@dataclass`、容器协议全保留。仅不展开：`__hash__` 与 `PYTHONHASHSEED` 关系、
> 双目运算符完整反射链源码级细节、RingBuffer 内部实现。

---

## 1. hook — TypeError 与内存地址（4 steps · ~28s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 痛点一：`p1 + p2` 直接 TypeError —— 来源 article 导语 L3
- 痛点二：打印输出 `<Point object at 0x…>` —— 来源 article 导语 L3
- 痛点三：放进 set 去重全靠对象 id —— 来源 article 导语 L4
- 原因：类没有实现魔术方法（dunder methods）—— 来源 article 导语 L4-5

**开发计划**：

- step 1 (~7s) — 痛点 hero：`p1 + p2` → TypeError（真机终端红字）
- step 2 (~7s) — 痛点二：打印输出 `<Point object at 0x…>`（内存地址丑陋输出）
- step 3 (~7s) — 痛点三：set 去重全靠 id，值一样也不去重
- step 4 (~7s) — 点名：这些全是魔术方法——dunder methods（双下划线高亮）

口播节选：
> 自定义类的对象一做 p1 + p2，直接 TypeError。一打印就是 `<Point object at 0x…>`。

---

## 2. repr-str — `__repr__` 与 `__str__`（3 steps · ~20s）

**信息池**：
- 代码：`__repr__` 要 unambiguous（能还原对象）/ `__str__` 要 human-readable —— 来源 article L59-65
- 真机输出：`repr(p): Point(3, 4)` / `str(p): (3, 4)` —— 来源 article 输出 L34-35
- 定性：一个给调试，一个给显示 —— 来源 article L56

**开发计划**：

- step 1 (~7s) — 双卡对比：`__repr__`（调试/精确）vs `__str__`（显示/可读）
- step 2 (~7s) — 真机：`repr(p)` 输出 `Point(3, 4)`，`str(p)` 输出 `(3, 4)`
- step 3 (~6s) — 口诀收束：一个给调试，一个给人看

口播节选：
> repr 要 unambiguous——能还原对象。str 要 human-readable——给人看。

---

## 3. eq-hash — `__eq__` 与 `__hash__` 契约（4 steps · ~30s）

**信息池**：
- 代码：`__eq__` 判断 isinstance 后比较字段 / `__hash__` 用同一批字段 `hash((self.x, self.y))` —— 来源 article L77-83
- 契约原句：`a == b → hash(a) == hash(b)` 必须满足；反向允许哈希碰撞 —— 来源 article L110-112
- 真机输出：`p1 == p2: True` / `hash(p1) == hash(p2): True` / `d[p2]: origin` —— 来源 article 输出 L38-40
- 陷阱：只定义 `__eq__` 不定义 `__hash__` → `__hash__ = None` → 不可哈希 —— 来源 article 踩坑 L118

**开发计划**：

- step 1 (~8s) — `__eq__` 代码卡：isinstance 判断 + 字段比较
- step 2 (~8s) — `__hash__` 代码卡：同一批字段生成哈希（契约标注）
- step 3 (~7s) — 真机：`p1 == p2: True` / `hash(p1) == hash(p2): True`
- step 4 (~7s) — 坑：漏定义 `__hash__` → 对象不可哈希 → dict TypeError

口播节选：
> 两个必须配套——a == b 则 hash(a) == hash(b)。

---

## 4. ops — 运算符重载（4 steps · ~28s）

**信息池**：
- 代码：`__add__` 里 isinstance 判断 → 返回新 Point / 不认识 → 返回 NotImplemented 哨兵 —— 来源 article L71-74
- 真机输出：`Point(3, 4) + Point(1, 2) = (4, 6)` / `abs(Point(3, 4)) = 5.0` —— 来源 article 输出 L43-44
- NotImplemented vs NotImplementedError：前者是哨兵值，后者是异常 —— 来源 article Q1 L124-125
- 回退链：左操作数不认识 → 解释器改试右操作数反射方法 → 也没有 → TypeError —— 来源 article Deep Dive L105

**开发计划**：

- step 1 (~8s) — `__add__` 代码卡：isinstance 判断 + NotImplemented 哨兵（不抛异常）
- step 2 (~7s) — NotImplemented vs NotImplementedError 区别卡
- step 3 (~7s) — 回退链动画：左操作数 → 右操作数反射 → 都不认识 → TypeError
- step 4 (~6s) — 真机：`Point(3,4) + Point(1,2) = (4,6)` / `abs = 5.0`

口播节选：
> 不认识，返回 NotImplemented 哨兵，解释器再问右操作数的反射方法。

---

## 5. shortcuts — 两件套减样板（4 steps · ~28s）

**信息池**：
- `@total_ordering`：只写 `__eq__` + `__lt__`，自动生成 `__le__` / `__gt__` / `__ge__` —— 来源 article L89-93
- `@dataclass(order=True, frozen=True)`：自动生成 `__init__` / `__repr__` / `__eq__` + 全套比较 + 保留 `__hash__` —— 来源 article L96-101
- 容器协议：`__len__` / `__getitem__` / `__iter__`，RingBuffer 即用 —— 来源 article 组件表 L17

**开发计划**：

- step 1 (~8s) — `@total_ordering` 代码卡：只写 `__eq__` + `__lt__` → 自动生成 `__le__` / `__gt__` / `__ge__`
- step 2 (~8s) — `@dataclass` 代码卡：一行装饰器自动生成三方法
- step 3 (~6s) — 容器协议：`__len__` / `__getitem__` / `__iter__` 三卡
- step 4 (~6s) — 收束：魔术方法 = 让类像内置类型一样自然

口播节选：
> @dataclass 更省：__init__、__repr__、__eq__ 全自动。

---

## 6. closing — 何时用与系列回收（4 steps · ~24s）

**信息池**：
- 适用场景：需要自定义比较/运算/显示的类、需要做 dict key / set 去重的类 —— 来源 article §Why L21
- 描述符彩蛋：`__slots__` 的 member_descriptor 就是描述符协议 —— 来源 article（系列 callback）
- 系列衔接：描述符管属性存取、slots 管实例开销、魔术方法管运算与显示 —— 来源 系列前几期
- 仓库：hands-on-python，`cd core/09_magic_methods && python3 magic_methods.py` —— 来源 article How L24-25

**开发计划**：

- step 1 (~8s) — 适用场景卡：自定义比较/运算/显示、dict key、set 去重
- step 2 (~7s) — 彩蛋：`__slots__` 的 member_descriptor 就是描述符协议（描述符那期 callback）
- step 3 (~5s) — 系列衔接：描述符管属性 / slots 管开销 / 魔术方法管运算与显示
- step 4 (~4s) — CTA：hands-on-python 终端（系列同款收尾）

口播节选：
> 链接在评论区，下期见。

---

## 素材清单

### 1. hook
- ✓ TypeError 终端、内存地址丑输出、set 去重失败演示、dunder methods 点名，CSS/SVG 自绘

### 2. repr-str
- ✓ 双卡对比（repr vs str）、真机输出对照，CSS/SVG 自绘

### 3. eq-hash
- ✓ `__eq__` / `__hash__` 代码卡、契约关系图、真机输出、陷阱卡，CSS/SVG 自绘

### 4. ops
- ✓ `__add__` 代码卡、NotImplemented 哨兵卡、回退链动画、真机运算输出，CSS/SVG 自绘

### 5. shortcuts
- ✓ `@total_ordering` 代码卡、`@dataclass` 代码卡、容器协议三卡，CSS/SVG 自绘

### 6. closing
- ✓ 适用场景卡、描述符彩蛋流程、系列衔接图、系列同款终端 CTA，CSS/SVG 自绘
- ⚠️ Python 官方 logo 如需使用请用户提供；否则纯文字排版
