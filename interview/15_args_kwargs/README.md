# 15 · `*args` / `**kwargs`：解包与参数传递

> 上一实验分清了 `=` / `copy` / `deepcopy`，解决的是"数据怎么复制"的坑。
> 换到函数调用的场景，坑换了个样子：调用方要传几个参数、传位置还是传关键字，
> 函数定义时往往无法预知——`*args` / `**kwargs` 就是为此而生。
> 本实验拆开 `*` 和 `**` 的四种用途，理顺参数顺序规则。

## 1. 为什么需要它

`*args` 和 `**kwargs` 是 Python 面试中出现频率极高的语法考点。它们表面上看只是"可变参数"的语法糖，但背后涉及 Python 中 `*` 和 `**` 运算符的四种用途：函数定义时收集参数、函数调用时解包参数、字面量解包赋值、以及字典合并。不弄清它们会怎样：装饰器写不出透明的参数转发，API 无法接受可选配置，参数顺序规则（pos-only / pos-or-keyword / *args / keyword-only / **kwargs）记不住就常撞 `SyntaxError` / `TypeError`。掌握的核心在于理解**参数顺序规则**和**打包/解包的对偶关系**——定义时打包（pack），调用时解包（unpack）。

## 2. 总览：核心机制一图看懂

![\*args / \*\*kwargs：调用侧解包，定义侧收集](images/args_kwargs.archify.svg)

一句话心智模型：**定义侧收集（pack），调用侧解包（unpack），二者是对偶操作**。看图时从调用侧往定义侧追：`f(*seq, **mapping)` 先把序列/映射展开为实参 → 进入函数体形参按顺序绑定 → 定义侧把剩余位置/关键字参数收集进 `*args` 元组与 `**kwargs` 字典；多传/少传/重名 → `TypeError`。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/interview/15_args_kwargs/images/args_kwargs.archify.html)
> （或本地打开 [`images/args_kwargs.archify.html`](images/args_kwargs.archify.html)）。

## 3. 快速开始

```bash
cd interview/15_args_kwargs
python3 args_kwargs.py        # 运行收集/解包/分隔符/实用模式 demo
```

真实输出示例（macOS, CPython 3.10）：

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

## 4. 核心概念

### 4.1 收集参数（Pack）

在函数**定义**中，`*` 将多余的位置参数打包为 tuple，`**` 将多余的关键字参数打包为 dict：

```python
def variadic(*args, **kwargs):
    print(args)    # (1, 2, 3)  — tuple
    print(kwargs)   # {'x': 10, 'y': 20}  — dict

variadic(1, 2, 3, x=10, y=20)
```

**命名约定**：`args` 是 arguments 的缩写，`kwargs` 是 keyword arguments 的缩写。它们只是变量名，写成 `*values` 或 `**options` 完全合法。

### 4.2 参数顺序规则

Python 函数参数有严格的顺序约束，从左到右依次为：

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

代码中 `with_defaults` 展示了完整的参数顺序：

```python
def with_defaults(a, b, *args, key="default", **kwargs):
    print(f"a={a}, b={b}, args={args}, key={key}, kwargs={kwargs}")

with_defaults(1, 2, 3, 4, key="custom", z=99)
# a=1, b=2, args=(3, 4), key=custom, kwargs={'z': 99}
```

### 4.3 解包参数（Unpack）

在函数**调用**中，`*` 将列表/元组展开为位置参数，`**` 将字典展开为关键字参数：

```python
nums = [1, 2, 3]
add(*nums)            # 等价于 add(1, 2, 3)  → 6

info = {"name": "Alice", "age": 30, "city": "Shanghai"}
greet(**info)         # 等价于 greet(name="Alice", age=30, city="Shanghai")
```

**打包与解包是对偶操作**：定义时 pack，调用时 unpack，来回转换不丢失信息。

### 4.4 强制关键字参数（`*` 分隔符）

单独的 `*` 在参数列表中充当分隔符——它后面所有参数都必须通过关键字传入：

```python
def kw_only(a, b, *, c, d):
    return f"a={a}, b={b}, c={c}, d={d}"

kw_only(1, 2, c=3, d=4)   # 正确
kw_only(1, 2, 3, 4)       # TypeError: kw_only() takes 2 positional arguments but 4 were given
```

这是 API 设计的重要工具，能强制调用方写出可读的关键字参数。

### 4.5 仅位置参数（`/` 分隔符，Python 3.8+）

`/` 之前的参数只能通过位置传入，不能用关键字。常用于：
- 参数名无意义（如 `def range(start, /, stop)`）
- 防止未来重命名时破坏调用方

```python
def pos_only(a, b, /, c, d, *, e):
    ...

pos_only(1, 2, 3, 4, e=5)       # 正确
pos_only(a=1, b=2, c=3, d=4, e=5)  # TypeError: pos_only() got some positional-only arguments passed as keyword arguments
```

### 4.6 字面量解包与字典合并

`*` 不仅用于函数参数，还可以在赋值语句中解包序列：

```python
first, *rest = [1, 2, 3, 4, 5]    # first=1, rest=[2, 3, 4, 5]
*init, last = [1, 2, 3, 4, 5]     # init=[1, 2, 3, 4], last=5
head, *mid, tail = [1, 2, 3, 4, 5] # head=1, mid=[2, 3, 4], tail=5
```

