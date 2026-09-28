# 04 · 生成器与迭代器：yield 的暂停/恢复与惰性求值

> 手写一个迭代器要实现 `__iter__` / `__next__` 共 20+ 行样板，而想一次处理
> 千万级数据时，列表还得先把所有值算好塞进内存。生成器用一个小小的 `yield`
> 同时解决这两个问题。本实验看它如何暂停/恢复、双向通信、搭起零内存管道。

## Background

这一节回答：在生成器出现之前，"做一个可遍历的东西"和"处理一大批数据"分别是怎么做的，卡在哪。

做一个可遍历对象，要手写一个迭代器类：`__iter__` 返回自身，`__next__` 负责推进状态、判断结束、在结束时抛 `StopIteration`。最简单的计数迭代器也要 20 行上下，状态变量全靠手工维护，漏一个分支就是死循环或漏元素。

处理大批数据时，主流写法是"先算好再遍历"：把所有元素算出来存进列表，再 for 循环。数据有限时没问题；换成无限序列（斐波那契数列）或几百 MB 的日志文件，列表还没建完，内存就先耗尽了。

Python 2.2 依 PEP 255（Python 增强提案，语言变更的设计文档）引入生成器：函数体里写 `yield`，解释器自动把它变成可遍历对象——样板问题和内存问题一起交给语言处理。

## What

这一节给出定义、暂停/恢复的心智模型和生命周期状态机。

迭代器（iterator）是 Python 中"遍历"的底层协议——实现 `__iter__` / `__next__` 两个方法（返回迭代器自身 / 取下一个值，取尽抛 `StopIteration`）的对象。

生成器（generator）是实现迭代器最简洁的方式：函数体里只要含 `yield`（产出并暂停），它就不再是普通函数，而是生成器函数。

一句话心智模型：**生成器是一个可暂停/恢复的函数——`next()` 推它跑到下一个 `yield`，栈帧（函数调用时创建的执行现场：局部变量与执行位置）连同局部变量原封不动停在原地，下次从暂停处精确恢复**。

可以把生成器想象成带暂停键的播放器：暂停时画面、进度、所有状态一起冻结，恢复时从暂停那一刻继续往下走。但和播放器不同的是，恢复时还能从外部"塞"进新数据（`send()`），让接下来的剧情被调用方当场改写。

生命周期是一台状态机：已创建（调用不执行函数体）→ 运行中 ⇄ 已暂停（`yield` 产出值）→ 函数返回 → `StopIteration`。

## When to Use

这一节给判断依据：什么时候值得用生成器，什么时候列表更合适。生成器的核心价值是**惰性求值**（lazy evaluation：不提前算出所有值，按需逐个生成）。

典型场景，都是"在做什么事的时候"：

- 逐行处理大文件或日志流时——读一行、解析一行、过滤一行，内存占用与文件大小无关。
- 序列无限或长度未知时——斐波那契数列、传感器数据流，写一个 `while True` 的生成器即可，调用方自己决定取多少。
- 组合数据处理管道时——map/filter/take 各写成一个生成器，像积木一样按需串接。但和积木不同的是，积木搭完就静止，管道搭好后数据才逐个流过每一层——串接本身不触发任何计算。
- 给自定义容器实现遍历时——函数里几个 `yield`，顶掉一整个手写迭代器类。

何时不用：数据需要多次遍历、随机访问或 `len()` 时，生成器是一次性的且没有索引，直接用列表；数据量小、一遍算完时，列表推导更直观。

| 模式 | 列表推导 `[f(x) for x in data]` | 生成器管道 |
|:---|:---|:---|
| 内存 | O(n)，全部存储 | O(1)，逐个处理 |
| 何时计算 | 立即全部计算 | 按需逐个计算 |
| 无限流 | 不支持 | 支持 |
| 适合 | 需要多次遍历 | 单次遍历（for/list/sum） |

生成器管道的轻量写法是生成器表达式（generator expression，把列表推导的方括号换成圆括号），单次遍历的场景优先考虑它。

## Quick Start

这一节把 demo 跑起来，对比手写迭代器与生成器的写法。前置条件：只用标准库。

