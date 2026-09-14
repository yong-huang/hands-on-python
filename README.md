# hands-on-python

面试向 Python 语言机制 hands-on 系列：20 个可独立运行的实验，覆盖装饰器、描述符、元类、GIL 与并发、内存管理等 Python 面试高频主题。每个实验都是一个"五件套"目录——README 教程 + 主演示脚本 + 图三件套（图源 JSON / 交互 HTML / 内嵌 SVG）——读完第 1 个就知道其余 19 个怎么跑、去哪读原理。

## 环境要求

- **Python 3.8+**（推荐 3.10+；使用 `python3 --version` 探测实际版本）
- 主演示脚本 `python3 <topic>.py` **零第三方依赖**
- 每篇 README §2 内嵌双主题架构图（SVG，GitHub 深/浅色模式自适应），并附**交互版**链接（GitHub Pages 在线打开，或本地浏览器打开自包含 HTML：trace 动画、深/浅主题、节点检索）

## 目录结构

```
hands-on-python/
├── README.md                  # 本总目录：实验表格 + 学习路线
├── LICENSE                    # MIT
├── CLAUDE.md                  # 仓库约定（面向 AI 协作工具）
└── interview/
    └── NN_short_name/         # 两位编号 + 小写主题名，共 20 个实验
        ├── README.md          # 8 节制教程：为什么 → 图看懂 → 快速开始 → 概念 → 关键代码 → 文件 → 深入要点 → 总结
        ├── <topic>.py         # 主演示脚本（零第三方依赖，任意 cwd 可跑）
        └── images/
            ├── <topic>.json  # 图源（typed JSON IR，可编辑重渲染）
            ├── <topic>.html  # 交互示意图（自包含单文件）
            └── <topic>.svg   # 双主题矢量图（README §2 内嵌）
```

## 实验列表

| 编号 | 实验名 | 一句话主题 |
|:---|:---|:---|
| 01 | [装饰器工厂](interview/01_decorator_factory/README.md) | 三层嵌套实现带参数的装饰器 |
| 02 | [上下文管理器](interview/02_context_manager/README.md) | with 语句背后的 `__enter__` / `__exit__` 协议 |
| 03 | [描述符协议](interview/03_descriptor/README.md) | `__get__` / `__set__` / `__delete__` 与属性访问底层机制 |
| 04 | [生成器与迭代器](interview/04_generator_iterator/README.md) | yield / send / yield from 与迭代器协议 |
| 05 | [元类](interview/05_metaclass/README.md) | `__new__`、`__init_subclass__` 与类型创建过程 |
| 06 | [`__slots__` 与内存](interview/06_slots_memory/README.md) | 固定属性集合如何降低实例内存开销 |
| 07 | [MRO 与 Mixin](interview/07_mro_mixin/README.md) | C3 线性化与 `super()` 的真实语义 |
| 08 | [GIL 与并发模型](interview/08_gil_concurrency/README.md) | threading / multiprocessing / asyncio 选型 |
| 09 | [魔术方法](interview/09_magic_methods/README.md) | `__eq__` / `__hash__` / `__repr__` 与运算符重载 |
| 10 | [ABC 与 Duck Typing](interview/10_abc_duck_typing/README.md) | 抽象基类、鸭子类型与 Protocol |
| 11 | [`__getattr__` 与代理](interview/11_getattr_proxy/README.md) | 属性查找链与动态代理模式 |
| 12 | [`__new__` vs `__init__`](interview/12_new_vs_init/README.md) | 对象创建生命周期两步走 |
| 13 | [`__call__` 与可调用对象](interview/13_callable/README.md) | 让实例像函数一样被调用 |
| 14 | [copy 与 deepcopy](interview/14_copy_deepcopy/README.md) | 浅拷贝与深拷贝的内存行为差异 |
| 15 | [`*args` / `**kwargs`](interview/15_args_kwargs/README.md) | `*` / `**` 运算符的四种用途 |
| 16 | [GC 与 weakref](interview/16_gc_weakref/README.md) | 引用计数、分代 GC 与循环引用 |
| 17 | [property 深度剖析](interview/17_property/README.md) | 把方法伪装成属性的受控访问 |
| 18 | [typing 与泛型](interview/18_typing_generic/README.md) | TypeVar / Generic / Protocol 静态类型 |
| 19 | [collections 与 dataclass](interview/19_collections/README.md) | namedtuple / dataclass / dict 选型 |
| 20 | [itertools / functools / operator](interview/20_itertools_func/README.md) | 标准库函数式工具三件套 |

