# 05 · multiprocessing 多核加速实测：绕开 GIL 的真并行

> 第二阶段开幕。前四站的所有并发其实都是"单核上的协作"——GIL 让同一时刻只有一个
> 线程在跑字节码。这一篇第一次真正并行：`multiprocessing` 给每个任务开一个独立解释器、
> 一把独立 GIL，CPU 密集任务实测跑出 2.5× 加速，同题 threading 对照只有 0.75×（白忙）。

## 1. 为什么需要它

项目 2 量出了 GIL 的边界：CPU 密集多线程不加速反而更慢。绕开的唯一标准姿势就是多进程——**每个进程一把独立 GIL**，代价是进程启动贵、内存隔离、通信要显式。本实验三件事：量出真并行的加速比；复现 macOS spawn 启动方式下漏写 `__main__` 保护的**静默失败**（比崩溃更危险的教训）；验证 `pool.map` 的保序承诺。

## 2. 总览：核心机制一图看懂

![multiprocessing：绕开 GIL 的真并行](images/mp_accel.archify.svg)

一句话心智模型：**Pool 把任务切成 4 块 spawn 给 4 个子进程，每个进程一把独立 GIL 真并行；同题 threading 对照被 GIL 串行化**。看图主链从左到右：`map(cpu_task ×4)` 提交、`spawn ×4` 开工、结果按输入顺序汇合；下方虚线是 threading 对照路——它到不了"结果"，只到"白忙"。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/concurrency/05_mp_accel/images/mp_accel.archify.html)
> （或本地打开 [`images/mp_accel.archify.html`](images/mp_accel.archify.html)）。

## 3. 快速开始

```bash
cd concurrency/05_mp_accel
python3 mp_accel.py      # 四个实测小节 + 全部断言，约 15 秒
```

真实输出（macOS, CPython 3.13.9, 18 核）：

```
========================================================
[2. CPU 密集加速比：串行 vs Pool(4)，任务规模 150,000]
========================================================
  串行 4 连跑:  0.492s
  Pool(4):      0.197s   (2.50× 加速)
  对照（同一任务 threading 4 线程）——GIL 下白忙:
  threading(4): 0.660s   (0.75×，不加速)
  多进程 = 每个进程一把独立 GIL，字节码真并行

========================================================
[3. spawn 的 __main__ 保护：违反会怎样？]
========================================================
  父进程退出码 0，stdout = 'OK 1'  ← 看起来一切正常！
  真相在 stderr：子进程 re-import 主模块时再次执行 p.start()，
  抛 RuntimeError '...before the current process has finished its bootstrapping phase...'，
  子进程 exitcode=1 尸退，worker 结果悄悄丢失——静默失败，比当场崩溃更危险
  规矩：入口代码必须 if __name__ == '__main__' 保护

========================================================
[4. pool.map 保序：慢任务在前，结果仍按输入顺序]
========================================================
  输入 [0.3, 0.1, 0.2, 0.05]（最慢的先提交）→ map 返回 [0.3, 0.1, 0.2, 0.05]
  总耗时 0.35s ≈ 最慢任务 0.3s：4 个任务真并行了
```

诚实预期（本机 4 次实测）：

- **加速比 2.4~3.2× 波动**：M 系列芯片性能核/能效核混排，4 个子进程落在哪几颗核由调度器决定；断言只锁 ≥2.0× 底线
- **threading 对照 0.75~0.78×**：不是加速 1.0 倍，是**负加速**——GIL 争用还有倒贴
- **spawn 启动成本约 0.3~0.5s**：所以任务规模要够大（本实验 15 万素数）摊薄它，任务太小会得出"多进程更慢"的误判

## 4. 核心概念

### 4.1 进程并行的本质：独立解释器

`Process` 启动一个完整的新解释器——自己的 GIL、自己的堆、自己的模块状态。CPU 密集任务在 4 个进程里就是 4 份真并行计算。代价随之而来：spawn 启动一个子进程要 50-100ms（重新 import 一切）；所有传参和返回值都要过 pickle；跨进程改一个全局变量是**不可能的**（各改各的副本，项目 6 专门讲怎么通信）。

### 4.2 spawn 与 __main__ 保护：静默失败的陷阱

macOS 默认 spawn：子进程**重新 import 主模块**。入口代码若不躲在 `if __name__ == '__main__'` 后面，子进程 import 时又会执行 `p.start()`——子进程里抛 `RuntimeError: ...bootstrapping phase...` 带伤退场，**而父进程毫不知情**：照常打印 OK、照常 exit 0，worker 的结果悄悄丢了。实测§3：stdout 是 `OK 1`（exitcode=1 被当成"正常数据"），真相只在 stderr 的 traceback 里。这是比崩溃危险的静默失败——崩溃会喊，静默失败只能靠检查 exitcode 发现。

### 4.3 Pool 与 map 的保序承诺

`Pool(n)` 预启动 n 个 worker，`pool.map(func, iterable)` 把任务分块分发。承诺：**结果严格按输入顺序返回**，哪怕各任务完成时间乱序（§4 用"最慢任务先提交"验证）。代价是全批等齐——需要"完成一个收一个"用 `imap_unordered` 或 concurrent.futures 的 `as_completed`（项目 7）。

