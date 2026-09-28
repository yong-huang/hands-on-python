# 03 · 描述符协议：`obj.attr` 背后的属性访问底层机制

> 天天在用的 `property`、`classmethod`、`staticmethod`，底层是同一套协议：描述符。
> 当你写 `obj.attr` 时，Python 并不是简单地查 `obj.__dict__`，而是按优先级走一整套查找链。
> 本实验拆开这条链：用描述符写出可复用的验证、缓存与惰性初始化属性，
> 并弄清查找优先级，分清"会用属性"和"理解属性访问"。

## Background

这一节回答：在描述符这层机制出现之前，"给属性加规则"是怎么做的，麻烦在哪。

最直接的写法是属性完全开放：`self.age = age`，读和改都走字典，没有任何约束。

需要规则时，经典做法是手写 getter/setter（成对的取值、赋值方法）：把 `u.age` 改成 `u.get_age()`，在 `set_age` 里检查类型和范围。这套做法代价明显：每个受管属性多出两个方法，样板随字段数线性增长；调用方语法被迫改变，校验逻辑还会在多个类里复制粘贴。

另一种做法是在 `__init__` 里集中检查一次——但只能拦住构造那一刻，事后 `u.age = "abc"` 照样能塞进去，规则管不住属性的整个生命周期。

这套能力的通用化发生在 Python 2.2：语言把属性拦截做成正式协议（约定一组方法名，实现了就能被解释器自动调用），`property`、`classmethod`、`staticmethod` 是第一批实现。协议把"读写这个属性时该做什么"写成一个可复用的类，由解释器在每次属性访问时自动调用。

## What

这一节给出定义、两类描述符的区分，和一个查找优先级的心智模型。

描述符（descriptor）是 Python 属性访问的底层机制：一个定义了 `__get__` / `__set__` / `__delete__` 的类，把它的实例放在另一个类的类属性上，就能拦截 `obj.attr` 的读写。

一句话心智模型：**`obj.attr` 按优先级走查找链（解析属性名时依次询问的候选位置）——数据描述符 `__get__` > 实例 `__dict__`（实例对象自己的属性字典）> 非数据描述符/类属性**。

可以把 `obj.attr` 想象成一栋带收发室的大楼：取件先问收发室（描述符），收发室没有才回工位翻抽屉（实例 `__dict__`）。但和真实收发室不同的是，这里有两档权限：数据描述符强制代收——抽屉里塞了同名件也要过它的手；非数据描述符只在抽屉里没有时才代劳。

描述符分两类：

- **数据描述符**（data descriptor）：定义 `__set__` 或 `__delete__`（即使没有 `__get__`），优先级高于实例 `__dict__`
- **非数据描述符**（non-data descriptor）：只定义 `__get__`，实例 `__dict__` 优先

demo 里的 `TypedField`（类型验证）、`CachedProperty`（计算缓存）、`LazyField`（惰性初始化——首次用到才创建）、`LoggedField`（读写审计）分别落在两类上，Quick Start 逐个看。

## When to Use

这一节给判断依据：什么场景值得用描述符，什么场景它是过度设计。

典型场景，都是"在做什么事的时候"：

- 多个类的字段需要同一套验证时——写一次 `TypedField`，每个类一行 `age = TypedField()` 声明，而不是每个类复制一遍检查代码。
- 属性计算昂贵且结果不变时——`CachedProperty` 首次访问算一次，写回实例字典后直接命中。
- 对象构建代价大、不是每个实例都用得上某属性时——`LazyField` 首次访问才调用 factory（工厂函数，负责创建那个昂贵的对象）。
- 想给一批属性的读写统一留痕时——`LoggedField` 在拦截层追加日志，业务方法零改动。

何时不用：只有一个类、一两个属性需要特殊行为时，`@property` 更直接，不必为它单写一个协议类；属性读写没有任何规则时，直接暴露最简单，描述符只会增加间接层。

| 方案 | 与描述符的差异 | 什么时候选它 |
|:---|:---|:---|
| `@property` | 单属性专用，逻辑就在类定义里 | 只有一两个属性需要拦截 |
| 手写 getter/setter | 每个类重复样板，调用方语法变丑 | 遗留代码约定必须用方法访问时 |
| 直接暴露属性 | 无任何拦截 | 属性不需要规则时 |

## Quick Start

这一节把 demo 跑起来，给出协议的最小骨架和四种实战模式。前置条件：只用标准库。

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

这段在做什么：三个方法分别对应属性被读、被写、被删除时的自动回调；`obj` 与 `objtype` 两个参数的含义见 How It Works。

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

四种实战模式的机制与 `__set_name__` 自动取名，见 How It Works。

## How It Works

这一节拆查找链的完整顺序，并用 CachedProperty 演示协议怎么被反过来利用。

### 查找优先级

`__getattribute__`（每次属性访问都会经过的内部钩子）按固定顺序找：

