# 19 · collections 与 dataclass：结构化数据容器的选型之道

> 结构化数据用什么装？裸 `dict` 拼错 key 只能运行时炸，手写 `__init__` / `__repr__` / `__eq__` 又是纯样板劳动。
> `namedtuple` / `NamedTuple` / `dataclass` 各管一段，怎么选是经典选型问题。
> 本实验用可运行的 demo 从 `collections.namedtuple` 出发，按场景理清三种容器的适用边界。

## Background

这节讲来龙去脉：传一组带名字的数据，以前有哪些做法、各撞什么墙。

最常见的做法是裸 `dict`：`{"name": ..., "price": ...}` 随手一造。字段名全凭记忆，拼错 key 要么当场 `KeyError`，要么用 `.get()` 静默拿到 `None` 一路传到下游；字段有哪些、能不能为空，不看构造代码无从得知。

讲究一点就手写类：`__init__` 里逐个赋值，再补 `__repr__` 和 `__eq__`。每个数据类十行起步，纯粹是样板劳动；漏写 `__eq__`，两个值完全相同的对象比较结果还是不相等——默认比较的是内存身份。

标准库对此的回应分三步：Python 2.6 的 `namedtuple`（命名元组——字段能按名字访问的不可变元组）解决了字段访问；`typing.NamedTuple` 在其上加类型注解。

Python 3.7 的 `dataclass`（数据类——用字段注解自动生成 `__init__` 等方法的类装饰器）把剩余样板一并接管，本实验的选型谱系就此成形。

## What

这节给出定义与心智模型：三种容器各是什么，`@dataclass` 的流水线怎么转。

Python 提供多种数据容器来组织结构化数据：`dict` 是最通用的键值对，`namedtuple` 提供不可变的命名字段访问，`dataclass`（Python 3.7+）在灵活性和代码简洁性之间取得平衡。

一句话心智模型：**`@dataclass` 是一条"字段注解 → 生成方法 → 实例化校验"的流水线**。

流程：读 `__annotations__`（类身上存放字段注解的字典）字段 → 生成 `__init__` / `__repr__` / `__eq__` → 实例化时 `__post_init__` 校验 → 实例就绪；旁支 `frozen=True`：任何字段赋值 → `AttributeError`。

可以把 `@dataclass` 想象成填表生成器：你只填一张字段清单（注解），它替你印好取号（`__init__`）、打印（`__repr__`）、对账（`__eq__`）三类单据模板。

但和真实打印不同的是，模板在类定义那一刻就全部生成完毕，实例化时不做任何代码生成；生成器不会替你把关数据——校验得自己挂在 `__post_init__` 里。

## When to Use

这节讲在做什么事的时候选哪种容器，以及什么时候都不必用。

三类典型场景：

- **函数要返回一组命名的值**：坐标、统计结果这类轻量传输，用 `namedtuple`——不可变、开销小、自带可读 repr。
- **记录需要默认值、校验或后续修改**：商品、员工、配置项，用 `dataclass`，校验挂 `__post_init__`。
- **版本号、排序键等不应被修改的数据**：用 `@dataclass(frozen=True, order=True)`，不可变、可哈希（能算出稳定 hash 值，因此能做 dict key 或放入 set）、可排序。

何时不用：

- 字段一两个且生命周期只有几行：直接传 tuple 或 dict 更省事。
- 行为远多于数据的对象：写普通 class，dataclass 的主战场是数据载体。
- 需要跨进程/落盘的结构化协议：dataclass 只解决内存中的形态，序列化（把内存对象转成 JSON 这类可存储、可传输格式的操作）要另配方案。

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| 裸 `dict` | 无字段约束，拼错 key 运行时才炸 | 原型期、键本身动态 |
| `namedtuple` | 不可变、轻量、自动 `__repr__`/`__eq__`/`__hash__` | 轻量数据传输（函数返回值） |
| `typing.NamedTuple` | 同 namedtuple + 类型注解 | 需要注解配合 mypy 的不可变记录 |
| `dataclass` | 可变，自动生成方法，支持默认值与校验 | 需要可变性、校验、默认值 |
| `@dataclass(frozen=True, order=True)` | 不可变 + 可哈希 + 可排序 | 不应被修改的数据（版本号等） |

