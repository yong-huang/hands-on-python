# 17 · property 深度剖析：把方法伪装成属性的艺术

## 1. 引言

`@property` 是 Python 中实现"受控属性访问"的语法糖。它将方法调用伪装成属性访问（`obj.x` 而非 `obj.x()`），让你在不改变外部接口的前提下，对读写操作加入验证、计算、缓存或副作用。

从本质上看，`property` 就是一个**数据描述符**（同时定义了 `__get__` + `__set__`），是 Python 描述符协议最常用的上层封装。理解 `property` 既是日常编码的必备技能，也是面试中区分"会用 Python"和"理解 Python"的高频考点。

本文通过四个经典示例——`Circle`（验证保护）、`Rectangle`（只读计算属性）、`Temperature`（同步属性）、描述符本质揭示——来全面讲解 `property` 的用法与原理。

## 2. 文件结构

```
17_property/
├── README.md              # 本教程文档
├── property.py            # 主演示脚本：验证 / 只读计算 / 联动属性 / 描述符本质
└── images/
    ├── property.archify.html  # 交互示意图（浏览器打开）
    └── property.archify.json  # 图源（typed JSON）
```

主脚本内容：

```
property.py
├── 1. Circle                # getter + setter + deleter，验证半径
├── 2. Rectangle             # 只读计算属性（面积、周长）
├── 3. Temperature           # 联动属性（摄氏/华氏自动同步）
├── 4. reveal_property()     # 揭示 property 的描述符本质
└── 5. run_demo()            # 五组交互演示
```

## 3. 核心概念

### 3.1 Circle —— getter / setter / deleter

`Circle` 是 `property` 最完整的用法示例，同时演示了 `@property`、`@x.setter`、`@x.deleter` 三个装饰器。

```python
class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        if value <= 0:
            raise ValueError(f"Radius must be positive, got {value}")
        self._radius = value

    @radius.deleter
    def radius(self):
        print("  [delete] radius reset to 0")
        self._radius = 0
```

**关键设计**：
- 实际数据存储在 `self._radius`（私有属性），外部通过 `self.radius` 访问
- setter 中加入**值验证**——半径必须为正数，否则抛出 `ValueError`
- deleter 负责清理逻辑（重置为 0）
- `area` 和 `circumference` 作为**只读计算属性**，由 `@property` 单独定义（无 setter）

**命名约定**：public 属性名 `radius`，private 存储名 `_radius`。这是 Python 的惯用法（单下划线表示"内部使用"，非强制访问控制）。

### 3.2 Rectangle —— 只读计算属性

```python
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    @property
    def area(self):
        return self.width * self.height

    @property
    def perimeter(self):
        return 2 * (self.width + self.height)
```

**关键点**：`area` 和 `perimeter` 没有定义 setter，因此是**只读的**。尝试 `r.area = 100` 会抛出 `AttributeError`。

只读计算属性适用于：
- 由其他属性**派生**的值（面积由宽高算出）
- 不需要独立存储、每次访问都重新计算的场景
- 对外暴露为"属性"而非"方法"，接口更简洁

### 3.3 Temperature —— 联动属性（带副作用的 setter）

```python
class Temperature:
    def __init__(self, celsius):
        self._celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        self._celsius = value

    @property
    def fahrenheit(self):
        return self._celsius * 9 / 5 + 32

    @fahrenheit.setter
    def fahrenheit(self, value):
        self._celsius = (value - 32) * 5 / 9
```

**核心思想**：两个 property 共享同一个内部状态 `_celsius`。修改华氏温度时，setter 自动转换为摄氏温度存入 `_celsius`；读取华氏温度时，getter 从 `_celsius` 实时计算。这实现了**双向同步**。

这种模式适用于：
- 同一数据的多种表示形式（货币换算、单位转换）
- 需要保持多个属性之间**一致性**的场景

### 3.4 property 的描述符本质

`property` 并非魔法——它就是一个数据描述符：

```python
p = property(lambda self: self.x)
print(hasattr(p, '__get__'))     # True
print(hasattr(p, '__set__'))     # True
print(hasattr(p, '__delete__'))  # True
```

`@property` 装饰器的本质操作：
1. `@property` 将 getter 方法包装为一个 `property` 对象，赋值给类属性
2. `@x.setter` 将 setter 方法注册到同一个 `property` 对象上
3. `@x.deleter` 将 deleter 方法注册到同一个 `property` 对象上

当执行 `obj.x` 时，Python 发现 `type(obj).__dict__["x"]` 是一个数据描述符，于是调用 `x.__get__(obj, type(obj))`，最终执行 getter 函数。

