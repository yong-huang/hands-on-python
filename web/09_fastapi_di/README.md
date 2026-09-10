# 09 · 依赖注入系统：Depends 链、yield 依赖与测试替身

> 项目 8 里 handler 拿到的参数都是"数据"；真实业务还需要"资源"——数据库连接、配置、
> 当前用户。FastAPI 的答案是 Depends：**依赖自己也能 Depends 别的**（配置 → 会话 →
> 用户，深度优先求解）、**yield 依赖把 setup/teardown 写在同一个函数里且异常不豁免**、
> **dependency_overrides 一行换掉真依赖**。本实验给三种玩法全部配上调用计数与顺序断言。

## 1. 为什么需要它

依赖注入的价值不是"省几行代码"，而是三件可验证的事：**解析顺序确定**——依赖树深度优先求解，谁先谁后有答案（实测顺序与声明一致，不是玄学）；**资源清理有保证**——yield 依赖的 teardown 是 finally 语义，handler 抛 HTTPException 也实测到达，连接不泄漏；**测试可替换**——真 DB 依赖被 override 后调用计数为 0，业务测试零改代码。三件事本实验各有一条计数/顺序断言，不靠"应该没问题"。

## 2. 总览：核心机制一图看懂

![依赖注入：深度优先求解与必执行的 teardown](images/fastapi_di.svg)

一句话心智模型：**handler 是依赖树的根，FastAPI 自底向上逐层求解——最里层的叶子最先执行；请求结束沿树收尾，yield 依赖的 teardown 必到**。看图主链是 settings → session → user → handler 的实测顺序；拒绝路径上"handler 抛 418"时 teardown 照样执行，替身节点则演示 override 的测试用法。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/09_fastapi_di/images/fastapi_di.html)
> （或本地打开 [`images/fastapi_di.html`](images/fastapi_di.html)）。

## 3. 快速开始

```bash
cd web/09_fastapi_di
source ../.venv/bin/activate
python3 fastapi_di.py    # 完整演示（4 个小节，内置验收断言）
```

真实输出节选（macOS, CPython 3.14 · FastAPI 0.141.1）：

```
========================================================
[1. 三层嵌套链：settings → session → user（深度优先）]
========================================================
  执行顺序: ['settings', 'session', 'user', 'handler']
  深度优先：handler 的依赖 user 要先拿到 session，session 又要先拿到 settings

========================================================
[2. yield 依赖：setup → handler → teardown（异常也不豁免）]
========================================================
  正常请求: ['conn:setup', 'conn:teardown']（handler 返回后 teardown 立即执行，连接关闭）
  端点抛 418: ['conn:setup', 'conn:teardown']——teardown 照样执行（finally 语义），资源不泄漏

========================================================
[3. 请求级缓存：三处引用只执行一次，use_cache=False 可关]
========================================================
  /cached 三处引用 → 执行 1 次，结果相同（请求级缓存默认开）
  /uncached use_cache=False → 执行 2 次，结果不同

========================================================
[4. dependency_overrides：测试替身上岗，真依赖零调用]
========================================================
  替身生效: 响应来自 fake-db；真依赖调用 0 次、假依赖 1 次
  overrides.clear() 后: 响应回到 real-db，真依赖恢复调用

  全局依赖计数 = 7（与本实验发出的 7 个请求一一对应）
```

诚实预期：

- **yield 依赖的 teardown 实际发生在响应生成之后**（本版本 FastAPI 行为）：TestClient 下两者在一次请求内完成，顺序断言不受影响；对"流式响应时 teardown 在发完后才跑"这类细节，升级版本后重跑本脚本即知
- **全局依赖对每个请求执行一次**：本实验用计数依赖验证（7 请求 = 7 次执行）；真实场景它是 API Key/限流检查的挂载点
- **`Depends(lambda: ...)` 能用但不推荐**：lambda 无法被 OpenAPI 记录为具名依赖，正式代码用具名函数

## 4. 核心概念

### 4.1 依赖树与深度优先求解

`dep_current_user` 依赖 `dep_session`，后者又依赖 `dep_settings`——FastAPI 沿依赖边递归求解，**子依赖先于父依赖执行**。实测顺序 `[settings, session, user, handler]`：求解是自底向上的。这意味着链上每一层都能安全使用下一层的产物（session 拿到 settings 的 db_url）。

### 4.2 yield 依赖：setup 与 teardown 同函数

`yield` 之前是 setup、之后是 teardown，`finally` 保证清理必执行。这是数据库连接、临时文件、事务边界的标准姿势——资源生命周期与请求生命周期严格对齐，且**端点抛 HTTPException 时 teardown 实测照样到达**（§2 断言）。同类的另一种写法是类式的 `__enter__/__exit__`（项目 4 的 Flask 世界）——FastAPI 用生成器把它做成了函数。

### 4.3 请求级缓存：use_cache

同一请求内多处引用同一依赖（路由依赖 + 参数依赖），默认**只执行一次、共享同一返回值**。`use_cache=False` 强制独立求值——适合"每次调用都要新鲜值"的场景（时间戳、一次性 nonce）。缓存的边界是单个请求：跨请求必然重新执行。

