"""
描述符协议 —— __get__ / __set__ / __delete__
面试高频题: property 底层原理, descriptor vs property, 数据验证, cached_property

描述符是 Python 属性访问的底层机制。当你访问 obj.attr 时，Python 先查找 attr 是否是
描述符——如果是，则调用描述符的 __get__/__set__ 方法，而非直接读写实例 __dict__。

核心概念:
- 数据描述符 (data descriptor): 定义 __set__ 或 __delete__（即使没有 __get__），优先级高于实例 __dict__
- 非数据描述符 (non-data descriptor): 只定义 __get__，实例 __dict__ 优先
- property / classmethod / staticmethod 本质都是描述符
- __set_name__: Python 3.6+，描述符创建时自动接收属性名

示意图: python3 scripts/gen_diagram.py 生成 images/descriptor.png
"""

import time


# ============================================================
# 1. 数据描述符 — 带类型检查的属性
# ============================================================

class TypedField:
    """通用类型检查描述符"""
    def __init__(self, name=None, type_=None, min_val=None, max_val=None):
        self.name = name       # 属性名（由 __set_name__ 设置）
        self.type_ = type_
        self.min_val = min_val
        self.max_val = max_val

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self  # 类访问返回描述符本身
        return obj.__dict__.get(self.name)

    def __set__(self, obj, value):
        if self.type_ is not None and not isinstance(value, self.type_):
            raise TypeError(
                f"{self.name}: expected {self.type_.__name__}, "
                f"got {type(value).__name__}")
        if self.min_val is not None and value < self.min_val:
            raise ValueError(f"{self.name}: must >= {self.min_val}")
        if self.max_val is not None and value > self.max_val:
            raise ValueError(f"{self.name}: must <= {self.max_val}")
        obj.__dict__[self.name] = value

    def __delete__(self, obj):
        obj.__dict__.pop(self.name, None)


# ============================================================
# 2. 非数据描述符 — cached_property
# ============================================================

class CachedProperty:
    """模拟 functools.cached_property（非数据描述符）"""

    def __init__(self, func):
        self.func = func
        self.name = func.__name__

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        if self.name not in obj.__dict__:
            obj.__dict__[self.name] = self.func(obj)
        return obj.__dict__[self.name]


# ============================================================
# 3. 延迟计算描述符 — 按需加载
# ============================================================

class LazyField:
    """惰性加载描述符：首次访问时计算，之后缓存"""
    def __init__(self, factory):
        self.factory = factory
        self.name = None

    def __set_name__(self, owner, name):
        self.name = f"_lazy_{name}"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        if not hasattr(obj, self.name):
            setattr(obj, self.name, self.factory(obj))
        return getattr(obj, self.name)


# ============================================================
# 4. 日志描述符 — 自动记录读写
# ============================================================

class LoggedField:
    """属性读写自动记录日志"""
    def __init__(self, default=None):
        self.default = default
        self.name = None
        self._log = []  # 类级别日志

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        self._log.append(("read", getattr(obj, "_id", "?")))
        return obj.__dict__.get(self.name, self.default)

    def __set__(self, obj, value):
        self._log.append(("write", getattr(obj, "_id", "?"), value))
        obj.__dict__[self.name] = value

    def get_log(self):
        return list(self._log)


# ============================================================
# 5. 使用描述符的业务类
# ============================================================

class User:
    """用户模型 — 用 TypedField 做数据验证"""
    name = TypedField(type_=str)
    age = TypedField(type_=int, min_val=0, max_val=150)
    email = TypedField(type_=str)

    _counter = 0

    def __init__(self, name, age, email):
        User._counter += 1
        self._id = User._counter
        self.name = name
        self.age = age
        self.email = email

    def __repr__(self):
        return f"User({self.name!r}, age={self.age}, email={self.email!r})"


class DataProcessor:
    """数据处理 — cached_property 演示"""
    def __init__(self, data):
        self.data = data
        self._compute_count = 0

    @CachedProperty
    def stats(self):
        """计算密集型属性，只计算一次"""
        self._compute_count += 1
        time.sleep(0.001)  # 模拟耗时
        return {
            "sum": sum(self.data),
            "mean": sum(self.data) / len(self.data),
            "min": min(self.data),
            "max": max(self.data),
        }

    @CachedProperty
    def sorted_data(self):
        """排序后缓存"""
        return sorted(self.data)


class HeavyResource:
    """惰性加载演示 — 昂贵的资源按需初始化"""
    def __init__(self, config):
        self.config = config

    @LazyField
    def database(self):
        print("    [LazyField] Initializing database connection...")
        return {"connected": True, "db": self.config.get("db", "default")}

    @LazyField
    def cache_pool(self):
        print("    [LazyField] Initializing cache pool...")
        return {"size": self.config.get("cache_size", 100)}


class TrackedEntity:
    """读写追踪演示"""
    score = LoggedField(default=0)
    status = LoggedField(default="active")

    def __init__(self, eid):
        self._id = eid


# ============================================================
# 6. 揭示 property / classmethod 的描述符本质
# ============================================================

