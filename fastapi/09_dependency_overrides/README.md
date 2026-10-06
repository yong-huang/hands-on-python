# 09 · 测试替身：一个 dict 换掉全部真依赖

> FastAPI 的测试替身机制：`app.dependency_overrides` 这一个字典，把真网关换成假网关，让
> 测试零等待、零脏数据，还能证明真依赖一次都没执行。读完本篇，你能为任何 Depends
> 依赖写出替身，并用 autouse fixture 托管注册与清理。

## Background

测试要打真网关的年代：想验证一条支付链路，测试就得真的扣款。真环境的网络往返以
百毫秒计，回归两百条用例是分钟级等待；跑完还留下一堆作废订单，要在后台人工核销。

故障更没法演练。要验证"网关超时后端点返回什么"，总不能真把支付通道拔了；想看
"风控拒绝时收据长什么样"，也没有开关能让真风控配合说一次"不"。

解法是把"换实现"收敛到框架层。FastAPI 的依赖注入——框架按端点（处理某个路由的
函数，下同）的声明自动构造并传入参数——让外部协作对象有了统一的声明位置。

外部对象一律写成 `Depends(...)`（标注"这个参数的值由框架解析注入"）后，app 对象上
随之开了字典口子：键是依赖函数，值是替身函数，替换成为框架内建的一等公民。

## What

**定义**：`dependency_overrides` 是 app 对象上的一个普通字典属性。键为原依赖的函数
对象，值为替身函数；请求解析依赖时命中该键，就以替身的返回值顶替真依赖，真函数
完全不执行。测试替身（test double，替真身出场受检的假实现）由此成为框架内建能力。

可以把 `dependency_overrides` 想象成**配电箱**：端点函数是墙上的插座，只认"这个位置
有电"；真网关与假网关是两种电源，扳动箱内开关即可换电，插座与线路不动。

失效边界：它只对经 `Depends` 声明的依赖生效——绕过框架直接 `GATEWAY.charge(...)`
的 import 调用不在管辖之内；app 之间也不共享，每个 app 有自己的配电箱。

一次替换涉及三方：

| 角色 | 本实验里是谁 | 说明 |
|:--|:--|:--|
| 键 | `get_payment_gateway`（函数对象本身） | 必须 import 进来的那一个 |
| 值 | 返回 FakeGateway 的替身函数 | 签名可以与原依赖不同 |
| 生效点 | 依赖解析期 | 请求开跑、端点函数执行之前 |

注册替身后,一次请求的依赖解析如下图:命中键即由替身服务 `/pay`;未命中(或
`clear()` 清空)才落到底部真网关链——右侧 `/gateway-stats` 的计数纹丝不动,就是
"真依赖一次都没执行"的证据。

![Lab 09 · 替身替换机制:解析期的一次字典查找](images/dependency_overrides.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/fastapi/09_dependency_overrides/images/dependency_overrides.html)
> (或本地打开 [`images/dependency_overrides.html`](images/dependency_overrides.html))。

## When to Use

- 隔离有真实后果的外部服务：支付、邮件、对象存储一调就产生费用或脏数据，替身后测试零副作用；
- 演练故障与慢路径：替身里抛超时异常、返回错误码，真环境给不出来的"网关宕机"随写随用；
- 提速：真依赖里的 sleep、重试、握手全部跳过，单个用例从百毫秒级降到毫秒级。

何时不用：被测逻辑是纯函数（输入定输出、无外部协作）时直接单测函数即可，不必走
HTTP 层再换依赖；替身写得比真实现还复杂时，该怀疑的是设计而不是硬写替身。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| dependency_overrides | 按 Depends 声明替换，理解 FastAPI 依赖图 | FastAPI 应用的集成测试 |
| mock.patch（unittest 的运行期打补丁工具） | 换对象属性，与框架无关 | 补丁第三方库内部方法 |
| 仅 pytest fixture（pytest 是 Python 的事实标准测试框架；fixture 夹具在测试前后自动准备/清理资源） | 只准备资源，不拦截依赖解析 | 替身只需造数据、无需接管调用 |

## Quick Start

前置：Python 3.13 虚拟环境含 fastapi、pytest、httpx；未创建则先在仓库根执行
`./scripts/load_resources.sh`。本实验主教材是 pytest 测试文件，脚本负责讲解并运行它们。

conftest.py 提供 TestClient（FastAPI 配套的进程内测试客户端），请求进程内直发、
不走网络；对照实验一节会短暂拉起 uvicorn（FastAPI 配套的 ASGI 服务器），占
8909 端口，结束自动停止。

```bash
cd fastapi/09_dependency_overrides && ./09_dependency_overrides.sh demo
```

真实输出（节选，讲解行与部分断言行以 ... 略去）：

