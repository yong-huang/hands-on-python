# 13 · `__call__`：可调用对象与函数式模式

> 对象怎么"生"出来（`__new__` + `__init__`）理清了。顺着想一步：
> `MyClass()` 能调用，`my_func(42)` 也能调用，那 `obj(42)` 呢？
> Python 中一切皆对象，函数也不例外——`obj(42)` 实际调用的是 `obj.__call__(42)`。
> 只要一个类定义了 `__call__`，它的实例就能像函数一样被调用，这就是可调用对象。

## What

`obj(42)` 实际调用的是 `obj.__call__(42)`——只要类定义了 `__call__`，实例就能像函数一样被调用，这就是**可调用对象（Callable Object）**。一句话心智模型：**调用实例时，解释器去实例的"类型"上找 `__call__`，实例状态通过 `self` 跨调用保留**。典型用途：函数对象（封装状态+行为）、类装饰器、策略模式、验证器链。

## Why

不掌握它，装饰器、functools 这些"函数味"很浓的代码就只能背不能写。可调用对象是 Python 函数式编程和设计模式的基石：普通函数每次调用栈帧销毁，状态只能靠闭包、global 或函数属性兜圈子；可调用对象的 `self` 天然就是状态的容身之处。`callable()` 内置函数可以检查任何对象是否可调用。

## How

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

诚实预期（本机实测）：

- demo 输出是**确定性的**，每次运行结果完全一致
- `[6]` 特别澄清一个常见误解：Python 函数其实**可以**设置任意属性（`fn.custom = 1` 合法，函数有 `__dict__`），只是不常用；可调用对象真正的优势是同时拥有**方法和多个可读写状态**
- `[5]` 中 `callable(str)` 为 `True` —— 类本身可调用（触发 `type.__call__` 创建实例），这是一个容易被忽略的点

### 无状态：封装配置

```python
class Multiplier:
    def __init__(self, factor):
        self.factor = factor     # __init__ 捕获配置参数

    def __call__(self, x):       # __call__ 执行计算
        return x * self.factor

double = Multiplier(2)
double(5)   # 10 → 等价于 double.__call__(5)
```

每个实例是一个独立的"函数"，携带自己的配置。

### 有状态：跨调用保留

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

### 策略模式：可互换的算法

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

### 验证器链：可组合管道

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

验证器可自由增减、职责单一；错误信息集中收集，而非遇到第一个就停止。

## Deep Dive

踩坑清单：

- **给实例挂 `__call__` 属性骗不过 `callable()`**：`callable(x)` 检查的是 x 的**类型**（或其 MRO）上有没有 `__call__`，实例属性 `a.__call__ = lambda: None` 既不影响 `callable(a)`，`a()` 也不会走它
- **有状态意味着共享**：`acc` 的 `total` 跨调用保留，同一个实例传到别处继续调用会接着累积——要"从头算"就新建实例
- **两个 `__call__` 别混淆**：`Foo(...)` 创建实例触发的是 `type.__call__`，`foo(...)` 触发的才是你定义的 `Foo.__call__`

## Q&A

**Q1: `__call__` 和普通函数有什么区别？**

| 特性 | 普通函数 | 可调用对象 |
|------|---------|-----------|
| 调用方式 | `fn(5)` | `obj(5)` |
| 内部状态 | 需要闭包或 global | 天然支持（`self.xxx`） |
| 自定义属性 | 支持（`fn.__dict__`），但不常用 | 支持（`obj.custom = 1`） |
| 类型检查 | `callable(fn)` | `callable(obj)` + `isinstance(obj, Cls)` |

可调用对象 = 函数能力 + 对象能力。

**Q2: `callable()` 检查的是什么？**

`callable(x)` 返回 `True` 当且仅当 **x 的类型**（或其 MRO）定义了 `__call__`——检查的是类型层面的调用支持，不是实例属性。函数、lambda、内置函数、定义了 `__call__` 的类的实例、类本身（`callable(int)`——类的 `__call__` 用于创建实例）都是 `True`；整数、字符串、`None` 等普通对象是 `False`。

**Q3: `__call__` 和装饰器的关系？**

类装饰器本质上就是一个带 `__call__` 的对象：

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

**Q4: 类本身可以当函数用吗？**

可以，但那是另一个 `__call__`：`MyClass(args)` 触发 `type.__call__`（内部走 `__new__` + `__init__` 创建实例），实例 `obj(args)` 才触发你定义的 `Foo.__call__`。

```python
class Foo:
    def __init__(self, x):
        self.x = x

    def __call__(self, y):
        return self.x + y

foo = Foo(10)  # type.__call__ → __init__
foo(5)         # 15，触发 foo.__call__(5)
```
