# 06 · `__slots__` 与内存优化：用固定属性数组替代实例字典

> 上一实验的元类在"类创建期"做文章；这一实验把镜头对准"实例运行期"的开销。
> Python 默认给每个实例挂一个 `__dict__` 哈希表——只有两个属性的点对象也要背上
> 150~350 bytes（随版本浮动），百万级小对象时字典比业务数据本身还占内存。
> `__slots__` 声明固定属性集合，让 Python 用紧凑数组替代实例字典，本实验看它的原理与代价。

## 1. 为什么需要它

Python 默认用 `__dict__`（哈希表）存储实例属性，两属性对象每个实例约 150~350 bytes（对象本体 48 B + 实例字典；字典大小随版本浮动很大，3.10 约 100 B，3.13 实测 296 B）。对象数量一上量（坐标点、配置项、ORM 模型实例成千上万时），实例字典吃掉的内存远超业务数据本身。

`__slots__` 声明固定属性集合后，Python 改用描述符数组存储，每个实例降到约 48 bytes，万级实例总内存节省 60%~70%。同时禁用动态属性添加。历史上（约 3.10 及以前）属性访问也有 10%~40% 提速，但 3.11+ 的属性访问优化后两者已基本持平——**今天用 slots 的主要理由是内存，不是速度**。

## 2. 总览：核心机制一图看懂

![__slots__：属性写入的两条路径](images/slots_memory.svg)

一句话心智模型：**`__slots__` 把"属性存哪"从哈希表换成固定数组——`p.x = 1` 写入时经 member_descriptor 直达槽位，而不是查/建 `__dict__`**。看图时对比两条写入路径：`type(p)` 查找 `x`——类定义了 `__slots__` 就经描述符直取固定槽位数组；没有（默认）则落进实例字典哈希表；给 slots 对象新增未声明属性会直接 `AttributeError`。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/interview/06_slots_memory/images/slots_memory.html)
> （或本地打开 [`images/slots_memory.html`](images/slots_memory.html)）。

## 3. 快速开始

```bash
cd interview/06_slots_memory
python3 slots_memory.py          # 运行全部 demo
```

真实输出示例（macOS, CPython 3.13，节选）：

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

[5] weakref support:
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

- **`getsizeof` 只算对象本体**：demo [1] 里两个类的本体同为 48 bytes 不是 bug（对象头 16 + GC 头 16 + 指针/槽位 8×n 恰好等宽），`__dict__` 是另一个对象、要单独量——demo 已直接打印（本机 3.13 实测 296 bytes，随版本浮动很大），真实总计 344 vs 48。节省幅度的正确口径看批量对比 [2]：10000 实例节省 64%~68%（3.13 实测 64.7%，3.10 实测 68.4%——两版实例字典大小不同所致）
- **速度比值随版本差异巨大**：本机 3.13 实测 write 0.91x / read 0.99x（多次运行在 0.9~1.05x 间浮动），3.10 实测 write 1.38x / read 1.08x——3.11+ 的属性访问优化让 slots 的速度优势基本消失，个别运行甚至持平或反超。"slots 快 20-30%" 是旧版本的经验值，别当成普适结论
- `[3]` 的 `AttributeError` 文案随版本变化：3.10 为 `'SlotPoint' object has no attribute 'z'`；3.11+ 追加后缀 ` and no __dict__ for setting new attributes`
- `weakref.ref(SlotPoint(...))` 抛 `TypeError` 是预期行为，除非 slots 中声明了 `__weakref__`

## 4. 核心概念

### 4.1 内存原理

```
RegularPoint (no slots):
  obj_header + __dict__ pointer + __dict__ hash table
  ~150-350 bytes per instance (48 B 本体 + 实例字典, 随版本浮动: 3.10 ~104 B, 3.13 ~296 B)

SlotPoint (with __slots__):
  obj_header + fixed-size array [x, y]
  ~48 bytes per instance (CPython 3.10/3.13 实测)
```

`__dict__` 是哈希表（动态、灵活、开销大），`__slots__` 是描述符数组（固定、紧凑、开销小）。

### 4.2 注意事项

| 规则 | 说明 |
|:---|:---|
| 子类与 slots | 父类的 slots 仍生效；子类若不声明自己的 `__slots__`，会**额外**获得 `__dict__` |
| 禁止动态属性 | `obj.z = 3` 抛出 `AttributeError` |
| 需要 `__weakref__` | 想支持 `weakref.ref()` 必须在 slots 中声明 |
| 属性描述符 | `SlotPoint.x` 是描述符（member_descriptor） |
| 默认值 | `__slots__ = ("x",)` 中 x 不自动设默认值 |

