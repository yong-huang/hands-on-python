# 20 · itertools / functools / operator：函数式工具库的组合拳

> 上一实验把结构化数据装进了 `dataclass`，字段齐整、开箱即用。
> 可数据一旦成流、成批，手写循环加中间列表就成了性能与可读性的双输。
> 本实验看 itertools / functools / operator 这套"函数式组合拳"，
> 如何用惰性管道和现成组合子替代大部分循环样板。

## 1. 为什么需要它

Python 标准库中三大函数式工具模块是面试中的常客：**itertools** 提供高效的迭代器组合工具（惰性求值，不预生成全部元素）；**functools** 提供高阶函数工具（缓存、偏函数、装饰器辅助）；**operator** 用函数式的方式替代 lambda，提高可读性和性能。不掌握它们会怎样：合并数据流先建中间列表、递归没缓存跑不动、排序 key 全是匿名 lambda——样板代码多、内存占用高，也少了 Pythonic 的味道。这三者在实际开发中经常配合使用——用 `itertools.chain` 合并数据流，用 `functools.lru_cache` 缓存递归结果，用 `operator.itemgetter` 替代排序中的 lambda。

## 2. 总览：核心机制一图看懂

![itertools 惰性管道：逐元素流动，零中间列表](images/itertools_func.archify.svg)

一句话心智模型：**组合子接成惰性管道，元素逐个流过，消费时才物化**。看图时沿管道走向走：两个 iterable → `chain` / `islice` 组合 → `accumulate` / `groupby` 加工 → `next()` 驱动逐个产出 → `list()` / `dict()` 消费时才物化，全程零中间列表。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/interview/20_itertools_func/images/itertools_func.archify.html)
> （或本地打开 [`images/itertools_func.archify.html`](images/itertools_func.archify.html)）。

## 3. 快速开始

```bash
cd interview/20_itertools_func
python3 itertools_func.py     # 运行三大模块 demo
```

真实输出示例（macOS, CPython 3.10）：

```
[1] itertools:
  chain([1,2,3], [4,5,6]): [1, 2, 3, 4, 5, 6]
  islice(range(100), 5, 15): [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
  accumulate([1,2,3,4]): [1, 3, 6, 10]
  combinations('ABCD', 2): [('A', 'B'), ('A', 'C'), ('A', 'D'), ('B', 'C'), ('B', 'D'), ('C', 'D')]
  groupby by key: {'A': [('A', 1), ('A', 3)], 'B': [('B', 2), ('B', 4)]}

[2] functools:
  lru_cache: called 4 times (5 calls, 1 cache hit)
  cache_info(): CacheInfo(hits=1, misses=4, maxsize=3, currsize=3)
  partial(power, 2)(5) = 32
  partial(power, 3)(2) = 9
  reduce(lambda a, b: a + b, [1..5]): 15
  singledispatch(42): Int: 84
  singledispatch('hi'): Str: 'hi' (len=2)
  singledispatch(3.14): Default: 3.14

[3] operator:
  sorted by age (itemgetter): ['Bob', 'Alice', 'Charlie']
  sorted by .x (attrgetter): [(1, 2), (2, 3), (3, 1)]
  methodcaller('upper'): ['HELLO', 'WORLD', 'FOO']
```

诚实预期（本机实测）：

- demo 输出全部**确定**：chain/islice/accumulate/combinations/groupby、singledispatch 分派、operator 排序结果在任何 CPython 3.x 上一致
- **lru_cache 的两行输出互为印证**：`called 4 times` 是闭包计数器统计的**真实执行次数**（4 次未命中），`(5 calls, 1 cache hit)` 说明 5 次调用里有 1 次命中缓存未真正执行——与 `CacheInfo(hits=1, misses=4)` 完全对应
- `partial(power, 2)(5) = 32` 不是 25 —— partial 固定的是**第一个**参数 base，所以是 `power(2, 5)`，这正是"partial 按位置预填充参数"的直观体现
- 惰性求值的性能优势（O(1) vs O(n) 内存）在本 demo 中**看不到** —— 数据规模太小；需要用 `range(10**8)` 级别的流式处理才能体感

## 4. 核心概念

### 4.1 itertools —— 高效迭代器

itertools 的核心优势是**惰性求值**——不预生成全部元素，只在迭代时逐个产生，内存占用恒定。

**chain —— 合并迭代器**

```python
from itertools import chain

a = [1, 2, 3]
b = [4, 5, 6]
list(chain(a, b))  # [1, 2, 3, 4, 5, 6]
```

