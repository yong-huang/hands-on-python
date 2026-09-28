# 06 · `__slots__` 与内存优化：用固定属性数组替代实例字典

> Python 默认给每个实例挂一个实例属性字典 `__dict__`——底层是哈希表（按键直接定位存储位置的数据结构）。
> 只有两个属性的坐标点也要背上 150~350 bytes（随版本浮动），百万级小对象时字典比业务数据本身还占内存。
> `__slots__` 声明固定属性集合，让解释器用紧凑数组替代实例字典。
> 读完本篇你会知道它省内存的原理、正确的测量口径，以及什么时候不该用它。

## Background

这节回答三个问题：`__slots__` 出现之前对象属性是怎么存的、默认做法在什么场景下撞墙、`__slots__` 如何解决。

没有 `__slots__` 的默认世界里，Python 给每个实例配一张 `__dict__` 哈希表。它带来完全的动态性：任何时候都能给对象添加新属性，`p.z = 3` 写下即生效，框架也靠这一点实现灵活的参数传递。

代价藏在属性之外。这张表是独立的对象，大小随版本浮动很大（3.10 约 100 B，3.13 实测 296 B），而一个只有两个属性的点对象本体才 48 bytes。

上量之后问题放大：坐标点、配置项、ORM（对象关系映射，把数据库行映射成 Python 对象的框架）模型实例成千上万时，实例字典吃掉的内存远超业务数据本身。

`__slots__` 应运而生：在类上声明固定属性集合，解释器改用固定大小的数组存属性值，实例不再创建 `__dict__`。它曾是性能手段——约 3.10 及以前属性访问有 10%~40% 提速，但 3.11+ 的属性访问优化后两者基本持平，今天用它主要图内存，不是速度。

## What

这节先给定义，再用一个类比建立心智模型。

`__slots__` 是一种类级声明：在类体里写 `__slots__ = ("x", "y")`，把"属性存哪"从哈希表换成固定数组——`p.x = 1` 写入时经 member_descriptor（解释器为每个属性名在类上生成的描述符，即定义了如何读写该属性的对象）直达槽位，而不是查/建 `__dict__`。

效果可以用数字概括：

- 两属性实例从约 150~350 bytes 降到约 48 bytes
- 万级实例总内存节省 60%~70%
- 代价：禁用动态属性添加

可以把 `__slots__` 想象成高铁固定座位的售票系统：发车前就确定有哪些座位（属性名），乘客按号入座，查票时对号即可。但和可自由加座的机制不同的是，它不可扩张——临时"加座"（动态添加属性）会直接抛 `AttributeError`。

## When to Use

这节给判断依据：什么场景值得用，什么场景反而别用。

典型场景——在做什么事的时候：

- 需要创建大量（成千上万）轻量对象时，比如游戏里的实体、粒子系统的每个粒子
- 对象属性固定、不需要动态添加属性时，比如解析固定格式日志产生的记录对象
- 内存敏感的场景，比如缓存、游戏实体这类常驻内存的小对象集合

何时不用：

- 对象数量少（几十上百个）时，节省的内存可以忽略，还损失了动态属性的灵活性
- 需要动态附加属性的场景，比如给请求上下文对象挂临时状态
- 依赖 `__dict__` 动态设属性的第三方框架——接入前先确认它不会给实例添加计划外的属性

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|:---|:---|:---|
| 默认 `__dict__` | 灵活、可动态加属性，但每实例多一张哈希表 | 对象少或属性不固定 |
| `__slots__` | 属性固定为数组，省内存、禁动态属性 | 海量固定属性的小对象 |
| `namedtuple` | 固定字段的不可变元组，更省，但字段只读 | 纯数据、创建后不需修改 |
| `@dataclass(slots=True)` | 数据类写法 + slots，3.10 起提供 | 想要数据类语法又要省内存 |

## Quick Start

这节运行实验脚本，给出真实输出与读数时的诚实预期。前置条件：Python 3.10+（demo 在 3.10 与 3.13 上实测过）。

```bash
cd core/06_slots_memory
python3 slots_memory.py          # 运行全部 demo
```

真实输出示例（节选）：

```
[1] Instance memory comparison:
  RegularPoint: 48 bytes, has __dict__: True
  SlotPoint:     48 bytes, has __dict__: False
  RegularPoint.__dict__: {'x': 1, 'y': 2} (296 bytes)
  True total: RegularPoint 48 + 296 = 344 bytes  vs  SlotPoint 48 bytes
  SlotWithDefault(1, 2): z=0  (default comes from __init__, not slots)

[2] Bulk memory (10,000 instances):
  Regular: 1328.1 KB total
  Slotted: 468.8 KB total
  Savings: 64.7%

[3] __slots__ blocks dynamic attributes:
  SlotPoint: can add .z?
    AttributeError: 'SlotPoint' object has no attribute 'z' and no __dict__ for setting new attributes

...  # [4] __slots__ inheritance 省略（继承规则见 How It Works）
[5] weakref support:
  ...  # weakref 支持的对照行省略
  SlotPoint: TypeError: cannot create weak reference to 'SlotPoint' object

[6] Attribute access speed (1M iterations x 100 objects):
  regular_write: 0.6052s
  slot_write: 0.6676s
  regular_read: 0.6560s
  slot_read: 0.6643s
  Write speedup: 0.91x
  Read speedup:  0.99x
```

