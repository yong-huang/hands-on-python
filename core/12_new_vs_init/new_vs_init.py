"""
__new__ vs __init__ —— 对象创建生命周期
核心要点: __new__ 什么时候用、不可变类型的子类化、单例、缓存

__new__ 负责创建实例（分配内存），__init__ 负责初始化（设置属性）。
绝大多数情况只需要 __init__。__new__ 仅在以下场景需要:
- 不可变类型子类化 (str, int, tuple)
- 单例 / 缓存
- 控制实例创建（如连接池）

核心概念:
- __new__(cls, ...) -> instance: 创建并返回实例
- __init__(self, ...) -> None: 初始化已创建的实例
- __new__ 返回非 cls 实例时，__init__ 不会被调用
- 不可变类型必须在 __new__ 中修改值（__init__ 无法修改）
"""


# ============================================================
# 1. 基础: __new__ 和 __init__ 的调用顺序
# ============================================================

class Tracked:
    """追踪 __new__ 和 __init__ 的调用"""
    _count = 0

    def __new__(cls):
        Tracked._count += 1
        print(f"  __new__ called (#{Tracked._count}) -> creating instance of {cls.__name__}")
        instance = super().__new__(cls)
        return instance

    def __init__(self):
        print(f"  __init__ called -> initializing {self}")


# ============================================================
# 2. __new__ 控制实例创建
# ============================================================

class CachedInstance:
    """__new__ 实现实例缓存"""
    _cache = {}

    def __new__(cls, key):
        if key in cls._cache:
            print(f"  __new__: returning cached instance for '{key}'")
            return cls._cache[key]
        instance = super().__new__(cls)
        instance.key = key
        cls._cache[key] = instance
        print(f"  __new__: created new instance for '{key}'")
        return instance

    def __init__(self, key):
        print(f"  __init__: initializing with key='{key}'")


# ============================================================
# 3. 不可变类型的子类化
# ============================================================

class UpperStr(str):
    """str 子类: 自动转大写（必须在 __new__ 中修改）"""

    def __new__(cls, value):
        return super().__new__(cls, value.upper())

    def __init__(self, value):
        self.original = value


class LimitedInt(int):
    """int 子类: 限制范围"""
    def __new__(cls, value, min_val=0, max_val=100):
        value = max(min_val, min(max_val, value))
        return super().__new__(cls, value)


# ============================================================
# 4. __new__ 返回不同类型
# ============================================================

class Factory:
    """__new__ 返回不同类型的实例"""
    def __new__(cls, kind):
        if kind == "list":
            return []
        elif kind == "dict":
            return {}
        elif kind == "set":
            return set()
        raise ValueError(f"Unknown kind: {kind}")


# ============================================================
# 5. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("__new__ vs __init__ -- Demo Mode")
    print("=" * 60)

    # 1) 调用顺序
    print("\n[1] __new__ then __init__:")
    print("  obj = Tracked()")
    obj = Tracked()

    # 2) 缓存实例
    print("\n[2] __new__ caching:")
    print("  CachedInstance('a'):")
    a1 = CachedInstance("a")
    print("  CachedInstance('a') again:")
    a2 = CachedInstance("a")
    print(f"  a1 is a2: {a1 is a2}")
    print("  CachedInstance('b'):")
    b = CachedInstance("b")
    print(f"  a1 is b: {a1 is b}")

    # 3) 不可变类型子类
    print("\n[3] Immutable subclass (must use __new__):")
    s = UpperStr("hello world")
    print(f"  UpperStr('hello world'): {s!r} (type: {type(s).__name__})")
    print(f"  s.original: {s.original}")
    print(f"  isinstance(s, str): {isinstance(s, str)}")
    print(f"  s + ' python': {s + ' python'}")

    n = LimitedInt(150, min_val=0, max_val=100)
    print(f"  LimitedInt(150, 0, 100): {n}")
    print(f"  isinstance(n, int): {isinstance(n, int)}")

    # 4) 返回不同类型
    print("\n[4] __new__ returns different types:")
    print(f"  Factory('list'): {Factory('list')} (type: {type(Factory('list')).__name__})")
    print(f"  Factory('dict'): {Factory('dict')} (type: {type(Factory('dict')).__name__})")

    # 5) Key takeaways
    print("\n[5] Key rules:")
    print("  1. __new__ allocates memory, __init__ initializes")
    print("  2. __new__ returns instance, __init__ returns None")
    print("  3. __new__ can return existing instance (caching)")
    print("  4. __new__ can return different type (factory)")
    print("  5. Immutable types: must override __new__, not __init__")
    print("  6. __new__ returns non-cls instance -> __init__ NOT called")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 
    run_demo()
