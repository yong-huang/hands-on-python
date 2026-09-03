# 12 · `__new__` vs `__init__`：对象创建生命周期

## 1. 引言

Python 创建对象时实际经历两步：`__new__` 负责分配内存并返回实例，`__init__` 负责初始化属性。绝大多数场景只需要 `__init__`，但当你需要**子类化不可变类型**（`str`/`int`/`tuple`）、实现**单例/缓存**、或控制实例创建（如连接池）时，`__new__` 就是必不可少的工具。这是 Python 面试中的高频考点，理解两者的职责和交互机制，能清晰展示对 Python 对象模型底层设计的掌握。

## 2. 文件结构

```
12_new_vs_init/
├── README.md              # 本教程文档
├── new_vs_init.py         # 主演示脚本：调用顺序 / 实例缓存 / 不可变子类 / 工厂
└── images/
    ├── new_vs_init.archify.html  # 交互示意图（浏览器打开）
    └── new_vs_init.archify.json  # 图源（typed JSON）
```

主脚本内容：

```
new_vs_init.py
├── 1. Tracked                        # 追踪 __new__ 和 __init__ 的调用顺序
├── 2. CachedInstance                 # __new__ 实现实例缓存（单例变体）
├── 3. UpperStr(str) / LimitedInt(int) # 不可变类型的子类化（必须用 __new__）
├── 4. Factory                        # __new__ 返回不同类型的实例
└── 5. run_demo()                     # 交互式演示
```

## 3. 核心概念

### 3.1 `__new__` 与 `__init__` 的职责

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
- 调用顺序：`MyClass()` -> `__new__` -> 返回 instance -> `__init__`
- `__new__` 必须返回实例，`__init__` 返回值被忽略（通常返回 `None`）

### 3.2 实例缓存

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

- `__new__` 返回**已有实例**时，`__init__` 仍然会被调用（这是 Python 的行为）
- 缓存模式适用于：**单例**、**数据库连接池**、**配置对象**
- 实现单例更常见的方式是用模块级变量或元类，`__new__` 缓存是其中一种方案

### 3.3 不可变类型的子类化

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

- `str`、`int`、`tuple` 等不可变类型**必须在 `__new__` 中修改值**
- `__init__` 无法修改不可变类型的值，因为值在 `__new__` 返回时就已确定
- 这是 `__new__` 最常见的实际用途之一

### 3.4 工厂模式

```python
class Factory:
    def __new__(cls, kind):
        if kind == "list":
            return []                       # 返回 list，不是 Factory 实例
        elif kind == "dict":
            return {}
        elif kind == "set":
            return set()
```

- `__new__` 返回非 `cls` 的实例时，`__init__` **不会被调用**
- 本质上是用构造函数语法实现的工厂模式，`int()`、`str()` 等内置类型的构造函数就是这样工作的

### 3.5 高频追问

**Q1: `__new__` 和 `__init__` 的区别？**

| | `__new__` | `__init__` |
|---|---|---|
| 职责 | 创建实例（分配内存） | 初始化实例（设置属性） |
| 第一个参数 | `cls`（类） | `self`（实例） |
| 返回值 | 必须返回实例 | 返回 `None`（被忽略） |
| 是静态方法还是实例方法 | 静态方法（隐式，按惯例首参为 cls） | 实例方法 |

**Q2: `__new__` 返回非 `cls` 实例时会发生什么？**

`__init__` 不会被调用。只有当 `__new__` 返回的是 `cls`（或其子类）的实例时，Python 才会继续调用 `__init__`。工厂模式就是利用这个特性。

**Q3: 为什么子类化不可变类型必须用 `__new__`？**

不可变对象的值在创建后不能修改。`__init__` 接收的 `self` 已经是一个创建完成的实例，无法再改变其值。必须在 `__new__` 中将修改后的值传给 `super().__new__()` 才能生效。

**Q4: `__new__` 实现缓存时 `__init__` 会被调用吗？**

会。即使 `__new__` 返回了缓存的已有实例，`__init__` 仍然会被调用。如果需要避免重复初始化，可以在 `__init__` 中加标志位检查，或改用元类/装饰器实现单例。

**Q5: 日常开发中什么时候需要用 `__new__`？**

绝大多数情况不需要。只在以下场景使用：
- 子类化 `str`/`int`/`tuple`/`float` 等不可变类型
- 实现单例或实例缓存
- 需要控制实例创建逻辑（如连接池）
- 工厂模式（返回不同类型）

## 4. 实操演示

```bash
cd interview/12_new_vs_init
python3 new_vs_init.py          # 运行 demo（无需 matplotlib）
# 交互示意图: 浏览器打开 images/new_vs_init.archify.html
```

真实输出示例（macOS, CPython 3.10）：

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

## 5. 预期结果与陷阱

**交互示意图**：[浏览器打开](images/new_vs_init.archify.html)（自包含 HTML：trace 动画、深/浅主题、节点检索与路径追踪；图源 `images/new_vs_init.archify.json`）。

对象创建两步走：`__new__(cls, ...)` 先查缓存——命中返回旧实例（注意 `__init__` 仍会重新执行），未命中 `super().__new__(cls)` 分配新实例 → `__init__` 初始化。

诚实预期（本机实测）：

- demo 输出是**确定性的**，但 `[1]` 中的实例内存地址（`0x109127970`）每次运行都不同，属正常现象
- `[2]` 中第二次 `CachedInstance('a')` 仍会打印 `__init__` 行 —— 缓存命中跳过的是**创建**，不会跳过 `__init__`（见高频追问 Q4），不是 bug
- `Tracked._count` 是类级计数器，重复运行 demo 会从 1 重新开始（进程重启），但同一进程内多次 `import` 会累积

## 6. 小结

1. **`__new__` 创建实例，`__init__` 初始化实例**，两者配合完成对象创建
2. **`__new__` 返回非 `cls` 实例时，`__init__` 不会被调用**，这是工厂模式的实现基础
3. **不可变类型子类化必须在 `__new__` 中修改值**，`__init__` 无法修改已创建的不可变对象
4. **缓存/单例通过 `__new__` 返回已有实例实现**，但 `__init__` 仍会被调用，需注意重复初始化
5. **95% 的场景只需要 `__init__`**，不要滥用 `__new__`

下一篇进入 13_callable：看 `__call__` 如何让实例像函数一样被调用。
