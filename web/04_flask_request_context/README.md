# 04 · Flask 最小应用与请求上下文：request 的魔法与真相

> 手写 WSGI 时 environ 靠参数层层传递；Flask 把它变成了"魔法全局变量"
> `request`——裸线程里摸一下直接 `RuntimeError: Working outside of request context`。
> 本实验拆开这个魔法：**上下文栈 + LocalProxy**。顺带把钩子流水线
> （before / after / teardown）按三条路径实测——包括一个反直觉的真相：
> 注册了 errorhandler 的异常，teardown 拿到的 `exc` 竟是 `None`。

## Background

这节讲"request 看似全局变量"这个设计从哪来：参数传递时代的做法、它在哪里撞墙、上下文代理如何应运而生。

把请求包装成全局可用对象之前，WSGI 应用的请求信息（environ）靠参数层层传递：视图要用，就得让调用链上每一层函数的签名都带上它。痛点随之而来：中间层函数被迫接收并转发一个自己根本不用的参数；测试要手动把 environ 一路传到位；想在任意一层"顺手读一个请求头"，就得改整条调用链。

Flask（2010 年发布，构建在 Werkzeug 之上——后者是它依赖的 WSGI 工具库）的解法是上下文加代理：请求进来时把"当前请求"压进一个线程本地的栈，再暴露一个名为 `request` 的代理——写起来像全局变量，读的时候却按线程各拿各的。魔法与真相的分界，就是本实验要拆开的东西。

## What

这节回答三个问题：`request` 的隔离单位是什么、裸线程为什么摸不到它、`g` 和全局变量差在哪。

Flask 的请求上下文（context——"当前正在处理哪个请求"的一组环境对象）机制，把请求信息暴露成三个看似全局的代理：`request`（请求信息）、`g`（请求级暂存）、`current_app`（当前应用）。它们都是 LocalProxy（属性转发代理——每次属性访问都被转发给当前线程栈顶的真实对象）。

三个背"线程隔离"四个字答不了的追问：

- 隔离的单位是什么——线程？还是上下文栈？
- 为什么裸线程拿不到主线程的 request——栈是线程本地的
- `g` 和全局变量差在哪——请求级生命周期 + 线程隔离

一句话心智模型：**wsgi_app（Flask 的 WSGI 入口）压入上下文栈 → request/g/current_app 三个 LocalProxy 才"通电"，指向当前线程的栈顶上下文；请求结束弹栈，三者集体断电**。

可以把 LocalProxy 想象成接在插座上的电器：栈顶有上下文就是通电，弹栈就是断电报 `RuntimeError`。但和家电不同的是，"电"按线程分开供应——A 线程有电不代表 B 线程有电。

## When to Use

这节讲请求上下文与 `g` 适配什么场景，以及什么时候不该碰它们。

典型场景：

- 在钩子与视图之间传递请求级数据的时候（计时起点、鉴权结果、数据库连接）——挂到 `g` 上
- 在写测试的时候：`test_client` 模拟完整请求；`test_request_context` 让 `request` 在没有服务的代码里复活
- 在写后台任务、定时任务的时候：那里没有请求，要用 `g` 得自己 `with app.app_context()`

何时不用：极简到不需要路由与钩子的服务，直接手写 WSGI 更合适；后台逻辑里把 `request` 当全局变量随手用是错误用法（见踩坑第二条）。

同类方案对比（详细语义差异见文末 Q2）：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| `g` | 请求级生命周期 + 线程隔离 | 钩子与视图间传请求级数据 |
| 模块级全局变量 | 跨请求共享、线程不安全 | 只读的配置常量 |
| `threading.local` | 生命周期挂在线程上 | 与请求无关的线程内状态 |
| 显式参数传递 | 无魔法，但签名被污染 | 库代码、强调可测试性的路径 |

## Quick Start

这节实测四件事：上下文边界、`g` 的线程隔离、钩子三条路径，以及全部验收断言。

前置条件：依赖 Flask，使用框架阶段的公共虚拟环境。

```bash
cd web/04_flask_request_context
source ../.venv/bin/activate        # 本系列框架阶段的公共环境（见 docs/python_web_frameworks.md）
python3 flask_request_context.py    # 完整演示（4 个小节，内置验收断言）
```

