# 10 · ABC 与 Duck Typing：三种多态路线怎么选

> 多态（同一行调用代码，作用于不同类型并各自正确响应）在 Python 有三条实现路线：
> 继承抽象基类、Duck Typing、Protocol。它们的区别核心只有一条——
> "什么时候发现对象不合格"：调用时、实例化时、还是静态检查时。
> 本篇用同一组鸭子/物流示例把三条路线的边界讲清楚。

## Background

这节讲多态约束的来龙去脉：全靠约定的时代怎么做事、在哪儿出事、类型约束工具如何一步步补位。

在 Java、C++ 这类静态语言里，接口在编译期就强制实现。Python 社区长期的主流做法是不检查类型：函数拿到对象就直接调它的方法，类型对不对要跑起来才知道，约定写在文档和注释里。

撞墙的场景很具体：参数没实现 `speak()` 方法，要到真正调用那一刻才 `AttributeError`；如果这条路径一周才执行一次，缺陷就潜伏一周。项目变大后，"这个参数必须能 `deliver`"无法在代码里表达，代码评审和 IDE 都帮不上忙。

补位分两步：标准库的抽象基类工具（`abc` 模块）给出"继承即约束"——声明抽象方法，子类不实现就不许实例化，还能把第三方类登记进类型体系；PEP 544（3.8 起）再补一环——不要求继承，只按"有没有这个方法"匹配，同时能被类型检查器识别。

## What

这节给出三条路线的定义，并用一个类比建立心智模型。

三条路线的定义：

- **Duck Typing**（"走起来像鸭子就是鸭子"）：Python 多态的原生形态，关注对象有没有某个方法，不关注它的类型
- **ABC**（Abstract Base Class，抽象基类）：在 Duck Typing 之上提供可选的类型约束——`@abstractmethod` 装饰器强制子类实现接口，`register()` 把第三方类纳入继承体系
- **Protocol**（PEP 544）：结合两者优点——Duck Typing 的灵活性 + isinstance（类型检查内置函数）检查

一句话心智模型：**三条路线共用同一个入口 `ship_item(t, dest)`，区别只在"什么时候发现对象不合格"——失败点越靠前，约束越强。**

可以把三条路线想象成考驾照的三种监考：Duck Typing 是上了路才发现你不会挂挡，ABC 是上车前先查证件，Protocol 是报名时纸面审核、路考不再过问。但和考证不同的是，三条路线可以混用——同一个类可以既继承某个 ABC，又恰好满足某个 Protocol。

## When to Use

这节给选型依据：三类典型场景、反面边界，以及三行一条的对比表。

典型场景——在做什么事的时候：

- 定义插件、驱动的接口，要求"忘了实现就别想实例化"时——用 ABC 的 `@abstractmethod` 把失败钉在实例化期
- 消费无法改动继承树的第三方类，又想让它通过类型检查时——用 `register()` 登记成虚拟子类（virtual subclass：由 register 登记、没有真实继承关系、但 isinstance/issubclass 判定为真的子类）
- 函数只关心"有没有这个方法"，而现有类型五花八门、不可能共同继承时——Duck Typing 直接写，或用 Protocol 声明成可检查的类型

何时不用：

- 小脚本内部调用、类型错了当场就能看到时——直接 Duck Typing，别为约束而约束
- 只是传递数据、不需要接口契约时，普通类或 `dict` 更直接
- 团队没有静态检查流程时，Protocol 的签名级收益拿不到大半，ABC 的强制力反而更实用

同类方案对比：

| 路线 | 差异 | 什么时候选它 |
|:---|:---|:---|
| Duck Typing | 零约束，调用时才报错 | 内部代码、快速验证想法 |
| ABC | 强制子类实现，实例化时校验，可 `register()` 纳管第三方 | 定义团队接口、框架扩展点 |
| Protocol（PEP 544） | 按结构匹配，不要求继承，支持结构与静态两级检查 | 类型无法共同继承、又想有类型提示 |

## Quick Start

这节运行 demo 并给出真实输出与读数口径，附 Duck Typing 的最小写法。
前置条件：Python 3.8+（typing.Protocol 与 @runtime_checkable 自 3.8 起提供；更低版本下输出 [7] 会打印跳过提示而非上述结果）。

```bash
cd core/10_abc_duck_typing
python3 abc_duck_typing.py        # 运行全部 demo
```

真实输出示例（节选：省略开头 demo 标题横线与结尾分隔线）：

```
[1] Duck Typing (no inheritance needed):
  quack(Duck): Quack!
  quack(Robot): Beep boop!
  Person has talk() not speak():
  AttributeError: 'Person' object has no attribute 'speak'

[2] ABC (abstract base class):
  Truck:  Driving to Warehouse A with 'Electronics'
  [Truck] -> Warehouse A (cap: 10000)
  Drone:  Flying to Tower B with 'Medicine'
  [Drone] -> Tower B (cap: 50)

  Cannot instantiate abstract Transport:
  TypeError: Can't instantiate abstract class Transport without an implementation for abstract methods 'deliver', 'max_capacity'

[3] register() — virtual subclass:
  isinstance(ExternalLogistics(), Transport): True
  issubclass(ExternalLogistics, Transport): True
  Ship: External delivery to Port C with 'Package'

[4] ABC hierarchy:
  Transport.__subclasses__(): ['Truck', 'Drone']
  ExternalLogistics is virtual subclass: True

[5] CacheInterface (polymorphism):
  Using MemoryCache(0 items):
    get('key1') = value1, get('key2') after delete = None
  Using RedisCache(0 items):
    get('key1') = value1, get('key2') after delete = None

[6] Duck Typing vs ABC:
  Duck Typing:
    + Flexible: any object with matching methods
    + No inheritance required
    - No compile-time / import-time checks
    - AttributeError at runtime if method missing
  ABC:
    + isinstance() checks work
    + Cannot forget to implement methods
    + register() for third-party classes
    - Requires inheritance (or register)

[7] Protocol (PEP 544, Python 3.8+):
  isinstance(Duck(), Speakable): True
  isinstance(Robot(), Speakable): True
  isinstance(Person(), Speakable): False
  Protocol = structural typing (no inheritance)
```

