# 10 · ABC 与 Duck Typing：三种多态路线怎么选

> 上一篇用魔术方法让自定义类"像内置类型一样好用"。但新的追问来了：
> `Point.__add__` 遇到不认识的类型返回 `NotImplemented`，靠的是约定而非约束——
> 如果你想**强制**所有子类都实现 `deliver()`，光靠约定行吗？继承、Duck Typing、
> Protocol 三条多态路线各管什么，正是本实验要分清的。

## 1. 为什么需要它

Python 的多态基于 **Duck Typing**（"走起来像鸭子就是鸭子"）——关注对象是否有某个方法，不关注类型。它灵活，但缺方法只会在**调用时**炸出 `AttributeError`，接口约定全靠口头。**ABC**（Abstract Base Class）提供可选的类型约束：用 `@abstractmethod` 强制子类实现接口，用 `register()` 将第三方类纳入继承体系，把失败提前到**实例化时**。**Protocol**（PEP 544）结合了两者的优点：Duck Typing 的灵活性 + ABC 的 isinstance 检查。分不清三条路线的边界，接口设计和"该不该加类型约束"的争论就没了依据。

## 2. 总览：核心机制一图看懂

![多态三条路线：Duck Typing / ABC / Protocol](images/abc_duck_typing.svg)

一句话心智模型：**统一入口是 `ship_item(t, dest)`，区别只在于"什么时候发现对象不合格"**。看图时对着三条 lane 找失败点：Duck Typing 直接 `t.deliver(dest)`，缺方法要到调用时才 `AttributeError`；ABC 未实现抽象方法在实例化时即 `TypeError`，`register()` 虚拟子类可通过 isinstance；`@runtime_checkable` Protocol 按结构匹配——失败点越靠前，约束越强。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/core/10_abc_duck_typing/images/abc_duck_typing.html)
> （或本地打开 [`images/abc_duck_typing.html`](images/abc_duck_typing.html)）。

## 3. 快速开始

```bash
cd core/10_abc_duck_typing
python3 abc_duck_typing.py        # 运行全部 demo
```

真实输出示例（macOS, CPython 3.10，节选）：

```
[1] Duck Typing (no inheritance needed):
  quack(Duck): Quack!
  Person has talk() not speak():
  AttributeError: 'Person' object has no attribute 'speak'

[2] ABC (abstract base class):
  Cannot instantiate abstract Transport:
  TypeError: Can't instantiate abstract class Transport with abstract methods deliver, max_capacity

[3] register() — virtual subclass:
  isinstance(ExternalLogistics(), Transport): True
  issubclass(ExternalLogistics, Transport): True
  Ship: External delivery to Port C with 'Package'

[7] Protocol (PEP 544, Python 3.8+):
  isinstance(Duck(), Speakable): True
  isinstance(Person(), Speakable): False
```

诚实预期（本机实测）：

- 全部输出确定性可复现（isinstance 结果、TypeError 消息在同版本内逐字一致）
- `[2]` 的 TypeError 文案随版本变化：3.10/3.11 为 `Can't instantiate abstract class Transport with abstract methods deliver, max_capacity`；3.12+ 改为 `Can't instantiate abstract class Transport without an implementation for abstract methods 'deliver', 'max_capacity'`——语义相同，措辞更明确
- 陷阱提示：`Transport.__subclasses__()` 只返回真实子类 `['Truck', 'Drone']`——register 的虚拟子类不在其中，但 `issubclass` 检查为 True。两种"子类"的可见性不同，排查继承问题时容易踩坑
- `@runtime_checkable` 的 isinstance 只检查方法**是否存在**，不检查签名；Protocol 的完整类型检查只在静态类型检查器（mypy）里生效

## 4. 核心概念

### 4.1 Duck Typing

```python
def quack(duck):
    return duck.speak()  # 只要有 speak() 方法就行

quack(Duck())   # "Quack!"
quack(Robot())  # "Beep boop!"
quack(Person()) # AttributeError: no speak()
```

不检查类型，只检查行为。灵活但无编译时保护。

### 4.2 ABC

```python
class Transport(ABC):
    @abstractmethod
    def deliver(self, destination): ...

    @abstractmethod
    def max_capacity(self): ...

    def shipping_label(self, destination):  # 非抽象，提供默认实现
        ...
```

- 不能实例化抽象类（`TypeError`）
- 子类必须实现所有 `@abstractmethod` 方法
- `isinstance()` / `issubclass()` 检查可用

### 4.3 `register()` — 虚拟子类

```python
Transport.register(ExternalLogistics)
# ExternalLogistics 不继承 Transport
# 但 isinstance(ExternalLogistics(), Transport) → True
```

适合无法修改源码的第三方类。

