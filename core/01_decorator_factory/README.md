# 01 · 装饰器工厂：三层嵌套实现带参数的装饰器

> 面试里最常见的手写题之一："写一个带参数的装饰器"。很多人能写出单层装饰器，
> 一加参数就卡壳——因为带参装饰器是**三层函数嵌套**，每一层接什么都不清楚。
> 本实验把三层结构拆开看明白，并顺手实现 `@retry` / `@cache` / `@log_call`
> 三个经典带参装饰器。

## 1. 为什么需要它

装饰器本质是一个**高阶函数**——接收函数作为参数，返回一个新函数，在不修改原函数代码的前提下增强其功能。但工程里几乎总有"配置"需求：重试几次？缓存多久？日志什么级别？参数一旦出现，装饰器就得再包一层：外层接收装饰器参数，中层接收被装饰函数，内层是实际的包装函数。理解这层结构，是读懂一切装饰器库（`functools`、`pydantic`、框架路由）的基础。

## 2. 总览：核心机制一图看懂

![装饰器工厂：定义期套壳 + 调用期重试](images/decorator_factory.svg)

一句话心智模型：**定义期两次调用完成"套壳"（`retry(3,0.1)` → `decorator` → `wrapper`），调用期 `wrapper` 接管控制流**。看图时先看上半段的定义期时序——参数 `times` 在第二次调用时被闭包捕获；再看下半段的调用期——`wrapper` 内 `func(*args)` 失败自动重试、成功后把结果透传给调用方。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/core/01_decorator_factory/images/decorator_factory.html)
> （或本地打开 [`images/decorator_factory.html`](images/decorator_factory.html)）。

## 3. 快速开始

```bash
cd core/01_decorator_factory
python3 decorator_factory.py      # 运行三个装饰器的 demo（零第三方依赖）
```

真实输出示例（macOS, CPython 3.10）：

```
=== 装饰器工厂 ===

1. @retry:
  → OK from https://api.example.com

  第1次失败: 连接 https://api.example.com 失败, 0.1s后重试
  → OK from https://api.example.com

2. @cache:
  首次: 1024 (0.30s)
  缓存: 1024 (0.00s)

3. @log_call:
  [DEBUG] add((3, 4))
  [DEBUG] → 7
```

诚实预期（本机实测）：

- **@retry 的输出每次都不一样**：demo 里 `fetch` 用 `random.random() < 0.6` 模拟 60% 失败率，重试次数甚至是否成功都是随机的——两次调用都直接成功也属正常
- **@cache 的加速稳定可复现**：首次因 `time.sleep(0.3)` 约 0.30s，缓存命中约 0.00s

## 4. 核心概念

### 4.1 三层嵌套结构

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

### 4.2 functools.wraps 的作用

`wraps` 将原函数的 `__name__`、`__doc__` 等元信息复制到 wrapper。不写它，`func.__name__` 会变成 `"wrapper"`，调试和日志中无法识别原函数。

### 4.3 三个装饰器详解

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

#### @cache —— 带过期缓存

```python
def cache(ttl=60.0):
    def decorator(func):
        cache_store = {}  # 闭包变量，持久化缓存

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{args}:{kwargs}"
            now = time.time()
            if key in cache_store:
                timestamp, value = cache_store[key]
                if now - timestamp < ttl:
                    return value  # 缓存命中
            result = func(*args, **kwargs)
            cache_store[key] = (now, result)
            return result
        return wrapper
    return decorator
```

关键点：`cache_store` 是闭包变量，在多次调用间持久存在；用 `(timestamp, value)` 元组存储，支持 TTL 过期。

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

## 5. 关键代码解析

三个装饰器共享同一个骨架，最容易写错的是**闭包捕获的位置**：

```python
def cache(ttl=60.0):            # ttl 在第1层 —— 装饰器配置，装饰时求值一次
    def decorator(func):        # func 在第2层 —— 只在装饰时调用一次
        cache_store = {}        # 状态放第2层函数体 —— 与 func 同生命周期
        def wrapper(*args, **kwargs):   # 每次调用都走这里
            ...
```

坑清单：

- **`functools.wraps` 忘写**：元信息丢失，多装饰器叠加时排查日志极其困难
- **裸 `except:`**：会把 `KeyboardInterrupt` 也吞掉，重试逻辑里必须用 `except Exception`
- **最后一次失败必须 `raise`**：静默返回 `None` 会把失败伪装成成功，是最危险的 bug
- **示意图中的重试/命中时序是示意数据**（展示行为模式），不是某次运行的实录

## 6. 文件结构

```
01_decorator_factory/
├── README.md                        # 本教程文档
├── decorator_factory.py             # 主演示脚本：@retry / @cache / @log_call
└── images/
    ├── decorator_factory.json  # 图源（typed JSON IR，可编辑重渲染）
    ├── decorator_factory.html  # 交互示意图（浏览器打开）
    └── decorator_factory.svg   # 双主题矢量图（本 README §2 内嵌）
```

`decorator_factory.py` 内容：`1. retry(times, delay)` 失败重试 / `2. cache(ttl)` 带过期缓存 / `3. log_call(level)` 日志控制 / `4. 演示函数 fetch / compute / add` / `5. main()` 主入口。

## 7. 深入要点

**Q1: 带参数的装饰器为什么要三层嵌套？**
每层各接一样东西：第 1 层接装饰器参数，第 2 层接被装饰函数，第 3 层接调用参数。参数少一层都放不下——这是 `@retry(times=3)` 语法糖背后的两次真实函数调用。

**Q2: 多个装饰器的执行顺序？**
`@a` `@b` 叠加等价于 `func = a(b(func))`：**定义时从下到上包裹，调用时从上到下执行**——先走 a 的 wrapper，内部调 b 的 wrapper，最后到 func。

**Q3: 用类怎么实现装饰器？**
实现 `__init__(self, param)` 接参数、`__call__(self, func)` 返回 wrapper，行为与函数版等价。注意 `except Exception` 而不是裸 `except:`，且最后一次失败必须 `raise`。

**Q4: 装饰器能装饰类吗？**
可以。装饰器接收类作为参数，返回新类（或原类）。典型应用是单例：

```python
def singleton(cls):
    instances = {}
    def wrapper(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return wrapper
```

**Q5: `functools.wraps` 不写会怎样？**
功能不受影响，但 `func.__name__` 变成 `"wrapper"`、`__doc__` 丢失；调试、序列化、文档生成全部受牵连——面试官常以此考察工程素养。

## 8. 总结

1. **装饰器本质是高阶函数**，三层嵌套实现带参装饰器
2. **functools.wraps 保留元信息**，调试时至关重要
3. **闭包变量持久化状态**，如 cache_store、重试计数
4. **装饰器链从下到上包裹**，调用时从上到下执行
5. **类装饰器用 `__call__`** 实现，功能与函数装饰器等价

下一篇进入 [02_context_manager](../02_context_manager/README.md)：看 `with` 语句背后的 `__enter__` / `__exit__` 协议。
