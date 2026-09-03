# 07 · MRO 与 Mixin：C3 线性化下 `super()` 到底调用谁

## 1. 引言

当类有多继承时，Python 用 **C3 线性化算法**确定方法查找顺序（MRO, Method Resolution Order）。`super()` 不是"调用父类"，而是"MRO 中的下一个"——理解这一点是正确使用多继承和 Mixin 的前提。

Mixin 是一种通过多继承实现的可插拔功能模式：每个 Mixin 提供单一功能，业务类通过组合多个 Mixin 获得所有能力。

## 2. 文件结构

```
07_mro_mixin/
├── README.md          # 本教程文档
├── mro_mixin.py       # 主演示脚本：钻石继承 / super() 链 / Mixin 组合
└── images/
    ├── mro_mixin.archify.html  # 交互示意图（浏览器打开）
    └── mro_mixin.archify.json  # 图源（typed JSON）
```

主脚本内容：

```
mro_mixin.py
├── 1. Diamond inheritance (A → B,C → D)  # MRO 基础
├── 2. super() chain with Mixins            # super() 真实行为
├── 3. JSONMixin / ReprMixin / ValidateMixin  # 实战 Mixin
└── 4. User / Product                       # Mixin 组合
```

## 3. 核心概念

### 3.1 C3 线性化

```
D(B, C)  → B(A), C(A)
MRO: D → B → C → A → object
```

C3 保证：
- **单调性**：子类的 MRO 中父类顺序与父类自身 MRO 一致
- **局部优先**：先出现的父类优先
- **唯一性**：每个类在 MRO 中只出现一次

### 3.2 super() 的真实行为

```python
class MyService(MixinLog, MixinValidate, Base):
    def __init__(self):
        super().__init__()  # 调用 MRO 中的下一个，不是"父类"
```

`super()` 不是调父类，而是调 MRO 中"当前类之后"的第一个类。

### 3.3 Mixin 设计原则

1. **不维护状态**：只提供方法，不用 `__init__`（或调用 `super().__init__`）
2. **放在继承列表左侧**：`class User(JSONMixin, ReprMixin):`
3. **以 Mixin 后缀命名**：明确标识这是 Mixin
4. **不独立使用**：Mixin 依赖业务类提供的基础属性

### 3.4 高频追问

**Q1: 钻石问题（Diamond Problem）？**

B 和 C 都继承 A，D 继承 B 和 C。A 的方法被调用几次？答案：**恰好一次**——C3 线性化保证 A 在 MRO 中只出现一次（查找只命中一次）。注意这依赖 B、C 都用协作式 `super()` 转发：若 B、C 直接写 `A.greet(self)`，A 的代码就会执行两次。

**Q2: `super()` 和 `ClassName.__init__()` 的区别？**

```python
super().__init__()       # MRO 链式调用
ClassName.__init__(self)  # 直接调用指定类，破坏链
```

永远在 Mixin 中用 `super()`，否则会破坏 MRO 链。

## 4. 实操演示

```bash
cd interview/07_mro_mixin
python3 mro_mixin.py          # 运行全部 demo
# 交互示意图: 浏览器打开 images/mro_mixin.archify.html
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

## 5. 预期结果与陷阱

**交互示意图**：[浏览器打开](images/mro_mixin.archify.html)（自包含 HTML：trace 动画、深/浅主题、节点检索与路径追踪；图源 `images/mro_mixin.archify.json`）。

`d.greet()` 的 super() 链：D → B → C → A（`super() → C，不是父类 A！`），结果沿链原路回传——每个类只被调用一次由 C3 保证。

诚实预期（本机实测）：

- 全部输出**确定性可复现**：MRO 序列、`A.greet()` 恰好调用一次、super() 链顺序每次运行完全一致
- 陷阱提示：如果 Mixin 的 `__init__` 里不调 `super().__init__()`，链条会在该 Mixin 处中断，后面的 `MixinValidate`/`Base` 都不会被初始化——这是多继承最常见的静默 bug，本 demo 的三个 Mixin 都正确转发
- `object.__init__()` 在链条末尾经由 `Base` 的 `super().__init__()` 调到，只是不打印，demo 输出看不到它，属预期

## 6. 小结

1. **MRO 是 C3 线性化的结果**，保证单调性和唯一性
2. **super() = MRO 中的下一个**，不是"父类"
3. **Mixin = 纯功能类**，无状态、不独立使用
4. **Mixin 放在继承列表左侧**（MRO 优先级更高）

下一篇进入 08_gil_concurrency：看 GIL 如何决定 threading / multiprocessing / asyncio 的选型。
