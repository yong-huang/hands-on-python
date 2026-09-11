# 04 · Flask 最小应用与请求上下文：request 的魔法与真相

> 「Python Web 框架」进入框架时代。项目 1 里 environ 靠参数层层传递；Flask 把它变成
> 了"魔法全局变量" `request`——裸线程里摸一下直接 `RuntimeError: Working outside of
> request context`。本实验拆开这个魔法：**上下文栈 + LocalProxy**。顺带把钩子流水线
> （before / after / teardown）按三条路径实测——包括一个反直觉的真相：
> 注册了 errorhandler 的异常，teardown 拿到的 `exc` 竟是 `None`。

## 1. 为什么需要它

`request` 是 Flask 面试的第一高频考点，但背"线程隔离"四个字答不了追问：**隔离的单位是什么**（线程？还是上下文栈？）、**为什么裸线程拿不到主线程的 request**（栈是线程本地的）、**`g` 和全局变量差在哪**（请求级生命周期 + 线程隔离）。另一个实践重灾区是钩子：`after_request` 在异常时到底执不执行？`teardown_request` 的 `exc` 什么时候是 None？本实验全部用 test_client 实测断言，结论直接来自 Flask 3.1 源码行为，不是教程传说。

## 2. 总览：核心机制一图看懂

![一次请求在 Flask 上下文栈里的旅程](images/flask_request_context.svg)

一句话心智模型：**wsgi_app 压入上下文栈 → request/g/current_app 三个 LocalProxy 才"通电"，指向当前线程的栈顶上下文；请求结束弹栈，三者集体断电**。看图主路径是 before → 视图 → after → teardown 的流水线（before 写 `g.t0`、视图读，g 在钩子与视图之间当笔记本）；下方两条拒绝路径分别是"栈外裸调"与"无人兜底的异常"。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/04_flask_request_context/images/flask_request_context.html)
> （或本地打开 [`images/flask_request_context.html`](images/flask_request_context.html)）。

## 3. 快速开始

```bash
cd web/04_flask_request_context
source ../.venv/bin/activate        # 本系列框架阶段的公共环境（见 python_web_frameworks.md）
python3 flask_request_context.py    # 完整演示（4 个小节，内置验收断言）
```

真实输出节选（macOS, CPython 3.14 · Flask 3.1.3）：

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

========================================================
[4. 钩子流水线：before → 视图 → after → teardown（三条路径实测）]
========================================================
  正常请求            : 200 · ['before', 'after', 'teardown(None)']
  视图抛 ValueError   : 418（errorhandler 兜底）· ['before', 'after', 'teardown(None)']
    ↳ 异常在 full_dispatch_request 内部就被 handler 处理掉：teardown 拿到 exc=None
  视图抛 RuntimeError : 500（无人兜底）· ['before', 'after', 'teardown(RuntimeError)']
    ↳ teardown 一定执行，且 exc 参数带回异常对象；客户端只看到 500

========================================================
全部断言通过 ✓ 路由/404/errorhandler、上下文边界 RuntimeError、g 线程隔离、钩子顺序
```

诚实预期：

- **`elapsed_ms` 每次都是 0.0 左右**：test_client 进程内直调，没有网络往返；换真实部署数值才 meaningful
- **裸调报错信息被截断到 44 字符**：完整文案是两行（"A request context was pushed. This has to be done..."），README 只截了首句
- **§4 的三条路径结论来自 Flask 3.1 实测**：`after_request` 在异常路径是否执行、`exc` 何时非 None，这类行为跨大版本可能微调——升级 Flask 后重跑本脚本即知

## 4. 核心概念

### 4.1 上下文栈：request 的供电系统

Flask 有两种上下文：**应用上下文**（承载 `current_app`、`g`）与**请求上下文**（承载 `request`、`session`，且依赖应用上下文存在）。`wsgi_app` 每来一个请求就 push 一对，处理完 pop——`request` 这些"全局变量"其实是 LocalProxy，把属性访问转发给**当前线程栈顶**的上下文。栈空了（或不在请求里）就去 `RuntimeError`。这就是为什么 `with app.test_request_context(...)` 能在无服务的测试代码里让 request 复活：手动 push 而已。

### 4.2 LocalProxy：线程隔离的真章

`g` 的隔离实验：两个交叠线程各自 `with app.app_context()` 写 `g.value` 再读回——值互不串。因为每个线程有**自己的栈**，LocalProxy 按线程找到各自的栈顶。对比项目 1：手写 WSGI 靠参数传 environ，Flask 用"线程隔离的代理"把它变成看似全局的东西——代价是出了栈就断电，收益是任何一层函数都能直接用 `request`，签名不再被污染。

### 4.3 钩子流水线与 g 的本职工作

`before_request` 里 `g.t0 = perf_counter()`，视图里读——**g 是钩子与视图之间的请求级笔记本**（数据库连接、鉴权结果都这么挂）。执行顺序三条路径实测：正常 `before → after → teardown(None)`；有 errorhandler 兜底的异常同样是这三步（418 响应）；无人兜底的异常 teardown 换成 `teardown(RuntimeError)`（500 响应）。

### 4.4 teardown 的 exc 参数：什么时候是 None

实测发现（也是本实验最有价值的反直觉点）：**被 errorhandler 处理过的异常属于"已处理"**——它在 `full_dispatch_request` 内部就被转换成了错误响应，`wsgi_app` 的 finally 里 `error=None`，teardown 拿到 None。只有**无人兜底**、一路逃逸到 `wsgi_app` 的异常才会作为 `exc` 交给 teardown。所以"teardown 里记日志"不能依赖 exc 判断请求成败——errorhandler 兜底的失败在它眼里是正常请求。

## 5. 关键代码解析

**为什么隔离实验要 `time.sleep(0.05)`？**

```python
def g_worker(tag: str) -> None:
    with app.app_context():
        g.value = f"{tag}-data"
        time.sleep(0.05)   # 强制交叠：A 写完还没读，B 已经开始写
        THREAD_RESULTS[tag] = g.value
