# 09 · 依赖注入系统：Depends 链、yield 依赖与测试替身

> handler 拿到的参数都是"数据"；真实业务还需要"资源"——数据库连接、配置、
> 当前用户。FastAPI 的答案是 Depends：**依赖自己也能 Depends 别的**（配置 → 会话 →
> 用户，深度优先求解）、**yield 依赖把 setup/teardown 写在同一个函数里且异常不豁免**、
> **dependency_overrides 一行换掉真依赖**。本实验给三种玩法全部配上调用计数与顺序断言。

## Background

这节回答两个问题：依赖注入（Dependency Injection，简称 DI）出现之前，Web 代码怎么获取资源，痛点在哪。

没有 DI 的写法是"各自取用"：每个 handler 自己 `connect_db()`，或者从某个模块顶层 import 一份全局 engine、一份全局配置。资源在函数体内部创建，用完就地关闭（或者忘了关）。

三堵墙随之出现：想写业务测试，全局 import 把真数据库焊死在代码里，替无可替；handler 中途抛异常，"就地关闭"的清理代码被跳过，连接就这么泄漏；配置→会话→用户这类取用顺序全靠口口相传，没人能断言它。

DI 把方向反过来：资源需求声明在函数签名上，由框架负责求解、传参和清理。这个模式经 Spring 等企业框架普及，FastAPI 把它做进了类型注解——依赖就是一个普通函数，`Depends` 写在参数上。声明之后，求解顺序、清理时机、测试替换都变成框架保证、可以断言的行为。

## What

这节定义 FastAPI 的依赖注入、一个心智模型，以及它真正保证的三件事。

FastAPI 的依赖是声明在路由参数上的普通函数：`Depends(dep)` 告诉框架"这个参数要先调用 dep 求解"。handler（处理一个请求的路由函数）因此只拿现成的资源。它的价值不是"省几行代码"，而是三件可验证的事：

- **解析顺序确定**——依赖树深度优先求解，谁先谁后有答案（实测顺序与声明一致，不是玄学）
- **资源清理有保证**——yield 依赖的 teardown（资源释放阶段）是 finally 语义，handler 抛 HTTPException 也实测到达，连接不泄漏
- **测试可替换**——真 DB 依赖被 override 后调用计数为 0，业务测试零改代码

一句话心智模型：**handler 是依赖树的根，FastAPI 自底向上逐层求解——最里层的叶子最先执行；请求结束沿树收尾，yield 依赖的 teardown 必到**。

可以把依赖树想象成装修水电：墙上每个插座（handler 参数）背后都预埋了管线（依赖链），电工按"最里端的接口先接"的顺序施工，验收时逐段通电测试（计数断言）。但和家装不同的是，这套管线每来一位客人（每个请求）都重新铺一遍、走时原样拆走——请求级生命周期是它的默认语义。

| 机制 | 在本实验中的形态 | 验收方式 |
|---|---|---|
| 依赖链深度优先 | settings → session → user → handler | LOG 顺序断言 |
| yield 依赖 | conn 的 setup/teardown 同函数 | 抛 418 后 teardown 照样执行 |
| 请求级缓存 | 同一依赖三处引用 | 默认执行 1 次；`use_cache=False` 执行 2 次 |
| dependency_overrides | fake-db 替换 real-db | 真依赖调用计数为 0 |

## When to Use

这节给判断力：什么场合值得把资源交给依赖注入，哪些场合不必。

典型场景：

- 在做需要真实资源（数据库连接、配置、当前登录用户）的 API 时——资源声明进签名，handler 只写业务
- 在做要认真写测试的项目时——conftest（pytest 约定的测试共享配置文件，放在里面的 fixture（测试前置装置）对整个测试目录生效）里一行 override 真依赖，业务测试零改代码
- 在做横切校验（API Key、限流、请求打点）时——全局依赖一处挂载，所有路由生效

何时不用：

- 没有资源的静态接口或原型：几个纯数据参数的 handler，`Depends` 只添层级
- 一次性脚本：没有测试与复用诉求时，直接调用函数更直接
- 需要改写响应体的逻辑（如统一包装、压缩）：那是中间件的职责，依赖拿不到响应对象

