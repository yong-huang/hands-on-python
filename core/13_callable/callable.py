"""
__call__ —— 可调用对象 / 函数式模式
核心要点: __call__ 用法、函数对象、装饰器内部原理、functools

Python 中一切皆对象，函数也不例外。定义了 __call__ 的对象可以像函数一样调用:
obj(args) 实际调用的是 obj.__call__(args)。

核心概念:
- __call__: 让实例像函数一样调用
- 函数对象: 封装状态+行为的可调用对象
- 装饰器原理: @decorator 返回一个带 __call__ 的对象
- 策略模式: 用 __call__ 实现可互换的算法
"""


# ============================================================
# 1. 基础 __call__
# ============================================================

class Multiplier:
    """乘法器: 可调用对象封装倍数"""
    def __init__(self, factor):
        self.factor = factor

    def __call__(self, x):
        return x * self.factor


class Accumulator:
    """累加器: 内部状态随调用变化"""
    def __init__(self, start=0):
        self.total = start

    def __call__(self, x):
        self.total += x
        return self.total


# ============================================================
# 2. 策略模式
# ============================================================

class Formatter:
    """策略模式: 不同的格式化策略"""
    def __init__(self, strategy):
        self.strategy = strategy

    def __call__(self, data):
        return self.strategy(data)


def format_json(data):
    import json
    return json.dumps(data, indent=2)


def format_csv(data):
    if isinstance(data, list) and data:
        headers = data[0].keys()
        return ",".join(headers) + "\n" + "\n".join(
            ",".join(str(row.get(h, "")) for h in headers) for row in data)


def format_table(data):
    if isinstance(data, list) and data:
        rows = [list(data[0].keys())]
        for item in data:
            rows.append([str(item.get(h, "")) for h in data[0].keys()])
        widths = [max(len(str(cell)) for cell in col) for col in zip(*rows)]
        lines = []
        for row in rows:
            lines.append(" | ".join(cell.ljust(w) for cell, w in zip(row, widths)))
        return "\n".join(lines)


# ============================================================
# 3. 验证器链
# ============================================================

class Validator:
    """可组合的验证器"""
    def __init__(self, name, check_fn, error_msg):
        self.name = name
        self.check = check_fn
        self.error_msg = error_msg

    def __call__(self, value):
        if not self.check(value):
            return f"{self.name}: {self.error_msg}"
        return None


def validate_all(validators, value):
    """用多个 __call__ 验证器检查值"""
    errors = []
    for v in validators:
        error = v(value)
        if error:
            errors.append(error)
    return errors


# ============================================================
# 4. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("__call__ -- Callable Objects")
    print("=" * 60)

    # 1) Multiplier
    print("\n[1] Multiplier (callable object):")
    double = Multiplier(2)
    triple = Multiplier(3)
    print(f"  double(5) = {double(5)}")
    print(f"  triple(5) = {triple(5)}")
    print(f"  isinstance(double, Multiplier): {isinstance(double, Multiplier)}")
    print(f"  callable(double): {callable(double)}")

    # 2) Accumulator
    print("\n[2] Accumulator (stateful callable):")
    acc = Accumulator(100)
    print(f"  acc(10) = {acc(10)}")
    print(f"  acc(20) = {acc(20)}")
    print(f"  acc(5)  = {acc(5)}")
    print(f"  acc.total = {acc.total}")

    # 3) Strategy
    print("\n[3] Strategy pattern (callable):")
    data = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
    for strategy, name in [(format_json, "JSON"), (format_csv, "CSV"), (format_table, "Table")]:
        fmt = Formatter(strategy)
        print(f"  {name}:")
        print(f"  {fmt(data)}")

    # 4) Validator
    print("\n[4] Validator chain (composable):")
    validators = [
        Validator("type_check", lambda v: isinstance(v, int), "must be int"),
        Validator("range", lambda v: isinstance(v, int) and 0 < v < 150, "must be 0-150"),
        Validator("parity", lambda v: isinstance(v, int) and v % 2 == 0, "must be even"),
    ]
    for val in [42, 200, 17]:
        errors = validate_all(validators, val)
        status = "OK" if not errors else ", ".join(errors)
        print(f"  {val!r}: {status}")

    # 5) Everything is callable
    print("\n[5] What is callable:")
    print(f"  callable(len): {callable(len)}")
    print(f"  callable(str): {callable(str)}")
    print(f"  callable(Multiplier(2)): {callable(Multiplier(2))}")
    print(f"  callable(42): {callable(42)}")
    print(f"  callable(None): {callable(None)}")

    # 6) __call__ + __repr__
    print("\n[6] __call__ enables function-like + object-like:")
    print("  Objects can have BOTH methods AND be called")
    print("  Functions can hold attributes too (they have __dict__)")
    print("  def fn(): pass")
    print("  fn.custom = 1  # actually OK (functions have __dict__)")
    print("  obj = Multiplier(2)")
    print("  obj.custom = 1  # OK!")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 
    run_demo()
