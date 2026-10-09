# 05 · 元类：在类创建之前拦截类型定义的"类的类"

> 生成器是"函数体延迟执行"；`class` 语句恰恰相反——定义的那一刻就立即执行、
> 创建出类对象。那么这个"创建类"的动作是谁在执行？答案是 `type`，所有类的默认元类。
> 想让一批类自动获得 `__str__`、自动单例、自动收集 ORM 字段，靠每个类里复制样板是不行的——
> 元类让你在"类创建之前"统一拦截，本实验看它怎么拦。

## What

元类是"类的类"——`type` 是所有类的默认元类。一句话心智模型：**`class Foo` 不是声明而是表达式——Python 调用 `type("Foo", bases, namespace)` 创建类对象，写元类就是把这个 `type` 换成你自己的类**。流水线：`class User(Model)` 语句委托给 `type` → name/bases/namespace 三要素 → `OrmMeta.__new__` 扫描 Field 属性生成 `cls._fields`/`cls._table` → SQL 按字段生成。

## Why

没有这一层，"批量作用于类"的需求（自动加方法、注册子类、校验字段）只能在每个类里重复写代码，或用装饰器在类创建完之后补救。自定义元类可以拦截创建过程本身，在类创建时自动修改属性、注册子类、实现 ORM 字段映射。另外 `__init_subclass__`（Python 3.6+）是元类的轻量替代——只需要子类注册或校验时，不必动用元类这么重的机制。

## How

```bash
cd core/05_metaclass
python3 metaclass.py          # 运行全部 demo（type/单例/ORM/子类注册）
```

真实输出示例：

```
[1] type() class creation:
  1) type() creates a class:
    Dog.kingdom  = Animalia
    Dog.species = Canine
    type(Dog)    = type
    type(type)  = type

[2] AddStrMeta (auto __str__):
  Person({'name': 'Alice', 'age': 30})
  custom str  (has custom __str__, metaclass skipped)

[3] SingletonMeta:
  db1 is db2: True
  db1.host: localhost  (first creation wins)
  db1.query('SELECT 1'): [localhost] executing: SELECT 1

[4] Simple ORM (metaclass field mapping):
  User._table: user
  User._fields: ['id', 'name', 'email']
  CREATE: CREATE TABLE user (id int PRIMARY KEY, name str, email str)
  SELECT: SELECT id, name, email FROM user
  INSERT: INSERT INTO user (id, name, email) VALUES (1, 'Alice', 'alice@example.com')

[5] __init_subclass__ (no metaclass needed):
  Registered handlers: ['click', 'key']
  click handler: handling click
  All subclasses: ['ClickEvent', 'KeyEvent']

[6] Type hierarchy:
  int is instance of type: True
  type is instance of type: True
  type(42): int
  type(int): type
  type(type): type
```

诚实预期（本机实测）：

- 全部 demo 行为都是**确定性的**（单例 `db1 is db2: True`、ORM 生成的 SQL、子类注册列表每次运行一致）
- demo 的"ORM"只生成 SQL 字符串，**没有真实数据库连接**——元类字段映射的拦截效果可见，但执行层面不可验证
- 单例演示里第二次 `Database("remotehost")` 的参数被忽略（首次创建胜出），这是单例模式的预期陷阱而非 bug

### class 语句是 type() 的语法糖

```python
# 等价于 class Dog(Animal): species = "Canine"
Dog = type("Dog", (Animal,), {"species": "Canine"})
```

### 元类实战：单例模式

```python
class SingletonMeta(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]
```

元类的 `__call__` 在 `ClassName()` 时触发，控制实例的创建和返回。

### 元类实战：ORM 字段映射

```python
class OrmMeta(type):
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        cls._fields = {k: v for k, v in namespace.items() if isinstance(v, Field)}
        cls._table = name.lower()
        return cls
```

元类在类创建时扫描所有 `Field` 实例，自动构建表结构信息。

### `__init_subclass__` vs 元类

| 需求 | 推荐 |
|:---|:---|
| 子类注册/校验 | `__init_subclass__` |
| 修改类命名空间 | 元类 |
| 单例/ORM | 元类 |
| 简单钩子 | `__init_subclass__` |

原则：**能用 `__init_subclass__` 就不用元类**。

## Deep Dive

**最核心的一处代码**——SingletonMeta 的 `__call__`，体现元类的"拦截"思想：

```python
class SingletonMeta(type):
    _instances = {}                          # 类级字典：每个被治理的类共享这一个注册表
    def __call__(cls, *args, **kwargs):      # 为什么拦 __call__：ClassName() 触发的是
                                             # type(cls).__call__，即元类的 __call__——
                                             # 这是"实例创建"的必经之路
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)  # 只在首次真正执行 __new__/__init__
        return cls._instances[cls]           # 之后每次调用都返回首次缓存的实例
```

对照 ORM 模式：`__call__` 管的是"实例怎么创建"，`__new__` 管的是"类怎么创建"——两者拦截的时机不同。

踩坑清单：

- **批量注入方法要尊重类已有定义**：demo [2] 中类已自定义 `__str__` 时元类跳过注入（metaclass skipped），否则会悄悄覆盖用户实现

## Q&A

**Q1: `__new__` vs `__init__` vs 元类的 `__new__`？**

- `__new__`: 创建**实例**（对象）
- `__init__`: 初始化**实例**
- 元类的 `__new__`: 创建**类**本身

**Q2: type 是什么？**

`type` 是所有类的默认元类，也是自身的实例：

```python
type(int)              # <class 'type'>
type(type)             # <class 'type'>
isinstance(int, type)  # True
```

**Q3: ORM 框架如何自动收集字段？**

元类的 `__new__` 在类创建时扫描 namespace：把所有 `Field` 实例收进 `cls._fields`，表名取 `name.lower()` 存进 `cls._table`——之后 `CREATE/SELECT/INSERT` 的 SQL 都从这两个类属性生成，用户类里零样板。