诚实预期（本机实测）：

- 全部输出确定性可复现（isinstance 结果、TypeError 消息在同版本内逐字一致）
- `[2]` 的 TypeError 文案随版本变化：3.10/3.11 为 `Can't instantiate abstract class Transport with abstract methods deliver, max_capacity`；3.12+ 改为 `Can't instantiate abstract class Transport without an implementation for abstract methods 'deliver', 'max_capacity'`——语义相同，措辞更明确
- 陷阱提示：`Transport.__subclasses__()` 只返回真实子类 `['Truck', 'Drone']`——register 的虚拟子类不在其中，但 `issubclass` 检查为 True。两种"子类"的可见性不同，排查继承问题时容易踩坑
- `@runtime_checkable` 的 isinstance 只检查方法**是否存在**，不检查签名；Protocol 的完整类型检查只在静态类型检查器（mypy）里生效

这段在做什么：`quack()` 不检查类型，只要对象有 `speak()` 方法就能工作——`Person` 没有，于是到调用那一刻才 `AttributeError`（对应输出 [1]）。

```python
def quack(duck):
    return duck.speak()  # 只要有 speak() 方法就行

quack(Duck())   # "Quack!"
quack(Person()) # AttributeError: no speak()
```

## How It Works

这节拆机制：三条路线各自的失败时机、ABC 的实例化期拦截，以及 Protocol 的结构化检查怎么工作。

### 失败点的三种时机

- **Duck Typing**：**调用时**才 `AttributeError`——输出 [1] 的 `Person` 有 `talk()` 没用，缺 `speak()` 一到调用才炸。
- **ABC**：**实例化时** `TypeError`——`@abstractmethod` 未实现的类第一次实例化就失败（输出 [2]），把"忘了实现接口"从运行期调用提前到实例化期暴露。
- **Protocol（`@runtime_checkable`）**：isinstance **只按结构检查方法是否存在**，不校验签名——签名级检查只在 mypy（最常用的 Python 静态类型检查器）等工具里生效，见诚实预期第四条。

失败点越靠前，约束越强。

### ABC：实例化期拦截与虚拟子类

这段在演示两件事：抽象方法如何在实例化期拦截（对应输出 [2]），以及 `register()` 如何把没有继承关系的第三方类纳入类型体系（对应输出 [3]）。

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

`shipping_label` 是非抽象方法，照常被所有子类继承。你在输出 [3] 里看到 `ExternalLogistics` 没有继承 `Transport` 却通过了两项检查，就来自 `register()` 那一行。

### Protocol：结构化子类型

这段在做什么：声明一个只看"有没有 `speak` 方法"的协议类型，不要求任何继承关系，然后对任意对象做 isinstance 检查。

```python
@runtime_checkable
class Speakable(Protocol):
    def speak(self) -> str: ...

isinstance(Duck(), Speakable)    # True (有 speak 方法)
isinstance(Person(), Speakable)  # False (没有 speak 方法)
```

你在输出 [7] 里看到的 True/False，就来自这两次 isinstance——匹配的依据只有 `speak` 方法是否存在这一条结构特征。

## Pitfalls & Q&A

这节两个真实踩坑（按现象—原因—解法展开）和一个辨析问答。

**坑 1：register 的虚拟子类与直觉不符。**

- 现象：`Transport.__subclasses__()` 里找不到 register 进来的类，但 `issubclass` 检查为 True；或者以为 register 后会被强制实现抽象方法，实例化却毫发无损
- 原因：register 造的是虚拟子类（virtual subclass，由 register 登记产生、没有真实继承关系的子类）——只影响 isinstance/issubclass 的判定结果，不进 `__subclasses__()` 列表，ABC 也不校验它
- 解法：两套可见性分开看；第三方类的接口完整性靠测试或静态检查兜底

**坑 2：用 `raise NotImplementedError` 代替 `@abstractmethod`。**

- 现象：忘实现接口的子类实例化成功，潜伏很久，直到方法被调用才炸
- 原因：手动 `raise NotImplementedError` 在**方法调用时**才检查；`@abstractmethod` 在**类实例化时**就校验，失败点更早
- 解法：接口方法一律用 `@abstractmethod` 声明，让违约在实例化期暴露

**Q：Duck Typing 和 Protocol 不都是"有方法就行"吗？**

运行时行为确实相同，差别在表达力：Duck Typing 的约定只存在于文档和函数名里。

Protocol 把"需要有 `speak` 方法"声明成一个类型（`Speakable`），可以写进函数签名、传给 IDE 和 mypy 做静态检查。要留约束痕迹，用 Protocol；只是临时调用，Duck Typing 足够。
