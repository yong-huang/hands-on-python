# 23 · workers 模型与 Docker：进程怎么摆，状态放哪里

> FastAPI 应用上生产的最后一步是回答"开几个进程、装进什么里"。本实验实测
> uvicorn 单进程与 --workers 4 的 PID 分布、gunicorn 的 master/worker 模型，
> 并交付一份按生产惯例编写的 Dockerfile（本机无 Docker daemon，构建命令
> 如实标注未实跑）。

## Background

开发时一条 `uvicorn main:app --reload` 就能跑，是因为 dev server 替你管了
进程。上生产后这些决定摆到你面前：单进程吃不满多核；开多了，内存里的
计数、缓存、日志又各成一体。

第三层是"装进什么里"：容器把进程连同依赖钉成一个可移植单元，横向扩展
交给副本数而不是进程数。

## What

**workers 模型**是一组互相独立、监听同一端口的操作系统进程：master（或
uvicorn 的父进程）负责生与死，worker 负责干活。**容器**是把进程、依赖、
文件系统打包的隔离单元。

可以把 master/worker 想象成**门店与店员**：店长只管招人、辞人、看店门，
接单的永远是店员。但和门店不同的是，店员之间没有任何共同记忆——本实验
的计数器在每个进程里各是一本账（下表实测）。

| 部署形态 | 进程数 | 适合 | 本实验证据 |
|:--|:--|:--|:--|
| uvicorn 单进程 | 1 | 低流量、开发 | 6 请求同一 PID |
| uvicorn --workers N | 1+N | 多核吃满 | 请求分散到多个 PID |
| gunicorn -k UvicornWorker | 1+N | 需要进程管理策略 | Booting worker 日志 |
| 容器 × 副本 | 每容器 1 进程 | 编排与伸缩 | Dockerfile（未实跑） |

左侧 master 只管 fork 与补位，worker 各干各的活；状态要跨进程共享时，唯一出口是右侧的外置存储。

![Lab 23 · workers 模型：master 管生死，worker 干活，状态各一本账](images/deploy.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/23_deploy/images/deploy.html)
> （或本地打开 [`images/deploy.html`](images/deploy.html)）。

## When to Use

- 单进程 + 多线程模型已被 lab 11 证伪（GIL 之下 CPU 密集无益）后：多进程
  是 Python 吃满多核的正路。
- 有编排平台（compose/k8s）时：1 容器 1 进程，扩容改副本数。
- 何时不用：纯 IO 的小服务一个 worker 足够，进程多了反而白占内存。

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（gunicorn 已装），未创建则先在仓库根执行
`./scripts/load_resources.sh`。运行：

```bash
cd fastapi/23_deploy && ./23_deploy.sh all
```

真实输出（节选，`...` 处省略了中间输出；PID 每次运行都不同）：

```text
=====> [1/4] uvicorn 单进程: 一条进程伺服所有请求
    6 个请求落在 1 个进程: [98779]
    计数样本(前 5): [1, 2, 3, 4, 5]
    [PASS] 单 worker: 6 个请求同一 PID
...
=====> [2/4] uvicorn --workers 4: 四条进程分摊请求
    20 个请求落在 2 个进程: [98937, 98938]
    计数样本(前 5): [1, 1, 2, 2, 3]
    [PASS] 多 worker: 请求分散到多个 PID
...
=====> [3/4] gunicorn 对照: master/worker 模型(2 workers)
        [INFO] Listening at: http://127.0.0.1:8924 (98818)
        [INFO] Booting worker with pid: 98825
        [INFO] Booting worker with pid: 98826
  演示完成: 5 项断言全部通过。
```

诚实预期：单进程节"落在 1 个进程"恒定；--workers 节观察到的不同 PID 数
为 2~4（20 个请求未必喂饱 4 个 worker）；gunicorn 的 Booting worker 行恒出现。

Docker 节在本机无 daemon 的环境只打印命令不构建——README 与脚本都如实
标注，有 daemon 的环境执行即可复现。

## How It Works

**master/worker 的分工**：gunicorn 的 master 不接请求——它只负责 fork
worker、监控死亡并补位。日志里 `Listening at` 挂在 master 进程号上，
`Booting worker` 才是干活的进程。

**keep-alive 的粘性**：默认 HTTP 长连接把同一客户端的请求粘在同一条连接
上，而连接固定属于一个 worker——单客户端压测会"只忙一个进程"。演示用
`Connection: close` 打散连接才能看到分摊，这是压测多进程服务的常识。

**状态放哪里**：worker 进程互不共享内存，lab 22 的限流计数、本实验的
请求计数在 --workers 下各是一本账。结论一句话：**进程内状态只当缓存用，
权威状态必须外置**（数据库、Redis）。

## Pitfalls & Q&A

- **容器里再叠 worker**：1 容器 1 进程，横向扩展交给副本数；容器内再开
  N 个 worker 会让编排层失去对负载的可见性。
- **--reload 上了生产**：reload 是开发特性（改码重启进程），生产用它等于
  随时自断服务。
- **镜像里塞构建工具链**：多阶段构建——构建层装编译器，运行层只拷产物，
  镜像小一个量级、攻击面小一批。
- **以 root 跑容器**：逃逸即全机沦陷。Dockerfile 里 `USER appuser` 一行
  就能关上这扇门。

**Q：--workers 设多少？** 经验起点是 CPU 核数；IO 密集可再高些。上限受
每进程内存与数据库连接池乘积约束——4 worker × pool 10 = 40 连接，先问
数据库答不答应。

**Q：uvicorn 与 gunicorn 怎么选？** 单独 uvicorn 足够大多数场景；需要
gunicorn 的进程管理策略（平滑重启、超时回收）时用
`gunicorn -k uvicorn.workers.UvicornWorker` 包一层。

**Q：Dockerfile 里为什么先 COPY requirements.txt？** 层缓存：代码天天改，
依赖月月改——把变得慢的放前面，构建从秒级省到分钟级。
