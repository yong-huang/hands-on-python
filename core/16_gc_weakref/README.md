# 16 · GC、weakref 与 `__del__`：引用计数搞不定的循环引用谁来收

> 对象被到处传递，总有"没人再用"的一天——谁来负责回收？引用计数归零立即回收，但循环引用会让计数永不归零。
> 本实验用一段可运行的 demo 拆解 CPython 的双轨回收机制：引用计数、分代 GC、weakref 与 `__del__` 如何接力管理对象生命周期。
> 读完你能回答：为什么 `del` 之后对象还在、`gc.collect()` 收走的 22 个对象是什么、缓存如何随 key 失效自动清空。

## Background

这节讲问题域：一块内存"没人再用"之后，谁来把它归还给系统。

自动内存管理普及之前，C 语言程序员用 `malloc` 申请内存、用 `free` 手动归还。两个痛点在长期项目里必然出现：忘了 `free`，内存被白占（内存泄漏）；提前 `free`，其他代码还在使用这块内存，程序当场崩溃。

Python 走了自动化路线。CPython（Python 的官方参考实现，平时运行 python3 命令时用的就是它）给每个对象挂一个引用计数——记录当前有多少个名字或容器正持有它的整数，存放在 `ob_refcnt` 字段里。计数归零说明再无人能用它，内存立刻归还。绝大多数对象走这条路线，实时且确定。

这条路在一种场景下撞墙：两个对象互相持有对方的引用。即使外部已全部弃用，双方计数仍各剩 1，永远不会归零，内存无法归还。长跑服务若持续产生这类对象，内存占用只涨不跌。

CPython 的应对是在引用计数之外再配一层兜底的垃圾回收器：定期找出这类从外部已不可达的对象组并回收。这就是下文的分代 GC——本实验的主角之一。

## What

这节给出定义与心智模型：双轨机制如何分工，两件配套工具是什么。

Python 的内存管理是**引用计数为主、分代 GC 为辅**的双轨机制。分代 GC（generational GC）——按对象存活时间分成三代、扫描频率随代数递减的垃圾回收器——专门处理引用计数无法处理的循环引用。

一句话心智模型：**引用计数随引用增减，归 0 立即回收；循环引用计数永不归 0，由分代 GC 兜底；weakref 不参与计数，只是"观察"**。

可以把引用计数想象成会议室门口的签到表：每来一个使用者就多记一笔，离开就划掉一笔，表上没人了就关灯锁门（回收内存）。但和签到表不同的是，对象可以互相"替对方签到"——互相持有时各记一笔，表永远不空，这时只能靠保洁（分代 GC）上门清点。

围绕这套机制，标准库提供两件配套工具。`weakref` 模块提供弱引用——不增加引用计数、只用来观察对象是否存活的引用，适合缓存、观察者模式（一个对象被回收或变化时通知一组订阅者的设计模式，这里指订阅“对象已回收”这件事）这类“要引用但不阻止回收”的场景。

`__del__` 是析构函数（对象被回收时解释器尝试调用的方法），在循环引用和解释器退出场景下行为不可靠。

## When to Use

这节讲哪些任务值得动用这套知识，以及什么时候不必碰它。

写代码时，典型场景有三类：

- **写缓存**：缓存条目不应阻止原始大对象被回收。用 `WeakKeyDictionary` / `WeakValueDictionary`（以弱引用持有 key 或 value 的字典），key 或 value 被回收时对应条目自动删除。
- **需要"对象被回收时通知我"**：观察者注销、临时资源登记等。用 `weakref.finalize(obj, callback)` 注册回收回调，比依赖 `__del__` 可靠。
- **排查内存泄漏**：进程内存只涨不跌时，先判断对象是被循环引用拖住，还是被某个隐式强引用（即普通赋值产生的、会计入引用计数并阻止回收的引用）拽住，两者的处理手段完全不同。

何时不用：

