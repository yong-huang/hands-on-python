# 🐍 Python 面试高频题 · 项目化实战清单

> 通过 20 个可运行的 Python 项目，系统覆盖 Python 面试中的高频编码题
> 每个项目对应 1-2 道经典面试题，附带可视化验证
> 预计周期：4-5 周（每天 2-3 小时）
> 全部项目在 macOS 上可运行，使用 Python 标准库为主

## 🤖 AI 辅助提示词速查

| 场景 | 提示词 |
|:---|:---|
| **开始一个新项目** | `我要开始 Python 面试项目「[项目名称]」，目标是实现 [核心功能]。请给我一个完整的 .py 文件，约 [行数] 行，包含测试用例和 main 函数演示，使用 Python 标准库，包含类型注解。另外请用 matplotlib 绘制该项目的架构图（组件关系 + 数据流向），输出为 PNG。只输出代码。` |
| **面试追问** | `面试官追问：[问题描述]。请帮我分析并给出 Python 实现方案。` |


## 📊 总进度

进度：████████████████████ 20/20 (100%)

| 阶段 | 项目数 | 已完成 |
|:---|:---:|:---:|
| 第一阶段：语言核心机制 | 6 | 6 |
| 第二阶段：内省、多态与并发 | 5 | 5 |
| 第三阶段：对象创建与生命周期 | 5 | 5 |
| 第四阶段：标准库与类型进阶 | 4 | 4 |
| **合计** | **20** | **20** |


## 🗂️ 第一阶段：语言核心机制（项目 1-6）

> **目标**：深入理解 Python 语言特性，覆盖面试中最常考的语言机制题

### [x] 项目 1：装饰器工厂 —— 带参数的装饰器

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | 装饰器本质是高阶函数，带参装饰器需三层嵌套（参数 → 函数 → wrapper）并用 `functools.wraps` 保留元信息 |
| **验收标准** | 实现 `@retry` / `@cache` / `@log_level` 三个带参装饰器，main 演示调用链与运行时行为 |
| **可视化** | `core/01_decorator_factory/images/decorator_factory.svg`（架构图）+ `core/01_decorator_factory/images/decorator_factory.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：不加 `functools.wraps` 会让 `__name__` 变成 wrapper，调试日志无法识别原函数


### [x] 项目 2：上下文管理器与 with 语句

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | with 背后是 `__enter__`/`__exit__` 协议，`__exit__` 返回 True 吞异常，`@contextmanager` 是函数式实现 |
| **验收标准** | 实现 Timer / FileLock / Transaction 等类式与函数式上下文管理器，含 `contextlib` 工具对比 |
| **可视化** | `core/02_context_manager/images/context_manager.svg`（架构图）+ `core/02_context_manager/images/context_manager.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：`@contextmanager` 里无法吞异常，要吞异常控制异常传播必须用类式实现并 `return True`


### [x] 项目 3：描述符协议

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | `__get__`/`__set__`/`__delete__` 是属性访问底层机制，数据描述符优先级高于实例 `__dict__` |
| **验收标准** | 实现 TypedField / CachedProperty / LazyField / LoggedField 四种描述符，演示属性查找优先级 |
| **可视化** | `core/03_descriptor/images/descriptor.svg`（架构图）+ `core/03_descriptor/images/descriptor.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：只定义 `__get__` 的非数据描述符可被实例 `__dict__` 覆盖，只有数据描述符才始终拦截读写


### [x] 项目 4：生成器与迭代器协议

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | yield 惰性求值并保存完整栈帧实现暂停/恢复；send 双向通信、yield from 委托子生成器 |
| **验收标准** | 手写迭代器 vs 生成器、斐波那契、send 累加器、yield from 扁平化、O(1) 内存惰性管道 |
| **可视化** | `core/04_generator_iterator/images/generator_iterator.svg`（架构图）+ `core/04_generator_iterator/images/generator_iterator.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：生成器是单向迭代器，耗尽后无法重置，需要再次遍历必须重新创建


