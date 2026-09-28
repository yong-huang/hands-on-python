# 07 · MRO 与 Mixin：C3 线性化下 `super()` 到底调用谁

> 多继承让"方法按什么顺序找"成为一个必须回答的问题。`super()` 名字里带个 "super"，
> 很多工程师以为它是"调用父类"，一到多继承就出错——它真正的含义是"MRO（Method Resolution Order，方法解析顺序：多继承下逐个查找方法的固定顺序）中的下一个"。
> 本篇用钻石继承和 Mixin（混入类）组合把这条查找链看清楚。

## Background

这节讲方法查找问题的来龙去脉：C3 出现之前人们怎么确定查找顺序、旧做法在哪儿撞墙、C3 如何取而代之。

单继承时代不成问题：沿继承链一层层往上找即可。多继承出现后，"先找 B 还是先找 C"必须有确定规则，否则同名方法的行为无法推理。

Python 早期版本采用深度优先、从左到右的查找：`D(B, C)` 先把 B 及其全部祖先找完，再找 C。规则本身简单，代价是两类撞墙场景：钻石继承里 B 和 C 都继承 A，深度优先会让 A 被访问两次；两个父类重载同一个方法时，顺序也难以既符合直觉又无歧义。

Python 2.3 起改用 C3 线性化——把继承图计算成一条唯一、确定的线性顺序的算法——每个类的查找顺序在类创建时就定死。正是在这条确定顺序之上，Mixin 这类依赖链式协作的模式才成为可能。

## What

这节给出 MRO 与 Mixin 的定义，并用一个类比建立心智模型。

多继承时，方法查找顺序由 MRO（Method Resolution Order，方法解析顺序）决定，而这个顺序由 C3 算法算出。

一句话心智模型：**`super()` = "MRO 中我之后的下一个类"，不是"我的父类"**。落到例子上：钻石继承（继承图呈菱形——B、C 都继承 A，D 再继承 B 和 C）里 `D(B, C)` 的 MRO 是 `D → B → C → A`，B 的 `super()` 跳向 C 而非父类 A。

可以把 `super()` 想象成接力赛里的接力棒：持棒者不关心上一棒是谁，只负责传给队列中的下一位。但和普通接力不同的是，队列顺序由 C3 在类创建时算死，运行途中不能换人。

Mixin（混入：通过多继承给业务类附加单一功能的可插拔类）是与 MRO 配套的工程模式：每个 Mixin 提供单一功能，业务类组合多个 Mixin 获得所有能力。它能否正确工作，完全取决于 `super()` 沿 MRO 协作转发（每个环节都调用 `super()` 把控制权交给下一个类）。

## When to Use

这节给判断依据：什么场景适合 Mixin + 多继承，什么场景选别的方案。

典型场景——在做什么事的时候：

- 给多个业务类附加横切能力（日志、校验、JSON 序列化）时，把每个能力写成一个 Mixin，业务类按需组合——demo 里的 `MixinLog`、`MixinValidate` 就是这类
- 需要扩展第三方或框架的类、又不能改动其继承树时，往继承列表里插一个自己的 Mixin
- 使用以 Mixin 为组装方式的框架时，比如 Django 的通用视图就是由多个 Mixin 拼出来的，读懂 MRO 才能读懂行为

何时不用：

- 只需复用一个能力时，组合（把功能对象作为属性持有）更简单，不必引入多继承
- 继承层次已经很深时再加 Mixin，MRO 会变得难以人工推理
- 各功能之间有状态耦合、需要共享内部实现时，Mixin 的"单一功能"边界会被打破

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|:---|:---|:---|
| 单继承基类 | 一条直线链，无顺序歧义 | 能力有明确的层次归属 |
| Mixin 多继承 | 多能力可插拔组合，依赖协作式 `super()` | 能力彼此正交、需要自由组合 |
| 组合 | 功能对象作为属性，不并入方法查找 | 需要运行时替换实现 |
| 装饰器 | 包装单个类，不改继承结构 | 只想增强某一个类的行为 |

## Quick Start

这节运行实验脚本，给出真实输出与两条预期说明。前置条件：Python 3（C3 线性化自 2.3 起是默认行为）。

```bash
cd core/07_mro_mixin
python3 mro_mixin.py          # 运行全部 demo
```

真实输出示例（节选）：