def reveal_descriptor_nature():
    """展示 property 和 classmethod 的描述符本质"""
    print("  property is a data descriptor:")
    p = property(lambda self: self.x)
    print(f"    has __get__:  {hasattr(p, '__get__')}")   # True
    print(f"    has __set__:  {hasattr(p, '__set__')}")   # True
    print(f"    has __delete__: {hasattr(p, '__delete__')}")  # True

    print("\n  classmethod is a descriptor:")
    cm = classmethod(lambda cls: cls.__name__)
    print(f"    has __get__:  {hasattr(cm, '__get__')}")   # True
    print(f"    has __set__:  {hasattr(cm, '__set__')}")   # False
    print(f"    type: {type(cm).__name__}")

    print("\n  staticmethod is a descriptor:")
    sm = staticmethod(lambda: 42)
    print(f"    has __get__:  {hasattr(sm, '__get__')}")   # True
    print(f"    has __set__:  {hasattr(sm, '__set__')}")   # False
    print(f"    type: {type(sm).__name__}")

    # 自己实现一个简易 property
    print("\n  Manual property equivalent:")
    class Simple:
        def __init__(self):
            self._x = 0

        def get_x(self):
            return self._x

        def set_x(self, value):
            self._x = value

    s = Simple()
    s.set_x(42)
    print(f"    s.get_x() = {s.get_x()}  (manual getter/setter)")


# ============================================================
# 7. 查找优先级演示
# ============================================================

class DataDesc:
    """数据描述符: 定义了 __get__ + __set__"""
    def __get__(self, obj, objtype=None):
        print(f"    [DataDesc.__get__] descriptor wins")
        return 100

    def __set__(self, obj, value):
        print(f"    [DataDesc.__set__] descriptor wins")


class NonDataDesc:
    """非数据描述符: 只定义 __get__"""
    def __get__(self, obj, objtype=None):
        print(f"    [NonDataDesc.__get__] descriptor used")
        return 200


class PriorityDemo:
    d = DataDesc()
    nd = NonDataDesc()


def demo_priority():
    """演示属性查找优先级"""
    print("  [1] Data descriptor vs __dict__:")
    obj = PriorityDemo()
    obj.__dict__["d"] = "instance_value"
    print(f"    obj.__dict__['d'] = 'instance_value'")
    val = obj.d  # 数据描述符优先
    print(f"    obj.d = {val}  (descriptor wins)")
    obj.d = 999  # 赋值同样被数据描述符拦截, 不会写进实例 __dict__
    print(f"    after obj.d = 999, obj.__dict__ = {obj.__dict__}")

    print("\n  [2] Non-data descriptor vs __dict__:")
    obj.__dict__["nd"] = "instance_value"
    print(f"    obj.__dict__['nd'] = 'instance_value'")
    val = obj.nd  # 实例 __dict__ 优先
    print(f"    obj.nd = {val}  (instance dict wins)")


# ============================================================
# 8. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("Descriptor Protocol -- Demo Mode")
    print("=" * 60)

    # 1) TypedField
    print("\n[1] TypedField (data descriptor with validation):")
    u1 = User("Alice", 30, "alice@example.com")
    print(f"  {u1}")
    u2 = User("Bob", 25, "bob@example.com")
    print(f"  {u2}")

    print("\n  Type validation:")
    try:
        u1.age = "thirty"
    except TypeError as e:
        print(f"    TypeError: {e}")

    print("  Range validation:")
    try:
        u1.age = -1
    except ValueError as e:
        print(f"    ValueError: {e}")
    try:
        u1.age = 200
    except ValueError as e:
        print(f"    ValueError: {e}")

    # 2) CachedProperty
    print("\n[2] CachedProperty (non-data descriptor):")
    dp = DataProcessor(list(range(100)))
    print(f"  Access stats 1st time (computes): {dp.stats}")
    print(f"  Access stats 2nd time (cached):   {dp.stats}")
    print(f"  Compute count: {dp._compute_count} (should be 1)")

    print(f"  Access sorted_data 1st: {dp.sorted_data[:5]}...")
    print(f"  Access sorted_data 2nd: {dp.sorted_data[:5]}... (cached)")

    # 尝试覆盖 cached property（非数据描述符可以被实例 dict 覆盖）
    dp.__dict__["stats"] = {"hacked": True}
    print(f"  After override: {dp.stats} (non-data: instance dict wins)")

    # 3) LazyField
    print("\n[3] LazyField (lazy initialization):")
    hr = HeavyResource({"db": "mydb", "cache_size": 256})
    print("  HeavyResource created (nothing initialized yet)")
    print(f"  Accessing database:")
    db = hr.database
    print(f"    -> {db}")
    print(f"  Accessing database again (cached):")
    db2 = hr.database
    print(f"    -> {db2} (same object: {db is db2})")
    print(f"  Accessing cache_pool:")
    pool = hr.cache_pool
    print(f"    -> {pool}")

    # 4) LoggedField
    print("\n[4] LoggedField (read/write tracking):")
    e1 = TrackedEntity("E001")
    e2 = TrackedEntity("E002")
    e1.score = 95
    e1.score += 5  # read + write
    _ = e1.score
    e2.status = "inactive"
    log = TrackedEntity.score.get_log()
    print(f"  Access log ({len(log)} entries):")
    for entry in log:
        print(f"    {entry}")

    # 5) Descriptor nature
    print("\n[5] Descriptor nature of built-ins:")
    reveal_descriptor_nature()

    # 6) Lookup priority
    print("\n[6] Attribute lookup priority:")
    demo_priority()

    print(f"\n{'='*60}")


# ============================================================
# 9. Main
# ============================================================

if __name__ == "__main__":
    run_demo()
    # 只跑 demo; 可视化图由 scripts/gen_diagram.py 生成
