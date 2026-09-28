# 20 · itertools / functools / operator：函数式工具库的组合拳

> 数据一旦从单个对象变成成流、成批，手写循环加中间列表就成了性能与可读性的双输。
> 本篇讲标准库的三个函数式工具模块 itertools、functools、operator：
> 读完你能用惰性管道替代大部分循环样板，并知道每个工具的适用边界。

## Background

这节回答三个问题：在这些工具出现之前，批量数据处理靠什么写？痛点卡在哪里？标准库为什么把它们收进来？

在此之前，合并两个列表要手写 `for` 循环逐个 `append`；按 key 分组要自己维护字典；递归算法裸写；担心重复计算，就手动拿一个字典记下"算过的输入和结果"。每一种数据加工，都对应一段专门编写的循环：

```python
merged = []                # 之前：合并两个来源，要一段专门的循环
for x in a:
    merged.append(x)
for x in b:
    merged.append(x)       # 中间列表 merged 全程占着内存
```

痛点在数据规模变大时集中爆发。典型场景：想从一个几 GB 的日志文件里取第 100~150 行，手写做法是 `f.readlines()` 把整个文件读成列表再切片——文件远大于内存时，程序直接被压垮。

另一个隐性代价是重复劳动：合并、分组、累积、切片的逻辑大同小异，却每次都重写一遍循环。

裸写的递归斐波那契（Fibonacci，每一项等于前两项之和的数列）会对同一子问题重复计算成千上万次，n 到 40 左右就要等上数秒，n 到 45 左右就要等上数十秒（实测：fib(35) 约 0.5 秒、fib(43) 约 23 秒）。

标准库的应对，是把函数式编程（以函数为基本组合单元的编程风格）里"小工具互相拼接"的思路吸收进来。

itertools 自 Python 2.3 起提供不把数据整体载入内存的加工工具，functools 在 Python 2.5 收录缓存这类作用于函数本身的工具，operator 则把取字段、调用方法等常见运算直接做成可传递的函数。

## What

这节给出三个模块各自的定义，并建立一个贯穿全文的心智模型。

标准库三大函数式工具模块：

- **itertools**：高效的迭代器组合工具。迭代器——逐个产出元素、消费一次就耗尽的对象；惰性求值——用到时才计算，不预先生成全部元素。
- **functools**：高阶函数（接收或返回函数的函数）工具，覆盖缓存、偏函数（固定原函数部分参数后生成的新函数）、装饰器辅助（装饰器——用 @ 语法把函数包一层再返回的工具，见下文 @singledispatch 示例）。
- **operator**：用 C 实现的函数替代 lambda（匿名小函数），更快更清晰。

一句话心智模型：**组合子接成惰性管道，元素逐个流过，消费时才真正生成数据（物化，即把迭代器里的元素实际造出来），全程零中间列表**。组合子指把小工具拼接成大逻辑、自身不保存数据的函数。

可以把惰性管道想象成接水管：`chain`、`islice` 这些函数只是在拼接水管段，拧开阀门（用 `list()` 消费）水才真正流动。但和水管不同的是，迭代器里的"水"流过一次就没了——同一个迭代器只能遍历一次，再 `list()` 一次只会得到空列表。

三个模块的自然分工：

| 模块 | 提供什么 | 代表工具 |
|---|---|---|
| itertools | 惰性迭代器组合工具 | `chain`、`islice`、`groupby` |
| functools | 作用于函数本身的工具 | `lru_cache`、`partial`、`singledispatch` |
| operator | 运算的函数化 | `itemgetter`、`attrgetter`、`methodcaller` |

## When to Use

这节给出典型场景、明确的反面边界，以及与同类方案的对比依据。

典型场景：

1. **在处理内存装不下的数据流时**（日志、大文件、无限序列）：用 `islice` 取前 N 条、`chain` 合并多个来源，元素逐个流过，全程不建中间列表。
2. **在同一个昂贵计算被反复触发时**：给递归函数加 `lru_cache`，重复参数直接查表返回；用 `partial` 预填参数，生成专用函数传给排序或回调。
3. **在给复杂对象排序、批量取字段时**：`itemgetter` / `attrgetter` 替代一长串 lambda，多键排序直接传多个键名。

