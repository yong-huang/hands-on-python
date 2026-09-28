# 18 · typing / TypeVar / Generic：让类型提示支持泛型的类型系统

> `Stack[int]` 写在代码里，运行时却什么都不做——类型注解只在静态检查时生效。
> 本实验用可运行的 demo 看 TypeVar / Generic / Protocol / Union 如何让类型提示支持泛型，以及静态检查与运行时的分工边界。
> 读完你能回答：为什么 mypy 报错的代码照样能跑、泛型类到底"泛"在哪、Protocol 为什么不继承也能通过检查。

## Background

这节讲来龙去脉：Python 是怎么从"完全没类型标注"走到今天这套类型系统的。

在类型注解出现之前，Python 项目的接口约定只存在于 docstring、文档和口口相传中。一个函数声明接收列表，调用方塞进字典也能通过编译——Python 本来就没有编译期——直到运行到内部第一次操作才炸，甚至不炸，脏数据一路流向下游。

几万行的项目里，这套模式的代价开始失控：改名一个字段全靠全局搜索加人肉核对；IDE 面对没有注解的函数只能瞎猜补全；容器里到底装什么类型，只有读到实现才知道。团队越大，这类"约定靠自觉"的隐患越贵。

应运而生的转折点是 PEP 484（Python 增强提案，类型注解的规范），随 Python 3.5 落地：注解写进代码，但**不改变运行时行为**，由 mypy、pyright 这类静态检查器（不运行代码、只分析类型的工具）在提交前消费。

此后 PEP 544 的 Protocol 又补上了"不继承也能定义接口"的结构化子类型，本实验的四大工具就此成形。

## What

这节给出定义与心智模型：类型注解是什么、静态与运行时如何分工，以及 typing 工具箱里有什么。

Python 是动态类型语言，但类型注解（Type Hints——写在变量、参数、返回值旁的类型说明）让代码在**不失去动态灵活性**的前提下获得静态检查能力。

一句话心智模型：**同一个 `s.push('wrong')`，mypy/pyright 报类型错误，CPython 却把注解丢在一边、照常入栈**——静态检查与运行时分道而行。

可以把静态检查类比成出行前的行李核对：注解是你填报的物品清单，mypy/pyright 是逐项核对的检查员，问题在出发前就被拦下。

但和真实安检不同的是，载你起飞的 CPython 根本不看清单——它只管把代码跑完，这正是输出 [5] 那句 "Python does NOT enforce type hints at runtime!"。

typing 模块的核心工具，后面逐个上手：

- **TypeVar**：类型变量，给泛型占位的类型参数
- **Generic[T]**：泛型基类，让同一个类适配多种类型
- **Protocol**（PEP 544）：结构化子类型，检查方法签名而非继承关系
- **Union / Optional**：联合类型，表示"多种类型之一"
- **typing.cast**：类型转换提示（运行时是 no-op，即空操作）

## When to Use

这节讲在做什么事的时候值得用类型注解，什么时候不必用。

三类典型场景：

- **写会被多处复用的容器或工具类**：用 `Generic[T]` 让一套 `Stack` 实现同时服务 `Stack[int]`、`Stack[str]`，调用方拿到准确的元素类型提示。
- **设计库的公共 API**：用 Protocol 描述"能读、能关"这类能力，不强迫用户类继承你的基类，第三方类型也能直接传入。
- **把脚本养成项目**：给参数和返回值加注解，让 mypy/pyright 在合并前拦截低级类型错误，IDE 的补全与重构也随之可用。

何时不用：

- 一次性小脚本：注解收益抵不上书写成本，裸写更快。
- 需要运行时强制校验时：注解帮不上忙，用显式 `isinstance`，或 pydantic 这类运行时校验库。
- 不要为注解而注解：能一行推断清楚的局部变量，不必显式标类型。

接口检查方式对比（Protocol 一节的延伸，先混个脸熟）：

| 方式 | 检查时机 | 是否需要继承 | 适用场景 |
|:---|:---|:---|:---|
| Duck Typing（鸭子类型：不看类型看行为） | 运行时（AttributeError） | 否 | 快速原型 |
| ABC（抽象基类） | 实例化时 | 是 | 框架设计 |
| Protocol | 静态检查 + 运行时（`@runtime_checkable`） | 否 | 库 API 设计 |