```

没有 sleep，两个线程可能先后完整跑完——"没串"就不能证明"隔离"，只能证明"没碰上"。sleep 把读写窗口撑开，让两个上下文在栈里真实共存，断言才有说服力。

坑清单：

- **以为 `teardown_request` 的 exc 一定带异常**：errorhandler 兜底的异常拿不到（实测 §4）；清理逻辑要无条件执行，别把 exc 当"是否失败"的判据
- **在裸线程/定时任务里用 request 或 g**：RuntimeError 是常态；后台任务要 g 就自己 `with app.app_context()`，要请求就构造 test_request_context
- **用全局 dict 代替 g**：多线程下直接串数据（本实验 §3 就是复现器）；g 的请求级生命周期 + 线程隔离正是为此存在
- **`flask.__version__`**：3.1 起移除，取版本用 `importlib.metadata.version("flask")`——脚本 main 里的真实坑

## 6. 文件结构

```
04_flask_request_context/
├── README.md                              # 本教程文档
├── flask_request_context.py               # 主演示脚本：路由/边界/隔离/钩子四节实测
└── images/
    ├── flask_request_context.json         # 图源（typed JSON IR，可编辑重渲染）
    ├── flask_request_context.html         # 交互示意图（浏览器打开）
    └── flask_request_context.svg          # 双主题矢量图（本 README §2 内嵌）
```

`flask_request_context.py` 内容：路由与 errorhandler（`/user/<name>`、`/whoami` 读 request+g、`/boom` 有兜底、`/crash` 无兜底）/ 三个钩子写 EVENTS / `demo_routing()` test_client 断言 / `demo_context_boundary()` 上下文边界三连 / `demo_g_isolation()` 交叠线程隔离 / `demo_hooks()` 三条路径顺序断言。环境：`web/.venv`（Flask 3.1.3，见 `../requirements.txt`）。

## 7. 深入要点

**Q1: Flask 的 request 为什么不需要传参就能用？它是全局变量吗？**
不是真全局。它是 LocalProxy，把属性访问转发给"当前线程上下文栈顶"的 Request 对象；请求上下文由 wsgi_app 在处理请求前压栈。所以任何一层函数都能直接访问 request，且线程之间互不干扰。

**Q2: 应用上下文和请求上下文的关系？**
请求上下文依赖应用上下文：push 请求上下文时会自动确保应用上下文在栈里。`current_app`/`g` 属于应用上下文（脱离请求也能用，如离线脚本/worker），`request`/`session` 属于请求上下文。

**Q3: before/after/teardown 三个钩子的执行保证有什么区别？**
before 在视图前必执行；after 在能产出响应时执行（实测 errorhandler 兜底与 500 路径都会走）；teardown 以 finally 语义必执行，exc 参数只在异常无人兜底、逃逸到 wsgi_app 时才非 None（被 errorhandler 处理的异常它看不到）。

**Q4: g 和全局变量、threading.local 的区别？**
全局变量跨请求共享且线程不安全；threading.local 生命周期挂在线程上；g 挂在应用上下文上——请求结束即回收，且一个线程内串行处理多个请求时各自隔离。测试里也要 `with app.app_context()` 才能摸 g。

**Q5: 多个 Flask 应用共存于一个进程（app1/app2）时 current_app 指向谁？**
指向当前上下文栈顶绑定的那个应用——这正是 current_app 存在的理由：`create_app()` 工厂模式下，扩展代码不能引用模块级 app 变量，必须通过 current_app 拿"当前正在服务"的应用。

## 8. 总结

1. **request 是 LocalProxy 不是全局变量**：指向当前线程上下文栈顶，出栈即 RuntimeError
2. **隔离的单位是上下文栈**：栈线程本地，两个交叠线程各写各的 g 实测互不串
3. **g = 请求级笔记本**：before 写、视图读，替代危险的全局 dict；离开 app 上下文不可用
4. **钩子三保证**（实测）：before 必执行；after 有响应就执行；teardown 必执行但被 handler 兜底的异常 exc=None
5. Flask 的"魔法" = 项目 1 的 environ（01）+ 项目 3 的状态携带思想，换了一层线程隔离的壳

下一篇进入 [05 · 模板与表单](../05_flask_templates_forms/README.md)：Jinja2 模板继承、WTForms 校验与 CSRF——服务端渲染时代的输入防线。
