# 20 · itertools / functools / operator：函数式工具库的组合拳

> 结构化数据装进 `dataclass` 之后字段齐整、开箱即用；可数据一旦成流、成批，
> 手写循环加中间列表就成了性能与可读性的双输。
> 本实验看 itertools / functools / operator 这套"函数式组合拳"，
> 如何用惰性管道和现成组合子替代大部分循环样板。

## What

标准库三大函数式工具模块：**itertools** 提供高效的迭代器组合工具（惰性求值，不预生成全部元素）；**functools** 提供高阶函数工具（缓存、偏函数、装饰器辅助）；**operator** 用 C 实现的函数替代 lambda，更快更清晰。一句话心智模型：**组合子接成惰性管道，元素逐个流过，消费时才物化，全程零中间列表**。

## Why

不掌握它们会怎样：合并数据流先建中间列表、递归没缓存跑不动、排序 key 全是匿名 lambda——样板代码多、内存占用高，也少了 Pythonic 的味道。三者实际开发中经常配合：`itertools.chain` 合并数据流、`functools.lru_cache` 缓存递归、`operator.itemgetter` 替代排序 lambda。

## How

```bash
cd core/20_itertools_func
python3 itertools_func.py     # 运行三大模块 demo
```

真实输出示例：

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

### itertools：惰性迭代器组合子

```python
list(chain(a, b))                    # 合并迭代器，不建中间列表
list(islice(range(100), 5, 15))      # 惰性切片，常用于无限流取前 N 个
list(accumulate([1, 2, 3, 4]))       # [1, 3, 6, 10]，累积运算
list(combinations('ABCD', 2))        # 不可重复的 k 元组合
{k: list(g) for k, g in groupby(data, key=lambda x: x[0])}   # 分组
```

`groupby` 只能分组**连续**相同的元素，使用前必须先 `sorted()`。`accumulate` 默认累加，也可传自定义函数（running max / running product）。

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

经典应用：递归 Fibonacci 加 `lru_cache` 从 O(2^n) 降到 O(n)。

### operator：替代 lambda

```python
sorted(users, key=itemgetter("age"))    # 等价 key=lambda x: x["age"]，更快
sorted(objs, key=attrgetter("x"))       # 等价 key=lambda o: o.x
list(map(methodcaller("upper"), strs))  # 等价 lambda s: s.upper()
```

C 实现，速度更快、可读性更好；`itemgetter("name", "age")` 支持多键返回元组。

## Deep Dive

**itertools 的灵魂——组合子只"接线"，不"流水"**：

```python
pipeline = islice(chain(a, b), 5, 15)  # 此时什么都没算，只是搭好管道
list(pipeline)                         # 消费（list()）时才逐个产出、物化
```

踩坑清单：

- **`groupby` 不排序就分组**：它只分组**连续**相同的元素，迭代时遇到不同 key 就认为当前组结束——未排序数据必须先 `sorted()`
- **`partial` 固定的是第一个参数**：`partial(power, 2)(5)` 是 `power(2, 5)` = 32，不是 25
- **`lru_cache` 没有内部锁**：缓存结构不会在并发下损坏，但多线程同时未命中同一个 key 时函数可能被重复执行；严格"只算一次"的场景要自行加锁
- **`maxsize=None` 无限缓存**：只增不减，小心内存泄漏；且只适用于纯函数

## Q&A

**Q1: `partial` 和 lambda 怎么选？**

`partial` 适合固定参数创建专用函数（语义清晰），lambda 适合简单的临时逻辑。`partial` 的优势在于保留了函数名和文档字符串，调试更友好。

**Q2: 三大模块怎么配合使用？**

排序用 operator，缓存用 functools，流式处理用 itertools——例如先 `lru_cache` 缓存昂贵计算，再 `itemgetter` 排序结果，最后用 `islice` 流式输出前 N 条，全链路零中间列表。