何时不用：

- 数据量小、逻辑一目了然时，直接写 `for` 循环或列表推导式（一行 `for` 生成整个列表的写法）更直白。
- 函数有副作用（会修改外部状态，如写文件、计数）时不能套 `lru_cache`——缓存的正确性依赖"同输入必同输出"。
- 同一序列需要反复遍历时，先 `list()` 物化再操作，比维护多个迭代器更稳。

同类方案对比：

| 方案 | 与本文工具的差异 | 什么时候选它 |
|---|---|---|
| 手写 `for` 循环 | 显式直白，但样板多、占中间列表 | 逻辑带状态、需要中途 `break` 时 |
| 列表推导式 | 一次性物化全量列表 | 数据量小、结果要反复遍历时 |
| 第三方 more-itertools | itertools 的超集，工具更多 | 标准库不够用、且允许新增依赖时 |

## Quick Start

这节从零跑通 demo：一条命令、一段真实输出、四条诚实预期、三段实现代码；只需 Python 3.x 标准库，无第三方依赖。

```bash
cd core/20_itertools_func
python3 itertools_func.py     # 运行三大模块 demo
```

真实输出示例（节选：省略首尾的 Demo Mode 横幅行）：

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

- demo 输出全部**确定**：chain/islice/accumulate/combinations/groupby、singledispatch 分派、operator 排序结果在任何 CPython（Python 官方的参考解释器实现，python3 命令运行的就是它）3.x 上一致
- **lru_cache 的两行输出互为印证**：`called 4 times` 是 demo 里专门统计真实执行次数的计数变量打印的（4 次未命中），`(5 calls, 1 cache hit)` 说明 5 次调用里有 1 次命中缓存未真正执行——与 `CacheInfo(hits=1, misses=4)` 完全对应
- `partial(power, 2)(5) = 32` 不是 25 —— partial 固定的是**第一个**参数 base，所以是 `power(2, 5)`，这正是"partial 按位置预填充参数"的直观体现
- 惰性求值的性能优势（O(1) vs O(n) 内存）在本 demo 中**看不到** —— 数据规模太小；需要用 `range(10**8)` 级别的流式处理才能体感

### itertools：惰性迭代器组合子

```python
list(chain(a, b))                    # 合并迭代器，不建中间列表
list(islice(range(100), 5, 15))      # 惰性切片，常用于无限流取前 N 个
list(accumulate([1, 2, 3, 4]))       # [1, 3, 6, 10]，累积运算
list(combinations('ABCD', 2))        # 不可重复的 k 元组合
{k: list(g) for k, g in groupby(data, key=lambda x: x[0])}   # 分组
```

这段在做什么：五个最常用的组合子，覆盖合并、切片、累积、组合、分组。`accumulate` 默认累加，也可以传自定义函数，做 running max / running product。

### functools：高阶函数工具

```python
@lru_cache(maxsize=3)
def expensive(n): return n * n
# LRU 策略：缓存满时淘汰最近最少使用的条目
# maxsize=None 为无限缓存（小心内存泄漏）；只适用于纯函数

square = partial(power, 2)     # 偏函数：固定第一个参数 base
reduce(lambda a, b: a + b, [1, 2, 3, 4, 5])   # 15，归约为单值

@singledispatch
def process(value): ...        # 按第一个参数的类型分派实现
@process.register(int)
def _(value): ...              # @xxx.register 挂载类型分支
```

这段在做什么：缓存、参数预填充、归约、按类型分派，四类作用于函数本身的工具。经典应用：递归 Fibonacci 加上 `lru_cache`，复杂度从 O(2^n) 降到 O(n)。

### operator：替代 lambda

```python
sorted(users, key=itemgetter("age"))    # 等价 key=lambda x: x["age"]，更快
sorted(objs, key=attrgetter("x"))       # 等价 key=lambda o: o.x
list(map(methodcaller("upper"), strs))  # 等价 lambda s: s.upper()
```

这段在做什么：三个 getter 分别对应"取字典键、取对象属性、调对象方法"三种取值动作。`itemgetter("name", "age")` 支持传多个键，一次返回元组。

