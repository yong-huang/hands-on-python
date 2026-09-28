# 09 · 魔术方法：`__eq__` / `__hash__` / `__repr__` 与运算符重载

> 你可能遇到过这种尴尬：自定义类的对象一做 `p1 + p2` 就 `TypeError`，
> 一打印就是 `<Point object at 0x...>`，放进 `set` 去重也全靠对象 id。
> 这些都是因为类没有实现魔术方法（dunder methods，名称前后各带双下划线的特殊方法）——
> Python 的运算符和内置函数背后全是它们。本篇把最常用的几个讲清楚。

## Background

这节讲问题域：不实现特殊方法的自定义类用起来是什么体验、卡在哪里、语言层面预留了什么出口。

没有魔术方法的时代（或者说没实现它们的类），行为全靠手写普通方法：加法自己写 `.add()`，相等自己写 `.is_equal()`，打印靠手动拼字符串。类退化成一个"属性袋子"。

撞墙的场景很具体：`p1 + p2` 直接 `TypeError`；调试输出是 `<Point object at 0x...>`；两个数值上相等的点放进 `dict`，存的时候用一个对象、取的时候新造一个，就永远查不到——默认的相等与哈希只认对象 id。

出口是语言本身预留的：Python 的运算符和内置函数背后全是这套分发机制，类实现对应的魔术方法，就能接入同一套语法——像内置类型一样参与运算、比较、去重，配合装饰器还能省掉大段样板代码。

## What

这节给出定义与心智模型，并列出 demo 覆盖的四块内容。

魔术方法是双下划线命名的特殊方法，是运算符和内置函数的分发目标：`a + b` 调用 `a.__add__(b)`，`len(obj)` 调用 `obj.__len__()`，`str(obj)` 调用 `obj.__str__()`。

一句话心智模型：**运算符先问左操作数的类型，不认识就返回 `NotImplemented` 哨兵（一个表示"本类不支持"的特殊值，不是异常），解释器再问右操作数的反射方法（`__radd__` 这类定义在右操作数侧的方法）**。

demo 覆盖四块：

| 组件 | 覆盖的魔术方法 |
|:---|:---|
| `Point` | `__repr__`/`__str__`、`__eq__`/`__hash__`、`__add__`/`__mul__`/`__abs__`/`__bool__` |
| `Version` + `@total_ordering` | 只写 `__eq__` + `__lt__`，自动生成全套比较 |
| `DCPoint` + `@dataclass` | 自动生成 `__init__`/`__repr__`/`__eq__` |
| `RingBuffer` | 容器协议（一组约定好的方法名，实现即可接入 `len()`/下标/循环）：`__len__`/`__getitem__`/`__iter__` |

## When to Use

这节给判断依据：什么类值得实现魔术方法，什么时候别硬加。

典型场景——在做什么事的时候：

- 写值对象（相等性由字段值而非对象身份决定的类型，如坐标、金额、版本号）时，实现 `__eq__`/`__hash__`，让它能比较、能做 `dict` key、能在 `set` 里去重
- 领域类型需要自然参与运算时，做运算符重载——`p1 + p2`、`abs(p)` 比方法调用 `p1.add(p2)` 贴近问题本身
- 排查问题时给类实现 `__repr__`，让日志里看到的是 `Point(3, 4)` 而不是内存地址

何时不用：

- 行为不像值类型的类别硬加运算符——给服务类加 `__add__` 只会误导调用者
- 一次性脚本里只有几个字段、不需要比较和哈希时，普通类或 `dict` 就够
- `dataclass` 不适合需要复杂 `__init__` 逻辑或非标准属性管理的场景，这类仍用普通类手写

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|:---|:---|:---|
| 手写魔术方法 | 全部控制权，语义完全自定义 | 行为有特殊要求的核心类型 |
| `@dataclass` | 自动生成 `__init__`/`__repr__`/`__eq__` | 以数据字段为主的类 |
| `@total_ordering` | 只写 `__eq__` + 一个比较方法，补齐全套比较 | 比较逻辑只想定义一次的普通类 |

## Quick Start

这节运行 demo 并给出真实输出与读数口径，随后是两段可直接照抄的基础写法。

前置条件：Python 3.7+（demo 用到的 @dataclass 自 3.7 起内置；@total_ordering 来自标准库 functools，无版本要求）。

### 运行与真实输出

```bash
cd core/09_magic_methods
python3 magic_methods.py          # 运行全部 demo
```

真实输出示例（节选）：

```
[1] __repr__ vs __str__:
  repr(p): Point(3, 4)
  str(p):  (3, 4)
  ...

[2] __eq__ and __hash__:
  p1 == p2: True
  ...
  hash(p1) == hash(p2): True
  ...
  d[p2]:  origin  (p2 has same hash, found via __eq__)
  ...

[3] Operator overloading:
  Point(3, 4) + Point(1, 2) = (4, 6)
  ...
  abs(Point(3, 4)) = 5.0
  ...

...  # [4] @total_ordering、[5] dataclass 输出省略（写法见下文"两段基础写法"）
[6] Custom container (RingBuffer):
  ...
  append(1): RingBuffer([0, 1], cap=3)
  append(2): RingBuffer([0, 1, 2], cap=3)
  append(3): RingBuffer([3, 1, 2], cap=3)
  append(4): RingBuffer([3, 4, 2], cap=3)
  len(rb): 3
  ...
```