```bash
cd core/04_generator_iterator
python3 generator_iterator.py     # 运行全部 demo（send/yield from/惰性管道/内存对比）
```

真实输出示例（节选：自 [3] 起，[1][2] 两节及部分小节内行省略）：

```
...  # [1] Iterator protocol、[2] Fibonacci 两段省略
[3] send() — bidirectional generator:
  accumulator:
    send(10) -> total=10
    send(20) -> total=30
    send(30) -> total=60
    StopIteration: processed 3 values
  moving_average:
    send(10) -> avg=10.0
    send(20) -> avg=15.0
    send(30) -> avg=20.0
    ...

[4] yield from — delegation:
  flatten([1, [2, 3, [4, 5]], 6, [7, 8, 9]]) = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  chain(range(3), range(5)) = [0, 1, 2, 0, 1, 2, 3, 4]

[5] Lazy pipeline (infinite stream):
  First 10 even squares: [0, 4, 16, 36, 64, 100, 144, 196, 256, 324]

[6] Generator vs List — memory:
  List comprehension:  ~3,516 KB
  Generator expression: 104 bytes
  Ratio: ~34,621x smaller
  ...  # List/Generator 前 5 个元素对照省略

[7] Log processing pipeline:
  Lazy pipeline: log_lines → parse → filter_errors → take(5)
    [2024-01-03 10:02:02] connection timeout
    [2024-01-06 10:05:05] db query slow
    [2024-01-09 10:08:08] cache miss
    ...

[8] Generator state inspection:
  type: generator
  gi_running: False
  gi_frame: True
  after next(): gi_frame=True
  after exhaust: gi_frame=None
```

诚实预期（本机实测）：

- **内存对比的数值随 Python 版本变化**：demo 用 `sys.getsizeof` 估算，CPython 3.10 下生成器表达式为 104 bytes，列表约 3.4 MB（~34000x）。不同版本/平台的 getsizeof 结果会不同，但"数量级差距"这个结论稳定
- 列表内存是**估算值**（抽样前 1000 个 int 的大小外推），不是精确统计
- `[7] Log processing pipeline` 的 5 条 ERROR 输出内容每次运行不同（日志级别随机），但**条数稳定为 5**——整个管道是惰性的：生成、解析、过滤、截断每个环节每次只处理一个元素，直到 `take(5)` 取满为止

### 手写迭代器 vs 生成器

这段在做什么：上半是一个手写迭代器类——`__iter__`、`__next__`、状态变量一样不能少；下半 `fib()` 函数体里只要有 `yield`，就自动成为可遍历的生成器，5 行顶 20+ 行。

```python
class MyIterator:          # 手写迭代器：__iter__ + __next__ + 状态变量
    def __iter__(self):
        return self
    def __next__(self):
        if self.done:
            raise StopIteration
        ...

def fib():                 # 生成器：5 行 yield 等价 20+ 行手写
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b
```

`for` 循环的底层就是不断调用 `__next__()` 直到 `StopIteration`；生成器自动实现了 `__iter__`（返回自身）和 `__next__`（恢复执行到下一个 yield）。

send 双向通信、yield from 委托与惰性管道的机制拆解，见 How It Works。

## How It Works

这一节按"启动 → 暂停恢复 → 双向通信 → 委托 → 管道"的顺序拆机制，并与 Quick Start 输出互相印证。

### 栈帧为什么能停在原地

普通函数返回时，栈帧随之销毁；生成器函数执行到 `yield` 时，栈帧被挂到生成器对象上保留，下次 `next()` 从暂停的执行位置精确继续，局部变量原样可用。

输出 [8] 是这次暂停的现场观测：`gi_frame` 暂停时非 `None`、耗尽后变 `None`；`gi_running: False` 表明暂停期间它不处于运行状态。

### send()：一处 yield、两个方向

```python
def accumulator():
    total = 0
    while True:
        received = yield total   # yield 返回 total，send 的值赋给 received
        total += received
```

执行流程：先 `next(gen)` 启动（priming，预热：推生成器跑到第一个 `yield`），跑到 `yield total` 暂停；之后 `gen.send(10)` 把 10 赋给 `received`，恢复执行到下一个 `yield`。

