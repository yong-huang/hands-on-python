# 08 · GIL 与并发模型：为什么多线程不能利用多核

> 多继承的坑（MRO 与 `super()` 链）算是填完了，新的追问来了："Python 起 4 个线程，CPU 能跑满吗？"很多人卡在这里——
> 因为 CPython 有一把全局解释器锁（GIL），同一时刻只允许一个线程执行字节码。
> 本实验用基准测试实测 threading / multiprocessing / asyncio 三种并发模型的真实边界。

## What

GIL（Global Interpreter Lock）是 CPython 的全局解释器锁，同一时刻只允许一个线程执行 Python 字节码。一句话心智模型：**GIL 只锁"执行字节码"这件事，线程一进入 I/O 等待就把锁让出去**——线程1 `acquire()` 拿到 GIL 发起 `socket.recv()` 阻塞等待，等待期间释放 GIL，线程2 获得锁执行 ~5ms，I/O 完成后线程1 重新竞争。这正是"多线程能加速 I/O、不能加速 CPU"的微观原因。

## Why

GIL 使得 `threading` 在 CPU 密集型任务中无法利用多核——不加区分地"开线程提速"，CPU 密集场景只会原地踏步甚至更慢，I/O 密集场景却能近乎线性加速。三种并发模型各有边界：`threading`（I/O 密集）、`multiprocessing`（CPU 密集）、`asyncio`（大量 I/O 并发）。分不清这条边界，并发选型错误和线上性能事故都会找上门。

## How

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

诚实预期（本机实测）：

- **I/O 密集加速稳定可复现**：8 × 100ms sleep 的串行耗时 ~0.83s，threading/asyncio 都 ~0.10s，接近 8x 理论上限
- **CPU 密集主结果：multiprocessing 实测约 2.2~2.4× 加速**（比值 0.42~0.46，两次运行波动；M 系列性能核/能效核混排所致）——每进程独立 GIL，字节码真并行
- **[2b] 对照段演示粒度倒挂**：任务缩到 n=5,000 时，进程池启动/序列化成本（~50ms）远超计算本体（~3ms），多进程/串行实测 ≈15~17× 倒挂——倍数随机器浮动，方向稳定
- threading 在 CPU 密集下约等于串行（1.0x 上下浮动），小幅波动来自 GIL 切换的时机，不是加速

### GIL 的工作方式

```
Thread 1: [====GIL====]          [==GIL==]
Thread 2:              [==GIL==]          [==GIL==]
Thread 3:                        [==GIL==]
```

每个 ~5ms 切换一次（`sys.getswitchinterval()`）。在 I/O 操作时自动释放 GIL。

### 三种并发模型对比

| 模型 | 适用场景 | GIL 影响 | 内存开销 |
|:---|:---|:---|:---|
| **threading** | I/O 密集（网络/文件/DB） | GIL 在 I/O 时释放 | 低（共享内存） |
| **multiprocessing** | CPU 密集（计算/编码） | 每进程独立 GIL | 高（进程隔离） |
| **asyncio** | 大量 I/O 并发（高 QPS API） | 单线程，无 GIL 问题 | 最低 |

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

## Deep Dive

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

同一套写法把 `io_heavy` 换成 `cpu_heavy`（纯 Python 素数计数），结论瞬间反转：线程谁也拿不到多余的 GIL，耗时与串行持平。

踩坑清单：

- **任务粒度小于进程通信成本**：计算本体 ~3ms 时进程池启动/序列化开销（~50ms）占绝对大头，multiprocessing 必然倒挂（[2b] 实测 ≈15×）——粒度要远大于通信成本才能收益并行
- **"是 C 扩展"≠"释放 GIL"**：`re`、`json` 这类直接操作 Python 对象的 C 实现并不释放 GIL；numpy 之快在于它在 C 层显式使用了 `Py_BEGIN_ALLOW_THREADS`

## Q&A

**Q1: 为什么不直接去掉 GIL？**

GIL 保护 CPython 的引用计数内存管理。去掉 GIL 需要改为更复杂的垃圾回收机制，会降低单线程性能。Python 3.13 起提供实验性 free-threading（无 GIL）构建；按 PEP 779 的划分，3.14 起 free-threading 升级为官方支持的构建（phase II，仍在分阶段完善）。传统 GIL 构建仍是默认。

**Q2: asyncio 和 threading 怎么选？**
- 少量 I/O（< 100 并发）→ threading（简单）
- 大量 I/O（> 100 并发）→ asyncio（高效）
- CPU 密集部分用 `run_in_executor()` 转给进程池

**Q3: CPU 密集任务如何真正并行？**

用 multiprocessing——每个进程有独立 GIL，可映射到不同核；或把热点计算下沉到会释放 GIL 的 C 扩展（numpy）。注意任务粒度要远大于进程通信成本，否则像本 demo 的 n=5000 一样反而更慢。
