# 01 · 装饰器全家桶：从基础到标准库

> 工程里最经典的练手题之一："写一个装饰器"。从最简单的 `@timer` 到带参数的
> 工厂、类装饰器、装饰类的装饰器，每一层都是对同一个问题的不同回答：
> **"函数/类被 `@` 之后到底发生了什么"**。本实验把五种形态一次写全，
> 并盘一遍 `functools` 里最实用的现成装饰器。

## What

装饰器是一个**接收函数、返回新函数**的高阶函数，`@deco` 只是 `func = deco(func)` 的语法糖——在不修改原函数代码的前提下增强其功能。按形态分五种：

| 形态 | 长相 | 典型用途 |
|:---|:---|:---|
| 基础装饰器 | `def deco(func)` 两层 | 计时、日志 |
| 带参装饰器（工厂） | 三层嵌套 | retry / cache / log |
| 类装饰器 | `__init__` 接函数、`__call__` 接调用 | 计数、显式状态 |
| 装饰类的装饰器 | 接收类、返回类或工厂 | 单例、方法增强 |
| 标准库现成的 | `@lru_cache` `@singledispatch` | memoization、类型分发 |

## Why

工程里几乎总有"配置"需求：重试几次？缓存多久？日志什么级别？参数一旦出现，装饰器就得再包一层：外层接收装饰器参数，中层接收被装饰函数，内层是实际的包装函数。需要横切多个函数的同一份逻辑（计时、重试、缓存、鉴权）时，装饰器是不改业务代码的标准答案。理解这套谱系，也是读懂一切装饰器库（`functools`、`pydantic`、框架路由）的基础。

## How

运行 demo（零第三方依赖）：

```bash
cd core/01_decorator_factory
python3 decorator_factory.py
```

真实输出示例（macOS, CPython 3.13，`@retry` 部分每次不同）：

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

### 基础装饰器：两层就够

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

### 带参装饰器：三层嵌套工厂

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

同款骨架的还有 `@ttl_cache`（闭包字典存 `(timestamp, value)` 支持 TTL 过期）和 `@log_call`（闭包持有日志级别），见 demo 脚本。

### 类装饰器：状态显式化

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

与函数版等价，但状态（计数器）是显式实例属性——需要多份状态或可配置行为时优先用它。

### 装饰类的装饰器：在类创建期动手脚

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

### 标准库实用装饰器

| 装饰器 | 用途 | 备注 |
|:---|:---|:---|
| `functools.wraps` | 保留被装饰函数元信息 | 自己写装饰器的标配 |
| `functools.lru_cache(maxsize)` / `functools.cache` | 带上限/无限 memoization | `cache_info()` 可观测命中率；递归优化神器 |
| `functools.singledispatch` | 按第一参数类型分发 | 面向函数的多态，`@xxx.register` 注册分支 |
| `staticmethod` / `classmethod` / `property` | 方法三件套 | 定制类属性访问，见 lab 17 |

`lru_cache` 与 `singledispatch` 的深入用法见 [20_itertools_func](../20_itertools_func/README.md)，`property` 见 [17_property](../17_property/README.md)。

## Core

**执行顺序**——`@retry(times=3, delay=0.1)` 装饰 `fetch` 是三次真实调用：`retry(3, 0.1)` 返回 `decorator`；`decorator(fetch)` 返回 `wrapper`（`times` 被闭包捕获）；此后 `fetch(url)` 实际执行 `wrapper(url)`。

**functools.wraps**——把原函数的 `__name__`、`__doc__` 等元信息复制到 wrapper；不写它，`func.__name__` 变成 `"wrapper"`，调试与日志无法识别原函数。类版装饰器用 `functools.update_wrapper(self, func)`。

**闭包捕获的位置**——最容易写错的地方：

```python
def ttl_cache(ttl=60.0):          # ttl 在第1层 —— 装饰器配置，装饰时求值一次
    def decorator(func):          # func 在第2层 —— 只在装饰时调用一次
        store = {}                # 状态放第2层函数体 —— 与 func 同生命周期
        def wrapper(*args, **kwargs):   # 每次调用都走这里
            ...
```

**坑清单**：

- **`functools.wraps` 忘写**：元信息丢失，多装饰器叠加时排查日志极其困难
- **裸 `except:`**：会把 `KeyboardInterrupt` 也吞掉，重试逻辑里必须用 `except Exception`
- **最后一次失败必须 `raise`**：静默返回 `None` 会把失败伪装成成功，是最危险的 bug
- **`@singleton` 返回的是工厂函数**：装饰后 `Config` 不再是类，子类化、类属性访问都会偏离预期——生产代码更稳妥的写法是 `__new__` 单例或元类（见 lab 05）

## Q&A

**Q1: 带参数的装饰器为什么要三层嵌套？**
每层各接一样东西：第 1 层接装饰器参数，第 2 层接被装饰函数，第 3 层接调用参数。参数少一层都放不下——这是 `@retry(times=3)` 语法糖背后的两次真实函数调用。

**Q2: 多个装饰器的执行顺序？**
`@a` `@b` 叠加等价于 `func = a(b(func))`：**定义时从下到上包裹，调用时从上到下执行**——先走 a 的 wrapper，内部调 b 的 wrapper，最后到 func。

**Q3: 用类怎么实现装饰器？**
两种形态：无参类装饰器 `__init__(self, func)` 接函数、`__call__(self, *args)` 接调用（demo 的 `CountCalls`，状态显式好维护）；带参类装饰器再多一层——`__init__` 接参数、`__call__` 接函数返回 wrapper。

**Q4: 装饰器能装饰类吗？**
可以。装饰器接收类作为参数，返回新类、增强后的类或工厂函数。典型应用是单例：

```python
def singleton(cls):
    instances = {}
    def wrapper(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return wrapper
```

注意装饰后 `Config` 名字指向的是工厂函数而非类本身。

**Q5: `functools.wraps` 不写会怎样？**
功能不受影响，但 `func.__name__` 变成 `"wrapper"`、`__doc__` 丢失；调试、序列化、文档生成全部受牵连——这也是衡量工程素养的细节。类版装饰器对应 `functools.update_wrapper(self, func)`。