诚实预期（本机实测）：

- **`getsizeof` 只算对象本体**：demo [1] 里两个类的本体同为 48 bytes 不是 bug（对象头 16 + GC 头 16 + 指针/槽位 8×n 恰好等宽），`__dict__` 是另一个对象、要单独量——demo 已直接打印（本机实测 296 bytes，随版本浮动很大），真实总计 344 vs 48。节省幅度的正确口径看批量对比 [2]：10000 实例节省 64%~68%（3.13 实测 64.7%，3.10 实测 68.4%——两版实例字典大小不同所致）
- **速度比值随版本差异巨大**：本机 3.13 实测 write 0.91x / read 0.99x（多次运行在 0.9~1.05x 间浮动），3.10 实测 write 1.38x / read 1.08x——3.11+ 的属性访问优化让 slots 的速度优势基本消失，个别运行甚至持平或反超。"slots 快 20-30%" 是旧版本的经验值，别当成普适结论
- `[3]` 的 `AttributeError` 文案随版本变化：3.10 为 `'SlotPoint' object has no attribute 'z'`；3.11+ 追加后缀 ` and no __dict__ for setting new attributes`
- `weakref.ref(SlotPoint(...))` 抛 `TypeError` 是预期行为——weakref（弱引用，不增加引用计数、不阻止对象被垃圾回收的引用）需要对象提供 `__weakref__` 槽位，slots 类默认没有，除非在 `__slots__` 中显式声明它

## How It Works

这节拆开机制：为什么声明一个元组就能省下几百字节，以及继承时会发生什么。

最核心的机制——`__slots__ = ("x", "y")` 为什么能省内存：Python 据此为每个名字在类上建一个 member_descriptor，属性值直接存进实例的固定槽位数组，实例不再创建 `__dict__`。省的不是对象本体（本体 48 B 没变），是背后那张随版本膨胀的哈希表。

你在输出 [1] 里看到的 `has __dict__: False`，就来自这里；`SlotPoint.x` 之所以是描述符（member_descriptor），也因为属性读写全走它。

两种存储方式的内存布局对比：

```
RegularPoint (no slots):
  obj_header + __dict__ pointer + __dict__ hash table
  ~150-350 bytes per instance (48 B 本体 + 实例字典, 随版本浮动: 3.10 ~104 B, 3.13 ~296 B)

SlotPoint (with __slots__):
  obj_header + fixed-size array [x, y]
  ~48 bytes per instance (实测)
```

`__dict__` 是哈希表（动态、灵活、开销大），`__slots__` 是描述符数组（固定、紧凑、开销小）。

下面这段在演示两件事：普通 slotted 类怎么写，以及子类继承时 `__slots__` 的规则。

```python
class SlotPoint:
    __slots__ = ("x", "y")     # Python 据此为每个名字建 member_descriptor
    def __init__(self, x, y):
        self.x = x
        self.y = y

class Slot3D(SlotPoint):  # 以 SlotPoint 为父类举例
    __slots__ = ("z",)         # 子类必须再声明：父类的 slots 仍生效，
                               # 但子类不声明就额外获得 __dict__，省内存归零
```

默认值同理：`SlotWithDefault` 的 `z=0` 来自 `__init__` 形参默认值，slots 本身不存储默认值——对应输出 [1] 的末行。

## Pitfalls & Q&A

这节收集真实踩过的坑（按现象—原因—解法展开）和有增量信息的问答。

**坑 1：量出来的内存和预期对不上。**

- 现象：`sys.getsizeof`（返回对象自身占用字节数的函数）显示两个类都是 48 bytes，好像 slots 没生效
- 原因：`getsizeof` 只算对象本体，`__dict__` 是另一个对象要单独量
- 解法：正确口径见上文诚实预期第一条与输出 [1] 的 `True total` 行

**坑 2：子类忘声明 `__slots__`，整条继承链白省。**

- 现象：父类明明声明了 slots，批量测内存却没有下降
- 原因：子类若不声明自己的 `__slots__`，会额外获得 `__dict__`，省内存效果失效
- 解法：每个子类都显式声明 `__slots__ = ("z",)`，只写新增属性名；机制见上文 How It Works 的继承代码

**Q：`__slots__` 会影响 pickle 序列化（把对象转成字节流以便存储或传输）吗？**

不会。`pickle` 能正确处理 `__slots__` 对象。但 `__getstate__`/`__setstate__` 行为略有不同。
