# 06 · `__slots__` 与内存优化：用固定属性数组替代实例字典

## 1. 引言

Python 默认用 `__dict__`（哈希表）存储实例属性，每个实例约 200+ bytes 的基础开销。`__slots__` 声明固定属性集合后，Python 改用描述符数组存储，将每个实例的内存开销降低 40-60%。同时禁用动态属性添加，属性访问速度提升约 20-30%。

适合创建大量轻量对象（如坐标点、配置项、ORM 模型）的场景。

## 2. 文件结构

```
06_slots_memory/
├── README.md            # 本教程文档
├── slots_memory.py      # 主演示脚本：内存对比 / 继承 / weakref / 速度基准
├── scripts/
│   └── gen_diagram.py # 示意图生成脚本（含真实内存与速度测量数据）
└── images/
    └── slots_memory.png # 三面板可视化（由 gen_diagram.py 生成）
```

主脚本内容：

```
slots_memory.py
├── 1. RegularPoint / SlotPoint        # 基础对比
├── 2. SlotWithDefault                  # slots 属性默认值
├── 3. Slot3D / NoSlotChild            # 继承中的 slots
├── 4. SlotWithWeakref                  # weakref 支持
└── 5. benchmark_access()               # 访问速度基准测试
```

## 3. 核心概念

### 3.1 内存原理

```
RegularPoint (no slots):
  obj_header + __dict__ pointer + __dict__ hash table
  ~200+ bytes per instance

SlotPoint (with __slots__):
  obj_header + fixed-size array [x, y]
  ~48 bytes per instance (CPython 3.10 实测)
```

`__dict__` 是哈希表（动态、灵活、开销大），`__slots__` 是描述符数组（固定、紧凑、开销小）。

### 3.2 注意事项

| 规则 | 说明 |
|:---|:---|
| 子类与 slots | 父类的 slots 仍生效；子类若不声明自己的 `__slots__`，会**额外**获得 `__dict__` |
| 禁止动态属性 | `obj.z = 3` 抛出 `AttributeError` |
| 需要 `__weakref__` | 想支持 `weakref.ref()` 必须在 slots 中声明 |
| 属性描述符 | `SlotPoint.x` 是描述符（member_descriptor） |
| 默认值 | `__slots__ = ("x",)` 中 x 不自动设默认值 |

### 3.3 高频追问

**Q1: 什么时候应该用 `__slots__`？**

- 需要创建大量（成千上万）轻量对象时
- 对象属性固定、不需要动态添加属性时
- 内存敏感的场景（缓存、游戏实体）

**Q2: `__slots__` 会影响 pickle 序列化吗？**

不会。`pickle` 能正确处理 `__slots__` 对象。但 `__getstate__`/`__setstate__` 行为略有不同。

## 4. 实操演示

```bash
cd interview/06_slots_memory
python3 slots_memory.py          # 运行全部 demo
python3 scripts/gen_diagram.py # 重新生成 images/slots_memory.png
```

真实输出示例（macOS, CPython 3.10，节选）：

```
[2] Bulk memory (10,000 instances):
  Regular: 1484.4 KB total
  Slotted: 468.8 KB total
  Savings: 68.4%

[3] __slots__ blocks dynamic attributes:
  SlotPoint: can add .z?
    AttributeError: 'SlotPoint' object has no attribute 'z'

[5] weakref support:
  SlotPoint: TypeError: cannot create weak reference to 'SlotPoint' object

[6] Attribute access speed (1M iterations x 100 objects):
  regular_write: 1.3969s
  slot_write: 1.0488s
  Write speedup: 1.33x
  Read speedup:  1.15x
```

## 5. 预期结果与陷阱

![Slots Memory](images/slots_memory.png)

上图三面板展示 `__slots__` 的效果：
- **左图 — 实例内存布局**：`RegularPoint` 使用 `__dict__` 哈希表（~200 bytes），`SlotPoint` 使用固定数组（~48 bytes，CPython 3.10 实测）
- **中图 — 大规模内存对比**：随实例数量增长，slots 的内存优势愈发明显（10000 实例节省 ~50%+）
- **右图 — 属性访问速度**：slots 的描述符查找比 `__dict__` 哈希查找更快

诚实预期（本机实测）：

- **内存节省稳定可复现**（10000 实例节省 ~68%），但单个对象的 `sys.getsizeof` 只算对象本体——本机 3.10 中 `RegularPoint` 与 `SlotPoint` 的 getsizeof 同为 48 bytes，差异全部来自 `__dict__`（需把 `getsizeof(p.__dict__)` 加上才看得到），这是 `getsizeof` 只计浅层大小的预期陷阱
- **速度提升幅度波动大**（本机 1.1x~1.3x，且每次运行不同）："slots 快 20-30%" 是量级估计，不是稳定值；在部分版本/负载下差距更小
- `weakref.ref(SlotPoint(...))` 抛 `TypeError` 是预期行为，除非 slots 中声明了 `__weakref__`

## 6. 小结

1. **`__slots__` 用描述符数组替代 `__dict__`**，内存节省 40-60%
2. **禁用动态属性**，属性必须在 slots 中声明
3. **父类的 slots 仍生效**，但子类不声明自己的 `__slots__` 就会额外获得 `__dict__`
4. **属性访问更快**（描述符直接偏移 vs 哈希查找）
5. **需要 `__weakref__` 才支持弱引用**

下一篇进入 07_mro_mixin：看多继承下 C3 线性化如何决定 `super()` 的去向。