## How It Works

这节拆开惰性管道，解释 Quick Start 输出里的现象分别来自哪个机制。

itertools 的灵魂——**组合子只"接线"，不"流水"**：

```python
pipeline = islice(chain(a, b), 5, 15)  # 此时什么都没算，只是搭好管道
list(pipeline)                         # 消费（list()）时才逐个产出、物化
```

能这样写，是因为 `chain` 和 `islice` 返回的都只是迭代器：构造它们只记录"数据从哪来、取哪个区间"两件事，不做任何计算；真正驱动计算的是 `list()` 逐个索要元素的动作。

对照 Quick Start 的输出：`islice(range(100), 5, 15)` 只打印 10 个数，说明它没有先复制 100 个元素再切片，而是消费时跳过前 5 个、数到第 15 个即停；`accumulate([1,2,3,4])` 产出 `[1, 3, 6, 10]`，同样是"消费到哪个、算到哪个"。

`groupby` 的输出里 A、B 两组各自完整，是因为 demo 先对数据排了序——分组机制见 Pitfalls 第 1 条。

functools 侧：`lru_cache` 用字典存"参数 → 结果"，并维护访问顺序，缓存满时按 LRU 策略（见 Quick Start 代码注释）淘汰最久未用的条目。

诚实预期里 `called 4 times` 与 `hits=1, misses=4` 能对上，靠的就是这套结构——未命中时真正执行并写入缓存，命中时直接查表返回。

`partial` 在构造时记住原函数与预填参数，调用时把它们按位置拼在实参前面，返回一个新函数。

`singledispatch` 则维护一张"类型 → 实现"的注册表，`@process.register(int)` 就是往表里挂一条。

调用时按第一个参数的实际类型查表——输出里 `singledispatch(42)`、`('hi')`、`(3.14)` 分别命中 Int、Str、Default 三个分支，就是查表的结果。

最后回到内存账：整条管道任意时刻只持有一个"当前元素"，占用与数据总量无关——这就是 What 节水管类比要表达的 O(1) 内存，也是诚实预期第四条说它要在 `range(10**8)` 量级才能体感的原因。

## Pitfalls & Q&A

这节先列四个真实踩坑，每条按现象、原因、解法展开，再回答两个取舍问题。

1. **`groupby` 不排序就分组**
   - 现象：同一个 key 的元素散落在多处，结果字典只留下每组"最后一段"。
   - 原因：`groupby` 只分组**连续**相同的元素，迭代时遇到不同 key 就认为当前组结束。
   - 解法：分组前先按同一个 key `sorted()`，让相同 key 的元素相邻。

2. **`partial` 固定的是第一个参数**
   - 现象：`partial(power, 2)(5)` 得到 32，不是预期的 25。
   - 原因：partial 按位置预填充，等价于 `power(2, 5)`。
   - 解法：想固定后面的参数，改用关键字形式（如 `partial(power, exp=5)`，前提是函数签名支持），或直接写 lambda。

3. **`lru_cache` 没有内部锁**
   - 现象：多线程下，同一个 key 的函数体被重复执行。
   - 原因：缓存读写不加锁，多个线程同时未命中会各自算一遍（缓存结构本身不会损坏）。
   - 解法：严格"只算一次"的场景自行加锁。

4. **`maxsize=None` 无限缓存**
   - 现象：进程内存随输入种类增长、不回落。
   - 原因：缓存条目只增不减。
   - 解法：设定 `maxsize` 上限；且只缓存纯函数（相同输入必得相同输出、无副作用）。

**Q1: `partial` 和 lambda 怎么选？**

`partial` 适合固定参数创建专用函数（语义清晰），lambda 适合简单的临时逻辑。`partial` 的优势在于保留了函数名和文档字符串，调试更友好。

**Q2: 三大模块怎么配合使用？**

排序用 operator，缓存用 functools，流式处理用 itertools——例如先 `lru_cache` 缓存昂贵计算，再 `itemgetter` 排序结果，最后用 `islice` 流式输出前 N 条，全链路零中间列表。
