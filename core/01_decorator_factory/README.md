# 01 · 装饰器全家桶：从基础到标准库

> 工程里最经典的练手题之一："写一个装饰器"。从最简单的 `@timer` 到带参数的
> 工厂、类装饰器、装饰类的装饰器，每一层都是对同一个问题的不同回答：
> **"函数/类被 `@` 之后到底发生了什么"**。本实验把五种形态一次写全，
> 并盘一遍 `functools` 里最实用的现成装饰器。

## Background

这一节回答：在 `@` 语法出现之前，给一批函数统一加计时、重试、日志这类功能，人们是怎么做的，卡在哪里。

最原始的做法是把辅助逻辑直接写进函数体：要计时，就在函数开头取一次时间、结尾算差值打印。十个函数都要计时，就得复制十份几乎相同的代码；想统一调整打印格式，要跟着改十处，漏一处就是行为不一致。

稍进一步的写法是把公共逻辑抽成包装函数（wrapper：在目标函数外面再套一层、外部调用先经过它的函数），再手动把原函数名指向包装结果：

```python
def fetch_data():
    ...  # 原有业务逻辑

fetch_data = with_timing(fetch_data)   # 忘写这一行，增强就静默失效
```

这个写法功能上成立，代价有两个：每个函数定义后都要跟一行赋值，容易遗漏；包装层用新的函数对象顶掉原函数名，`__name__`、`__doc__` 等元信息（函数名、文档字符串这类自描述属性）若不专门复制，调试时看到的函数名全是 `"wrapper"`。

Python 2.4 依照 PEP 318 引入 `@` 语法，把"包装并替换函数名"这个动作挪到函数定义行上，成为一种写在函数头部的显式声明——也就是本实验要拆解的机制。

## What

这一节给出定义和五种形态总览，并建立一个心智模型。

装饰器是一个**接收函数、返回新函数**的高阶函数（高阶函数：参数或返回值里带函数的函数），`@deco` 只是 `func = deco(func)` 的语法糖——语法糖指功能等价、但更好写好读的简写形式。它在不修改原函数代码的前提下增强其功能。

可以把装饰器想象成装在函数门口的一道安检门：调用方照常调用，只是进出时多了计时、登记这类动作。但和真实安检门不同的是，这道门在函数定义时（模块加载时）一次性安装完成，之后每次调用走的都是同一道门，不会逐次重建。

按接收对象与返回物的不同，装饰器分五种形态：

| 形态 | 长相 | 典型用途 |
|:---|:---|:---|
| 基础装饰器 | `def deco(func)` 两层 | 计时、日志 |
| 带参装饰器（工厂） | 三层嵌套 | retry / cache / log |
| 类装饰器 | `__init__` 接函数、`__call__` 接调用 | 计数、显式状态 |
| 装饰类的装饰器 | 接收类、返回类或工厂 | 单例、方法增强 |
| 标准库现成的 | `@lru_cache` `@singledispatch` | memoization、类型分发 |

表中的术语先解释：工厂指返回装饰器的函数；memoization 指按参数缓存结果、同参数的重复调用直接复用；单例指一个类全局只保留一个实例；类型分发指按参数类型自动选择不同的实现分支。

## When to Use

这一节给出判断依据：什么场合值得上装饰器，什么场合不该用，同类方案怎么选。

典型场景，都是"在做什么事的时候"：

- 写网络客户端时，要给一批请求函数统一加重试——在每个函数里各复制一遍 try/except 和 sleep 不现实。
- 做数据处理脚本时，同一个入参的慢函数会被反复调用——`@lru_cache` 一行就能按参数缓存结果。
- 给多个入口函数补日志、埋点（在代码中插入调用数据采集）、鉴权时——这类横切逻辑（cross-cutting：与业务无关、散布在多个函数里的同一种辅助逻辑）适合用装饰器统一处理。

何时不用：增强逻辑只服务唯一一个函数、又要读写它内部的局部状态时，直接写进函数体更直观；增强会改变函数签名或返回类型时，`@` 的隐式替换会让调用方措手不及，宁可显式写一个新函数。

| 方案 | 与装饰器的差异 | 什么时候选它 |
|:---|:---|:---|
| 直接写进函数体 | 无抽象层，但逻辑无法复用 | 只有唯一函数需要该功能 |
| 手动包装赋值 `f = deco(f)` | 效果与 `@` 等价，多一行且易漏 | 要在运行时按条件决定是否增强 |
| 继承 / 子类化 | 只能覆盖方法，受类层次约束 | 行为定制本就属于类层次设计时 |