等价于 `a + b`，但 `chain` 不需要预先创建合并后的列表，适用于大数据集或无限迭代器的拼接。

**islice —— 惰性切片**

```python
from itertools import islice

data = range(100)
list(islice(data, 5, 15))  # [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
```

对任意迭代器做切片，不创建中间列表。常用于从无限生成器中取前 N 个元素。

**accumulate —— 累积运算**

```python
from itertools import accumulate

list(accumulate([1, 2, 3, 4]))  # [1, 3, 6, 10]
```

默认做累加（running sum），也可传入自定义函数做累积（如 running max、running product）。

**combinations —— 组合**

```python
from itertools import combinations

list(combinations('ABCD', 2))
# [('A','B'), ('A','C'), ('A','D'), ('B','C'), ('B','D'), ('C','D')]
```

生成不可重复的 k 元组合，无序。面试中常见于"从 n 个数中选 k 个"的场景。

**groupby —— 分组**

```python
from itertools import groupby

data = sorted([("A", 1), ("B", 2), ("A", 3), ("B", 4)], key=lambda x: x[0])
groups = {k: list(g) for k, g in groupby(data, key=lambda x: x[0])}
# {'A': [('A', 1), ('A', 3)], 'B': [('B', 2), ('B', 4)]}
```

**注意**：`groupby` 只能分组**连续**相同的元素，所以使用前必须先排序。如果数据未排序，需要先 `sorted()`。

### 4.2 functools —— 高阶函数工具

**lru_cache —— 缓存装饰器**

```python
from functools import lru_cache

@lru_cache(maxsize=3)
def expensive(n):
    return n * n

expensive(1)   # 计算并缓存
expensive(2)   # 计算并缓存
expensive(1)   # 缓存命中，不重新计算
expensive(3)   # 计算并缓存（{1, 2, 3} 已满）
expensive(4)   # 缓存已满，按 LRU 淘汰最近最少使用的 2

print(expensive.cache_info())
# CacheInfo(hits=1, misses=4, maxsize=3, currsize=3)
```

**关键点**：
- `maxsize=None` 时为无限缓存（小心内存泄漏）
- 基于 LRU 策略淘汰（最近最少使用）
- 适用于纯函数（相同输入必定返回相同输出）
- 面试常考：递归 Fibonacci 加 `lru_cache` 从 O(2^n) 降到 O(n)

**partial —— 偏函数**

```python
from functools import partial

def power(base, exp):
    return base ** exp

square = partial(power, 2)
cube = partial(power, 3)

square(5)  # 32 → 等价于 power(2, 5)，固定的第一个参数是 base
cube(2)    # 9  → 等价于 power(3, 2)
```

固定函数的部分参数，生成新函数。减少重复代码，常用于回调、排序等需要函数参数的场景。

**reduce —— 归约**

```python
from functools import reduce

reduce(lambda a, b: a + b, [1, 2, 3, 4, 5])  # 15
```

将序列归约为单个值：`f(f(f(f(1, 2), 3), 4), 5)`。Python 3 中已移至 functools（不再是内建函数）。

**singledispatch —— 单分派泛型函数**

```python
from functools import singledispatch

@singledispatch
def process(value):
    return f"Default: {value}"

@process.register(int)
def _(value):
    return f"Int: {value * 2}"

@process.register(str)
def _(value):
    return f"Str: '{value}' (len={len(value)})"

process(42)    # "Int: 84"
process("hi")  # "Str: 'hi' (len=2)"
process(3.14)  # "Default: 3.14"（走默认实现）
```

根据**第一个参数的类型**分派到不同的实现函数。类似 Java 的方法重载，但 Python 用 singledispatch 实现。

### 4.3 operator —— 函数式运算符

operator 模块用 C 实现的函数替代 lambda，速度更快、可读性更好。

**itemgetter —— 获取字典/序列元素**

```python
from operator import itemgetter

users = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
sorted(users, key=itemgetter("age"))  # 按年龄排序
```

等价于 `key=lambda x: x["age"]`，但更快。也支持多键：`itemgetter("name", "age")` 返回元组。

**attrgetter —— 获取对象属性**

```python
from operator import attrgetter

class Obj:
    def __init__(self, x, y):
        self.x = x
        self.y = y

objs = [Obj(3, 1), Obj(1, 2), Obj(2, 3)]
sorted(objs, key=attrgetter("x"))  # 按 .x 排序
```

等价于 `key=lambda o: o.x`，同样支持多属性。

**methodcaller —— 调用对象方法**

```python
from operator import methodcaller

strs = ["hello", "WORLD", "foo"]
list(map(methodcaller("upper"), strs))  # ["HELLO", "WORLD", "FOO"]
```

