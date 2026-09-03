# 16 · GC、weakref 与 `__del__`：引用计数搞不定的循环引用谁来收

> 上一实验的透明参数转发让函数能接住任意多的实参，对象也因此更容易被到处传递。
> 但传出去的对象总有"没人再用"的一天——谁来回收？
> 引用计数归零会立即回收，可循环引用让计数永不归零。
> 本实验看引用计数、分代 GC、weakref 与 `__del__` 如何接力管理对象生命周期。

## 1. 为什么需要它

Python 的内存管理采用**引用计数为主、分代 GC 为辅**的双轨机制。引用计数在引用归零时立即回收对象（大多数场景）；但当对象之间存在循环引用时，引用计数永远不为 0，需要分代 GC 定期扫描发现并回收。`weakref` 模块提供不增加引用计数的弱引用，用于缓存、观察者模式等需要"引用但不阻止回收"的场景。`__del__` 是析构函数，在对象被回收前调用，但在循环引用场景下行为不可靠。不理解这套机制会怎样：内存泄漏排查无从下手，误以为对象被回收而实际被隐式强引用拽住，或在资源清理上依赖不可靠的 `__del__`——面试和实践中都建议优先使用上下文管理器。

## 2. 总览：核心机制一图看懂

![对象的一生：引用计数 + 分代 GC](images/gc_weakref.archify.svg)

一句话心智模型：**引用计数随引用增减，归 0 立即回收；循环引用计数永不归 0，由分代 GC 兜底；weakref 不参与计数，只是"观察"**。看图时先走主线：`obj = Node()` → `a = b = obj`（引用 +1）→ 逐个 `del` → 计数归 0 触发 `__del__` 释放；再看两条岔路——循环引用 `a↔b` 靠 `gc.collect()` 分代扫描回收，`weakref.ref(obj)` 在对象回收后返回 `None`。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/interview/16_gc_weakref/images/gc_weakref.archify.html)
> （或本地打开 [`images/gc_weakref.archify.html`](images/gc_weakref.archify.html)）。

## 3. 快速开始

```bash
cd interview/16_gc_weakref
python3 gc_weakref.py          # 运行 GC / weakref demo
```

真实输出示例（macOS, CPython 3.10）：

```
[1] Reference counting:
  obj = object()  -> refcount: 2
  a = obj         -> refcount: 3
  b = a           -> refcount: 4
  del b          -> refcount: 3
  del a          -> refcount: 2

[2] Cyclic reference (GC needed):
  Before: 0 nodes
  After del: 2 nodes (still alive!)
  gc.collect(): 22 objects collected
  After GC: 2 nodes

[3] weakref (non-blocking reference):
  obj: CacheEntry('user:123')
  ref(): CacheEntry('user:123')
  ref() is obj: True
  After del obj:
  ref(): None  (dead!)
  [callback] object was garbage collected!
  alive: False

[4] WeakKeyDictionary (auto-cleanup):
  cache has 1 entries
  cache[obj]: cached result
  After del + GC: cache has 0 entries

[5] __del__ warnings:
  - since 3.4 (PEP 442) cyclic garbage WITH __del__ is
    collected AND finalized (order unspecified)
  - interpreter exit does NOT guarantee __del__ runs
  - __del__ exceptions are ignored (only warned)
  - Prefer context managers for cleanup

[6] GC generations:
  Gen 0: 1 objects
  Gen 1: 0 objects
  Gen 2: 8007 objects
  gc.get_threshold(): (700, 10, 10)
```

诚实预期（本机实测）：

- **`getrefcount` 读数偏 1**：demo 中 `object()` 显示 refcount=2 而不是 1 —— `sys.getrefcount(obj)` 的实参传递本身临时持有一次引用，这是文档明示的行为，不是 bug
- **`gc.collect()` 后 `After GC: 2 nodes`**：Node 并没有被这轮 GC 回收，因为 `Node.all_nodes` 类属性（列表）对每个节点持有**强引用**，循环对 GC 来说是"可达"的。两个节点的 `[__del__] destroyed` 日志出现在 demo 全部结束之后（解释器退出时才销毁）—— 这恰好是"隐式强引用导致对象延迟回收"的活例子
- **`gc.collect(): 22 objects`、各代对象数（Gen 2: 8007）每次运行都会波动**：回收数量取决于解释器启动以来分配过的对象，属于预期，不要和固定值对比
- **`gc.get_threshold()` 的值随版本不同**：3.12 及以前为 `(700, 10, 10)`，3.13 起为 `(2000, 10, 10)`——本示例为 3.10 输出，在 3.13 上会看到 2000
- weakref 失效（`ref(): None`）、finalize 回调、`WeakKeyDictionary` 自动清空在 CPython 中稳定可复现

