# 08 · GIL 与并发模型：为什么多线程不能利用多核

> CPython（官方主流的 Python 解释器实现）里同一时刻只有一个线程在执行字节码
> （Python 源码编译后的中间指令）——因为解释器自带一把全局解释器锁（GIL）。
> "开 4 个线程吃满 4 核"的直觉，在纯计算场景实测原地踏步。
> 本篇用 threading / multiprocessing / asyncio 三种并发模型的基准测试，划出各自的真实边界。

## Background

这节讲"多线程提速"这个直觉的来龙去脉：它在别的语言里为什么成立、在 CPython 里为什么失灵、工程界如何沉淀出选型共识。

在其他主流语言里，"任务慢就开线程"是标准动作：线程是操作系统调度的基本单位，4 个线程可以吃满 4 个核。Python 工程师最初沿用同一个直觉。

在 CPython 里这个直觉失灵：4 个线程跑纯计算，CPU 占用仍然只有一核，耗时与串行几乎一样，有时还因线程切换反而更慢。原因出在解释器内部的一把全局锁上——它的定义与行为是下一节的主题。

这把锁源于 CPython 的内存管理策略：CPython 用引用计数（对象记录指向自己的引用数、归零即回收）管理内存，多线程同时改计数会产生竞态（多个线程交错修改同一数据导致结果出错的情况），于是用一把全局锁保护——GIL 由此成为 CPython 的默认设计。

围绕这把锁，工程实践沉淀出各管一段的三条边界：等外部响应用线程，重计算用多进程，海量并发连接用事件循环（单线程内轮流处理就绪任务的调度机制）。划清这条边界，并发选型错误和线上性能事故都能避开。

## What

这节给出 GIL 的定义，并用一个类比建立心智模型。

GIL（Global Interpreter Lock）是 CPython 的全局解释器锁，同一时刻只允许一个线程执行 Python 字节码。一句话心智模型：**GIL 只锁"执行字节码"这件事，线程一进入 I/O 等待就把锁让出去**。

落到具体过程：线程1 `acquire()` 拿到 GIL 发起 `socket.recv()` 阻塞等待，等待期间释放 GIL，线程2 获得锁继续执行，I/O 完成后线程1 重新竞争。这正是"多线程能加速 I/O、不能加速 CPU"的微观原因。

可以把 GIL 想象成机房里唯一的钥匙：同一时刻只有一人能上机操作（执行字节码），去走廊打电话（I/O 等待）时必须把钥匙留在门上任人取用。但和普通门锁不同的是，持钥者即便做纯计算也会被定期强制换手，钥匙流转全程由解释器管理，开发者无法手动干预。

## When to Use

这节给选型判断：三类典型场景、三个反面边界，以及同类方案对比。

典型场景——在做什么事的时候：

- 抓取几百个网页、调用多个外部接口时——I/O 密集（大部分时间在等响应），threading 或 asyncio 都能接近线性加速
- 批量转码、本地数值计算时——CPU 密集（瓶颈在计算本身），用 multiprocessing 才能吃到多核
- 单机维护上万条并发连接的 API 服务时，asyncio 用一个线程扛住大量空闲连接

何时不用：

- CPU 密集任务不要用 threading——GIL 串行化，实测与串行持平甚至更慢（见输出 [2]）
- 小任务不要用 multiprocessing——任务粒度小于进程通信成本时必然倒挂（见坑 1）
- 全同步库的生态里慎选 asyncio——它要求调用链全异步，改造成本可能超过收益

threading 与 asyncio 的粗略分界：并发连接上百选 asyncio，少量 I/O 任务用 threading 更简单；混合负载的 CPU 部分用 `run_in_executor()` 转给进程池。

同类方案对比：

