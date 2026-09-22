# 01 · 装饰器工厂：从基础写法到装饰器全家桶

> 面试里最常见的手写题之一："写一个装饰器"。从最简单的 `@timer` 到带参数的
> 工厂、类装饰器、装饰类的装饰器，每一层都是对同一个问题的不同回答：
> **"函数/类被 `@` 之后到底发生了什么"**。本实验把五种形态一次写全，
> 并盘一遍 `functools` 里最实用的现成装饰器。

## 1. 为什么需要它

装饰器本质是一个**高阶函数**——接收函数作为参数，返回一个新函数，在不修改原函数代码的前提下增强其功能。但工程里几乎总有"配置"需求：重试几次？缓存多久？日志什么级别？参数一旦出现，装饰器就得再包一层：外层接收装饰器参数，中层接收被装饰函数，内层是实际的包装函数。再往后还有两个变体：用**类**实现装饰器（状态管理更直观），以及**装饰类本身**（单例、自动补方法）。理解这套谱系，是读懂一切装饰器库（`functools`、`pydantic`、框架路由）的基础。

## 2. 总览：核心机制一图看懂

![装饰器工厂：定义期套壳 + 调用期重试](images/decorator_factory.svg)

一句话心智模型：**定义期两次调用完成"套壳"（`retry(3,0.1)` → `decorator` → `wrapper`），调用期 `wrapper` 接管控制流**。看图时先看上半段的定义期时序——参数 `times` 在第二次调用时被闭包捕获；再看下半段的调用期——`wrapper` 内 `func(*args)` 失败自动重试、成功后把结果透传给调用方。这张图是带参工厂（§4.2）的机制核心；其余形态都是同一套"接收→返回"游戏的变体。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/core/01_decorator_factory/images/decorator_factory.html)
> （或本地打开 [`images/decorator_factory.html`](images/decorator_factory.html)）。

## 3. 快速开始

```bash
cd core/01_decorator_factory
python3 decorator_factory.py      # 运行装饰器全家桶 demo（零第三方依赖）
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

诚实预期（本机实测）：

- **@retry 的输出每次都不一样**：demo 里 `fetch` 用 `random.random() < 0.6` 模拟 60% 失败率，重试次数甚至是否成功都是随机的——两次调用都直接成功也属正常
- **@ttl_cache 的加速稳定可复现**：首次因 `time.sleep(0.3)` 约 0.30s，缓存命中约 0.00s
- **`[timer]` 显示的耗时略高于 sleep 值**（125ms vs 120ms）：计时含函数调度开销，属正常

## 4. 核心概念

### 4.1 最简形态：基础装饰器（无参数）

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

两行本质：`@basic_timer` 只是 `busy_wait = basic_timer(busy_wait)` 的语法糖。所有装饰器都是这个骨架的变体。

### 4.2 三层嵌套：带参装饰器工厂

```python
def decorator_factory(param):        # 第1层：接收装饰器参数
    def decorator(func):             # 第2层：接收被装饰函数
        @functools.wraps(func)
        def wrapper(*args, **kwargs):  # 第3层：实际包装逻辑
            return func(*args, **kwargs)
        return wrapper
    return decorator
```

**执行顺序**：
1. `@retry(times=3, delay=0.1)` → 调用 `retry(3, 0.1)` → 返回 `decorator`
2. `@decorator` → 调用 `decorator(fetch)` → 返回 `wrapper`
3. 调用 `fetch(url)` → 实际执行 `wrapper(url)`

### 4.3 functools.wraps 的作用

`wraps` 将原函数的 `__name__`、`__doc__` 等元信息复制到 wrapper。不写它，`func.__name__` 会变成 `"wrapper"`，调试和日志中无法识别原函数。类版装饰器里对应的是 `functools.update_wrapper(self, func)`。

### 4.4 三个带参装饰器详解

#### @retry —— 失败重试

```python
def retry(times=3, delay=0.5):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == times:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator
```

关键点：循环 `times` 次尝试；最后一次失败才抛出异常；每次失败后等待 `delay` 秒。

#### @ttl_cache —— 带过期缓存

```python
def ttl_cache(ttl=60.0):
    def decorator(func):
        store = {}  # 闭包变量，持久化缓存
        @functools.wraps(func)
        def wrapper(*args):
            now = time.time()
            if args in store:
                ts, val = store[args]
                if now - ts < ttl:
                    return val  # 缓存命中
            result = func(*args)
            store[args] = (now, result)
            return result
        return wrapper
    return decorator
```

关键点：`store` 是闭包变量，在多次调用间持久存在；用 `(timestamp, value)` 元组存储，支持 TTL 过期。

#### @log_call —— 日志控制

```python
def log_call(level="INFO"):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args):
            print(f"  [{level}] {func.__name__}({args})")
            result = func(*args)
            print(f"  [{level}] → {result}")
            return result
        return wrapper
    return decorator
