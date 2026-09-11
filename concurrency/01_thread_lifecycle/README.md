# 01 · 线程生命周期观察器：看得见线程的一生

> 「Python 并发」系列第 1 站。线程的 API 五分钟就能学会，但有三个行为不亲眼看过
> 就一定会踩坑：**交错顺序不可复现**（"这个 bug 我怎么测不出来"）、**`run()` 不开线程**
> （"我启动的线程怎么还在主线程里跑"）、**daemon 说死就死**（"关机钩子怎么没执行"）。
> 本实验把线程对象当成一个状态机来观察，一次看全这三个行为。

## 1. 为什么需要它

`threading.Thread` 是 Python 并发最底层的积木——后面所有篇章（锁、队列、进程池、asyncio）的对比基准都是它。会调 `start()`/`join()` 不等于理解线程：真正决定你代码对错的，是三个运行时事实——**线程之间的执行顺序由调度器决定，程序无法控制也无法复现**；**`run()` 直接调用只是普通方法调用**，线程根本没有创建；**daemon 线程的生死完全挂在主线程上**，主线程一退它就被强杀，收尾代码可能执行到一半。本实验用可断言的演示把这三个事实钉进记忆。

## 2. 总览：核心机制一图看懂

![线程生命周期：start() 驱动的状态机](images/thread_lifecycle.svg)

一句话心智模型：**Thread 对象是 `start()` 驱动的单次状态机——NEW → RUNNABLE → TERMINATED 走完即报废；daemon 属性不改变走法，只改变"进程退出时要不要等它"**。看图时先走上排主路径：`start()` 是唯一合法的启动开关，`run()` 返回或抛异常即死亡，之后 `join()` 立即返回；再看下排两个陷阱——RUNNABLE 期间主线程退出时 daemon 被直接强杀，对已启动的线程再次 `start()` 则抛 `RuntimeError`。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/concurrency/01_thread_lifecycle/images/thread_lifecycle.html)
> （或本地打开 [`images/thread_lifecycle.html`](images/thread_lifecycle.html)）。

## 3. 快速开始

```bash
cd concurrency/01_thread_lifecycle
python3 thread_lifecycle.py           # 完整演示（4 个小节，内置验收断言）
python3 thread_lifecycle.py --daemon  # 只跑 daemon 截断演示（验收点 2）
```

真实输出节选（macOS, CPython 3.13，§4 完整输出见脚本，约 25 行 chatty 输出略）：

```
========================================================
[2. start() vs run()]
========================================================
t.run()          → 函数体执行了，但线程是 MainThread（没有新线程！）
t.start()        → 函数体跑在新线程 born-by-start 里
对已启动的线程再次 start() → RuntimeError: threads can only be started once

========================================================
[3. 交错执行观察（4 线程 × 3 tick，共 3 批）]
========================================================
  批次 0: W1#t0 W3#t0 W2#t0 W1#t1 W0#t0 W2#t1 W1#t2 W3#t1 W2#t2 W0#t1 W3#t2 W0#t2
  批次 1: W0#t0 W3#t0 W2#t0 W1#t0 W2#t1 W0#t1 W1#t1 W3#t1 W0#t2 W2#t2 W1#t2 W3#t2
  批次 2: W3#t0 W1#t0 W2#t0 W0#t0 W1#t1 W2#t1 W3#t1 W0#t1 W3#t2 W0#t2 W2#t2 W1#t2

  3 批出现了 3 种不同的排列 → 线程间顺序不可预测
  但每个线程自己内部的 t0→t1→t2 永远有序 → 无序只发生在线程之间
```

`--daemon` 模式（本机实测，截断点非常直观）：

```
  daemon 输出 # 1/20
  daemon 输出 # 2/20
  daemon 输出 # 3/20
  daemon 输出 # 4/20
  daemon 输出 # 5/20

  主线程退出！daemon 只来得及打 5/20 条，剩余输出被丢弃
  （验证：本行之后不会有任何 daemon 输出；exit code = 0）
```

诚实预期（本机 5 次实测）：