同类方案对比：

| 方案 | 与 Depends 的差异 | 什么时候选它 |
|---|---|---|
| 模块顶层全局 import | 零框架依赖，但测试焊死、清理散落 | 无测试诉求的小工具 |
| 中间件 | 包住整个请求/响应周期，能改响应、看不到路由参数 | 打点、改响应头 |
| pytest fixture | 只在测试内替换，运行时无效 | 纯测试侧的前置装置 |
| 类式 `__enter__/__exit__` 上下文管理器 | 同样的 setup/teardown 语义，但要写一个类 | 非 FastAPI 场景的资源管理 |

## Quick Start

这节把演示跑起来：一条命令、一段真实输出、三条诚实预期，最后看依赖怎么声明。

三件事本实验各有一条计数/顺序断言，不靠"应该没问题"。

### 运行与真实输出

```bash
cd web/09_fastapi_di
source ../.venv/bin/activate
python3 fastapi_di.py    # 完整演示（4 个小节，内置验收断言）
```

真实输出节选（FastAPI 0.141.1）：

```
========================================================
[1. 三层嵌套链：settings → session → user（深度优先）]
========================================================
  执行顺序: ['settings', 'session', 'user', 'handler']
  深度优先：handler 的依赖 user 要先拿到 session，session 又要先拿到 settings
  心智模型：依赖树自底向上求解——最里层的叶子最先执行

========================================================
[2. yield 依赖：setup → handler → teardown（异常也不豁免）]
========================================================
  正常请求: ['conn:setup', 'conn:teardown']（handler 返回后 teardown 立即执行，连接关闭）
  端点抛 418: ['conn:setup', 'conn:teardown']——teardown 照样执行（finally 语义），资源不泄漏
  这就是'yield 依赖管连接'的底气：不管 handler 成败，teardown 必到

========================================================
[3. 请求级缓存：三处引用只执行一次，use_cache=False 可关]
========================================================
  /cached 三处引用 → 执行 1 次，结果相同（请求级缓存默认开）
  /uncached use_cache=False → 执行 2 次，结果不同
  注意缓存的边界是'单个请求'：跨请求必然重新执行——它防的是请求内重复求值

========================================================
[4. dependency_overrides：测试替身上岗，真依赖零调用]
========================================================
  替身生效: 响应来自 fake-db；真依赖调用 0 次、假依赖 1 次
  overrides.clear() 后: 响应回到 real-db，真依赖恢复调用
  模式：conftest 里 app.dependency_overrides[get_db] = fake_db，业务测试零改代码

  全局依赖计数 = 7（与本实验发出的 7 个请求一一对应）
```

诚实预期：

- **yield 依赖的 teardown 实际发生在响应生成之后**（本版本 FastAPI 行为）：TestClient 下两者在一次请求内完成，顺序断言不受影响；对"流式响应时 teardown 在发完后才跑"这类细节，升级版本后重跑本脚本即知
- **全局依赖对每个请求执行一次**：本实验用计数依赖验证（7 请求 = 7 次执行）；真实场景它是 API Key/限流检查的挂载点
- **`Depends(lambda: ...)` 能用但不推荐**：lambda 无法被 OpenAPI 记录为具名依赖，正式代码用具名函数

### 依赖怎么声明

```python
def dep_session(settings: Annotated[dict, Depends(dep_settings)]) -> dict:
    return {"conn": f"conn({settings['db_url']})"}   # 依赖自己也能 Depends 别的

def dep_conn() -> dict:
    conn = {"open": True}
    try:
        yield conn            # yield 之前是 setup，之后是 teardown
    finally:
        conn["open"] = False  # 端点抛 HTTPException 也必到——finally 语义
```

这段在做什么：`Annotated[dict, Depends(dep_settings)]` 声明"本依赖要先求解 dep_settings"；yield 依赖把资源的建立与清理写进同一个生成器函数，框架负责在请求结束时驱动 teardown。

## How It Works

这节沿请求生命周期拆机制：依赖树怎么求解、yield 依赖怎么清理、缓存与替身怎么工作，并与 Quick Start 的输出互相印证。