## 4. 核心概念

### 4.1 引用计数

Python 中每个对象都维护一个引用计数（`ob_refcnt`）。引用计数归零时，对象**立即**被回收。

```
obj = object()    # refcount = 1
a = obj           # refcount = 2
b = a             # refcount = 3
del b             # refcount = 2
del a             # refcount = 1
del obj           # refcount = 0 → RECLAIMED
```

使用 `sys.getrefcount(obj)` 可以查看当前引用数（注意：函数调用本身会临时增加 1）。

引用计数简单高效，**但无法处理循环引用**。

### 4.2 循环引用

两个对象互相引用时，即使外部没有引用，它们的引用计数也永远不为 0：

```
a.next = b    → a 的 refcount += 1, b 的 refcount += 1
b.next = a    → a 的 refcount += 1, b 的 refcount += 1

del a; del b  → 外部引用消失，但 a 和 b 仍互相持有
→ refcount 永远不为 0 → 内存泄漏！
```

CPython 的分代 GC 负责收集循环垃圾：它只遍历被 GC 跟踪的容器对象（通过 `tp_traverse` 建立容器间引用图），用"试探性扣除内部引用计数"找出从外部不可达的引用环并回收——教学上常概括为**可达性分析**。

调用 `gc.collect()` 可手动触发一轮完整回收。代码中的 `Node` 类演示了 `del a; del b` 后节点仍然存活；且由于 demo 里 `Node.all_nodes`（类属性列表）持有强引用，`gc.collect()` 也无法回收它们（见 §3 诚实预期）。

### 4.3 weakref 弱引用

`weakref.ref(obj)` 创建一个不增加引用计数的引用：

```python
obj = CacheEntry("user:123", {"name": "Alice"})
ref = weakref.ref(obj)

print(ref())          # <CacheEntry('user:123')>   对象存活
print(ref() is obj)   # True

del obj               # 引用归零，对象被回收
print(ref())          # None                         弱引用已失效
```

`weakref.finalize(obj, callback)` 可以注册一个回调函数，在对象被回收时自动执行。

**使用场景**：
- 缓存：存储计算结果，但不阻止原始数据被回收
- 观察者模式：被观察对象可以自由销毁，不影响观察者生命周期
- 打破循环引用：将 A→B 的强引用改为弱引用

### 4.4 WeakKeyDictionary

`WeakKeyDictionary` 是以弱引用为 key 的字典。当 key 对象被回收时，对应条目**自动删除**：

```python
cache = WeakKeyDictionary()
obj = Expensive("data1")
cache[obj] = "cached result"     # 1 entry

del obj                          # key 被回收
gc.collect()
# cache 自动清空，len(cache) == 0
```

适合实现"自动清理"的缓存：不需要手动管理缓存条目的生命周期。

### 4.5 `__del__` 的陷阱

`__del__` 在对象被回收前调用，但有几个重要风险：

| 问题 | 说明 |
|:---|:---|
| 解释器退出时不保证执行 | 程序结束时 `__del__` 可能被跳过（3.4 之前更糟：循环垃圾里带 `__del__` 的对象直接进 `gc.garbage` 不回收） |
| 异常被忽略 | `__del__` 中的异常只会打印警告，不会抛出 |
| 执行顺序不可预测 | 多个对象的 `__del__` 调用顺序不确定 |

自 3.4（PEP 442）起，`gc.collect()` 会先终结（调用 `__del__`）再回收带 `__del__` 的循环垃圾，"循环引用导致 `__del__` 永远不执行"已是旧版本的行为了；但**解释器退出时不保证执行**这一点至今成立。

**建议**：优先使用上下文管理器（`with` 语句）做资源清理，而不是依赖 `__del__`。

### 4.6 GC 分代

Python 的 GC 将对象分为三代（Gen 0/1/2），新对象从 Gen 0 开始：

```
Gen 0 → Gen 1 → Gen 2
(频繁扫描) → (中等) → (低频)
```