## 5. 关键代码解析

最核心的构造是 **slots 类与继承的组合**：

```python
class SlotPoint:
    __slots__ = ("x", "y")     # 为什么是类属性元组：Python 据此为每个名字建
                               # member_descriptor，属性值存进实例的固定槽位数组，
                               # 不再为实例创建 __dict__
    def __init__(self, x, y):
        self.x = x
        self.y = y

class Slot3D(Slot2D):
    __slots__ = ("z",)         # 子类必须再声明：父类的 slots 仍生效，
                               # 但子类不声明就额外获得 __dict__，省内存归零
```

默认值同理：`SlotWithDefault` 的 `z=0` 来自 `__init__` 形参默认值，slots 本身不存储默认值。

坑清单：

- **`sys.getsizeof` 只算对象本体**：`RegularPoint` 与 `SlotPoint` 单看都是 48 bytes，差异在 `__dict__`——要 `getsizeof(p) + getsizeof(p.__dict__)` 才是真实开销
- **子类忘声明 `__slots__`**：额外获得 `__dict__`，整条继承链的省内存效果失效
- **想用 `weakref.ref()` 必须在 slots 中声明 `__weakref__`**，否则抛 `TypeError`
- **别背"slots 快 20-30%"的旧结论**：3.11+ 属性访问优化后基本持平，个别运行甚至反超
- **示意图中的写入路径是示意数据**（展示两条存储路径模式），不是某次运行的实录

## 6. 文件结构

```
06_slots_memory/
├── README.md                     # 本教程文档
├── slots_memory.py               # 主演示脚本：内存对比 / 继承 / weakref / 速度基准
└── images/
    ├── slots_memory.json # 图源（typed JSON IR，可编辑重渲染）
    ├── slots_memory.html # 交互示意图（浏览器打开）
    └── slots_memory.svg  # 双主题矢量图（本 README §2 内嵌）
```

`slots_memory.py` 内容：`1. RegularPoint / SlotPoint` 基础对比 / `2. SlotWithDefault` 默认值来自 `__init__` 形参（slots 本身无默认值）/ `3. Slot3D / NoSlotChild` 继承中的 slots / `4. SlotWithWeakref` weakref 支持 / `5. benchmark_access()` 访问速度基准测试。

## 7. 面试要点

**Q1: 什么时候应该用 `__slots__`？**

- 需要创建大量（成千上万）轻量对象时
- 对象属性固定、不需要动态添加属性时
- 内存敏感的场景（缓存、游戏实体）

**Q2: `__slots__` 会影响 pickle 序列化吗？**

不会。`pickle` 能正确处理 `__slots__` 对象。但 `__getstate__`/`__setstate__` 行为略有不同。

**Q3: `__slots__` 为什么省内存？**

普通类每个实例挂一张 `__dict__` 哈希表（动态、灵活、开销大）；slots 声明固定属性集合后改用描述符数组（固定、紧凑、开销小），两属性实例从约 150~350 bytes 降到约 48 bytes，万级实例总内存节省 60%~70%。

**Q4: 继承中 `__slots__` 有什么坑？**

父类的 slots 仍生效，但子类若不声明自己的 `__slots__`，会额外获得 `__dict__`——省内存效果在子类上归零。另注意 `__slots__` 不自动设默认值，默认值得靠 `__init__` 形参提供。

**Q5: `__slots__` 能让属性访问变快吗？**

约 3.10 及以前能（10%~40% 提速）；3.11+ 属性访问优化后基本持平，实测比值随版本甚至能反超。所以正确答案今天是"slots 为省内存，不为提速"。

## 8. 总结

1. **`__slots__` 用描述符数组替代 `__dict__`**，万级实例总内存节省 60%~70%
2. **禁用动态属性**，属性必须在 slots 中声明
3. **父类的 slots 仍生效**，但子类不声明自己的 `__slots__` 就会额外获得 `__dict__`
4. **属性访问不慢于普通属性**（3.10 及以前更快，3.11+ 基本持平）——别把速度当作用 slots 的主要理由
5. **需要 `__weakref__` 才支持弱引用**

下一篇进入 [07_mro_mixin](../07_mro_mixin/README.md)：看多继承下 C3 线性化如何决定 `super()` 的去向。
