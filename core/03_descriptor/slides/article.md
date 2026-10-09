# 03 · 描述符协议：`obj.attr` 背后的属性访问底层机制

> `with` 靠 `__enter__` / `__exit__` 两个魔法方法撑起协议；其实天天在用的
> `property`、`classmethod`、`staticmethod`，底层也是一套协议：描述符。
> 当你写 `obj.attr` 时，Python 并不是简单地查 `obj.__dict__`，而是按优先级走一整套查找链；
> 本实验拆开这条链，看懂它就分得清"会用 Python"和"理解 Python"。

## What

描述符是 Python 属性访问的底层机制：一个定义了 `__get__` / `__set__` / `__delete__` 的类，放在类属性上就能拦截 `obj.attr` 的读写。一句话心智模型：**`obj.attr` 按优先级走查找链——数据描述符 `__get__` > 实例 `__dict__` > 非数据描述符/类属性**。描述符分两类：

- **数据描述符**（data descriptor）：定义 `__set__` 或 `__delete__`（即使没有 `__get__`），优先级高于实例 `__dict__`
- **非数据描述符**（non-data descriptor）：只定义 `__get__`，实例 `__dict__` 优先

## Why

没有描述符，每个需要验证/缓存/惰性初始化的属性都要手写 getter/setter 样板，而且行为散落在各个调用点。描述符把"属性读写时该做什么"收敛到一个可复用的类里：`TypedField` 做验证、`CachedProperty` 做缓存、`LazyField` 做惰性初始化。不理解查找优先级，就会遇到"`__dict__` 里明明有值为什么读不到"、"缓存怎么莫名失效"这类困惑。

## How

```bash
cd core/03_descriptor
python3 descriptor.py          # 运行全部 demo（验证/缓存/惰性/审计/优先级）
```

真实输出示例：

```
[1] TypedField (data descriptor with validation):
  User('Alice', age=30, email='alice@example.com')
  User('Bob', age=25, email='bob@example.com')

  Type validation:
    TypeError: age: expected int, got str
  Range validation:
    ValueError: age: must >= 0
    ValueError: age: must <= 150

[2] CachedProperty (non-data descriptor):
  Access stats 1st time (computes): {'sum': 4950, 'mean': 49.5, 'min': 0, 'max': 99}
  Access stats 2nd time (cached):   {'sum': 4950, 'mean': 49.5, 'min': 0, 'max': 99}
  Compute count: 1 (should be 1)
  Access sorted_data 1st: [0, 1, 2, 3, 4]...
  Access sorted_data 2nd: [0, 1, 2, 3, 4]... (cached)
  After override: {'hacked': True} (non-data: instance dict wins)

[3] LazyField (lazy initialization):
  HeavyResource created (nothing initialized yet)
  Accessing database:
    [LazyField] Initializing database connection...
    -> {'connected': True, 'db': 'mydb'}
  Accessing database again (cached):
    -> {'connected': True, 'db': 'mydb'} (same object: True)
  Accessing cache_pool:
    [LazyField] Initializing cache pool...
    -> {'size': 256}

...  # [4] LoggedField 与 [5] Descriptor nature 两段省略

[6] Attribute lookup priority:
  [1] Data descriptor vs __dict__:
    obj.__dict__['d'] = 'instance_value'
    [DataDesc.__get__] descriptor wins
    obj.d = 100  (descriptor wins)
    [DataDesc.__set__] descriptor wins
    after obj.d = 999, obj.__dict__ = {'d': 'instance_value'}
  [2] Non-data descriptor vs __dict__:
    obj.__dict__['nd'] = 'instance_value'
    obj.nd = instance_value  (instance dict wins)
```

诚实预期（本机实测）：

- 验证异常、缓存计数、惰性初始化、优先级行为都是**确定性的**，每次运行输出一致
- `Compute count: 1` 是缓存生效的关键证据；`After override: {'hacked': True}` 演示非数据描述符可被实例字典覆盖
- 描述符本身没有性能基准可展示（它的开销在属性访问层面，量级太小），本 lab 用行为验证而非计时

### 协议的三个方法

