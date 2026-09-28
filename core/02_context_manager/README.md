# 02 · 上下文管理器：with 语句背后的 `__enter__` / `__exit__` 协议

> 文件、锁、事务这类资源必须"谁获取谁释放"。手写 `try/finally` 能保证释放逻辑
> 在异常路径也执行，但每个获取资源的地方都要重复一遍模板，漏一处就是泄漏。
> Python 把这个模式固化成 `with` 语句：背后的 `__enter__` / `__exit__` 协议
> 保证无论成败，释放逻辑都会执行。本实验拆开这个协议，并对照 `@contextmanager` 的函数式写法。

## Background

这一节回答：在 `with` 出现之前，"用了资源就必须释放"这件事是怎么做的，问题出在哪。

资源指用完必须归还的东西：文件句柄（打开文件时操作系统交给程序的引用）、锁、数据库连接与事务（一组必须整体生效或整体回滚的数据库操作）。

最直接的做法是用完手动释放：`f = open(...)`，读写，然后 `f.close()`。一旦读写抛出异常，`close` 就被跳过，句柄一直占着不放。另一种省事的想法是依赖对象被回收时自动清理——但触发时机由垃圾回收决定，延迟不可控，把"必须及时"的释放交给它靠不住。

对应的防御写法是 `try/finally`：把释放逻辑放进 `finally`，保证正常、异常两条路径都会走到。这个模式正确，但每个获取资源的位置都要重复一遍模板；清理步骤一多，`finally` 层层嵌套，业务逻辑反而被淹没。

Python 2.5 依照 PEP 343 引入 `with` 语句，把"进入时获取、离开时无论成败都清理"固化成语言设施：模板部分由协议自动执行，代码里只剩下业务本身。

## What

这一节给出定义、一个执行时序的心智模型，以及两种实现方式的取舍。

上下文管理器（context manager）是 Python 中保证资源正确获取和释放的机制：实现了 `__enter__` / `__exit__` 这对双下划线方法（dunder method，解释器在特定语法下自动调用的钩子函数）的对象，配合 `with` 语句使用。

一句话心智模型：**`with obj` = `__enter__()` 取资源 → 执行 with 块 → `__exit__()` 无论是否抛异常都被调用**。

可以把 `with` 想象成银行柜台的业务流程：取号进入（`__enter__`）→ 办事（with 块）→ 无论办成办砸，离开前都要销号（`__exit__`）。但和柜台不同的是，销号这一步还能拿到"办砸"的具体信息（异常对象），并决定要不要把问题继续上报（异常是否向外传播）。

两种实现方式功能等价：

| 维度 | 类式 | 函数式 |
|:---|:---|:---|
| 语法 | 定义 `__enter__`/`__exit__` | `@contextmanager` + `yield` |
| 状态管理 | 用实例属性 `self.xxx` | 用闭包变量 |
| 适用场景 | 复杂状态、需要 `__exit__` 返回值控制异常 | 简单的获取/释放模式 |
| 异常控制 | `__exit__` 返回 `True/False` | 默认异常传播；把 `yield` 包进 `try/except` 可吞 |

简单场景用函数式更简洁，需要维护状态的复杂场景用类式更清晰。

## When to Use

这一节给判断依据：什么活儿适合交给上下文管理器，什么时候不必套它。

典型场景，都是"在做什么事的时候"：

- 打开文件、建立网络或数据库连接时——无论读写成败连接都必须关闭，`with` 是标准写法。
- 抢锁、开数据库事务时——异常路径必须回滚或放锁，否则留下悬挂事务（提交与否悬而未决）或一把永远不放的锁。
- 临时改变全局状态时——重定向标准输出、切换工作目录、临时调日志级别，用完都要恢复原样。

何时不用：代码块不获取资源、也不改变任何需要恢复的状态时，套 `with` 只是多一层间接；关闭时机需要调用方跨多个步骤精确控制时，显式管理比隐式协议更直接。

| 方案 | 与 `with` 的差异 | 什么时候选它 |
|:---|:---|:---|
| 手写 `try/finally` | 逻辑等价，但每个调用点重复模板 | 单个调用点、不想引入协议对象时 |
| 显式 `close()` | 直白，但异常路径容易漏 | 一次性脚本、流程简单可控时 |
| `__del__` 析构器（对象被垃圾回收时调用） | 释放时机由垃圾回收决定，不确定 | 不适合必须及时释放的资源 |

## Quick Start

这一节把 demo 跑起来，给出类式实现的最小骨架。前置条件：只用标准库。

### 运行与真实输出

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

### 类式最小骨架

这段在做什么：进入 `with` 块前，`__enter__` 被自动调用、返回值绑定到 `as` 后的变量；块结束时，`__exit__` 无论成败都被自动调用，负责清理。

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

标准库里现成的 `suppress` / `redirect_stdout`、函数式 `@contextmanager` 的写法、`with` 的四步执行流程与 `ExitStack` 的机制拆解，见 How It Works。

## How It Works

这一节按执行顺序拆机制，并与 Quick Start 输出里的现象互相印证。

### with 的四步展开

`with obj` 被解释器展开为四步：

