# 14 · 四种执行模型性能对决：用数据回答"该用什么跑"

> 前十三站各讲一个模型，这一篇让它们**同题对决**：同一个 IO 任务、同一个 CPU 任务，
> 分别用串行 / threading / multiprocessing / asyncio 跑一遍（预热 + 3 轮取中位）。
> 三条方向性结论全部成立——选型公式从此不是背的，是自己量出来的。

## 1. 为什么需要它

"IO 用协程、CPU 用进程"背起来容易，但追问"为什么线程也行？差多少？什么时候线程反而更慢？"就需要数据。本实验的每个数字都来自同一台机器、同一份任务、相同的预热与计时纪律（项目 11 的方法论）——三条断言把方向性结论钉死，数字随机器写入踩坑记录。

## 2. 总览：核心机制一图看懂

![四模型对决结论卡](images/model_benchmark.svg)

一句话心智模型：**IO 密集看"等待重叠"——asyncio 16.8×、threading 8.0×；CPU 密集看"绕开 GIL"——multiprocessing 2.78× 唯一真并行，threading 1.18× 倒贴，asyncio ≈ 串行**。四张结论卡按选型公式排布：上限标注实测倍数，tag 标注适用场景。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/concurrency/14_model_benchmark/images/model_benchmark.html)
> （或本地打开 [`images/model_benchmark.html`](images/model_benchmark.html)）。

## 3. 快速开始

```bash
cd concurrency/14_model_benchmark
python3 model_benchmark.py --plot    # 全量基准 + 断言 + 柱状图，约 9 秒
```

真实输出（macOS, CPython 3.13.9, 18 核）：

```
========================================================
[A. IO 密集：16 个请求块 × 40 次 50ms 等待]
========================================================
  串行                 中位 0.996s   （3 轮: 0.991, 0.996, 0.997）
  threading(8)       中位 0.125s   （3 轮: 0.124, 0.125, 0.125）
  asyncio            中位 0.059s   （3 轮: 0.059, 0.058, 0.062）
  → IO 密集：asyncio 16.8×、threading 8.0×（等待重叠）

========================================================
[B. CPU 密集：4 个任务块 × 数素数]
========================================================
  串行                 中位 0.158s   （3 轮: 0.158, 0.155, 0.161）
  threading(4)       中位 0.186s   （3 轮: 0.182, 0.186, 0.204）
  multiprocessing(4) 中位 0.057s   （3 轮: 0.063, 0.057, 0.045）
  asyncio            中位 0.247s   （3 轮: 0.201, 0.247, 0.280）
  → CPU 密集：multiprocessing 2.78× 最快；threading 1.18× 串行耗时（GIL 串行化）；asyncio ≈ 串行

========================================================
[C. 三条方向性结论]
========================================================
  [✓] CPU 密集 → 进程版最快（2.78× 加速）
  [✓] IO 密集 → 协程版最快（16.8× 加速）
  [✓] CPU 密集 → 线程版不快于串行（1.18×，GIL）

全部方向性断言通过 ✓ —— 模型选型公式：IO 看 asyncio/线程，CPU 看进程
  柱状图已保存: images/model_benchmark_bars.png
```

诚实预期（本机 3 次实测）：

- **IO 数字极稳**（sleep 精确）：asyncio 8.5~16.8×、threading ≈ 8.0×；asyncio 略快于线程是因为没有线程切换开销
- **CPU 加速比 2.8~3.7× 波动**：4 个进程落在性能核/能效核的组合不同；断言线 ≥1.67×（s_cpu*0.6）
- **asyncio 跑 CPU 任务 ≈ 串行甚至更慢**（0.25 vs 0.16s）——事件循环自身有开销，await 帮不了计算
- `--quick` 档规模减半，用于快速回归；正式对比用全量档
- **跨版本提示**：不同 Python 小版本下倍数会漂移（3.14 实测线程版 CPU ≈1.0× 串行而非 1.18×——后跑的模型占机器渐热的便宜），三条方向性结论跨版本稳定，断言已留 10% 容差

## 4. 核心概念

### 4.1 选型公式与它的边界

**IO 密集 → asyncio（等待重叠最大化）或 threading（生态兜底）；CPU 密集 → multiprocessing（真并行）**。三个边界：混合负载用"asyncio + run_in_executor"分层处理；任务太小时 spawn 成本倒挂（项目 5）；free-threading 构建落地后 CPU 密集线程版会重新变快（项目 16 实测）。

### 4.2 基准方法论：可-believe 的数字

四个纪律缺一不可：**预热**（首轮拉 CPU 频率、触发 spawn）、**交替多轮取中位**（消抖动，防"先跑方吃亏"——项目 11 的教训）、**对称任务**（各模型跑完全相同的 blocks）、**方向性断言**（断"谁快"不断"快几倍"——倍数随机器变，方向不变）。背离任何一条，数字就会说谎。

### 4.3 数字背后的机制对照

