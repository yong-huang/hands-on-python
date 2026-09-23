# 07 · MRO 与 Mixin：C3 线性化下 `super()` 到底调用谁

> 属性的存取由描述符协议接管；多继承下，**方法**按什么顺序找，也有自己的一套规则。`super()` 名字里带个 "super"，
> 人人都以为它是"调用父类"，可一到多继承就出错——它其实是"MRO 中的下一个"。
> 本实验用钻石继承和 Mixin 组合把这条链看清楚。

## What

多继承时，Python 用 **C3 线性化算法**确定方法查找顺序（MRO, Method Resolution Order）。一句话心智模型：**`super()` = "MRO 中我之后的下一个类"，不是"我的父类"**——钻石继承里 `D(B, C)` 的 MRO 是 `D → B → C → A`，B 的 `super()` 跳向 C 而非父类 A。

## Why

没有这个算法，两个父类重载同一个方法时查找顺序就无从谈起，钻石继承里 `A` 的方法还可能被执行两次；C3 给出确定且唯一的顺序。Mixin 是通过多继承实现的可插拔功能模式：每个 Mixin 提供单一功能，业务类组合多个 Mixin 获得所有能力——它能否正确工作，完全取决于 `super()` 沿 MRO 协作转发。

## How

```bash
cd core/07_mro_mixin
python3 mro_mixin.py          # 运行全部 demo
```

真实输出示例：

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

### C3 线性化

```
D(B, C)  → B(A), C(A)
MRO: D → B → C → A → object
```

C3 保证三个性质：**单调性**（子类的 MRO 中父类顺序与父类自身 MRO 一致）、**局部优先**（先出现的父类优先）、**唯一性**（每个类只出现一次）。

### super() 的真实行为

```python
class MyService(MixinLog, MixinValidate, Base):
    def __init__(self):
        super().__init__()  # 调用 MRO 中的下一个，不是"父类"
```

### Mixin 设计原则

1. **不维护状态**：只提供方法，`__init__` 要么不用、要么调 `super().__init__`
2. **放在继承列表左侧**（如 `class User(JSONMixin, ReprMixin):`）——MRO 局部优先，Mixin 的方法会先于业务类同名方法被找到
3. **以 Mixin 后缀命名**：明确标识这是 Mixin
4. **不独立使用**：Mixin 依赖业务类提供的基础属性

## Deep Dive

**最核心的机制**——`super()` 如何沿 MRO 协作转发（demo [2] 的调用顺序）：

```python
class MyService(MixinLog, MixinValidate, Base):
    def __init__(self):
        super().__init__()   # 为什么这行会依次唤醒三个类：super() 找的是
                             # MRO 中 MyService 之后的下一个类，每个 __init__
                             # 里再调 super()，链条 MyService → MixinLog →
                             # MixinValidate → Base → object 就串起来了
```

链条能走通的前提是**每一环都协作**：任何一个 Mixin 的 `__init__` 忘调 `super().__init__()`，链就断在那里。

踩坑清单：

- **Mixin 的 `__init__` 不调 `super().__init__()`**：链条在该 Mixin 处静默中断，后面的类都不会被初始化——多继承最常见的静默 bug
- **`ClassName.__init__(self)` 直接指定类**：绕过 MRO 链式调用，破坏整条链；Mixin 中永远用 `super()`
- **钻石结构里不写协作式 `super()` 而直接 `A.greet(self)`**：A 的代码会执行两次，C3 的"恰好一次"保证随之失效

## Q&A

**Q1: 钻石问题（Diamond Problem）？**

B 和 C 都继承 A，D 继承 B 和 C，A 的方法被调用几次？**恰好一次**——C3 线性化保证 A 在 MRO 中只出现一次，查找只命中一次。注意这依赖 B、C 都用协作式 `super()` 转发：若直接写 `A.greet(self)`，A 的代码就会执行两次。

**Q2: 为什么 Mixin 要放在继承列表左侧？**

MRO 局部优先——先出现的父类在查找顺序中靠前。Mixin 放左侧保证其方法优先于业务类自身的同名方法被找到；业务类的 `__init__` 仍通过 `super()` 链在最后完成初始化。
