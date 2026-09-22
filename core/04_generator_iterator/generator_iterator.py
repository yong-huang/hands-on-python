"""
生成器与迭代器协议 —— yield, send, yield from, 惰性求值
核心要点: yield vs return, 生成器表达式, 惰性管道, 协程基础

迭代器协议: __iter__() 返回自身, __next__() 返回下一个元素, StopIteration 结束
生成器: 含 yield 的函数自动变为生成器函数，调用后返回生成器对象（迭代器的一种）

核心概念:
- yield: 暂停函数执行，产出值，下次 next() 从暂停处继续
- send(): 向生成器发送值（协程基础）
- yield from: 委托子生成器（Python 3.3+）
- 生成器表达式: (x**2 for x in range(100)) — 惰性版列表推导
- 惰性管道: map/filter 形式的链式处理，零内存开销

交互示意图: 用浏览器打开 images/generator_iterator.archify.html
"""

import sys
import random


# ============================================================
# 1. 迭代器协议 — 手写迭代器 vs 生成器
# ============================================================

class RangeIterator:
    """手写迭代器: 等价于 range(n)"""

    def __init__(self, n):
        self.n = n
        self.i = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.i >= self.n:
            raise StopIteration
        val = self.i
        self.i += 1
        return val


def range_generator(n):
    """生成器: 同样功能，用 yield 实现"""
    i = 0
    while i < n:
        yield i
        i += 1


# ============================================================
# 2. yield 基础 — 斐波那契数列
# ============================================================

def fibonacci(max_count=20):
    """惰性斐波那契: 只在需要时计算"""
    a, b = 0, 1
    for _ in range(max_count):
        yield a
        a, b = b, a + b


# ============================================================
# 3. send() — 双向通信生成器（协程基础）
# ============================================================

def accumulator():
    """累加器: send() 发送值, yield 返回当前总和"""
    total = 0
    count = 0
    while True:
        received = yield total  # 暂停，返回 total，等待 send
        if received is None:
            break
        total += received
        count += 1
    return count  # StopIteration.value = count


def moving_average():
    """移动平均: send() 发送新值, yield 返回当前均值"""
    total = 0.0
    count = 0
    while True:
        value = yield total / count if count else 0.0
        if value is None:
            break
        total += value
        count += 1


# ============================================================
# 4. yield from — 委托子生成器
# ============================================================

def flatten(items):
    """递归展平嵌套列表"""
    for item in items:
        if isinstance(item, (list, tuple)):
            yield from flatten(item)  # 委托子生成器
        else:
            yield item


def chain(*generators):
    """连接多个生成器"""
    for g in generators:
        yield from g


# ============================================================
# 5. 惰性管道 — 无限数据处理
# ============================================================

def integers(start=0):
    """无限整数序列"""
    while True:
        yield start
        start += 1


def take(n, iterable):
    """从迭代器取前 n 个"""
    for i, item in enumerate(iterable):
        if i >= n:
            break
        yield item


def filter_gen(predicate, iterable):
    """惰性过滤"""
    for item in iterable:
        if predicate(item):
            yield item


def map_gen(func, iterable):
    """惰性映射"""
    for item in iterable:
        yield func(item)


# ============================================================
# 6. 生成器 vs 列表 — 内存对比
# ============================================================

def demo_memory():
    """对比生成器和列表的内存使用"""
    import sys

    # 列表: 一次性全部存入内存
    list_data = [x**2 for x in range(100000)]
    list_size = sys.getsizeof(list_data) + sum(sys.getsizeof(x) for x in list_data[:1000]) * 100

    # 生成器: 只存迭代器状态
    gen_expr = (x**2 for x in range(100000))
    gen_size = sys.getsizeof(gen_expr)

    print(f"  List comprehension:  ~{list_size // 1024:,d} KB")
    print(f"  Generator expression: {gen_size} bytes")
    print(f"  Ratio: ~{int(list_size / max(gen_size, 1)):,d}x smaller")

    # 实际使用
    print("\n  List: first 5 of [x**2 for x in range(100000)]:")
    print(f"    {[x**2 for x in range(5)]}")
    print(f"    (all 100000 values computed and stored)")

    print("\n  Generator: first 5 of (x**2 for x in range(100000)):")
    gen = (x**2 for x in range(100000))
    print(f"    {[next(gen) for _ in range(5)]}")
    print(f"    (only 5 values computed)")


