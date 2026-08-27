"""
魔术方法 —— __eq__, __hash__, __repr__, __str__, 运算符重载
面试高频题: == vs is、自定义对象做 dict key、__repr__ vs __str__、dataclass

Python 的运算符和内置函数背后都是魔术方法。
理解它们可以自定义类的行为，使其像内置类型一样自然地使用。

核心概念:
- __repr__ vs __str__: 调试 vs 显示
- __eq__ / __ne__: == / != 运算符
- __hash__: 使对象可哈希（可做 dict key / set 元素）
- __lt__ / __le__ / __gt__ / __ge__: 比较运算符
- __add__ / __mul__: 算术运算符
- dataclass: 自动生成 __init__/__repr__/__eq__
- @total_ordering: 只需 __eq__ + 一个比较即可

示意图: python3 scripts/gen_diagram.py 生成 images/magic_methods.png
"""

from functools import total_ordering


# ============================================================
# 1. __repr__ vs __str__
# ============================================================

class Point:
    """2D point with full magic methods"""
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        """Debug / eval: should be unambiguous"""
        return f"Point({self.x!r}, {self.y!r})"

    def __str__(self):
        """Display: should be readable"""
        return f"({self.x}, {self.y})"

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return self.x == other.x and self.y == other.y

    def __hash__(self):
        return hash((self.x, self.y))

    def __add__(self, other):
        if isinstance(other, Point):
            return Point(self.x + other.x, self.y + other.y)
        return NotImplemented

    def __mul__(self, scalar):
        return Point(self.x * scalar, self.y * scalar)

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5

    def __bool__(self):
        return self.x != 0 or self.y != 0


# ============================================================
# 2. @total_ordering — 只需 __eq__ + __lt__
# ============================================================

@total_ordering
class Version:
    """SemVer with automatic comparison"""

    def __init__(self, major, minor, patch=0):
        self.major = major
        self.minor = minor
        self.patch = patch

    def __eq__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor, self.patch) == \
               (other.major, other.minor, other.patch)

    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor, self.patch) < \
               (other.major, other.minor, other.patch)

    def __repr__(self):
        return f"Version({self.major}, {self.minor}, {self.patch})"

    def __str__(self):
        return f"v{self.major}.{self.minor}.{self.patch}"

    def __hash__(self):
        return hash((self.major, self.minor, self.patch))


# ============================================================
# 3. dataclass 对比
# ============================================================

from dataclasses import dataclass, field


@dataclass(order=True, frozen=True)
class DCPoint:
    """dataclass: auto-generates __init__, __repr__, __eq__, __hash__, __lt__"""
    x: float = field(compare=True)
    y: float = field(compare=True)


# ============================================================
# 4. 自定义容器
# ============================================================

class RingBuffer:
    """固定大小的环形缓冲区，支持 len() / iter / []"""

    def __init__(self, capacity):
        self.capacity = capacity
        self._data = []
        self._pos = 0

    def append(self, item):
        if len(self._data) < self.capacity:
            self._data.append(item)
        else:
            self._data[self._pos] = item
        self._pos = (self._pos + 1) % self.capacity

    def __len__(self):
        return len(self._data)

    def __getitem__(self, index):
        return self._data[index]

    def __iter__(self):
        return iter(self._data)

    def __repr__(self):
        return f"RingBuffer({self._data}, cap={self.capacity})"


# ============================================================
# 5. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("Magic Methods -- Demo Mode")
    print("=" * 60)

    # 1) __repr__ vs __str__
    print("\n[1] __repr__ vs __str__:")
    p = Point(3, 4)
    print(f"  repr(p): {repr(p)}")
    print(f"  str(p):  {str(p)}")
    print(f"  f'{p}':  {p}")

    # 2) __eq__ and __hash__
    print("\n[2] __eq__ and __hash__:")
    p1 = Point(3, 4)
    p2 = Point(3, 4)
    p3 = Point(1, 1)
    print(f"  p1 == p2: {p1 == p2}")
    print(f"  p1 == p3: {p1 == p3}")
    print(f"  hash(p1) == hash(p2): {hash(p1) == hash(p2)}")

    # As dict key
    d = {p1: "origin"}
    print(f"  d[{p1}]: {d[p1]}")
    print(f"  d[p2]:  {d[p2]}  (p2 has same hash, found via __eq__)")
    print(f"  p1 in set({p1}, {p3}): {p1 in {p1, p3}}")

    # 3) Arithmetic operators
    print("\n[3] Operator overloading:")
    print(f"  Point(3, 4) + Point(1, 2) = {Point(3, 4) + Point(1, 2)}")
    print(f"  Point(3, 4) * 2 = {Point(3, 4) * 2}")
    print(f"  abs(Point(3, 4)) = {abs(Point(3, 4))}")
    print(f"  bool(Point(0, 0)) = {bool(Point(0, 0))}")
    print(f"  bool(Point(1, 0)) = {bool(Point(1, 0))}")

    # 4) @total_ordering
    print("\n[4] @total_ordering (auto-generates gt, ge, le):")
    versions = [Version(2, 0, 1), Version(1, 10, 0), Version(2, 0, 0)]
    print(f"  Versions: {versions}")
    print(f"  Sorted: {sorted(versions)}")
    print(f"  v2.0.1 > v2.0.0: {Version(2, 0, 1) > Version(2, 0, 0)}")
    print(f"  v1.10.0 >= v2.0.0: {Version(1, 10, 0) >= Version(2, 0, 0)}")

    # As dict key
    v_map = {Version(2, 0, 0): "stable", Version(2, 1, 0): "beta"}
    print(f"  v_map[v2.0.0]: {v_map[Version(2, 0, 0)]}")

    # 5) dataclass
    print("\n[5] dataclass (auto-generates magic methods):")
    dp1 = DCPoint(3, 4)
    dp2 = DCPoint(3, 4)
    print(f"  repr: {repr(dp1)}")
    print(f"  dp1 == dp2: {dp1 == dp2}")
    print(f"  hash: {hash(dp1)}")
    print(f"  dp1 < DCPoint(5, 1): {dp1 < DCPoint(5, 1)}")

    # 6) Custom container
    print("\n[6] Custom container (RingBuffer):")
    rb = RingBuffer(3)
    for i in range(5):
        rb.append(i)
        print(f"  append({i}): {rb}")
    print(f"  len(rb): {len(rb)}")
    print(f"  rb[0]: {rb[0]}")
    print(f"  list(rb): {list(rb)}")

    # 7) NotImplemented vs exception
    print("\n[7] NotImplemented (not exception):")
    print(f"  type(NotImplemented): {type(NotImplemented).__name__}")
    print(f"  NotImplemented is None: {NotImplemented is None}")
    print(f"  Point(3,4) + 'hello': ", end="")
    try:
        _ = Point(3, 4) + "hello"
    except TypeError as e:
        print(f"TypeError ({e})")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 可视化图由 scripts/gen_diagram.py 生成
    run_demo()
