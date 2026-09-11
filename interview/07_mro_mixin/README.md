# 07 · MRO 与 Mixin：C3 线性化下 `super()` 到底调用谁

> 上一实验里 `SlotPoint.x` 是个 member_descriptor——属性的存取由描述符协议接管；
> 多继承下，**方法**按什么顺序找，也有自己的一套规则。`super()` 名字里带个 "super"，
> 人人都以为它是"调用父类"，可一到多继承就出错——它其实是"MRO 中的下一个"。
> 本实验用钻石继承和 Mixin 组合把这条链看清楚。

## 1. 为什么需要它

当类有多继承时，Python 用 **C3 线性化算法**确定方法查找顺序（MRO, Method Resolution Order）。没有这个算法，两个父类重载了同一个方法时查找顺序就无从谈起；钻石继承里 `A` 的方法可能被执行两次。C3 给出确定且唯一的顺序，而 `super()` 不是"调用父类"，而是"MRO 中的下一个"——理解这一点是正确使用多继承和 Mixin 的前提。

Mixin 是一种通过多继承实现的可插拔功能模式：每个 Mixin 提供单一功能，业务类通过组合多个 Mixin 获得所有能力——它能否正确工作，完全取决于 `super()` 沿 MRO 协作转发。

## 2. 总览：核心机制一图看懂

![MRO：d.greet() 的 super() 链](images/mro_mixin.svg)

一句话心智模型：**`super()` = "MRO 中我之后的下一个类"，不是"我的父类"**。看图时跟着 `d.greet()` 的调用链走：D → B → C → A（B 的 `super()` 跳向 C，不是父类 A！），结果沿链原路回传——每个类只被调用一次由 C3 保证。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/interview/07_mro_mixin/images/mro_mixin.html)
> （或本地打开 [`images/mro_mixin.html`](images/mro_mixin.html)）。

## 3. 快速开始

```bash
cd interview/07_mro_mixin
python3 mro_mixin.py          # 运行全部 demo
```

真实输出示例（macOS, CPython 3.10，节选）：

```
[1] Diamond inheritance MRO:
  D(B, C) MRO: D -> B -> C -> A -> object

  Calling D().greet():
  D.greet()  [MRO index: 0]
  B.greet()  [MRO index: 1]
  C.greet()  [MRO index: 2]
  A.greet()  [MRO index: 3]
  A.greet() called exactly ONCE (C3 guarantees)

[2] super() is NOT 'call parent':
  Creating MyService():
  MyService.__init__ starts
  MixinLog.__init__ called by MyService
  MixinValidate.__init__ called by MyService
  Base.__init__ called by MyService

[4] Mixin with validation:
  Product('', -1) validate: ['Invalid name: ', 'Invalid price: -1']
```

诚实预期（本机实测）：

- 全部输出**确定性可复现**：MRO 序列、`A.greet()` 恰好调用一次、super() 链顺序每次运行完全一致
- 陷阱提示：如果 Mixin 的 `__init__` 里不调 `super().__init__()`，链条会在该 Mixin 处中断，后面的 `MixinValidate`/`Base` 都不会被初始化——这是多继承最常见的静默 bug，本 demo 的三个 Mixin 都正确转发
- `object.__init__()` 在链条末尾经由 `Base` 的 `super().__init__()` 调到，只是不打印，demo 输出看不到它，属预期

## 4. 核心概念

### 4.1 C3 线性化

```
D(B, C)  → B(A), C(A)
MRO: D → B → C → A → object
```

C3 保证：
- **单调性**：子类的 MRO 中父类顺序与父类自身 MRO 一致
- **局部优先**：先出现的父类优先
- **唯一性**：每个类在 MRO 中只出现一次

### 4.2 super() 的真实行为

```python
class MyService(MixinLog, MixinValidate, Base):
    def __init__(self):
        super().__init__()  # 调用 MRO 中的下一个，不是"父类"
```

`super()` 不是调父类，而是调 MRO 中"当前类之后"的第一个类。

### 4.3 Mixin 设计原则

1. **不维护状态**：只提供方法，不用 `__init__`（或调用 `super().__init__`）
2. **放在继承列表左侧**：`class User(JSONMixin, ReprMixin):`
3. **以 Mixin 后缀命名**：明确标识这是 Mixin
4. **不独立使用**：Mixin 依赖业务类提供的基础属性