- **三批的交错排列每次运行都不同**：本机 5 次全部出现 3 种互不相同的排列（断言只要求 ≥2）；你跑出来的具体序列一定和上面不一样——这正是不确定性本身
- **daemon 截断点本机稳定在 5/20 条附近**：主线程只睡 0.3s、每条间隔 0.05s，理论 ≈6 条，调度抖动让它少 1 条；换机器/负载会浮动，但"远小于 20"是稳定的
- **`t.run()` 演示用的是独立线程对象**：手动 `run()` 会消耗掉 `_target`，同一个对象之后再 `start()`，新线程会直接 `AttributeError`（见 §5 坑清单第 1 条）

## 4. 核心概念

### 4.1 状态机：NEW → RUNNABLE → TERMINATED

```python
worker = threading.Thread(target=time.sleep, args=(0.4,), name="worker-A")
worker.is_alive()        # False —— NEW：创建了但没 start
worker.start()
worker.is_alive()        # True  —— RUNNABLE：是否真在跑由 OS/GIL 决定
worker.join()
worker.is_alive()        # False —— TERMINATED：run() 已返回
worker.join()            # 合法且立即返回：对死线程 join 就是"不用等"
```

`threading.enumerate()` 是存活性旁证：RUNNABLE 阶段能看到 `worker-A`，TERMINATED 后消失。注意 **"RUNNABLE"不等于"正在 CPU 上跑"**——单核 GIL 下同一时刻只有一个线程在执行字节码，其余线程在等锁、等 I/O 或等时间片，这正是下一篇的主题。

### 4.2 start() vs run()：一字之差，天壤之别

`start()` 做两件事：请 OS 创建真正的线程 → 在新线程里回调 `run()`。直接调用 `t.run()` 则只是当前线程里的普通方法调用——target 里的代码会执行，但**执行者是调用者**（demo 里打印出 `MainThread`）。另外线程只能启动一次：第二次 `start()` 抛 `RuntimeError: threads can only be started once`，想要"重跑"只能新建 Thread 对象。

### 4.3 join() 的真实语义

`join()` 是**调用者的等待动作**，不是对目标线程的操作：它阻塞调用者，直到目标线程 TERMINATED。推论有两个——对已死的线程 `join()` 立即返回；`join(timeout=)` 超时后目标线程还活着时**不会**被杀，只是调用者不等了。主函数 `return` 时解释器会自动对全部非 daemon 线程做一次隐式 join（`threading._shutdown`），所以普通线程"漏 join"不会丢结果，只是失去明确的汇合点。

### 4.4 daemon：把生死挂在主线程上

`daemon=True` 必须在 `start()` **之前**设置。daemon 线程不改变状态机走法，唯一区别是主线程退出（准确说：全部非 daemon 线程结束）时它被**立即强杀**——不是"优雅终止"，没有清理机会，写到一半的文件就停在半个字节上。适合：心跳、监控打点、缓存刷新这类"死了无所谓"的后台循环；不适合：任何带落盘语义的收尾工作。

## 5. 关键代码解析

**为什么用 `events.append()` 记录顺序，而不是看 print 输出顺序？**

```python
events: list[str] = []
def worker(idx: int) -> None:
    for tick in range(ticks):
        time.sleep(0.01 + random.uniform(0, 0.03))  # 抖动制造真实交错
        events.append(f"W{idx}#t{tick}")
```

`list.append` 在 GIL 下是单字节码原子操作，跨线程收集事件**不会乱序也不会丢**；而 `print` 跨线程输出可能被撕裂、受行缓冲影响——用打印顺序当证据会被 stdout 骗。断言也设计成两层：批次间 `len({tuple(o) for o in orders}) >= 2` 证明**线程间**不可复现，批次内每个线程自己的 tick 位置严格递增证明**线程内**永远有序——把"无序"精确圈定在线程之间。

坑清单：

