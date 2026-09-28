# 05 · 元类：在类创建之前拦截类型定义的"类的类"

> `class` 语句在定义的那一刻就立即执行、创建出类对象。那么这个"创建类"的动作
> 是谁在执行？答案是 `type`，所有类的默认元类。想让一批类自动获得 `__str__`、
> 自动单例（一个类全局只保留一个实例）、自动收集 ORM（对象关系映射，把类和对象映射到数据库表与行）字段，靠每个类里复制样板是不行的——
> 元类让你在"类创建之前"统一拦截，本实验看它怎么拦。

## Background

这一节回答：在元类这层拦截点出现之前，"批量作用于类"的需求是怎么满足的，卡在哪。

最直接的做法是每个类里复制样板：每个 ORM（对象关系映射，把类和对象映射到数据库表与行）模型类手写一遍字段清单和生成 SQL 的方法，每个管理类各写一遍单例（一个类全局只保留一个实例）逻辑。类一多，样板成倍增长，漏改一个类行为就不一致。

稍进一步的写法是类装饰器（接收类、返回修改后类的函数）：`@auto_str` 在类创建完之后补方法。它能消除部分重复，但只能"事后补救"——拿不到"类正在被创建"的时机，改不了类体的定义过程，也拦不住"这个类的实例怎么创建"这类更底层的动作（单例就需要这一步）。

依赖继承也不够：基类可以提供默认实现，却管不住子类怎么定义自己——子类忘了调用基类的登记逻辑，行为就静默缺失，问题要到运行时才暴露。

Python 3 把自定义元类写成 `class` 语句的关键字参数 `metaclass=...`，拦截类创建本身由此成为一等扩展点：类名、基类、类体在组装成类对象之前，都会先经过你写的类。

## What

这一节给出定义和一个"谁在制造类"的心智模型。

元类（metaclass）是"类的类"——类对象由它实例化而来，`type` 是所有类的默认元类。一句话心智模型：**`class Foo` 不是声明而是表达式——Python 调用 `type("Foo", bases, namespace)` 创建类对象，写元类就是把这个 `type` 换成你自己的类**。

可以把类和元类的关系想象成饼干和模具：类是压饼干的模具，对象是饼干；元类则是生产模具的机床。但和机床不同的是，元类在"生产模具"的每一步都能按订单改图纸——改名字、换继承、增删类属性——甚至能在"用模具压饼干"（`ClassName()`）时插手。

流水线全景：`class User(Model)` 语句委托给元类 → 类名、基类、类体里的名字三要素组装 → 元类的 `__new__` 扫描类体里表示数据库列的 Field 对象，生成字段表与表名 → SQL 按字段生成。每个环节的机制见 How It Works。

## When to Use

这一节给判断依据：什么时候值得上元类，什么时候更轻的钩子就够。

典型场景，都是"在做什么事的时候"：

- 写 ORM（对象关系映射，把类和对象映射到数据库表与行）模型层时——模型类只声明字段，表名、字段表、SQL 全部自动生成。
- 做一批管理类（数据库连接、配置中心）时——要求全局唯一的单例（一个类只保留一个实例）规则写在元类里，每个类不必各自实现。
- 搭插件体系时——处理器子类一声明就自动进注册表，框架按类名分发，不用手动维护清单。

何时不用：只需要子类注册、校验或简单钩子时，`__init_subclass__`（Python 3.6+ 的类钩子：子类被定义时自动在基类上触发）是元类的轻量替代，不必动用这么重的机制；只改一个类时，直接编辑或类装饰器更直白。原则：**能用 `__init_subclass__` 就不用元类**。

| 方案 | 与元类的差异 | 什么时候选它 |
|:---|:---|:---|
| 直接写进类里 | 零机制，但每个类重复样板 | 只有唯一类需要该行为 |
| 类装饰器 | 在类创建完之后修改 | 单个类的事后增强 |
| `__init_subclass__` | 只提供"子类定义时"的钩子，改不了命名空间 | 子类注册/校验、简单钩子 |
| 元类 | 拦截类创建本身，可改命名空间、拦实例化 | ORM 字段映射、单例、批量注入 |

