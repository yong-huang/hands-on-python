# 15 · `*args` / `**kwargs`：解包与参数传递

> 调用方要传几个参数、传位置还是传关键字，函数定义时往往无法预知——
> `*args` / `**kwargs`（收集多余参数的两个写法）为此而生。读完本篇，你能
> 分清 `*` 和 `**` 在定义、调用、赋值、合并四种场景的用途，并掌握参数
> 顺序规则。

## Background

这节先看问题域。函数参数最基本的写法是个数固定、位置对应：`def add(a, b,
c)` 只接受三个位置参数（按顺序与形参一一对应的实参），多一个少一个都报
`TypeError`。

想支持"不限个数"或"可选配置"，过去的做法很笨重：给每种可能都预留带默认
值的参数，参数一多签名爆炸；或让调用方把东西塞进一个 dict 手工约定，失去
语法检查，拼错键名只有运行时才知道。

转发场景更麻烦——包装函数要把参数原样传给内部函数，只能逐个罗列形参；
内部函数一改签名，包装层就漏传。

Python 的应对是把"收集"与"解包"做成一对语法：定义侧用 `*args`/`**kwargs`
把多余参数收进来，调用侧用 `*`/`**` 把序列、映射摊开传出去。二者互为
对偶，配合起来就能写出对签名"无感"的转发代码。

## What

本节给出定义与心智模型。`*args` 在函数定义时把多余的**位置参数**收进一个
tuple，`**kwargs` 把多余的**关键字参数**（以 `name=value` 形式传入的实参）
收进一个 dict。

一句话心智模型：**定义侧收集（pack），调用侧解包（unpack），二者是对偶
操作**。`*` 和 `**` 两个运算符共四种用途：函数定义时收集参数、函数调用时
解包参数、字面量解包赋值、字典合并。

可以把定义侧想象成前台签收：不管来多少件，没写名字的归进一个包裹
（tuple），写了名字的归进另一堆（dict）；调用侧则反过来，把两堆原样摊开
寄出。但和真实签收不同的是：解包有类型约束——`*` 只解包序列
（list/tuple），`**` 只解包映射（dict），给错了直接 `TypeError`。

## When to Use

这节给判断力：在做什么事的时候用收集与解包，什么时候坚持显式参数。

- **透明参数转发**（调用方无感知的转发）：给现有函数包一层日志、重试、
  计时时——写装饰器（`@xxx` 语法里给函数包一层行为的机制）的标配，包装
  代码不关心内部函数的签名，收下什么转发什么
- **设计灵活的 API 签名**：接受不限个数的输入或可选配置（如日志函数的
  任意标签与元数据）；用分隔符强制关键字参数，让调用点可读
- **数据处理**：赋值语句里取"其余部分"（`first, *rest = ...`），或合并
  字典（`{**d1, **d2}`）

何时不用：参数个数与含义固定时，显式声明参数更好——签名即文档，IDE 提示
与静态检查都依赖它；用 `**kwargs` 传"其实已知"的参数，等于把签名藏进
运行时。

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| 固定参数 + 默认值 | 个数固定，可选值有兜底 | 参数含义明确且有限 |
| `*args` | 收集多余位置参数为 tuple | 不限个数的同类输入 |
| `**kwargs` | 收集多余关键字参数为 dict | 不限个数的配置选项 |
| 单独 `*` | 强制其后参数用关键字传入 | 要求调用点可读的 API |
| `/` | 强制其前参数只能位置传入 | 参数名无意义或防重命名破坏调用方 |

## Quick Start

### 运行与真实输出

前置条件：Python 3.8+（`/` 语法 3.8 引入）。运行 demo：

```bash
cd core/15_args_kwargs
python3 args_kwargs.py        # 运行收集/解包/分隔符/实用模式 demo
```

真实输出示例：

