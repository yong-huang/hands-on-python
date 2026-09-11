# 08 · GIL 与并发模型：为什么多线程不能利用多核

> 上一篇用 C3 线性化搞定了 MRO 与 `super()` 链，多继承的坑算是填完了。
> 但面试官话锋一转："Python 起 4 个线程，CPU 能跑满吗？"很多人卡在这里——
> 因为 CPython 有一把全局解释器锁（GIL），同一时刻只允许一个线程执行字节码。
> 本实验用基准测试实测 threading / multiprocessing / asyncio 三种并发模型的真实边界。

## 1. 为什么需要它

GIL（Global Interpreter Lock）是 CPython 的全局解释器锁，同一时刻只允许一个线程执行 Python 字节码。这使得 Python 的 `threading` 在 CPU 密集型任务中无法利用多核——不加区分地"开线程提速"，CPU 密集场景只会原地踏步甚至更慢，I/O 密集场景却能近乎线性加速。三种并发模型各有适用场景：`threading`（I/O 密集）、`multiprocessing`（CPU 密集）、`asyncio`（大量 I/O 并发）。分不清这条边界，并发选型题和线上性能事故都会找上门。

## 2. 总览：核心机制一图看懂

![GIL：线程在 I/O 等待时释放锁](images/gil_concurrency.svg)

一句话心智模型：**GIL 只锁"执行字节码"这件事，线程一进入 I/O 等待就把锁让出去**。看图时顺着线程1 走一遍：`acquire()` 拿到 GIL → 发起 `socket.recv()` 进入阻塞等待 → **I/O 等待期间释放 GIL** → 线程2 获得锁执行字节码 ~5ms → I/O 完成后线程1 重新竞争。这正是"多线程能加速 I/O、不能加速 CPU"的微观原因。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/interview/08_gil_concurrency/images/gil_concurrency.html)
> （或本地打开 [`images/gil_concurrency.html`](images/gil_concurrency.html)）。

## 3. 快速开始

```bash
cd interview/08_gil_concurrency
python3 gil_concurrency.py          # 运行全部基准测试 demo
```

真实输出示例（macOS, CPython 3.10, 18 核）：

```
[1] GIL info:
  Python: 3.10.20
  Implementation: cpython
  Switch interval: 5ms

[2] CPU-bound (prime counting, 5000, 4 workers):
              serial: 0.005s
           threading: 0.005s
     multiprocessing: 0.046s

  Threading/Serial time ratio:       1.01  (>1 = slower)
  Multiprocessing/Serial time ratio: 8.49  (>1 = slower)
  → Threading ≈ Serial (GIL: no CPU parallel gain)
  → Multiprocessing looks SLOWER at n=5000: process startup cost
    dominates this tiny workload (try bench_cpu(n=200000) for real speedup)

[3] I/O-bound (8 x 100ms sleep):
              serial: 0.827s
           threading: 0.106s
             asyncio: 0.102s
  Threading vs Serial: 7.82x speedup
  asyncio vs Serial:   8.12x speedup
  → Both FASTER (GIL released during I/O)
```

诚实预期（本机实测）：

- **I/O 密集加速稳定可复现**：8 × 100ms sleep 的串行耗时 ~0.83s，threading/asyncio 都 ~0.10s，接近 8x 理论上限
- **CPU 密集的默认规模太小，看不到 multiprocessing 优势**：demo 用 n=5000 时串行只要 ~5ms，进程池的启动/序列化开销（~48ms）反而让它显得更慢 —— 这不是故障，是任务粒度小于进程通信成本的预期行为。把 `bench_cpu(n=200000)` 调大后才能看到 multiprocessing 的并行加速
- threading 在 CPU 密集下约等于串行（1.0x 上下浮动），小幅波动来自 GIL 切换的时机，不是加速

## 4. 核心概念

### 4.1 GIL 的工作方式

```
Thread 1: [====GIL====]          [==GIL==]
Thread 2:              [==GIL==]          [==GIL==]
Thread 3:                        [==GIL==]
```

每个 ~5ms 切换一次（`sys.getswitchinterval()`）。在 I/O 操作时自动释放 GIL。

### 4.2 三种并发模型对比

| 模型 | 适用场景 | GIL 影响 | 内存开销 |
|:---|:---|:---|:---|
| **threading** | I/O 密集（网络/文件/DB） | GIL 在 I/O 时释放 | 低（共享内存） |
| **multiprocessing** | CPU 密集（计算/编码） | 每进程独立 GIL | 高（进程隔离） |
| **asyncio** | 大量 I/O 并发（高 QPS API） | 单线程，无 GIL 问题 | 最低 |

### 4.3 何时释放 GIL

