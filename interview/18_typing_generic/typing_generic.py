"""
typing / TypeVar / Generic / Protocol —— Python 类型系统
面试高频题: TypeVar、泛型、Protocol、typing.cast、运行时 vs 编译时

Python 的类型注解（PEP 484）用于静态类型检查（mypy/pyright），
但不影响运行时行为。typing 模块提供泛型、协议、联合类型等工具。

核心概念:
- TypeVar: 类型变量，约束泛型的类型参数
- Generic[T]: 泛型基类
- Protocol: 结构化子类型（PEP 544）
- Union / Optional: 联合类型
- typing.cast: 类型转换提示（运行时是 no-op）
- @overload: 同一函数的多种签名

示意图: python3 scripts/gen_diagram.py 生成 images/typing_generic.png
"""

from typing import TypeVar, Generic, Union, Optional, List, Dict, Protocol, runtime_checkable


# ============================================================
# 1. TypeVar 与泛型
# ============================================================

T = TypeVar("T")
K = TypeVar("K")
N = TypeVar("N", int, float)  # 约束为 int 或 float


class Stack(Generic[T]):
    """泛型栈: 可以指定元素类型"""
    def __init__(self):
        self._items: List[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> Optional[T]:
        return self._items.pop() if self._items else None

    def __repr__(self):
        return f"Stack({self._items})"


# ============================================================
# 2. Protocol (结构化子类型)
# ============================================================

@runtime_checkable
class Sized(Protocol):
    """has __len__ and __getitem__"""
    def __len__(self) -> int: ...
    def __getitem__(self, index: int): ...


@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...


@runtime_checkable
class Writable(Protocol):
    def write(self, data: str) -> None: ...


@runtime_checkable
class Readable(Writable, Protocol):
    def read(self) -> str: ...


# ============================================================
# 3. Union / Optional
# ============================================================

def process_id(id_: Union[int, str]) -> str:
    """接受 int 或 str 的 ID"""
    if isinstance(id_, int):
        return f"ID-{id_:06d}"
    return f"ID-{id_}"


def find_user(user_id: int) -> Optional[str]:
    """可能返回 None"""
    db = {1: "Alice", 2: "Bob"}
    return db.get(user_id)


# ============================================================
# 4. 泛型函数
# ============================================================

def first_item(items: List[T]) -> Optional[T]:
    """获取列表第一个元素（泛型函数）"""
    return items[0] if items else None


# ============================================================
# 5. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("typing / TypeVar / Generic -- Demo Mode")
    print("=" * 60)

    # 1) Generic class
    print("\n[1] Generic Stack[T]:")
    int_stack: Stack[int] = Stack()
    str_stack: Stack[str] = Stack()
    int_stack.push(1)
    int_stack.push(2)
    str_stack.push("hello")
    str_stack.push("world")
    print(f"  int_stack: {int_stack}")
    print(f"  str_stack: {str_stack}")
    print(f"  int_stack.pop(): {int_stack.pop()}")
    print(f"  TypeVar T: {T!r}")

    # 2) Constrained TypeVar
    print("\n[2] Constrained TypeVar (int | float):")
    print(f"  N = TypeVar('N', int, float)")
    print(f"  N can only be int or float (type checker enforces)")

    # 3) Protocol
    print("\n[3] Protocol (structural typing):")
    class File:
        def __init__(self, content):
            self.content = content
        def __len__(self): return len(self.content)
        def __getitem__(self, i): return self.content[i]
        def write(self, data): self.content += data
        def read(self): return self.content
        def close(self): pass

    f = File("hello")
    print(f"  isinstance(File(), Sized): {isinstance(f, Sized)}")
    print(f"  isinstance(File(), Closeable): {isinstance(f, Closeable)}")
    print(f"  isinstance(File(), Readable): {isinstance(f, Readable)}")
    print(f"  isinstance(File(), Writable): {isinstance(f, Writable)}")
    print(f"  isinstance(42, Sized): {isinstance(42, Sized)}")

    # 4) Union / Optional
    print("\n[4] Union / Optional:")
    print(f"  process_id(42): {process_id(42)}")
    print(f"  process_id('abc'): {process_id('abc')}")
    print(f"  find_user(1): {find_user(1)}")
    print(f"  find_user(999): {find_user(999)}")

    # 5) Type checking info
    print("\n[5] Type checking in Python:")
    print("  Python does NOT enforce type hints at runtime!")
    print("  They are hints for static checkers (mypy / pyright)")
    print("  int_stack.push('wrong')  # mypy error, but runs fine!")

    # 6) Annotated types
    print("\n[6] Common typing constructs:")
    constructs = [
        ("List[int]", "list of ints"),
        ("Dict[str, int]", "dict with str keys, int values"),
        ("Optional[str]", "str or None"),
        ("Union[int, str]", "int or str"),
        ("Tuple[int, ...]", "tuple of ints (variable length)"),
        ("Callable[[int, str], bool]", "function(int, str) -> bool"),
    ]
    for ann, desc in constructs:
        print(f"  {ann:<35} -> {desc}")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 可视化图由 scripts/gen_diagram.py 生成
    run_demo()