简单规则：**简单不可变数据用 namedtuple，其余用 dataclass**（输出 [7] 的 Comparison guide 同此）。

## Quick Start

这节给出最小可运行路径：跑通 demo，读输出示例，再上手最核心的 dataclass 写法。只用标准库，无第三方包。

```bash
cd core/19_collections
python3 collections.py        # 运行容器 demo
```

真实输出示例（节选：省略开头 demo 标题横线与结尾分隔线）：

```
[1] namedtuple:
  Point(3, 4): x=3, y=4
  repr: Point(x=3, y=4)
  hashable: 1079245023883434373 (can be dict key)
  dict key: [Point(x=3, y=4)]
  Color: Color(r=255, g=0, b=0, name='red')

[2] Typed NamedTuple:
  TypedPoint(3.5, 4.5): TypedPoint(x=3.5, y=4.5)
  __annotations__: {'x': <class 'float'>, 'y': <class 'float'>}

[3] dataclass (mutable):
  Product(name='Laptop', price=999.99, in_stock=True, tags=['electronics'])
  After modify: Product(name='Laptop', price=899.99, in_stock=True, tags=['electronics', 'sale'])
  Product('Free', -1): price=0.0 (clamped to 0)

[4] dataclass (frozen=True, order=True):
  Sorted: [Version(major=1, minor=10, patch=0), Version(major=2, minor=0, patch=0), Version(major=2, minor=0, patch=1)]
  Hashable: 7853416581674910768
  versions[0].major = 3 -> AttributeError: frozen

[5] Nested dataclass:
  Employee(name='Alice', age=30, address=Address(city='Shanghai', street='Nanjing Rd'))
  asdict: {'name': 'Alice', 'age': 30, 'address': {'city': 'Shanghai', 'street': 'Nanjing Rd'}}

[6] Conversion utilities:
  asdict(prod): ['name', 'price', 'in_stock', 'tags']
  tuple(Point(3,4)): (3, 4)

[7] Comparison guide:
  dict:      mutable, no field access, no defaults
  namedtuple: immutable, field access, lightweight
  dataclass: mutable/frozen, auto methods, flexible
  Rule: simple data transfer -> namedtuple
        need mutation/validation -> dataclass
```

诚实预期（本机实测）：

- demo 行为全部**确定性**：排序结果、frozen 的 `AttributeError`、`asdict` 递归转换在任何 CPython 3.7+ 上一致
- **`hash()` 的数值是否稳定取决于内容**：demo 里 `hash(Point(3, 4))` 基于纯 int 元组，同一版本内**可复现**；只有 str/bytes 参与哈希时才受 PYTHONHASHSEED（Python 启动时的哈希随机化环境变量）随机化影响。无论哪种情况都只比较"能否哈希"，不要依赖具体数值

### dataclass：自动生成样板代码

```python
from dataclasses import dataclass, field

@dataclass
class Product:
    name: str
    price: float
    in_stock: bool = True
    tags: list = field(default_factory=list)

    def __post_init__(self):
        if self.price < 0:
            self.price = 0.0
```

这段在做什么：只声明字段，`@dataclass` 自动补齐 `__init__`、`__repr__`、`__eq__`。两个关键点——

- **`field(default_factory=list)`**：避免可变默认值陷阱——每次实例化生成独立 list
- **`__post_init__`**：`__init__` 之后自动调用，适合参数校验和派生字段计算

输出 [3] 里 `price=-1` 被钳到 `0.0`，就是 `__post_init__` 在起作用；`tags` 能安全 `append`，靠的是 `default_factory`。

## How It Works

这节拆开流水线看机制：namedtuple 的类是怎么生成的，dataclass 的方法从哪来，frozen、order、asdict 各自做了什么。

### namedtuple / NamedTuple：代码与生成机制

```python
from collections import namedtuple
Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)
p.x, p.y          # 3, 4（字段名访问）
hash(p)           # 可哈希，可做 dict key

from typing import NamedTuple
class TypedPoint(NamedTuple):
    x: float
    y: float
```

这段在做什么：两种等价写法——工厂函数式与类声明式。`namedtuple` 本质是 `tuple` 的子类，自动生成 `__repr__`、`__eq__`、`__hash__`，不可变、天然线程安全，适合轻量数据传输。

