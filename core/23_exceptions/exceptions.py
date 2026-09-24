"""
异常机制与异常链
核心要点: 异常层次、raise from（__cause__/__context__）、except* 与 ExceptionGroup、自定义异常体系

异常是 Python 的控制流机制：EAFP 风格"先做再问"，出错沿调用栈向上传播直到被处理。

核心概念:
- 异常层次: 异常也是类，except 按继承匹配——捕基类等于捕全家
- 异常链: except 里再 raise 会隐式记 __context__；raise ... from e 显式记 __cause__
- ExceptionGroup / except*: 一组异常打包抛出，按类型分组捕获（3.11+）
- 自定义异常: 业务异常继承 Exception 起自己的基类，分层捕获才有意义
"""

import asyncio


# ── 1. 异常层次与 EAFP ──

def eafp_get(mapping, key):
    try:
        return mapping[key]          # 先做，错了再处理
    except KeyError:
        return f"<missing {key}>"


# ── 2. 异常链：隐式 __context__ 与显式 __cause__ ──

def implicit_chain():
    try:
        int("not-a-number")
    except ValueError:
        raise RuntimeError("上层只说配置解析失败")   # 隐式链：__context__ 记住原始异常


def explicit_chain():
    try:
        int("not-a-number")
    except ValueError as e:
        raise RuntimeError("上层只说配置解析失败") from e   # 显式：__cause__ = e


# ── 3. ExceptionGroup 与 except*（3.11+）──

def make_group():
    eg = ExceptionGroup("批量校验失败", [
        ValueError("字段 A 非法"),
        ValueError("字段 B 非法"),
        KeyError("字段 C 缺失"),
    ])
    try:
        raise eg
    except* ValueError as verrors:      # 只挑出 ValueError 分支
        assert len(verrors.exceptions) == 2
    except* KeyError as kerrors:        # KeyError 分支独立捕获
        assert len(kerrors.exceptions) == 1


# ── 4. 自定义异常体系 ──

class AppError(Exception):
    """业务异常基类：外层按它统一兜底"""


class ConfigError(AppError):
    """配置不可用"""


class QuotaExceeded(AppError):
    def __init__(self, used, limit):
        super().__init__(f"配额已满: {used}/{limit}")
        self.used, self.limit = used, limit


def load_config(raw):
    if not raw:
        raise ConfigError("配置为空")
    return {"ok": True}


# ── 5. Demo ──

def run_demo():
    print("=== 异常机制与异常链 ===\n")

    print("[1] 异常层次与 EAFP:")
    print(f"  ZeroDivisionError 的继承链: "
          f"{[c.__name__ for c in ZeroDivisionError.__mro__[:4]]}")
    print(f"  eafp_get({{'a': 1}}, 'a') = {eafp_get({'a': 1}, 'a')!r}")
    print(f"  eafp_get({{'a': 1}}, 'b') = {eafp_get({'a': 1}, 'b')!r}\n")

    print("[2] 异常链：隐式 __context__ 与显式 __cause__:")
    try:
        implicit_chain()
    except RuntimeError as e:
        print(f"  隐式链: {type(e).__name__}({e}) __context__={type(e.__context__).__name__}"
              f" __cause__={e.__cause__}")
    try:
        explicit_chain()
    except RuntimeError as e:
        print(f"  显式链: {type(e).__name__}({e}) __cause__={type(e.__cause__).__name__}"
              f"（traceback 会打印 'The above exception was the direct cause'）\n")

    print("[3] ExceptionGroup 与 except*:")
    make_group()
    print("  3 个异常打包抛出 → except* ValueError 捕 2 个、except* KeyError 捕 1 个\n")

    print("[4] 自定义异常体系:")
    try:
        load_config("")
    except AppError as e:                 # 捕基类 = 捕全家
        print(f"  捕获 {type(e).__name__}: {e}")
    try:
        raise QuotaExceeded(used=105, limit=100)
    except QuotaExceeded as e:
        print(f"  捕获 {type(e).__name__}: {e}（携带 used/limit 数据）")
    try:
        raise ValueError("不是业务异常")
    except AppError:
        print("  会被捕获（不应发生）")
    except ValueError:
        print("  ValueError 不是 AppError，走独立分支——按继承匹配，互不误捕")

    print("\n全部断言通过 ✓ EAFP、隐式/显式异常链、except* 分组捕获、体系分层互捕")


if __name__ == "__main__":
    run_demo()