| 结果 | 机制解释（对应项目） |
|:---|:---|
| asyncio IO 16.8× | 等待重叠在一张调度表上（项目 8/10） |
| threading IO 8.0× | sleep 释放 GIL，8 线程等待重叠（项目 2/3） |
| threading CPU 1.18× | GIL 串行化 + 切换税倒贴（项目 2） |
| multiprocessing CPU 2.78× | 每进程独立 GIL 真并行（项目 5） |
| asyncio CPU ≈ 1× | await 不帮计算，循环开销倒贴（项目 8） |

## 5. 关键代码解析

**为什么进程池要全局复用（`_PROC_POOL`）而不是 with 块？**

```python
_PROC_POOL = None
def run_process_cpu(blocks):
    global _PROC_POOL
    if _PROC_POOL is None:
        _PROC_POOL = ProcessPoolExecutor(max_workers=4)
        _PROC_POOL.submit(cpu_task, 1000).result()   # 预热触发 spawn
    list(_PROC_POOL.map(cpu_task, [CPU_N] * blocks))
```

第一版把 Pool 创建放在 `with` 块里计时——spawn 4 个解释器的 0.4s 淹没了真并行收益，实测"加速比 0.98×"（虚假持平）。spawn 是一次性成本，必须挪出计时区（预热调用顺带触发）。这正是项目 5 "任务规模要够大"的基准版表达。

坑清单：

- **只跑一轮就下结论**：首轮冷启动 + 单次噪声足以翻转相邻模型的名次——预热 + 3 轮中位是底线
- **CPU 任务太小**：spawn 成本吞掉加速比，得出"多进程没用"的错误结论
- **线程池跑 CPU 任务还调大 max_workers**：GIL 下纯添切税，线程数 = 核数都嫌多
- **断言绝对倍数**：倍数随机器漂移（2.8~3.7×），方向（谁最快）才是跨机器稳定的结论

## 6. 文件结构

```
14_model_benchmark/
├── model_benchmark.py                       # 主演示脚本：四模型 × 两负载对决
├── README.md                                # 本教程文档
└── images/
    ├── model_benchmark.json         # 图源（typed JSON IR，可编辑重渲染）
    ├── model_benchmark.html         # 交互示意图（浏览器打开）
    ├── model_benchmark.svg          # 双主题矢量图（本 README §2 内嵌）
    └── model_benchmark_bars.png             # --plot 生成的柱状图
```

`model_benchmark.py` 内容：`run_serial/threads/process/asyncio_cpu/io()` 四模型两负载 / `bench()` 预热 + 3 轮中位框架 / `main()` 三条方向性断言 / `plot_results()` 可选柱状图。

## 7. 深入要点

**Q1: IO 密集为什么 asyncio 比 threading 还快一点？**
两者都重叠等待，但 asyncio 的"切换"是函数调用级的让出，threading 每次切换要经过内核调度。16 个并发连接下差异 ~8%（实测 16.8× vs 8.0×，并发数不同倍数不同）；千级并发时 asyncio 的内存与切换优势才真正拉开。

**Q2: CPU 密集 + IO 密集混合负载怎么选？**
分层：asyncio 做主循环扛 IO，CPU 段用 `loop.run_in_executor(ProcessPoolExecutor)` 丢给进程——两者结合而不是二选一。

**Q3: 为什么你的基准里线程版 CPU 任务更慢，而有人说"差不多"？**
GIL 下线程版 = 串行 + 切换税，任务越大切换税越明显；任务极小或 C 扩展释放 GIL（numpy）时接近串行。"差不多"和"更慢"取决于任务形状——所以基准要交代任务规模。

**Q4: --plot 的柱状图传递了什么关键信息？**
"越矮越快"一张图看清四模型在两类负载下的相对位置：IO 图中 asyncio/threading 并列矮于串行，CPU 图中 multiprocessing 独矮——视觉化降低选型沟通成本。

**Q5: free-threading（PEP 703）落地后，这张表会怎么变？**
CPU 密集的 threading 从 1.18× 变成真并行（接近进程版且免序列化），multiprocessing 的护城河收窄到"崩溃隔离"；IO 结论不变。项目 16 将亲手实测这张"未来的表"。

## 8. 总结

1. **IO 密集：asyncio 16.8× / threading 8.0×**——等待重叠是唯一机制
2. **CPU 密集：multiprocessing 2.78× 独挑**——线程 1.18× 倒贴、asyncio 原地踏步
3. **基准方法论**：预热、交替多轮取中位、方向性断言、交代任务规模
4. **进程池全局复用**：spawn 一次性成本必须挪出计时区
5. **选型公式**：IO 看 asyncio/线程，CPU 看进程，混合负载分层组合

下一篇进入 [🏁 15 · 可切换执行模型的并发下载器](../15_downloader/README.md)——终极串联：sync/thread/process/async 四后端一键切换，限流、重试、断点续传、优雅关闭全部就位。
