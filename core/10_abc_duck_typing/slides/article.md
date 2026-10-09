# 10 · ABC 与 Duck Typing：三种多态路线怎么选

> 魔术方法让自定义类"像内置类型一样好用"，但那靠的是约定而非约束：
> `Point.__add__` 遇到不认识的类型返回 `NotImplemented`——
> 如果你想**强制**所有子类都实现 `deliver()`，光靠约定行吗？继承、Duck Typing、
> Protocol 三条多态路线各管什么，正是本实验要分清的。

## What

Python 的多态基于 **Duck Typing**（"走起来像鸭子就是鸭子"）——关注对象是否有某个方法，不关注类型。**ABC**（Abstract Base Class）提供可选的类型约束：`@abstractmethod` 强制子类实现接口，`register()` 把第三方类纳入继承体系。**Protocol**（PEP 544）结合两者优点：Duck Typing 的灵活性 + isinstance 检查。一句话心智模型：**三条路线共用同一个入口 `ship_item(t, dest)`，区别只在"什么时候发现对象不合格"**——失败点越靠前，约束越强。

## Why

Duck Typing 灵活，但缺方法只会在**调用时**炸出 `AttributeError`，接口约定全靠口头；ABC 把失败提前到**实例化时**。分不清三条路线的边界，接口设计和"该不该加类型约束"的争论就没了依据。

## How

```bash
cd core/10_abc_duck_typing
python3 abc_duck_typing.py        # 运行全部 demo
```

真实输出示例：

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

### Duck Typing：只看行为

```python
def quack(duck):
    return duck.speak()  # 只要有 speak() 方法就行

quack(Duck())   # "Quack!"
quack(Person()) # AttributeError: no speak()
```

### ABC：抽象方法 + 默认实现 + 虚拟子类

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

### Protocol（PEP 544）：结构化子类型

```python
@runtime_checkable
class Speakable(Protocol):
    def speak(self) -> str: ...

isinstance(Duck(), Speakable)    # True (有 speak 方法)
isinstance(Person(), Speakable)  # False (没有 speak 方法)
```

### 选型速查

- 需要运行时检查 → Protocol（`@runtime_checkable`）
- 需要强制实现 → ABC（`@abstractmethod`）
- 第三方类 → `register()`

## Deep Dive

**三条路线的失败点时机**：Duck Typing 在**调用时**才 `AttributeError`（`Person` 有 `talk()` 没用，缺 `speak()` 一到调用才炸）；ABC 在**实例化时** `TypeError`（`@abstractmethod` 未实现的类第一次实例化就失败）；`@runtime_checkable` Protocol 的 isinstance **只按结构检查方法是否存在**，不校验签名——签名级检查只在 mypy 等静态检查器里生效。失败点越靠前，约束越强。

**虚拟子类的可见性**：`register()` 注册后 `issubclass`/`isinstance` 都返回 True，但 ABC 也不强制它实现抽象方法，且 `Transport.__subclasses__()` 只列真实子类——排查继承关系时两套可见性要分开看。

**`@abstractmethod` vs 手动 `raise NotImplementedError`**：前者在类实例化时就失败，后者要等**方法被调用**才检查，可能潜伏很久才暴露。

## Q&A

**Q1: ABC 的 `@abstractmethod` 和直接 raise NotImplementedError 有什么区别？**
`@abstractmethod` 在**类实例化时**就失败（第一次 `Transport()` 即 TypeError，失败点更早），`NotImplementedError` 在**方法调用时**才检查（可能潜伏很久才暴露）。

**Q2: 为什么抽象类不能实例化？**
类体内有未实现的 `@abstractmethod` 时，`Transport()` 在实例化阶段就抛 `TypeError: Can't instantiate abstract class ...`——把"忘了实现接口"从运行期调用提前到实例化期暴露。
