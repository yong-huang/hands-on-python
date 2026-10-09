# Video Outline

> **标题**：三种多态路线 —— Duck Typing / ABC / Protocol
> **主题**：待定（Checkpoint Plan 对齐后填入）
> **总时长**：约 3 分 10 秒（口播 ~510 汉字当量；各步估时累加 190 秒）
> **章节数**：6 章 / 20 步
> **口径说明**：延续压缩口径。实现讲足：Duck Typing 行为判定 + AttributeError 反例、
> ABC @abstractmethod + register 虚拟子类、Protocol @runtime_checkable、
> 三条路线失败点时机对照全保留。仅不展开：@runtime_checkable 只查方法不查签名、
> __subclasses__ 可见性差异、@abstractmethod vs raise NotImplementedError 对比。

---

## 1. hook — 三条多态路线（3 steps · ~17s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 系列衔接：魔术方法让自定义类像内置类型，但靠约定不靠约束 —— 来源 article 导语 L3
- 追问：想强制所有子类都实现 deliver()，光靠约定行吗 —— 来源 article 导语 L4
- 三路线预告：继承 / Duck Typing / Protocol —— 来源 article 导语 L5
- 核心问题：三条多态路线怎么选 —— 来源 article 标题 L1

**开发计划**：

- step 1 (~6s) — 回顾卡：魔术方法让类好用，但靠约定不靠约束
- step 2 (~5s) — 追问卡：想强制子类实现接口，光靠约定行吗？
- step 3 (~6s) — 三路线 chip 预告：继承 / Duck Typing / Protocol

口播节选：
> 如果你想强制所有子类都实现 deliver()，光靠约定行吗？继承、Duck Typing、Protocol 三条多态路线各管什么。

---

## 2. duck — Duck Typing 只看行为（4 steps · ~34s）

**信息池**：
- 核心原句：走起来像鸭子就是鸭子——关注对象是否有某个方法，不关注类型 —— 来源 article §What L10
- 代码：`quack(duck)` 只调 `duck.speak()` —— 来源 article L55-56
- 正例：`quack(Duck())` → "Quack!" —— 来源 article L58
- 反例：`quack(Person())` → AttributeError: no speak() —— 来源 article L59
- 失败时机：调用时才 AttributeError，接口约定全靠口头 —— 来源 article §Why L14

**开发计划**：

- step 1 (~8s) — Duck Typing 定义卡：走起来像鸭子就是鸭子（只看行为不看类型）
- step 2 (~9s) — 代码卡：`quack(duck)` 只调 `duck.speak()`
- step 3 (~8s) — 真机对照：Duck → "Quack!" ✓ / Person → AttributeError ✗（双卡对照）
- step 4 (~9s) — 灵活但有风险：接口约定全靠口头，调用时才炸

口播节选：
> 只关注对象是否有某个方法，不关注类型。……缺方法只会在调用时炸出 AttributeError。

---

## 3. abc — ABC 强制约束（5 steps · ~41s）

**信息池**：
- 代码：`class Transport(ABC)` + `@abstractmethod deliver / max_capacity` + 非抽象默认实现 `shipping_label` —— 来源 article L64-75
- 真机输出：`Cannot instantiate abstract class Transport with abstract methods deliver, max_capacity` —— 来源 article 输出 L32-33
- register()：`Transport.register(ExternalLogistics)` → 第三方类不继承也能过 isinstance —— 来源 article L75-76
- 真机：`isinstance(ExternalLogistics(), Transport): True` / `issubclass: True` —— 来源 article 输出 L36-37
- Ship 真机：`External delivery to Port C with 'Package'` —— 来源 article 输出 L38

**开发计划**：

- step 1 (~9s) — ABC 代码卡：Transport 基类 + @abstractmethod 两个方法 + shipping_label 默认实现
- step 2 (~8s) — 实例化校验：Transport() 直接 TypeError（未实现抽象方法的类第一次实例化就失败）
- step 3 (~8s) — register() 虚拟子类：第三方类不继承也能过 isinstance（isinstance True / issubclass True）
- step 4 (~8s) — 真机 Ship：External delivery to Port C（第三方类也能走 transport 管道）
- step 5 (~8s) — 小结：失败点提前到实例化时

