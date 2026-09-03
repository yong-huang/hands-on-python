# 18 · typing / TypeVar / Generic：让类型提示支持泛型的类型系统

> 上一实验的 property 在运行时真实拦截每一次读写——描述符协议是运行时机制。
> 类型注解正好相反：`Stack[int]` 写在代码里，运行时却什么都不做。
> 一边"运行时生效"，一边"只在静态检查时生效"，两者极易混淆。
> 本实验看 TypeVar / Generic / Protocol 如何让类型提示支持泛型。

## 1. 为什么需要它

Python 是动态类型语言，但 PEP 484 引入了类型注解（Type Hints），让代码在**不失去动态灵活性**的前提下获得静态检查的能力。类型注解本身不改变运行时行为，它是给 mypy / pyright 等静态检查器和 IDE 用的"提示"。不掌握它会怎样：容器里塞进错误类型只能等线上炸，IDE 补全和重构形同虚设，大厂面试里"讲讲 TypeVar / Protocol"更是 Python 工程师的基本功。typing 模块提供的核心工具：

- **TypeVar**：类型变量，约束泛型的类型参数
- **Generic[T]**：泛型基类，让同一个类适配多种类型
- **Protocol**（PEP 544）：结构化子类型，检查方法签名而非继承关系
- **Union / Optional**：联合类型，表示"多种类型之一"
- **typing.cast**：类型转换提示（运行时是 no-op）

## 2. 总览：核心机制一图看懂

![typing 与泛型：静态检查与运行时行为分道而行](images/typing_generic.archify.svg)

一句话心智模型：**同一个 `s.push('wrong')`，mypy/pyright 报类型错误，CPython 却把注解丢在一边、照常入栈**。看图时沿"静态检查 / 运行时"两条并行的道走：静态侧 TypeVar 约束、Generic 参数化、Protocol 结构匹配都在编译前发生；运行时唯一的类型保障是手写 `isinstance` 或 `@runtime_checkable` Protocol 结构检查。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/interview/18_typing_generic/images/typing_generic.archify.html)
> （或本地打开 [`images/typing_generic.archify.html`](images/typing_generic.archify.html)）。

## 3. 快速开始

```bash
cd interview/18_typing_generic
python3 typing_generic.py      # 运行 typing demo
```

真实输出示例（macOS, CPython 3.10）：

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

## 4. 核心概念

### 4.1 TypeVar — 类型变量

```python
T = TypeVar("T")           # 无约束，可以是任意类型
K = TypeVar("K")           # 无约束
N = TypeVar("N", int, float)  # 约束为 int 或 float
```

三种用法：

| 形式 | 含义 | 示例 |
|:---|:---|:---|
| `T = TypeVar("T")` | 任意类型 | 通用容器 |
| `N = TypeVar("N", int, float)` | 约束类型，只能是 int 或 float | 数值计算 |
| `T = TypeVar("T", bound=Base)` | 上界约束，必须是 Base 或其子类 | 面向接口编程 |

约束 TypeVar 在静态检查时会报错如果传入了不合法的类型。注意：**运行时不检查**，只有 mypy / pyright 会报错。

### 4.2 Generic[T] — 泛型类

```python
T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self):
        self._items: List[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> Optional[T]:
        return self._items.pop() if self._items else None
```

使用时指定类型参数：

```python
int_stack: Stack[int] = Stack()   # 只能放 int
str_stack: Stack[str] = Stack()   # 只能放 str

int_stack.push(1)       # OK
int_stack.push("hello")  # mypy error! 但运行时不报错
```

**泛型的本质**：同一个类，通过类型参数产生不同的"版本"。`Stack[int]` 和 `Stack[str]` 是同一个 `Stack` 类的两种类型化用法，不是两个类。这对代码复用至关重要——一个栈实现，服务所有类型。

### 4.3 Protocol — 结构化子类型（PEP 544）

```python
@runtime_checkable
class Sized(Protocol):
    def __len__(self) -> int: ...
    def __getitem__(self, index: int): ...

@runtime_checkable
class Writable(Protocol):
    def write(self, data: str) -> None: ...

@runtime_checkable
class Readable(Writable, Protocol):  # 多重继承
    def read(self) -> str: ...
```

Protocol 的核心思想：**不要求显式继承，只检查是否有对应的方法签名**。

```python
class File:
    def __init__(self, content): self.content = content
    def __len__(self): return len(self.content)
    def __getitem__(self, i): return self.content[i]
    def write(self, data): self.content += data
    def read(self): return self.content
    def close(self): pass

isinstance(File("hello"), Sized)     # True  (有 __len__ + __getitem__)
isinstance(File("hello"), Readable)   # True  (有 read + write)
isinstance(42, Sized)                # False (int 没有 __getitem__)
```

Protocol vs ABC vs Duck Typing 的对比：

| 方式 | 检查时机 | 是否需要继承 | 适用场景 |
|:---|:---|:---|:---|
| Duck Typing | 运行时（AttributeError） | 否 | 快速原型 |
| ABC | 实例化时 | 是 | 框架设计 |
| Protocol | 静态检查 + 运行时（`@runtime_checkable`） | 否 | 库 API 设计 |

`Readable(Writable, Protocol)` 演示了 Protocol 之间的继承组合——一个协议可以继承另一个协议，组合出更复杂的接口。

### 4.4 Union / Optional