## Quick Start

这节给出最小可运行路径：跑通 demo，读输出示例，再上手两段最典型的写法。只依赖标准库 typing，无需安装 mypy/pyright 也能运行。

```bash
cd core/18_typing_generic
python3 typing_generic.py      # 运行 typing demo
```

真实输出示例（节选：省略开头 demo 标题横线与结尾分隔线）：

```
[1] Generic Stack[T]:
  int_stack: Stack([1, 2])
  str_stack: Stack(['hello', 'world'])
  int_stack.pop(): 2
  TypeVar T: ~T

[2] Constrained TypeVar (int | float):
  N = TypeVar('N', int, float)
  N can only be int or float (type checker enforces)

[3] Protocol (structural typing):
  isinstance(File(), Sized): True
  isinstance(File(), Closeable): True
  isinstance(File(), Readable): True
  isinstance(File(), Writable): True
  isinstance(42, Sized): False

[4] Union / Optional:
  process_id(42): ID-000042
  process_id('abc'): ID-abc
  find_user(1): Alice
  find_user(999): None

[5] Type checking in Python:
  Python does NOT enforce type hints at runtime!
  They are hints for static checkers (mypy / pyright)
  int_stack.push('wrong')  # mypy error, but runs fine!

[6] Common typing constructs:
  List[int]                           -> list of ints
  Dict[str, int]                      -> dict with str keys, int values
  Optional[str]                       -> str or None
  Union[int, str]                     -> int or str
  Tuple[int, ...]                     -> tuple of ints (variable length)
  Callable[[int, str], bool]          -> function(int, str) -> bool
```

诚实预期（本机实测）：

- demo 输出全部**确定**：Protocol 的 `isinstance` 判定、Union 分支、泛型栈行为在任何 CPython 3.8+ 上结果一致
- **本 demo 无法展示 mypy/pyright 报错**：demo 里的 `int_stack.push('wrong')` 只是被注释掉的一行说明 —— 运行时不报错正是要点本身，要看红色错误需要真的安装并运行 `mypy typing_generic.py`（本环境未安装，属于静态检查器才能看到的行为）
- `TypeVar T: ~T` 中的 `~` 是 mypy 约定的"类型变量"记号，repr 因 Python 版本而异，不影响理解
- `@runtime_checkable` 的 isinstance 只检查方法**存在性**，不检查签名 —— 这是文档明示的限制

### TypeVar：类型变量

```python
T = TypeVar("T")                  # 任意类型，通用容器
N = TypeVar("N", int, float)      # 约束：只能是 int 或 float
T = TypeVar("T", bound=Base)      # 上界约束：Base 或其子类
```

这段在做什么：三种声明方式——无约束、限定候选类型、设上界。约束 TypeVar 传入不合法类型时静态检查报错；**运行时不检查**（输出 [2] 只打印说明文字）。

### Protocol：结构化子类型

```python
@runtime_checkable
class Sized(Protocol):
    def __len__(self) -> int: ...
    def __getitem__(self, index: int): ...

isinstance(File("hello"), Sized)   # True  (有 __len__ + __getitem__)
isinstance(42, Sized)              # False
```

这段在做什么：定义一个只描述"能力"的协议——有 `__len__` 和 `__getitem__` 就算 `Sized`，无需继承。

输出 [3] 的 `File` 四个判定全 True、`42` 为 False，对应的就是方法有无。Protocol 之间可以继承组合（`Readable(Writable, Protocol)`）。

## How It Works

这节回答两个机制问题：注解在运行时的真实待遇，以及泛型与类型收窄在检查期如何工作。

### 注解在运行时的真实待遇

注解会被 Python 存进对象的 `__annotations__` 属性里留档，但解释器不据此做任何校验，执行流与没有注解时完全一致。你在输出 [5] 看到的 `int_stack.push('wrong')  # mypy error, but runs fine!`，就是这份"留档不执法"的直接后果。

因此运行时唯一的类型保障是你自己写的 `isinstance`，或 `@runtime_checkable` Protocol 的结构检查（后者只查方法存在性、不查签名，限制见诚实预期）。

`@runtime_checkable` 的 isinstance 机制：检查实例的类型上是否存在协议声明的**方法名**。

输出 [3] 里 `isinstance(File(), Sized): True` 来自 `File` 恰好有 `__len__` 与 `__getitem__`；签名对不对、返回什么，它一概不看。