核心在 `received = yield total` 这一行——表达式右侧向外产出 `total` 后暂停；`send(v)` 恢复时，`v` 作为 yield 表达式的值赋给 `received`，一行同时完成"产出"与"接收"。

输出 [3] 的 `total=10 → 30 → 60` 就是三次 send 的累加轨迹。`send()` 是 Python 协程（可协作式暂停/恢复的执行单元）的早期形态，`async/await` 概念上沿用了这一暂停/恢复机制。

### yield from：委托子生成器

```python
def flatten(items):
    for item in items:
        if isinstance(item, list):
            yield from flatten(item)  # 委托给子生成器
        else:
            yield item
```

`yield from` 做三件事：值透传（子生成器 yield 的值直达调用方）、异常透传（send/throw/close 直达子生成器）、返回值捕获（子生成器 `return` 的值成为 `yield from` 表达式的值，经 `StopIteration.value` 传递）。

输出 [4] 的 `flatten` 与 `chain` 都靠它把子生成器的产出无损地交给最外层。

### 惰性管道的内存账

惰性管道的搭法：`integers()` 产出自然数，逐层经过平方映射、偶数过滤，最后 `take(10)` 只取前 10 个——数据自下而上逐个被拉取，没有任何一层提前多算。

```python
result = list(take(10,
    filter_gen(lambda x: x % 2 == 0,
        map_gen(lambda x: x**2,
            integers()))))
```

这条管道每个环节一次只处理一个元素：`take(10)` 要第 k 个元素时，才向上游逐层拉取 k 个值，没有任何一层提前多算。

输出 [5] 的无限偶数平方流、输出 [7] 的日志管道都因此保持常数内存——`take(5)` 取满即停，后面的日志行永远不会被读出。具体内存数字见 Quick Start 的诚实预期：数值随版本变化，"数量级差距"这个结论稳定。

## Pitfalls & Q&A

这一节先列三个常见踩坑（现象、原因、解法），再答两个有增量的问题。"生成器是不是只能遍历一次"这一问已并入下面第二条踩坑。

踩坑清单：

- **跳过 priming 直接 `send(10)`**。现象：生成器刚创建就 `send(非 None)`，立刻报 `TypeError`。原因：还没跑到第一个 `yield`，没有暂停点可供恢复，送进来的值无处安放。解法：先 `next(gen)` 或 `gen.send(None)` 启动，再开始 send。
- **生成器是一次性的**。现象：同一个生成器变量第二次 `list(gen)` 得到 `[]`，再 `send(v)` 也抛 `StopIteration`。原因：生成器是单向迭代器，耗尽后无法重置——复用同一个生成器变量是经典 bug。解法：需要多次遍历就重新调用生成器函数创建新的，或改用列表。
- **状态检查与提前收尾**。现象：想判断生成器是暂停中还是已耗尽，或想让它在结束前清理资源，无从下手。原因：生成器的状态藏在栈帧里，外部没有直观接口。解法：用 `gi_frame` 观测（暂停时非 `None`、耗尽后变 `None`）；`close()` 会在暂停处触发 `GeneratorExit`，让生成器执行收尾逻辑。

深入问答：

**Q1: yield 和 return 的区别？**

| 维度 | yield | return |
|:---|:---|:---|
| 函数类型 | 生成器函数 | 普通函数 |
| 多次返回 | 可以（每次 yield 一个值） | 只能一次 |
| 状态 | 暂停/恢复，保存完整栈帧 | 结束，释放栈帧 |
| 返回值 | `StopIteration.value`（通过 return） | 直接返回 |

**Q2: 能不能把异常从外部丢进生成器？**

可以，`gen.throw(exc)` 会在生成器当前暂停的 `yield` 处抛出 `exc`：生成器内部可以用 try/except 接住处理，不接就向外传播并终止生成器。How It Works 里 yield from 的"异常透传"，透传的正是 throw/close 这类驱动信号。

**Q3: 生成器和协程的关系？**

Python 的协程经历了三代演进：生成器协程（`yield` + `send()`）→ `@coroutine` + `yield from` → `async/await`。三代都建立在"暂停/恢复"之上；3.5+ 的 `await` 可类比为 `yield from` 的异步版本，但已是原生协程对象。
