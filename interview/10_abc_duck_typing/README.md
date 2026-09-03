# 10 · ABC 与 Duck Typing：三种多态路线怎么选

## 1. 引言

Python 的多态基于 **Duck Typing**（"走起来像鸭子就是鸭子"）——关注对象是否有某个方法，不关注类型。**ABC**（Abstract Base Class）提供可选的类型约束：用 `@abstractmethod` 强制子类实现接口，用 `register()` 将第三方类纳入继承体系。**Protocol**（PEP 544）结合了两者的优点：Duck Typing 的灵活性 + ABC 的 isinstance 检查。

## 2. 文件结构

```
10_abc_duck_typing/
├── README.md              # 本教程文档
├── abc_duck_typing.py     # 主演示脚本：Duck Typing / ABC / register / Protocol
└── images/
    ├── abc_duck_typing.archify.html  # 交互示意图（浏览器打开）
    └── abc_duck_typing.archify.json  # 图源（typed JSON）
```

主脚本内容：

```
abc_duck_typing.py
├── 1. Duck / Robot / Person               # Duck Typing 演示
├── 2. Transport (ABC) + Truck / Drone     # 抽象基类
├── 3. ExternalLogistics + register()       # 虚拟子类
├── 4. CacheInterface + MemoryCache / RedisCache  # 缓存接口
└── 5. ship_item() / cache_demo()          # 多态使用
```

## 3. 核心概念

### 3.1 Duck Typing

```python
def quack(duck):
    return duck.speak()  # 只要有 speak() 方法就行

quack(Duck())   # "Quack!"
quack(Robot())  # "Beep boop!"
quack(Person()) # AttributeError: no speak()
```

不检查类型，只检查行为。灵活但无编译时保护。

### 3.2 ABC

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

### 3.3 `register()` — 虚拟子类

```python
Transport.register(ExternalLogistics)
# ExternalLogistics 不继承 Transport
# 但 isinstance(ExternalLogistics(), Transport) → True
```

适合无法修改源码的第三方类。

### 3.4 Protocol（PEP 544）

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Speakable(Protocol):
    def speak(self) -> str: ...

isinstance(Duck(), Speakable)    # True (有 speak 方法)
isinstance(Person(), Speakable)  # False (没有 speak 方法)
```

Protocol = 结构化子类型：运行时 `isinstance` 只按结构匹配（检查方法**是否存在**），不要求继承；签名级的类型检查只在 mypy 等静态检查器中生效。

### 3.5 高频追问

**Q1: ABC 的 `@abstractmethod` 和直接 raise NotImplementedError 有什么区别？**

`@abstractmethod` 在**类实例化时**就失败（第一次 `Transport()` 即 TypeError，失败点更早），`NotImplementedError` 在**方法调用时**才检查（可能潜伏很久才暴露）。

**Q2: Protocol 和 ABC 怎么选？**

- 需要运行时检查 → Protocol（`@runtime_checkable`）
- 需要强制实现 → ABC（`@abstractmethod`）
- 第三方类 → `register()`

## 4. 实操演示

```bash
cd interview/10_abc_duck_typing
python3 abc_duck_typing.py        # 运行全部 demo
# 交互示意图: 浏览器打开 images/abc_duck_typing.archify.html
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

## 5. 预期结果与陷阱

**交互示意图**：[浏览器打开](images/abc_duck_typing.archify.html)（自包含 HTML：trace 动画、深/浅主题、节点检索与路径追踪；图源 `images/abc_duck_typing.archify.json`）。

多态三条路线的统一入口：Duck Typing 直接 `t.deliver(dest)`（缺方法 → `AttributeError`）；ABC 未实现抽象方法在实例化时即 `TypeError`，`register()` 虚拟子类可通过 isinstance；`@runtime_checkable` Protocol 按结构匹配。

诚实预期（本机实测）：

- 全部输出确定性可复现（isinstance 结果、TypeError 消息在同版本内逐字一致）
- `[2]` 的 TypeError 文案随版本变化：3.10/3.11 为 `Can't instantiate abstract class Transport with abstract methods deliver, max_capacity`；3.12+ 改为 `Can't instantiate abstract class Transport without an implementation for abstract methods 'deliver', 'max_capacity'`——语义相同，措辞更明确
- 陷阱提示：`Transport.__subclasses__()` 只返回真实子类 `['Truck', 'Drone']`——register 的虚拟子类不在其中，但 `issubclass` 检查为 True。两种"子类"的可见性不同，排查继承问题时容易踩坑
- `@runtime_checkable` 的 isinstance 只检查方法**是否存在**，不检查签名；Protocol 的完整类型检查只在静态类型检查器（mypy）里生效

## 6. 小结

1. **Duck Typing 关注行为不关注类型**，灵活但无保护
2. **ABC 用 `@abstractmethod` 强制子类实现接口**
3. **`register()` 让第三方类通过 isinstance 检查**
4. **Protocol 结合 Duck Typing 灵活性 + isinstance 检查**

下一篇进入 11_getattr_proxy：深入属性查找链与 `__getattr__` / `__getattribute__` 的触发时机。
