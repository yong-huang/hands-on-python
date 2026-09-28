# 10 · async 端点与 ASGI 真相：def 与 async def 到底在哪执行

> "加了 async 就快"是 Web 性能第一大谣传。本实验起**真 uvicorn 服务器**，用线程名、
> 100 路并发压测和 `--workers 4` 多进程分发把执行模型钉死：**async def 跑在事件循环
> 线程，def 被扔进容量 40 的 anyio 线程池**——100 个 0.5s 延迟请求，前者 0.56s、
> 后者 1.56s。差距来自"等待不占线程"，不是魔法。asyncio 语法本身是并发线（lab 08-11）
> 的课题，这里只回答 Web 语境的问题。

## Background

这节回答两个问题：异步 Web 模型普及之前，Python Web 服务怎么扛并发，瓶颈在哪。

经典 Python Web 服务跑在 WSGI（Python 早期定下的 Web 服务器与应用之间的同步接口）模型上：每个请求从进来到响应完成，独占一个工作线程或进程。Flask 与传统部署的 Django 都是这个模型。

它在 IO 密集负载下撞墙：调外部 API、等慢查询时，线程的绝大部分生命是在"干等"。等的人一多，只能靠多开进程/线程来凑并发——每个线程是实打实的栈内存与上下文切换开销，开到成百上千路就变得昂贵。

ASGI（Asynchronous Server Gateway Interface，WSGI 的异步继任协议）与配套的事件循环 server 应运而生：把"等待"从占用线程变成挂起协程，一根线程就能叠住成百上千个在等 IO 的请求。

FastAPI 端点层面的 `def`/`async def` 之别，正是这套模型暴露给开发者的选择开关——选错位置，模型的好处就拿不到。

## What

这节定义 ASGI 执行模型的三要素，给出贯穿全文的心智模型与三件只有实测才能钉死的事实。

ASGI 是 Python Web 服务器与应用之间的异步双向协议：uvicorn 是实现它的 server，负责监听 socket、解析 HTTP；Starlette/FastAPI 是跑在它上面的应用。事件循环（单线程内调度大量协程的机制）就在 server 进程里运转。

一句话心智模型：**事件循环赢在"等待不占线程"——await 让出控制权，100 个 sleep 可以叠在同一根线程上；线程池赢在"兼容阻塞代码"，但每个 sleep 都实打实占一个线程名额**。

可以把事件循环想象成一名餐厅服务员：他不在桌边干等菜做好，点完单就去招呼下一桌，菜好了再端过去。但和餐厅服务员不同的是，只要有一道工序让他亲自站住不动（在 async 端点里调阻塞库），全店的招呼就一起停摆。

| 事实 | 实测结果 | 对应输出 |
|---|---|---|
| 执行位置 | `async def` 端点内是 MainThread，`def` 端点是 AnyIO 工作线程 | [1] |
| 线程池天花板 | def 版并发被 anyio（Starlette/FastAPI 底层依赖的异步工具库，def 端点的线程池由它提供）默认容量 40 卡住，100 个请求分约 3 批 | [2] |
| 多 worker 分发 | `uvicorn --workers 4` 四进程共享监听 socket，accept 由内核分配 | [3] |

## When to Use

这节回答选型争论："该写 def 还是 async def"——本实验的三条数据就是答案的地基。

典型场景：

- 在做 IO 等待多且用的是异步客户端的端点时（httpx.AsyncClient、asyncpg、redis.asyncio）→ 写 async def，事件循环把等待叠起来
- 在调用了阻塞库的端点时（requests、SQLAlchemy 同步引擎、time.sleep）→ 写 def，让它进线程池
- 在单机吞吐到顶、需要扩核时 → `--workers` 多进程横向扩展

反面边界只有一条铁律：**千万别在 async def 里写阻塞调用**——一根事件循环线程被占死，整个服务的所有并发一起停摆。这是 async Web 服务第一大事故来源。

同类方案对比：

| 方案 | 执行模型 | 什么时候选它 |
|---|---|---|
| `def` 端点 | anyio 线程池（默认容量 40） | 调阻塞库的 IO 端点；并发不高的内部服务 |
| `async def` 端点 | 事件循环协程调度 | 高并发 IO 等待、异步客户端齐备 |
| `--workers` 多进程 | 进程级分发，绕开单进程上限 | 吃满多核；与上面两者叠加使用 |
| CPU 密集上进程池 | 彻底离开事件循环 | 重计算任务，两个 Web 模型都救不了 |

## Quick Start

这节把演示跑起来：一条命令、一段真实输出、四条诚实预期，最后看两种端点声明的差别。

```bash
cd web/10_async_asgi_truth
source ../.venv/bin/activate
python3 fastapi_async_truth.py    # 起两个真 uvicorn 实例完成三节实测（约 15s）
```

真实输出节选（FastAPI 0.141.1 + uvicorn 0.52.4）：

```
========================================================
[1. 执行位置：async 在事件循环线程，def 在线程池]
========================================================
  async def 执行线程: 'MainThread'（uvicorn 主线程 = 事件循环）
  def       执行线程: 'AnyIO worker thread'（anyio 托管的工作线程）
  anyio 线程池容量: 40（def 版并发的天花板）

========================================================
[2. 并发对比：100 并发 × 0.5s 延迟（验收点）]
========================================================
  async def: 100 并发总耗时 0.56s（事件循环把 100 个 sleep 串联等待）
  def      : 100 并发总耗时 1.56s（40 容量线程池 → 约 3 批 × 0.5s）
  比值 2.78× ≥ 2 ✓——async 赢在'等待不占线程'，而不是魔法加速
  def 版响应里出现的线程名: 1 种（工作线程同名；数量受容量 40 限制，请求分批跑）

========================================================
[3. uvicorn --workers 4：同一 socket 的进程级分发（验收点）]
========================================================
  100 个请求被分发给 4 个 worker 进程: [69296, 69297, 69298, 69299]
  原理：4 个 worker 共享同一监听 socket，内核决定谁 accept——负载均衡在内核层
  服务器已优雅退出，无端口残留
```

