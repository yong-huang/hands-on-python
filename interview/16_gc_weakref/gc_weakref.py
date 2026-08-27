"""
GC / weakref / __del__ —— 垃圾回收与引用循环
面试高频题: 引用计数、循环引用、weakref、__del__ 的陷阱

Python 用引用计数为主、分代 GC 为辅的内存管理:
- 引用计数: obj 的引用为 0 时立即回收（不是真正的"GC"）
- 分代 GC: 定期扫描循环引用（引用计数无法处理的场景）
- weakref: 不增加引用计数的弱引用，不阻止对象回收
- __del__: 析构函数，对象被回收前调用

核心概念:
- 引用计数: sys.getrefcount(obj)
- 循环引用: 两个对象互相引用，引用计数永远不为 0
- weakref.ref(obj): 弱引用，不影响 GC
- __del__ 的风险: 循环引用时可能不被调用

示意图: python3 scripts/gen_diagram.py 生成 images/gc_weakref.png
"""

import sys
import gc
import weakref


# ============================================================
# 1. 引用计数
# ============================================================

def demo_refcount():
    """引用计数演示"""
    obj = object()
    print(f"  obj = object()  -> refcount: {sys.getrefcount(obj)}")

    a = obj
    print(f"  a = obj         -> refcount: {sys.getrefcount(obj)}")

    b = a
    print(f"  b = a           -> refcount: {sys.getrefcount(obj)}")

    del b
    print(f"  del b          -> refcount: {sys.getrefcount(obj)}")

    del a
    # obj still holds a reference
    print(f"  del a          -> refcount: {sys.getrefcount(obj)}")

    del obj
    # obj is now gone, can't check


# ============================================================
# 2. 循环引用
# ============================================================

class Node:
    """带有析构日志的节点"""
    all_nodes = []

    def __init__(self, name):
        self.name = name
        self.next = None
        Node.all_nodes.append(self)

    def set_next(self, other):
        self.next = other

    def __del__(self):
        Node.all_nodes.remove(self)
        print(f"  [__del__] Node('{self.name}') destroyed")

    def __repr__(self):
        return f"Node('{self.name}')"


def demo_cyclic():
    """循环引用: 引用计数无法回收"""
    Node.all_nodes.clear()
    print(f"  Before: {len(Node.all_nodes)} nodes")

    a = Node("A")
    b = Node("B")
    a.set_next(b)
    b.set_next(a)

    del a
    del b
    print(f"  After del: {len(Node.all_nodes)} nodes (still alive!)")

    collected = gc.collect()
    print(f"  gc.collect(): {collected} objects collected")
    print(f"  After GC: {len(Node.all_nodes)} nodes")


# ============================================================
# 3. weakref
# ============================================================

def demo_weakref():
    """弱引用: 不阻止回收"""
    class CacheEntry:
        def __init__(self, key, value):
            self.key = key
            self.value = value
        def __repr__(self):
            return f"CacheEntry({self.key!r})"

    obj = CacheEntry("user:123", {"name": "Alice"})
    ref = weakref.ref(obj)

    print(f"  obj: {obj}")
    print(f"  ref(): {ref()}")
    print(f"  ref() is obj: {ref() is obj}")

    del obj
    print(f"  After del obj:")
    print(f"  ref(): {ref()}  (dead!)")

    # weakref with callback
    alive = [True]
    def on_gc():
        alive[0] = False
        print(f"  [callback] object was garbage collected!")

    obj2 = CacheEntry("temp", "data")
    weakref.finalize(obj2, on_gc)
    del obj2
    gc.collect()
    print(f"  alive: {alive[0]}")


# ============================================================
# 4. 弱引用字典
# ============================================================

def demo_weakref_dict():
    """WeakKeyDictionary: key 被回收时自动删除条目"""
    from weakref import WeakKeyDictionary

    class Expensive:
        def __init__(self, name):
            self.name = name
        def __repr__(self):
            return f"Expensive({self.name})"

    cache = WeakKeyDictionary()
    obj = Expensive("data1")
    cache[obj] = "cached result"

    print(f"  cache has {len(cache)} entries")
    print(f"  cache[obj]: {cache[obj]}")

    del obj
    gc.collect()
    print(f"  After del + GC: cache has {len(cache)} entries")


# ============================================================
# 5. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("GC / weakref / __del__ -- Demo Mode")
    print("=" * 60)

    # 1) Reference counting
    print("\n[1] Reference counting:")
    demo_refcount()

    # 2) Cyclic references
    print("\n[2] Cyclic reference (GC needed):")
    demo_cyclic()

    # 3) weakref
    print("\n[3] weakref (non-blocking reference):")
    demo_weakref()

    # 4) WeakKeyDictionary
    print("\n[4] WeakKeyDictionary (auto-cleanup):")
    demo_weakref_dict()

    # 5) __del__ warnings
    print("\n[5] __del__ warnings:")
    print("  - __del__ may NOT be called for cyclic references")
    print("  - __del__ exceptions are ignored (only warned)")
    print("  - __del__ runs in unpredictable order")
    print("  - Prefer context managers for cleanup")

    # 6) GC generations
    print("\n[6] GC generations:")
    for i in range(3):
        count = len(gc.get_objects(generation=i))
        print(f"  Gen {i}: {count} objects")

    print(f"  gc.get_threshold(): {gc.get_threshold()}")

    # 7) Summary
    print("\n[7] Summary:")
    print("  1. refcount=0 -> immediate reclaim (most cases)")
    print("  2. Cyclic refs -> refcount never reaches 0 -> need GC")
    print("  3. weakref -> reference without blocking GC")
    print("  4. __del__ -> unreliable, prefer context managers")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 可视化图由 scripts/gen_diagram.py 生成
    run_demo()