### 依赖树与深度优先求解

`dep_current_user` 依赖 `dep_session`，后者又依赖 `dep_settings`——FastAPI 沿依赖边递归求解，**子依赖先于父依赖执行**。

输出 [1] 的实测顺序 `[settings, session, user, handler]`：求解是自底向上的。这意味着链上每一层都能安全使用下一层的产物（session 拿到 settings 的 db_url）。

### yield 依赖：setup 与 teardown 同函数

`yield` 之前是 setup、之后是 teardown，`finally` 保证清理必执行。这是数据库连接、临时文件、事务边界的标准姿势——资源生命周期与请求生命周期严格对齐。

且**端点抛 HTTPException 时 teardown 实测照样到达**（输出 [2] 两行 LOG 完全一致）。同类的另一种写法是类式的 `__enter__/__exit__`（lab 04 的 Flask 世界）——FastAPI 用生成器把它做成了函数。

### teardown 断言为什么看 LOG 而不看响应

```python
LOG.clear()
r = client.get("/boom")                      # 端点抛 418
assert LOG == ["conn:setup", "conn:teardown"]  # teardown 照样到达
```

teardown 的执行在响应之外，响应体里看不到它；只有把 `LOG.append` 埋进依赖内部，才能证明"异常路径清理必到"。这也是测试异步资源释放的通用思路——**在资源对象里留痕，在断言里查痕**。

### 请求级缓存：use_cache

同一请求内多处引用同一依赖（路由依赖 + 参数依赖），默认**只执行一次、共享同一返回值**——输出 [3] 里三处引用只执行 1 次。`use_cache=False` 强制独立求值——适合"每次调用都要新鲜值"的场景（时间戳、一次性 nonce）。缓存的边界是单个请求：跨请求必然重新执行。

### dependency_overrides：测试的官方后门

`app.dependency_overrides[真依赖] = 假依赖` 后，所有引用点静默换将——输出 [4] 实测响应来自 fake-db 且真依赖调用计数为 0；`clear()` 即拆。

与 pytest 的 fixture（测试前置装置）组合是标准姿势：conftest 里统一 override `get_db`，业务测试不感知真库的存在。

### 全局依赖

`FastAPI(dependencies=[Depends(dep_global)])` 让依赖对所有路由生效（无返回值用途，纯副作用/校验）——API Key 校验、请求打点、限流计数的挂载点。本实验用它验证了"7 个请求 7 次执行"的计数语义（输出末行的"全局依赖计数 = 7"）。

## Pitfalls & Q&A

这节先列四个真实踩过的坑（现象、原因、解法），再补两个有增量的深入问题。

踩坑清单：

- **在 yield 依赖的 teardown 里抛异常**：会覆盖 handler 的正常响应（500）；teardown 里只做清理，业务异常在 setup 阶段或 handler 里抛
- **以为依赖每次引用都重新执行**：同请求内默认共享同一返回值（缓存）；依赖返回可变对象且被 handler 修改时，其他引用点会看到修改——要么返回不可变值，要么显式 `use_cache=False`
- **override 后忘了 clear**：替身泄漏到别的测试用例，症状是"真数据怎么不对了"；fixture 里用 yield，测试结束自动 `dependency_overrides.clear()`
- **全局依赖里写重逻辑**：它对每个请求生效（含 /docs 的资源请求），放慢它 = 放慢整个服务

**Q1: 依赖注入比直接 import 全局配置好在哪？**
可替换（测试替身）、可组合（依赖树复用）、生命周期受控（yield 绑定请求）。

全局 import 在多应用实例（工厂模式，见 lab 07）下直接失效——DI 的解析按当前 app 自己的依赖容器走（每个 FastAPI 实例独立保存一份"依赖→本次求值结果"的注册表），全局 import 的单例绕开了这套解析，多实例下直接失效。

**Q2: 全局依赖与中间件的区别？**
中间件包住整个请求/响应周期（能改响应、看不到路由参数）；全局依赖在路由解析阶段执行（能复用依赖树、能返回 4xx 拦截，但拿不到响应对象）。鉴权用依赖（可声明在路由级/全局），打点改响应用中间件（见 lab 11）。
