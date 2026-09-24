"""__main__ 守卫演示：直接运行与被导入行为不同。"""

print(f"  [greeter] 模块体执行，__name__ = {__name__!r}")


def greet(name):
    return f"hello, {name}"


if __name__ == "__main__":
    # 只有 python3 greeter.py 直接运行时才成立；
    # 被 import 时 __name__ 是模块名 "greeter"，这段跳过
    print(f"  [greeter] 作为主程序运行: {greet('world')}")