### 4.4 Protocol（PEP 544）

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Speakable(Protocol):
    def speak(self) -> str: ...

isinstance(Duck(), Speakable)    # True (有 speak 方法)
isinstance(Person(), Speakable)  # False (没有 speak 方法)
```

Protocol = 结构化子类型：运行时 `isinstance` 只按结构匹配（检查方法**是否存在**），不要求继承；签名级的类型检查只在 mypy 等静态检查器中生效。

## 5. 关键代码解析

最核心的构造是 ABC 的"抽象 + 默认实现"组合——约束由 `@abstractmethod` 下达，公共逻辑下沉到具体方法：

```python
class Transport(ABC):
    @abstractmethod
    def deliver(self, destination): ...   # 契约：子类必须实现，实例化时校验

    @abstractmethod
    def max_capacity(self): ...

    def shipping_label(self, destination):  # 非抽象：所有子类共享的默认实现
        ...

Transport.register(ExternalLogistics)     # 第三方类不继承也能过 isinstance
```

坑清单：

- **Duck Typing 的失败点最靠后**：`Person` 有 `talk()` 而没有 `speak()`，直到 `duck.speak()` 调用时才 `AttributeError`——ABC 则在第一次实例化时就 `TypeError`，失败点更早
- **TypeError 文案随版本变**：3.12+ 是 `without an implementation for abstract methods ...`，与 3.10/3.11 措辞不同但语义相同，别按报错文案硬匹配
- **虚拟子类"隐形"**：`Transport.__subclasses__()` 只列真实子类 `['Truck', 'Drone']`，register 进来的 `ExternalLogistics` 不在其中，但 `issubclass` 为 True——排查继承关系时两套可见性要分开看
- **`@runtime_checkable` 是弱检查**：isinstance 只确认方法存在，不校验签名；签名级检查只在 mypy 等静态检查器里生效
- **示意图中的分发路径是示意数据**（展示三条路线的失败点差异），不是某次运行的实录

## 6. 文件结构

```
10_abc_duck_typing/
├── README.md                        # 本教程文档
├── abc_duck_typing.py               # 主演示脚本：Duck Typing / ABC / register / Protocol
└── images/
    ├── abc_duck_typing.json  # 图源（typed JSON IR，可编辑重渲染）
    ├── abc_duck_typing.html  # 交互示意图（浏览器打开）
    └── abc_duck_typing.svg   # 双主题矢量图（本 README §2 内嵌）
```

`abc_duck_typing.py` 内容：`1. Duck / Robot / Person` Duck Typing 演示 / `2. Transport (ABC)` + Truck / Drone 抽象基类 / `3. ExternalLogistics` + `register()` 虚拟子类 / `4. CacheInterface` + MemoryCache / RedisCache 缓存接口 / `5. ship_item() / cache_demo()` 多态使用。

## 7. 深入要点

**Q1: ABC 的 `@abstractmethod` 和直接 raise NotImplementedError 有什么区别？**
`@abstractmethod` 在**类实例化时**就失败（第一次 `Transport()` 即 TypeError，失败点更早），`NotImplementedError` 在**方法调用时**才检查（可能潜伏很久才暴露）。

**Q2: Protocol 和 ABC 怎么选？**
- 需要运行时检查 → Protocol（`@runtime_checkable`）
- 需要强制实现 → ABC（`@abstractmethod`）
- 第三方类 → `register()`

**Q3: `register()` 注册的虚拟子类和真继承有什么区别？**
`issubclass` / `isinstance` 都返回 True，ABC 也不会强制它实现抽象方法；区别在可见性——`__subclasses__()` 只列真实子类，虚拟子类不在其中。适合无法修改源码的第三方类。

**Q4: `@runtime_checkable` 的 isinstance 到底检查什么？**
只按结构检查方法**是否存在**（`Speakable` 就看有没有 `speak`），不检查签名、不要求继承；完整的签名级类型检查只在 mypy 等静态检查器里生效。

**Q5: 为什么抽象类不能实例化？**
类体内有未实现的 `@abstractmethod` 时，`Transport()` 在实例化阶段就抛 `TypeError: Can't instantiate abstract class ...`——把"忘了实现接口"从运行期调用提前到实例化期暴露。

## 8. 总结

1. **Duck Typing 关注行为不关注类型**，灵活但无保护
2. **ABC 用 `@abstractmethod` 强制子类实现接口**
3. **`register()` 让第三方类通过 isinstance 检查**
4. **Protocol 结合 Duck Typing 灵活性 + isinstance 检查**

下一篇进入 [11_getattr_proxy](../11_getattr_proxy/README.md)：深入属性查找链与 `__getattr__` / `__getattribute__` 的触发时机。
