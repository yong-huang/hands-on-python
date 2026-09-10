# 03 · 描述符协议：`obj.attr` 背后的属性访问底层机制

> 上一实验的 `with` 靠 `__enter__` / `__exit__` 两个魔法方法撑起协议——其实天天在用的
> `property`、`classmethod`、`staticmethod`，底层也是一套协议：描述符。
> 当你写 `obj.attr` 时，Python 并不是简单地查 `obj.__dict__`，而是按优先级走一整套查找链；
> 本实验拆开这条链，看懂它就分得清"会用 Python"和"理解 Python"。

## 1. 为什么需要它

描述符是 Python 属性访问的底层机制。没有它，每个需要验证/缓存/惰性初始化的属性都要手写 getter/setter 样板，而且行为散落在各个调用点。描述符把"属性读写时该做什么"收敛到一个可复用的类里：`TypedField` 做验证、`CachedProperty` 做缓存、`LazyField` 做惰性初始化。`obj.attr` 背后，Python 会先看 `type(obj)` 上的 `attr` 是否是**数据描述符**（定义了 `__set__` 或 `__delete__`）：是则直接走描述符协议；否则实例 `__dict__` 优先，未命中才调用非数据描述符的 `__get__`。

描述符分两类：
- **数据描述符**（data descriptor）：定义 `__set__` 或 `__delete__`（即使没有 `__get__`），优先级高于实例 `__dict__`
- **非数据描述符**（non-data descriptor）：只定义 `__get__`，实例 `__dict__` 优先

不理解这套优先级，就会遇到"`__dict__` 里明明有值为什么读不到"、"缓存怎么莫名失效"这类困惑。

## 2. 总览：核心机制一图看懂

![obj.attr 的查找优先级](images/descriptor.svg)

一句话心智模型：**`obj.attr` 按优先级走查找链——数据描述符 `__get__` > 实例 `__dict__` > 非数据描述符/类属性**。看图时从 `__getattribute__`（每次访问都经过）出发，顺着分支看两种描述符各自在哪一步被拦截、`__getattr__` 兜底后才抛 `AttributeError`。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/interview/03_descriptor/images/descriptor.html)
> （或本地打开 [`images/descriptor.html`](images/descriptor.html)）。

## 3. 快速开始

```bash
cd interview/03_descriptor
python3 descriptor.py          # 运行全部 demo（验证/缓存/惰性/审计/优先级）
```

真实输出示例（macOS, CPython 3.10，节选）：

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

## 4. 核心概念

### 4.1 描述符协议三个方法

```python
class MyDescriptor:
    def __get__(self, obj, objtype=None):
        """obj.attr 触发"""
        if obj is None:
            return self  # 类访问: MyClass.attr
        return value

    def __set__(self, obj, value):
        """obj.attr = value 触发"""
        obj.__dict__["attr"] = value

    def __delete__(self, obj):
        """del obj.attr 触发"""
        obj.__dict__.pop("attr", None)
```

### 4.2 `__set_name__`（Python 3.6+）

```python
class TypedField:
    def __set_name__(self, owner, name):
        self.name = name  # 自动获取属性名

class User:
    age = TypedField()  # age.name 自动变为 "age"
```

不需要手动传属性名，Python 在类创建时自动调用 `__set_name__`。

### 4.3 四种实战模式

**TypedField —— 类型验证**

```python
class User:
    age = TypedField(type_=int, min_val=0, max_val=150)

u = User("Alice", 30, "alice@example.com")
u.age = "thirty"  # TypeError: expected int, got str
u.age = -1         # ValueError: must >= 0
```

TypedField 同时定义 `__get__` 和 `__set__`，是**数据描述符**——即使 `obj.__dict__` 中有同名 key，`obj.age` 仍走描述符逻辑。

**CachedProperty —— 计算缓存**：只定义 `__get__`，是**非数据描述符**。首次访问后结果存入 `obj.__dict__["stats"]`，之后实例字典优先——这是缓存生效的原因，也使 `obj.__dict__["stats"] = x` 可以覆盖缓存值。

**LazyField —— 惰性初始化**：属性名映射为 `_lazy_attr` 存入实例字典，首次访问才调用 factory，避免与描述符名称冲突。

**LoggedField —— 读写审计**：数据描述符，每次读/写自动追加日志，适合属性访问追踪场景。

### 4.4 属性查找优先级

```
obj.attr 的查找顺序:
1. type(obj).__dict__["attr"]  →  如果是 data descriptor → 调用 __get__
2. obj.__dict__["attr"]        →  直接返回
3. type(obj).__dict__["attr"]  →  如果是 non-data descriptor → 调用 __get__
4. raise AttributeError
```

简化版记忆口诀：**数据描述符 > 实例 `__dict__` > 非数据描述符**。

## 5. 关键代码解析

