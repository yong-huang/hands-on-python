# 16 · ⚠️ 选做——free-threading 无 GIL 实测：跑进"没有 GIL 的世界"

> 全清单的加餐压轴。`uv python install 3.14t` 装一个 PEP 703 free-threading 构建，
> 把同一段 threading 代码在两种构建下各跑一遍：**GIL 构建 4 线程 0.97×（串行化），
> free-threading 构建 3.73×（真并行）**——十三站以来"线程是假并发"的叙事，在这里被
> 正式改写。

## 1. 为什么需要它

项目 2 说过"threading 是假并发"，项目 5 用进程绕开，项目 14 量出 CPU 密集线程版 1.18×。但 2024 年起 CPython 有了不带 GIL 的官方构建（PEP 703 free-threading），3.14 起正式受支持。这一站亲手装一个、亲手跑一个：**验证 GIL 状态可以关、threading 可以真并行、扩展比能到 3.7×**——同时也验证一个新常识：没有 GIL 兜底后，数据竞争的面积变大了，锁该加还得加。

## 2. 总览：核心机制一图看懂

![free-threading：同一个 threading，两种世界](images/free_threading.svg)

一句话心智模型：**同一份 threading 代码，GIL 构建把它串行化（0.97×），free-threading 构建让它 4 核齐跑（3.73×）——换的是解释器构建，不是你的代码**。看图上下对照：同一个"4 线程 × 200 万迭代"任务，走进 GIL 构建就排队（0.125s 白忙），走进 free-threading 构建就真并行（0.027s）。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/concurrency/16_free_threading/images/free_threading.html)
> （或本地打开 [`images/free_threading.html`](images/free_threading.html)）。

## 3. 快速开始

```bash
# 前置（一次性）：uv python install 3.14t   # 本机已装 3.14.3t ✅
cd concurrency/16_free_threading
python3 free_threading.py             # 自动探测 python3.14t，双构建对比 + 断言
```

真实输出（macOS aarch64，GIL 构建 3.13.9 / free-threading 3.14.3t）：

```
========================================================
[1. 双构建对比：4 线程 × 2,000,000 次迭代]
========================================================
  构建               版本         GIL         1线程      4线程      扩展比
  GIL              3.13.9     开        0.030s   0.125s    0.97×
  free-threading   3.14.3     关        0.025s   0.027s    3.73×

  结论：GIL 构建 4 线程 0.97×（串行化），free-threading 3.73×（真并行）
  同样的 threading 代码，换了构建就是两倍以上吞吐——这就是 PEP 703 的意义

========================================================
全部断言通过 ✓  验收点：双构建 GIL 状态（§1）、扩展比对照（§1）
提醒：free-threading 下'靠 GIL 兜底的侥幸代码'不再安全——锁该加还得加（项目 3）
```

诚实预期（本机 3 次实测）：

- **free-threading 扩展比 3.4~3.9× 波动**：4 线程在 18 核上接近线性；断言线 ≥2.0× 留足余量
- **GIL 构建的 0.97× 是"总功 4 倍、墙钟不变"**：4 线程各做 200 万次（共 800 万）与单线程 200 万耗时相同——在 GIL 下这不可能，在 free-threading 下这是常态
- **两条断言绑构建类型**：GIL 构建断言 `gil_enabled=True` 且扩展比 <1.3；free-threading 构建断言 `gil_enabled=False` 且扩展比 ≥2.0

## 4. 核心概念

### 4.1 PEP 703：GIL 成为可选项

free-threading 构建从解释器里**移除了 GIL**，改用细粒度锁与引用计数改造（延迟引用计数 + 分代 GC 调整）保证内存安全。`sys._is_gil_enabled()` 是探测开关状态的官方接口（free-threading 构建允许用 `PYTHON_GIL=1` 临时把 GIL 请回来——兼容模式的逃生门）。本机实测：同一份纯 Python 循环，GIL 构建 4 线程 0.97×（串行化），free-threading 构建 3.73×（4 核真并行）。

### 4.2 竞态面积的重新计算

GIL 世界里"读-改-写之间没有检查点就不丢"（项目 2 的实测结论）；free-threading 下没有全局锁兜底，**任何非原子的共享读写都是真竞态**——项目 2 的无锁实验在这里会从"丢失 78%"恶化到"结果不可预测"。推论：迁移到 free-threading 构建前，先过一遍项目 3：所有共享可变状态都必须有锁（或改为消息传递）。

### 4.3 生态现状：先看 wheels 再上生产

free-threading 构建是独立 ABI（cp314t），C 扩展必须提供对应 wheel 才能装。2026 年主流科学栈（numpy/pydantic 等）已提供，但长尾库仍有缺口。生产迁移检查单：依赖 wheel 覆盖 → 压测单线程回退（free-threading 单线程比 GIL 构建慢 ~5-10%）→ 竞态审计（项目 2/3 的作业全部重做）。