| 操作 | GIL 释放 | 原因 |
|:---|:---|:---|
| `time.sleep()` | Yes | I/O 等待 |
| `socket.recv()` | Yes | 网络 I/O |
| `numpy.sum()` | Yes | C 扩展显式释放 GIL |
| `for x in range(10**9)` | No | 纯 Python |
| `str.join()` | No | 纯 Python |
| `re.match()` / `json.dumps()` | No | C 扩展但未释放 GIL |

C 扩展**可以**在 C 层释放 GIL（如 numpy 的许多循环），但**不是自动的**——扩展必须显式使用 `Py_BEGIN_ALLOW_THREADS`。"是 C 扩展"≠"释放 GIL"：`re`、`json` 这类直接操作 Python 对象的 C 实现并不释放 GIL。

## 5. 关键代码解析

demo 的骨架是 `bench_cpu()` / `bench_io()`：同一个任务分别用串行、线程池、进程池（I/O 场景换成 asyncio）各跑一遍计时。最核心的对照在 `bench_io()` 里：

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

同一套写法把 `io_heavy` 换成 `cpu_heavy`（纯 Python 素数计数），结论瞬间反转：线程谁也拿不到多余的 GIL，耗时与串行持平。

坑清单：

- **默认规模 n=5000 太小，multiprocessing "看起来更慢"**：进程池启动/序列化开销（~48ms）远超 ~5ms 的计算本体——任务粒度小于进程通信成本时必然如此，把 `n` 调大到 `200000` 才能看到并行加速
- **threading 在 CPU 密集下的小幅波动（1.0x 上下）不是加速**：来自 GIL 切换的时机，两次运行结果可能不同
- **"是 C 扩展"≠"释放 GIL"**：`re`、`json` 这类直接操作 Python 对象的 C 实现并不释放 GIL；扩展必须在 C 层显式使用 `Py_BEGIN_ALLOW_THREADS`（如 numpy 的许多循环）
- **示意图中的 GIL 轮转是示意数据**（展示行为模式），切换间隔以 `sys.getswitchinterval()` 实测为准

## 6. 文件结构

```
08_gil_concurrency/
├── README.md                        # 本教程文档
├── gil_concurrency.py               # 主演示脚本：基准测试 + GIL 释放场景 + 选型指南
└── images/
    ├── gil_concurrency.json  # 图源（typed JSON IR，可编辑重渲染）
    ├── gil_concurrency.html  # 交互示意图（浏览器打开）
    └── gil_concurrency.svg   # 双主题矢量图（本 README §2 内嵌）
```

`gil_concurrency.py` 内容：`1. cpu_heavy()` CPU 密集任务（素数计数）/ `2. io_heavy()` I/O 密集任务（模拟 sleep）/ `3. bench_cpu()` 串行 / threading / multiprocessing 对比 / `4. bench_io()` 串行 / threading / asyncio 对比。

## 7. 深入要点

**Q1: 为什么多线程不能利用多核？**
CPython 的 GIL 保证同一时刻只有一个线程执行 Python 字节码，4 个 CPU 密集线程实际是轮流执行（每 ~5ms 切换一次），耗时约等于串行。

**Q2: 为什么不直接去掉 GIL？**
GIL 保护 CPython 的引用计数内存管理。去掉 GIL 需要改为更复杂的垃圾回收机制，会降低单线程性能。Python 3.13 起提供实验性 free-threading（无 GIL）构建；按 PEP 779 的划分，3.14 起 free-threading 升级为官方支持的构建（phase II，仍在分阶段完善）。传统 GIL 构建仍是默认。

**Q3: asyncio 和 threading 怎么选？**
- 少量 I/O（< 100 并发）→ threading（简单）
- 大量 I/O（> 100 并发）→ asyncio（高效）
- CPU 密集部分用 `run_in_executor()` 转给进程池

**Q4: 哪些操作会释放 GIL？**
I/O 等待类（`time.sleep()`、`socket.recv()`）和显式释放的 C 扩展（如 numpy 的许多循环）会释放；纯 Python 循环和 `re`/`json` 这类未释放的 C 实现不会。

**Q5: CPU 密集任务如何真正并行？**
用 multiprocessing——每个进程有独立 GIL，可映射到不同核；或把热点计算下沉到会释放 GIL 的 C 扩展（numpy）。注意任务粒度要远大于进程通信成本，否则像本 demo 的 n=5000 一样反而更慢。

## 8. 总结

1. **GIL 限制多线程 CPU 并行**，但不影响 I/O 并发
2. **CPU 密集用 multiprocessing**，I/O 密集用 threading/asyncio
3. **部分 C 扩展显式释放 GIL**（如 numpy 的许多操作）；`re`/`json` 等 C 实现并不释放
4. **asyncio 是单线程事件循环**，用协程实现并发

下一篇进入 [09_magic_methods](../09_magic_methods/README.md)：看 `__repr__` / `__add__` 等魔术方法如何让自定义类获得内建行为。
