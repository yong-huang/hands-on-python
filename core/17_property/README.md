# 17 · property 深度剖析：把方法伪装成属性的艺术

> 把数据暴露成裸属性，等需要加验证时改成方法，所有调用点都得跟着改；预先写一堆 `get_x()` / `set_x()` 又啰嗦。
> `@property` 让调用方保持 `obj.x` 的访问形式，类的作者却能在读写时插入验证、计算、缓存或副作用。
> 本实验用可运行的 demo 演示三种典型写法，并拆开 `obj.x` 背后的分发逻辑。

## Background

这节讲来龙去脉：属性该暴露成什么样，历史上是怎么纠结的。

以前的常见做法有两派。一派直接暴露公共字段：省事直观，但等需求变成"半径必须为正"时，把属性改成方法 `obj.radius()` 会逼着所有调用点跟着改，库的公共接口当场破坏。

另一派学 Java，一律写 `get_x()` / `set_x()`：接口是稳定了，可九成的属性永远不需要拦截，调用方却要全程忍受方法调用的啰嗦，Python 社区的风格约定也不鼓励这种预先抽象。

两派各撞各的墙，根源相同：**外部访问形式**和**内部实现细节**被绑死了。类的作者没法先给最简单的形式、等有需要时再悄悄升级。

`@property` 就是针对这个纠结应运而生的语言特性：访问方始终写 `obj.x`，类内部随时可以拦截这次读写、插入任意逻辑。升级内部实现不再破坏调用方，也不用预先写一堆空壳方法。

## What

这节给出定义与心智模型：`@property` 是什么，一次 `obj.x` 读写各走哪条路。

`@property` 是 Python 实现"受控属性访问"的语法糖：将方法调用伪装成属性访问（`obj.x` 而非 `obj.x()`），在不改变外部接口的前提下对读写加入验证、计算、缓存或副作用。

一句话心智模型：**`obj.x` 的读路径经 getter（`__get__`，读取时被 Python 自动调用的方法）返回存储或计算值，写路径经 setter（`__set__`）校验；没有 setter 的 property 是只读的**。

可以把 property 想象成商店柜台：顾客只说"要一斤苹果"（`obj.radius`），不必关心是现称的还是提前称好的；柜台还有权拒收——setter 校验失败直接抛异常。但和柜台不同的是，property 每次读取都会重新执行 getter，它不是存好的快照，默认也没有缓存。

## When to Use

这节讲什么任务适合 property，什么任务应该换普通方法。

做接口设计时，典型场景有三类：

- **简单数据 + 需要验证**：如半径必须为正。`@property` + `@x.setter`，调用方无感知。
- **由其他属性派生的值**：如 `area = width * height`，不需要独立存储。只读 `@property`。
- **同一数据的多种表示需要联动**：如摄氏/华氏、货币换算。两个 property 共享同一内部状态。

何时不用：

- **需要传参数的计算**：property 没有参数位，写普通方法 `c.calc_area(factor)`。
- **有副作用的操作**：写文件、改其他状态、打日志，用普通方法，让副作用显式可见。
- **计算很慢的值**：考虑 `functools.cached_property`（差异见文末问答）。

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| 裸属性 | 无任何拦截，存 `__dict__`（实例属性的内置字典） | 简单数据且不需要约束 |
| `@property` + setter | 读写都可插入逻辑 | 数据验证、联动表示 |
| 只读 `@property` | 无 setter，赋值抛异常 | 派生值、只读快照 |
| 普通方法 | 显式调用，有参数位 | 带参数或带副作用的操作 |
| `functools.cached_property` | 只算一次，缓存进实例字典 | 代价高的派生值 |
| `get_x()` / `set_x()` | 方法调用形式 | 无；Python 中仅在与 Java 代码互操作时常见 |

## Quick Start

这节给出最小可运行路径：跑通 demo，读输出示例，再上手最核心的验证型写法。只依赖标准库，无第三方包。

```bash
cd core/17_property
python3 property.py           # 运行 property demo
```

真实输出示例（节选：省略开头 demo 标题横线与结尾分隔线）：

```
[1] Circle with property validation:
  c.radius = 5
  c.area = 78.54
  c.circumference = 31.42
  c.radius = -1 -> ValueError: Radius must be positive, got -1

[2] Read-only computed property:
  r.width=3, r.height=4
  r.area = 12
  r.area = 100 -> AttributeError (no setter)

[3] Temperature (synced celsius/fahrenheit):
  t.celsius = 100
  t.fahrenheit = 212.0
  After t.fahrenheit = 212:
  t.celsius = 100.0
  t.fahrenheit = 212.0

[4] property is a data descriptor:
  property is descriptor: has __get__=True, __set__=True, __delete__=True
  type(property): <class 'type'>

[5] property vs method:
  @property: c.area        (attribute access)
  @method:   c.calc_area()  (method call)
  Rule: simple data -> property
        computation with params -> method
```

诚实预期（本机实测）：

- demo 全部输出为**确定性结果**（验证异常、只读异常、温度换算、描述符探测），任何 CPython 版本运行结果一致
- `[4]` 中 `type(property)` 显示 `<class 'type'>` —— property 本身是个类，`@property` 语法等价于调用其构造函数
- 一个本 demo 没有展示的行为：property 是数据描述符，**优先级高于实例 `__dict__`**。想验证可以执行 `c.__dict__["radius"] = 999` 后再读 `c.radius`，会发现仍走 getter

输出 [4] 提到的"数据描述符"——同时定义了 `__get__` 和 `__set__`、能拦截属性读写协议的对象——是理解本文后半篇的关键词，机制见 How It Works。