- ① 调用 `obj.__enter__()`，返回值绑定到 `as` 变量；
- ② 执行 with 块；
- ③ 无论是否异常，调用 `obj.__exit__(exc_type, exc_val, exc_tb)`——三个参数分别是异常类（如 `ValueError`）、异常实例、traceback 对象，无异常时三者均为 `None`；
- ④ `__exit__` 返回 `True` 则异常被吞，返回 `False`/`None` 则继续传播。

第④步是刻意的设计：抑制异常的代价很高（会掩盖 with 块里的 bug），所以把决定权做成显式返回值，而不是默认行为。

输出 [7] 的 `swallow=True` 与 `swallow=False` 两条分支，正是这一步的直接效果——`return True` 时 with 块后面的代码继续执行，`return False` 时异常正常向外抛。

### Transaction：`__exit__` 的异常分支

最核心的一处代码——事务类在 `__exit__` 里按有无异常分流：

```python
def __exit__(self, exc_type, exc_val, exc_tb):
    if exc_type is None:             # 无异常 → 正常路径，commit
        self.committed = True
    else:                            # 有异常 → 补救路径，rollback
        self.rolled_back = True
    return True                      # 为什么 return True：回滚已完成补救，
                                     # 再向上抛只会让调用方多处理一次已知异常
```

输出 [2] 里 `[TX:fail] ROLLBACK (RuntimeError: connection lost)`、`rolled_back=True` 走的正是 `exc_type` 非 `None` 的补救分支；正常路径则打出 `[TX:insert_user] COMMIT`。

### 函数式：yield 一分为二

`@contextmanager` 把一个生成器函数（带 `yield` 的函数，执行到 `yield` 暂停、被再次驱动时从暂停处恢复）包装成上下文管理器：

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

输出 [3] 的临时文件先 `created` 后 `deleted`、结束后 `file exists: False`，分别对应 `yield` 之前的创建和 `finally` 里的删除——一个函数被 `yield` 切成了进出两半。

### ExitStack：运行时才知道有多少资源

资源数量在编码时不确定时，用 `ExitStack`——`contextlib` 提供的资源栈：循环里 `stack.enter_context(open(p))` 逐个入栈，条件不满足就不入栈，`stack.callback(fn)` 还能登记任意清理函数。

`with` 结束时按 LIFO（后进先出，最后登记的先清理）统一执行：输出 [8] 里 `file_1.txt` 先于 `file_0.txt` 关闭，就是逆序清理的直接体现。

多层 `with` 嵌套同理：内层先退出、外层后退出。多行写法 `with A() as a, B() as b:` 同样只适合编码期已知的静态数量。

### contextlib：标准库里的现成上下文管理器

`contextlib` 提供了一批开箱即用的上下文管理器，最常用的是 `suppress`（只吞掉指定异常）与 `redirect_stdout`（捕获 print 输出）：

```python
with suppress(FileNotFoundError):   # 只忽略指定异常
    os.remove("maybe_exists.txt")   # 等价于 try/except FileNotFoundError: pass

buf = io.StringIO()
with redirect_stdout(buf):           # 捕获 print 输出
    print("captured")
```

## Pitfalls & Q&A

这一节先列四个常见踩坑（现象、原因、解法），再留两个有增量的问题。"`@contextmanager` 能否吞异常"这一问已并入下面第二条踩坑。

踩坑清单：

- **`__exit__` 忘写 `return True`**。现象：清理逻辑执行了，with 块里抛出的异常却仍然向上传播。原因：函数默认返回 `None`，等于不吞异常——想吞必须显式返回 `True`，这是手写实现最常见的失误点。解法：确认抑制语义后显式 `return True`。
- **`@contextmanager` 靠 `finally` 吞不掉异常**。现象：函数式实现里写了 `finally`，异常照样传播出去。原因：`finally` 只保证执行、并不捕获异常。解法：在 `yield` 处包 `try/except` 才能吞掉；但这会隐藏 with 块内的 bug，实际中应谨慎使用。
- **`return True` 滥用**。现象："代码没报错但行为不对"。原因：`__exit__` 返回 `True` 会吞掉一切异常，bug 被静默掩盖。解法：只在该抑制异常的上下文管理器里返回 `True`，通用清理类实现保持默认传播。
- **`@contextmanager` 生成的上下文管理器只能 with 一次**。现象：同一个对象第二次 with 直接报错（报错形态随版本不同，见诚实预期与输出 [9]）。原因：生成器耗尽后无法再次驱动。解法：需要多次进入就写类式；类式的重入语义由自己决定（如 `threading.Lock` 可重复 with）。

深入问答：

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

**Q2: 多个 with 可以嵌套吗？**

可以，Python 3.1+ 支持多行写法：`with A() as a, B() as b:` 等价于两层嵌套的 `with`；资源数量要到运行时才确定的场景，用 How It Works 里的 `ExitStack`。

**Q3: 异步代码里怎么用？**

协议换成 `__aenter__` / `__aexit__`，语法是 `async with`：进入与清理都成为可等待的异步操作，暂停/恢复由事件循环驱动。输出 [10] 的 `acquire db → release db` 序列就是异步版本在进入与退出时的两次钩子调用。
