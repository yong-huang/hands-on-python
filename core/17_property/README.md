# 17 · property 深度剖析：把方法伪装成属性的艺术

> 资源清理要交给显式接口（lab 02 的上下文管理器），属性访问也有同样的取舍：
> 直接暴露裸属性，等需要加验证时改成方法，所有调用点都得跟着改。
> `@property` 让你保持 `obj.x` 的访问形式，却能在读写时插入验证、计算与副作用。

## What

`@property` 是 Python 中实现"受控属性访问"的语法糖：将方法调用伪装成属性访问（`obj.x` 而非 `obj.x()`），在不改变外部接口的前提下对读写加入验证、计算、缓存或副作用。一句话心智模型：**`obj.x` 的读路径经 getter `__get__` 返回存储/计算值，写路径经 setter `__set__` 校验；没有 setter 的 property 是只读的**。

## Why

没有它会怎样：要么把裸属性直接暴露出去、毫无约束，要么一律写 `get_x()` / `set_x()`、接口啰嗦还破坏调用方。从本质上看，`property` 就是一个**数据描述符**（同时定义了 `__get__` + `__set__`），是描述符协议（lab 03）最常用的上层封装——理解它既是日常编码的必备技能，也是区分"会用 Python"和"理解 Python"的分水岭。

## How

```bash
cd core/17_property
python3 property.py           # 运行 property demo
```

真实输出示例：

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

诚实预期（本机实测）：

- demo 全部输出为**确定性结果**（验证异常、只读异常、温度换算、描述符探测），任何 CPython 版本运行结果一致
- `[4]` 中 `type(property)` 显示 `<class 'type'>` —— property 本身是个类，`@property` 语法等价于调用其构造函数
- 一个本 demo 没有展示的行为：property 是数据描述符，**优先级高于实例 `__dict__`**。想验证可以执行 `c.__dict__["radius"] = 999` 后再读 `c.radius`，会发现仍走 getter

### getter / setter / deleter（Circle）

```python
class Circle:
    def __init__(self, radius):
        self.radius = radius     # 触发 setter 验证

    @property
    def radius(self):
        return self._radius      # 实际数据存私有属性 _radius

    @radius.setter
    def radius(self, value):
        if value <= 0:
            raise ValueError(f"Radius must be positive, got {value}")
        self._radius = value

    @radius.deleter
    def radius(self):
        self._radius = 0
```

`area`、`circumference` 作为只读计算属性，由 `@property` 单独定义（无 setter）。命名约定：public 名 `radius`，private 存储 `_radius`（单下划线表示"内部使用"，非强制）。

### 只读计算属性（Rectangle）

```python
class Rectangle:
    @property
    def area(self):
        return self.width * self.height
```

没有 setter 就是只读——`r.area = 100` 抛 `AttributeError`。适用于由其他属性**派生**的值、不需要独立存储的场景。

### 联动属性（Temperature）

```python
@property
def fahrenheit(self):
    return self._celsius * 9 / 5 + 32      # getter 实时换算

@fahrenheit.setter
def fahrenheit(self, value):
    self._celsius = (value - 32) * 5 / 9   # setter 反向换算后存 _celsius
```

两个 property 共享同一个内部状态 `_celsius`，实现摄氏/华氏**双向同步**——适合同一数据的多种表示形式（单位转换、货币换算）。

## Deep Dive

**`obj.x` 背后的分发逻辑**——为什么写 getter 能拦截"属性访问"：

```python
obj.radius
# type(obj).__dict__["radius"] 是数据描述符
# → 调用 radius.__get__(obj, type(obj))，执行 getter 函数

obj.radius = value
# → 调用 radius.__set__(obj, value)，执行 setter（value <= 0 抛 ValueError）
```

`property` 并非魔法——它就是一个数据描述符：

```python
p = property(lambda self: self.x)
print(hasattr(p, '__get__'))     # True
print(hasattr(p, '__set__'))     # True
print(hasattr(p, '__delete__'))  # True
```

`@property` 装饰器的本质操作：把 getter 方法包装为 `property` 对象赋给类属性，`@x.setter` / `@x.deleter` 再把 setter/deleter 注册到同一个 `property` 对象上。因此 **property 优先级高于实例 `__dict__`**——`c.__dict__["radius"] = 999` 后读 `c.radius` 仍走 getter。

踩坑清单：

- **只读 property 赋值报错的原因要想清楚**：只定义 `@property` 的属性其 `__set__` 抛 `AttributeError`，不是"对象不可变"
- **setter 里的隐藏副作用**：`Temperature.fahrenheit` 的 setter 悄悄改了 `_celsius`，按本实验的选型规则，有副作用的操作更适合普通方法

## Q&A

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

**Q3: `functools.cached_property` 和 `@property` 有什么区别？**

`cached_property`（Python 3.8+）是**非数据描述符**（只定义 `__get__`），首次访问后将结果缓存到 `obj.__dict__`。关键区别：`cached_property` 只计算一次（之后从实例字典读取），且可以被实例字典覆盖（非数据描述符优先级低，见 lab 03）；`@property` 每次访问都重新计算。