## Quick Start

这一节把 demo 跑起来，给出两种元类实战的最小写法。前置条件：只用标准库。

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

### 元类实战：ORM 字段映射

这段在做什么：元类的 `__new__` 在类创建时被自动调用，扫描类体里所有 `Field` 实例，把表名和字段表挂成类属性——后续 SQL 全部从这两个类属性生成。

```python
class OrmMeta(type):
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        cls._fields = {k: v for k, v in namespace.items() if isinstance(v, Field)}
        cls._table = name.lower()
        return cls
```

单例的 `__call__` 拦截、`type()` 语法糖与类创建的完整流水线，见 How It Works。

## How It Works

这一节按"类怎么被造出来 → 实例怎么被造出来"的顺序拆机制，并与 Quick Start 输出互相印证。

### class 语句的完整流水线

`class User(Model)` 语句委托给元类执行：三要素——name（类名）、bases（继承的基类元组）、namespace（类体里定义的所有名字，即类的 `__dict__`）——组装成 `type(name, bases, namespace)` 的调用。

指定 `metaclass=` 时，这一步换成元类的 `__new__`。不写 `class` 语句、直接调用 `type` 也能造出类（语法糖指功能等价、但更好写好读的简写形式）：

```python
# 等价于 class Dog(Animal): species = "Canine"
Dog = type("Dog", (Animal,), {"species": "Canine"})
```

`type` 是所有类的默认元类，也是自身的实例：

```python
type(int)              # <class 'type'>
type(type)             # <class 'type'>
isinstance(int, type)  # True
```

输出 [1] 的 `type(Dog) = type`、`type(type) = type`，与输出 [6] 的 `type(42): int` → `type(int): type`，展示的正是"对象 → 类 → 元类"这条链：int 的类型是 type，type 的类型还是 type。

### SingletonMeta：拦截"实例怎么创建"

最核心的一处代码——SingletonMeta 的 `__call__`，体现元类的"拦截"思想：

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

输出 [3] 的 `db1 is db2: True` 与 `db1.host: localhost (first creation wins)` 说明第二次 `Database("remotehost")` 并没有真的创建新实例。

### OrmMeta：拦截"类怎么创建"

`OrmMeta.__new__`（Quick Start 已给出代码）在类创建时扫描 namespace：把所有 `Field` 实例（demo 中表示数据库列的对象）收进 `cls._fields`，表名取 `name.lower()` 存进 `cls._table`。

`CREATE/SELECT/INSERT` 的 SQL 都从这两个类属性生成，用户类里零样板——输出 [4] 的三条 SQL，正是从 `User._table: user` 与 `User._fields: ['id', 'name', 'email']` 拼出来的。

另外，输出 [5] 的子类注册（`Registered handlers: ['click', 'key']`）没有用元类：基类的 `__init_subclass__` 钩子在子类定义时自动执行——这就是 When to Use 里"轻量替代"的运行样子。

## Pitfalls & Q&A

这一节先列两个常见踩坑（现象、原因、解法）。"`__init_subclass__` 和元类怎么选"见 When to Use 的对比表；"type 是什么"已并入 How It Works 的类型链小节。

踩坑清单：

- **批量注入方法要尊重类已有定义**。现象：元类统一注入的 `__str__` 把某个类自己写的实现悄悄覆盖。原因：注入前没有检查类里是否已有同名定义。解法：注入前先判断——demo [2] 中类已自定义 `__str__` 时元类跳过注入（`metaclass skipped`），否则会覆盖用户实现。
- **单例会吞掉后续参数**。现象：第二次 `Database("remotehost")` 拿到的仍是 `host=localhost` 的旧实例。原因：单例首次创建胜出，后续调用的参数被忽略——这是单例模式的预期行为而非 bug。解法：需要按参数区分实例时，改用按 key 缓存的多例；确实要全局唯一时，把参数校验放在首次创建。

深入问答：

**Q1: `__new__` vs `__init__` vs 元类的 `__new__`？**

- `__new__`: 创建**实例**（对象）
- `__init__`: 初始化**实例**
- 元类的 `__new__`: 创建**类**本身
