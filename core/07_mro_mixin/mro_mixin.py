"""
MRO (方法解析顺序) 与 Mixin 模式
核心要点: 多继承顺序、C3 线性化、钻石问题、Mixin 设计

当类有多继承时，Python 用 C3 线性化算法确定方法查找顺序。
MRO 决定了 super() 的调用链路，理解 MRO 是正确使用多继承和 Mixin 的前提。

核心概念:
- MRO: Method Resolution Order，方法解析顺序
- C3 算法: 保证单调性（父类顺序一致）和局部优先
- 钻石问题: D(B, C) 中 B 和 C 都继承 A，A.init 被调用几次？
- super(): 不是"调父类"，而是"MRO 中的下一个"
- Mixin: 纯功能类，不独立使用，提供可插拔的能力
"""

# ============================================================
# 1. MRO 基础 — 钻石继承
# ============================================================

class A:
    def greet(self):
        print(f"  A.greet()  [MRO index: {type(self).__mro__.index(A)}]")
        return "A"


class B(A):
    def greet(self):
        print(f"  B.greet()  [MRO index: {type(self).__mro__.index(B)}]")
        return super().greet()


class C(A):
    def greet(self):
        print(f"  C.greet()  [MRO index: {type(self).__mro__.index(C)}]")
        return super().greet()


class D(B, C):
    def greet(self):
        print(f"  D.greet()  [MRO index: {type(self).__mro__.index(D)}]")
        return super().greet()


# ============================================================
# 2. super() 的真实行为 — "MRO 中的下一个"
# ============================================================

class Base:
    def __init__(self):
        print(f"  Base.__init__ called by {type(self).__name__}")
        super().__init__()


class MixinLog:
    def __init__(self):
        print(f"  MixinLog.__init__ called by {type(self).__name__}")
        super().__init__()


class MixinValidate:
    def __init__(self):
        print(f"  MixinValidate.__init__ called by {type(self).__name__}")
        super().__init__()


class MyService(MixinLog, MixinValidate, Base):
    def __init__(self):
        print(f"  MyService.__init__ starts")
        super().__init__()
        print(f"  MyService.__init__ ends")


# ============================================================
# 3. 实战 Mixin — 可插拔功能
# ============================================================

class JSONMixin:
    """提供 JSON 序列化能力"""
    def to_json(self):
        import json
        attrs = {k: v for k, v in vars(self).items() if not k.startswith("_")}
        return json.dumps(attrs)

    @classmethod
    def from_json(cls, json_str):
        import json
        data = json.loads(json_str)
        return cls(**data)


class ReprMixin:
    """提供自定义 __repr__ 能力"""
    def __repr__(self):
        attrs = {k: v for k, v in vars(self).items() if not k.startswith("_")}
        pairs = ", ".join(f"{k}={v!r}" for k, v in attrs.items())
        return f"{type(self).__name__}({pairs})"


class ValidateMixin:
    """提供数据验证能力"""
    _validators = {}

    def validate(self):
        errors = []
        for field, validator in self._validators.items():
            value = getattr(self, field, None)
            if not validator(value):
                errors.append(f"Invalid {field}: {value}")
        return errors


class User(JSONMixin, ReprMixin):
    """组合多个 Mixin 的业务类"""
    def __init__(self, name, age, email):
        self.name = name
        self.age = age
        self.email = email


class Product(JSONMixin, ReprMixin, ValidateMixin):
    """带验证的产品类"""
    _validators = {
        "name": lambda v: isinstance(v, str) and len(v) > 0,
        "price": lambda v: isinstance(v, (int, float)) and v > 0,
    }

    def __init__(self, name, price):
        self.name = name
        self.price = price


# ============================================================
# 4. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("MRO & Mixin -- Demo Mode")
    print("=" * 60)

    # 1) MRO 基础
    print("\n[1] Diamond inheritance MRO:")
    print(f"  D(B, C) MRO: {' -> '.join(c.__name__ for c in D.__mro__)}")
    print(f"  B(A)   MRO: {' -> '.join(c.__name__ for c in B.__mro__)}")
    print(f"  C(A)   MRO: {' -> '.join(c.__name__ for c in C.__mro__)}")

    print("\n  Calling D().greet():")
    d = D()
    result = d.greet()
    print(f"  Result: {result}")
    print("  A.greet() called exactly ONCE (C3 guarantees)")

    # 2) super() chain
    print("\n[2] super() is NOT 'call parent':")
    print(f"  MyService MRO: {' -> '.join(c.__name__ for c in MyService.__mro__)}")
    print("  Creating MyService():")
    obj = MyService()

    # 3) Mixin usage
    print("\n[3] Mixin as pluggable features:")
    user = User("Alice", 30, "alice@example.com")
    print(f"  repr: {user}")
    print(f"  json: {user.to_json()}")

    # 4) Mixin with validation
    print("\n[4] Mixin with validation:")
    p1 = Product("Laptop", 999.99)
    errors = p1.validate()
    print(f"  Product('Laptop', 999.99): {p1}")
    print(f"  json: {p1.to_json()}")
    print(f"  validate: {errors or 'OK'}")

    p2 = Product("", -1)
    errors = p2.validate()
    print(f"  Product('', -1): {p2}")
    print(f"  validate: {errors}")

    # 5) MRO properties
    print("\n[5] MRO properties:")
    print(f"  D is subclass of A: {issubclass(D, A)}")
    print(f"  isinstance(D(), A): {isinstance(d, A)}")
    print(f"  D.__bases__: {tuple(b.__name__ for b in D.__bases__)}")
    print(f"  D.__mro__:   {tuple(c.__name__ for c in D.__mro__)}")

    # 6) C3 consistency check
    print("\n[6] C3 linearization rules:")
    print("  Monotonic: subclass order preserves parent order")
    print("  D(B, C):  B before C (declared order)")
    print("  B's MRO:  B -> A -> object")
    print("  C's MRO:  C -> A -> object")
    print("  D's MRO:  D -> B -> C -> A -> object")
    print("  A appears once, after B and C (consistent)")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 
    run_demo()