| 模型 | 适用场景 | GIL 影响 | 内存开销 |
|:---|:---|:---|:---|
| **threading** | I/O 密集（网络/文件/DB） | GIL 在 I/O 时释放 | 低（共享内存） |
| **multiprocessing** | CPU 密集（计算/编码） | 每进程独立 GIL | 高（进程隔离） |
| **asyncio** | 大量 I/O 并发（高 QPS API） | 单线程，无 GIL 问题 | 最低 |

## Quick Start

这节运行基准脚本并给出真实输出。前置条件：标准 `python3`（CPython）即可；基准数字随机器与负载浮动，读数口径见诚实预期。

### 运行与真实输出

```bash
cd core/08_gil_concurrency
python3 gil_concurrency.py          # 运行全部基准测试 demo
```

真实输出示例：

```
[1] GIL info:
  Python: 3.14.7
  Implementation: cpython
  GIL exists: True
  Switch interval: 5ms
  CPU count: 18

[2] CPU-bound（n=200,000，4 个任务）: multiprocessing 真并行
  serial / threading(4) / process(4)，耗时含进程池启动……
                serial: 0.353s
             threading: 0.359s
       multiprocessing: 0.164s

  Threading/Serial time ratio:       1.02（GIL 串行化，不加速）
  Multiprocessing/Serial time ratio: 0.46（<1 = 真并行加速）
  → Threading ≈ Serial (GIL: no CPU parallel gain)
  → Multiprocessing FASTER: 每进程一把独立 GIL，字节码真并行

[2b] 对照：任务缩小到 n=5,000（粒度 < 进程通信成本）:
                serial: 0.003s
             threading: 0.003s
       multiprocessing: 0.057s
  Multiprocessing/Serial time ratio: 17.30（>1 = 倒挂）
  → 任务粒度小于进程启动/序列化成本时，多进程必然倒挂——粒度也是选型的一部分

[3] I/O-bound (8 x 100ms sleep):
                serial: 0.828s
             threading: 0.106s
               asyncio: 0.101s

  Threading vs Serial: 7.84x speedup
  asyncio vs Serial:   8.19x speedup
  → Both FASTER (GIL released during I/O)

[4] When GIL is released:
  Operation                      GIL Released   Why
  ------------------------------ -------------- --------------------
  time.sleep()                   Yes            I/O wait
  socket.recv()                  Yes            Network I/O
  open().read()                  Yes            File I/O
  for x in range(10**9)          No             Pure Python
  numpy.sum(arr)                 Yes            C ext, explicit release
  re.match(pattern, text)        No             C ext, no release

[5] Decision guide:
  CPU-bound (heavy computation):
    → multiprocessing (bypass GIL)
    → or C extension / numpy (release GIL in C)
  I/O-bound (network, file, DB):
    → asyncio (most efficient, single thread)
    → threading (simple, works well)
  Mixed:
    → asyncio + run_in_executor for CPU parts

```

### 读数口径

诚实预期（本机实测）：

- **I/O 密集加速稳定可复现**：8 × 100ms sleep 的串行耗时 ~0.83s，threading/asyncio 都 ~0.10s，接近 8x 理论上限
- **CPU 密集主结果：multiprocessing 实测约 2.2~2.4× 加速**（比值 0.42~0.46，两次运行波动；M 系列性能核/能效核混排所致）——每进程独立 GIL，字节码真并行
- **[2b] 对照段演示粒度倒挂**：任务缩到 n=5,000 时，进程池启动/序列化成本（~50ms）远超计算本体（~3ms），多进程/串行实测 ≈15~17× 倒挂——倍数随机器浮动，方向稳定
- threading 在 CPU 密集下约等于串行（1.0x 上下浮动），小幅波动来自 GIL 切换的时机，不是加速

## How It Works

这节拆机制：锁怎么在线程间轮转、什么时候放手，以及一段能亲眼看到两种结局的对照代码。
三条线索分别对应输出 [2]、[4]、[3]，读完可以回头对照着读一遍输出。

### GIL 的工作方式