```
obj.attr 的查找顺序:
1. type(obj).__dict__["attr"]  →  如果是 data descriptor → 调用 __get__
2. obj.__dict__["attr"]        →  直接返回
3. type(obj).__dict__["attr"]  →  如果是 non-data descriptor → 调用 __get__
4. raise AttributeError
```

记忆口诀：**数据描述符 > 实例 `__dict__` > 非数据描述符**。

类访问与实例访问走同一个协议，区别只在 `__get__` 收到的参数：`User.age` 触发 `__get__(None, User)`——`obj` 为 `None`、`objtype` 是类本身；`u.age` 触发 `__get__(u, User)`。

第 1、3 步在类 `__dict__` 里没找到时，还会沿着基类继续找（MRO，方法解析顺序），所以定义在基类上的描述符对子类实例同样生效。

输出 [6] 就是这两条规则的对照实验：数据描述符一侧，`obj.__dict__['d']` 塞了值之后 `obj.d` 仍打印 `descriptor wins`（第 1 步优先）；非数据描述符一侧，`obj.nd` 直接读出 `instance_value`（第 2 步优先）。

### CachedProperty：利用优先级实现缓存

最核心的一处代码——只定义 `__get__`，主动选了优先级更低的位置：

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

写回实例字典这一步是全部机关所在：实例字典一旦有了同名 key，后续访问直接命中字典，`__get__` 不再被调用——输出 [2] 的 `Compute count: 1` 就是证据。

数据描述符（如 `TypedField`）则反过来：优先级高于实例字典，`obj.__dict__` 里塞同名 key 也拦不住 `__set__` 的验证逻辑。

输出 [1] 的 `TypeError: age: expected int, got str` 与 `ValueError: age: must >= 0`，正是赋值时 `__set__` 在拦截。

### `__set_name__`：属性名从哪来

类创建时解释器自动回调 `__set_name__`，把属性名送进描述符，省去每次手动传 `"age"`：

```python
class TypedField:
    def __set_name__(self, owner, name):
        self.name = name  # 类创建时自动调用，免手动传属性名

class User:
    age = TypedField()  # age.name 自动变为 "age"
```

demo 四种模式各自落位：

- **TypedField** 用 `__get__` + `__set__` 做类型/范围校验（数据描述符）
- **CachedProperty** 首次访问算一次写回实例字典（非数据描述符）
- **LazyField** 首次访问才调用 factory、结果存入实例字典（非数据描述符）
- **LoggedField** 每次读写追加审计日志（数据描述符）

## Pitfalls & Q&A

这一节先列三个常见踩坑（现象、原因、解法），再答两个有增量的问题。"为什么 CachedProperty 能被实例字典覆盖"这一问已并入下面第三条踩坑与 How It Works 的缓存小节。

踩坑清单：

- **想写验证字段却漏定义 `__set__`**。现象：赋坏值时验证逻辑完全不触发，`obj.attr = 坏值` 直接进实例字典。原因：只定义 `__get__` 就沦为非数据描述符，优先级低于实例字典，写操作根本不经过它。解法：需要拦写就补上 `__set__`（或 `__delete__`），让它成为数据描述符。
- **类访问 `MyClass.attr` 时 `obj` 是 `None`**。现象：一做类访问就报 `AttributeError` 一类的错。原因：`__get__` 里不做 `obj is None` 判断、直接取实例属性。解法：`__get__` 开头判断 `obj is None`，类访问时返回描述符自身或类级结果。
- **CachedProperty 的缓存可被覆盖**。现象：`obj.__dict__["stats"] = x` 之后，属性读到的是塞进去的值（输出 [2] 的 `After override: {'hacked': True}`）。原因：非数据描述符的固有权重，优先级低于实例字典，不是 bug。解法：需要防覆盖就改成数据描述符，或在接口文档里写明这一行为。

深入问答：

**Q1: property 和描述符有什么关系？**

`property` 就是一个数据描述符：

```python
p = property(lambda self: self.x)
print(hasattr(p, "__get__"))   # True
print(hasattr(p, "__set__"))   # True
```

`@property` 是语法糖，等价于创建一个 `property` 描述符并赋值给类属性。

`property`、`classmethod`、`staticmethod` 本质都是描述符，只是借装饰器语法挂到类属性上；`property` 的深入用法见 [17_property](../17_property/README.md)。

**Q2: 描述符放在实例属性上会生效吗？**

不会。查找链只看 `type(obj).__dict__` 和 `obj.__dict__` 两个位置——协议只对挂在**类**上的描述符生效；一个描述符实例被塞进实例 `__dict__` 后就是普通对象，读写都不经过钩子。所以描述符必须声明成类属性（`age = TypedField()` 写在类体里）。

**Q3: 描述符和装饰器有什么关系？**

两者都是"不修改调用方代码"地改写行为，但拦截层面不同：装饰器在**函数对象层面**包装（`f = deco(f)`），调用函数时生效；描述符在**属性访问协议层面**拦截，读写属性时生效。