读熟这套谱系还有一个附带收益：`functools`、`pydantic`、各类框架的路由注册都建立在这套语法上，读懂它们的基础就是本文的五种形态。

## Quick Start

这一节把 demo 跑起来，给出真实输出与最基础形态的最小写法。前置条件：只用标准库，零第三方依赖。

### 运行与真实输出

```bash
cd core/01_decorator_factory
python3 decorator_factory.py
```

真实输出示例（`@retry` 部分每次不同）：

```
=== 装饰器全家桶 ===

1. 基础装饰器 @basic_timer:
  [timer] busy_wait 耗时 125.0ms
  → 等了 120ms

2. 装饰器工厂 @retry / @ttl_cache / @log_call:
  第1次失败: 连接 https://api.example.com 失败, 0.1s后重试
  → OK from https://api.example.com

  首次: 1024 (0.30s)
  缓存: 1024 (0.00s)
  [DEBUG] add((3, 4))
  [DEBUG] → 7

3. 类装饰器 @CountCalls:
  [CountCalls] greet 第 1 次调用
  [CountCalls] greet 第 2 次调用
  总计: greet.count = 2
  元信息保留: greet.__name__ = greet

4. 装饰类的装饰器 @singleton / @add_repr:
  Config('prod') is Config('dev') → True (env=prod)
  User → User(name='alice', role='admin')

5. 标准库实用装饰器:
  fib(30) = 832040, lru_cache: CacheInfo(hits=28, misses=31, maxsize=None, currsize=31)
  jsonable({3,1,2}) = [1, 2, 3], jsonable((4,5)) = [4, 5]
```

诚实预期：`@retry` 用 `random.random() < 0.6` 模拟失败率，重试次数每次运行都不同；`@ttl_cache` 的加速（0.30s → 0.00s）稳定可复现；`[timer]` 耗时略高于 sleep 值（含调度开销）属正常。

### 最小写法：两层函数

最基础的形态只需两层函数。这段在做什么：外层接收被装饰的函数，内层 `wrapper` 完成计时包装，最后把 `wrapper` 返回去顶替原函数名。

```python
def basic_timer(func):            # 接收被装饰函数
    @functools.wraps(func)
    def wrapper(*args, **kwargs):  # 包装调用
        t0 = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"  [timer] {func.__name__} 耗时 {(time.perf_counter()-t0)*1000:.1f}ms")
        return result
    return wrapper                 # 返回替换后的函数
```

另外四种形态的代码与结构拆解放到 How It Works——对它们而言，机制比写法更值得先弄懂。

### 标准库速览

标准库里最实用的现成装饰器：

| 装饰器 | 用途 | 备注 |
|:---|:---|:---|
| `functools.wraps` | 保留被装饰函数元信息 | 自己写装饰器的标配 |
| `functools.lru_cache(maxsize)` / `functools.cache` | 带上限/无限 memoization | `cache_info()` 可观测命中率；常用来优化重复子问题多的递归 |
| `functools.singledispatch` | 按第一参数类型分发 | 面向函数的多态，`@xxx.register` 注册分支 |
| `staticmethod` / `classmethod` / `property` | 方法三件套 | 定制类属性访问，见 lab 17 |

`lru_cache` 与 `singledispatch` 的深入用法见 [20_itertools_func](../20_itertools_func/README.md)，`property` 见 [17_property](../17_property/README.md)。

## How It Works

这一节按"一个 `@` 从定义到调用经历了什么"的顺序拆机制，并和 Quick Start 输出里的现象互相印证。

### `@` 行发生的一次替换

执行到函数定义上的 `@deco` 时，Python 立刻调用 `deco(下方的函数)`，把返回值写回原函数名，此后这个名字指向的是包装后的新函数。输出第 3 节能看到 `总计: greet.count = 2`，前提就是 `greet` 这个名字已被 `CountCalls(greet)` 的返回物顶替。

### 三层工厂：每层各接一样东西

带参装饰器必须三层嵌套，因为三样东西在不同时刻才到位：装饰器参数在装饰时给定，被装饰函数在装饰时传入，调用参数在每次调用时传入。

```python
def retry(times=3, delay=0.5):       # 第1层：接收装饰器参数
    def decorator(func):             # 第2层：接收被装饰函数
        @functools.wraps(func)
        def wrapper(*args, **kwargs):  # 第3层：实际包装逻辑
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if attempt == times:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator
```

同款骨架的还有 `@ttl_cache`（闭包字典存 `(timestamp, value)` 支持 TTL 过期）和 `@log_call`（闭包持有日志级别），见 demo 脚本。这里出现闭包——内层函数记住外层函数的变量，外层返回后这些变量仍然存活——它捕获的位置决定状态的生命周期：

