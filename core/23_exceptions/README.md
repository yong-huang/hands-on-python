# 23 · 异常机制与异常链：EAFP、raise from 与 except*

> 异常在前面 22 个实验里无处不在——`with` 的异常安全、`NotImplemented` 回退、
> `CancelledError` 的协作取消、四路 401 的分层拦截——但异常本身的机制没有专讲：
> **except 按 MRO 继承匹配**、**except 里再 raise 会自动串链**（`__context__` 与
> `__cause__` 是两个属性）、**3.11 的 `except*` 能从 ExceptionGroup 里按类型分组捞**。
> 本实验把这些全部做成可断言的实测。

## What

异常是 Python 的控制流机制：EAFP 风格"先做再问"（Easier to Ask Forgiveness than Permission），出错沿调用栈向上传播直到被处理。一句话心智模型：**异常也是类，except 按 MRO 继承匹配——捕基类等于捕全家；异常对象上有两个"前因"属性：`__context__` 记"处理时又出错"的隐式链，`__cause__` 记 `raise ... from e` 的显式链**。

## Why

不理解机制会怎样：裸 `except:` 吞掉一切（连 `KeyboardInterrupt`）；异常里再抛异常把原始现场冲掉（排查丢线索）；不知道 `except*` 就没法处理 TaskGroup 抛出的 ExceptionGroup（lab 09）。自定义异常体系缺一层基类，外层就无法"统一兜底业务异常、放过程序缺陷"。

## How

```bash
cd core/23_exceptions
python3 exceptions.py    # 完整演示（4 个小节，内置断言）
```

真实输出：

```
=== 异常机制与异常链 ===

[1] 异常层次与 EAFP:
  ZeroDivisionError 的继承链: ['ZeroDivisionError', 'ArithmeticError', 'Exception', 'BaseException']
  eafp_get({'a': 1}, 'a') = 1
  eafp_get({'a': 1}, 'b') = '<missing b>'

[2] 异常链：隐式 __context__ 与显式 __cause__:
  隐式链: RuntimeError(上层只说配置解析失败) __context__=ValueError __cause__=None
  显式链: RuntimeError(上层只说配置解析失败) __cause__=ValueError（traceback 会打印 'The above exception was the direct cause'）

[3] ExceptionGroup 与 except*:
  3 个异常打包抛出 → except* ValueError 捕 2 个、except* KeyError 捕 1 个

[4] 自定义异常体系:
  捕获 ConfigError: 配置为空
  捕获 QuotaExceeded: 配额已满: 105/100（携带 used/limit 数据）
  ValueError 不是 AppError，走独立分支——按继承匹配，互不误捕

全部断言通过 ✓ EAFP、隐式/显式异常链、except* 分组捕获、体系分层互捕
```

诚实预期：

- demo 输出**确定性**，任何 CPython 3.11+ 一致（`except*` 与 ExceptionGroup 需要 3.11+）
- `[2]` 两种链的 traceback 打印前缀不同：隐式链是 `During handling of the above exception, another exception occurred`，显式链是 `The above exception was the direct cause of...`——语义差别就在这句话里

### EAFP：先做再问

```python
try:
    return mapping[key]          # 先做，错了再处理
except KeyError:
    return f"<missing {key}>"
```

比 LBYL（Look Before You Leap，先 `if key in mapping`）少一次检查且无竞态窗口——检查与使用之间不会有人插进来改字典。

### 异常链：__context__ 与 __cause__

```python
try:
    int("not-a-number")
except ValueError:
    raise RuntimeError("上层只说配置解析失败")          # 隐式：__context__ = ValueError

try:
    int("not-a-number")
except ValueError as e:
    raise RuntimeError("...") from e                   # 显式：__cause__ = e
```

在 except 块里抛新异常，解释器自动把原异常记进新异常的 `__context__`（"处理 A 时出了 B"）；`raise ... from e` 则把它记进 `__cause__`（"B 是 A 的直接原因"）——traceback 的打印前缀也因此不同。排查嵌套调用里的异常时，读 traceback 就是读这条链。