```text
  lab 09 · 测试替身 dependency_overrides —— 主教材是 pytest 测试文件
  ...
    main.py           被测应用: 真网关(计数+sleep)/真风控/子依赖/use_cache 端点
  ...
  test_overrides.py::test_01_no_override_real_gateway_runs PASSED          [ 12%]
  test_overrides.py::test_02_override_replaces_whole_chain PASSED          [ 25%]
  ...
  test_overrides.py::test_07_no_leak_after_blueprint PASSED                [100%]
  ============================== 8 passed in 0.33s ===============================
    [PASS] pytest 用例通过数 = 8
  ...
    $ curl -X POST http://127.0.0.1:8909/pay -d '{...}'   =>   HTTP 200
        {
          "receipt": {
            "provider": "real-gateway",
            "latency": "simulated-100ms",
            ...
          }
        }
    [PASS] 请求耗时 0.106332s >= 0.09s(真网关的 sleep 真实发生)
  ...
  演示完成: 12 项断言全部通过
```

诚实预期：pytest 8 个用例全过，三次走真路径的请求各含一次 0.1 秒 sleep，测试段约
0.3 秒；对照实验再打两次真请求，整个 demo 数秒内结束，耗时数字每次略有浮动。
响应里 `provider` 是"谁在服务"的标记：真网关 real-gateway，替身 fake-gateway。

## How It Works

`dependency_overrides` 的全部机制浓缩在解析期的一次字典查找里：求解每个 `Depends`
声明时，框架拿原依赖的函数对象去查这个 dict，命中就用替身，未命中走原函数。
你在测试 [2] 看到的"三个计数器纹丝不动"，就来自这次查找发生在真函数之前。

```python
# 注册: 键是函数对象本身, 不是函数名字符串
app.dependency_overrides[get_payment_gateway] = lambda: fake_gateway
# 框架求解 Depends(get_payment_gateway) 时等价于:
# call = overrides.get(get_payment_gateway, get_payment_gateway)
# 然后调用 call() —— 真函数从头到尾没被碰过
```

键必须是 import 进来的那个函数对象：dict 按对象哈希查找，同名重新定义的函数是
另一个对象，查不到即静默失效。TestClient 与替换机制正交：它管"请求怎么进来"
（进程内直发，不走网络），`dependency_overrides` 管"依赖由谁扮演"，可任意组合。

替换是整体置换。真依赖 `get_payment_gateway` 自己挂着子依赖（依赖函数自己的
`Depends` 参数构成的链条）`get_gateway_config`；替身上场后框架只按替身自己的参数表
求解，原签名里的 `Depends` 不参与。测试 [4] 的无参替身能顶替真依赖，正是这条规则。

use_cache 的交互：同一请求内，同一依赖（含替身）只求解一次，缓存键记在原函数对象
名下。`/pay-twice` 端点两个参数声明同一个依赖，对照实验里 `same_instance` 为 true、
解析计数只加 1——替身与真依赖共享这套每请求缓存语义。

## Pitfalls & Q&A

- **键写错，替换静默不生效**：在测试文件里重新定义同名同签名的
  `get_payment_gateway` 再拿它当键，dict 查无此对象，注册不报错、请求仍打真依赖。
  解法：键一律 `from main import get_payment_gateway`；起疑时先
  `print(len(app.dependency_overrides))`。
- **忘 clear，污染同进程其他测试**：overrides 挂在 app 单例上，进程不死它不散；
  A 文件注册的替身会漏进 B 文件的用例，且收集顺序一变故障位置跟着漂移。解法：
  autouse fixture（自动作用于同作用域全部用例）在 yield 后 clear，即本实验 [6]。
- **挂载级依赖同样可换，键要用原对象**：写在 `FastAPI(dependencies=[...])` 或
  router 构造参数里的依赖可以替换，但键必须是注册时传进 `Depends` 的那个函数；
  换成包装后的闭包同样静默失效。
- **fixture 与 override 双重注册**：conftest 的 autouse fixture 已挂替身 A，测试体
  又手动注册替身 B，同一键后写者胜，A 白写。排查时先打印 dict 内容再发请求。

- **Q：替身返回类型和真依赖不一致，框架检查吗？** 不检查。类型注解只服务文档与
  编辑器，替换是运行期字典查找，返回什么都照收；工程约定是替身实现与真身相同的
  方法与返回形状，否则要到端点函数运行时才炸。
- **Q：替换后 /gateway-stats 计数为什么不动？** 计数器加在真依赖执行路径上，而
  替换发生在更早的解析期，真函数没被调用。想知道"替身被用几次"，把计数器放在
  替身自己身上（本实验的 `FakeGateway.charge_calls`）。
- **Q：并行测试安全吗？** pytest-xdist（按进程并行跑用例的插件）下每个进程各有
  app 副本，互不影响；同一进程内多线程并发注册与清理同一个 dict 才有竞态，清理
  交给 fixture teardown 串行执行即可。
- **Q：只想临时替换一次呢？** 发完请求立刻把键 pop 掉（`app.dependency_overrides.pop(get_payment_gateway, None)`）；更清晰的做法仍是作用域化 fixture，作用域结束自动清理。
