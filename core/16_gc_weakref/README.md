# 16 · GC、weakref 与 `__del__`：引用计数搞不定的循环引用谁来收

> 对象被到处传递（透明参数转发让函数能接住任意多的实参），总有"没人再用"的一天——谁来回收？
> 引用计数归零会立即回收，可循环引用让计数永不归零。
> 本实验看引用计数、分代 GC、weakref 与 `__del__` 如何接力管理对象生命周期。

## What

Python 的内存管理采用**引用计数为主、分代 GC 为辅**的双轨机制。一句话心智模型：**引用计数随引用增减，归 0 立即回收；循环引用计数永不归 0，由分代 GC 兜底；weakref 不参与计数，只是"观察"**。`weakref` 模块提供不增加引用计数的弱引用，用于缓存、观察者模式等需要"引用但不阻止回收"的场景；`__del__` 是析构函数，但在循环引用和解释器退出场景下行为不可靠。

## Why

不理解这套机制会怎样：内存泄漏排查无从下手，误以为对象被回收而实际被隐式强引用拽住，或在资源清理上依赖不可靠的 `__del__`——工程实践中都建议优先使用上下文管理器做资源清理。

## How

```bash
cd core/16_gc_weakref
python3 gc_weakref.py          # 运行 GC / weakref demo
```

真实输出示例：

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

### 引用计数：归零即回收

```python
obj = object()    # refcount = 1
a = obj           # refcount = 2
del obj           # 最后一个引用消失 → 立即回收
```

`sys.getrefcount(obj)` 可查看当前引用数（函数调用本身会临时 +1，所以读数偏 1）。

### 循环引用：计数永不归零

```
a.next = b    → 双方 refcount 各 +1
b.next = a
del a; del b  → 外部引用消失，但 a、b 仍互相持有
→ refcount 永远不为 0 → 只能等分代 GC
```

CPython 的分代 GC 负责收集循环垃圾：只遍历被 GC 跟踪的容器对象，用"试探性扣除内部引用计数"找出从外部不可达的引用环并回收（教学上常概括为**可达性分析**）。`gc.collect()` 可手动触发。

### weakref：引用但不阻止回收

```python
ref = weakref.ref(obj)   # 不写进 ob_refcnt，只留一个"观察口"
del obj                  # 最后一个强引用消失，refcount 归 0
print(ref())             # None —— 对象已被回收，finalize 回调已触发
```

`weakref.finalize(obj, callback)` 注册对象回收时自动执行的回调。使用场景：缓存（不阻止原始数据回收）、观察者模式、打破循环引用（把 A→B 的强引用改成弱引用）。

### WeakKeyDictionary：自动清理的缓存

以弱引用为 key 的字典，key 对象被回收时对应条目**自动删除**——实现"自动清理"缓存，无需手动管理条目生命周期。

### `__del__` 的陷阱

| 问题 | 说明 |
|:---|:---|
| 解释器退出时不保证执行 | 程序结束时 `__del__` 可能被跳过 |
| 异常被忽略 | `__del__` 中的异常只打印警告，不会抛出 |
| 执行顺序不可预测 | 多个对象的 `__del__` 调用顺序不确定 |

自 3.4（PEP 442）起，循环垃圾里带 `__del__` 的对象也会被终结再回收（顺序不指定），"循环引用导致 `__del__` 永远不执行"已是旧版本行为；但**解释器退出时不保证执行**至今成立。**建议**：优先用上下文管理器（lab 02）做资源清理。

### GC 分代

```
Gen 0 → Gen 1 → Gen 2
(频繁扫描) → (中等) → (低频)
```

新对象从 Gen 0 开始，存活对象晋升。阈值用 `gc.get_threshold()` 查看、`gc.set_threshold()` 调整：3.12 及以前 `(700, 10, 10)`，3.13 起 `(2000, 10, 10)`（配合增量 GC）。

## Deep Dive

**两条回收路线的分水岭，浓缩在"强引用有没有归零"**：

```python
ref = weakref.ref(obj)   # 弱引用：不写进 ob_refcnt，只留一个"观察口"
del obj                  # 最后一个强引用消失，refcount 归 0
print(ref())             # None —— 对象已被回收，finalize 回调已触发

# 而循环引用的兜底：
a.next = b
b.next = a     # 互相持有：外部全 del 之后，双方 refcount 仍是 1
del a; del b   # 引用计数永远到不了 0 → 只能等 gc.collect() 的分代扫描
```

**排查"对象为什么没被回收"**，按序检查三类原因：① 存在隐式强引用（类属性列表、全局缓存、闭包——demo 的 `Node.all_nodes` 就是活例子，`gc.collect()` 也救不了）；② 循环引用等分代 GC（`gc.collect()` 可手动触发）；③ 观察口径不对（`getrefcount` 读数天然偏 1，回收数量/各代对象数每次运行都会波动，阈值随版本变化）。

## Q&A

**Q1: Python 的垃圾回收机制是什么？**
引用计数为主（实时回收），分代 GC 为辅（可达性分析处理循环引用）。引用计数归零立即回收；循环引用通过 `gc.collect()` 处理。

**Q2: `__del__` 为什么不推荐使用？**
解释器退出时不保证调用；多个 `__del__` 之间调用顺序不确定；`__del__` 中的异常被静默忽略。建议用 `with` 上下文管理器或 `atexit` 做资源清理。

**Q3: weakref 有什么实际用途？**
缓存（自动过期）、观察者模式（不阻止被观察对象回收）、打破循环引用（将强引用改为弱引用）。`WeakKeyDictionary` 和 `WeakValueDictionary` 是常用容器。