等价于 `lambda s: s.upper()`，也支持传参：`methodcaller("find", "lo")`。

## 5. 关键代码解析

惰性管道是 itertools 的灵魂——组合子只"接线"，不"流水"：

```python
from itertools import chain, islice

pipeline = islice(chain(a, b), 5, 15)  # 此时什么都没算，只是搭好管道
list(pipeline)                         # 消费（list()）时才逐个产出、物化
```

functools 一侧最常考的是 `lru_cache` 的 LRU 行为：

```python
@lru_cache(maxsize=3)      # 淘汰策略：最近最少使用先出
def expensive(n): ...

expensive(4)   # 缓存已满 → 淘汰最近最少使用的 2，真正执行第 4 次
```

坑清单：

- **`groupby` 不排序就分组**：它只分组**连续**相同的元素，迭代时遇到不同 key 就认为当前组结束——未排序数据必须先 `sorted()`
- **`partial` 固定的是第一个参数**：`partial(power, 2)(5)` 是 `power(2, 5)` = 32，不是 25
- **`lru_cache` 没有内部锁**：缓存结构不会在并发下损坏，但多线程同时未命中同一个 key 时函数可能被重复执行；严格"只算一次"的场景要自行加锁
- **`maxsize=None` 无限缓存**：只增不减，小心内存泄漏；且只适用于纯函数
- **小数据看不出惰性的收益**：O(1) vs O(n) 内存需要大数据流才体感，别拿 demo 计时下结论

## 6. 文件结构

```
20_itertools_func/
├── README.md                        # 本教程文档
├── itertools_func.py                # 主演示脚本：itertools / functools / operator
└── images/
    ├── itertools_func.archify.json  # 图源（typed JSON IR，可编辑重渲染）
    ├── itertools_func.archify.html  # 交互示意图（浏览器打开）
    └── itertools_func.archify.svg   # 双主题矢量图（本 README §2 内嵌）
```

`itertools_func.py` 内容：`1. demo_itertools()` chain / islice / accumulate / combinations / groupby / `2. demo_functools()` lru_cache / partial / reduce / singledispatch / `3. demo_operator()` itemgetter / attrgetter / methodcaller / `4. run_demo()` 交互式演示。

## 7. 面试要点

**Q1: itertools 和直接用列表操作有什么区别？**
itertools 是惰性的，不预生成全部元素，内存占用 O(1)。列表操作会创建中间列表，内存占用 O(n)。对于大数据或无限流，itertools 是唯一选择。

**Q2: lru_cache 的线程安全性？**
`lru_cache` 的缓存结构不会在并发下损坏，但 `_lru_cache_wrapper` **没有内部锁**保证单次执行：多线程同时未命中同一个 key 时，函数可能被重复执行（结果一致，浪费计算）。需要严格"只算一次"的场景（如幂等性敏感的写操作）要自行加锁。

**Q3: groupby 为什么需要先排序？**
`groupby` 只能分组**连续**出现的相同元素。它不会扫描整个序列后再分组，而是迭代时遇到不同 key 就认为当前组结束。未排序的数据需要先 `sorted()` 才能得到正确的分组结果。

**Q4: partial 和 lambda 怎么选？**
`partial` 适合固定参数创建专用函数（语义清晰），lambda 适合简单的临时逻辑。`partial` 的优势在于保留了函数名和文档字符串，调试更友好。

**Q5: singledispatch 如何实现"方法重载"的效果？**
根据**第一个参数的类型**分派到不同的实现函数：`@singledispatch` 注册默认实现，`@process.register(int)` 等按类型挂载分支，不匹配的类型走默认实现。类似 Java 的方法重载，但由 `functools.singledispatch` 在 Python 层实现。

## 8. 总结

1. **itertools 惰性求值**：chain/islice/accumulate/combinations/groupby，适合大数据和无限流
2. **functools 高阶工具**：lru_cache 缓存递归、partial 固定参数、wraps 保留元信息、singledispatch 类型分派
3. **operator 替代 lambda**：itemgetter/attrgetter/methodcaller 用 C 实现，更快更清晰
4. **三者在面试中常组合考察**：排序用 operator，缓存用 functools，流式处理用 itertools

至此 20 个面试主题 lab 全部完成——从装饰器、描述符、GIL 到类型系统与函数式工具，这个系列覆盖了 Python 语言内部的核心机制，祝面试顺利。建议回到 [根 README](../../README.md) 的「学习路线」一节，按四阶段路线回顾各实验、查漏补缺。
