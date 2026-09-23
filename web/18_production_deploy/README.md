# 18 · 生产部署：gunicorn worker、12-factor 与 Docker

> dev server 的终点是生产姿态。本实验把三件部署实事全部实测：**gunicorn -w 4** 的
> 进程级并发（100 请求分发到 4 个 PID）、**12-factor** 的环境变量配置（同一份代码
> prod/dev 零改动切换）、**Docker 构建 + 容器健康检查**（/healthz 200）。
> nginx 反代作为选做项附配置思路，不在自动断言内。

## What

"能跑"和"能上线"之间隔着三件事：**并发模型**——dev server 单线程/慢日志，生产的 worker 模型要亲眼看一次多 PID 分发才理解 master/worker 分工；**配置管理**——SECRET_KEY、数据库地址绝不能硬编码，环境变量注入是"构建一次、处处部署"的基础（12-factor III）；**环境一致性**——"在我机器上能跑"的解法是容器：依赖、运行时、启动命令全部声明在 Dockerfile 里。一句话心智模型：**master 只管拉起与监视，accept 由 worker 竞争；配置从环境来；镜像构建一次、健康检查说了算**。

## Why

容器内外各验一次 /healthz。

## How

```bash
cd web/18_production_deploy
source ../.venv/bin/activate
python3 deploy_demo.py    # gunicorn/12-factor/Docker 三节断言（需 Docker daemon）
```

真实输出节选（gunicorn 26.2.0 · Docker 29.4.0）：

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

- **容器内跑的是 uvicorn 单进程**：`1 容器 1 进程`——容器横向扩展交给 compose/k8s 副本数，不在容器内再叠 worker
- **镜像构建依赖网络**：首次拉 `python:3.13-slim` 与 pip 安装受网络影响（本机 2026-09-11 实测约 40s，有层缓存后秒级）；离线环境先 `docker pull` 再跑
- **nginx 反代未纳入自动断言**：需要改系统 nginx 配置（Homebrew nginx 已装）；思路是 `proxy_pass http://127.0.0.1:{app_port}` + `X-Forwarded-*` 头，配置片段见本 README Deep Dive
- **worker 内数分别是 4 个连续 PID**：master 先 fork，worker 进程号天然连续——也佐证了"master 先起"的模型

### gunicorn 的 pre-fork worker 模型

master 进程只做三件事：读取配置、fork N 个 worker、监视重启挂掉的 worker；真正的 accept/处理全在 worker。进程级并发天然绕开 GIL（每个 worker 是独立解释器）。worker 数起点 = CPU 核数（IO 密集可配 gthread/async worker 再放大）。与 lab 10 的 `uvicorn --workers` 同机制，只是 ASGI/WSGI 之分。

### 12-factor III：配置即环境

同一份代码 + 不同环境变量 = 不同环境的部署。`APP_MODE` 的读法 `os.environ.get()` 发生在进程 import 时——gunicorn master 的环境被每个 worker 继承，所以"一次注入全局生效"。反面教材是把 SECRET_KEY/数据库地址写进代码仓库：密钥泄漏 + 换环境要改代码。

### Dockerfile 的层缓存与健康检查

先 `RUN pip install` 再 `COPY 代码`——依赖层缓存住，改代码不触发重装（本实验二次构建秒级就是靠它）。容器入口用生产服务器（uvicorn），`EXPOSE` 声明端口，`/healthz` 是编排层的探活契约——K8s 的 liveness/readiness 探针打的就是它。

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

## Deep Dive

**为什么 PID 探测用 ThreadPoolExecutor 打 100 个请求？**

```python
with ThreadPoolExecutor(max_workers=10) as pool:
    pids = set(pool.map(lambda _: httpx.get(f"{base}/pid", ...).json()["pid"], range(100)))
```

单线程串行打 100 个请求，可能全落在一个 worker 上（连接复用 + 请求太快）；并发 10 路才能真实触发内核的多 worker 分发。set 去重后的 PID 数就是"多进程并发"的直接证据。

踩坑清单：

- **dev server 进容器**：Flask 的 `app.run()` / 单进程 uvicorn 进了容器就是生产事故预备队；容器入口永远是 gunicorn/uvicorn（生产服务器）
- **配置读成模块级常量但测试时注入不生效**：`os.environ.get` 的读取时机在 import——改环境变量必须重启进程（这正是 12-factor 的语义，不是 bug）
- **docker run 不加 `--rm`**：退出的容器一层层堆积，`docker ps -a` 几天后惨不忍睹；本实验用 `--rm` + `rm -f` 双保险
- **健康检查打了重接口**：/healthz 必须轻（不查库、不外呼），否则探针超时引发重启风暴

## Q&A

**Q1: 12-factor 是什么？说三条你用上的。**
方法论十二条，核心是"配置与环境分离"。用上的三条：III 配置走环境变量（本项目 APP_MODE）、IV 后端服务当作附加资源（DATABASE_URL 可替换）、IX 进程无状态可随意启停（一请求一 session 配套）。

**Q2: Dockerfile 的层缓存怎么利用？**
指令按变更频率从低到高排列：依赖安装（低频）在前、源码拷贝（高频）在后——源码改动不重装依赖。`.dockerignore` 排除 .venv/__pycache__ 防缓存失效与镜像膨胀。

**Q3: /healthz 健康检查的设计原则？**
轻量（不触发外部依赖）、无副作用、能表达"这个实例能不能接流量"；区分 liveness（进程活着，失败重启）与 readiness（依赖就绪，失败摘流量）两种探针。

**Q4: 容器内跑多 worker 还是 1 进程？**
主流是 1 容器 1 进程：副本数交给编排层、故障域隔离、日志直出 stdout。容器内多 worker 适合无编排的传统主机部署——两者别混用（worker 数 × 副本数会把节点打爆）。
