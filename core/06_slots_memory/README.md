# 06 · `__slots__` 与内存优化：用固定属性数组替代实例字典

> 元类在"类创建期"做文章，`__slots__` 把镜头对准"实例运行期"的开销。
> Python 默认给每个实例挂一个 `__dict__` 哈希表——只有两个属性的点对象也要背上
> 150~350 bytes（随版本浮动），百万级小对象时字典比业务数据本身还占内存。
> `__slots__` 声明固定属性集合，让 Python 用紧凑数组替代实例字典，本实验看它的原理与代价。

## What

`__slots__` 是类级声明：把"属性存哪"从哈希表换成固定数组——`p.x = 1` 写入时经 member_descriptor 直达槽位，而不是查/建 `__dict__`。两属性实例从约 150~350 bytes 降到约 48 bytes，万级实例总内存节省 60%~70%，同时禁用动态属性添加。

## Why

Python 默认用 `__dict__`（哈希表）存储实例属性，字典大小随版本浮动很大（3.10 约 100 B，3.13 实测 296 B）。对象数量一上量（坐标点、配置项、ORM 模型实例成千上万时），实例字典吃掉的内存远超业务数据本身。历史上（约 3.10 及以前）属性访问也有 10%~40% 提速，但 3.11+ 的属性访问优化后两者已基本持平——**今天用 slots 的主要理由是内存，不是速度**。

## How

```bash
cd core/06_slots_memory
python3 slots_memory.py          # 运行全部 demo
```

真实输出示例：

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

- **`getsizeof` 只算对象本体**：demo [1] 里两个类的本体同为 48 bytes 不是 bug（对象头 16 + GC 头 16 + 指针/槽位 8×n 恰好等宽），`__dict__` 是另一个对象、要单独量——demo 已直接打印（本机实测 296 bytes，随版本浮动很大），真实总计 344 vs 48。节省幅度的正确口径看批量对比 [2]：10000 实例节省 64%~68%（3.13 实测 64.7%，3.10 实测 68.4%——两版实例字典大小不同所致）
- **速度比值随版本差异巨大**：本机 3.13 实测 write 0.91x / read 0.99x（多次运行在 0.9~1.05x 间浮动），3.10 实测 write 1.38x / read 1.08x——3.11+ 的属性访问优化让 slots 的速度优势基本消失，个别运行甚至持平或反超。"slots 快 20-30%" 是旧版本的经验值，别当成普适结论
- `[3]` 的 `AttributeError` 文案随版本变化：3.10 为 `'SlotPoint' object has no attribute 'z'`；3.11+ 追加后缀 ` and no __dict__ for setting new attributes`
- `weakref.ref(SlotPoint(...))` 抛 `TypeError` 是预期行为，除非 slots 中声明了 `__weakref__`

### 内存原理

```
RegularPoint (no slots):
  obj_header + __dict__ pointer + __dict__ hash table
  ~150-350 bytes per instance (48 B 本体 + 实例字典, 随版本浮动: 3.10 ~104 B, 3.13 ~296 B)

SlotPoint (with __slots__):
  obj_header + fixed-size array [x, y]
  ~48 bytes per instance (实测)
```

`__dict__` 是哈希表（动态、灵活、开销大），`__slots__` 是描述符数组（固定、紧凑、开销小）。

### 继承与默认值

```python
class SlotPoint:
    __slots__ = ("x", "y")     # Python 据此为每个名字建 member_descriptor
    def __init__(self, x, y):
        self.x = x
        self.y = y

class Slot3D(Slot2D):
    __slots__ = ("z",)         # 子类必须再声明：父类的 slots 仍生效，
                               # 但子类不声明就额外获得 __dict__，省内存归零
```

默认值同理：`SlotWithDefault` 的 `z=0` 来自 `__init__` 形参默认值，slots 本身不存储默认值。

### 注意事项

| 规则 | 说明 |
|:---|:---|
| 子类与 slots | 父类的 slots 仍生效；子类若不声明自己的 `__slots__`，会**额外**获得 `__dict__` |
| 禁止动态属性 | `obj.z = 3` 抛出 `AttributeError` |
| 需要 `__weakref__` | 想支持 `weakref.ref()` 必须在 slots 中声明 |
| 属性描述符 | `SlotPoint.x` 是描述符（member_descriptor） |
| 默认值 | `__slots__ = ("x",)` 中 x 不自动设默认值 |

## Deep Dive

**最核心的机制**——`__slots__ = ("x", "y")` 为什么能省内存：Python 据此为每个名字在类上建一个 member_descriptor，属性值直接存进实例的固定槽位数组，实例不再创建 `__dict__`。省的不是对象本体（本体 48 B 没变），是背后那张随版本膨胀的哈希表。

踩坑清单：

- **`sys.getsizeof` 只算对象本体**：`RegularPoint` 与 `SlotPoint` 单看都是 48 bytes，要 `getsizeof(p) + getsizeof(p.__dict__)` 才是真实开销（demo [1] 已直接打印）
- **子类忘声明 `__slots__`**：额外获得 `__dict__`，整条继承链的省内存效果失效

## Q&A

**Q1: 什么时候应该用 `__slots__`？**

- 需要创建大量（成千上万）轻量对象时
- 对象属性固定、不需要动态添加属性时
- 内存敏感的场景（缓存、游戏实体）

**Q2: `__slots__` 会影响 pickle 序列化吗？**

不会。`pickle` 能正确处理 `__slots__` 对象。但 `__getstate__`/`__setstate__` 行为略有不同。
