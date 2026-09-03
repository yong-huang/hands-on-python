"""
__slots__ 与内存优化
面试高频题: __slots__ 原理、内存节省、动态属性限制、weakref

Python 默认用 __dict__ 存储实例属性（哈希表），两属性对象每个实例约 136~152 bytes
（对象本体 + 实例字典）。__slots__ 声明固定属性集合，Python 改用数组存储，
每个实例降到约 48 bytes，万级实例总内存节省 60%~70%。

核心概念:
- __slots__: 声明允许的属性名，禁用 __dict__
- 内存原理: __dict__ 是哈希表（灵活但开销大），slots 是描述符数组（固定但紧凑）
- weakref: slots 中加 "__weakref__" 才支持弱引用
- 继承: 父类的 slots 仍生效，但子类若不声明自己的 __slots__ 就会额外获得 __dict__
- 属性访问速度: 3.10 及以前 slots 快 10~40%; 3.11+ 属性访问优化后基本持平——
  今天用 slots 主要为省内存，不为提速

交互示意图: 用浏览器打开 images/slots_memory.archify.html
"""

import time
import sys


# ============================================================
# 1. 基础对比: 普通 vs __slots__
# ============================================================

class RegularPoint:
    """普通类: 使用 __dict__"""
    def __init__(self, x, y):
        self.x = x
        self.y = y


class SlotPoint:
    """__slots__ 类: 使用描述符数组"""
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x = x
        self.y = y


# ============================================================
# 2. 带默认值的 __slots__
# ============================================================

class SlotWithDefault:
    """默认值来自 __init__ 形参默认值——slots 本身不存储默认值"""
    __slots__ = ("x", "y", "z")

    def __init__(self, x, y, z=0):
        self.x = x
        self.y = y
        self.z = z


# ============================================================
# 3. 继承中的 __slots__
# ============================================================

class Slot2D:
    __slots__ = ("x", "y")


class Slot3D(Slot2D):
    """子类声明自己的 slots 才能避免获得 __dict__（父类的 slots 仍生效）"""
    __slots__ = ("z",)

    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z


class NoSlotChild(Slot2D):
    """子类没有 __slots__ → 自动获得 __dict__"""
    def __init__(self, x, y, label=""):
        self.x = x
        self.y = y
        self.label = label  # 存在 __dict__ 中


# ============================================================
# 4. weakref 支持
# ============================================================

class SlotWithWeakref:
    """需要显式声明 __weakref__ 才支持弱引用"""
    __slots__ = ("x", "y", "__weakref__")


# ============================================================
# 5. 属性访问速度对比
# ============================================================

def benchmark_access():
    """对比普通属性和 slots 属性的访问速度"""
    N = 1_000_000

    # 创建
    regulars = [RegularPoint(i, i) for i in range(100)]
    slotted = [SlotPoint(i, i) for i in range(100)]

    # Write benchmark
    t0 = time.perf_counter()
    for _ in range(N):
        for p in regulars:
            p.x = 1
    t_regular_write = time.perf_counter() - t0

    t0 = time.perf_counter()
    for _ in range(N):
        for p in slotted:
            p.x = 1
    t_slot_write = time.perf_counter() - t0

    # Read benchmark
    t0 = time.perf_counter()
    for _ in range(N):
        for p in regulars:
            _ = p.x
    t_regular_read = time.perf_counter() - t0

    t0 = time.perf_counter()
    for _ in range(N):
        for p in slotted:
            _ = p.x
    t_slot_read = time.perf_counter() - t0

    return {
        "regular_write": t_regular_write,
        "slot_write": t_slot_write,
        "regular_read": t_regular_read,
        "slot_read": t_slot_read,
    }


# ============================================================
# 6. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("__slots__ & Memory Optimization -- Demo Mode")
    print("=" * 60)

    # 1) Basic comparison
    print("\n[1] Instance memory comparison:")
    r = RegularPoint(1, 2)
    s = SlotPoint(1, 2)
    print(f"  RegularPoint: {sys.getsizeof(r)} bytes, has __dict__: {hasattr(r, '__dict__')}")
    print(f"  SlotPoint:     {sys.getsizeof(s)} bytes, has __dict__: {hasattr(s, '__dict__')}")
    if hasattr(r, "__dict__"):
        print(f"  RegularPoint.__dict__: {r.__dict__}")

    d = SlotWithDefault(1, 2)
    print(f"  SlotWithDefault(1, 2): z={d.z}  (default comes from __init__, not slots)")

    # 2) Bulk memory
    print("\n[2] Bulk memory (10,000 instances):")
    N = 10000
    regulars = [RegularPoint(i, i) for i in range(N)]
    slotted = [SlotPoint(i, i) for i in range(N)]

    regular_total = sum(sys.getsizeof(p) + sys.getsizeof(p.__dict__) for p in regulars)
    slot_total = sum(sys.getsizeof(p) for p in slotted)
    savings = (1 - slot_total / regular_total) * 100

    print(f"  Regular: {regular_total / 1024:.1f} KB total")
    print(f"  Slotted: {slot_total / 1024:.1f} KB total")
    print(f"  Savings: {savings:.1f}%")

    # 3) Dynamic attribute restriction
    print("\n[3] __slots__ blocks dynamic attributes:")
    print("  RegularPoint: can add .z?")
    r.z = 3
    print(f"    Yes: r.z = {r.z}")
    print("  SlotPoint: can add .z?")
    try:
        s.z = 3
    except AttributeError as e:
        print(f"    AttributeError: {e}")

    # 4) Inheritance
    print("\n[4] __slots__ inheritance:")
    p3 = Slot3D(1, 2, 3)
    print(f"  Slot3D(1,2,3): x={p3.x}, y={p3.y}, z={p3.z}")
    print(f"  Slot3D has __dict__: {hasattr(p3, '__dict__')}")

    p_child = NoSlotChild(1, 2, "origin")
    print(f"  NoSlotChild: x={p_child.x}, y={p_child.y}, label={p_child.label}")
    print(f"  NoSlotChild has __dict__: {hasattr(p_child, '__dict__')}")

    # 5) weakref
    print("\n[5] weakref support:")
    import weakref
    sw = SlotWithWeakref()
    sw.x = 42
    ref = weakref.ref(sw)
    print(f"  SlotWithWeakref: weakref = {ref().x}")
    print(f"  has __weakref__: {hasattr(sw, '__weakref__')}")

    sn = SlotPoint(1, 2)
    try:
        weakref.ref(sn)
        print("  SlotPoint: weakref OK")
    except TypeError as e:
        print(f"  SlotPoint: TypeError: {e}")

    # 6) Speed benchmark
    print("\n[6] Attribute access speed (1M iterations x 100 objects):")
    bench = benchmark_access()
    for label, t in bench.items():
        print(f"  {label}: {t:.4f}s")
    speedup_w = bench["regular_write"] / bench["slot_write"]
    speedup_r = bench["regular_read"] / bench["slot_read"]
    print(f"  Write speedup: {speedup_w:.2f}x")
    print(f"  Read speedup:  {speedup_r:.2f}x")

    # 7) Slots types
    print("\n[7] slots entry types:")
    print(f"  type(SlotPoint.x): {type(SlotPoint.x).__name__} (descriptor)")
    print(f"  type(RegularPoint.x): N/A (not a descriptor)")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 交互示意图见 images/slots_memory.archify.html
    run_demo()
