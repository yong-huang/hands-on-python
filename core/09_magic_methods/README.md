# 09 · 魔术方法：`__eq__` / `__hash__` / `__repr__` 与运算符重载

> 你可能遇到过这种尴尬：自定义类的对象一做 `p1 + p2` 就 `TypeError`，
> 一打印就是 `<Point object at 0x...>`，放进 `set` 去重也全靠对象 id。
> 这些都是因为类没有实现魔术方法（dunder methods）——Python 的运算符和
> 内置函数背后全是它们。本实验把最常用的几个一次讲透。

## What

魔术方法是双下划线命名的特殊方法，是运算符和内置函数的分发目标：`a + b` 调用 `a.__add__(b)`，`len(obj)` 调用 `obj.__len__()`，`str(obj)` 调用 `obj.__str__()`。一句话心智模型：**运算符先问左操作数的类型，不认识就返回 `NotImplemented` 哨兵，解释器再问右操作数的反射方法**。demo 覆盖四块：

| 组件 | 覆盖的魔术方法 |
|:---|:---|
| `Point` | `__repr__`/`__str__`、`__eq__`/`__hash__`、`__add__`/`__mul__`/`__abs__`/`__bool__` |
| `Version` + `@total_ordering` | 只写 `__eq__` + `__lt__`，自动生成全套比较 |
| `DCPoint` + `@dataclass` | 自动生成 `__init__`/`__repr__`/`__eq__` |
| `RingBuffer` | 容器协议：`__len__`/`__getitem__`/`__iter__` |

## Why

不实现它们，自定义类就只是个"属性袋子"——不能比较、不能做 dict key、调试输出全是内存地址。理解魔术方法就能让类像内置类型一样自然地参与运算，配合 `@total_ordering` 和 `@dataclass` 还能大幅减少样板代码。这也是"== vs is""自定义对象怎么做 dict key"等经典问题的答案源头。

## How

```bash
cd core/09_magic_methods
python3 magic_methods.py          # 运行全部 demo
```

真实输出示例：

```
[1] __repr__ vs __str__:
  repr(p): Point(3, 4)
  str(p):  (3, 4)

[2] __eq__ and __hash__:
  p1 == p2: True
  hash(p1) == hash(p2): True
  d[p2]:  origin  (p2 has same hash, found via __eq__)

[3] Operator overloading:
  Point(3, 4) + Point(1, 2) = (4, 6)
  abs(Point(3, 4)) = 5.0

[6] Custom container (RingBuffer):
  append(3): RingBuffer([3, 1, 2], cap=3)
```

诚实预期（本机实测）：

- 本 demo 的哈希全部基于**数值元组**（`hash((self.x, self.y))` 等）——数值类型的哈希不受 `PYTHONHASHSEED` 影响，具体数值**跨运行也稳定**；str/bytes 哈希与默认对象 id 哈希才会因加盐随机化而每次运行不同。其余输出全部确定性可复现
- `Point(3, 4) + "hello"` 抛 `TypeError` 是 `__add__` 返回 `NotImplemented` 后两个操作数都试过的结果，不是异常直接抛出——这是协议回退机制
- 陷阱：只定义 `__eq__` 不定义 `__hash__` 的类会静默失去可哈希性（`__hash__ = None`），`d[obj]` 直接 `TypeError`，本 demo 的 `Point`/`Version` 因此都配套实现了 `__hash__`

`__repr__` vs `__str__`——一个给调试、一个给显示：

```python
def __repr__(self):
    """Debug: unambiguous, should eval back"""
    return f"Point({self.x!r}, {self.y!r})"

def __str__(self):
    """Display: human-readable"""
    return f"({self.x}, {self.y})"
```

最核心的写法是 `__add__` 与 `__eq__` 的"返回哨兵"——不抛异常、不硬转类型，把选择权交回解释器：

```python
def __add__(self, other):
    if isinstance(other, Point):          # 认识右操作数 → 直接算
        return Point(self.x + other.x, self.y + other.y)
    return NotImplemented                 # 不认识 → 交给解释器走反射回退

def __eq__(self, other):
    if not isinstance(other, Point):
        return NotImplemented             # != 也由 __eq__ 派生（取反）
    return self.x == other.x and self.y == other.y

def __hash__(self):
    return hash((self.x, self.y))         # 与 __eq__ 用同一批字段，维持契约
```

减少样板代码的两件套：

```python
# 只需定义 __eq__ + __lt__
@total_ordering
class Version:
    def __eq__(self, other): ...
    def __lt__(self, other): ...
    # 自动生成: __le__, __gt__, __ge__（__ne__ 默认由 __eq__ 派生，不靠该装饰器）

# 自动生成 __init__, __repr__, __eq__
# order=True 再加 __lt__/__le__/__gt__/__ge__ 全套; frozen=True 保留 __hash__
@dataclass(order=True, frozen=True)
class Point:
    x: float
    y: float
```

## Deep Dive

**双目运算符的分发与回退链**（触发时机：运算符求值那一刻）：`Point(3, 4) + "hello"` 时，解释器先调 `type(p).__add__`，该方法返回 `NotImplemented` 哨兵（不是异常）；解释器接着改试右操作数的反射方法 `type("hello").__radd__`，也没有 → 才抛 `TypeError`。这是双目运算符协议的完整回退链。

**`__eq__` 和 `__hash__` 契约**：

```
a == b  →  hash(a) == hash(b)    # 必须满足
hash(a) == hash(b)  ⊭  a == b    # 允许哈希碰撞
```

定义了 `__eq__` 但没有定义 `__hash__` 时，Python 自动设 `__hash__ = None`，对象变为不可哈希（不能做 dict key）。

踩坑清单：

- **只定义 `__eq__` 不定义 `__hash__`**：`__hash__` 被静默置为 `None`，对象不可哈希，`d[obj]` 直接 `TypeError`——`Point`/`Version` 都必须配套实现 `__hash__`
- **误抛 `NotImplementedError`**：它是"子类必须实现"的异常；`__add__` 里要返回的是哨兵值 `NotImplemented`，抛错了整个反射回退机制就失效
- **`__hash__` 与 `__eq__` 字段不一致**：相等对象哈希不同，dict 里永远查不到

## Q&A

**Q1: `NotImplemented` 和 `NotImplementedError` 的区别？**
前者是魔术方法返回值，表示"不支持这个操作"，Python 会尝试交换操作数；后者是异常，表示"子类必须实现"。见 Core 踩坑清单第二条。

**Q2: `dataclass` 能替代普通类吗？**
大多数场景可以。但 `dataclass` 不适合需要复杂 `__init__` 逻辑或非标准属性管理的场景。

**Q3: `@total_ordering` 至少要实现哪些方法？**
`__eq__` 加任意一个比较方法（惯用 `__lt__`），其余自动生成；等价捷径是 `@dataclass(order=True)`。