## 🧵 第二系列：Python 并发 16 站（2026-09 新增）

继 20 个语言机制实验之后的完整并发专题：线程地基 → 多进程 → asyncio → 诊断与模式 → 终极串联。
每个实验同为本仓库"五件套"规范（教程 README + 主演示脚本 + 架构图三件套），
清单与进度见 [python_concurrency.md](docs/python_concurrency.md)。

| 编号 | 实验名 | 一句话主题 |
|:---|:---|:---|
| 01 | [线程生命周期观察器](concurrency/01_thread_lifecycle/README.md) | Thread / start / join / daemon 与交错执行 |
| 02 | [竞态复现与 GIL 边界实测](concurrency/02_race_gil/README.md) | 丢失更新、字节码证据、CPU 与 IO 的相反命运 |
| 03 | [同步原语工具箱](concurrency/03_sync_primitives/README.md) | Lock / RLock / Semaphore / Event / Condition / Barrier |
| 04 | [多线程生产者-消费者](concurrency/04_producer_consumer/README.md) | queue.Queue、毒丸关闭、maxsize 背压 |
| 05 | [multiprocessing 多核加速](concurrency/05_mp_accel/README.md) | spawn、__main__ 保护、加速比实测、map 保序 |
| 06 | [进程间通信与共享状态](concurrency/06_ipc_shared/README.md) | Pipe / Queue / SharedMemory / Manager |
| 07 | [concurrent.futures 统一执行器](concurrency/07_futures/README.md) | Executor 双后端、as_completed、异常传播 |
| 08 | [协程与事件循环](concurrency/08_coroutine_loop/README.md) | async/await 惰性、单线程交错、create_task 并发 |
| 09 | [任务编排](concurrency/09_task_orchestration/README.md) | TaskGroup 结构化并发、wait_for、gather 双策略 |
| 10 | [异步生产者-消费者与限流](concurrency/10_async_pipelines/README.md) | asyncio.Queue、Semaphore、背压对比 |
| 11 | [异步本地批量抓取器](concurrency/11_async_fetcher/README.md) | aiohttp 三件套：限流/超时/重试（离线可跑） |
| 12 | [死锁与竞态诊断工坊](concurrency/12_deadlock_workshop/README.md) | 子进程复现死锁、faulthandler 验尸、锁序修复 |
| 13 | [并发设计模式集](concurrency/13_concurrency_patterns/README.md) | 优雅关闭、令牌桶、指数退避、fan-out/fan-in |
| 14 | [四种执行模型性能对决](concurrency/14_model_benchmark/README.md) | 串行/线程/进程/协程同题基准与选型公式 |
| 15 | [🏁 可切换执行模型并发下载器](concurrency/15_downloader/README.md) | 四后端一键切换、限流重试、断点续传、SHA256 |
| 16 | [⚠️ free-threading 无 GIL 实测](concurrency/16_free_threading/README.md) | PEP 703 双构建对比：0.97× vs 3.73×（选做） |

并发系列学习路线（每站 README §8 有上下篇链接）：

1. **线程地基**（01 → 02 → 03 → 04）：线程生命周期、竞态与 GIL、同步原语、消息传递
2. **多核与执行器**（05 → 06 → 07）：多进程真并行、四条 IPC、统一执行器
3. **异步世界**（08 → 09 → 10 → 11）：事件循环、任务编排、异步流水线、真实网络
4. **诊断与架构**（12 → 13 → 14）：死锁诊断、设计模式、四模型对决
5. **毕业设计**（15 → 16 选做）：可切换执行模型下载器、free-threading 前沿实测

## 🌐 第三系列：Python Web 框架 20 站（2026-09 新增，20/20 完成）

三大框架通吃的地基层：先零依赖手写 WSGI/HTTP/会话（第一阶段），再依次进入 Flask → FastAPI → Django/DRF，收拢于三框架同题对比与容器化综合项目。
本系列主演示脚本分两类：第一阶段三站零第三方依赖；框架阶段运行于 `web/.venv`（依赖清单与 2026-09-10 实测版本见 [python_web_frameworks.md](docs/python_web_frameworks.md)）。
清单与进度见 [python_web_frameworks.md](docs/python_web_frameworks.md)。