- 资源清理（关文件、释放锁）不要依赖 `__del__`：解释器退出时不保证执行，用上下文管理器（with 语句背后的机制，进入/退出代码块时自动执行清理，见 lab 02）或 atexit（标准库模块，注册进程退出前统一执行的回调）。
- 普通一次性对象无需弱引用：引用计数会实时回收它们，weakref 只在"不想阻止回收"时才有价值。

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| 引用计数 | 实时回收，处理不了循环引用 | 默认路线，无需干预 |
| 分代 GC | 周期性扫描，专收循环垃圾 | 自动运行；需要立刻回收时手动 `gc.collect()` |
| weakref | 不阻止回收的观察口 | 缓存、观察者、打破循环引用 |
| 上下文管理器 | 释放时机确定 | 一切需要确定释放的资源 |
| `atexit` | 进程退出时统一执行 | 进程级收尾，不依赖单个对象存活 |

## Quick Start

这节给出最小可运行路径：一条命令跑通 demo，先读输出示例建立直觉。只依赖标准库（`sys`、`gc`、`weakref`），无第三方包。

```bash
cd core/16_gc_weakref
python3 gc_weakref.py          # 运行 GC / weakref demo
```

真实输出示例（节选：省略开头 demo 标题横线、末尾 [7] Summary 段与解释器退出时的 __del__ 日志）：

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

输出 [1]~[6] 依次演示：引用计数增减、循环引用、弱引用、弱引用字典、`__del__` 注意事项、分代情况。对照阅读下面的诚实预期，避免误读输出。

诚实预期（本机实测）：

- **`getrefcount` 读数偏 1**：demo 中 `object()` 显示 refcount=2 而不是 1 —— `sys.getrefcount(obj)` 的实参传递本身临时持有一次引用，这是文档明示的行为，不是 bug
- **`gc.collect()` 后 `After GC: 2 nodes`**：Node 并没有被这轮 GC 回收，因为 `Node.all_nodes` 类属性（列表）对每个节点持有**强引用**，循环对 GC 来说是"可达"的。两个节点的 `[__del__] destroyed` 日志出现在 demo 全部结束之后（解释器退出时才销毁）—— 这恰好是"隐式强引用导致对象延迟回收"的活例子
- **`gc.collect(): 22 objects`、各代对象数（Gen 2: 8007）每次运行都会波动**：回收数量取决于解释器启动以来分配过的对象，属于预期，不要和固定值对比
- **`gc.get_threshold()` 的值随版本不同**：3.12 及以前为 `(700, 10, 10)`，3.13 起为 `(2000, 10, 10)`——本示例为 3.10 输出，在 3.13 上会看到 2000
- weakref 失效（`ref(): None`）、finalize 回调、`WeakKeyDictionary` 自动清空在 CPython 中稳定可复现

常用工具速览：

| 工具 | 作用 |
|---|---|
| `sys.getrefcount(obj)` | 查看引用计数（读数天然偏 1，原因见上方诚实预期） |
| `gc.collect()` | 手动触发回收，返回本轮回收的对象数 |
| `gc.get_threshold()` / `gc.set_threshold()` | 查看 / 调整分代 GC 触发阈值 |
| `weakref.ref(obj)` | 创建弱引用；调用 `ref()` 取对象，已回收则得 `None` |
| `weakref.finalize(obj, cb)` | 注册对象回收时自动执行的回调 |
| `WeakKeyDictionary` | key 被回收时条目自动删除的字典 |

## How It Works

这节把输出里的现象逐一对应到机制。两条回收路线的分水岭，浓缩在"强引用有没有归零"。

### 引用计数：归零即回收

```python
obj = object()    # refcount = 1
a = obj           # refcount = 2
del obj           # 最后一个引用消失 → 立即回收
```

`sys.getrefcount(obj)` 可查看当前引用数（函数调用本身会临时 +1，所以读数偏 1）。输出 [1] 里 `object()` 显示 2、每赋一个名字加 1、每 `del` 一个名字减 1，逐行对应这段规则。

### 循环引用与分代 GC

