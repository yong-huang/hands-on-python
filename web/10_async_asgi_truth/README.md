# 10 · async 端点与 ASGI 真相：def 与 async def 到底在哪执行

> "加了 async 就快"是 Web 性能第一大谣传。本实验起**真 uvicorn 服务器**，用线程名、
> 100 路并发压测和 `--workers 4` 多进程分发把执行模型钉死：**async def 跑在事件循环
> 线程，def 被扔进容量 40 的 anyio 线程池**——100 个 0.5s 延迟请求，前者 0.56s、
> 后者 1.56s。差距来自"等待不占线程"，不是魔法。asyncio 语法本身是并发线（lab 08-11）
> 的课题，这里只回答 Web 语境的问题。

## What

三个只有实测才能钉死的 ASGI 事实：**执行位置**——`async def` 端点内 `threading.current_thread()` 是 MainThread，`def` 端点却是 AnyIO 工作线程；**线程池天花板**——def 版并发被 anyio 默认容量 40 卡住，100 个请求要分约 3 批；**多 worker 分发**——`uvicorn --workers 4` 的四个进程共享监听 socket，accept 由内核分配，应用层无感知。一句话心智模型：**事件循环赢在"等待不占线程"——await 让出控制权，100 个 sleep 可以叠在同一根线程上；线程池赢在"兼容阻塞代码"，但每个 sleep 都实打实占一个线程名额**。

## Why

在"该写 def 还是 async def"的选型争论里，这三条数据就是答案的地基。

## How

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

========================================================
[3. uvicorn --workers 4：同一 socket 的进程级分发（验收点）]
========================================================
  100 个请求被分发给 4 个 worker 进程: [69296, 69297, 69298, 69299]
  服务器已优雅退出，无端口残留
```

诚实预期：

- **比值 ~2.78× 是"100 并发 / 容量 40"结构决定的**（⌈100/40⌉ ≈ 3 批），不是 async 快 2.78 倍的普适定律；并发数低于线程池容量时两者几乎打平
- **线程名只有一种不代表只有一个线程**：anyio 工作线程全部同名，§2 输出"1 种线程名"是名字集合，不是线程数
- **脚本起两个临时 uvicorn 实例**（单 worker 测模型、4 workers 测分发），端口向内核随机索取，跑完 terminate；并发断言对机器负载敏感，阈值已放宽（async < 2s、比值 ≥ 2）
- **CPU 密集任务两个模型都救不了**：本实验只测 IO 延迟；CPU 密集该上进程池/多进程——那是并发线 lab 14 的对决数据

### ASGI 三层：server → 框架 → 端点

uvicorn 是 ASGI server：监听 socket、解析 HTTP、把请求翻译成 `scope/receive/send` 三件消息喂给 ASGI 应用（Starlette/FastAPI）。事件循环在 server 进程里跑，**async 端点直接在循环上协程调度，def 端点被 anyio.to_thread 丢进线程池**——同一个应用，两种执行模型并存，选择权在端点声明的那个 `async` 字。

### def 的隐性天花板：线程池容量 40

anyio 默认 `CapacityLimiter.total_tokens = 40`：第 41 个 def 请求要排队等前人腾线程。所以"def 端点在高并发下变慢"不是玄学——排队波次 ≈ ⌈并发数/40⌉。可以用 `RunVar`/配置调大容量，但那是在用线程数换并发，代价是内存与上下文切换——async 版用 1 根线程就叠住了 100 个等待。

### 什么时候写 async def

**IO 等待多且用的是异步客户端**（httpx.AsyncClient、asyncpg、redis.asyncio）→ async def，事件循环把等待叠起来。**调用了阻塞库**（requests、SQLAlchemy 同步引擎、time.sleep）→ 老实写 def，让它进线程池——**千万别在 async def 里写阻塞调用**：一根事件循环线程被占死，整个服务的所有并发一起停摆。这是 async Web 服务第一大事故来源。

### --workers：进程级横向扩展

GIL 之下单进程只能吃满一核；`uvicorn --workers 4` 起四个进程共享同一监听 socket，内核把 accept 分给空闲进程（实测 100 请求落到 4 个 PID）。worker 数的经验起点 = CPU 核数；配合容器时通常 1 容器 1 worker，副本数交给编排层（lab 18 会实践）。

## Deep Dive

**为什么起真 uvicorn 而不用 TestClient 测执行模型？**

```python
proc = subprocess.Popen([sys.executable, "-m", "uvicorn", f"{MODULE}:app", ...])
```

TestClient 在进程内用 anyio portal 跑应用，事件循环线程的名字与真实部署不同（且串行语义），测出来的"位置"不可信。**真 uvicorn + 真 socket + 并发压测**拿到的线程名与耗时才是生产语境的证据。代价是要管理子进程生命周期——`finally: terminate + wait` 保证无残留。

踩坑清单：

- **在 async def 里调阻塞函数**（requests、time.sleep、同步 DB 驱动）：占死事件循环线程，全服务并发归零；本实验的 io-sync 若误标 async，比值会反着来
- **以为 async 自动并行**：await 只是让出控制权，端点内如果一路同步计算，事件循环照样串行；并发来自"多个请求互相错开等待"
- **用 `total_capacity` 探测线程池**：anyio 的 `CapacityLimiter` 属性叫 `total_tokens`——本实验第一版就栽在这个属性名上（AttributeError → 500），已如实记录
- **workers 数拍脑袋调大**：每 worker 是完整进程（内存 ×N），CPU 密集型 4 workers 抢 2 核反而互拖；从核数起步压测定值

## Q&A

**Q1: FastAPI 里 def 和 async def 端点的执行区别？**
async def 在事件循环线程上以协程方式运行，等待时可服务其他请求；def 被 anyio 扔进容量 40（默认）的线程池执行，阻塞不拖累事件循环但并发受池容量限制。实测线程名：MainThread vs AnyIO worker thread。

**Q2: 什么情况下 async 不比 def 快，甚至更差？**
CPU 密集任务（GIL 下事件循环单线程更无力，该用进程池/多进程）；端点内全是同步计算没有等待点；以及 async def 里误用阻塞库把整根循环线程卡住——此时它比 def 慢且殃及全服务。