### [x] 项目 5：元类

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | 元类是"类的类"，class 语句本质是 `type()` 调用；`__call__` 控制实例创建、`__new__` 控制类创建 |
| **验收标准** | `type()` 建类、单例元类、ORM 字段映射元类、`__init_subclass__` 子类注册 |
| **可视化** | `core/05_metaclass/images/metaclass.svg`（架构图）+ `core/05_metaclass/images/metaclass.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：能用轻量的 `__init_subclass__` 就别用元类，元类易过度设计


### [x] 项目 6：`__slots__` 与内存优化

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | `__slots__` 用描述符数组替代 `__dict__` 哈希表，内存省 40-60% 并禁用动态属性 |
| **验收标准** | RegularPoint vs SlotPoint 内存对比、继承中 slots、weakref 支持、访问速度基准测试 |
| **可视化** | `core/06_slots_memory/images/slots_memory.svg`（架构图）+ `core/06_slots_memory/images/slots_memory.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：子类不继承父类 slots 需重新声明，否则自动获得 `__dict__`；支持弱引用须显式声明 `__weakref__`


## 🗂️ 第二阶段：内省、多态与并发（项目 7-11）

> **目标**：吃透 MRO、GIL 与魔术方法，掌握对象内省与多态机制

### [x] 项目 7：MRO 方法解析顺序与 Mixin

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | MRO 由 C3 线性化决定，`super()` 调用的是 MRO 中的下一个而非语义上的"父类" |
| **验收标准** | 钻石继承 D(B,C) 的 MRO、`super()` 调用链、JSON/Repr/Validate 三个 Mixin 组合 |
| **可视化** | `core/07_mro_mixin/images/mro_mixin.svg`（架构图）+ `core/07_mro_mixin/images/mro_mixin.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：Mixin 里用 `ClassName.__init__(self)` 会破坏 MRO 链，必须始终用 `super()`


### [x] 项目 8：GIL 与并发模型

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | GIL 同一时刻只允许一个线程执行字节码；CPU 密集用 multiprocessing、I/O 密集用 threading/asyncio |
| **验收标准** | 串行 / threading / multiprocessing 三方案的 CPU 与 I/O 密集基准对比，附小任务粒度倒挂对照 |
| **可视化** | `core/08_gil_concurrency/images/gil_concurrency.svg`（架构图）+ `core/08_gil_concurrency/images/gil_concurrency.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：threading 做 CPU 密集因 GIL 争用比串行更慢；纯 Python 循环不释放 GIL，只有 C 扩展能释放


### [x] 项目 9：魔术方法

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | 运算符与内置函数背后都是魔术方法，`__repr__` 给调试、`__str__` 给显示 |
| **验收标准** | Point 完整魔术方法、`@total_ordering`、`@dataclass`、自实现 RingBuffer 容器 |
| **可视化** | `core/09_magic_methods/images/magic_methods.svg`（架构图）+ `core/09_magic_methods/images/magic_methods.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：定义了 `__eq__` 却不定义 `__hash__` 时对象自动不可哈希，不能当作 dict key


### [x] 项目 10：ABC 抽象基类与 Duck Typing

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | 多态是 Duck Typing（关注行为不关注类型）；ABC 用 `@abstractmethod` 强制实现，Protocol 提供结构化子类型 |
| **验收标准** | Duck/Robot 鸭子类型、Transport 抽象基类、`register()` 虚拟子类、isinstance 检查 |
| **可视化** | `core/10_abc_duck_typing/images/abc_duck_typing.svg`（架构图）+ `core/10_abc_duck_typing/images/abc_duck_typing.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：`@abstractmethod` 在实例化时检查，而 `raise NotImplementedError` 要到方法调用时才会暴露


### [x] 项目 11：`__getattr__` / `__getattribute__` —— 属性访问控制与动态代理

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | `__getattribute__` 每次访问都触发，`__getattr__` 仅在常规查找失败后才触发；代理用 `__getattr__` 透明转发 |
| **验收标准** | 动态属性、访问日志、Proxy 转发、LazyConfig 懒加载四种模式 |
| **可视化** | `core/11_getattr_proxy/images/getattr_proxy.svg`（架构图）+ `core/11_getattr_proxy/images/getattr_proxy.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：在 `__getattribute__` 里写 `self.xxx` 会无限递归，必须用 `object.__getattribute__(self, 'xxx')`


## 🗂️ 第三阶段：对象创建与生命周期（项目 12-16）

> **目标**：理解对象创建、拷贝、参数传递与回收的完整生命周期

### [x] 项目 12：`__new__` vs `__init__`

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | `__new__` 分配内存返回实例、`__init__` 初始化属性；`__new__` 返回非 cls 实例时 `__init__` 不被调用 |
| **验收标准** | 调用顺序追踪、实例缓存、不可变类型子类化（UpperStr/LimitedInt）、工厂模式 |
| **可视化** | `core/12_new_vs_init/images/new_vs_init.svg`（架构图）+ `core/12_new_vs_init/images/new_vs_init.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：`__new__` 命中缓存返回已有实例时 `__init__` 仍会被调用，需注意重复初始化