```
a.next = b    → 双方 refcount 各 +1
b.next = a
del a; del b  → 外部引用消失，但 a、b 仍互相持有
→ refcount 永远不为 0 → 只能等分代 GC
```

CPython 的分代 GC 负责收集循环垃圾：只遍历被 GC 跟踪的容器对象（list、dict、自定义类实例等内部能持有引用的对象），用"试探性扣除内部引用计数"找出从外部不可达的引用环并回收（教学上常概括为**可达性分析**）。`gc.collect()` 可手动触发。

你在输出 [2] 看到的 `gc.collect(): 22 objects collected`，就来自这轮扫描——22 个对象是解释器启动以来积累的各类循环垃圾，两个 Node 因为 `Node.all_nodes` 的强引用不在其列（原因见诚实预期）。

分代策略用来降低扫描成本：

```
Gen 0 → Gen 1 → Gen 2
(频繁扫描) → (中等) → (低频)
```

新对象从 Gen 0 开始，存活对象晋升到下一代。阈值用 `gc.get_threshold()` 查看、`gc.set_threshold()` 调整。三元组依次控制：触发 0 代扫描的分配净增量、多少次 0 代扫描后触发 1 代、多少次 1 代扫描后触发 2 代（各版本默认值见诚实预期）。

### weakref：只观察、不计数

```python
ref = weakref.ref(obj)   # 不写进 ob_refcnt，只留一个"观察口"
del obj                  # 最后一个强引用消失，refcount 归 0
print(ref())             # None —— 对象已被回收，finalize 回调已触发
```

创建弱引用时不修改 `ob_refcnt`，所以它既不延长对象寿命，也能随时探测死活。

输出 [3] 里 `ref(): None` 与 `[callback] object was garbage collected!` 相继出现：前者说明强引用清零后对象已回收，后者是 `weakref.finalize` 注册的回调在回收瞬间执行。

输出 [4] 的 `WeakKeyDictionary` 自动清空基于同一机制：字典内部以弱引用持有 key，key 一死条目即被移除，缓存无需手动清理条目生命周期。

## Pitfalls & Q&A

这节先给排查清单，再回答几个有增量的深入问题。输出误读类的问题优先翻 Quick Start 的诚实预期。

**坑 1：对象迟迟不被回收。**

- 现象：`del` 之后对象仍存活，`gc.collect()` 也收不走。
- 原因：多为隐式强引用——类属性列表、全局缓存、闭包都可能暗中持有对象，demo 的 `Node.all_nodes` 就是活例子。
- 解法：按序排查三类原因——① 存在隐式强引用；② 循环引用，等分代 GC 或手动 `gc.collect()`；③ 观察口径不对（`getrefcount` 读数天然偏 1、回收数量与各代对象数每次运行都波动）。

**坑 2：靠 `__del__` 做清理，资源却没释放。**

- 现象：清理逻辑时灵时不灵，或其中抛了异常毫无反应。
- 原因：解释器退出时 `__del__` 可能被跳过；`__del__` 中的异常只打印警告、不会抛出；多个对象的 `__del__` 调用顺序不确定。
- 解法：资源清理改用上下文管理器（lab 02），进程级收尾用 `atexit`。

**Q1：循环引用里带 `__del__` 的对象，回收时会执行吗？**

会。自 Python 3.4（PEP 442，规定终结器行为的 Python 增强提案）起，循环垃圾中带 `__del__` 的对象也会被终结再回收（顺序不指定），“循环引用导致 `__del__` 永远不执行”是旧版本行为；但解释器退出时不保证执行这一点至今成立。

**Q2：分代 GC 会跟踪所有对象吗？**
不会。GC 只跟踪容器对象（内部能持有其他引用的对象）；整数、字符串这类不可变对象不进跟踪表，回收完全由引用计数负责。

**Q3：weakref 能对任何对象创建吗？**
不能。自定义类实例默认支持弱引用；`int`、`str`、`tuple` 等内建类型不接受弱引用，创建时会抛 `TypeError`。需要弱引用这类值时，用一个自定义类把它们包一层。
