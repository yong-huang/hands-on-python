# 12 · `__new__` vs `__init__`：对象创建生命周期

> `MyClass()` 看似一行，背后实际是两步：`__new__`（分配内存并返回实例）先执行，
> `__init__`（设置初始属性）后执行。读完本篇，你能说清两者的职责分界，
> 并实现实例缓存、不可变类型子类与简单工厂。

## Background

这节解释对象的"出生"为什么值得单独讲。日常写类只定义 `__init__`，从没写过
`__new__`——因为基类 `object` 已经默认提供了一个。这条默认路径覆盖了绝大多
数场景，多数工程师长期感知不到两者的分工。

痛点出现在需要控制"创建"本身的时刻，三类典型。其一，单例（singleton
模式）：想让一个类全进程只有一个实例。其二，子类化 `str`/`int` 并在创建
时改写值——但 `__init__` 拿到的 `self` 已经是一个创建完成的实例，值改
不动了。

其三是工厂需求：想让 `SomeClass(x)` 按参数返回不同类型的对象。这些需求
在 `__init__` 里都无从下手。

Python 对象模型的应对是把"出生"拆成两个钩子：`__new__` 在前，负责造出
对象；`__init__` 在后，负责初始化它。控制创建的需求由此有了明确落点。

## What

本节给出两步创建的定义与心智模型。

Python 创建对象实际经历两步：`__new__` 负责分配内存并返回实例，`__init__`
负责初始化属性。一句话心智模型：**`__new__` 决定"给哪个对象"，`__init__`
只负责"初始化它"——返回的不是 `cls` 实例，`__init__` 就不执行**。

可以把 `MyClass()` 想象成买房入住：`__new__` 是盖房交付（决定房子在哪儿、
是不是这套房），`__init__` 是装修布置。但和装修不同的是：只要交付的不是
`cls` 的房子，装修工序会被整个跳过。

沿 `CachedInstance(key)` 走一遍：`__new__(cls, ...)` 先查缓存——命中返回
旧实例，未命中 `super().__new__(cls)` 分配新实例 → `__init__` 初始化。

## When to Use

这节给判断力：哪些场景值得碰 `__new__`，哪些场景别碰。

- **子类化不可变类型**（immutable，创建后值无法修改的类型，如
  `str`/`int`/`tuple`/`float`）：改写值必须发生在创建阶段
- **单例或实例缓存**：按参数复用实例，如数据库连接池（连接池：复用一组
  连接，避免每次操作都重新建立连接的开销）、配置对象
- **工厂模式**（factory，用统一的构造入口按参数返回不同类型的对象）：
  想让 `SomeClass('list')` 直接返回 `[]` 这类不同类型

何时不用：日常业务类只写 `__init__` 就够，`__new__` 属于少数场景工具；
只是需要"全局唯一对象"而不涉及类行为时，模块级变量是更简单的单例。

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| 只写 `__init__` | 不控制创建，仅初始化 | 日常业务类的默认选择 |
| `__new__` 缓存 | 在实例层面拦截创建 | 需要按参数复用实例 |
| 模块级变量 | 天然单例，不经过类 | 只需要全局唯一对象 |
| 元类（metaclass，"类的类"，控制类本身的创建，见 lab 05） | 在类创建层面拦截 | 把单例等约束批量施加到多个类 |

## Quick Start

### 运行与真实输出

前置条件：Python 3，无第三方依赖。运行 demo 并对照输出读代码：

```bash
cd core/12_new_vs_init
python3 new_vs_init.py          # 运行 demo
```

真实输出示例：

```
[1] __new__ then __init__:
  obj = Tracked()
  __new__ called (#1) -> creating instance of Tracked
  __init__ called -> initializing <__main__.Tracked object at 0x109127970>

[2] __new__ caching:
  CachedInstance('a'):
  __new__: created new instance for 'a'
  __init__: initializing with key='a'
  CachedInstance('a') again:
  __new__: returning cached instance for 'a'
  __init__: initializing with key='a'
  a1 is a2: True
  CachedInstance('b'):
  __new__: created new instance for 'b'
  __init__: initializing with key='b'
  a1 is b: False

[3] Immutable subclass (must use __new__):
  UpperStr('hello world'): 'HELLO WORLD' (type: UpperStr)
  s.original: hello world
  isinstance(s, str): True
  s + ' python': HELLO WORLD python
  LimitedInt(150, 0, 100): 100
  isinstance(n, int): True

[4] __new__ returns different types:
  Factory('list'): [] (type: list)
  Factory('dict'): {} (type: dict)

[5] Key rules:
  1. __new__ allocates memory, __init__ initializes
  2. __new__ returns instance, __init__ returns None
  3. __new__ can return existing instance (caching)
  4. __new__ can return different type (factory)
  5. Immutable types: must override __new__, not __init__
  6. __new__ returns non-cls instance -> __init__ NOT called
```

诚实预期：

- demo 输出是**确定性的**，但 `[1]` 中的实例内存地址（`0x109127970`）每次运行都不同，属正常现象
- `[2]` 中第二次 `CachedInstance('a')` 仍会打印 `__init__` 行 —— 缓存命中跳过的是**创建**，不会跳过 `__init__`（见 Core 踩坑清单），不是 bug
- `Tracked._count` 是类级计数器，重复运行 demo 会从 1 重新开始（进程重启），但同一进程内多次 `import` 会累积

### 代码走读

demo 由五个环节组成，对应输出的 `[1]`–`[5]`。`[1]` 职责划分——这段在
做什么：`__new__` 先于 `__init__` 执行并返回实例，类级计数器记录创建次数。