- **手动 `t.run()` 之后对同一个对象 `t.start()`**：`run()` 的 `finally` 会删掉 `_target/_args/_kwargs`（CPython 3.13 实测），之后 `start()` 出来的新线程一启动就 `AttributeError`。本实验第一版就真实踩中——要么只 `start()`，要么给 `run()` 单独一个对象
- **用 `print` 顺序给多线程行为当证据**：行缓冲 + 输出撕裂，两头的顺序都不可信；跨线程收集数据用 `queue.Queue`（项目 4）或原子 `append`
- **在 daemon 线程里做落盘/提交事务**：强杀不等你，半截数据比没数据更糟；需要可靠收尾就用普通线程 + `join()`，或显式发停止信号
- **daemon 设置晚了**：`start()` 之后再设 `daemon=True` 抛 `RuntimeError`——状态机已经离开 NEW，属性冻结

## 6. 文件结构

```
01_thread_lifecycle/
├── README.md                            # 本教程文档
├── thread_lifecycle.py                  # 主演示脚本：家谱/状态机/start vs run/交错/daemon
└── images/
    ├── thread_lifecycle.json    # 图源（typed JSON IR，可编辑重渲染）
    ├── thread_lifecycle.html    # 交互示意图（浏览器打开）
    └── thread_lifecycle.svg     # 双主题矢量图（本 README §2 内嵌）
```

`thread_lifecycle.py` 内容：`demo_family_and_states()` 家谱与三态迁移 / `demo_start_vs_run()` run 陷阱与二次 start / `run_batch()`+`demo_interleaving()` 交错观察（验收点 1）/ `chatty_worker()`+`demo_join_and_daemon()` join 对照（验收点 2）/ `daemon_only_demo()` `--daemon` 专用演示。

## 7. 深入要点

**Q1: `start()` 和 `run()` 的区别？**
`start()` 注册到 OS 创建真实线程并在新线程回调 `run()`；直接调 `run()` 是当前线程里的普通方法调用，没有并发。线程只能 `start()` 一次，第二次抛 `RuntimeError`。

**Q2: 主线程退出时，子线程会怎样？**
分两种：非 daemon 线程会被解释器退出流程隐式 `join`（`threading._shutdown`），跑完才退；daemon 线程被立即强杀，无清理机会。所以"后台任务"设 daemon 前先问：丢一半能不能接受？

**Q3: `join()` 之后为什么 `is_alive()` 一定是 False？**
`join()` 返回的唯一条件是目标线程的 `run()` 已返回（或标记已终止）——它等待的就是那个状态迁移。带 timeout 的 `join()` 例外：超时返回时线程可能还活着，需要再查 `is_alive()`。

**Q4: 两个线程同时对 `list` 做 `append` 会坏吗？同时对 `counter += 1` 呢？**
`append` 不会：它是单字节码原子操作，GIL 保证不被打断。`counter += 1` 会丢更新：它拆成 LOAD/ADD/STORE 多步，线程可在中间被切换——这是竞态的最小样本，项目 2 会实测丢失率并用 `dis` 展示字节码。

**Q5: daemon 线程的典型用途和红线？**
用途：心跳、指标打点、内存缓存刷新等"可随时死"的后台循环。红线：文件写入、事务提交、发网络请求等需要完成的收尾——强杀不保证完成；这类工作用普通线程 + 显式停止信号 + `join()`。

## 8. 总结

1. **Thread 是 start() 驱动的单次状态机**：NEW → RUNNABLE → TERMINATED，走完即报废
2. **`run()` 不是启动**：直接调用跑在调用者线程里；二次 `start()` 抛 RuntimeError
3. **`join()` 是调用者的等待动作**：对死线程立即返回；主函数 return 会隐式 join 全部非 daemon 线程
4. **线程间顺序不可复现、线程内永远有序**：这是后续一切锁与队列存在的根本理由
5. **daemon = 把生死挂到主线程上**：只放"死了无所谓"的工作

下一篇进入 [02 · 竞态复现与 GIL 边界实测](../02_race_gil/README.md)：亲手把 counter 打丢，量出 GIL 对 CPU/IO 密集的两种相反影响。