```
Thread 1: [====GIL====]          [==GIL==]
Thread 2:              [==GIL==]          [==GIL==]
Thread 3:                        [==GIL==]
```

每个 ~5ms 切换一次（`sys.getswitchinterval()`）。在 I/O 操作时自动释放 GIL。
输出 [1] 的 `Switch interval: 5ms` 读到的正是这个间隔。

你在输出 [2] 里看到的 `Threading ≈ Serial` 就是这张图的直接后果：4 个线程轮流持锁做纯计算，总工作量不变，还搭上切换开销。而输出 [3] 的近 8 倍加速来自"等待时放锁"——8 个线程的等待时间彼此重叠。

### 何时释放 GIL

| 操作 | GIL 释放 | 原因 |
|:---|:---|:---|
| `time.sleep()` | Yes | I/O 等待 |
| `socket.recv()` | Yes | 网络 I/O |
| `numpy.sum()` | Yes | C 扩展显式释放 GIL |
| `for x in range(10**9)` | No | 纯 Python |
| `str.join()` | No | 纯 Python |
| `re.match()` / `json.dumps()` | No | C 扩展但未释放 GIL |

C 扩展**可以**在 C 层释放 GIL（如 numpy 的许多循环），但**不是自动的**——扩展必须显式使用 `Py_BEGIN_ALLOW_THREADS`。"是 C 扩展"≠"释放 GIL"：`re`、`json` 这类直接操作 Python 对象的 C 实现并不释放 GIL。

### 核心对照：同一段代码的两种结局

**最核心的对照**——`bench_io()` 里同一种资源、两种结局：

```python
def bench_io(workers=8, duration=0.1):
    # 串行：8 次 sleep 排队执行 → ~0.8s
    for _ in range(workers):
        io_heavy(duration)                     # time.sleep(0.1)

    # threading：8 个线程几乎同时发起 sleep
    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.submit(io_heavy, duration) for _ in range(workers))
        # 为什么快：sleep 等待期间线程释放 GIL，8 个线程并行等待 → ~0.1s
```

你在输出 [3] 里看到的 7.84x / 8.19x，就来自注释里的那句话：sleep 等待期间线程释放 GIL。同一套写法把 `io_heavy` 换成 `cpu_heavy`（纯 Python 素数计数），结论瞬间反转：线程谁也拿不到多余的 GIL，耗时与串行持平。

代码里的 `ThreadPoolExecutor` 是标准库 `concurrent.futures` 提供的线程池。

## Pitfalls & Q&A

这节两个真实踩坑（按现象—原因—解法展开）与一个深入问答。

**坑 1：任务粒度小于进程通信成本。**

- 现象：换 multiprocessing 后反而比串行慢十几倍（[2b] 实测方向稳定为倒挂）
- 原因：计算本体 ~3ms 时，进程池启动/序列化开销（~50ms）占绝对大头
- 解法：任务粒度要远大于通信成本才谈得上并行收益——粒度也是选型的一部分
- 参照输出 [2b]：同一份代码，任务 n=200,000 时比值为 0.46，n=5,000 时 17.30——只有粒度不同

**坑 2：指望"C 扩展"自动并行。**

- 现象：把热点换成 `re`、`json` 这类 C 实现，线程依旧串行，没有加速
- 原因：释放 GIL 不是自动的，扩展必须显式声明（机制见上文 How It Works 的释放表）
- 解法：热点下沉到显式释放 GIL 的扩展（如 numpy 的许多循环），或改用 multiprocessing

**Q：为什么不直接把 GIL 去掉？**

GIL 保护 CPython 的引用计数（对象记录指向自己的引用数、归零即回收的内存管理方式）。去掉 GIL 需要改为更复杂的垃圾回收机制，会降低单线程性能。

Python 3.13 起提供实验性 free-threading（无 GIL）构建；按 PEP 779 的划分，3.14 起 free-threading 升级为官方支持的构建（phase II，仍在分阶段完善）。传统 GIL 构建仍是默认。
