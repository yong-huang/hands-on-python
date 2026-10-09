# 02 · 上下文管理器：with 语句背后的 `__enter__` / `__exit__` 协议

> 装饰器在函数前后插逻辑，可一旦函数体中途抛异常，"调用后"的清理代码就被跳过了
> ——手写 `try/finally` 能救，但每个资源处都写一遍既啰嗦又容易漏。
> Python 把这个模式固化成了 `with` 语句：背后的 `__enter__` / `__exit__` 协议保证无论成败，释放逻辑都会执行。
> 本实验拆开这个协议，并对照 `@contextmanager` 的函数式写法。

## What

上下文管理器是 Python 中保证资源正确获取和释放的机制。一句话心智模型：**`with obj` = `__enter__()` 取资源 → 执行 with 块 → `__exit__()` 无论是否抛异常都被调用**。有两种实现方式：**类式**（定义 `__enter__`/`__exit__`）和**函数式**（`@contextmanager` + `yield`），功能等价——简单场景用函数式更简洁，需要维护状态的复杂场景用类式更清晰。

## Why

文件句柄、锁、数据库事务这类资源必须"谁获取谁释放"，靠手写 `try/finally` 分散在各个调用点，异常路径一漏就是句柄泄漏、锁不释放、事务悬挂。`with` 语句的核心保证是：无论代码块是否抛出异常，`__exit__` 都会被调用——"异常安全"的资源管理靠的就是这一条。

## How

```bash
cd core/02_context_manager
python3 context_manager.py     # 运行全部 demo（Timer/事务/临时文件/异常传播）
```

真实输出示例（节选）：

```
[1] Timer:
  [sort_10k] 0.0001s
  [sort_100k] 0.0011s

[2] Transaction (class-based):
  [TX:insert_user] BEGIN
  [TX:insert_user] COMMIT (2 ops)
  committed=True

  Transaction with error:
  [TX:fail] BEGIN
  [TX:fail] ROLLBACK (RuntimeError: connection lost)
  committed=False, rolled_back=True

[3] Temporary file (@contextmanager):
  [tempfile] created: .../_tmp_ctx_96528.txt
  content: Hello, context!
  file exists: True
  [tempfile] deleted: .../_tmp_ctx_96528.txt
  after with, file exists: False

[4] Benchmark (@contextmanager):
  [bench:list_comp] 0.0091s [OK]
  [bench:failing_op] 0.0094s [FAIL]
  errors captured: ['oops']

...  # [5] contextlib utilities 与 [6] Nested contexts 两段省略

[7] __exit__ return value:
  [1] swallow=True (异常被吞):
    [swallower] swallowed: ZeroDivisionError: division by zero
    code after with: reached (exception swallowed)
  [2] swallow=False (异常传播):
    ZeroDivisionError propagated (as expected)

[8] ExitStack (dynamic resources):
  ExitStack demo:
    with 块执行中（资源已全部登记）
    [cleanup] file_1.txt closed
    [cleanup] file_0.txt closed
    [cleanup] 资源 A
    [cleanup] 资源 B
    with 结束，清理回调按 LIFO 执行完毕

[9] @contextmanager is single-use:
  single-use trap demo:
    第一次 with: x=42
    第二次 with: AttributeError: '_GeneratorContextManager' object has no attribute 'args'

[10] async with (__aenter__ / __aexit__):
  async with demo:
    [async timer] enter
    [async ctx] acquire db
    [async block] using db
    [async ctx] release db
    [async timer] exit
```

诚实预期（本机实测）：

- **Timer / benchmark 的耗时数值每次运行都会波动**（受机器负载影响），量级（10k 排序 ~0.0001s、100k ~0.001s）才是关注点
- commit/rollback、临时文件删除、异常吞/传播等行为是确定性的，每次运行结果一致
- `FileLock` 只是演示类，本机没有真实的多进程文件锁竞争场景可观察
- **`[9]` 的第二次 with 报错形态随版本不同**：3.13- 为 `RuntimeError: generator didn't yield`，3.14+ 为 `AttributeError`（contextlib 内部状态已被首次 with 删除）——共同点是重用必炸

### 类式：定义 `__enter__` / `__exit__`

```python
class MyResource:
    def __enter__(self):
        return resource          # 返回值绑定到 as 后的变量

    def __exit__(self, exc_type, exc_val, exc_tb):
        # 无论是否异常都会被调用
        # return True  → 异常被吞掉
        # return False → 异常继续传播
        cleanup()
```

典型应用——`Transaction` 的自动 commit/rollback：