```
[1] Diamond inheritance MRO:
  D(B, C) MRO: D -> B -> C -> A -> object
  B(A)   MRO: B -> A -> object
  C(A)   MRO: C -> A -> object

  Calling D().greet():
  D.greet()  [MRO index: 0]
  B.greet()  [MRO index: 1]
  C.greet()  [MRO index: 2]
  A.greet()  [MRO index: 3]
  ...
  A.greet() called exactly ONCE (C3 guarantees)

[2] super() is NOT 'call parent':
  MyService MRO: MyService -> MixinLog -> MixinValidate -> Base -> object
  Creating MyService():
  MyService.__init__ starts
  MixinLog.__init__ called by MyService
  MixinValidate.__init__ called by MyService
  Base.__init__ called by MyService
  ...

...  # [3] Mixin as pluggable features 省略
[4] Mixin with validation:
  Product('', -1) validate: ['Invalid name: ', 'Invalid price: -1']
```

诚实预期（本机实测）：

- 全部输出**确定性可复现**：MRO 序列、`A.greet()` 恰好调用一次、super() 链顺序每次运行完全一致
- 陷阱提示：如果 Mixin 的 `__init__` 里不调 `super().__init__()`，链条会在该 Mixin 处中断，后面的 `MixinValidate`/`Base` 都不会被初始化——这是多继承最常见的静默 bug，本 demo 的三个 Mixin 都正确转发
- `object.__init__()` 在链条末尾经由 `Base` 的 `super().__init__()` 调到，只是不打印，demo 输出看不到它，属预期

## How It Works

这节沿查找链逐环展开：C3 怎么排出顺序，`super()` 怎么沿顺序转发。

### C3 线性化

```
D(B, C)  → B(A), C(A)
MRO: D → B → C → A → object
```

输出 [1] 打印的 `D -> B -> C -> A -> object` 就是这条线性化结果。C3 保证三个性质：**单调性**（子类的 MRO 中父类顺序与父类自身 MRO 一致）、**局部优先**（先出现的父类优先）、**唯一性**（每个类只出现一次）。

### super() 的真实行为

下面这段在演示协作转发链条怎么串起来（对应输出 [2] 的初始化顺序）：

```python
class MyService(MixinLog, MixinValidate, Base):
    def __init__(self):
        super().__init__()   # 为什么这行会依次唤醒三个类：super() 找的是
                             # MRO 中 MyService 之后的下一个类，每个 __init__
                             # 里再调 super()，链条 MyService → MixinLog →
                             # MixinValidate → Base → object 就串起来了
```

你在输出 [2] 里看到的 `MixinLog → MixinValidate → Base` 依次初始化，就来自这条链。链条能走通的前提是**每一环都协作**：任何一个 Mixin 的 `__init__` 忘调 `super().__init__()`，链就断在那里。

### Mixin 设计原则

1. **不维护状态**：只提供方法，`__init__` 要么不用、要么调 `super().__init__`
2. **放在继承列表左侧**（如 `class User(JSONMixin, ReprMixin):`）——MRO 局部优先，Mixin 的方法会先于业务类同名方法被找到；业务类的 `__init__` 仍通过 `super()` 链在最后完成初始化
3. **以 Mixin 后缀命名**：明确标识这是 Mixin
4. **不独立使用**：Mixin 依赖业务类提供的基础属性

## Pitfalls & Q&A

这节收集三个真实断链坑（按现象—原因—解法展开）和一个经典问题。

**坑 1：Mixin 的 `__init__` 不调 `super().__init__()`。**

- 现象：创建对象时无报错，但排在后面的 Mixin 和 `Base` 没有被初始化
- 原因：`super()` 调用是唯一的接力棒，少一环链就在那里静默中断
- 解法：Mixin 的 `__init__` 要么不定义，要么开头就调 `super().__init__()`（见 How It Works 的协作转发）

**坑 2：写 `ClassName.__init__(self)` 直接指定类。**

- 现象：部分类被跳过或初始化顺序与 MRO 不符
- 原因：直接指定类绕过 MRO 链式调用，破坏整条链
- 解法：Mixin 中永远用 `super()`，不硬编码类名

**坑 3：钻石结构里不写协作式 `super()` 而直接 `A.greet(self)`。**

- 现象：A 的代码被执行两次
- 原因：绕过了协作转发，C3 的"恰好一次"保证随之失效
- 解法：所有环节统一用 `super()` 转发，由 MRO 保证 A 只命中一次

**Q：钻石问题（Diamond Problem）问的是什么？**

B 和 C 都继承 A、D 继承 B 和 C 时，A 的方法被调用几次？恰好一次——C3 线性化保证 A 在 MRO 中只出现一次，查找只命中一次（输出 [1] 的 `A.greet() called exactly ONCE`）。

前提是 B、C 都协作转发，反例见坑 3。
