# 18 · 生产部署：gunicorn worker、12-factor 与 Docker

> dev server 的终点是生产姿态。本实验把三件部署实事全部实测：**gunicorn -w 4** 的
> 进程级并发（100 请求分发到 4 个 PID）、**12-factor** 的环境变量配置（同一份代码
> prod/dev 零改动切换）、**Docker 构建 + 容器健康检查**（/healthz 200）。
> nginx 反代作为选做项附配置思路，不在自动断言内。

## Background

这节讲"能跑"和"能上线"之间的距离从哪来。没有这套部署实践时，最直接的做法是把开发用的服务器直接对外：Flask 的 `app.run()` 或单进程 uvicorn（FastAPI 配套的异步服务器）裸跑在主机上。

这个做法在三个地方撞墙。并发上，dev server 单线程、日志慢，真实流量一来就排队；配置上，SECRET_KEY、数据库地址硬编码在代码里，换环境要改代码，密钥还随仓库泄漏；环境上，"在我机器上能跑"——依赖版本、运行时、启动步骤全凭口口相传，换台机器就散架。

三块短板各有对应的工程答案：生产服务器（gunicorn——Python 常用的多进程生产服务器）、配置方法论（12-factor）与容器（Docker）。本实验把三者各实测一次。

## What

这节定义实验覆盖的三件部署实事，并给一个共同的心智模型。

- **并发模型**：dev server 之外，生产用 pre-fork（预先 fork 子进程）的 master/worker 模型——master 只管拉起与监视，accept（接收连接）由 worker 竞争
- **配置管理**：配置从环境变量来，同一份代码配合不同环境就是不同部署——12-factor III（十二要素方法论第三条"配置"）的实践
- **环境一致性**：依赖、运行时、启动命令全部声明进 Dockerfile，构建出镜像（把应用连同环境打包的只读模板），容器（镜像的运行实例）在哪都能一致启动

一句话心智模型：**master 只管拉起与监视，accept 由 worker 竞争；配置从环境来；镜像构建一次、健康检查说了算**。

可以把 master/worker 想象成一家门店：店长（master）不接待客人，只负责排班和补岗；四个店员（worker）谁空闲谁接待。但和门店不同的是：店员挂了店长会立刻重新 fork 一个补上，这正是输出里多 PID（进程号）并存的来源。

## When to Use

这节补部署判断力：在做什么事的时候，该拿出哪件工具。

- **在把服务从本机搬到对外生产环境**的时候，换掉 dev server，用 gunicorn/uvicorn 这类生产服务器承接并发
- **在多环境（开发/预发/生产）部署同一份代码**的时候，配置全部走环境变量，构建产物零改动切换
- **在把应用交付给他人或云平台运行**的时候，打成 Docker 镜像，把"怎么装、怎么跑"声明清楚

何时不用：本机开发调试，dev server 的自动重载反而是优点；一次性本地脚本，也不必为它写 Dockerfile。

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| dev server（app.run/裸 uvicorn） | 单进程、开发向，自带重载 | 本机开发调试 |
| gunicorn/uvicorn 裸跑 | 多 worker 生产并发 | 单机简单部署 |
| 生产服务器 + nginx 反代 | 静态文件、TLS、限流在外层完成 | 对外正式站点 |
| Docker 容器 | 环境整体打包，处处一致 | 交付、云部署、需要复制的环境 |

## Quick Start

这节跑通三节断言：gunicorn 多 worker 分发、环境变量切配置、Docker 构建与健康检查。前置条件：仓库虚拟环境，外加本机 Docker daemon（第三节依赖）。

```bash
cd web/18_production_deploy
source ../.venv/bin/activate
python3 deploy_demo.py    # gunicorn/12-factor/Docker 三节断言（需 Docker daemon）
```

真实输出节选：

```
========================================================
[1. gunicorn -w 4：100 个请求 ≥3 个 worker PID（验收点）]
========================================================
  100 个请求分发到 4 个 worker: [12538, 12539, 12540, 12541]
  master 只管拉起与监视，accept 由各 worker 竞争——进程级并发用满多核

========================================================
[2. 12-factor：同一份代码，环境变量切配置（验收点）]
========================================================
  APP_MODE=prod → 响应头 X-App-Mode=prod · body mode=prod
  APP_MODE=dev  → 响应头 X-App-Mode=dev · body mode=dev

========================================================
[3. Docker：构建镜像 → 容器内 /healthz 200（验收点）]
========================================================
  docker build → 镜像 web-lab-18 就绪
  容器内 uvicorn 启动 → 宿主机 http://127.0.0.1:55576/healthz → 200
  容器已清理（镜像保留：下次构建走缓存，秒级）
```

诚实预期：

- **容器内跑的是 uvicorn 单进程**：`1 容器 1 进程`——容器横向扩展交给 compose（Docker Compose，单机编排多容器的工具）/k8s（Kubernetes——主流的容器编排平台，负责批量管理容器的启停与副本数）副本数，不在容器内再叠 worker
- **镜像构建依赖网络**：首次拉 `python:3.13-slim` 与 pip 安装受网络影响（本机 2026-09-11 实测约 40s，有层缓存后秒级）；离线环境先 `docker pull` 再跑
- **nginx 反代未纳入自动断言**：需要改系统 nginx 配置（Homebrew nginx 已装）；思路是 `proxy_pass http://127.0.0.1:{app_port}` + `X-Forwarded-*` 头，配置片段见本 README Deep Dive
- **4 个 worker 的 PID 是连续数字**：master 先 fork，worker 进程号天然连续——也佐证了"master 先起"的模型