```python
def process_id(id_: Union[int, str]) -> str:
    if isinstance(id_, int):
        return f"ID-{id_:06d}"
    return f"ID-{id_}"

def find_user(user_id: int) -> Optional[str]:
    db = {1: "Alice", 2: "Bob"}
    return db.get(user_id)  # 可能返回 None
```

- **Union[int, str]**：参数可以是 int 或 str
- **Optional[str]**：等价于 `Union[str, None]`，表示"可能没有值"

Python 3.10+ 可以用更简洁的语法：

```python
def process_id(id_: int | str) -> str:          # Python 3.10+
def find_user(user_id: int) -> str | None:       # Python 3.10+
```

注意 `Union` / `Optional` 配合 `isinstance` 做**类型收窄**（type narrowing），mypy 能自动追踪 if 分支中的类型变化。

### 4.5 泛型函数

```python
def first_item(items: List[T]) -> Optional[T]:
    return items[0] if items else None
```

`T` 出现在参数和返回值中，表示输入输出类型一致。调用时自动推断：

```python
first_item([1, 2, 3])        # 推断 T=int，返回 Optional[int]
first_item(["a", "b"])       # 推断 T=str，返回 Optional[str]
```

## 5. 关键代码解析

泛型类的核心构造——类型参数只活在"检查期"：

```python
class Stack(Generic[T]):
    def __init__(self):
        self._items: List[T] = []       # T 只是标注，运行时就是一个普通 list

    def push(self, item: T) -> None:
        self._items.append(item)        # 运行时不校验 item 类型，照单全收
```

`int_stack.push("hello")` 会得到 mypy error，但运行时毫无反应——这正是"静态检查与运行时分道而行"。

坑清单：

- **以为运行时会检查类型**：`int_stack.push('wrong')` 正常入栈，类型保障只能靠手写 `isinstance` 或 `@runtime_checkable` Protocol
- **`@runtime_checkable` 的 isinstance 只查方法存在性，不查签名**：方法名对上就算匹配，参数类型错了它不管（文档明示的限制）
- **本 demo 看不到 mypy 红色报错**：那属于静态检查器的行为，需要 `mypy typing_generic.py` 才能复现
- **约束 TypeVar 传错类型**：静态检查报错、运行时无感，别指望 `N = TypeVar("N", int, float)` 在运行时拦住字符串
- **`TypeVar T: ~T` 的 `~` 记号**：repr 因 Python 版本而异，不影响语义

## 6. 文件结构

```
18_typing_generic/
├── README.md                       # 本教程文档
├── typing_generic.py               # 主演示脚本：TypeVar / Generic / Protocol / Union
└── images/
    ├── typing_generic.archify.json # 图源（typed JSON IR，可编辑重渲染）
    ├── typing_generic.archify.html # 交互示意图（浏览器打开）
    └── typing_generic.archify.svg  # 双主题矢量图（本 README §2 内嵌）
```

`typing_generic.py` 内容：`1. T / K / N (TypeVar)` 类型变量定义 / `2. Stack(Generic[T])` 泛型栈 / `3. Sized / Closeable / Writable / Readable (Protocol)` 结构化子类型 / `4. process_id() / find_user()` Union / Optional / `5. first_item()` 泛型函数 / `6. run_demo()` 交互式演示。

## 7. 面试要点

**Q1: Python 的类型注解在运行时有效吗？**
**不影响运行时行为**。`int_stack: Stack[int] = Stack()` 中的 `Stack[int]` 只是一个注释，运行时你仍然可以 `int_stack.push("wrong")`，Python 不会报错。类型检查完全依赖外部工具（mypy、pyright）。

**Q2: TypeVar 和普通类型标注有什么区别？**
普通标注只能写死一个类型（`items: List[int]`），TypeVar 让类型参数化（`items: List[T]`），实现"一套代码，多种类型"。TypeVar 的作用范围是**函数或类定义**，不是运行时变量。

**Q3: Protocol 和 ABC 怎么选？**
- 需要强制子类实现 → ABC（`@abstractmethod` 在实例化时检查）
- 需要灵活的结构化检查 → Protocol（无需继承，只需方法签名匹配）
- 需要运行时 isinstance → 都需要额外处理（ABC 用 register，Protocol 用 `@runtime_checkable`）
- 第三方库 API 设计 → Protocol 更合适（不对用户类做继承要求）

**Q4: `typing.cast` 是干什么的？**

```python
from typing import cast
result = cast(int, some_value)  # 运行时是 no-op，直接返回 some_value
```

`cast` 只给静态检查器看的"类型断言"，告诉 mypy "我确定这是 int 类型"。运行时什么也不做，零开销。适合处理类型检查器无法推断的场景。

**Q5: Python 3.9+ 的类型注解有什么变化？**
Python 3.9 支持直接用内置类型做注解（`list[int]` 代替 `List[int]`），3.10 支持 `X | Y` 代替 `Union[X, Y]`，`X | None` 代替 `Optional[X]`。新代码推荐使用内置类型语法，更简洁。

## 8. 总结

1. **类型注解不影响运行时**，是给静态检查器和 IDE 用的提示
2. **TypeVar 让类型参数化**，Generic[T] 实现泛型类
3. **Protocol 实现结构化子类型**，检查方法签名而非继承关系
4. **Union / Optional 处理多种可能类型**，配合 isinstance 做类型收窄
5. **Python 3.10+ 可用内置语法**（`list[int]`、`int | str`），更简洁

下一篇进入 [19_collections](../19_collections/README.md)：看 namedtuple / Counter / deque 这些"超级容器"如何替代手写数据结构。