真实输出节选：

```
========================================================
[2. 上下文边界：request / current_app 出栈即失效]
========================================================
  裸线程直接调 → RuntimeError: Working outside of request context.
  with test_request_context('/whoami?name=bob') → request 复活，出 with 即失效
  只有 app 上下文时: current_app.name='flask_request_context' 可用，request 仍 RuntimeError
  子线程调用 → RuntimeError：上下文栈是线程本地的，不跨线程共享

========================================================
[3. LocalProxy 线程隔离：g 在两个交叠线程里互不串]
========================================================
  线程 A 与 B 交叠读写 g.value → {'A': 'A-data', 'B': 'B-data'}
  request/g 不是真全局变量，是 LocalProxy——指向'当前线程栈顶上下文'的属性转发器
  对比项目 1 的手写 WSGI：当时 environ 靠参数传递，Flask 用线程隔离代理把它变成了'魔法全局'

========================================================
[4. 钩子流水线：before → 视图 → after → teardown（三条路径实测）]
========================================================
  正常请求            : 200 · ['before', 'after', 'teardown(None)']
  视图抛 ValueError   : 418（errorhandler 兜底）· ['before', 'after', 'teardown(None)']
    ↳ 异常在 full_dispatch_request 内部就被 handler 处理掉：teardown 拿到 exc=None
  视图抛 RuntimeError : 500（无人兜底）· ['before', 'after', 'teardown(RuntimeError)']
    ↳ teardown 一定执行，且 exc 参数带回异常对象；客户端只看到 500
  实测结论：teardown 是 finally 语义'必执行'（是否带 exc 取决于有无 handler 兜底）；
  after 两条异常路径也都执行了；真正不保证的是视图内 raise 之后的剩余代码

========================================================
全部断言通过 ✓ 路由/404/errorhandler、上下文边界 RuntimeError、g 线程隔离、钩子顺序
```

诚实预期：

- **`elapsed_ms` 每次都是 0.0 左右**：test_client 进程内直调，没有网络往返；换真实部署数值才 meaningful
- **裸调报错信息被截断到 44 字符**：完整文案以空行分段，首句为 "Working outside of request context."，后续以 "This typically means that you attempted..." 开头，README 只截了首句
- **§4 的三条路径结论来自 Flask 3.1 实测**：`after_request` 在异常路径是否执行、`exc` 何时非 None，这类行为跨大版本可能微调——升级 Flask 后重跑本脚本即知

本实验用到的 Flask 测试设施速览：

| 工具 | 作用 |
|---|---|
| `app.test_client()` | 测试客户端，不出网络、进程内直调 WSGI 层模拟请求 |
| `app.test_request_context()` | 手动 push 请求上下文，让 `request` 在无服务代码里可用 |
| `app.app_context()` | 只 push 应用上下文，供离线脚本/worker 使用 `g`、`current_app` |

## How It Works

这节拆开输出里的每个现象：上下文栈怎么供电、钩子按什么顺序跑、线程隔离靠什么、teardown 的 `exc` 何时为 `None`。

### 上下文栈：request 的供电系统

Flask 有两种上下文：**应用上下文**（承载 `current_app`、`g`）与**请求上下文**（承载 `request`、`session`，且依赖应用上下文存在——push 请求上下文时会自动确保应用上下文在栈里）。

`wsgi_app` 每来一个请求就 push 一对，处理完 pop——`request` 这些"全局变量"其实是 LocalProxy，把属性访问转发给**当前线程栈顶**的上下文，栈空了就去 `RuntimeError`。

输出 §2 的四行现象（裸调报错、with 内复活、只有 app 上下文时 `current_app` 可用、子线程报错）就是这套 push/pop 的边界表现。这也是 `with app.test_request_context(...)` 能让 request 在无服务代码里复活的原因：手动 push 而已。

### 钩子流水线与 g 的本职工作

钩子（hook——框架在请求生命周期的固定时点回调的函数）按 `before_request → 视图 → after_request → teardown_request` 顺序执行。