实验涉及的工具速览：

| 工具 | 作用 |
|---|---|
| gunicorn | WSGI 生产服务器，pre-fork master/worker 模型 |
| 12-factor III | 配置走环境变量，代码与配置分离 |
| Dockerfile | 声明依赖、运行时与启动命令的构建脚本 |
| `/healthz` | 健康检查端点，编排层（即 k8s 这类容器管理系统）探活的契约 |
| nginx | 反向代理（在应用外层替它接请求的服务器），选做项 |

## How It Works

这节把输出里的三组现象拆到机制层，并补上 nginx 与测量方法两块。

### gunicorn 的 pre-fork worker 模型

master 进程只做三件事：读取配置、fork N 个 worker（fork——Unix 下复制当前进程的系统调用）、监视重启挂掉的 worker；真正的 accept/处理全在 worker。

进程级并发天然绕开 GIL（全局解释器锁——同一时刻只允许一个线程执行字节码），因为每个 worker 是独立解释器。worker 数起点 = CPU 核数（IO 密集可配 gthread/async worker 再放大）。

与 lab 10 的 `uvicorn --workers` 同机制，只是 ASGI（异步网关接口）与 WSGI（同步网关接口）之分。输出里"4 个连续 PID"一行就是 master 先 fork 的直接证据。

### 12-factor III：配置即环境

同一份代码 + 不同环境变量 = 不同环境的部署。`APP_MODE` 的读法 `os.environ.get()` 发生在进程 import 时——gunicorn master 的环境被每个 worker 继承，所以"一次注入全局生效"。

输出里 `X-App-Mode=prod/dev` 两行，就是同一份代码两次注入的结果。反面教材是把 SECRET_KEY/数据库地址写进代码仓库：密钥泄漏 + 换环境要改代码。

### Dockerfile 的层缓存与健康检查

先 `RUN pip install` 再 `COPY 代码`——依赖层缓存住，改代码不触发重装（输出里"下次构建走缓存，秒级"靠的就是它）。指令按变更频率从低到高排列，`.dockerignore` 排除 .venv/__pycache__ 防缓存失效与镜像膨胀。

容器入口用生产服务器（uvicorn），`EXPOSE` 声明端口，`/healthz` 是编排层的探活契约——K8s 的 liveness/readiness 探针打的就是它。

### nginx 反向代理（选做思路）

```
server {
  listen 8080;
  location / {
    proxy_pass http://127.0.0.1:{app_port};
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
  }
}
```

反代的价值：静态文件、TLS 终结、压缩、限流都在应用外层完成。FastAPI/uvicorn 场景下还需 `proxy_set_header X-Forwarded-Proto $scheme` 配合 uvicorn 的 `--proxy-headers` 识别 https。

### PID 探测为什么要并发打 100 个请求

```python
with ThreadPoolExecutor(max_workers=10) as pool:
    pids = set(pool.map(lambda _: httpx.get(f"{base}/pid", ...).json()["pid"], range(100)))
```

单线程串行打 100 个请求，可能全落在一个 worker 上（连接复用 + 请求太快）；并发 10 路才能真实触发内核的多 worker 分发。set 去重后的 PID 数就是"多进程并发"的直接证据——输出第一节那行 4 个 PID 即来自这里。

## Pitfalls & Q&A

这节先列四个踩坑点，再答三个深入问题。

**dev server 进容器**：现象是容器扛不住真实并发；原因是 Flask 的 `app.run()` / 单进程 uvicorn 是开发姿态，进了容器就是生产事故预备队；解法是容器入口永远是 gunicorn/uvicorn（生产服务器）。

**配置读成模块级常量但注入不生效**：现象是改了环境变量、行为没变；原因是 `os.environ.get` 的读取时机在 import，读成常量后不再感知变化；解法是改环境变量必须重启进程——这正是 12-factor 的语义，不是 bug。

**docker run 不加 `--rm`**：现象是退出的容器一层层堆积，`docker ps -a` 越积越多；原因是容器停止后默认保留；解法是本实验的 `--rm` + `rm -f` 双保险。

**健康检查打了重接口**：现象是探针超时引发容器反复重启（重启风暴）；原因是 /healthz 查了库或外呼了依赖；解法是健康检查必须轻——不查库、不外呼。

**Q1: 12-factor 是什么？说三条你用上的。**
方法论十二条，核心是"配置与环境分离"。

用上的三条：III 配置走环境变量（本项目 APP_MODE）、IV 后端服务当作附加资源（DATABASE_URL 可替换）、IX 进程无状态、可随意启停（会话数据不存放在进程内存里，任何 worker 都能处理任何请求）。

**Q2: /healthz 健康检查的设计原则？**
无副作用、能表达"这个实例能不能接流量"；区分 liveness（进程活着，失败重启）与 readiness（依赖就绪，失败摘流量）两种探针。

**Q3: 容器内跑多 worker 还是 1 进程？**
主流是 1 容器 1 进程：副本数交给编排层、故障域隔离、日志直出 stdout。容器内多 worker 适合无编排的传统主机部署——两者别混用（worker 数 × 副本数会把节点打爆）。
