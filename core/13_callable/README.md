# 13 · `__call__`：可调用对象与函数式模式

> `my_func(42)` 能调用，那 `obj(42)` 呢？只要一个类定义了 `__call__`
> （实例被调用时执行的钩子方法），它的实例就能像函数一样被调用——
> `obj(42)` 实际执行的是 `obj.__call__(42)`。读完本篇，你能写出带状态、
> 可组合的可调用对象，并分清 `callable()` 检查的到底是什么。

## Background

这节回答问题域：为什么需要"能像函数一样被调用的对象"。起点是一类具体
需求——一段"带记忆"的逻辑，比如每次调用都要累加计数的统计函数。

纯函数做不到。普通函数每次调用时栈帧（stack frame，一次调用在内存中的
临时记录）创建、返回即销毁，函数体内不留任何东西。

之前的做法有三种。闭包（closure，内层函数记住外层作用域变量的机制）能存
状态，但逻辑一复杂就层层嵌套；模块级 global 变量简单直接，却污染全局命名
空间；往函数对象上挂属性（`fn.counter += 1`）可行，但隐蔽到 review 时很
难想到。

Python 的应对是把"对象能不能被调用"做成协议：类侧定义一个特殊方法，实例
即可被调用，`self` 天然成为状态的容身之处。这正是本篇的主角，下一节正式
定义。

## What

本节给出定义与心智模型。`obj(42)` 实际调用的是 `obj.__call__(42)`——只要
类定义了 `__call__`，实例就能像函数一样被调用，这就是**可调用对象
（Callable Object）**。

心智模型：**调用实例时，解释器去实例的"类型"上找 `__call__`，实例状态
通过 `self` 跨调用保留**。

可以把可调用对象想象成一台设置好程序的咖啡机：调用动作（按按钮）和状态
（豆量、水位）在同一台机器上，一次设置、反复使用。但和真实机器不同的是，
它同时还是"函数"——能出现在任何接受函数的位置，后面策略模式的
`Formatter` 会看到这一点。

一个最小例子：`double = Multiplier(2)` 之后 `double(5)` 返回 `10`——实例
带着配置 `factor=2`，像函数一样被调用。

典型用途：函数对象（封装状态与行为）、类装饰器（用类实现的装饰器——
`@xxx` 语法里接收函数并返回新函数的包装机制，实现见 Pitfalls & Q&A 的
Retry 例子）、策略模式（把同一类操作封装成可互换组件）、验证器链（把
多条校验按序串起来），场景细节见下一节。

## When to Use

这节给判断力：在做什么事的时候值得用可调用对象，什么时候直接写函数。

- **封装配置的函数对象**：给排序、过滤、映射传"带参数的行为"时，如
  `Multiplier(2)` 与 `Multiplier(3)` 是两个各自携带配置的"函数"
- **跨调用累积状态**：累加器、计数器、限流器这类"调用之间要记住东西"的
  组件，`self` 是状态的容身之处
- **策略模式**（strategy，把算法封装成可互换组件）与验证器链：序列化格式
  切换、按序校验，见 How It Works 的实现

何时不用：无状态的一次性逻辑直接写函数最简单；需要保留的状态只有一个
变量时，闭包是更轻的方案。

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| 普通函数 | 无状态，返回即销毁 | 无状态的一次性逻辑 |
| 闭包 | 外层变量保存少量状态 | 状态仅一两个变量的小场景 |
| 可调用对象 | `self` 保存状态，还可挂方法 | 多个状态、需要方法或组合时 |
| 带参数的类装饰器 | 装饰器自身携带配置 | 装饰器需要参数化时，见 Pitfalls & Q&A |

## Quick Start

### 运行与真实输出

前置条件：Python 3，无第三方依赖。运行 demo 并对照输出读代码：

```bash
cd core/13_callable
python3 callable.py             # 运行 demo
```

真实输出示例：