## 5. 关键代码解析

**为什么扩展比的定义是 `T × t(单线程) / t(T 线程)` 而不是 `t(单线程) / t(多线程)`？**

```python
t1 = bench_threads(1, N_ITER)       # 单线程做 n 次
t4 = bench_threads(4, N_ITER)       # 4 线程各做 n 次（总功 4n）
speedup = N_THREADS * t1 / t4       # 串行做 4n ÷ 并行做 4n
```

前者比较的是"同样总功"的耗时——4 线程各做 200 万次的总功等于单线程做 800 万次。第一版误用"单线程 n 次 ÷ 4 线程 n 次"，完美并行时比值恰好 1.0（因为分母里的总功也是 4 倍）——**度量定义错了，完美的 4× 并行会被看成 0.95×**。

坑清单：

- **把 free-threading 当"更快的 GIL 构建"**：它是不同的 ABI（cp314t），C 扩展 wheel 要单独提供；单线程性能还有 ~5-10% 回退
- **以为无 GIL = 不用锁**：GIL 从来只保护解释器不保护业务（项目 2）；free-threading 下竞态面积更大而非更小
- **`sys._is_gil_enabled()` 与 `Py_GIL_DISABLED` 混为一谈**：前者是运行时状态（free-threading 构建也可能被 PYTHON_GIL=1 打开），后者是构建期配置；两处都查才严谨
- **用 stdin/管道方式跑多进程子命令**：spawn 子进程 re-import `__main__` 时 `<stdin>` 无法定位（项目 5 教训在本项目的复现）——一切以真实文件入口为准

## 6. 文件结构

```
16_free_threading/
├── free_threading.py                        # 主演示脚本：双构建对比 + 断言
├── README.md                                # 本教程文档
└── images/
    ├── free_threading.json          # 图源（typed JSON IR，可编辑重渲染）
    ├── free_threading.html          # 交互示意图（浏览器打开）
    └── free_threading.svg           # 双主题矢量图（本 README §2 内嵌）
```

`free_threading.py` 内容：`bench_threads()` 线程扩展比基准 / `bench_build()` 当前构建画像（版本/GIL/速度）/ `find_ft_python()` 探测 python3.14t / `demo_compare()` 双构建对比与断言；`--bench` 模式输出 JSON 供父进程收集。

## 7. 深入要点

**Q1: 什么是 free-threading 构建？与普通构建的区别？**
PEP 703 移除 GIL 的 CPython 变体（cp314t ABI）：用细粒度锁与延迟引用计数保证内存安全，线程可真并行。普通构建靠 GIL 串行化字节码。两者 API 兼容，但扩展 ABI 与性能特征不同。

**Q2: free-threading 下还需要锁吗？**
需要。GIL 从来只保护解释器内部状态，不保护业务不变量（项目 2 §3 透支演示）。free-threading 下共享可变状态的竞态窗口从"字节码间隙"扩大到"任意交织"，锁、队列、原子操作的需求只增不减。

**Q3: 怎么判断一段代码在 free-threading 下是否安全？**
三问：共享了什么可变状态？读写之间有没有可能被切换（free-threading 下任意点都可能）？有没有锁/原子/不可变保护？项目 2 的读-改-写实验在 free-threading 下丢得更狠——用数据说话。

**Q4: 单线程性能为什么有回退？要不要现在迁移？**
移除 GIL 后引用计数与对象头需要额外同步，单线程回退 ~5-10%。策略：IO 密集且依赖阻塞库的先不动；CPU 密集且线程生态完善的服务可以先行，用项目 14 的基准方法论量化迁移收益。

**Q5: 子解释器（PEP 734）与 free-threading 什么关系？**
两条并行的多核路线：子解释器在一个进程内隔离多套解释器状态（每套各有自己的模块空间，通信走显式通道）；free-threading 是全进程共享内存的真并行。前者隔离性好，后者共享方便——按隔离需求选择。

## 8. 总结

1. **亲手装了无 GIL 的 Python**：`uv python install 3.14t`，`sys._is_gil_enabled()` 实测为 False
2. **同一份代码两种命运**：GIL 构建 0.97×，free-threading 3.73×——度量定义正确才能看见真相
3. **竞态面积变大**：无 GIL 兜底后，锁与消息传递从"优化"变"必需"（项目 2/3 全部重考）
4. **迁移检查单**：wheel 覆盖 → 单线程回退评估 → 竞态审计，缺一不迁
5. **系列收官**：从"线程为什么是假并发"到"线程如何真并行"——十六站的完整闭环

🎉 全系列完成。回头看 [python_concurrency.md](../../python_concurrency.md)：线程熟手 → 多核驾驭者 → 异步工程师 → 并发诊断专家 → 并发架构师（+ 前沿瞭望员）。
