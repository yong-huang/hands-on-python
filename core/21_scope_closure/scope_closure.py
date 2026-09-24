"""
作用域与闭包
核心要点: LEGB、自由变量与 cell、nonlocal、循环变量闭包陷阱

作用域决定"一个名字在代码的某处指向谁"；闭包是"函数 + 它捕获的自由变量"打包
在一起的对象——装饰器、回调、偏函数都建立在它之上。

核心概念:
- LEGB: 名字查找顺序 Local → Enclosing → Global → Built-in，就近遮蔽
- 闭包: 内层函数引用外层变量，外层返回后变量仍存活（存在 cell 对象里）
- nonlocal: 声明"我要改的是 Enclosing 层的变量"，否则赋值会新建局部名
- 迟绑定: 闭包记住的是"变量"不是"值"——循环里造闭包是经典陷阱
"""

import dis


# ── 1. LEGB：就近遮蔽 ──

value = "global"


def legb_demo():
    value = "enclosing"

    def inner():
        value = "local"
        return value

    return inner(), value


# ── 2. 闭包：自由变量活在 cell 里 ──

def make_counter():
    count = 0

    def counter():
        nonlocal count     # 不写这行，count += 1 会把 count 变成 counter 的局部变量
        count += 1
        return count

    return counter


# ── 3. 迟绑定：闭包记住变量，不记住值 ──

def late_binding_broken():
    fns = [lambda: i for i in range(3)]
    return [f() for f in fns]


def late_binding_fixed():
    fns = [lambda i=i: i for i in range(3)]   # 默认参数在定义时求值 = 快照
    return [f() for f in fns]


# ── 4. nonlocal vs global ──

total_global = 0


def with_global():
    global total_global
    total_global += 1
    return total_global


def make_local_counter():
    total = 0

    def inc():
        nonlocal total
        total += 1
        return total
    return inc


# ── 5. Demo ──

def run_demo():
    print("=== 作用域与闭包 ===\n")

    print("[1] LEGB 就近遮蔽:")
    inner_value, outer_value = legb_demo()
    print(f"  inner() 读到 local 层的 {inner_value!r}；外层自己的 value 不受影响: {outer_value!r}")
    print("  删掉 inner 里的赋值后才会读到 enclosing/global——同名就近遮蔽\n")

    print("[2] 闭包与 cell:")
    counter = make_counter()
    print(f"  counter() → {counter()}，counter() → {counter()}（状态留在 cell 里）")
    cell = counter.__closure__[0]
    print(f"  __closure__ = ({cell!r},)  cell_contents={cell.cell_contents!r}\n")

    print("[3] 迟绑定陷阱与修复:")
    broken = late_binding_broken()
    fixed = late_binding_fixed()
    print(f"  [lambda: i for i in range(3)] 依次调用 → {broken}（全是循环结束后的 i）")
    print(f"  [lambda i=i: i ...] 默认参数快照   → {fixed}\n")

    print("[4] nonlocal vs global:")
    print(f"  with_global() → {with_global()}（写在模块级 total_global 上，人人可见）")
    counter_a, counter_b = make_local_counter(), make_local_counter()
    counter_a()
    print(f"  两个闭包计数器互不干扰: A={counter_a()}，B={counter_b()}")
    ops = [i.opname for i in dis.get_instructions(counter) if i.opname.startswith("STORE")]
    print(f"  字节码佐证: counter 的存储指令是 {ops}（STORE_DEREF = 写 cell，闭包变量的家）")


if __name__ == "__main__":
    run_demo()
