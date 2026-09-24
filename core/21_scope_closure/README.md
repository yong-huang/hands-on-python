# 21 · 作用域与闭包：LEGB、cell 与迟绑定

> 装饰器实验里 `ttl_cache` 的 `store`、`make_counter` 的计数器都"活过了函数返回"——
> 靠的正是闭包。但闭包的两半知识经常缺一半：只知道"内层函数能用外层变量"，
> 不知道名字是按 **LEGB** 顺序就近遮蔽的；只知道闭包"记住了值"，
> 不知道它记住的是**变量**——循环里造闭包的经典 bug 由此而生。本实验把机制钉死。

## What

**作用域**决定一个名字在某处指向谁：Python 按 **LEGB** 顺序查找——Local（函数内）→ Enclosing（外层函数）→ Global（模块级）→ Built-in（内建），同名就近遮蔽。**闭包**是"内层函数 + 它引用的外层变量（自由变量）"的打包对象：外层函数返回后，自由变量活在 `__closure__` 的 cell 里，内层函数每次调用都能读写它。

## Why

装饰器（lab 01）、回调、偏函数全部建立在闭包上——闭包机制不清，装饰器的 `store` 为什么能跨调用存活、`nonlocal` 为什么必须写，就只能靠背。两个高频事故也源于此：循环里造闭包全部读到同一个值（迟绑定）；`counter += 1` 在内层函数里直接 `UnboundLocalError`（Python 把赋值目标当成了局部变量）。

## How

```bash
cd core/21_scope_closure
python3 scope_closure.py    # 完整演示（4 个小节，内置断言）
```

真实输出：

```
=== 作用域与闭包 ===

[1] LEGB 就近遮蔽:
  inner() 读到 local 层的 'local'；外层自己的 value 不受影响: 'enclosing'
  删掉 inner 里的赋值后才会读到 enclosing/global——同名就近遮蔽

[2] 闭包与 cell:
  counter() → 1，counter() → 2（状态留在 cell 里）
  __closure__ = (<cell at 0x102bc6a40: int object at 0x103726338>,)  cell_contents=2

[3] 迟绑定陷阱与修复:
  [lambda: i for i in range(3)] 依次调用 → [2, 2, 2]（全是循环结束后的 i）
  [lambda i=i: i ...] 默认参数快照   → [0, 1, 2]

[4] nonlocal vs global:
  with_global() → 1（写在模块级 total_global 上，人人可见）
  两个闭包计数器互不干扰: A=2，B=1
  字节码佐证: counter 的存储指令是 ['STORE_DEREF']（STORE_DEREF = 写 cell，闭包变量的家）
```

诚实预期：

- demo 全部输出**确定性**，任何 CPython 3.x 一致（`__closure__` 里的对象地址每次运行不同）
- `[3]` 的 `[2, 2, 2]` 是"迟绑定"本身——lambda 的函数体在**调用时**才读 `i`，而循环结束后 `i` 是 2

### LEGB：就近遮蔽

```python
value = "global"

def legb_demo():
    value = "enclosing"

    def inner():
        value = "local"     # 就近遮蔽：这行删掉，才会读到 enclosing 层
        return value

    return inner(), value
```

赋值即声明局部名——内层函数里写 `value = ...` 不会改外层的 `value`，而是新建一个局部名字。要改外层变量必须显式声明（见下）。

### nonlocal：改 Enclosing 层的变量

```python
def make_counter():
    count = 0

    def counter():
        nonlocal count     # 不写这行，count += 1 视 count 为 counter 的局部变量
        count += 1         # → UnboundLocalError（读的时候还没有值）
        return count
    return counter
```

`global` 则指向模块级——跨函数人人共享同一个名字；`nonlocal` 只向上找一层层的函数作用域，不碰模块级。

### 循环里造闭包：迟绑定

```python
fns = [lambda: i for i in range(3)]
[f() for f in fns]         # [2, 2, 2] —— 三个 lambda 共享同一个 i

fns = [lambda i=i: i for i in range(3)]
[f() for f in fns]         # [0, 1, 2] —— 默认参数在定义时求值，等于快照
```

闭包记住的是**变量本身**，不是它当时的值。修复方式除默认参数快照外，还有 `functools.partial(f, i)` 固定实参。

## Deep Dive

**最核心的证据——闭包变量住在 cell 对象里：**

```python
def make_counter():
    count = 0
    def counter():
        nonlocal count
        count += 1
        return count
    return counter

counter = make_counter()
counter.__closure__            # (<cell ...: int object ...>,)
dis.get_instructions(counter)  # 存储指令是 STORE_DEREF（写 cell），不是 STORE_FAST
```

普通局部变量的存储指令是 `STORE_FAST`（读写栈帧上的槽位，函数返回即销毁）；被内层捕获的变量升级为 cell，指令变 `STORE_DEREF`——这就是"外层函数返回后变量仍然活着"的实现。两个 `make_counter()` 的调用产生两套独立 cell，所以两个计数器互不干扰。

踩坑清单：

- **循环变量闭包**：回调列表全部读到循环末值（迟绑定）——用默认参数快照或 `functools.partial` 修复
- **内层赋值不声明 `nonlocal`**：`UnboundLocalError`（先读后写场景）或"改了个寂寞"（赋值新建了局部名）
- **误用 `global` 做计数器**：模块级名字人人可见，多个"计数器实例"互相污染——需要独立状态就闭包或类
- **`__closure__` 为 `None`**：内层函数没有引用任何外层变量，就不是闭包——检查自由变量名是否拼错

## Q&A

**Q1: 装饰器为什么必须理解闭包？**
装饰器的 `wrapper` 就是闭包：`retry` 的 `times`、`ttl_cache` 的 `store` 都是自由变量，靠 cell 活过装饰时刻。lab 01 的"闭包捕获位置"一节，机制根据就在本实验的 cell 语义。

**Q2: `nonlocal` 和 `global` 可以互换吗？**
不能。`nonlocal` 向外层函数作用域找变量（不碰模块级）；`global` 只指模块级名字。计数器想"实例独立"用 `nonlocal`，想"全局唯一"才用 `global`。

**Q3: 怎么让闭包拿到循环变量的"当时值"？**
三种：默认参数快照（`lambda i=i: ...`）、`functools.partial(fn, i)` 固定实参、或用生成器表达式/函数包一层把 `i` 变成每次循环的局部变量。