机制上，`namedtuple` 是工厂函数：调用时动态生成一个 `tuple` 子类，方法在类创建时就绑定好，实例仍按 tuple 方式存储——所以输出 [1] 里 `hash(p)` 可用、能直接做 dict key，`tuple(Point(3,4))` 能无损转回元组（输出 [6]）。

`typing.NamedTuple` 功能等价但支持类型注解（配合 mypy 做静态检查），走类声明语法，字段注解落进 `__annotations__`——输出 [2] 打印的正是它。

### `@dataclass` 的生成流水线

装饰器读取类体里的字段注解，按声明顺序合成 `__init__`（无默认值的字段在前），再补 `__repr__` 与逐字段比较的 `__eq__`。

`field(default_factory=list)` 让 `__init__` 在每次实例化时调用 `list()` 造新列表，从源头避开共享可变默认值。输出 [3] 的 repr 与逐字段相等判断，都来自这批生成方法。

### frozen 与 order：不可变如何兼得排序

```python
@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int
    patch: int = 0
```

`frozen=True` 把字段赋值拦截为 `AttributeError`（输出 [4] 的 `versions[0].major = 3`），并自动生成 `__hash__`，实例可做 dict key / set 成员。

`order=True` 生成全套比较方法，按字段定义顺序依次比较——输出 [4] 的排序结果 `1.10 < 2.0 < 2.0.1` 正是先比 `major` 再比 `minor`、`patch` 的效果。适合版本号、配置项等不应被修改的数据。

### 嵌套 dataclass 与 asdict 的递归

```python
@dataclass
class Address:
    city: str
    street: str

@dataclass
class Employee:
    name: str
    age: int
    address: Address = None

asdict(emp)   # {'name': ..., 'address': {'city': ..., 'street': ...}}
```

`asdict()` 递归转换：嵌套 dataclass、list/dict 逐层展开成纯字典（输出 [5]），适合 JSON 输出；`astuple()` 同理转嵌套元组。递归行为带来的边界（循环引用、自定义对象）见下方踩坑清单。

## Pitfalls & Q&A

这节收录 `@dataclass` 省掉的样板里藏着的四个坑，以及一条选型指引。

**坑 1：`field(default=[])` 直接 `ValueError`。**

- 现象：类定义时就抛 `mutable default ... is not allowed: use default_factory`，写都写不完。
- 原因：dataclass 自 3.7 起拒绝 list/dict/set 字面默认值，从根上挡住共享可变默认值的坑。
- 解法：改用 `field(default_factory=list)`。真正会踩共享陷阱的是普通函数默认参数 `def f(items=[])`——那里没有这层保护，需自行规避。

**坑 2：非 frozen 的 dataclass 没有哈希。**

- 现象：把可变 dataclass 实例放进 set 或当 dict key，报 `unhashable`。
- 原因：不写 `frozen=True` 时 `__hash__` 被设为 `None`——可变对象做哈希键会导致数据不一致。
- 解法：数据语义上不该变就用 `frozen=True`；确实可变的对象不要当哈希键。

**坑 3：`asdict()` / `astuple()` 是深转换（递归）。**

- 现象：嵌套结构大时转换开销明显；结构含循环引用或不可递归展开的自定义对象时出错或结果意外。
- 原因：二者会递归处理嵌套 dataclass 与 list/dict。
- 解法：只需浅层转换时自己构造 dict；含循环引用的结构避免使用，先手工拆环。

**坑 4：继承 dataclass 时 `__post_init__` 不会自动调父类的。**

- 现象：子类实例化后父类的校验悄然失效。
- 原因：子类定义的 `__post_init__` 覆盖了父类实现，Python 按名字查找方法，只命中子类那一个，不会自动再调父类的。
- 解法：子类里手动 `super().__post_init__()`；frozen 子类的 `__init__` 中设值要用 `object.__setattr__(self, 'x', value)`。

**Q：namedtuple 和 dataclass 怎么选？**
完整选型矩阵见 When to Use 的对比表。一句话规则——简单不可变数据用 namedtuple，其余用 dataclass；需要不可变加排序再加 `frozen=True, order=True`。