```python
class Tracked:
    _count = 0

    def __new__(cls):
        Tracked._count += 1
        instance = super().__new__(cls)    # 分配内存，返回实例
        return instance

    def __init__(self):
        print(f"  __init__ called")        # 初始化属性，返回 None
```

- `__new__(cls, ...)` 按**静态方法**处理（数据模型的特殊约定，无需装饰器；惯例第一个参数是 `cls` 且显式传入），负责创建实例并返回它
- `__init__(self, ...)` 是**实例方法**，负责设置属性
- 调用顺序：`MyClass()` → `__new__` → 返回 instance → `__init__`

`[2]` 实例缓存——这段在做什么：`__new__` 先查类级 `_cache`，命中直接返回
旧实例，未命中才分配新实例并登记进缓存。

```python
class CachedInstance:
    _cache = {}

    def __new__(cls, key):
        if key in cls._cache:              # 命中缓存，直接返回
            return cls._cache[key]
        instance = super().__new__(cls)
        instance.key = key
        cls._cache[key] = instance         # 新实例放入缓存
        return instance
```

适用于单例、数据库连接池、配置对象；实现单例更常见的方式是模块级变量或
元类（见 lab 05），`__new__` 缓存是其中一种方案。

`[3]`–`[5]` 的不可变子类、工厂与完整规则清单，在 How It Works 逐个展开。

## How It Works

这节解释输出 `[3]`–`[5]` 背后的机制，并回答"为什么 `__init__` 在这些场景
失灵"。

### 不可变类型：为什么只能在 `__new__` 里改值

这段在做什么：`UpperStr` 在 `__new__` 里完成大写转换，`__init__` 只附加
`original`；`LimitedInt` 在 `__new__` 里把值夹进 `[min_val, max_val]`。

```python
class UpperStr(str):
    def __new__(cls, value):
        return super().__new__(cls, value.upper())  # 必须在 __new__ 中修改值

    def __init__(self, value):
        self.original = value               # __init__ 只能设置额外属性

class LimitedInt(int):
    def __new__(cls, value, min_val=0, max_val=100):
        value = max(min_val, min(max_val, value))
        return super().__new__(cls, value)  # 限制范围
```

`str`/`int`/`tuple` 等不可变类型**必须在 `__new__` 中修改值**——值在
`__new__` 返回时就已确定，`__init__` 改不动。

对照输出 `[3]`：`UpperStr('hello world')` 直接得到 `'HELLO WORLD'`，而
`s.original` 仍是原值——转换发生在 `__new__`，`original` 附加在
`__init__`。

### 工厂：返回别的类型，`__init__` 就被跳过

这段在做什么：`Factory.__new__` 按参数直接返回 `list` 或 `dict`，
根本不构造 `Factory` 自己的实例。

```python
class Factory:
    def __new__(cls, kind):
        if kind == "list":
            return []                       # 返回 list，不是 Factory 实例
        elif kind == "dict":
            return {}
```

`__new__` 返回非 `cls` 的实例时，`__init__` **不会被调用**——本质是用
构造函数语法实现的工厂模式，`int()`、`str()` 等内置类型就是这样工作的。
输出 `[4]` 里 `Factory('list')` 的 type 是 `list`，就来自这里。

### 最核心：缓存仲裁

`CachedInstance` 里最关键的是 `__new__` 从"分配者"变成"仲裁者"——决定
返回新对象还是旧对象：

```python
def __new__(cls, key):
    if key in cls._cache:
        return cls._cache[key]   # 为什么：返回的是已注册的 cls 实例，
                                 # Python 照样会对它调用 __init__（重新初始化！）
    instance = super().__new__(cls)
    instance.key = key           # 为什么在这里设属性：此刻实例刚分配出来，
                                 # __init__ 尚未运行，缓存键只能由 __new__ 写入
    cls._cache[key] = instance
    return instance
```

输出 `[2]` 里第二次 `CachedInstance('a')` 仍打印 `__init__` 行，就来自
注释里那一点：返回已注册实例后，Python 照样调用 `__init__`。

## Pitfalls & Q&A

这节汇总三个经典坑。共同根源是一个：`__init__` 是否执行、能否改值，都由
`__new__` 的返回值决定，而不是由你自己决定。

**坑 1：缓存命中后 `__init__` 仍会执行。**
现象：第二次 `CachedInstance('a')` 的初始化逻辑又跑了一遍。
原因：缓存命中跳过的是创建不是初始化。

解法：需要避免重复初始化，就在 `__init__` 加标志位检查，或改用元类/装饰器
实现单例。

**坑 2：`__new__` 返回非 `cls` 实例时 `__init__` 不被调用。**
现象：Factory 返回 `[]`/`{}` 后 `Factory.__init__` 完全静默。
原因：解释器只在 `__new__` 返回 `cls` 实例时才接着调用 `__init__`。

解法：依赖 `__init__` 做准备工作的代码不要放进这类工厂类，准备工作放到
`__new__` 里完成。

**坑 3：不可变类型在 `__init__` 里改值是无效的。**
现象：在 `UpperStr.__init__` 里做 `value.upper()`，得到的字符串没有变大写。
原因：不可变类型的值在 `__new__` 返回时已确定。

解法：转换必须放进 `__new__`；`__init__` 只能附加 `original` 这类额外
属性。

**Q：`__new__` 和 `__init__` 的区别一张速查？**

`__new__` 首参 `cls`、必须返回实例、按静态方法处理；`__init__` 首参
`self`、返回 `None`（被忽略）、是实例方法。职责与顺序的展开见 What 与
Quick Start 的职责划分。
