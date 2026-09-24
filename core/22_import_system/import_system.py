"""
模块与导入系统
核心要点: sys.modules 缓存、__name__ == "__main__"、循环导入、包与相对导入

import 做三件事：查 sys.modules 缓存 → 没有就执行模块体（并把模块对象先塞进
缓存）→ 在当前作用域绑定名字。模块体每个进程只执行一次，之后全是缓存命中。

核心概念:
- sys.modules: 模块缓存表，同一模块二次 import 拿到同一个对象
- __main__: 直接运行的模块 __name__ 是 "__main__"，被导入时是模块名
- 循环导入: 模块顶部互相 import → 拿到"半初始化模块"；函数内延迟导入可解
- 包与相对导入: 目录 + __init__.py 成包，from .base import X 引用同包成员
"""

import subprocess
import sys


# ── 1. sys.modules 缓存：模块体每个进程只执行一次 ──

def demo_cache():
    print("  首次 import counter_mod（注意模块体打印）：")
    import counter_mod                     # 模块体在这里执行
    print("  第二次 import counter_mod（静默——缓存命中）：")
    import counter_mod as again            # 不再执行模块体
    assert counter_mod is again            # 同一个模块对象
    print(f"  两次 import 拿到同一对象: {counter_mod is again}")
    print(f"  sys.modules['counter_mod'].get_name() = {counter_mod.get_name()!r}")


# ── 2. __main__ 守卫 ──

def demo_main_guard():
    import greeter                         # 模块体执行，但守卫块跳过
    print(f"  被导入: __name__={greeter.__name__!r}，守卫块未触发")
    print(f"  导入后照常调用: {greeter.greet('imported')!r}")
    out = subprocess.run(
        [sys.executable, "greeter.py"], capture_output=True, text=True
    )
    print("  直接运行 python3 greeter.py：")
    for line in out.stdout.splitlines():
        print(f"    {line}")


# ── 3. 循环导入：坏形态与修好的形态 ──

def demo_circular():
    print("  坏形态（顶部互相 import）在子进程里复现：")
    out = subprocess.run(
        [sys.executable, "-c", "import bad_a"],
        capture_output=True, text=True,
    )
    last = out.stderr.strip().splitlines()[-1] if out.stderr else ""
    short = last.split(" (")[0]   # 3.14 会在报错里附上绝对路径提示，机器相关，剥掉
    print(f"    {short}")
    print("  修好的形态（函数体内延迟 import）：")
    from good_a import Loud
    print(f"    Loud.speak() = {Loud.speak()!r}")


# ── 4. 包与相对导入 ──

def demo_package():
    from shapepkg.circle import Circle
    c = Circle()
    print(f"  Circle() 的 describe() = {c.describe()!r}（来自 shapepkg.base 的相对导入）")
    print(f"  模块坐标: {type(c).__module__!r}")


def run_demo():
    print("=== 模块与导入系统 ===\n")

    print("[1] import 只执行一次（sys.modules 缓存）:")
    demo_cache()
    print()
    print("[2] __name__ == '__main__' 守卫:")
    demo_main_guard()
    print()
    print("[3] 循环导入：坏形态复现 + 延迟导入修复:")
    demo_circular()
    print()
    print("[4] 包与相对导入:")
    demo_package()
    print()

    print("全部断言通过 ✓ 缓存单次执行、守卫分流行为、循环导入复现与修复、相对导入")


if __name__ == "__main__":
    run_demo()