```
[1] Multiplier (callable object):
  double(5) = 10
  triple(5) = 15
  isinstance(double, Multiplier): True
  callable(double): True

[2] Accumulator (stateful callable):
  acc(10) = 110
  acc(20) = 130
  acc(5)  = 135
  acc.total = 135

[3] Strategy pattern (callable):
  JSON:
  [
  {
    "name": "Alice",
    "age": 30
  },
  {
    "name": "Bob",
    "age": 25
  }
]
  CSV:
  name,age
Alice,30
Bob,25
  Table:
  name  | age
Alice | 30
Bob   | 25

[4] Validator chain (composable):
  42: OK
  200: range: must be 0-150
  17: parity: must be even

[5] What is callable:
  callable(len): True
  callable(str): True
  callable(Multiplier(2)): True
  callable(42): False
  callable(None): False

[6] __call__ enables function-like + object-like:
  Objects can have BOTH methods AND be called
  Functions can hold attributes too (they have __dict__)
  def fn(): pass
  fn.custom = 1  # actually OK (functions have __dict__)
  obj = Multiplier(2)
  obj.custom = 1  # OK!
```

诚实预期：

- demo 输出是**确定性的**，每次运行结果完全一致
- `[6]` 特别澄清一个常见误解：Python 函数其实**可以**设置任意属性（`fn.custom = 1` 合法，函数有 `__dict__`），只是不常用；可调用对象真正的优势是同时拥有**方法和多个可读写状态**
- `[5]` 中 `callable(str)` 为 `True` —— 类本身可调用（触发 `type.__call__` 创建实例），这是一个容易被忽略的点

### 代码走读

demo 由六个环节组成，对应输出的 `[1]`–`[6]`。

`[1]` 无状态封装配置——这段在做什么：`__init__` 捕获配置参数，`__call__`
执行计算；每个实例是一个独立的"函数"，携带自己的配置。

```python
class Multiplier:
    def __init__(self, factor):
        self.factor = factor     # __init__ 捕获配置参数

    def __call__(self, x):       # __call__ 执行计算
        return x * self.factor

double = Multiplier(2)
double(5)   # 10 → 等价于 double.__call__(5)
```

`[2]` 有状态跨调用保留——这段在做什么：状态挂在实例上，构造时初始化一次；
`__call__` 里改的是 `self.total`，调用结束后实例还活着，状态留到下一次
调用。

```python
class Accumulator:
    def __init__(self, start=0):
        self.total = start        # 状态挂在实例上，构造时初始化一次

    def __call__(self, x):
        self.total += x           # 为什么关键：改的是 self.total，
        return self.total         # 调用结束后实例还活着，状态留到下一次调用

acc = Accumulator(100)
acc(10)   # 110 → acc(20) → 130
```

`[3]`–`[5]` 的策略模式、验证器链与 `callable()` 检查规则，在 How It Works
逐个展开。

## How It Works

这节解释调用协议与状态机制，并把输出 `[3]`–`[5]` 的现象对应到实现上。

### 调用协议：`callable()` 到底查什么

`callable(x)` 返回 `True` 当且仅当 **x 的类型**（或其 MRO——方法解析顺序，
沿继承链从下往上查找方法的类序列）定义了 `__call__`——检查的是类型层面
的调用支持，不是实例属性（实例属性存放在对象自己的 `__dict__` 里）。

所以函数、lambda、内置函数、定义了 `__call__` 的类的实例都是 `True`；
整数、字符串、`None` 等普通对象是 `False`。对照输出 `[5]` 逐行成立。

`callable(str)` 为 `True` 是因为类本身也可调用——类调用用于创建实例，
这个细节看下一小节的两个 `__call__`。

### 两个 `__call__`：类调用与实例调用

这段在做什么：同一个类，`Foo(10)` 走创建流程，`foo(5)` 走实例调用流程。

```python
class Foo:
    def __init__(self, x):
        self.x = x

    def __call__(self, y):
        return self.x + y

foo = Foo(10)  # type.__call__ → __init__
foo(5)         # 15，触发 foo.__call__(5)
```

