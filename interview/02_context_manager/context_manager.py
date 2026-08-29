"""
上下文管理器与 with 语句
面试高频题: __enter__/__exit__, contextlib, 资源管理, 异常安全

上下文管理器是 Python 中保证资源正确获取和释放的机制。
with 语句的背后是 __enter__ 和 __exit__ 的协议。

核心概念:
- 类式: __enter__ 返回资源, __exit__ 负责清理（即使异常）
- 函数式: @contextmanager + yield，generator 自动拆分为 enter/exit
- 异常安全: __exit__ 返回 True 吞异常，False/None 传播异常
- 嵌套: with A(), B(): 等价于嵌套调用
- suppress: 上下文管理器替代 try/except 的简洁写法

示意图: python3 scripts/gen_diagram.py 生成 images/context_manager.png
"""

import time
import threading
import os
import io
from contextlib import contextmanager, suppress, redirect_stdout

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


# ============================================================
# 1. 类式上下文管理器 — __enter__ / __exit__
# ============================================================

class Timer:
    """计时器: with Timer() as t: ... print(t.elapsed)"""

    def __init__(self, name="block"):
        self.name = name
        self.elapsed = 0.0
        self._start = None

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = time.perf_counter() - self._start
        print(f"  [{self.name}] {self.elapsed:.4f}s")
        return False  # 不吞异常


class FileLock:
    """模拟文件锁: with FileLock("data.txt") as lock: ..."""

    def __init__(self, path):
        self.path = path
        self._lock = threading.Lock()
        self.acquired = False

    def __enter__(self):
        self._lock.acquire()
        self.acquired = True
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._lock.release()
        self.acquired = False
        return False


class Transaction:
    """模拟数据库事务: 成功自动 commit, 异常自动 rollback"""

    def __init__(self, name="tx"):
        self.name = name
        self.committed = False
        self.rolled_back = False
        self._log = []

    def execute(self, sql):
        self._log.append(sql)

    def __enter__(self):
        print(f"  [TX:{self.name}] BEGIN")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.committed = True
            print(f"  [TX:{self.name}] COMMIT ({len(self._log)} ops)")
        else:
            self.rolled_back = True
            print(f"  [TX:{self.name}] ROLLBACK ({exc_type.__name__}: {exc_val})")
        return True  # 吞异常，事务回滚后不再传播


# ============================================================
# 2. 函数式上下文管理器 — @contextmanager
# ============================================================

@contextmanager
def temporary_file(content, suffix=".txt"):
    """创建临时文件，with 块结束后自动删除"""
    path = os.path.join(SCRIPT_DIR, f"_tmp_ctx_{os.getpid()}{suffix}")
    try:
        with open(path, "w") as f:
            f.write(content)
        print(f"  [tempfile] created: {path}")
        yield path
    finally:
        if os.path.exists(path):
            os.remove(path)
            print(f"  [tempfile] deleted: {path}")


@contextmanager
def benchmark(label):
    """计时 + 异常安全的 benchmark 上下文"""
    start = time.perf_counter()
    errors = []
    try:
        yield errors
    except Exception as e:
        errors.append(e)
    finally:
        elapsed = time.perf_counter() - start
        status = "FAIL" if errors else "OK"
        print(f"  [bench:{label}] {elapsed:.4f}s [{status}]")


# ============================================================
# 3. contextlib 工具 — suppress / redirect_stdout
# ============================================================

def demo_suppress():
    """suppress: 静默指定异常"""
    print("  suppress demo:")
    with suppress(FileNotFoundError):
        open("/nonexistent/file.txt")
        print("    (should not reach here)")

    print("    FileNotFoundError was silently suppressed")

    # 等价于:
    # try:
    #     open("/nonexistent/file.txt")
    # except FileNotFoundError:
    #     pass


def demo_redirect():
    """redirect_stdout: 捕获 print 输出"""
    print("  redirect_stdout demo:")
    buf = io.StringIO()
    with redirect_stdout(buf):
        print("This goes to buffer, not stdout")
        print("Line 2")
    captured = buf.getvalue()
    print(f"    Captured {len(captured)} chars: '{captured.strip()}'")