## 5. 关键代码解析

最能体现机制的是 **`super()` 如何沿 MRO 协作转发**（demo [2] 的调用顺序）：

```python
class MyService(MixinLog, MixinValidate, Base):
    def __init__(self):
        super().__init__()   # 为什么这行会依次唤醒三个类：super() 找的是
                             # MRO 中 MyService 之后的下一个类，每个 __init__
                             # 里再调 super()，链条 MyService → MixinLog →
                             # MixinValidate → Base → object 就串起来了
```

链条能走通的前提是**每一环都协作**：任何一个 Mixin 的 `__init__` 忘调 `super().__init__()`，链就断在那里。

坑清单：

- **Mixin 的 `__init__` 不调 `super().__init__()`**：链条在该 Mixin 处静默中断，后面的 `MixinValidate`/`Base` 都不会被初始化——多继承最常见的静默 bug
- **`ClassName.__init__(self)` 直接指定类**：绕过 MRO 链式调用，破坏整条链；Mixin 中永远用 `super()`
- **钻石结构里不写协作式 `super()` 而直接 `A.greet(self)`**：A 的代码会执行两次，C3 的"恰好一次"保证随之失效
- **`object.__init__()` 在链尾被调到但不打印**：demo 输出看不到它，属预期
- **示意图中的 super() 链是示意数据**（展示协作转发模式），不是某次运行的实录

## 6. 文件结构

```
07_mro_mixin/
├── README.md                  # 本教程文档
├── mro_mixin.py               # 主演示脚本：钻石继承 / super() 链 / Mixin 组合
└── images/
    ├── mro_mixin.json # 图源（typed JSON IR，可编辑重渲染）
    ├── mro_mixin.html # 交互示意图（浏览器打开）
    └── mro_mixin.svg  # 双主题矢量图（本 README §2 内嵌）
```

`mro_mixin.py` 内容：`1. Diamond inheritance (A → B,C → D)` MRO 基础 / `2. super() chain with Mixins` super() 真实行为 / `3. JSONMixin / ReprMixin / ValidateMixin` 实战 Mixin / `4. User / Product` Mixin 组合。

## 7. 深入要点

**Q1: 钻石问题（Diamond Problem）？**

B 和 C 都继承 A，D 继承 B 和 C。A 的方法被调用几次？答案：**恰好一次**——C3 线性化保证 A 在 MRO 中只出现一次（查找只命中一次）。注意这依赖 B、C 都用协作式 `super()` 转发：若 B、C 直接写 `A.greet(self)`，A 的代码就会执行两次。

**Q2: `super()` 和 `ClassName.__init__()` 的区别？**

```python
super().__init__()       # MRO 链式调用
ClassName.__init__(self)  # 直接调用指定类，破坏链
```

永远在 Mixin 中用 `super()`，否则会破坏 MRO 链。

**Q3: MRO 的顺序是怎么确定的？**

C3 线性化。`D(B, C)`（B、C 都继承 A）的 MRO 是 `D → B → C → A → object`；算法保证单调性（父类顺序与父类自身 MRO 一致）、局部优先（先出现的父类优先）、唯一性（每个类只出现一次）。

**Q4: 怎样设计一个合格的 Mixin？**

四原则：不维护状态（只提供方法，`__init__` 要么不用、要么调 `super().__init__`）；放在继承列表左侧；以 Mixin 后缀命名；不独立使用（依赖业务类提供基础属性）。

**Q5: 为什么 Mixin 要放在继承列表左侧？**

MRO 局部优先——先出现的父类在查找顺序中靠前。Mixin 放左侧（如 `class User(JSONMixin, ReprMixin):`）保证 Mixin 的方法优先于业务类自身的同名方法被找到。

## 8. 总结

1. **MRO 是 C3 线性化的结果**，保证单调性和唯一性
2. **super() = MRO 中的下一个**，不是"父类"
3. **Mixin = 纯功能类**，无状态、不独立使用
4. **Mixin 放在继承列表左侧**（MRO 优先级更高）

下一篇进入 [08_gil_concurrency](../08_gil_concurrency/README.md)：看 GIL 如何决定 threading / multiprocessing / asyncio 的选型。
