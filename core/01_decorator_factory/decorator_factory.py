import time
import functools
import random


# ── 1. 基础装饰器（无参数，最简形态：接收函数，返回包装函数）──

def basic_timer(func):
    """计时装饰器：一切装饰器的最小骨架"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"  [timer] {func.__name__} 耗时 {(time.perf_counter() - t0) * 1000:.1f}ms")
        return result
    return wrapper


# ── 2. 带参装饰器（装饰器工厂：三层嵌套）──

def retry(times=3, delay=0.5):
    """失败重试：第 1 层收参数，第 2 层收函数，第 3 层收调用参数"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for i in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if i == times:
                        raise
                    print(f"  第{i}次失败: {e}, {delay}s后重试")
                    time.sleep(delay)
        return wrapper
    return decorator


def ttl_cache(ttl=60.0):
    """带过期缓存：闭包变量 store 在多次调用间持久存在"""
    def decorator(func):
        store = {}
        @functools.wraps(func)
        def wrapper(*args):
            now = time.time()
            if args in store:
                ts, val = store[args]
                if now - ts < ttl:
                    return val
            result = func(*args)
            store[args] = (now, result)
            return result
        return wrapper
    return decorator


def log_call(level="INFO"):
    """日志记录：装饰器参数 level 在闭包中持久化"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args):
            print(f"  [{level}] {func.__name__}({args})")
            result = func(*args)
            print(f"  [{level}] → {result}")
            return result
        return wrapper
    return decorator


# ── 3. 类装饰器（用类实现装饰器：__init__ 接函数，__call__ 接调用）──

class CountCalls:
    """与函数版装饰器等价；额外持有状态（计数器），比闭包更直观"""

    def __init__(self, func):
        functools.update_wrapper(self, func)  # wraps 的类版等价写法
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"  [CountCalls] {self.func.__name__} 第 {self.count} 次调用")
        return self.func(*args, **kwargs)


# ── 4. 装饰类的装饰器（接收类，返回类）──

def singleton(cls):
    """单例：拦截实例化，同类只建一个对象。
    注意：装饰后模块里拿到的是工厂函数 get_instance 而非类本身，
    isinstance 仍正常（实例确实是 cls 建的），但 cls(...) 语义已被接管"""
    instances = {}

    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return get_instance


def add_repr(cls):
    """给类自动补 __repr__：不碰 __init__、只补方法的"类增强"型装饰器"""
    def __repr__(self):
        attrs = ", ".join(f"{k}={v!r}" for k, v in vars(self).items())
        return f"{cls.__name__}({attrs})"
    cls.__repr__ = __repr__
    return cls


# ── 5. 被装饰的示例函数 ──

@basic_timer
def busy_wait(ms):
    time.sleep(ms / 1000)
    return f"等了 {ms}ms"


@retry(times=3, delay=0.1)
def fetch(url):
    if random.random() < 0.6:
        raise ConnectionError(f"连接 {url} 失败")
    return f"OK from {url}"


@ttl_cache(ttl=2.0)
def compute(x, y):
    time.sleep(0.3)
    return x ** y


@log_call("DEBUG")
def add(a, b):
    return a + b


@CountCalls
def greet(name):
    return f"hi, {name}"


@singleton
class Config:
    def __init__(self, env):
        self.env = env


@add_repr
class User:
    def __init__(self, name, role):
        self.name = name
        self.role = role


# ── 6. 标准库实用装饰器速览（详见 lab 20）──

@functools.lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)


@functools.singledispatch
def jsonable(value):
    """按第一个参数的类型分发；object 为默认实现"""
    return value


@jsonable.register
def _(value: set):
    return sorted(value)


@jsonable.register
def _(value: tuple):
    return list(value)


# ── 7. 主入口 ──

def main():
    print("=== 装饰器全家桶 ===\n")

    print("1. 基础装饰器 @basic_timer:")
    print(f"  → {busy_wait(120)}\n")

    print("2. 装饰器工厂 @retry / @ttl_cache / @log_call:")
    for _ in range(2):
        try:
            print(f"  → {fetch('https://api.example.com')}\n")
        except Exception as e:
            print(f"  → 最终失败: {e}\n")
    t0 = time.time()
    r1 = compute(2, 10)
    print(f"  首次: {r1} ({time.time() - t0:.2f}s)")
    t0 = time.time()
    r2 = compute(2, 10)
    print(f"  缓存: {r2} ({time.time() - t0:.2f}s)")
    add(3, 4)

    print("\n3. 类装饰器 @CountCalls:")
    greet("Alice")
    greet("Bob")
    print(f"  总计: greet.count = {greet.count}")
    print(f"  元信息保留: greet.__name__ = {greet.__name__}\n")

    print("4. 装饰类的装饰器 @singleton / @add_repr:")
    a, b = Config("prod"), Config("dev")
    print(f"  Config('prod') is Config('dev') → {a is b} (env={a.env})")
    print(f"  User → {User('alice', 'admin')!r}\n")

    print("5. 标准库实用装饰器:")
    print(f"  fib(30) = {fib(30)}, lru_cache: {fib.cache_info()}")
    print(f"  jsonable({{3,1,2}}) = {jsonable({3, 1, 2})}, jsonable((4,5)) = {jsonable((4, 5))}")


if __name__ == "__main__":
    main()