| 编号 | 实验名 | 一句话主题 |
|:---|:---|:---|
| 01 | [WSGI 最小应用手写](web/01_wsgi_barebones/README.md) | environ / start_response / 中间件洋葱，validator 背书 |
| 02 | [HTTP 协议观察器](web/02_http_protocol/README.md) | 手搓报文、chunked 解码、keep-alive 复用实测 |
| 03 | [Cookie 与 Session 手写](web/03_cookie_session/README.md) | 服务端 session vs HMAC 签名 cookie，篡改/过期实测 |
| 04 | [Flask 最小应用与请求上下文](web/04_flask_request_context/README.md) | request/g/current_app 的上下文栈真相，钩子三路径实测 |
| 05 | [模板与表单](web/05_flask_templates_forms/README.md) | Jinja2 继承/宏/转义 + WTForms 校验 + CSRF 防线 |
| 06 | [SQLAlchemy ORM 实战](web/06_sqlalchemy_orm/README.md) | N+1 实测 21→2、session 生命周期、Alembic 加列不丢数据 |
| 07 | [蓝图与登录认证 · 书签应用](web/07_flask_auth_app/README.md) | 应用工厂 + 双蓝图 + scrypt 认证 + 限流，Flask 段收官 |
| 08 | [Pydantic 校验与自动文档](web/08_fastapi_pydantic/README.md) | 类型驱动：4 组 422 指向字段、出口闸裁剪、OpenAPI 编译 |
| 09 | [依赖注入系统](web/09_fastapi_di/README.md) | 三层 Depends 链实测顺序、yield 依赖异常不豁免、overrides 替身 |
| 10 | [async 端点与 ASGI 真相](web/10_async_asgi_truth/README.md) | 线程名实证执行位置、100 并发 0.56s vs 1.56s、4 worker PID 分发 |
| 11 | [中间件、异常与后台任务](web/11_fastapi_middleware/README.md) | 耗时头覆盖边界实测、418 兜底、后台任务时间戳证据 |
| 12 | [JWT + OAuth2 认证](web/12_fastapi_jwt_auth/README.md) | 四路 401 实测、bcrypt 无明文、FastAPI 段收官 |
| 13 | [MTV、ORM 与 admin](web/13_django_mtv_admin/README.md) | migrate 表结构 PRAGMA、ORM==SQL 对账、admin 免费后台 |
| 14 | [视图与表单](web/14_django_views_forms/README.md) | CBV 分页零重叠、FBV 对照、登录保护与 ModelForm 双闸 |
| 15 | [DRF 构建 REST API](web/15_drf_rest_api/README.md) | 读写分离序列化、403/400/201/204 全实测、@action 路由 |
| 16 | [信号、缓存与测试](web/16_django_signals_cache/README.md) | post_save 审计、二次 0 条 SQL、pytest 覆盖率 97%，Django 段收官 |
| 17 | [⛓️ 三框架同题对比](web/17_framework_showdown/README.md) | 14 条断言 ×3 全绿、1000×50 压测、代码量对比表 |
| 18 | [生产部署](web/18_production_deploy/README.md) | gunicorn 4 worker PID 实测、12-factor、Docker healthz |
| 19 | [🏁 综合项目：短链接服务](web/19_url_shortener/README.md) | 302 点击计数、200 并发码无碰撞、19 条 pytest、容器化交付 |
| 20 | [⚠️ WebSocket 实时聊天室](web/20_websocket_room/README.md) | 双客户端广播、断开减员（选做，全系列收官） |

## 学习路线

建议按四个阶段推进，每阶段内编号即推荐顺序：

1. **函数与装饰器**（01 → 02 → 15 → 04）：先拿下面试出现频率最高的装饰器与参数传递，再进入生成器协议
2. **面向对象**（03 → 05 → 07 → 09 → 10 → 13 → 12）：从属性访问底层（描述符）到类创建（元类）、方法解析（MRO）、可调用对象与对象生命周期
3. **内存与运行时**（06 → 14 → 16 → 11）：`__slots__` 内存优化、拷贝语义、垃圾回收与属性查找链
4. **并发与标准库**（08 → 18 → 19 → 20）：GIL 与三种并发模型，收尾于 typing 与函数式工具库

## 如何运行一个实验

```bash
cd interview/01_decorator_factory
python3 decorator_factory.py      # 主演示：分步打印 demo 输出（零第三方依赖）
open images/decorator_factory.html   # 交互示意图（浏览器打开；Linux 用 xdg-open）
```

主演示脚本从任意 cwd 调用都正确。每个实验的 README §3「快速开始」里有真实输出示例与"诚实预期"——哪些现象在本机稳定复现、哪些数值波动属正常；§2 有内嵌架构图与交互版链接。