```python
class MyDescriptor:
    def __get__(self, obj, objtype=None):
        """obj.attr 触发；obj 为 None 表示类访问 MyClass.attr"""
        ...

    def __set__(self, obj, value):
        """obj.attr = value 触发"""
        ...

    def __delete__(self, obj):
        """del obj.attr 触发"""
        ...
```

### `__set_name__`：自动拿到属性名（Python 3.6+）

```python
class TypedField:
    def __set_name__(self, owner, name):
        self.name = name  # 类创建时自动调用，免手动传属性名

class User:
    age = TypedField()  # age.name 自动变为 "age"
```

### 四种实战模式

- **TypedField —— 类型验证**（数据描述符）：`__get__` + `__set__` 做类型/范围校验，即使 `obj.__dict__` 有同名 key 也拦得住
- **CachedProperty —— 计算缓存**（非数据描述符）：首次访问计算后写回 `obj.__dict__`，之后字典优先即缓存生效
- **LazyField —— 惰性初始化**（非数据描述符）：首次访问才调用 factory，结果存入实例字典
- **LoggedField —— 读写审计**（数据描述符）：每次读/写自动追加日志

### 标准库里的描述符

`property`、`classmethod`、`staticmethod` 本质都是描述符，只是借装饰器语法挂到类属性上（`property` 见 [17_property](../17_property/README.md)）。

## Deep Dive

**查找优先级**（`__getattribute__` 每次属性访问都经过）：

```
obj.attr 的查找顺序:
1. type(obj).__dict__["attr"]  →  如果是 data descriptor → 调用 __get__
2. obj.__dict__["attr"]        →  直接返回
3. type(obj).__dict__["attr"]  →  如果是 non-data descriptor → 调用 __get__
4. raise AttributeError
```

记忆口诀：**数据描述符 > 实例 `__dict__` > 非数据描述符**。

**最核心的一处代码**——CachedProperty 如何利用优先级实现缓存：

```python
class CachedProperty:                       # 只定义 __get__ → 非数据描述符
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self                     # 类访问返回描述符本身
        value = self.factory(obj)           # 只在首次访问时才计算
        obj.__dict__[self.name] = value     # 为什么写回实例字典：
                                            # 非数据描述符优先级低于实例 __dict__，
                                            # 下次访问直接命中字典，__get__ 不再被调用
        return value
```

数据描述符（如 `TypedField`）则反过来：优先级高于实例字典，`obj.__dict__` 里塞同名 key 也拦不住 `__set__` 的验证逻辑。

踩坑清单：

- **想写验证字段却漏定义 `__set__`**：只定义 `__get__` 就沦为非数据描述符，`obj.attr = 坏值` 直接进实例字典，验证被整个绕过
- **类访问 `MyClass.attr` 时 `obj` 是 `None`**：`__get__` 里不做 `obj is None` 判断、直接取实例属性会崩
- **CachedProperty 的缓存可被 `obj.__dict__["stats"] = x` 覆盖**：非数据描述符的固有权重（`After override: {'hacked': True}`），不是 bug

## Q&A

**Q1: property 和描述符有什么关系？**

`property` 就是一个数据描述符：

```python
p = property(lambda self: self.x)
print(hasattr(p, "__get__"))   # True
print(hasattr(p, "__set__"))   # True
```

`@property` 是语法糖，等价于创建一个 `property` 描述符并赋值给类属性。

**Q2: __get__ 的第二个参数 objtype 是什么？**

`obj` 是实例（实例访问时）或 `None`（类访问时），`objtype` 是类本身：`User.age` 调用 `__get__(None, User)`，`u.age` 调用 `__get__(u, User)`。

**Q3: 为什么 CachedProperty 可以被覆盖？**

因为它是非数据描述符（只定义了 `__get__`），实例字典优先级更高，一旦 `obj.__dict__["stats"]` 存在就直接命中。数据描述符反过来——`obj.__dict__["x"] = 99` 之后 `obj.x` 仍走 getter。

**Q4: 描述符和装饰器有什么关系？**

两者都是"不修改调用方代码"地改写行为，但拦截层面不同：装饰器在**函数对象层面**包装（`f = deco(f)`），调用函数时生效；描述符在**属性访问协议层面**拦截，读写属性时生效。`property`、`classmethod`、`staticmethod` 本质是描述符，只是借装饰器语法挂到类属性上。