### 验证型属性（Circle）

```python
class Circle:
    def __init__(self, radius):
        self.radius = radius     # 触发 setter 验证

    @property
    def radius(self):
        return self._radius      # 实际数据存私有属性 _radius

    @radius.setter
    def radius(self, value):
        if value <= 0:
            raise ValueError(f"Radius must be positive, got {value}")
        self._radius = value

    @radius.deleter
    def radius(self):
        self._radius = 0
```

这段在做什么：同一个名字 `radius`，读走 getter 取 `_radius`，写走 setter 做正值校验——连 `__init__` 里的第一次赋值也会被拦截（输出 [1] 的 `ValueError`）。

命名约定：public 名 `radius`，private 存储 `_radius`（单下划线表示"内部使用"，非强制）。

## How It Works

这节回答核心疑问：为什么写个 getter 就能拦截"属性访问"。答案在属性查找的分发规则里，Quick Start 的另外两段写法也在这里拆解。

### 属性访问的分发规则

```python
obj.radius
# type(obj).__dict__["radius"] 是数据描述符
# → 调用 radius.__get__(obj, type(obj))，执行 getter 函数

obj.radius = value
# → 调用 radius.__set__(obj, value)，执行 setter（value <= 0 抛 ValueError）
```

`property` 并非魔法——它是一个**数据描述符**，建立在描述符协议（lab 03，用 `__get__` / `__set__` / `__delete__` 定制属性访问行为的协议）之上，是该协议最常用的上层封装。

属性查找时，类 `__dict__` 里的数据描述符先于实例 `__dict__` 被执行，所以 getter/setter 才有机会接管 `obj.radius` 的读写。

### 只读与联动：另外两种形态

Rectangle 的只读计算属性：

```python
class Rectangle:
    @property
    def area(self):
        return self.width * self.height
```

这段在做什么：只定义 getter，没有 setter 即只读——`r.area = 100` 抛 `AttributeError`（输出 [2]）。适用于由其他属性**派生**的值、不需要独立存储的场景。

Temperature 的联动属性：

```python
@property
def fahrenheit(self):
    return self._celsius * 9 / 5 + 32      # getter 实时换算

@fahrenheit.setter
def fahrenheit(self, value):
    self._celsius = (value - 32) * 5 / 9   # setter 反向换算后存 _celsius
```

这段在做什么：两个 property 共享同一个内部状态 `_celsius`，写华氏先反向换算再存储，读华氏实时换算，实现摄氏/华氏**双向同步**（输出 [3]）——适合同一数据的多种表示形式（单位转换、货币换算）。

### `@property` 装饰器做了什么

```python
p = property(lambda self: self.x)
print(hasattr(p, '__get__'))     # True
print(hasattr(p, '__set__'))     # True
print(hasattr(p, '__delete__'))  # True
```

你在输出 [4] 看到 `type(property)` 是 `<class 'type'>`：property 本身是个类，`@property` 的本质操作是把 getter 方法包装为 `property` 对象赋给类属性。

`@x.setter` / `@x.deleter` 再把 setter/deleter 注册到**同一个** `property` 对象上——这就是三个装饰器能协同的原因。

### 优先级：为什么实例 `__dict__` 改不动 property

正因为 property 是数据描述符，它**优先级高于实例 `__dict__`**：往 `c.__dict__` 里塞一个同名值再读 `c.radius`，走的仍是 getter。

Quick Start 诚实预期的第三条给了验证命令，可以直接试。对比记忆：只定义 `__get__` 的非数据描述符优先级低于实例 `__dict__`（见 lab 03），这也是文末 `cached_property` 能被实例字典覆盖的原因。

## Pitfalls & Q&A

这节收录两个真实踩坑与三个常见疑问。

**坑 1：只读 property 赋值报错，原因想岔了。**

- 现象：`r.area = 100` 抛 `AttributeError`，被误读为"对象不可变"。
- 原因：只定义 `@property` 的属性，其 `__set__` 固定抛 `AttributeError`，对象本身完全可变。
- 解法：需要可写就补 `@x.setter`；确属只读派生值则保持现状，这个异常是预期防护。

**坑 2：setter 里的隐藏副作用。**

- 现象：`Temperature` 的 `_celsius` 在读写 `fahrenheit` 时悄悄变化，排查状态问题时找不到源头。
- 原因：`fahrenheit` 的 setter 反向换算并改写 `_celsius`，副作用藏在赋值语句背后。
- 解法：按本实验的选型规则，有副作用的操作更适合普通方法。

**Q1：property 和普通属性有什么区别？**

| 特性 | 普通属性 | property |
|------|---------|----------|
| 访问方式 | `obj.x` | `obj.x`（一样） |
| 赋值验证 | 无 | setter 中自定义 |
| 计算能力 | 无 | getter 中动态计算 |
| 删除控制 | 直接删除 | deleter 中自定义 |
| 优先级 | 存在 `__dict__` 中 | 数据描述符，优先级更高 |

**Q2：什么时候用 property，什么时候用方法？**
完整的场景清单与对比表见 When to Use；核心规则一句话——简单数据与派生值用 property，带参数或有副作用的操作用方法（输出 [5] 的 Rule 同此）。

**Q3：`functools.cached_property` 和 `@property` 有什么区别？**

`cached_property`（Python 3.8+）是**非数据描述符**（只定义 `__get__`），首次访问后将结果缓存到 `obj.__dict__`，只计算一次（之后从实例字典读取）。

关键区别：`cached_property` 可以被实例字典覆盖（非数据描述符优先级低，见 lab 03）；`@property` 每次访问都重新计算。