```
[1] Collecting parameters:
  args:   (1, 2, 3)  (type: tuple)
  kwargs: {'x': 10, 'y': 20}  (type: dict)
  a=1, b=2, args=(3, 4), key=custom, kwargs={'z': 99}

[2] Unpacking at call site:
  add(*[1, 2, 3]) = 6
  greet(**{'name': 'Alice', 'age': 30, 'city': 'Shanghai'}) = Alice, 30, from Shanghai

[3] Mixed: *args + explicit + **kwargs:
  args:   (1, 3, 4)  (type: tuple)
  kwargs: {'x': 10, 'y': 20, 'z': 30}  (type: dict)

[4] Keyword-only (* separator):
  kw_only(1, 2, c=3, d=4): a=1, b=2, c=3, d=4
  kw_only(1, 2, 3, 4): TypeError: kw_only() takes 2 positional arguments but 4 were given

[5] Position-only (/ separator):
  pos_only(1, 2, 3, 4, e=5): a=1, b=2, c=3, d=4, e=5
  pos_only(a=1, b=2, ...): TypeError: pos_only() got some positional-only arguments passed as keyword arguments: 'a, b'

[6] Practical patterns:
  log: [ERROR] disk full | tags: server, storage | meta: host=node1, pid=1234
  calling add((1, 2, 3), {})
  wrapper: 6
  calling greet((), {'name': 'Alice', 'age': 30, 'city': 'Shanghai'})
  wrapper: Alice, 30, from Shanghai

[7] Literal unpacking:
  first, *rest = [1,2,3,4,5] -> first=1, rest=[2, 3, 4, 5]
  *init, last = [1,2,3,4,5] -> init=[1, 2, 3, 4], last=5
  head, *mid, tail -> head=1, mid=[2, 3, 4], tail=5

[8] Dict merging (** unpacking):
  {**d1, **d2} = {'a': 1, 'b': 99, 'c': 3}  (d2.b overrides d1.b)
```

诚实预期：

- demo 输出是**确定性的**，每次运行完全一致
- TypeError 的报错文案自 3.8（`/` 语法引入）起保持一致；唯一的版本差异是 3.10 起报错里的函数名改用限定名（qualname），只影响嵌套函数/方法的显示，本 demo 的模块级函数在 3.8~3.13 输出相同
- `dict` 的打印顺序在 Python 3.7+ 保持插入序，本 demo 的输出依赖此保证

### 代码走读

demo 由八个环节组成，对应输出的 `[1]`–`[8]`。

`[1]` 收集参数——这段在做什么：定义侧 `*args`/`**kwargs` 把多余的位置与
关键字参数分别收进 tuple 和 dict。

```python
def variadic(*args, **kwargs):
    print(args)     # (1, 2, 3)  — tuple
    print(kwargs)   # {'x': 10, 'y': 20}  — dict

variadic(1, 2, 3, x=10, y=20)
```

`args`/`kwargs` 只是约定俗成的变量名，写成 `*values` 或 `**options` 完全
合法。

参数顺序规则——五种参数在签名里的固定次序：

```
def f(pos_only, /, pos_or_kw, *args, kw_only, **kwargs):
```

| 位置 | 参数类型 | 说明 |
|:---|:---|:---|
| `/` 之前 | 仅位置参数 | 不能用关键字传入 |
| `/` 到 `*` | 位置或关键字 | 最普通的参数 |
| `*` | `*args` | 收集多余位置参数为 tuple |
| `*` 之后 | 仅关键字参数 | 必须用关键字传入 |
| `**` | `**kwargs` | 收集多余关键字参数为 dict |

完整装配示例——这段在做什么：固定参数、`*args`、带默认值的关键字参数、
`**kwargs` 共存于一个签名：

```python
def with_defaults(a, b, *args, key="default", **kwargs):
    print(f"a={a}, b={b}, args={args}, key={key}, kwargs={kwargs}")

with_defaults(1, 2, 3, 4, key="custom", z=99)
# a=1, b=2, args=(3, 4), key=custom, kwargs={'z': 99}
```

调用侧解包、分隔符、透明转发与字面量合并，在 How It Works 逐个展开。

## How It Works

这节解释调用侧的解包、两个分隔符的机制，并把输出 `[2]`–`[8]` 的现象对应
到实现上。

### 调用侧解包：`*` 与 `**`