`before_request` 里 `g.t0 = perf_counter()`，视图里读——**g 是钩子与视图之间的请求级笔记本**（数据库连接、鉴权结果都这么挂）。

输出 §4 三条路径实测：正常 `before → after → teardown(None)`；有 errorhandler（异常兜底处理器）兜底的异常同样是这三步（418 响应）；无人兜底的异常 teardown 换成 `teardown(RuntimeError)`（500 响应）。

### LocalProxy：线程隔离的真章

`g` 的隔离实验：两个交叠线程各自 `with app.app_context()` 写 `g.value` 再读回——值互不串，输出 §3 的 `{'A': 'A-data', 'B': 'B-data'}` 就是证据。原因是每个线程有**自己的栈**，LocalProxy 按线程找到各自的栈顶。

对比手写 WSGI（见 [lab 01](../01_wsgi_barebones/README.md)）：那里靠参数传 environ，Flask 用"线程隔离的代理"把它变成看似全局的东西——代价是出了栈就断电，收益是任何一层函数都能直接用 `request`，签名不再被污染。

### teardown 的 exc 参数：什么时候是 None

实测发现（也是本实验最有价值的反直觉点）：**被 errorhandler 处理过的异常属于"已处理"**——它在 `full_dispatch_request` 内部就被转换成了错误响应，`wsgi_app` 的 finally 里 `error=None`，teardown 拿到 None。

只有**无人兜底**、一路逃逸到 `wsgi_app` 的异常才会作为 `exc` 交给 teardown。输出 §4 第二行 `teardown(None)` 与第三行 `teardown(RuntimeError)` 的对照就是这件事。

所以"teardown 里记日志"不能依赖 exc 判断请求成败——errorhandler 兜底的失败在它眼里是正常请求。

### 为什么隔离实验要 time.sleep(0.05)

```python
def g_worker(tag: str) -> None:
    with app.app_context():
        g.value = f"{tag}-data"
        time.sleep(0.05)   # 强制交叠：A 写完还没读，B 已经开始写
        THREAD_RESULTS[tag] = g.value
```

没有 sleep，两个线程可能先后完整跑完——"没串"就不能证明"隔离"，只能证明"没碰上"。sleep 把读写窗口撑开，让两个上下文在栈里真实共存，断言才有说服力。

## Pitfalls & Q&A

这节收录四个真实踩过的坑（现象 + 原因 + 解法）与两个深入问题。

- **以为 `teardown_request` 的 exc 一定带异常**：现象是 errorhandler 兜底时拿到 `None`（实测）。原因是已处理异常在 `full_dispatch_request` 内部就被转换成响应。解法是清理逻辑无条件执行，别把 exc 当"是否失败"的判据
- **在裸线程/定时任务里用 request 或 g**：现象是 `RuntimeError` 成为常态。原因是上下文栈线程本地，后台任务没人 push。解法是要 g 就自己 `with app.app_context()`，要请求就构造 test_request_context
- **用全局 dict 代替 g**：现象是多线程下数据直接互串（隔离实验就是复现器）。原因是全局 dict 没有请求级生命周期与线程隔离。解法是用 g——它正是为此存在
- **`flask.__version__`**：现象是 3.1 起访问它直接报错。原因是该属性已移除。解法是取版本用 `importlib.metadata.version("flask")`——脚本 main 里的真实坑

**Q1：应用上下文和请求上下文的关系？**

已在 How It Works 的上下文栈一节回答：请求上下文依赖应用上下文，push 时自动确保后者在栈里。

**Q2：g 和全局变量、threading.local 的区别？**

全局变量跨请求共享且线程不安全；threading.local 生命周期挂在线程上；g 挂在应用上下文上——请求结束即回收，且一个线程内串行处理多个请求时各自隔离。

测试里也要 `with app.app_context()` 才能摸 g。

**Q3：多个 Flask 应用共存于一个进程（app1/app2）时 current_app 指向谁？**

指向当前上下文栈顶绑定的那个应用——这正是 current_app 存在的理由：`create_app()` 工厂模式下，扩展代码不能引用模块级 app 变量，必须通过 current_app 拿"当前正在服务"的应用。
