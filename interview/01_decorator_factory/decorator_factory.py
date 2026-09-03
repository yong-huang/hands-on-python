"""
装饰器工厂 —— 带参数的装饰器
面试高频题: 装饰器、闭包、functools.wraps

交互示意图: 用浏览器打开 images/decorator_factory.archify.html
"""

import time
import functools


# ── 1. 三个带参装饰器 ──

def retry(times=3, delay=0.5):
    """失败重试"""
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


def cache(ttl=60.0):
    """带过期缓存"""
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
    """日志记录"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args):
            print(f"  [{level}] {func.__name__}({args})")
            result = func(*args)
            print(f"  [{level}] → {result}")
            return result
        return wrapper
    return decorator


# ── 2. 演示 ──

@retry(times=3, delay=0.1)
def fetch(url):
    import random
    if random.random() < 0.6:
        raise ConnectionError(f"连接 {url} 失败")
    return f"OK from {url}"


@cache(ttl=2.0)
def compute(x, y):
    time.sleep(0.3)
    return x ** y


@log_call("DEBUG")
def add(a, b):
    return a + b


# ── 3. 主入口 ──

def main():
    print("=== 装饰器工厂 ===\n")

    print("1. @retry:")
    for _ in range(2):
        try:
            print(f"  → {fetch('https://api.example.com')}\n")
        except Exception as e:
            print(f"  → 最终失败: {e}\n")

    print("2. @cache:")
    t0 = time.time()
    r1 = compute(2, 10)
    print(f"  首次: {r1} ({time.time()-t0:.2f}s)")
    t0 = time.time()
    r2 = compute(2, 10)
    print(f"  缓存: {r2} ({time.time()-t0:.2f}s)")

    print("\n3. @log_call:")
    add(3, 4)
    # 只跑 demo; 交互示意图见 images/decorator_factory.archify.html


if __name__ == "__main__":
    main()
