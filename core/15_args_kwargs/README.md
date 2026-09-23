# 15 · `*args` / `**kwargs`：解包与参数传递

> 函数调用场景有个经典难题：调用方要传几个参数、传位置还是传关键字，
> 函数定义时往往无法预知——`*args` / `**kwargs` 就是为此而生。
> 本实验拆开 `*` 和 `**` 的四种用途，理顺参数顺序规则。

## What

`*args` 和 `**kwargs` 表面看是"可变参数"语法糖，背后是 `*` 和 `**` 运算符的四种用途：函数定义时收集参数、函数调用时解包参数、字面量解包赋值、字典合并。一句话心智模型：**定义侧收集（pack），调用侧解包（unpack），二者是对偶操作**。不弄清它们会怎样：装饰器写不出透明的参数转发，API 无法接受可选配置，参数顺序规则（pos-only / pos-or-keyword / *args / keyword-only / **kwargs）记不住就常撞 `SyntaxError` / `TypeError`。

## Why

掌握 `*` / `**` 的核心在于理解**参数顺序规则**和**打包/解包的对偶关系**。这也是实现透明参数转发（装饰器的标配）、设计灵活 API 签名（强制关键字、仅位置参数）的基础——参数顺序规则违反时直接 `SyntaxError`，靠试错记忆成本很高。

## How

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

诚实预期（本机实测）：

- demo 输出是**确定性的**，每次运行完全一致
- TypeError 的报错文案自 3.8（`/` 语法引入）起保持一致；唯一的版本差异是 3.10 起报错里的函数名改用限定名（qualname），只影响嵌套函数/方法的显示，本 demo 的模块级函数在 3.8~3.13 输出相同
- `dict` 的打印顺序在 Python 3.7+ 保持插入序，本 demo 的输出依赖此保证

### 收集参数（定义侧 pack）

```python
def variadic(*args, **kwargs):
    print(args)     # (1, 2, 3)  — tuple
    print(kwargs)   # {'x': 10, 'y': 20}  — dict

variadic(1, 2, 3, x=10, y=20)
```

`args`/`kwargs` 只是约定俗成的变量名，写成 `*values` 或 `**options` 完全合法。

### 参数顺序规则

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

完整装配示例：

```python
def with_defaults(a, b, *args, key="default", **kwargs):
    print(f"a={a}, b={b}, args={args}, key={key}, kwargs={kwargs}")

with_defaults(1, 2, 3, 4, key="custom", z=99)
# a=1, b=2, args=(3, 4), key=custom, kwargs={'z': 99}
```

### 解包参数（调用侧 unpack）

```python
nums = [1, 2, 3]
add(*nums)            # 等价于 add(1, 2, 3)

info = {"name": "Alice", "age": 30, "city": "Shanghai"}
greet(**info)         # 等价于 greet(name="Alice", age=30, city="Shanghai")
```

### 强制关键字（`*`）与仅位置（`/`）分隔符

```python
def kw_only(a, b, *, c, d): ...
kw_only(1, 2, c=3, d=4)   # 正确；kw_only(1, 2, 3, 4) → TypeError

def pos_only(a, b, /, c, d, *, e): ...
pos_only(1, 2, 3, 4, e=5)       # 正确；pos_only(a=1, ...) → TypeError
```

单独的 `*` 强制其后参数用关键字传入——API 设计的重要工具，能强制调用方写出可读的调用；`/`（Python 3.8+）之前参数只能位置传入，用于参数名无意义的场景（如 `range(start, /, stop)`）或防止未来重命名破坏调用方。

### 字面量解包与字典合并

```python
first, *rest = [1, 2, 3, 4, 5]    # first=1, rest=[2, 3, 4, 5]
d1 = {"a": 1, "b": 2}
d2 = {"c": 3, "b": 99}
merged = {**d1, **d2}  # {'a': 1, 'b': 99, 'c': 3}  — d2 的 b 覆盖 d1 的 b
```

## Deep Dive

**最能体现"收集 + 转发"的构造**——透明参数转发，装饰器写法的标配（lab 01 的三层嵌套里就有它）：

```python
def wrapper(func, *args, **kwargs):
    # 定义侧：不管调用方给什么都先收下（位置进 args，关键字进 kwargs）
    return func(*args, **kwargs)   # 调用侧：原样解包转发，一个不丢
```

踩坑清单：

- **参数顺序写反直接 `SyntaxError`**：顺序必须为 仅位置 → 位置或关键字 → `*args` → 仅关键字 → `**kwargs`
- **字典合并是"后者覆盖前者"**：`{**d1, **d2}` 中 d2 的 `b: 99` 覆盖 d1 的 `b: 2`，键冲突时留意顺序

## Q&A

**Q1: `*args` 和 `**kwargs` 的区别？**

| 维度 | *args | **kwargs |
|:---|:---|:---|
| 定义时 | 收集多余**位置**参数 → tuple | 收集多余**关键字**参数 → dict |
| 调用时 | 解包**序列**（list/tuple） | 解包**映射**（dict） |
| 类型 | 元组 | 字典 |
| 典型场景 | 不限个数的数值参数 | 不限个数的配置选项 |

**Q2: `/` 和 `*` 分隔符的区别？**

| 分隔符 | 作用 | Python 版本 |
|:---|:---|:---|
| `/` | 左侧参数**只能**位置传入 | 3.8+ |
| `*` | 右侧参数**只能**关键字传入 | 3.0+ |

两者可以同时使用：`def f(a, /, b, *, c)`，其中 `a` 仅位置，`b` 两者皆可，`c` 仅关键字。
