"""
*args / **kwargs —— 解包与参数传递
核心要点: * 和 ** 的四种用法、位置参数/关键字参数、参数顺序规则

* 和 ** 在 Python 中有四种用途:
1. 函数定义: 收集多余参数 (*args=元组, **kwargs=字典)
2. 函数调用: 解包容器 (*list=位置参数, **dict=关键字参数)
3. 字面量解包: *a, b = [1, 2, 3]
4. 合并字典: {**d1, **d2} (Python 3.5+)

核心概念:
- *args: 收集剩余位置参数为 tuple
- **kwargs: 收集剩余关键字参数为 dict
- 位置参数必须写在 *args 之前
- *args 之后的参数必须是 keyword-only
"""


# ============================================================
# 1. 定义: 收集参数
# ============================================================

def variadic(*args, **kwargs):
    """收集所有多余参数"""
    print(f"  args:   {args}  (type: {type(args).__name__})")
    print(f"  kwargs: {kwargs}  (type: {type(kwargs).__name__})")


def with_defaults(a, b, *args, key="default", **kwargs):
    """展示参数顺序规则"""
    print(f"  a={a}, b={b}, args={args}, key={key}, kwargs={kwargs}")


# ============================================================
# 2. 调用: 解包参数
# ============================================================

def add(a, b, c):
    return a + b + c

def greet(name, age, city):
    return f"{name}, {age}, from {city}"


# ============================================================
# 3. 强制关键字参数 (*)
# ============================================================

def kw_only(a, b, *, c, d):
    """c 和 d 必须用关键字传参"""
    return f"a={a}, b={b}, c={c}, d={d}"


# ============================================================
# 4. 仅位置参数 (/)
# ============================================================

def pos_only(a, b, /, c, d, *, e):
    """a, b 只能位置传参; e 只能关键字传参"""
    return f"a={a}, b={b}, c={c}, d={d}, e={e}"


# ============================================================
# 5. 实用模式
# ============================================================

def log(level, msg, *tags, **meta):
    """日志函数: 利用 *args 和 **kwargs"""
    tag_str = ", ".join(tags) if tags else ""
    meta_str = ", ".join(f"{k}={v}" for k, v in meta.items())
    parts = [f"[{level}] {msg}"]
    if tag_str:
        parts.append(f"tags: {tag_str}")
    if meta_str:
        parts.append(f"meta: {meta_str}")
    return " | ".join(parts)


def wrapper(func, *args, **kwargs):
    """通用包装器: 转发所有参数"""
    print(f"  calling {func.__name__}({args}, {kwargs})")
    return func(*args, **kwargs)


# ============================================================
# 6. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("*args / **kwargs -- Demo Mode")
    print("=" * 60)

    # 1) Collect
    print("\n[1] Collecting parameters:")
    variadic(1, 2, 3, x=10, y=20)
    with_defaults(1, 2, 3, 4, key="custom", z=99)

    # 2) Unpack
    print("\n[2] Unpacking at call site:")
    nums = [1, 2, 3]
    print(f"  add(*{nums}) = {add(*nums)}")
    info = {"name": "Alice", "age": 30, "city": "Shanghai"}
    print(f"  greet(**{info}) = {greet(**info)}")

    # 3) Mixed
    print("\n[3] Mixed: *args + explicit + **kwargs:")
    variadic(1, 3, 4, x=10, y=20, z=30)

    # 4) keyword-only
    print("\n[4] Keyword-only (* separator):")
    print(f"  kw_only(1, 2, c=3, d=4): {kw_only(1, 2, c=3, d=4)}")
    try:
        kw_only(1, 2, 3, 4)
    except TypeError as e:
        print(f"  kw_only(1, 2, 3, 4): TypeError: {e}")

    # 5) pos-only
    print("\n[5] Position-only (/ separator):")
    print(f"  pos_only(1, 2, 3, 4, e=5): {pos_only(1, 2, 3, 4, e=5)}")
    try:
        pos_only(a=1, b=2, c=3, d=4, e=5)
    except TypeError as e:
        print(f"  pos_only(a=1, b=2, ...): TypeError: {e}")

    # 6) Practical
    print("\n[6] Practical patterns:")
    print(f"  log: {log('ERROR', 'disk full', 'server', 'storage', host='node1', pid=1234)}")
    print(f"  wrapper: {wrapper(add, *nums)}")
    print(f"  wrapper: {wrapper(greet, **info)}")

    # 7) Literal unpacking
    print("\n[7] Literal unpacking:")
    first, *rest = [1, 2, 3, 4, 5]
    print(f"  first, *rest = [1,2,3,4,5] -> first={first}, rest={rest}")
    *init, last = [1, 2, 3, 4, 5]
    print(f"  *init, last = [1,2,3,4,5] -> init={init}, last={last}")
    head, *mid, tail = [1, 2, 3, 4, 5]
    print(f"  head, *mid, tail -> head={head}, mid={mid}, tail={tail}")

    # 8) Dict merging
    print("\n[8] Dict merging (** unpacking):")
    d1 = {"a": 1, "b": 2}
    d2 = {"c": 3, "b": 99}
    merged = {**d1, **d2}
    print(f"  {{**d1, **d2}} = {merged}  (d2.b overrides d1.b)")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 
    run_demo()