### [x] 项目 13：`__call__` 可调用对象

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | `obj(args)` 等价于 `obj.__call__(args)`；可调用对象 = 函数能力 + 对象状态，支撑策略模式与类装饰器 |
| **验收标准** | Multiplier/Accumulator 有状态可调用、Formatter 策略切换、Validator 验证器链 |
| **可视化** | `core/13_callable/images/callable.svg`（架构图）+ `core/13_callable/images/callable.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：普通函数不能添加自定义属性（`fn.custom = 1` 报错），跨调用保持状态只能靠可调用对象或闭包


### [x] 项目 14：copy 与 deepcopy

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | `=` 赋值不建副本，`copy.copy()` 外层独立内层共享，`deepcopy` 递归全独立，靠 memo 字典处理循环引用 |
| **验收标准** | 6 组 demo 对比嵌套列表 / 不可变对象 / 自定义 `__copy__` / 循环引用场景 |
| **可视化** | `core/14_copy_deepcopy/images/copy_deepcopy.svg`（架构图）+ `core/14_copy_deepcopy/images/copy_deepcopy.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：浅拷贝修改内层可变对象会同时影响原对象，这是浅拷贝最易忽视的坑


### [x] 项目 15：`*args` / `**kwargs`

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | 定义时 `*args` 收集 tuple / `**kwargs` 收集 dict，调用时解包；打包与解包是对偶操作 |
| **验收标准** | 8 组演示：参数顺序、kw_only/pos_only 分隔符、字面量解包与字典合并 |
| **可视化** | `core/15_args_kwargs/images/args_kwargs.svg`（架构图）+ `core/15_args_kwargs/images/args_kwargs.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：参数顺序 pos-only → `*args` → `**kwargs` 违反直接 SyntaxError；`/` 与 `*` 分隔符方向别搞混


### [x] 项目 16：GC、weakref 与 `__del__`

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | 引用计数为主、分代 GC 为辅，循环引用靠 gc 可达性分析回收；weakref 不增加引用计数 |
| **验收标准** | refcount、循环引用 `gc.collect()`、`weakref.ref/finalize`、WeakKeyDictionary 自动清理 |
| **可视化** | `core/16_gc_weakref/images/gc_weakref.svg`（架构图）+ `core/16_gc_weakref/images/gc_weakref.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：`__del__` 在循环引用下可能不被调用且异常被静默忽略，清理资源应优先用 with 上下文管理器


## 🗂️ 第四阶段：标准库与类型进阶（项目 17-20）

> **目标**：掌握 property、类型系统与 collections/itertools 等高价值标准库工具

### [x] 项目 17：property —— 受控属性访问

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | `@property` 本质是数据描述符（优先级高于实例 `__dict__`），setter 做验证、无 setter 即只读 |
| **验收标准** | Circle 验证/deleter、Rectangle 只读计算属性、Temperature 摄氏华氏同步、描述符本质揭示 |
| **可视化** | `core/17_property/images/property.svg`（架构图）+ `core/17_property/images/property.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：只读 property 赋值抛 `AttributeError`；`cached_property` 是非数据描述符，可被实例字典覆盖


### [x] 项目 18：typing / TypeVar / Generic / Protocol

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | 类型注解不影响运行时；TypeVar 参数化、`Generic[T]` 泛型类、Protocol 只检查方法签名 |
| **验收标准** | 泛型 Stack、Sized/Readable 协议 isinstance 检查、Union/Optional、泛型函数 |
| **可视化** | `core/18_typing_generic/images/typing_generic.svg`（架构图）+ `core/18_typing_generic/images/typing_generic.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：注解运行时完全不检查，`Stack[int].push("wrong")` 不报错，必须靠 mypy/pyright 把关


