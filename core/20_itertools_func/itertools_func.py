"""
itertools / functools / operator —— 函数式工具库
核心要点: accumulate / chain / groupby / lru_cache / partial

Python 标准库中的三大函数式工具:
- itertools: 高效迭代器（不预生成全部元素）
- functools: 高阶函数工具（partial, wraps, lru_cache, reduce）
- operator: 函数式运算符替代 lambda

核心概念:
- itertools: chain / islice / groupby / accumulate / combinations
- functools: lru_cache / partial / wraps / reduce / singledispatch
- operator: itemgetter / attrgetter / methodcaller
"""

from itertools import chain, islice, groupby, accumulate, combinations
from functools import lru_cache, partial, wraps, reduce, singledispatch
from operator import itemgetter, attrgetter, methodcaller


# ============================================================
# 1. itertools 示例
# ============================================================

def demo_itertools():
    """itertools 高效迭代器"""
    # chain
    a = [1, 2, 3]
    b = [4, 5, 6]
    print(f"  chain([1,2,3], [4,5,6]): {list(chain(a, b))}")

    # islice
    data = list(range(100))
    print(f"  islice(range(100), 5, 15): {list(islice(data, 5, 15))}")

    # accumulate (running sum)
    print(f"  accumulate([1,2,3,4]): {list(accumulate([1,2,3,4]))}")

    # combinations
    print(f"  combinations('ABCD', 2): {list(combinations('ABCD', 2))}")

    # groupby
    data = sorted([("A", 1), ("B", 2), ("A", 3), ("B", 4)], key=lambda x: x[0])
    groups = {k: list(g) for k, g in groupby(data, key=lambda x: x[0])}
    print(f"  groupby by key: {groups}")


# ============================================================
# 2. functools 示例
# ============================================================

def demo_functools():
    """functools 高阶函数工具"""
    # lru_cache
    call_count = 0

    @lru_cache(maxsize=3)
    def expensive(n):
        nonlocal call_count
        call_count += 1
        return n * n

    expensive(1)
    expensive(2)
    expensive(1)  # cache hit
    expensive(3)
    expensive(4)  # evicts 2
    print(f"  lru_cache: called {call_count} times (5 calls, 1 cache hit)")
    print(f"  cache_info(): {expensive.cache_info()}")

    # partial
    def power(base, exp):
        return base ** exp

    square = partial(power, 2)
    cube = partial(power, 3)
    print(f"  partial(power, 2)(5) = {square(5)}")
    print(f"  partial(power, 3)(2) = {cube(2)}")

    # reduce
    result = reduce(lambda a, b: a + b, [1, 2, 3, 4, 5])
    print(f"  reduce(lambda a, b: a + b, [1..5]): {result}")

    # singledispatch
    @singledispatch
    def process(value):
        return f"Default: {value}"

    @process.register(int)
    def _(value):
        return f"Int: {value * 2}"

    @process.register(str)
    def _(value):
        return f"Str: '{value}' (len={len(value)})"

    print(f"  singledispatch(42): {process(42)}")
    print(f"  singledispatch('hi'): {process('hi')}")
    print(f"  singledispatch(3.14): {process(3.14)}")


# ============================================================
# 3. operator 示例
# ============================================================

def demo_operator():
    """operator 替代 lambda"""
    users = [
        {"name": "Alice", "age": 30},
        {"name": "Bob", "age": 25},
        {"name": "Charlie", "age": 35},
    ]

    # itemgetter
    names = sorted(users, key=itemgetter("age"))
    print(f"  sorted by age (itemgetter): {[u['name'] for u in names]}")

    # attrgetter
    class Obj:
        def __init__(self, x, y):
            self.x = x
            self.y = y

    objs = [Obj(3, 1), Obj(1, 2), Obj(2, 3)]
    print(f"  sorted by .x (attrgetter): {[(o.x, o.y) for o in sorted(objs, key=attrgetter('x'))]}")

    # methodcaller
    strs = ["hello", "WORLD", "foo"]
    upper = list(map(methodcaller("upper"), strs))
    print(f"  methodcaller('upper'): {upper}")


# ============================================================
# 4. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("itertools / functools / operator -- Demo Mode")
    print("=" * 60)

    print("\n[1] itertools:")
    demo_itertools()

    print("\n[2] functools:")
    demo_functools()

    print("\n[3] operator:")
    demo_operator()

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 
    run_demo()