### 4.4 任务规模的隐藏门槛

多进程的收益公式：`加速 ≈ 总功 / (总功/n + 启动成本)`。任务太小，spawn 成本吞掉全部收益甚至倒挂——本实验用 15 万规模的素数计数把单任务拉到 ~0.15s，4 任务总功 0.6s，启动 0.4s 摊薄后仍剩 2.5× 。**先算这笔账，再决定要不要多进程。**

## 5. 关键代码解析

**为什么计时把 Pool 的创建放在外面？**

```python
def bench_once(n_procs):
    with multiprocessing.Pool(n_procs) as pool:   # spawn 成本在计时外
        t0 = time.perf_counter()
        pool.map(cpu_task, [CPU_N] * n_procs)
        return time.perf_counter() - t0
```

池创建是**一次性**成本（spawn 4 个解释器），生产中池会复用成百上千次任务。把它算进单次任务会低估加速比；但也要诚实——首次使用的用户确实要付这笔钱，所以 README 诚实预期里单列。

坑清单：

- **嵌套函数/lambda 传给 Pool**：spawn 按限定名 pickle 目标函数，local 函数直接 `Can't get local object`——本实验第一版当场踩中，worker 必须是模块顶层函数
- **无 `__main__` 保护**：不是报错而是静默丢结果（§3），Jupyter/脚本两种环境都要养成习惯
- **任务太小就上多进程**：spawn 成本倒挂，先做"启动成本 vs 单任务收益"的除法
- **在子进程里 print 大量内容**：spawn 子进程继承 stdout，交错输出会撕裂——结果用返回值带回来
- **以为 `pool.map` 会流式返回**：它等全批；要流式用 `imap`/`imap_unordered`（或项目 7 的 `as_completed`）

## 6. 文件结构

```
05_mp_accel/
├── README.md                        # 本教程文档
├── mp_accel.py                      # 主演示脚本：环境/加速比/spawn 保护/保序
└── images/
    ├── mp_accel.archify.json        # 图源（typed JSON IR，可编辑重渲染）
    ├── mp_accel.archify.html        # 交互示意图（浏览器打开）
    └── mp_accel.archify.svg         # 双主题矢量图（本 README §2 内嵌）
```

`mp_accel.py` 内容：`demo_env()` 核数与启动方式 / `demo_speedup()` 串行 vs Pool(4) vs threading 对照（验收点 1）/ `demo_spawn_guard()` 静默失败复现（验收点 2）/ `demo_map_order()` 保序验证（验收点 3）。

## 7. 面试要点

**Q1: multiprocessing 为什么能绕开 GIL？**
GIL 是每个解释器实例的全局锁。多进程 = 多个解释器实例 = 多把 GIL，各进程的字节码互不排队，操作系统直接把进程调度到不同核上。代价是进程间内存隔离，通信要显式（项目 6）。

**Q2: fork 和 spawn 两种启动方式有什么区别？**
fork 复制父进程内存（快，Unix-only，与线程混用有安全隐患）；spawn 重新启动解释器并 import 主模块（慢，跨平台，macOS/Windows 默认）。spawn 下必须写 `__main__` 保护，否则子进程 re-import 时重放入口代码——本实验实测是"子进程尸退 + 父进程静默继续"。

**Q3: pool.map 和 imap 的区别？**
map 等全批完成、按输入顺序返回整批；imap 流式按输入顺序逐个产出；imap_unordered 完成顺序即产出顺序。吞吐敏感 + 任务耗时差异大时，后两者能把"最慢任务"从关键路径上摘掉。

**Q4: 什么任务适合多进程？什么不适合？**
CPU 密集且单任务够大（摊薄 spawn 成本）适合；IO 密集用线程/协程更省（进程等 IO 是浪费一张解释器票）；任务间需要高频共享状态的不适合——进程隔离让共享变成昂贵的序列化（项目 6 的 SharedMemory 是例外）。

**Q5: 为什么传给 Pool 的函数必须能 pickle？**
spawn 子进程按"模块名 + 限定名"把目标函数重新导入重建；lambda、闭包内函数、实例方法绑定的匿名对象没有稳定限定名，pickle 直接报错。所以 worker 是模块顶层函数，或用 `functools.partial` 包顶层函数。

## 8. 总结

1. **多进程 = 每进程一把独立 GIL**：CPU 密集实测 2.5× 加速，threading 同题 0.75× 倒贴
2. **spawn + 无 __main__ 保护 = 静默失败**：子进程尸退、父进程照常 exit 0，比崩溃更危险
3. **pool.map 保序**：完成乱序不影响结果顺序，代价是全批等齐
4. **任务规模要够大**：spawn 成本 0.3~0.5s，先算加速公式再选模型
5. **worker 必须是模块顶层函数**：spawn 靠限定名 pickle，local 函数直接报错

下一篇进入 [06 · 进程间通信与共享状态](../06_ipc_shared/README.md)——进程隔离了内存，Pipe/Queue/SharedMemory/Manager 四条路把数据递过去。