# ============================================================
# 4. 嵌套上下文管理器
# ============================================================

def demo_nested():
    """嵌套 with: 原子性的写入操作"""
    print("  nested context demo:")

    with Transaction("write_batch") as tx:
        tx.execute("INSERT INTO users VALUES (1, 'Alice')")
        tx.execute("INSERT INTO users VALUES (2, 'Bob')")
        tx.execute("UPDATE stats SET count = count + 2")

    print(f"    committed={tx.committed}, rolled_back={tx.rolled_back}")

    # 异常场景
    with Transaction("failing_tx") as tx:
        tx.execute("INSERT INTO logs VALUES ('start')")
        raise ValueError("simulated error")

    print(f"    committed={tx.committed}, rolled_back={tx.rolled_back}")


# ============================================================
# 5. __exit__ 返回值与异常传播
# ============================================================

class ExceptionSwallower:
    """__exit__ 返回 True 吞异常"""

    def __init__(self, swallow=True):
        self.swallow = swallow

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.swallow:
            print(f"    [swallower] swallowed: {exc_type.__name__}: {exc_val}")
            return True  # 异常被吞掉
        return False  # 异常继续传播


def demo_exit_return():
    """演示 __exit__ 返回值对异常传播的影响"""
    print("  __exit__ return value demo:")

    print("  [1] swallow=True (异常被吞):")
    with ExceptionSwallower(swallow=True):
        1 / 0
    print("    code after with: reached (exception swallowed)")

    print("  [2] swallow=False (异常传播):")
    try:
        with ExceptionSwallower(swallow=False):
            1 / 0
    except ZeroDivisionError:
        print("    ZeroDivisionError propagated (as expected)")


# ============================================================
# 6. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("Context Manager -- Demo Mode")
    print("=" * 60)

    # 1) Timer
    print("\n[1] Timer:")
    with Timer("sort_10k") as t:
        sorted(range(10000, 0, -1))
    with Timer("sort_100k") as t:
        sorted(range(100000, 0, -1))

    # 2) Transaction
    print("\n[2] Transaction (class-based):")
    with Transaction("insert_user") as tx:
        tx.execute("INSERT INTO users (name) VALUES ('Alice')")
        tx.execute("INSERT INTO users (name) VALUES ('Bob')")
    print(f"  committed={tx.committed}")

    print("\n  Transaction with error:")
    with Transaction("fail") as tx:
        tx.execute("INSERT INTO users (name) VALUES ('Charlie')")
        raise RuntimeError("connection lost")
    print(f"  committed={tx.committed}, rolled_back={tx.rolled_back}")

    # 3) Temporary file
    print("\n[3] Temporary file (@contextmanager):")
    with temporary_file("Hello, context!", suffix=".txt") as path:
        with open(path) as f:
            print(f"  content: {f.read()}")
        print(f"  file exists: {os.path.exists(path)}")
    print(f"  after with, file exists: {os.path.exists(path)}")

    # 4) Benchmark
    print("\n[4] Benchmark (@contextmanager):")
    with benchmark("list_comp") as errs:
        result = [x**2 for x in range(100000)]
    with benchmark("failing_op") as errs:
        result = [x**2 for x in range(100000)]
        raise ValueError("oops")
    print(f"  errors captured: {[str(e) for e in errs]}")

    # 5) suppress / redirect
    print("\n[5] contextlib utilities:")
    demo_suppress()
    demo_redirect()

    # 6) Nested
    print("\n[6] Nested contexts:")
    demo_nested()

    # 7) __exit__ return value
    print("\n[7] __exit__ return value:")
    demo_exit_return()

    print(f"\n{'='*60}")


# ============================================================
# 7. Main
# ============================================================

if __name__ == "__main__":
    run_demo()
    # 只跑 demo; 可视化图由 scripts/gen_diagram.py 生成