诚实预期（本机实测）：

- 本 demo 的哈希全部基于**数值元组**（`hash((self.x, self.y))` 等）——数值类型的哈希不受 `PYTHONHASHSEED`（控制 str/bytes 哈希加盐随机化的环境变量——每次进程启动用随机种子打乱字符串哈希值）影响，具体数值**跨运行也稳定**；str/bytes 哈希与默认对象 id 哈希才会因加盐随机化而每次运行不同。其余输出全部确定性可复现
- `Point(3, 4) + "hello"` 抛 `TypeError` 是 `__add__` 返回 `NotImplemented` 后两个操作数都试过的结果，不是异常直接抛出——这是协议回退机制
- 陷阱：只定义 `__eq__` 不定义 `__hash__` 的类会静默失去可哈希性（`__hash__ = None`），`d[obj]` 直接 `TypeError`，本 demo 的 `Point`/`Version` 因此都配套实现了 `__hash__`

### 两段基础写法

这段在做什么：为 `Point` 定义两种字符串形态——`__repr__` 给调试用，要求无歧义、最好能原样重建对象；`__str__` 给显示用，面向人。对应输出 [1] 的两行。

```python
def __repr__(self):
    """Debug: unambiguous, should eval back"""
    return f"Point({self.x!r}, {self.y!r})"

def __str__(self):
    """Display: human-readable"""
    return f"({self.x}, {self.y})"
```

这段在做什么：用两个标准库装饰器消样板。`@total_ordering` 只要求实现 `__eq__` 加任意一个比较方法（惯用 `__lt__`），自动补齐其余比较。

`@dataclass` 自动生成 `__init__`/`__repr__`/`__eq__`，`order=True` 再补全套比较，`frozen=True` 保留 `__hash__`。

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

## How It Works

这节拆机制：哨兵怎么写、解释器的回退链怎么走，以及 `__eq__` 与 `__hash__` 的契约。

### 核心写法：返回哨兵而不是抛异常

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

### 双目运算符的分发与回退链

`Point(3, 4) + "hello"` 时，解释器先调 `type(p).__add__`，该方法返回 `NotImplemented` 哨兵（不是异常）；解释器接着改试右操作数的反射方法 `type("hello").__radd__`，也没有 → 才抛 `TypeError`。

这是双目运算符协议的完整回退链，也是诚实预期第二条那个 `TypeError` 的完整来历。

### `__eq__` 与 `__hash__` 的契约

```
a == b  →  hash(a) == hash(b)    # 必须满足
hash(a) == hash(b)  ⊭  a == b    # 允许哈希碰撞
```

定义了 `__eq__` 但没有定义 `__hash__` 时，Python 自动设 `__hash__ = None`，对象变为不可哈希（不能做 dict key）。

你在输出 [2] 里看到的 `d[p2]` 能命中 `origin`，靠的正是"相等对象哈希相同"这半条契约——哈希值决定对象落进哈希表的哪个桶（哈希表内部按哈希值分组存放元素的位置）里，`__eq__` 再在同一个桶内逐个确认相等。

## Pitfalls & Q&A

这节三个真实踩坑（按现象—原因—解法展开）和一个常见问答。

**坑 1：只定义 `__eq__` 不定义 `__hash__`。**

- 现象：对象做 `dict` key 或放进 `set` 时直接 `TypeError`，之前一切正常
- 原因：Python 静默把 `__hash__` 置为 `None`，对象失去可哈希性
- 解法：`__eq__` 与 `__hash__` 配套实现，且用同一批字段（见 How It Works 的核心代码）

**坑 2：误抛 `NotImplementedError`。**

- 现象：`p1 + "hello"` 没走回退链，异常直接冒出来
- 原因：`NotImplementedError` 是"子类必须实现"的异常；`__add__` 里要返回的是哨兵值 `NotImplemented`——抛错了整个反射回退机制就失效
- 解法：魔术方法里一律 `return NotImplemented`，不 `raise`

**坑 3：`__hash__` 与 `__eq__` 用了不同字段。**

- 现象：相等对象在 `dict` 里永远查不到
- 原因：违反契约——相等对象必须哈希相同，字段不一致时哈希也不同
- 解法：两个方法基于同一批字段实现，比如都用 `(self.x, self.y)`

**Q：定义了 `__eq__` 之后，`==` 和 `is` 是什么关系？**

`==` 比较值，调用 `__eq__`，可以重载；`is` 判断两个名字是否指向同一个对象，不可重载。

因此两个对象 `==` 成立不代表 `is` 成立——自定义对象能做 `dict` key 靠的是 `__eq__`/`__hash__` 契约，而不是对象 id。