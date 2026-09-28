# 23 · 异常机制与异常链：EAFP、raise from 与 except*

> 异常是 Python 无处不在的控制流：`with` 的异常安全、协作取消（任务收到取消请求后自己捕获信号、做完清理再退出的机制，见 lab 09）、分层拦截都靠它。
> 但机制层面有三件事常被含糊带过：except 按 MRO（方法解析顺序——沿继承链从子类到基类的查找顺序）
> 继承匹配，捕基类等于捕全家；except 里再 raise 会自动串链，`__context__` 与 `__cause__`
> 是两个不同的属性；3.11 的 `except*` 能从 ExceptionGroup（把多个异常打包成一组的容器）里按类型分组捞。
> 本篇把这三件事全部做成可断言的实测。

## Background

这节讲异常机制出现之前错误怎么传、痛点在哪、异常如何成为 Python 的默认答案。

在此之前的主流做法是错误码：函数返回 `-1` 或 `NULL` 表示失败，调用方逐层 `if` 检查；失败原因记在全局变量（如 C 的 `errno`）里。

痛点有两层：错误处理代码淹没主逻辑，一层层 `if (ret < 0)` 抄写；更糟的是任何一层忘查，错误就被静默吞掉、程序带着错误状态继续跑，爆雷位置离出错点十万八千里。错误码本身只是一串数字，哪一行、为什么失败，现场全丢。

异常把"失败"从返回值里解放出来：出错即抛出、沿调用栈自动传播、带上完整现场，正常路径与错误路径彻底分离。Python 社区把它定为默认选择——EAFP 成为惯用风格；Python 3 又陆续补齐链式 traceback 与分组异常。

## What

这节给出异常的定义与一句话心智模型，再配一个类比。

异常是 Python 的控制流机制：出错时抛出一个异常对象，沿调用栈向上传播，直到被某个 except 接手；没人接手，程序才终止。EAFP 风格（Easier to Ask Forgiveness than Permission，先做再请求原谅）就是建立在这之上——先执行，出错再处理。

一句话心智模型：**异常也是类，except 按 MRO 继承匹配——捕基类等于捕全家；异常对象上有两个"前因"属性：`__context__` 记"处理时又出错"的隐式链，`__cause__` 记 `raise ... from e` 的显式链**。

可以把异常体系想象成公司邮箱组：给 dev-team 发邮件，dev-team-python 的成员也能收到——`except Exception` 就是捕下这个组及其全部子组。但和邮件组不同的是：邮件是广播，except 是第一个命中的分支独占接手，其余分支不再尝试。

## When to Use

这节讲在做什么事的时候该用哪件异常工具，以及什么时候不该用。

典型场景：

1. **在调用可能失败的外部操作时**（读文件、请求网络、解析 JSON）：EAFP 直接做，`except` 捕具体类型，失败是意外而非分支。
2. **在分层业务系统里设计错误上报时**：自定义异常基类让外层 `except AppError` 统一兜底，内层按需捕子类。
3. **在并发批量任务里要"每个失败都看见"时**：多个子任务的异常被打包成 ExceptionGroup，用 `except*` 按类型分组处理。

何时不用：

- 异常路径变成常规流程时（循环靠抛异常退出、缓存未命中靠异常返回）：抛异常要构造 traceback（出错时逐层函数调用的回溯报告），成本微秒级；判断标准是异常路径的**频率**。
- 资源清理不靠异常表达：关闭连接、释放锁交给 `with` / `finally`，异常只负责"报告失败"。

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| 错误码返回值 | 调用方逐层 if 检查，忘查即静默吞错 | C 接口、性能极端敏感的边界 |
| LBYL 预检查 | 先 `if` 判断再操作，存在竞态窗口 | 检查与使用之间无并发写、可读性优先时 |
| 异常（EAFP） | 正常路径零负担，错误自带现场 | Python 默认选择：失败是意外时 |

## Quick Start

这节跑通一个 4 小节的演示脚本，先看命令与真实输出，再逐段读三段实现代码。`except*` 相关小节需要 Python 3.11+。

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

- demo 输出**确定性**，任何 CPython（Python 官方的参考解释器实现）3.11+ 一致（`except*` 与 ExceptionGroup 需要 3.11+）
- `[2]` 两种链的 traceback 打印前缀不同：隐式链是 `During handling of the above exception, another exception occurred`，显式链是 `The above exception was the direct cause of...`——语义差别就在这句话里

### EAFP：先做再问

```python
try:
    return mapping[key]          # 先做，错了再处理
except KeyError:
    return f"<missing {key}>"
```

这段在做什么：不预检查键是否存在，直接取、失败再兜底。比 LBYL（Look Before You Leap，先 `if key in mapping`）少一次检查且无竞态窗口——检查与使用之间不会有人插进来改字典。

### ExceptionGroup 与 except*

```python
raise ExceptionGroup("批量校验失败", [
    ValueError("字段 A 非法"),
    ValueError("字段 B 非法"),
    KeyError("字段 C 缺失"),
])
```

这段在做什么：把多个异常打包成一组抛出。except* 按类型**分组**捕获：ValueError 分支拿到 2 个、KeyError 分支拿到 1 个，一组异常可以多分支分别处理。