诚实预期：

- **比值 ~2.78× 是"100 并发 / 容量 40"结构决定的**（⌈100/40⌉ ≈ 3 批），不是 async 快 2.78 倍的普适定律；并发数低于线程池容量时两者几乎打平
- **线程名只有一种不代表只有一个线程**：anyio 工作线程全部同名，§2 输出"1 种线程名"是名字集合，不是线程数
- **脚本起两个临时 uvicorn 实例**（单 worker 测模型、4 workers 测分发），端口向内核随机索取，跑完 terminate；并发断言对机器负载敏感，阈值已放宽（async < 2s、比值 ≥ 2）
- **CPU 密集任务两个模型都救不了**：本实验只测 IO 延迟；CPU 密集该上进程池/多进程——那是并发线 lab 14 的对决数据

两种端点声明只差一个 `async`：

```python
@app.get("/io-async")
async def io_async():
    await asyncio.sleep(0.5)  # 模拟一次 0.5s 的外部 IO（事件循环期间可服务别人）

@app.get("/io-sync")
def io_sync():
    time.sleep(0.5)  # 阻塞式 sleep：这个线程被占满 0.5s
```

这段在做什么：`await` 把控制权交还事件循环（等待期间可服务其他请求）；`time.sleep` 则把当前线程实打实占满 0.5s——同一个 0.5s，两种执行模型。

## How It Works

这节拆执行模型的四层机制：请求从 socket 到端点经过谁、线程池容量怎么卡并发、多进程怎么分发，以及为什么必须起真服务器实测。

### ASGI 三层：server → 框架 → 端点

uvicorn 是 ASGI server：监听 socket、解析 HTTP、把请求翻译成 `scope/receive/send` 三件消息喂给 ASGI 应用（Starlette/FastAPI）。

事件循环在 server 进程里跑，**async 端点直接在循环上协程调度，def 端点被 anyio.to_thread 丢进线程池**——同一个应用，两种执行模型并存，选择权在端点声明的那个 `async` 字。输出 [1] 的两个线程名正是这两条路径的自报家门。

### def 的隐性天花板：线程池容量 40

anyio 默认 `CapacityLimiter.total_tokens = 40`：第 41 个 def 请求要排队等前人腾线程。所以"def 端点在高并发下变慢"不是玄学——排队波次 ≈ ⌈并发数/40⌉，输出 [2] 的 1.56s ≈ 3 批 × 0.5s 就是这么来的。

可以用 `RunVar`/配置调大容量，但那是在用线程数换并发，代价是内存与上下文切换——async 版用 1 根线程就叠住了 100 个等待。

### --workers：进程级横向扩展

GIL（全局解释器锁，同一时刻一个进程内只允许一个线程执行字节码）之下单进程只能吃满一核；`uvicorn --workers 4` 起四个进程共享同一监听 socket，内核把 accept 分给空闲进程（输出 [3] 实测 100 请求落到 4 个 PID）。

worker 数的经验起点 = CPU 核数；配合容器时通常 1 容器 1 worker，副本数交给编排层（lab 18 会实践）。

### 为什么起真 uvicorn 而不用 TestClient

```python
proc = subprocess.Popen([sys.executable, "-m", "uvicorn", f"{MODULE}:app", ...])
```

TestClient 在进程内用 anyio portal 跑应用，事件循环线程的名字与真实部署不同（且串行语义），测出来的"位置"不可信。**真 uvicorn + 真 socket + 并发压测**拿到的线程名与耗时才是生产语境的证据。

代价是要管理子进程生命周期——`finally: terminate + wait` 保证无残留（输出 [3] 末行"无端口残留"就是这条收尾的成果）。

## Pitfalls & Q&A

这节先列四个真实踩过的坑（现象、原因、解法），深入问答与 How It Works 重复的部分压缩成指向。

踩坑清单：

- **在 async def 里调阻塞函数**（requests、time.sleep、同步 DB 驱动）：占死事件循环线程，全服务并发归零；本实验的 io-sync 若误标 async，比值会反着来
- **以为 async 自动并行**：await 只是让出控制权，端点内如果一路同步计算，事件循环照样串行；并发来自"多个请求互相错开等待"
- **用 `total_capacity` 探测线程池**：anyio 的 `CapacityLimiter` 属性叫 `total_tokens`——本实验第一版就栽在这个属性名上（AttributeError → 500），已如实记录
- **workers 数拍脑袋调大**：每 worker 是完整进程（内存 ×N），CPU 密集型 4 workers 抢 2 核反而互拖；从核数起步压测定值

**Q1: FastAPI 里 def 和 async def 端点的执行区别？**
完整机制见 How It Works 的「ASGI 三层」与「def 的隐性天花板」两节：执行线程、容量 40、排队波次都在那里。

**Q2: 什么情况下 async 不比 def 快，甚至更差？**
见 Quick Start 诚实预期第 4 条与本节踩坑清单前两条：CPU 密集任务、端点内没有等待点、阻塞库误标 async——三种情形 async 都不占优，最后一种还殃及全服务。