这意味着：**property 优先级高于实例 `__dict__`**。即使你在 `obj.__dict__["radius"]` 中塞了一个值，`obj.radius` 仍然走 property 的 getter。

### 3.5 高频追问

**Q1: property 和普通属性有什么区别？**

| 特性 | 普通属性 | property |
|------|---------|----------|
| 访问方式 | `obj.x` | `obj.x`（一样） |
| 赋值验证 | 无 | setter 中自定义 |
| 计算能力 | 无 | getter 中动态计算 |
| 删除控制 | 直接删除 | deleter 中自定义 |
| 优先级 | 存在 `__dict__` 中 | 数据描述符，优先级更高 |

**Q2: 什么时候用 property，什么时候用方法？**

- **简单数据 + 需要验证** → `@property` + `@x.setter`
- **由其他属性派生的值** → 只读 `@property`
- **需要传参数的计算** → 普通方法
- **有副作用的操作** → 普通方法（避免隐藏副作用）

**Q3: property 本质是什么？**

`property` 是一个**数据描述符**，同时定义了 `__get__`、`__set__`、`__delete__`。因此 property 的优先级高于实例 `__dict__`——即使实例字典中有同名 key，属性访问仍然走描述符的逻辑。

**Q4: 只读 property 为什么不能赋值？**

只定义了 `@property`（getter）但没有定义 `@x.setter` 的 property，其 `__set__` 方法会抛出 `AttributeError`。这是 Python 的默认行为——没有 setter 的 property 就是只读的。

**Q5: functools.cached_property 和 @property 有什么区别？**

`cached_property`（Python 3.8+）是**非数据描述符**（只定义 `__get__`），首次访问后将结果缓存到 `obj.__dict__`。与 `@property` 的关键区别：
- `cached_property` 只能计算一次（之后从实例字典读取）
- `cached_property` 可以被实例字典覆盖（非数据描述符优先级低）
- `@property` 每次访问都重新计算（除非自己实现缓存逻辑）

## 4. 实操演示

```bash
cd interview/17_property
python3 property.py           # 运行 property demo
# 交互示意图: 浏览器打开 images/property.archify.html
```

真实输出示例（macOS, CPython 3.10）：

```
[1] Circle with property validation:
  c.radius = 5
  c.area = 78.54
  c.circumference = 31.42
  c.radius = -1 -> ValueError: Radius must be positive, got -1

[2] Read-only computed property:
  r.width=3, r.height=4
  r.area = 12
  r.area = 100 -> AttributeError (no setter)

[3] Temperature (synced celsius/fahrenheit):
  t.celsius = 100
  t.fahrenheit = 212.0
  After t.fahrenheit = 212:
  t.celsius = 100.0
  t.fahrenheit = 212.0

[4] property is a data descriptor:
  property is descriptor: has __get__=True, __set__=True, __delete__=True
  type(property): <class 'type'>

[5] property vs method:
  @property: c.area        (attribute access)
  @method:   c.calc_area()  (method call)
  Rule: simple data -> property
        computation with params -> method
```

## 5. 预期结果与陷阱

**交互示意图**：[浏览器打开](images/property.archify.html)（自包含 HTML：trace 动画、深/浅主题、节点检索与路径追踪；图源 `images/property.archify.json`）。

property 的读写分发：读路径经 getter `__get__` 返回存储/计算值；写路径经 setter `__set__` 校验——`value > 0` 合法写入，非法值 `ValueError`；无 setter 的只读属性赋值 → `AttributeError`。

诚实预期（本机实测）：

- demo 全部输出为**确定性结果**（验证异常、只读异常、温度换算、描述符探测），任何 CPython 版本运行结果一致
- `[4]` 中 `type(property)` 显示 `<class 'type'>` —— property 本身是个类，`@property` 语法等价于调用其构造函数
- 一个本 demo 没有展示的行为：property 是数据描述符，**优先级高于实例 `__dict__`**。想验证可以执行 `c.__dict__["radius"] = 999` 后再读 `c.radius`，会发现仍走 getter（对应 §3.4 高频追问 Q1 的优先级结论）

## 6. 小结

1. **`@property` 是语法糖**，本质是数据描述符，优先级高于实例 `__dict__`
2. **`@x.setter` 做验证**，`@x.deleter` 做清理**，`@property`（无 setter）做只读
3. **只读计算属性**适合派生值，不需要 setter
4. **联动属性**通过共享内部状态实现双向同步（如摄氏/华氏）
5. **property vs method**：无参数的简单数据用 property，需要参数或有副作用用方法

下一篇进入 18_typing_generic：看 `TypeVar` / `Generic` 如何让类型提示支持泛型参数。