```

关键点：装饰器参数 `level` 在闭包中持久化；调用前后各输出一条日志。

### 4.5 类装饰器：用 `__init__` 接函数、`__call__` 接调用

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

与函数版等价，但状态（计数器）是显式实例属性，比闭包变量更直观——需要多份状态或可配置行为时优先用它。

### 4.6 装饰类的装饰器

装饰器接收类、返回类（或可调用对象），在**类创建期**动手脚：

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

关键点：`@singleton` 装饰后模块里拿到的是**工厂函数**而非类本身——`isinstance` 仍正常（实例确实是原类建的），但 `Config(...)` 的语义已被接管；`@add_repr` 这类只补方法不碰 `__init__` 的写法是"类增强"的常见套路。

### 4.7 标准库实用装饰器速览

| 装饰器 | 用途 | 备注 |
|:---|:---|:---|
| `functools.wraps` | 保留被装饰函数元信息 | 自己写装饰器的标配 |
| `functools.lru_cache(maxsize)` / `functools.cache` | 带上限/无限 memoization | `cache_info()` 可观测命中率；递归优化神器 |
| `functools.singledispatch` | 按第一参数类型分发 | 面向函数的多态，`@xxx.register` 注册分支 |
| `staticmethod` / `classmethod` / `property` | 方法三件套 | 定制类属性访问，见 lab 17 |

这些在 demo 第 5 部分都有最小可跑示例；`lru_cache` 与 `singledispatch` 的深入用法见 [20_itertools_func](../20_itertools_func/README.md)，`property` 见 [17_property](../17_property/README.md)。

## 5. 关键代码解析

带参装饰器共享同一个骨架，最容易写错的是**闭包捕获的位置**：

```python
def ttl_cache(ttl=60.0):          # ttl 在第1层 —— 装饰器配置，装饰时求值一次
    def decorator(func):          # func 在第2层 —— 只在装饰时调用一次
        store = {}                # 状态放第2层函数体 —— 与 func 同生命周期
        def wrapper(*args, **kwargs):   # 每次调用都走这里
            ...
```

坑清单：

- **`functools.wraps` 忘写**：元信息丢失，多装饰器叠加时排查日志极其困难
- **裸 `except:`**：会把 `KeyboardInterrupt` 也吞掉，重试逻辑里必须用 `except Exception`
- **最后一次失败必须 `raise`**：静默返回 `None` 会把失败伪装成成功，是最危险的 bug
- **`@singleton` 返回的是工厂函数**：装饰后 `Config` 不再是类，子类化、类属性访问都会偏离预期——生产代码更稳妥的写法是 `__new__` 单例或元类（见 lab 05）
- **示意图中的重试/命中时序是示意数据**（展示行为模式），不是某次运行的实录

## 6. 文件结构

```
01_decorator_factory/
├── README.md                        # 本教程文档
├── decorator_factory.py             # 主演示脚本：装饰器五形态 + 标准库速览
└── images/
    ├── decorator_factory.json  # 图源（typed JSON IR，可编辑重渲染）
    ├── decorator_factory.html  # 交互示意图（浏览器打开）
    └── decorator_factory.svg   # 双主题矢量图（本 README §2 内嵌）
```

`decorator_factory.py` 内容：`1. basic_timer` 基础装饰器 / `2. retry · ttl_cache · log_call` 带参工厂 / `3. CountCalls` 类装饰器 / `4. singleton · add_repr` 装饰类 / `5. 被装饰示例函数` / `6. lru_cache · singledispatch` 标准库速览 / `7. main()` 主入口。

## 7. 深入要点

**Q1: 带参数的装饰器为什么要三层嵌套？**
每层各接一样东西：第 1 层接装饰器参数，第 2 层接被装饰函数，第 3 层接调用参数。参数少一层都放不下——这是 `@retry(times=3)` 语法糖背后的两次真实函数调用。

**Q2: 多个装饰器的执行顺序？**
`@a` `@b` 叠加等价于 `func = a(b(func))`：**定义时从下到上包裹，调用时从上到下执行**——先走 a 的 wrapper，内部调 b 的 wrapper，最后到 func。

**Q3: 用类怎么实现装饰器？**
两种形态：无参类装饰器 `__init__(self, func)` 接函数、`__call__(self, *args)` 接调用（demo 的 `CountCalls`，状态显式好维护）；带参类装饰器再多一层——`__init__` 接参数、`__call__` 接函数返回 wrapper。注意 `except Exception` 而不是裸 `except:`，且最后一次失败必须 `raise`。

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

注意装饰后 `Config` 名字指向的是工厂函数而非类（demo §4 有演示与说明）。

**Q5: `functools.wraps` 不写会怎样？**
功能不受影响，但 `func.__name__` 变成 `"wrapper"`、`__doc__` 丢失；调试、序列化、文档生成全部受牵连——面试官常以此考察工程素养。类版装饰器对应 `functools.update_wrapper(self, func)`。

## 8. 总结

1. **装饰器只是"接收→返回"**：基础形态两行核心，带参工厂三层嵌套
2. **functools.wraps / update_wrapper 保留元信息**，调试时至关重要
3. **闭包变量持久化状态**；要显式状态就用类装饰器（`__call__`）
4. **装饰类在类创建期动手脚**：单例、方法增强；注意工厂函数接管语义的副作用
5. **先翻标准库再手写**：`lru_cache` / `singledispatch` / `wraps` 覆盖大多数场景

下一篇进入 [02_context_manager](../02_context_manager/README.md)：看 `with` 语句背后的 `__enter__` / `__exit__` 协议。