`**` 可以在字面量中合并字典（Python 3.5+）：

```python
d1 = {"a": 1, "b": 2}
d2 = {"c": 3, "b": 99}
merged = {**d1, **d2}  # {'a': 1, 'b': 99, 'c': 3}  — d2 的 b 覆盖 d1 的 b
```

## 5. 关键代码解析

最能体现"收集 + 转发"的一个构造是透明参数转发：

```python
def wrapper(func, *args, **kwargs):
    # 定义侧：不管调用方给什么都先收下（位置进 args，关键字进 kwargs）
    return func(*args, **kwargs)   # 调用侧：原样解包转发，一个不丢
```

这是装饰器写法的标配模式（实验 01 的三层嵌套里就有它）。展开看顺序规则的装配：

```python
def with_defaults(a, b, *args, key="default", **kwargs):
    # a, b 普通参数 → *args 收集多余位置 → key 仅关键字（带默认值）→ **kwargs 兜底
    ...

with_defaults(1, 2, 3, 4, key="custom", z=99)
# a=1, b=2, args=(3, 4), key=custom, kwargs={'z': 99}
```

坑清单：

- **参数顺序写反直接 `SyntaxError`**：顺序必须为 仅位置 → 位置或关键字 → `*args` → 仅关键字 → `**kwargs`
- **kw-only 参数按位置传**：`kw_only(1, 2, 3, 4)` → `TypeError: takes 2 positional arguments but 4 were given`
- **pos-only 参数按关键字传**：`pos_only(a=1, ...)` → `TypeError: got some positional-only arguments passed as keyword arguments: 'a, b'`
- **字典合并是"后者覆盖前者"**：`{**d1, **d2}` 中 d2 的 `b: 99` 覆盖 d1 的 `b: 2`，键冲突时留意顺序

## 6. 文件结构

```
15_args_kwargs/
├── README.md                      # 本教程文档
├── args_kwargs.py                 # 主演示脚本：收集/解包/分隔符/实用模式
└── images/
    ├── args_kwargs.archify.json   # 图源（typed JSON IR，可编辑重渲染）
    ├── args_kwargs.archify.html   # 交互示意图（浏览器打开）
    └── args_kwargs.archify.svg    # 双主题矢量图（本 README §2 内嵌）
```

`args_kwargs.py` 内容：`1. variadic()` 收集参数 / `2. with_defaults()` 参数顺序规则 / `3. add() / greet()` 解包调用 / `4. kw_only()` 强制关键字 / `5. pos_only()` 仅位置参数 / `6. log() / wrapper()` 实用模式 / `7. 字面量解包 & 字典合并` / `8. run_demo()` 8 组交互演示。

## 7. 面试要点

**Q1: `*args` 和 `**kwargs` 的区别？**

| 维度 | *args | **kwargs |
|:---|:---|:---|
| 定义时 | 收集多余**位置**参数 → tuple | 收集多余**关键字**参数 → dict |
| 调用时 | 解包**序列**（list/tuple） | 解包**映射**（dict） |
| 类型 | 元组 | 字典 |
| 典型场景 | 不限个数的数值参数 | 不限个数的配置选项 |

**Q2: 函数参数的正确顺序？**

```
def f(a, b, /, c, d, *args, key=val, **kwargs)
```

顺序为：仅位置 → 位置或关键字 → *args → 仅关键字（默认值可有可无）→ **kwargs。违反顺序会直接 `SyntaxError`。

**Q3: `*` 和 `**` 还有哪些用法？**

除了函数参数，还有两种场景：

1. **字面量解包**（Python 3.0+）：`first, *rest = [1, 2, 3]`
2. **字典合并**（Python 3.5+）：`{**d1, **d2}`，后出现的键覆盖前面的

**Q4: 如何实现透明的参数转发？**

```python
def wrapper(func, *args, **kwargs):
    return func(*args, **kwargs)
```

定义时用 `*args, **kwargs` 收集所有参数，调用时用 `func(*args, **kwargs)` 解包转发。这是装饰器写法的标配模式。

**Q5: `/` 和 `*` 分隔符的区别？**

| 分隔符 | 作用 | Python 版本 |
|:---|:---|:---|
| `/` | 左侧参数**只能**位置传入 | 3.8+ |
| `*` | 右侧参数**只能**关键字传入 | 3.0+ |

两者可以同时使用：`def f(a, /, b, *, c)`，其中 `a` 仅位置，`b` 两者皆可，`c` 仅关键字。

## 8. 总结

1. **`*args` 收集位置参数为 tuple，`**kwargs` 收集关键字参数为 dict**
2. **参数有严格顺序：pos-only → pos-or-kw → *args → kw-only → **kwargs**
3. **打包与解包是对偶操作**，定义时 pack，调用时 unpack
4. **`*` 分隔符强制关键字参数，`/` 分隔符强制位置参数**，是 API 设计的重要工具
5. **`*` 还可用于字面量解包和字典合并**，不局限于函数参数
6. **透明参数转发 `(*args, **kwargs)` 是装饰器的标准模式**

下一篇进入 [16_gc_weakref](../16_gc_weakref/README.md)：看垃圾回收与弱引用如何管理对象生命周期。