默认阈值：3.12 及以前为 `(700, 10, 10)`，3.13 起改为 `(2000, 10, 10)`（配合增量 GC 的调整）。含义是 Gen 0 分配超过阈值次后触发一次扫描，存活对象晋升到 Gen 1。可以用 `gc.get_threshold()` 查看，`gc.set_threshold()` 调整。

## 5. 关键代码解析

两条回收路线的分水岭，浓缩在"强引用有没有归零"：

```python
ref = weakref.ref(obj)   # 弱引用：不写进 ob_refcnt，只留一个"观察口"
del obj                  # 最后一个强引用消失，refcount 归 0
print(ref())             # None —— 对象已被回收，finalize 回调已触发
```

而循环引用的兜底逻辑：

```python
a.next = b
b.next = a     # 互相持有：外部全 del 之后，双方 refcount 仍是 1
del a; del b   # 引用计数永远到不了 0 → 只能等 gc.collect() 的分代扫描
```

坑清单：

- **`getrefcount` 读数偏 1**：实参传递本身临时持有一次引用，文档明示的行为，不是 bug
- **隐式强引用让 GC 失效**：demo 里 `Node.all_nodes` 类属性持有每个节点，`gc.collect()` 后 `After GC: 2 nodes` 依旧存活，`[__del__] destroyed` 日志延迟到解释器退出才出现——排查"对象为什么没被回收"先找这类隐藏的强引用
- **别和固定数值对比**：`gc.collect(): 22 objects`、Gen 2 对象数每次运行都波动，取决于解释器启动以来的分配历史
- **阈值随版本变**：`gc.get_threshold()` 在 3.12 及以前是 `(700, 10, 10)`，3.13 起是 `(2000, 10, 10)`

## 6. 文件结构

```
16_gc_weakref/
├── README.md                     # 本教程文档
├── gc_weakref.py                 # 主演示脚本：引用计数 / 循环引用 / weakref / 分代 GC
└── images/
    ├── gc_weakref.archify.json   # 图源（typed JSON IR，可编辑重渲染）
    ├── gc_weakref.archify.html   # 交互示意图（浏览器打开）
    └── gc_weakref.archify.svg    # 双主题矢量图（本 README §2 内嵌）
```

`gc_weakref.py` 内容：`1. demo_refcount()` 引用计数演示（sys.getrefcount） / `2. Node + demo_cyclic()` 循环引用与 gc.collect() / `3. demo_weakref()` weakref.ref + finalize 回调 / `4. demo_weakref_dict()` WeakKeyDictionary 自动清理 / `5. run_demo()` 综合演示（含 `__del__` 警告、GC 分代）。

## 7. 面试要点

**Q1: Python 的垃圾回收机制是什么？**
引用计数为主（实时回收），分代 GC 为辅（处理循环引用）。引用计数归零立即回收，循环引用通过 `gc.collect()` 的可达性分析处理。

**Q2: 什么情况会导致内存泄漏？**
循环引用是最常见的原因。解决方法：用 `gc.collect()` 手动回收，或用 `weakref` 打破循环。

**Q3: `__del__` 为什么不推荐使用？**
解释器退出时不保证调用；多个 `__del__` 之间的调用顺序不确定；`__del__` 中的异常被静默忽略。建议用 `with` 上下文管理器或 `atexit` 做资源清理。

**Q4: weakref 有什么实际用途？**
缓存（自动过期）、观察者模式（不阻止被观察对象回收）、打破循环引用（将强引用改为弱引用）。`WeakKeyDictionary` 和 `WeakValueDictionary` 是常用容器。

**Q5: `sys.getrefcount()` 为什么读数偏 1？**
实参传递本身会临时持有一次引用。所以 demo 里 `object()` 一创建就显示 refcount=2；判断共享与存活时要把这 1 记在账上，或改用 `weakref` / `gc` 的视角观察。

## 8. 总结

1. **引用计数 = 主回收机制**，`refcount=0` 立即回收，高效但处理不了循环引用
2. **分代 GC = 辅回收机制**，定期扫描发现循环引用并通过可达性分析回收
3. **weakref 不增加引用计数**，用于缓存、观察者模式、打破循环引用
4. **`__del__` 不可靠**，优先用上下文管理器做资源清理

下一篇进入 [17_property](../17_property/README.md)：看 `@property` 如何把方法伪装成属性，实现受控的属性读写。