`Foo(...)` 创建实例触发的是 `type.__call__`（内部走 `__new__` + `__init__`，
见 lab 12），`foo(...)` 触发的才是定义在 `Foo` 里的 `__call__`。输出
`[5]` 里 `callable(str)` 为 `True`，就来自前者。

### 状态为什么能跨调用保留

`Accumulator` 的关键是 `self.total += x` 改的是**实例属性**：调用结束后
实例还活着，属性自然留到下一次调用。输出 `[2]` 里 `acc(10)=110 →
acc(20)=130 → acc(5)=135`，就是同一个实例的三次调用接续累积。

### 策略模式与验证器链

这两段在做什么：`Formatter` 把"格式化函数"作为策略注入、运行时可换成
任何可调用对象；`Validator` 把检查逻辑封装成职责单一的验证器，错误集中
收集而非遇到第一个就停止。

```python
class Formatter:
    def __init__(self, strategy):
        self.strategy = strategy

    def __call__(self, data):
        return self.strategy(data)

fmt_json  = Formatter(format_json)
fmt_csv   = Formatter(format_csv)   # 运行时切换策略
```

新增策略只需添加一个函数；策略可以是函数、lambda、任何可调用对象。

```python
class Validator:
    def __init__(self, name, check_fn, error_msg):
        self.name, self.check, self.error_msg = name, check_fn, error_msg

    def __call__(self, value):
        if not self.check(value):
            return f"{self.name}: {self.error_msg}"
        return None

validators = [
    Validator("range",  lambda v: 0 < v < 150, "must be 0-150"),
    Validator("parity", lambda v: v % 2 == 0,  "must be even"),
]
errors = validate_all(validators, 200)  # ['range: must be 0-150']
```

验证器可自由增减、职责单一。输出 `[3]` 里同一份数据被 JSON/CSV/Table 三种
策略渲染，`[4]` 里 200 与 17 各自命中一条错误、42 通过。

## Pitfalls & Q&A

这节汇总三个经典坑与两个深入问题。坑的共同根源：可调用是**类型层面**的
协议，状态是**实例层面**的资产。

**坑 1：给实例挂 `__call__` 属性骗不过 `callable()`。**
现象：执行 `a.__call__ = lambda: None` 后，`callable(a)` 结果不变，
`a()` 也不会走这个属性。

原因：`callable(x)` 检查的是 x 的**类型**（或其 MRO）上有没有 `__call__`，
实例属性不影响判定。

解法：想让实例可调用，就把 `__call__` 定义在类上。

**坑 2：有状态意味着共享。**
现象：同一个 `acc` 传到别处继续调用，`total` 接着往上累积。
原因：`total` 跨调用保留在实例上，这是特性也是副作用。
解法：要"从头算"就新建实例。

**坑 3：两个 `__call__` 别混淆。**
现象：想控制"实例被调用"的行为，却去改了创建流程，或反过来，改动不生效。
原因：`Foo(...)` 创建实例触发的是 `type.__call__`，`foo(...)` 触发的才是
你定义的 `Foo.__call__`（见 How It Works）。

解法：先分清要控制的是创建还是调用，再决定把逻辑写在哪个层面。

**Q1：`__call__` 和普通函数有什么区别？**

调用语法一样；差别在可调用对象 = 函数能力 + 对象能力：状态用 `self`、
类型检查可用 `callable(obj)` 加 `isinstance(obj, Cls)`。属性挂载的差异
见 Quick Start 输出 `[6]`。

**Q2：`__call__` 和装饰器的关系？**

类装饰器（decorator，`@xxx` 语法里接收函数并返回新函数的包装机制）
本质上就是一个带 `__call__` 的对象：

```python
class Retry:
    def __init__(self, times=3):
        self.times = times

    def __call__(self, func):          # @Retry(times=3) 时调用
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for i in range(1, self.times + 1):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if i == self.times:
                        raise
        return wrapper
```

函数装饰器用闭包保存状态，类装饰器用 `self` 保存状态——后者更清晰。