# ============================================================
# 7. 实战: 日志文件惰性解析
# ============================================================

def log_lines():
    """模拟生成日志行"""
    levels = ["INFO", "WARNING", "ERROR", "DEBUG"]
    messages = [
        "request processed", "cache miss", "connection timeout",
        "auth failed", "db query slow", "file uploaded",
    ]
    for i in range(50):
        ts = f"2024-01-{(i%30)+1:02d} 10:{i%60:02d}:{i%60:02d}"
        level = random.choice(levels)
        msg = random.choice(messages)
        yield f"[{ts}] [{level}] {msg}"


def parse_log(lines):
    """从日志行生成 (timestamp, level, message)"""
    for line in lines:
        # 简单解析
        parts = line.split("] ")
        if len(parts) >= 3:
            ts = parts[0][1:]
            level = parts[1][1:]
            msg = parts[2]
            yield (ts, level, msg)


def filter_errors(parsed_lines):
    """只保留 ERROR 级别"""
    for ts, level, msg in parsed_lines:
        if level == "ERROR":
            yield (ts, msg)


def pipeline_demo():
    """惰性管道: 日志生成 → 解析 → 过滤 → 取前5条"""
    print("  Lazy pipeline: log_lines → parse → filter_errors → take(5)")
    result = list(take(5, filter_errors(parse_log(log_lines()))))
    for ts, msg in result:
        print(f"    [{ts}] {msg}")


# ============================================================
# 8. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("Generator & Iterator -- Demo Mode")
    print("=" * 60)

    # 1) Iterator protocol
    print("\n[1] Iterator protocol:")
    print("  class-based:")
    it = RangeIterator(5)
    print(f"    list(RangeIterator(5)) = {list(it)}")

    print("  generator:")
    print(f"    list(range_generator(5)) = {list(range_generator(5))}")

    # 2) Fibonacci
    print("\n[2] Fibonacci (lazy):")
    fib = fibonacci(10)
    print(f"    first 10: {list(fib)}")
    print(f"    take(20): {[x for x in take(20, fibonacci(100))]}")

    # 3) send()
    print("\n[3] send() — bidirectional generator:")
    print("  accumulator:")
    gen = accumulator()
    next(gen)  # prime: advance to first yield
    for val in [10, 20, 30]:
        result = gen.send(val)
        print(f"    send({val}) -> total={result}")
    try:
        gen.send(None)  # signal stop
    except StopIteration as e:
        print(f"    StopIteration: processed {e.value} values")

    print("  moving_average:")
    ma = moving_average()
    next(ma)
    for val in [10, 20, 30, 40, 50]:
        result = ma.send(val)
        print(f"    send({val}) -> avg={result:.1f}")

    # 4) yield from
    print("\n[4] yield from — delegation:")
    nested = [1, [2, 3, [4, 5]], 6, [7, 8, 9]]
    print(f"  flatten({nested}) = {list(flatten(nested))}")

    g1 = range_generator(3)
    g2 = range_generator(5)
    print(f"  chain(range(3), range(5)) = {list(chain(g1, g2))}")

    # 5) Lazy pipeline
    print("\n[5] Lazy pipeline (infinite stream):")
    # 取前10个偶数的平方
    result = list(take(10,
        filter_gen(lambda x: x % 2 == 0,
            map_gen(lambda x: x**2,
                integers()))))
    print(f"  First 10 even squares: {result}")

    # 6) Memory comparison
    print("\n[6] Generator vs List — memory:")
    demo_memory()

    # 7) Log pipeline
    print("\n[7] Log processing pipeline:")
    pipeline_demo()

    # 8) Generator state
    print("\n[8] Generator state inspection:")
    gen = fibonacci(5)
    print(f"  type: {type(gen).__name__}")
    print(f"  gi_running: {gen.gi_running}")
    print(f"  gi_frame: {gen.gi_frame is not None}")
    next(gen)
    print(f"  after next(): gi_frame={gen.gi_frame is not None}")
    list(gen)  # exhaust
    print(f"  after exhaust: gi_frame={gen.gi_frame}")

    print(f"\n{'='*60}")


# ============================================================
# 9. Main
# ============================================================

if __name__ == "__main__":
    run_demo()
    # 只跑 demo; 交互示意图见 images/generator_iterator.archify.html