```python
class Transaction:
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.committed = True    # 正常 → commit
        else:
            self.rolled_back = True  # 异常 → rollback
        return True  # 事务回滚后不再传播异常
```

### 函数式：`@contextmanager` + yield

```python
@contextmanager
def my_resource():
    # __enter__ 阶段
    resource = acquire()
    try:
        yield resource  # ← 返回给 with ... as x
    finally:
        # __exit__ 阶段（无论异常与否）
        release(resource)
```

`yield` 之前相当于 `__enter__`，`yield` 的值绑定到 `as` 变量，`finally` 相当于 `__exit__`。

### 类式 vs 函数式

| 维度 | 类式 | 函数式 |
|:---|:---|:---|
| 语法 | 定义 `__enter__`/`__exit__` | `@contextmanager` + `yield` |
| 状态管理 | 用实例属性 `self.xxx` | 用闭包变量 |
| 适用场景 | 复杂状态、需要 `__exit__` 返回值控制异常 | 简单的获取/释放模式 |
| 异常控制 | `__exit__` 返回 `True/False` | 默认异常传播；把 `yield` 包进 `try/except` 可吞 |

### contextlib 现成工具

```python
with suppress(FileNotFoundError):   # 优雅地忽略特定异常
    os.remove("maybe_exists.txt")   # 等价于 try/except FileNotFoundError: pass

buf = io.StringIO()
with redirect_stdout(buf):           # 捕获 print 输出
    print("captured")
```

## Deep Dive

**执行流程**：`with obj` 展开为四步——① 调用 `obj.__enter__()`，返回值绑定到 `as` 变量；② 执行 with 块；③ 无论是否异常，调用 `obj.__exit__(exc_type, exc_val, exc_tb)`（无异常时三个参数均为 `None`）；④ `__exit__` 返回 `True` 则异常被吞，返回 `False`/`None` 则继续传播。

**最核心的一处代码**——`__exit__` 对异常的分支处理：

```python
def __exit__(self, exc_type, exc_val, exc_tb):
    if exc_type is None:             # 无异常 → 正常路径，commit
        self.committed = True
    else:                            # 有异常 → 补救路径，rollback
        self.rolled_back = True
    return True                      # 为什么 return True：回滚已完成补救，
                                     # 再向上抛只会让调用方多处理一次已知异常
```

踩坑清单：

- **`__exit__` 忘写 `return True`**：默认返回 `None` 等于不吞异常——想吞必须显式返回 `True`，这是手写实现最常见的丢分点
- **`@contextmanager` 靠 `finally` 吞不掉异常**：必须在 `yield` 处用 `try/except` 捕获；但这会隐藏 `with` 块内的 bug，实际中应谨慎使用
- **`return True` 滥用**：`__exit__` 返回 `True` 会吞掉一切异常，"代码没报错但行为不对"往往源于此
- **`@contextmanager` 生成的 CM 只能 with 一次**：生成器耗尽后第二次 with 直接报错（报错形态随版本不同，demo [9]）——需要多次进入就写类式 CM；类式的重入语义由自己决定（如 `threading.Lock` 可重复 with）

## Q&A

**Q1: with 语句和 try/finally 有什么区别？**

`with` 可近似看作 `try/finally` 的语法糖（更完整的展开还会把异常信息传给 `__exit__`，由其返回值决定是否抑制），且更语义化：

```python
f = open("file.txt")
try:
    data = f.read()
finally:
    f.close()
# 等价于 with open("file.txt") as f: data = f.read()
```

**Q2: @contextmanager 能否吞异常？**

不能直接通过 `finally` 吞，必须在 `yield` 处用 `try/except` 捕获：

```python
@contextmanager
def swallow_errors():
    try:
        yield
    except Exception:
        pass  # 吞异常
```

但这会让 `with` 块内的异常被隐藏，实际中应谨慎使用。

**Q3: 多个 with 可以嵌套吗？**

可以，Python 3.1+ 支持多行写法：`with A() as a, B() as b:` 等价于两层嵌套的 `with`。

**Q4: __exit__ 的三个参数是什么？**

`exc_type`（异常类，如 `ValueError`）、`exc_val`（异常实例）、`exc_tb`（traceback）；无异常时三者都为 `None`。

**Q5: 资源数量运行时才知道怎么办？**

用 `ExitStack`：循环里 `stack.enter_context(open(p))` 逐个入栈，条件不满足就不入栈，`stack.callback(fn)` 还能登记任意清理函数；`with` 结束时按 LIFO 统一执行。多行 `with A() as a, B() as b:` 只适合编译期已知的静态数量。