```python
def ttl_cache(ttl=60.0):          # ttl 在第1层 —— 装饰器配置，装饰时求值一次
    def decorator(func):          # func 在第2层 —— 只在装饰时调用一次
        store = {}                # 状态放第2层函数体 —— 与 func 同生命周期
        def wrapper(*args, **kwargs):   # 每次调用都走这里
            ...
```

`store = {}` 写在第 2 层函数体里，每个被装饰的函数就拿到一份独立的缓存字典，互不串数据。输出里"首次 1024 (0.30s)、缓存 1024 (0.00s)"的对比，查的正是这份被闭包持有的字典。

### 类装饰器：把状态摆到明面上

类装饰器用 `__init__` 接收函数、`__call__` 让实例可以像函数一样被调用：

```python
class CountCalls:
    def __init__(self, func):
        functools.update_wrapper(self, func)  # wraps 的类版等价写法
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        return self.func(*args, **kwargs)
```

与函数版完全等价，区别只在状态（计数器）从闭包变量变成显式实例属性，状态多了更好维护。输出里的 `[CountCalls] greet 第 1 次调用` 每调用一次打一条，就来自 `__call__`。带参数的类装饰器再多一层：`__init__` 接装饰器参数，`__call__` 接函数并返回 wrapper。

### 装饰类的装饰器：在类创建期动手脚

装饰器的参数同样可以是一个类——接收类，返回增强后的类或工厂函数：

```python
def singleton(cls):                    # 单例：拦截实例化
    instances = {}
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return get_instance

def add_repr(cls):                     # 类增强：自动补方法
    def __repr__(self):
        attrs = ", ".join(f"{k}={v!r}" for k, v in vars(self).items())
        return f"{cls.__name__}({attrs})"
    cls.__repr__ = __repr__
    return cls
```

`@singleton` 用字典记住已创建的实例、拦截后续实例化，所以输出第 4 节是 `Config('prod') is Config('dev') → True`——两次"实例化"拿到同一个对象。

`@add_repr` 直接把新的 `__repr__` 挂到类上，因此打印 `User` 实例得到 `User(name='alice', role='admin')`。

### wraps：元信息复制

`functools.wraps` 把原函数的 `__name__`、`__doc__` 等元信息复制到 wrapper 上；不写它，`func.__name__` 会变成 `"wrapper"`，调试与日志无法识别原函数。

输出第 3 节能打出 `元信息保留: greet.__name__ = greet`，靠的就是 `CountCalls.__init__` 里那行 `functools.update_wrapper(self, func)`。

## Pitfalls & Q&A

这一节先列四个常见踩坑（现象、原因、解法），再留一个有增量的深入问题。为什么三层嵌套、类怎么写成装饰器、能否装饰类——这三问已拆进 How It Works 的对应小节。

踩坑清单：

- **忘写 `functools.wraps`**。现象：日志与调试器里所有被装饰函数都显示为 `"wrapper"`，多装饰器叠加时排查极其困难。原因：wrapper 用新函数对象顶掉原名，元信息没有复制过去。解法：每个 wrapper 都加 `@functools.wraps(func)`；类版用 `functools.update_wrapper(self, func)`。
- **重试逻辑里写裸 `except:`**。现象：循环重试时按 Ctrl+C 想中断脚本，信号像被吞掉一样没有反应。原因：裸 `except:` 连 `KeyboardInterrupt` 一起捕获。解法：只捕获 `except Exception`，让中断信号正常穿透。
- **重试耗尽后忘记 `raise`**。现象：下游明明失败，调用方却拿到 `None` 当成功继续执行。原因：最后一次失败没有重新抛出异常，函数静默返回 `None`。解法：最后一次失败必须 `raise`，把异常交还调用方——静默返回会把失败伪装成成功，是最危险的 bug。
- **`@singleton` 装饰后类不再是类**。现象：对装饰后的 `Config` 子类化、访问类属性，行为都偏离预期。原因：`singleton` 返回的是工厂函数，`Config` 这个名字已指向函数而非类。解法：生产代码改用 `__new__`（真正负责创建实例的类方法）实现单例，或用元类（metaclass：创建类的类，见 lab 05）。

深入问答：

**Q: 多个装饰器叠加时，执行顺序是什么？**

`@a` `@b` 叠加等价于 `func = a(b(func))`：**定义时从下到上包裹，调用时从上到下执行**——先走 a 的 wrapper，内部调 b 的 wrapper，最后到 func。