### [x] 项目 19：collections 与 dataclass

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | namedtuple 不可变轻量、dataclass 自动生成样板代码，`default_factory` 避免可变默认值陷阱 |
| **验收标准** | namedtuple / 冻结 dataclass / 嵌套 dataclass / `asdict()` 序列化（含 `__post_init__`） |
| **可视化** | `core/19_collections/images/collections.svg`（架构图）+ `core/19_collections/images/collections.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：`field(default=[])` 会让所有实例共享同一 list，必须用 `default_factory=list`


### [x] 项目 20：itertools / functools / operator

| 项目信息 | 详情 |
|:---|:---|
| **核心考点** | itertools 惰性求值、`lru_cache`、`partial`、`reduce`、`singledispatch`、operator 替代 lambda |
| **验收标准** | chain/islice/accumulate/combinations/groupby、缓存与排序、三面板可视化 |
| **可视化** | `core/20_itertools_func/images/itertools_func.svg`（架构图）+ `core/20_itertools_func/images/itertools_func.html`（交互版） |

**完成日期**：2026-08-14
**踩坑记录**：`groupby` 只能分组连续相同元素，未排序数据必须先 `sorted()`


## 📅 周计划

| 周次 | 内容 | 项目数 |
|:---|:---|:---:|
| **第 1 周** | 项目 1-6（语言核心机制）| 6 |
| **第 2 周** | 项目 7-11（内省、多态与并发）| 5 |
| **第 3 周** | 项目 12-16（对象创建与生命周期）| 5 |
| **第 4-5 周** | 项目 17-20（标准库与类型进阶）| 4 |


## 🏆 里程碑

- [x] **完成项目 1-6** → 语言核心机制（装饰器/上下文/描述符/生成器/元类/__slots__）
- [x] **完成项目 7-11** → 内省与并发（MRO/GIL/魔术方法/ABC/属性代理）
- [x] **完成项目 12-16** → 对象生命周期（__new__/__call__/拷贝/参数/GC 弱引用）
- [x] **完成项目 17-20** → 标准库进阶（property/typing/dataclass/itertools）


## 📝 每日日志

| 日期 | 项目 | 耗时 | 收获 | 踩坑 |
|:---|:---|:---:|:---|:---|
| 2026-08-14 | 项目 1-20 | 4 周 | 20 个 Python 高频面试题全部完成，覆盖语言核心机制与标准库进阶 | roadmap 原清单与实际实现不一致，已按实际主题重写对齐并标记 20/20 |


## 🔧 环境配置

```bash
# Python 版本（建议 3.10+）
python3 --version

# 创建工作目录
mkdir -p ~/python-interview-projects
cd ~/python-interview-projects

# 每个项目独立目录
mkdir 01_decorator_factory && cd 01_decorator_factory
# 编写 main.py
python3 main.py

# 可选依赖（部分项目用到）
pip install matplotlib
```


## 📋 高频面试题索引

| 题号 | 题目 | 对应项目 | 难度 |
|:---:|:---|:---:|:---:|
| 1 | 装饰器（带参数）| 项目 1 | ⭐⭐⭐ |
| 2 | 上下文管理器 | 项目 2 | ⭐⭐ |
| 3 | 描述符 | 项目 3 | ⭐⭐⭐ |
| 4 | 生成器/迭代器 | 项目 4 | ⭐⭐⭐ |
| 5 | 元类 | 项目 5 | ⭐⭐⭐⭐ |
| 6 | `__slots__` | 项目 6 | ⭐⭐ |
| 7 | MRO / super | 项目 7 | ⭐⭐⭐ |
| 8 | GIL 与并发模型 | 项目 8 | ⭐⭐⭐⭐ |
| 9 | 魔术方法 | 项目 9 | ⭐⭐⭐ |
| 10 | ABC / 鸭子类型 | 项目 10 | ⭐⭐⭐ |
| 11 | `__getattr__` / 代理 | 项目 11 | ⭐⭐⭐ |
| 12 | `__new__` / `__init__` | 项目 12 | ⭐⭐⭐ |
| 13 | `__call__` | 项目 13 | ⭐⭐ |
| 14 | copy / deepcopy | 项目 14 | ⭐⭐ |
| 15 | *args / **kwargs | 项目 15 | ⭐⭐ |
| 16 | GC / weakref | 项目 16 | ⭐⭐⭐ |
| 17 | property | 项目 17 | ⭐⭐⭐ |
| 18 | typing / Generic | 项目 18 | ⭐⭐⭐ |
| 19 | collections / dataclass | 项目 19 | ⭐⭐⭐ |
| 20 | itertools / functools | 项目 20 | ⭐⭐ |