最能体现机制的是 **CachedProperty 如何利用查找优先级实现缓存**：

```python
class CachedProperty:                       # 只定义 __get__ → 非数据描述符
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self                     # 类访问 Myobj.attr 返回描述符本身
        value = self.factory(obj)           # 只在首次访问时才计算
        obj.__dict__[self.name] = value     # 为什么写回实例字典：
                                            # 非数据描述符优先级低于实例 __dict__，
                                            # 下次访问直接命中字典，__get__ 不再被调用
        return value
```

数据描述符（如 `TypedField`）则反过来：优先级高于实例字典，`obj.__dict__` 里塞同名 key 也拦不住 `__set__` 的验证逻辑。

坑清单：

- **想写验证字段却漏定义 `__set__`**：只定义 `__get__` 就沦为非数据描述符，`obj.attr = 坏值` 直接进实例字典，验证被整个绕过
- **类访问 `MyClass.attr` 时 `obj` 是 `None`**：`__get__` 里不做 `obj is None` 判断、直接取实例属性会崩
- **CachedProperty 的缓存可被 `obj.__dict__["stats"] = x` 覆盖**：非数据描述符的固有权重（`After override: {'hacked': True}`），不是 bug
- **示意图中的查找路径是示意数据**（展示优先级模式），不是某次运行的实录

## 6. 文件结构

```
03_descriptor/
├── README.md                      # 本教程文档
├── descriptor.py                  # 主演示脚本：四种描述符模式 + 查找优先级演示
└── images/
    ├── descriptor.json    # 图源（typed JSON IR，可编辑重渲染）
    ├── descriptor.html    # 交互示意图（浏览器打开）
    └── descriptor.svg     # 双主题矢量图（本 README §2 内嵌）
```

`descriptor.py` 内容：`1. TypedField` 数据描述符：类型+范围验证 / `2. CachedProperty` 非数据描述符：计算后缓存 / `3. LazyField` 非数据描述符：惰性初始化 / `4. LoggedField` 数据描述符：读写审计日志 / `5. User / DataProcessor / HeavyResource / TrackedEntity` 演示用类 / `6. reveal_descriptor_nature()` property/classmethod 本质 / `7. demo_priority()` 属性查找优先级演示。

## 7. 面试要点

**Q1: property 和描述符有什么关系？**

`property` 就是一个数据描述符：

```python
p = property(lambda self: self.x)
print(hasattr(p, "__get__"))   # True
print(hasattr(p, "__set__"))   # True
```

`@property` 是语法糖，等价于创建一个 `property` 描述符并赋值给类属性。

**Q2: __get__ 的第二个参数 objtype 是什么？**

```python
def __get__(self, obj, objtype=None):
    # obj: 实例（实例访问时）或 None（类访问时）
    # objtype: 类本身
    if obj is None:
        return self  # MyClass.attr 返回描述符本身
```

`User.age` 调用 `__get__(None, User)`，`u.age` 调用 `__get__(u, User)`。

**Q3: 为什么 CachedProperty 可以被覆盖？**

因为它是非数据描述符（只定义了 `__get__`）。实例字典优先级高于非数据描述符，一旦 `obj.__dict__["stats"]` 存在，Python 直接返回它。数据描述符（如 `property`）优先级高于实例字典，所以 `obj.__dict__["x"] = 99` 后 `obj.x` 仍走 getter。

**Q4: 描述符和装饰器有什么关系？**

两者都是在"不修改调用方代码"的前提下改写行为，但拦截的层面不同：
- 装饰器在**函数对象层面**包装（`f = deco(f)`），调用函数时生效
- 描述符在**属性访问协议层面**拦截，读写属性时生效（`__get__`/`__set__`）
- `property`、`classmethod`、`staticmethod` 本质是描述符，只是借装饰器语法挂到类属性上

**Q5: 怎么用描述符实现一个带验证的字段？**

定义 `__set__`（数据描述符）做类型/范围校验，不合法就抛 `TypeError`/`ValueError`；再用 `__set_name__` 在类创建时自动拿到属性名，免去手动传 `"age"` 这样的硬编码——`TypedField` 就是这个套路，多个字段各挂一个实例即可复用。

## 8. 总结

1. **描述符是 `obj.attr` 的底层机制**，property/classmethod/staticmethod 都是描述符
2. **数据描述符**（定义 `__set__` 或 `__delete__`，`__get__` 可选）优先级高于实例字典
3. **非数据描述符**（仅 `__get__`）优先级低于实例字典
4. **`__set_name__`** 自动获取属性名，无需硬编码
5. **四大实战模式**：TypedField（验证）、CachedProperty（缓存）、LazyField（惰性）、LoggedField（审计）

下一篇进入 [04_generator_iterator](../04_generator_iterator/README.md)：看生成器如何用惰性求值实现协程式的执行暂停。
