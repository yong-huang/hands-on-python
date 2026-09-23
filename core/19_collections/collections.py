"""
collections / namedtuple / dataclass / attrs —— 数据容器
核心要点: namedtuple vs dataclass vs dict、数据类最佳实践

Python 提供多种数据容器，各有适用场景:
- dict: 通用键值对，灵活但无类型约束
- namedtuple: 命名元组，不可变，轻量
- dataclass: 可变/不可变，自动生成方法，Python 3.7+
- attrs: 第三方库，功能更丰富

核心概念:
- namedtuple: 不可变，自带 __repr__ / 字段名访问
- dataclass: 可配置的可变/不可变，自动 __init__/__repr__/__eq__
- typing.NamedTuple: 类型注解版 namedtuple (Python 3.6+)
- 字段顺序: dataclass 用 __post_init__ 处理初始化依赖
"""

from collections import namedtuple
from dataclasses import dataclass, field, asdict, astuple
from typing import NamedTuple, Optional


# ============================================================
# 1. namedtuple
# ============================================================

Point = namedtuple("Point", ["x", "y"])
Color = namedtuple("Color", ["r", "g", "b", "name"])


# ============================================================
# 2. Typed NamedTuple
# ============================================================

class TypedPoint(NamedTuple):
    """带类型注解的 namedtuple"""
    x: float
    y: float


# ============================================================
# 3. dataclass (mutable)
# ============================================================

@dataclass
class Product:
    name: str
    price: float
    in_stock: bool = True
    tags: list = field(default_factory=list)

    def __post_init__(self):
        """初始化后处理"""
        if self.price < 0:
            self.price = 0.0


# ============================================================
# 4. dataclass (frozen/ordered)
# ============================================================

@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int
    patch: int = 0

    def __str__(self):
        return f"v{self.major}.{self.minor}.{self.patch}"


# ============================================================
# 5. nested dataclass
# ============================================================

@dataclass
class Address:
    city: str
    street: str

@dataclass
class Employee:
    name: str
    age: int
    address: Optional[Address] = None


# ============================================================
# 6. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("collections / dataclass -- Demo Mode")
    print("=" * 60)

    # 1) namedtuple
    print("\n[1] namedtuple:")
    p = Point(3, 4)
    print(f"  Point(3, 4): x={p.x}, y={p.y}")
    print(f"  repr: {p!r}")
    print(f"  hashable: {hash(p)} (can be dict key)")
    d = {p: "origin"}
    print(f"  dict key: {list(d.keys())}")

    c = Color(255, 0, 0, "red")
    print(f"  Color: {c}")

    # 2) NamedTuple
    print("\n[2] Typed NamedTuple:")
    tp = TypedPoint(3.5, 4.5)
    print(f"  TypedPoint(3.5, 4.5): {tp}")
    print(f"  __annotations__: {TypedPoint.__annotations__}")

    # 3) dataclass mutable
    print("\n[3] dataclass (mutable):")
    prod = Product("Laptop", 999.99, tags=["electronics"])
    print(f"  {prod}")
    prod.price = 899.99
    prod.tags.append("sale")
    print(f"  After modify: {prod}")
    prod_neg = Product("Free", -1)
    print(f"  Product('Free', -1): price={prod_neg.price} (clamped to 0)")

    # 4) dataclass frozen
    print("\n[4] dataclass (frozen=True, order=True):")
    versions = [Version(2, 0, 1), Version(1, 10, 0), Version(2, 0, 0)]
    print(f"  Sorted: {sorted(versions)}")
    print(f"  Hashable: {hash(versions[0])}")
    try:
        versions[0].major = 3
    except AttributeError as e:
        print(f"  versions[0].major = 3 -> AttributeError: frozen")

    # 5) Nested
    print("\n[5] Nested dataclass:")
    emp = Employee("Alice", 30, Address("Shanghai", "Nanjing Rd"))
    print(f"  {emp}")
    print(f"  asdict: {asdict(emp)}")

    # 6) Conversion
    print("\n[6] Conversion utilities:")
    print(f"  asdict(prod): {list(asdict(prod).keys())}")
    print(f"  tuple(Point(3,4)): {tuple(p)}")

    # 7) Comparison
    print("\n[7] Comparison guide:")
    print("  dict:      mutable, no field access, no defaults")
    print("  namedtuple: immutable, field access, lightweight")
    print("  dataclass: mutable/frozen, auto methods, flexible")
    print("  Rule: simple data transfer -> namedtuple")
    print("        need mutation/validation -> dataclass")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 
    run_demo()