### ExceptionGroup 与 except*

```python
raise ExceptionGroup("批量校验失败", [
    ValueError("字段 A 非法"),
    KeyError("字段 C 缺失"),
])
```

except* 按类型**分组**捕获：ValueError 分支拿到 2 个、KeyError 分支拿到 1 个，一组异常可以多分支分别处理。它不是"更强的 except"——语义是"一组里挑出我关心的子组"，未挑走的继续向外传播。TaskGroup（lab 09）的多个子任务异常就是这样打包的。

### 自定义异常体系

```python
class AppError(Exception): ...
class ConfigError(AppError): ...
class QuotaExceeded(AppError):
    def __init__(self, used, limit):
        super().__init__(f"配额已满: {used}/{limit}")
        self.used, self.limit = used, limit     # 异常对象携带结构化数据
```

外层 `except AppError` 统一兜底业务异常、放过程序缺陷；子类携带结构化数据（used/limit）供处理器使用。按 MRO 匹配意味着 `except ValueError` 不会误捕你的业务异常——分层互不误捕。

## Deep Dive

**为什么 `except BaseException` 是禁区？**

`BaseException` 是 `KeyboardInterrupt`、`SystemExit`、`GeneratorExit` 的基类——捕获它等于连"用户按 Ctrl-C""程序正常退出""生成器被 close"全部吞掉。业务代码的兜底上限是 `except Exception`，BaseException 留给解释器与框架（lab 09 的取消机制就依赖 GeneratorExit 不被吞）。

**异常的代价与 EAFP 的边界。** 抛异常有构造 traceback 的成本（微秒级），所以"热路径上用异常做常规分支"要掂量——但 EAFP 检查字典键、属性是否存在依然是 Python 惯用法：一次失败的异常成本低于一次多余的成员检查 + 竞态风险（LBYL 的检查和使用之间有人插队）。判断标准：异常路径的**频率**。

踩坑清单：

- **裸 `except:` 或 `except BaseException`**：吞掉 KeyboardInterrupt/SystemExit，进程"杀不死"；兜底上限 `except Exception`
- **except 里再 raise 丢失现场**：不关心原异常也要 `raise ... from e` 保留链，否则 traceback 少一段"案中案"
- **`except*` 写成 `except ExceptionGroup`**：except* 是语法关键字级别的机制，普通 except 捕到的是"组对象"而不是解包——处理 TaskGroup 异常必须用 except*
- **异常对象当返回值复用**：同一异常实例 raise 两次，第二次的 traceback 会覆盖第一次的 `__traceback__`
- **`finally` 里 return**：会吞掉正在传播的异常（包括 except 分支刚捕获准备 re-raise 的）——finally 只做清理

## Q&A

**Q1: except Exception 和 except BaseException 的区别？**
Exception 是所有"值得处理"的异常的基类；BaseException 额外包含 KeyboardInterrupt/SystemExit/GeneratorExit 这些"不该被业务代码拦截"的信号。业务兜底写 `except Exception`，写 BaseException 会让 Ctrl-C 失灵。

**Q2: `raise X from e` 与直接 `raise X` 的区别？**
前者把 `e` 记进 `X.__cause__`（traceback 标注"直接原因"），语义是"我因此转抛"；后者在 except 块里隐式把原异常记进 `__context__`（语义是"处理过程中顺带发生"）。排查时 cause 链是你主动声明的因果。

**Q3: except* 和 except 能混用吗？**
不能对同一个 try 块混用；except* 的每个分支在异常组上做子集匹配，分支之间按声明顺序各自独立执行（不是只命中第一个）。普通异常用 except，TaskGroup/批量并发用 except*。

**Q4: 自定义异常该继承 Exception 还是更具体的基类？**
默认继承 Exception 起一个业务基类（如 `AppError`），子类再细分（ConfigError/QuotaExceeded）；需要表达"操作结果为空但非错误"时才考虑继承特定内建类（如 LookupError）。外层兜底 `except AppError`，内层按需捕获子类。
