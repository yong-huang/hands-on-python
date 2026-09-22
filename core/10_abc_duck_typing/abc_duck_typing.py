"""
ABC 抽象基类与 Duck Typing
面试高频题: ABC vs interface、Protocol (PEP 544)、isinstance 检查、多态

Python 的多态基于 Duck Typing（"如果它走起来像鸭子，它就是鸭子"），
不要求显式继承接口。ABC (Abstract Base Class) 提供可选的类型约束，
在运行时强制子类实现必需的方法。

核心概念:
- Duck Typing: 关注行为（方法/属性），不关注类型
- ABC: @abstractmethod 强制子类实现接口
- ABCMeta: 元类，使 isinstance(instance, AbstractClass) / issubclass(subclass, AbstractClass) 生效
- virtual subclass: register() 不继承也能通过 isinstance
- Protocol: 结构化子类型（PEP 544），更灵活的 ABC

交互示意图: 用浏览器打开 images/abc_duck_typing.archify.html
"""

from abc import ABC, abstractmethod, ABCMeta


# ============================================================
# 1. Duck Typing — 无需继承
# ============================================================

def quack(duck):
    """只要对象有 speak() 方法，就能调用"""
    return duck.speak()


class Duck:
    def speak(self):
        return "Quack!"


class Robot:
    def speak(self):
        return "Beep boop!"


class Person:
    def talk(self):
        return "Hello!"


# ============================================================
# 2. ABC — 抽象基类
# ============================================================

class Transport(ABC):
    """抽象基类: 强制子类实现接口"""

    @abstractmethod
    def deliver(self, destination: str) -> str:
        """交付货物到目的地"""

    @abstractmethod
    def max_capacity(self) -> int:
        """最大载重量"""

    def shipping_label(self, destination: str) -> str:
        """非抽象方法: 提供默认实现"""
        return f"[{self.__class__.__name__}] -> {destination} (cap: {self.max_capacity()})"


class Truck(Transport):
    def deliver(self, destination: str) -> str:
        return f"Driving to {destination}"

    def max_capacity(self) -> int:
        return 10_000


class Drone(Transport):
    def deliver(self, destination: str) -> str:
        return f"Flying to {destination}"

    def max_capacity(self) -> int:
        return 50


# ============================================================
# 3. register() — 虚拟子类
# ============================================================

class ExternalLogistics:
    """第三方物流类 — 没有继承 Transport"""
    def deliver(self, destination: str) -> str:
        return f"External delivery to {destination}"

    def max_capacity(self) -> int:
        return 5_000


Transport.register(ExternalLogistics)


# ============================================================
# 4. 自定义 ABC — 带接口校验
# ============================================================

class CacheInterface(ABC):
    """缓存接口"""

    @abstractmethod
    def get(self, key: str):
        """获取值"""

    @abstractmethod
    def set(self, key: str, value):
        """设置值"""

    @abstractmethod
    def delete(self, key: str):
        """删除值"""


class MemoryCache(CacheInterface):
    def __init__(self):
        self._store = {}

    def get(self, key: str):
        return self._store.get(key)

    def set(self, key: str, value):
        self._store[key] = value

    def delete(self, key: str):
        self._store.pop(key, None)

    def __repr__(self):
        return f"MemoryCache({len(self._store)} items)"


class RedisCache(CacheInterface):
    """模拟 Redis 缓存"""
    def __init__(self):
        self._store = {}

    def get(self, key: str):
        return self._store.get(key)

    def set(self, key: str, value):
        self._store[key] = value

    def delete(self, key: str):
        self._store.pop(key, None)

    def __repr__(self):
        return f"RedisCache({len(self._store)} items)"


# ============================================================
# 5. 多态使用
# ============================================================

def ship_item(transport, destination: str, item: str):
    """统一接口: 任何有 deliver() 的对象都能用"""
    method = transport.deliver(destination)
    result = f"{method} with '{item}'"
    if hasattr(transport, "shipping_label"):
        result += f"\n  {transport.shipping_label(destination)}"
    return result


def cache_demo(cache: CacheInterface):
    """统一接口: 任何 Cache 实现都能用"""
    cache.set("key1", "value1")
    cache.set("key2", "value2")
    v1 = cache.get("key1")
    cache.delete("key2")
    v2 = cache.get("key2")
    return v1, v2


# ============================================================
# 6. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("ABC & Duck Typing -- Demo Mode")
    print("=" * 60)

    # 1) Duck typing
    print("\n[1] Duck Typing (no inheritance needed):")
    for obj in [Duck(), Robot()]:
        print(f"  quack({type(obj).__name__}): {quack(obj)}")

    print("  Person has talk() not speak():")
    try:
        quack(Person())
    except AttributeError as e:
        print(f"  AttributeError: {e}")

    # 2) ABC
    print("\n[2] ABC (abstract base class):")
    truck = Truck()
    drone = Drone()
    print(f"  Truck:  {ship_item(truck, 'Warehouse A', 'Electronics')}")
    print(f"  Drone:  {ship_item(drone, 'Tower B', 'Medicine')}")

    # Cannot instantiate abstract class
    print("\n  Cannot instantiate abstract Transport:")
    try:
        Transport()
    except TypeError as e:
        print(f"  TypeError: {e}")

    # 3) register() virtual subclass
    print("\n[3] register() — virtual subclass:")
    ext = ExternalLogistics()
    print(f"  isinstance(ExternalLogistics(), Transport): {isinstance(ext, Transport)}")
    print(f"  issubclass(ExternalLogistics, Transport): {issubclass(ExternalLogistics, Transport)}")
    print(f"  Ship: {ship_item(ext, 'Port C', 'Package')}")

    # 4) ABC hierarchy
    print("\n[4] ABC hierarchy:")
    print(f"  Transport.__subclasses__(): {[c.__name__ for c in Transport.__subclasses__()]}")
    # registered 虚拟子类不算 __subclasses__，但 issubclass 为 True
    print(f"  ExternalLogistics is virtual subclass: {issubclass(ExternalLogistics, Transport)}")

    # 5) Cache interface
    print("\n[5] CacheInterface (polymorphism):")
    for cache_impl in [MemoryCache(), RedisCache()]:
        print(f"  Using {cache_impl}:")
        v1, v2 = cache_demo(cache_impl)
        print(f"    get('key1') = {v1}, get('key2') after delete = {v2}")

    # 6) Duck typing vs ABC comparison
    print("\n[6] Duck Typing vs ABC:")
    print("  Duck Typing:")
    print("    + Flexible: any object with matching methods")
    print("    + No inheritance required")
    print("    - No compile-time / import-time checks")
    print("    - AttributeError at runtime if method missing")
    print("  ABC:")
    print("    + isinstance() checks work")
    print("    + Cannot forget to implement methods")
    print("    + register() for third-party classes")
    print("    - Requires inheritance (or register)")

    # 7) Protocol (Python 3.8+)
    print("\n[7] Protocol (PEP 544, Python 3.8+):")
    try:
        from typing import Protocol, runtime_checkable

        @runtime_checkable
        class Speakable(Protocol):
            def speak(self) -> str: ...

        print(f"  isinstance(Duck(), Speakable): {isinstance(Duck(), Speakable)}")
        print(f"  isinstance(Robot(), Speakable): {isinstance(Robot(), Speakable)}")
        print(f"  isinstance(Person(), Speakable): {isinstance(Person(), Speakable)}")
        print("  Protocol = structural typing (no inheritance)")
    except ImportError:
        print("  (Python < 3.8, Protocol not available)")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 交互示意图见 images/abc_duck_typing.archify.html
    run_demo()