这段在做什么：调用时把序列、映射摊开成一个个独立参数，对偶于定义侧的
收集。

```python
nums = [1, 2, 3]
add(*nums)            # 等价于 add(1, 2, 3)

info = {"name": "Alice", "age": 30, "city": "Shanghai"}
greet(**info)         # 等价于 greet(name="Alice", age=30, city="Shanghai")
```

`*` 解包序列（list/tuple），`**` 解包映射（dict）。对照输出 `[2]`：
`add(*[1, 2, 3])` 得 6，`greet(**info)` 得完整问候语。

### 分隔符：单独的 `*` 与 `/`

这段在做什么：用分隔符声明"哪些参数只能按哪种方式传"。

```python
def kw_only(a, b, *, c, d): ...
kw_only(1, 2, c=3, d=4)   # 正确；kw_only(1, 2, 3, 4) → TypeError

def pos_only(a, b, /, c, d, *, e): ...
pos_only(1, 2, 3, 4, e=5)       # 正确；pos_only(a=1, ...) → TypeError
```

单独的 `*` 强制其后参数用关键字传入——API 设计的重要工具，能强制调用方
写出可读的调用，仅关键字参数自 Python 3.0 起支持。

`/`（Python 3.8+）之前的参数只能位置传入，用于参数名无意义的场景（如
`range(start, /, stop)`）或防止未来重命名破坏调用方。两者可同时使用：
`def f(a, /, b, *, c)`——`a` 仅位置，`b` 两者皆可，`c` 仅关键字。

对照输出 `[4]`/`[5]`：违反规则的两次调用分别得到位置个数与参数名的
`TypeError`。

### 透明参数转发：收集 + 解包的组合

最能体现"收集 + 转发"的构造——装饰器写法的标配（见 lab 01 的三层嵌套
装饰器）：

```python
def wrapper(func, *args, **kwargs):
    # 定义侧：不管调用方给什么都先收下（位置进 args，关键字进 kwargs）
    return func(*args, **kwargs)   # 调用侧：原样解包转发，一个不丢
```

定义侧不关心签名、来者不拒；调用侧原样摊开，一个不丢。对照输出 `[6]`：
wrapper 先打印收到的参数，转发后的返回值与直接调用完全一致。

### 字面量解包与字典合并

这段在做什么：`*` 用于赋值语句取"其余部分"；`**` 在字典字面量里做合并。

```python
first, *rest = [1, 2, 3, 4, 5]    # first=1, rest=[2, 3, 4, 5]
d1 = {"a": 1, "b": 2}
d2 = {"c": 3, "b": 99}
merged = {**d1, **d2}  # {'a': 1, 'b': 99, 'c': 3}  — d2 的 b 覆盖 d1 的 b
```

对照输出 `[7]`：`first, *rest`、`*init, last`、`head, *mid, tail` 三种切法
各自取到头、尾与中间；`[8]` 里 `d2` 的 `b: 99` 覆盖 `d1` 的 `b: 2`。

## Pitfalls & Q&A

这节汇总两个经典坑。共同根源：`*`/`**` 的行为由顺序（签名里的位置）和
类型（序列/映射）决定，记错任何一边就报错。

**坑 1：参数顺序写反直接 `SyntaxError`。**
现象：定义函数时还没调用就报 `SyntaxError`。
原因：五种参数的次序固定——仅位置 → 位置或关键字 → `*args` → 仅关键字 →
`**kwargs`。

解法：按 Quick Start 的顺序规则表排列签名。

**坑 2：字典合并是"后者覆盖前者"。**
现象：`{**d1, **d2}` 里 `d1` 的同名键值丢了。
原因：键冲突时，后展开的字典覆盖先展开的。

解法：把要优先生效的字典放在后面（输出 `[8]` 即此例），键冲突是否允许
在设计时就明确。

**Q：`*args` 和 `**kwargs` 的区别？**

一句话：`*args` 面向**位置**——定义时收成 tuple、调用时解包序列；
`**kwargs` 面向**关键字**——定义时收成 dict、调用时解包映射。`/` 与 `*`
分隔符的方向之别见 How It Works 的分隔符一节。