它不是"更强的 except"——语义是"一组里挑出我关心的子组"，未挑走的继续向外传播。TaskGroup（asyncio 的结构化并发任务组，见 lab 09）的多个子任务异常就是这样打包的。

### 自定义异常体系

```python
class AppError(Exception): ...
class ConfigError(AppError): ...
class QuotaExceeded(AppError):
    def __init__(self, used, limit):
        super().__init__(f"配额已满: {used}/{limit}")
        self.used, self.limit = used, limit     # 异常对象携带结构化数据
```

这段在做什么：一层业务基类 + 两个子类，子类携带结构化数据（used/limit）供处理器使用。外层 `except AppError` 统一兜底业务异常、放过程序缺陷；按 MRO 匹配意味着 `except ValueError` 不会误捕你的业务异常——分层互不误捕。

## How It Works

这节拆开 except 的匹配规则、异常链的串接机制，以及"哪些异常碰不得"。

**为什么 `except BaseException` 是禁区？** `BaseException` 是 `KeyboardInterrupt`、`SystemExit`、`GeneratorExit`（生成器被关闭时收到的信号异常）的基类。

捕获它等于连"用户按 Ctrl-C""程序正常退出""生成器被 close"全部吞掉。业务代码的兜底上限是 `except Exception`，BaseException 留给解释器与框架（lab 09 的取消机制就依赖 GeneratorExit 不被吞）。

**异常链怎么串起来：**

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

在 except 块里抛新异常，解释器自动把原异常记进新异常的 `__context__`（"处理 A 时出了 B"）；`raise ... from e` 则把它记进 `__cause__`（"B 是 A 的直接原因"）——traceback 的打印前缀也因此不同。

排查嵌套调用里的异常时，读 traceback 就是读这条链。

**匹配与传播的机制，正对应输出里的每一行：**

- `[1]` 打印的继承链就是 except 匹配走的路——从实际异常的类出发沿 MRO 向上找第一个命中的分支，所以子类分支必须写在父类前面，父类写在前会永久遮蔽子类；
- `[2]` 的 `__context__`/`__cause__` 差别来自上面两种串链方式；
- `[3]` 的"捕 2 个、捕 1 个"是 except* 在组上做子集匹配；
- `[4]` 的"互不误捕"是 MRO 匹配的直接结果。

**EAFP 的代价边界。** 抛异常有构造 traceback 的成本（微秒级），所以"热路径上用异常做常规分支"要掂量——但 EAFP 检查字典键、属性是否存在依然是 Python 惯用法：一次失败的异常成本低于一次多余的成员检查 + 竞态风险（LBYL 的检查和使用之间有人插队）。

判断标准：异常路径的**频率**。

## Pitfalls & Q&A

这节先列五个真实踩坑（现象、原因、解法），再回答四个取舍问题。

1. **裸 `except:` 或 `except BaseException`**
   - 现象：Ctrl-C 杀不死进程，退出逻辑被无声跳过。
   - 原因：BaseException 涵盖 KeyboardInterrupt/SystemExit，把它们当普通错误吞了。
   - 解法：业务兜底的上限是 `except Exception`。

2. **except 里再 raise 丢失现场**
   - 现象：traceback 只剩最上层异常，"案中案"线索断了。
   - 原因：except 块里 raise 时没把原异常链上，新异常与旧现场脱钩。
   - 解法：不关心原异常也要写 `raise ... from e`，保留完整链条。

3. **`except*` 写成 `except ExceptionGroup`**
   - 现象：捕到的是一个"组对象"，没法按类型分组处理。
   - 原因：except* 是语法关键字级别的机制，普通 except 不会解包异常组。
   - 解法：处理 TaskGroup 抛出的异常必须用 except*。

4. **异常对象当返回值复用**
   - 现象：同一异常实例 raise 两次后，第一次的现场不见了。
   - 原因：第二次 raise 覆盖了实例的 `__traceback__`。
   - 解法：每次 raise 新建异常实例，别把异常对象当值传来传去。

5. **`finally` 里 return**
   - 现象：正在传播的异常（包括 except 分支准备 re-raise 的）无声消失。
   - 原因：finally 里的 return 让代码块正常结束，Python 会丢弃挂起的异常。
   - 解法：finally 只做清理，返回值放在 try/except 外面。

**Q1: except Exception 和 except BaseException 的区别？**
机制见 How It Works 第一段；一句话版本：业务兜底写 `except Exception`，写 BaseException 会让 Ctrl-C 失灵。

**Q2: `raise X from e` 与直接 `raise X` 的区别？**
前者把 `e` 记进 `X.__cause__`（traceback 标注"直接原因"），语义是"我因此转抛"；后者在 except 块里隐式把原异常记进 `__context__`（语义是"处理过程中顺带发生"）。

排查时 cause 链是你主动声明的因果。

**Q3: except* 和 except 能混用吗？**
不能对同一个 try 块混用；except* 的每个分支在异常组上做子集匹配，分支之间按声明顺序各自独立执行（不是只命中第一个）。普通异常用 except，TaskGroup/批量并发用 except*。

**Q4: 自定义异常该继承 Exception 还是更具体的基类？**
默认继承 Exception 起一个业务基类（如 `AppError`），子类再细分（ConfigError/QuotaExceeded）；需要表达"操作结果为空但非错误"时才考虑继承特定内建类（如 LookupError）。

外层兜底 `except AppError`，内层按需捕获子类。
