# 19 · collections 与 dataclass：结构化数据容器的选型之道

> 类型标签（`list[int]`、`Stack[T]`）贴上了，结构化数据的样板代码还没着落：
> 命名字段、默认值、比较、哈希、校验……
> `namedtuple` / `NamedTuple` / `dataclass` 各管一段，怎么选是经典选型问题。
> 本实验从 `collections.namedtuple` 出发，按场景理清三种容器的适用边界。

## What

Python 提供多种数据容器来组织结构化数据：`dict` 是最通用的键值对，`namedtuple` 提供不可变的命名字段访问，`dataclass`（Python 3.7+）在灵活性和代码简洁性之间取得最佳平衡。一句话心智模型：**`@dataclass` 是一条"字段注解 → 生成方法 → 实例化校验"的流水线**——读 `__annotations__` 字段 → 生成 `__init__` / `__repr__` / `__eq__` → 实例化时 `__post_init__` 校验 → 实例就绪；旁支 `frozen=True`：任何字段赋值 → `AttributeError`。

## Why

选错了会怎样：用裸 `dict` 传数据没有字段约束、拼错 key 只能运行时炸；把该不可变的配置做成可变对象，哈希和并发安全都无从谈起；手写 `__init__` / `__repr__` / `__eq__` 则是纯粹的样板劳动。本文从 `collections.namedtuple` 出发，逐步介绍 `typing.NamedTuple`、可变/frozen `dataclass`、嵌套 dataclass。

## How

```bash
cd core/19_collections
python3 collections.py        # 运行容器 demo
```

真实输出示例：

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
- **`hash()` 的数值是否稳定取决于内容**：demo 里 `hash(Point(3, 4))` 基于纯 int 元组，同一版本内**可复现**；只有 str/bytes 参与哈希时才受 PYTHONHASHSEED 随机化影响。无论哪种情况都只比较"能否哈希"，不要依赖具体数值

### namedtuple / NamedTuple：不可变命名元组

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

`namedtuple` 本质是 `tuple` 的子类，自动生成 `__repr__`、`__eq__`、`__hash__`，不可变、天然线程安全，适合轻量数据传输。`typing.NamedTuple` 功能等价但支持类型注解（配合 mypy 做静态检查）。

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

`@dataclass` 自动生成 `__init__`、`__repr__`、`__eq__`。两个关键点：

- **`field(default_factory=list)`**：避免可变默认值陷阱——每次实例化生成独立 list
- **`__post_init__`**：`__init__` 之后自动调用，适合参数校验和派生字段计算

### frozen dataclass：不可变 + 可排序

```python
@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int
    patch: int = 0
```

`frozen=True` 禁止修改字段、自动生成 `__hash__`（可做 dict key / set 成员）；`order=True` 自动生成全套比较方法，按字段顺序依次比较。适合版本号、配置项等不应被修改的数据。

### 嵌套 dataclass 与序列化

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

`asdict()` 递归转嵌套字典（适合 JSON 输出），`astuple()` 递归转嵌套元组。

## Deep Dive

**`@dataclass` 省掉的样板里藏着四个必记的坑**：

- **`field(default=[])` 直接 `ValueError`**：dataclass 自 3.7 起就拒绝 list/dict/set 字面默认值（`mutable default ... is not allowed: use default_factory`），从根上挡住共享坑；真正会踩陷阱的是普通函数默认参数 `def f(items=[])`，那里没有这层保护
- **非 frozen 的 dataclass 没有哈希**：不写 `frozen=True` 时 `__hash__` 被设为 `None`——可变对象做哈希键会导致数据不一致
- **`asdict()` / `astuple()` 是深转换（递归）**：嵌套 dataclass、list/dict 都会被递归处理，含自定义对象或循环引用的场景要小心
- **继承 dataclass 时 `__post_init__` 不会自动调父类的**：需手动 `super().__post_init__()`；frozen 子类的 `__init__` 中设值要用 `object.__setattr__(self, 'x', value)`

## Q&A

**Q1: namedtuple 和 dataclass 怎么选？**

| 场景 | 推荐 |
|:---|:---|
| 轻量数据传输（函数返回值） | `namedtuple` |
| 需要类型注解 + 不可变 | `NamedTuple` |
| 需要可变性、校验、默认值 | `dataclass` |
| 不可变 + 可哈希 + 可排序 | `@dataclass(frozen=True, order=True)` |

简单规则：**简单不可变数据用 namedtuple，其余用 dataclass**。
