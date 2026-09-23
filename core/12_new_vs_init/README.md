# 12 · `__new__` vs `__init__`：对象创建生命周期

> 属性怎么"读"出来理清了，对象又是怎么"生"出来的？
> `MyClass()` 看似一行，背后实际是两步：`__new__` 分配内存返回实例，`__init__` 设置属性。
> 平时只写 `__init__` 没问题，可一旦要子类化 `str`/`int`、做单例缓存或工厂，
> 不知道 `__new__` 的存在就寸步难行——这正是多数人含糊不清的分界线。

## What

Python 创建对象实际经历两步：`__new__` 负责分配内存并返回实例，`__init__` 负责初始化属性。一句话心智模型：**`__new__` 决定"给哪个对象"，`__init__` 只负责"初始化它"——返回的不是 `cls` 实例，`__init__` 就不执行**。沿 `CachedInstance(key)` 走一遍：`__new__(cls, ...)` 先查缓存——命中返回旧实例，未命中 `super().__new__(cls)` 分配新实例 → `__init__` 初始化。

## Why

绝大多数场景只需要 `__init__`，但当你需要**子类化不可变类型**（`str`/`int`/`tuple`）、实现**单例/缓存**、或控制实例创建（如连接池）时，`__init__` 拿到的 `self` 已经是一个创建完成的实例，改不动了——`__new__` 就是必不可少的工具。理解两者的职责和交互机制，是掌握 Python 对象模型底层设计的入口。

## How

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

诚实预期（本机实测）：

- demo 输出是**确定性的**，但 `[1]` 中的实例内存地址（`0x109127970`）每次运行都不同，属正常现象
- `[2]` 中第二次 `CachedInstance('a')` 仍会打印 `__init__` 行 —— 缓存命中跳过的是**创建**，不会跳过 `__init__`（见 Core 踩坑清单），不是 bug
- `Tracked._count` 是类级计数器，重复运行 demo 会从 1 重新开始（进程重启），但同一进程内多次 `import` 会累积

### 职责划分

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

### 实例缓存

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

适用于单例、数据库连接池、配置对象；实现单例更常见的方式是模块级变量或元类（见 lab 05），`__new__` 缓存是其中一种方案。

### 不可变类型的子类化

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

`str`/`int`/`tuple` 等不可变类型**必须在 `__new__` 中修改值**——值在 `__new__` 返回时就已确定，`__init__` 改不动。

### 工厂模式

```python
class Factory:
    def __new__(cls, kind):
        if kind == "list":
            return []                       # 返回 list，不是 Factory 实例
        elif kind == "dict":
            return {}
```

`__new__` 返回非 `cls` 的实例时，`__init__` **不会被调用**——本质是用构造函数语法实现的工厂模式，`int()`、`str()` 等内置类型就是这样工作的。

## Deep Dive

**最核心的是 `CachedInstance`**——`__new__` 从"分配者"变成"仲裁者"，决定返回新对象还是旧对象：

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

踩坑清单：

- **缓存命中后 `__init__` 仍会执行**：跳过的是创建不是初始化；需要避免重复初始化就在 `__init__` 加标志位检查，或改用元类/装饰器实现单例
- **`__new__` 返回非 `cls` 实例时 `__init__` 不被调用**：Factory 返回 `[]`/`{}` 后 `Factory.__init__` 完全静默——依赖 `__init__` 做准备工作的代码会踩空
- **不可变类型在 `__init__` 里改值是无效的**：`UpperStr` 的转换必须放进 `__new__`；`__init__` 只能附加 `original` 这类额外属性

## Q&A

**Q1: `__new__` 和 `__init__` 的区别？**

| | `__new__` | `__init__` |
|---|---|---|
| 职责 | 创建实例（分配内存） | 初始化实例（设置属性） |
| 第一个参数 | `cls`（类） | `self`（实例） |
| 返回值 | 必须返回实例 | 返回 `None`（被忽略） |
| 方法类型 | 静态方法（隐式，按惯例首参为 cls） | 实例方法 |

**Q2: 日常开发中什么时候需要用 `__new__`？**

绝大多数情况不需要。只在以下场景使用：

- 子类化 `str`/`int`/`tuple`/`float` 等不可变类型
- 实现单例或实例缓存
- 需要控制实例创建逻辑（如连接池）
- 工厂模式（返回不同类型）
