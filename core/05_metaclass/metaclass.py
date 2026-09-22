"""
元类 —— __new__, __init_subclass__, 类型创建的底层机制
面试高频题: 元类是什么、单例模式、ORM、__init_subclass__

元类是"类的类"。type 是所有类的默认元类。
当你写 class Foo: ... 时，Python 调用 type(name, bases, namespace) 来创建类。

核心概念:
- type() 创建类: MyClass = type("MyClass", (Base,), {"key": val})
- __new__: 控制类的创建过程（修改 namespace）
- __init_subclass__: 子类注册/校验，无需自定义元类
- 单例模式: 元类确保一个类只有一个实例
- ORM 映射: 元类自动将类属性映射为数据库字段

交互示意图: 用浏览器打开 images/metaclass.archify.html
"""


# ============================================================
# 1. type() 手动创建类
# ============================================================

def demo_type_creation():
    """用 type() 函数创建类"""
    print("  1) type() creates a class:")
    # 等价于 class Dog(Animal): species = "Canine"
    Animal = type("Animal", (), {"kingdom": "Animalia"})
    Dog = type("Dog", (Animal,), {"species": "Canine"})

    d = Dog()
    print(f"    Dog.kingdom  = {d.kingdom}")
    print(f"    Dog.species = {d.species}")
    print(f"    type(Dog)    = {type(Dog).__name__}")
    print(f"    type(type)  = {type(type).__name__}")


# ============================================================
# 2. 简易元类 — 自动添加方法
# ============================================================

class AddStrMeta(type):
    """元类: 自动为所有类添加 __str__ 方法"""
    def __new__(mcs, name, bases, namespace):
        # 如果类没有定义 __str__，自动生成一个
        if "__str__" not in namespace:
            def auto_str(self):
                attrs = {k: v for k, v in vars(self).items() if not k.startswith("_")}
                return f"{name}({attrs})"
            namespace["__str__"] = auto_str
        return super().__new__(mcs, name, bases, namespace)


class AutoStr(metaclass=AddStrMeta):
    """使用 AddStrMeta 元类的基类"""
    pass


# ============================================================
# 3. 单例元类
# ============================================================

class SingletonMeta(type):
    """单例元类: 确保类只有一个实例"""
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            instance = super().__call__(*args, **kwargs)
            cls._instances[cls] = instance
        return cls._instances[cls]


class Database(metaclass=SingletonMeta):
    """数据库连接 — 单例"""
    def __init__(self, host="localhost"):
        self.host = host
        self.connected = True

    def query(self, sql):
        return f"[{self.host}] executing: {sql}"


# ============================================================
# 4. 简易 ORM — 元类做字段映射
# ============================================================

class Field:
    """ORM 字段描述"""
    def __init__(self, field_type, column_name=None, primary_key=False):
        self.field_type = field_type
        self.column_name = column_name
        self.primary_key = primary_key

    def __set_name__(self, owner, name):
        self.name = name
        if self.column_name is None:
            self.column_name = name


class OrmMeta(type):
    """ORM 元类: 自动收集字段，生成表名"""
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        # 收集所有 Field 实例
        fields = {}
        for key, val in namespace.items():
            if isinstance(val, Field):
                fields[key] = val
        cls._fields = fields
        cls._table = name.lower()
        return cls


class Model(metaclass=OrmMeta):
    """ORM 基类"""
    @classmethod
    def create_table_sql(cls):
        cols = []
        for name, field in cls._fields.items():
            constraint = " PRIMARY KEY" if field.primary_key else ""
            cols.append(f"{field.column_name} {field.field_type.__name__}{constraint}")
        return f"CREATE TABLE {cls._table} ({', '.join(cols)})"

    @classmethod
    def select_sql(cls, where=""):
        return f"SELECT {', '.join(f.column_name for f in cls._fields.values())} FROM {cls._table}{' WHERE ' + where if where else ''}"

    def insert_sql(self):
        cols = [f.column_name for f in self._fields.values()]
        vals = [repr(getattr(self, name)) for name in self._fields]
        return f"INSERT INTO {self._table} ({', '.join(cols)}) VALUES ({', '.join(vals)})"


# ============================================================
# 5. __init_subclass__ — 无需元类的子类注册
# ============================================================

class EventRegistry:
    """事件注册系统 — 子类自动注册"""
    _handlers = {}
    _subclasses = []

    def __init_subclass__(cls, event_type=None, **kwargs):
        super().__init_subclass__(**kwargs)
        if event_type:
            EventRegistry._handlers[event_type] = cls
        EventRegistry._subclasses.append(cls)

    @classmethod
    def get_handler(cls, event_type):
        return cls._handlers.get(event_type)

    @classmethod
    def all_subclasses(cls):
        return cls._subclasses


class ClickEvent(EventRegistry, event_type="click"):
    def handle(self): return "handling click"


class KeyEvent(EventRegistry, event_type="key"):
    def handle(self): return "handling key press"


# ============================================================
# 6. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("Metaclass -- Demo Mode")
    print("=" * 60)

    # 1) type() 创建类
    print("\n[1] type() class creation:")
    demo_type_creation()

    # 2) AutoStr
    print("\n[2] AddStrMeta (auto __str__):")
    class Person(AutoStr):
        def __init__(self, name, age):
            self.name = name
            self.age = age

    p = Person("Alice", 30)
    print(f"  {p}")

    class Custom(AutoStr):
        def __str__(self):
            return "custom str"

    print(f"  {Custom()}  (has custom __str__, metaclass skipped)")

    # 3) Singleton
    print("\n[3] SingletonMeta:")
    db1 = Database("localhost")
    db2 = Database("remotehost")
    print(f"  db1 is db2: {db1 is db2}")
    print(f"  db1.host: {db1.host}  (first creation wins)")
    print(f"  db1.query('SELECT 1'): {db1.query('SELECT 1')}")

    # 4) ORM
    print("\n[4] Simple ORM (metaclass field mapping):")
    class User(Model):
        id = Field(int, primary_key=True)
        name = Field(str)
        email = Field(str)

    print(f"  User._table: {User._table}")
    print(f"  User._fields: {list(User._fields.keys())}")
    print(f"  CREATE: {User.create_table_sql()}")
    print(f"  SELECT: {User.select_sql()}")
    u = User()
    u.id = 1
    u.name = "Alice"
    u.email = "alice@example.com"
    print(f"  INSERT: {u.insert_sql()}")

    # 5) __init_subclass__
    print("\n[5] __init_subclass__ (no metaclass needed):")
    print(f"  Registered handlers: {list(EventRegistry._handlers.keys())}")
    handler = EventRegistry.get_handler("click")
    if handler:
        print(f"  click handler: {handler().handle()}")
    print(f"  All subclasses: {[c.__name__ for c in EventRegistry.all_subclasses()]}")

    # 6) Type hierarchy
    print("\n[6] Type hierarchy:")
    print(f"  int is instance of type: {isinstance(int, type)}")
    print(f"  type is instance of type: {isinstance(type, type)}")
    print(f"  type(42): {type(42).__name__}")
    print(f"  type(int): {type(int).__name__}")
    print(f"  type(type): {type(type).__name__}")

    print(f"\n{'='*60}")


# ============================================================
# 7. Main
# ============================================================

if __name__ == "__main__":
    run_demo()
    # 只跑 demo; 交互示意图见 images/metaclass.archify.html