### 4.4 dependency_overrides：测试的官方后门

`app.dependency_overrides[真依赖] = 假依赖` 后，所有引用点静默换将——本实验实测响应来自 fake-db 且真依赖调用计数为 0；`clear()` 即拆。与 pytest 的 fixture 组合是标准姿势：conftest 里统一 override `get_db`，业务测试不感知真库的存在。

### 4.5 全局依赖

`FastAPI(dependencies=[Depends(dep_global)])` 让依赖对所有路由生效（无返回值用途，纯副作用/校验）——API Key 校验、请求打点、限流计数的挂载点。本实验用它验证了"7 个请求 7 次执行"的计数语义。

## 5. 关键代码解析

**为什么 teardown 断言要用 LOG 而不是看响应？**

```python
LOG.clear()
r = client.get("/boom")                      # 端点抛 418
assert LOG == ["conn:setup", "conn:teardown"]  # teardown 照样到达
```

teardown 的执行在响应之外，响应体里看不到它；只有把 `LOG.append` 埋进依赖内部，才能证明"异常路径清理必到"。这也是测试异步资源释放的通用思路——**在资源对象里留痕，在断言里查痕**。

坑清单：

- **在 yield 依赖的 teardown 里抛异常**：会覆盖 handler 的正常响应（500）；teardown 里只做清理，业务异常在 setup 阶段或 handler 里抛
- **以为依赖每次引用都重新执行**：同请求内默认共享同一返回值（缓存）；依赖返回可变对象且被 handler 修改时，其他引用点会看到修改——要么返回不可变值，要么显式 `use_cache=False`
- **override 后忘了 clear**：替身泄漏到别的测试用例，症状是"真数据怎么不对了"；fixture 里用 yield，测试结束自动 `dependency_overrides.clear()`
- **全局依赖里写重逻辑**：它对每个请求生效（含 /docs 的资源请求），放慢它 = 放慢整个服务

## 6. 文件结构

```
09_fastapi_di/
├── README.md                    # 本教程文档
├── fastapi_di.py                # 主演示脚本：嵌套链/yield/缓存/替身四节实测
└── images/
    ├── fastapi_di.json          # 图源（typed JSON IR，可编辑重渲染）
    ├── fastapi_di.html          # 交互示意图（浏览器打开）
    └── fastapi_di.svg           # 双主题矢量图（本 README §2 内嵌）
```

`fastapi_di.py` 内容：三层嵌套链（settings→session→user）/ `dep_conn` yield 依赖（setup/teardown 留痕 LOG）/ `dep_probe` 缓存探针（含 use_cache=False 对照）/ 真 DB 依赖与假 DB 替身 / 四个 demo 小节（验收点：§2 异常路径 teardown、§4 真依赖零调用）/ 全局依赖计数收尾断言。环境：`web/.venv`（fastapi + httpx）。

## 7. 面试要点

**Q1: Depends 的解析顺序是什么？**
深度优先：先递归求解子依赖，再执行当前依赖；多个同级依赖按声明顺序依次求解。同请求内同一依赖默认缓存复用（use_cache=True）。

**Q2: yield 依赖的执行时机与保证？**
yield 前是 setup（handler 前），yield 后是 teardown（响应生成阶段），finally 语义保证异常路径也执行——实测 handler 抛 HTTPException 时 teardown 照样到达。适合管理连接、事务等需要确定性清理的资源。

**Q3: dependency_overrides 的原理与使用场景？**
以依赖函数对象为键的替换表，求解时优先取替身。场景：测试里把 get_db 换成内存库/假数据，真依赖调用计数可为 0；比 mock 补丁更"官方"，因为它替换在框架解析层而不是业务层。

**Q4: 依赖注入比直接 import 全局配置好在哪？**
可替换（测试替身）、可组合（依赖树复用）、生命周期受控（yield 绑定请求）。全局 import 在多应用实例（工厂模式，项目 7）下直接失效——DI 的解析是按当前 app 的容器走的。

**Q5: 全局依赖与中间件的区别？**
中间件包住整个请求/响应周期（能改响应、看不到路由参数）；全局依赖在路由解析阶段执行（能复用依赖树、能返回 4xx 拦截，但拿不到响应对象）。鉴权用依赖（可声明在路由级/全局），打点改响应用中间件（项目 11）。

## 8. 总结

1. **依赖树深度优先求解**：实测 settings → session → user → handler，子依赖先于父依赖
2. **yield 依赖 = 请求级 with 语句**：setup/teardown 同函数，异常路径 teardown 必到（实测）
3. **use_cache 是请求内的**：默认共享求值结果，False 时各引用独立
4. **dependency_overrides 是官方测试后门**：替身上岗、真依赖零调用、clear 即还原
5. 依赖解决"资源从哪来"，下一篇 [10 · async 端点与 ASGI 真相](../10_async_asgi_truth/README.md) 解决"代码在哪执行"——def 与 async def 的线程池/事件循环实测
