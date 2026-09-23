"""
property 深度剖析 —— getter / setter / deleter
核心要点: property 本质、setter 验证、只读属性、property vs descriptor

@property 是 Python 中实现"受控属性访问"的语法糖。
本质是一个数据描述符（同时定义 __get__ + __set__）。

核心概念:
- @property: 将方法变为属性访问 (obj.x 而非 obj.x())
- @x.setter: 控制 x 的赋值（验证/触发副作用）
- @x.deleter: 控制 del obj.x
- property 本质就是 data descriptor
- 缓存场景可用 functools.cached_property (非数据描述符, 见 README Q5)
"""


# ============================================================
# 1. 基础 property
# ============================================================

class Circle:
    """圆: property 保护半径"""
    def __init__(self, radius):
        self.radius = radius

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        if value <= 0:
            raise ValueError(f"Radius must be positive, got {value}")
        self._radius = value

    @radius.deleter
    def radius(self):
        print("  [delete] radius reset to 0")
        self._radius = 0

    @property
    def area(self):
        return 3.14159 * self._radius ** 2

    @property
    def circumference(self):
        return 2 * 3.14159 * self._radius


# ============================================================
# 2. 计算属性（只读）
# ============================================================

class Rectangle:
    """矩形: 面积/周长是计算属性"""
    def __init__(self, width, height):
        self.width = width
        self.height = height

    @property
    def area(self):
        return self.width * self.height

    @property
    def perimeter(self):
        return 2 * (self.width + self.height)


# ============================================================
# 3. 带副作用的 setter
# ============================================================

class Temperature:
    """温度: 自动同步摄氏/华氏"""
    def __init__(self, celsius):
        self._celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        self._celsius = value

    @property
    def fahrenheit(self):
        return self._celsius * 9 / 5 + 32

    @fahrenheit.setter
    def fahrenheit(self, value):
        self._celsius = (value - 32) * 5 / 9


# ============================================================
# 4. property 的描述符本质
# ============================================================

def reveal_property():
    """揭示 property 的描述符本质"""
    p = property(lambda self: self.x)
    print(f"  property is descriptor: has __get__={hasattr(p, '__get__')}, "
          f"__set__={hasattr(p, '__set__')}, __delete__={hasattr(p, '__delete__')}")
    print(f"  type(property): {type(property)}")


# ============================================================
# 5. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("property -- Demo Mode")
    print("=" * 60)

    # 1) Basic
    print("\n[1] Circle with property validation:")
    c = Circle(5)
    print(f"  c.radius = {c.radius}")
    print(f"  c.area = {c.area:.2f}")
    print(f"  c.circumference = {c.circumference:.2f}")
    try:
        c.radius = -1
    except ValueError as e:
        print(f"  c.radius = -1 -> ValueError: {e}")

    # 2) Read-only
    print("\n[2] Read-only computed property:")
    r = Rectangle(3, 4)
    print(f"  r.width=3, r.height=4")
    print(f"  r.area = {r.area}")
    try:
        r.area = 100
    except AttributeError as e:
        print(f"  r.area = 100 -> AttributeError (no setter)")

    # 3) Synced properties
    print("\n[3] Temperature (synced celsius/fahrenheit):")
    t = Temperature(100)
    print(f"  t.celsius = {t.celsius}")
    print(f"  t.fahrenheit = {t.fahrenheit:.1f}")
    t.fahrenheit = 212
    print(f"  After t.fahrenheit = 212:")
    print(f"  t.celsius = {t.celsius}")
    print(f"  t.fahrenheit = {t.fahrenheit:.1f}")

    # 4) Descriptor nature
    print("\n[4] property is a data descriptor:")
    reveal_property()

    # 5) property vs method
    print("\n[5] property vs method:")
    print("  @property: c.area        (attribute access)")
    print("  @method:   c.calc_area()  (method call)")
    print("  Rule: simple data -> property")
    print("        computation with params -> method")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 
    run_demo()