### 泛型类的机制：类型参数只活在检查期

```python
class Stack(Generic[T]):
    def __init__(self):
        self._items: List[T] = []       # T 只是标注，运行时就是一个普通 list

    def push(self, item: T) -> None:
        self._items.append(item)        # 运行时不校验 item 类型，照单全收

int_stack: Stack[int] = Stack()   # 只能放 int（mypy 视角）
int_stack.push("hello")           # mypy error! 但运行时不报错
```

为什么这样写有效：`Stack[int]` 和 `Stack[str]` 是同一个 `Stack` 类的两种类型化用法，不是两个类。

运行时 `Stack[int]` 只产生一个“泛型别名”（记录“Stack 里装什么类型”的轻量标注对象，并不创建新类），`Stack` 本身原封不动，`int_stack` 就是个普通实例。

一套栈实现服务所有类型，约束全部发生在 mypy 的检查期。输出 [1] 的 `TypeVar T: ~T` 打印的是 `TypeVar` 对象的 repr（`~` 即 mypy 对类型变量的记号），与诚实预期第三条对应。

### 类型收窄：Union 的检查期魔法

```python
def process_id(id_: int | str) -> str: ...        # Python 3.10+ 语法
def find_user(user_id: int) -> str | None: ...    # Optional[str] 等价

def first_item(items: List[T]) -> Optional[T]:    # T 出现在参数和返回值
    return items[0] if items else None            # 调用时自动推断 T=int / T=str
```

`Union` / `Optional` 配合 `isinstance` 做**类型收窄**（type narrowing）：mypy 能自动追踪 `if` 分支中的类型变化，收窄后分支内只允许使用已确认的类型。

泛型函数里 `T` 同时出现在参数和返回值，检查器据此在调用点自动代入具体类型——输出 [4] 的两种 `process_id` 调用正是同一函数的两种代入。

## Pitfalls & Q&A

这节收录两个典型踩坑与几个有增量的疑问。

**坑 1：TypeVar 约束在运行时失效。**
现象：给约束为 `int | float` 的参数传入 `str`，程序照常执行，团队误以为有保护。原因：约束只有静态检查器看，运行时不校验（见 TypeVar 一节）。解法：对不可信输入在运行时显式 `isinstance` 校验，静态与动态两道闸各管各的。

**坑 2：以为 `@runtime_checkable` 能验证方法签名。**
现象：对象实现了同名方法却语义不符，`isinstance` 依然放行。原因：文档明示它只检查方法存在性、不检查签名。解法：需要更强的运行时保证时，手写逐项检查或改用 ABC 的 `@abstractmethod` 机制。

**Q1：Python 的类型注解在运行时有效吗？**
不影响运行时行为，机制详见 How It Works 的"注解在运行时的真实待遇"；一句话：注解只是提示，检查完全依赖 mypy、pyright 这类外部工具。

**Q2：TypeVar 和普通类型标注有什么区别？**
普通标注只能写死一个类型（`items: List[int]`），TypeVar 让类型参数化（`items: List[T]`），实现"一套代码，多种类型"。TypeVar 的作用范围是**函数或类定义**，不是运行时变量。

**Q3：Protocol 和 ABC 怎么选？**

选择矩阵见 When to Use 的对比表。一句话：需要强制子类实现选 ABC（`@abstractmethod` 在实例化时检查，见 lab 10）；库 API 设计选 Protocol（不对用户类做继承要求）。

需要运行时 isinstance 时两者都要额外处理——ABC 用 `register`，Protocol 用 `@runtime_checkable`。

**Q4：`typing.cast` 是干什么的？**

```python
from typing import cast
result = cast(int, some_value)  # 运行时是 no-op，直接返回 some_value
```

`cast` 是只给静态检查器看的"类型断言"，告诉 mypy "我确定这是 int 类型"。运行时什么也不做，零开销。适合处理类型检查器无法推断的场景。

**Q5：Python 3.9+ 的类型注解有什么变化？**

Python 3.9 支持直接用内置类型做注解（`list[int]` 代替 `List[int]`），3.10 支持 `X | Y` 代替 `Union[X, Y]`，`X | None` 代替 `Optional[X]`。新代码推荐使用内置类型语法，更简洁。