口播节选：
> Cannot instantiate abstract class Transport with abstract methods deliver, max_capacity。

---

## 4. protocol — Protocol 结构化子类型（4 steps · ~30s）

**信息池**：
- 代码：`@runtime_checkable class Speakable(Protocol)` + `def speak(self) -> str: ...` —— 来源 article L81-87
- 真机：`isinstance(Duck(), Speakable): True` / `isinstance(Person(), Speakable): False` —— 来源 article 输出 L41-42
- 定位：Duck Typing 的灵活性 + isinstance 检查 —— 来源 article §What L10
- 细则角标：@runtime_checkable 只查方法存在，不查签名（签名级在 mypy）—— 来源 article 诚实预期 L50

**开发计划**：

- step 1 (~7s) — Protocol 代码卡：@runtime_checkable + Speakable
- step 2 (~8s) — 真机：isinstance(Duck(), Speakable)=True / isinstance(Person(), Speakable)=False
- step 3 (~8s) — 结合优点卡：Duck Typing 灵活性 + isinstance 检查
- step 4 (~7s) — 角标：只查方法存在不查签名（签名级在 mypy）

口播节选：
> isinstance(Duck(), Speakable): True。isinstance(Person(), Speakable): False。

---

## 5. compare — 失败点时机与选型（4 steps · ~28s）

**信息池**：
- 失败点三行：Duck Typing 调用时 AttributeError / ABC 实例化时 TypeError / Protocol isinstance 只查结构 —— 来源 article Deep Dive L97
- 选型速查：运行时检查 → Protocol / 强制实现 → ABC / 第三方类 → register —— 来源 article L91-93
- 金句：失败点越靠前，约束越强 —— 来源 article Deep Dive L97

**开发计划**：

- step 1 (~7s) — 失败点三行：Duck Typing（调用时）/ ABC（实例化时）/ Protocol（isinstance 检查时）逐行
- step 2 (~7s) — 选型速查卡：运行时检查 → Protocol / 强制实现 → ABC / 第三方类 → register
- step 3 (~7s) — 金句 hero：失败点越靠前，约束越强
- step 4 (~7s) — 系列回收：魔术方法管运算、MRO 管查找、ABC/Protocol 管多态约束

口播节选：
> 失败点越靠前，约束越强。

---

## 6. closing — 系列回收与 CTA（4 steps · ~24s）

**信息池**：
- 系列回收：魔术方法管运算显示、slots 管实例开销、MRO 管方法查找、ABC/Protocol 管多态约束 —— 来源 系列前几期
- 仓库指引：hands-on-python，`cd core/10_abc_duck_typing && python3 abc_duck_typing.py` —— 来源 article How L17-18

**开发计划**：

- step 1 (~7s) — 系列拼图回收：魔术方法 / slots / MRO / **ABC 与 Duck Typing**（第七块拼图）
- step 2 (~6s) — Python 每个环节都有协议（收束一句）
- step 3 (~11s) — CTA：hands-on-python 终端 + 双 chip（系列同款收尾）

口播节选：
> 完整代码在 hands-on-python 仓库，python3 一跑就有体感。链接在评论区，下期见。

---

## 素材清单

### 1. hook
- ✓ 回顾卡、追问卡、三 chip 预告，CSS/SVG 自绘

### 2. duck
- ✓ 定义卡、代码卡、Duck vs Person 双卡对照，CSS/SVG 自绘

### 3. abc
- ✓ ABC 代码卡、TypeError 真机、register 虚拟子类演示、Ship 真机、小结卡，CSS/SVG 自绘

### 4. protocol
- ✓ Protocol 代码卡、isinstance 真机、优点结合卡、角标，CSS/SVG 自绘

### 5. compare
- ✓ 失败点三行逐行、选型速查卡、金句 hero、系列回收，CSS/SVG 自绘

### 6. closing
- ✓ 系列拼图、收束句、系列同款终端 CTA，CSS/SVG 自绘
- ⚠️ Python 官方 logo 如需使用请用户提供；否则纯文字排版
