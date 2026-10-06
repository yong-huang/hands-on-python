# 08 · 类依赖与全局依赖：把配置和行为装进同一个类

> FastAPI 里可以把"类（或它的实例）"交给 Depends 当依赖用：配置在实例化时给定，行为写在
> `__call__` 里；再用 APIRouter 与 FastAPI 的 `dependencies` 参数批量挂载。读完本篇，你能
> 写出可配置的限流守卫与分页参数包，并说出三层依赖的执行顺序：app 级 -> router 级 -> 端点级。

## Background

函数依赖是 FastAPI 最常见的依赖形态：依赖（框架在端点函数（即处理某条路由的函数，下同）
运行前替你准备好、再传进来的对象）用 `Depends(fn)` 声明。鉴权函数写一次，每个端点的
参数里各写一行 `Depends(require_api_key)`，就能共享同一次检查。

它撞的第一堵墙是配置。要给"重任务端点"限流 2 次、给"报表端点"限流 5 次，函数写不出
两个版本：要么复制两个几乎一样的函数，要么用闭包工厂（返回函数的函数）——配置和行为
被拆在两层，读代码要跳着对。

第二堵墙是重复。一个后台动辄二十条路由，逐条补 `Depends(require_api_key)` 既啰嗦也
容易漏，漏掉的那条就成了无鉴权的入口。

FastAPI 的解法分两步：把配置和行为装进同一个可调用对象（callable，定义了 `__call__`
方法、能像函数一样被调用的对象）；再用 `dependencies=[...]` 把横切逻辑（多个路由共用的
前置检查）一次性挂到一组路由乃至整个应用上。

## What

**定义**：类依赖是把类或实例交给 `Depends` 的依赖形态。传类时，FastAPI 每请求按
`__init__` 签名现场实例化并把实例注入；传实例时，每请求调用一次它的 `__call__`。
挂载级依赖用 `dependencies=[...]` 批量声明，返回值被框架丢弃，只认副作用。

| 挂载层 | 声明位置 | 作用范围 |
|:--|:--|:--|
| app 级 | `FastAPI(dependencies=[...])` | 全部路由，含 /docs 与被拒的请求 |
| router 级 | `APIRouter(dependencies=[...])` | 该 router 名下的所有路由 |
| 端点级 | 端点参数里的 `Depends(...)` | 单条路由 |

可以把类依赖想象成**一台出厂调好参数的安检机**：出厂时拧好上限旋钮（实例化时传
`limit`），每件行李（每个请求）过一遍传送带（`__call__`），超员即拒（HTTP 429）；
router 级依赖则是大门，进门查一次证件，馆内展厅不再重复查。

失效边界：安检机的计数只存在自己的内存里，断电（进程重启）即清零，两台机器互不相通；
大门也只管自己的入口，绕开 router 挂载的公开路由不受它约束。

下图把三层挂载画成一次 /admin 请求要过的闸门序列：①→②→③ 是真实执行顺序，
虚线箭头是各自的拒绝出口（403/429）；端点级区域里，RateLimitGuard 的 __init__
（启动期一次）与 __call__（每请求）分开画出。

![Lab 08 · 三层挂载:app 级 → router 级 → 端点级](images/class_global_dependencies.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/fastapi/08_class_global_dependencies/images/class_global_dependencies.html)
> (或本地打开 [`images/class_global_dependencies.html`](images/class_global_dependencies.html))。

## When to Use

典型场景有三类。同一组前置检查要套住一组路由：后台接口统一鉴权、审计计数。同一逻辑
要以不同参数复用：不同上限的限流器、不同页长的分页包。若干 query 参数总是一起出现：
打包成一个对象，端点签名只收一个参数。

何时不用：只有一个端点用的简单校验，函数依赖一行就够；要在响应生成之后修改响应、
或拦下 404 请求，dependencies 做不到——那是中间件（middleware，包在请求处理外层、
能同时看到请求与响应的钩子）的职责。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 函数依赖 | 无状态，声明即用 | 单点校验：取 header、查会话 |
| 类依赖 | 可带配置，实例可持有状态 | 参数化守卫、query 参数包 |
| 挂载级 dependencies | 返回值丢弃，只认副作用 | 整组路由的鉴权、计数 |
| 中间件 | 包住请求与响应全程，含 404 | 日志、trace、CORS 头 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（fastapi / uvicorn / httpx 已装好；未创建则先在仓库根
执行 `./scripts/load_resources.sh`）。uvicorn（ASGI 服务器，负责把 HTTP 请求递给
FastAPI 应用）由脚本自动拉起与停止，端口 8908。

```bash
cd fastapi/08_class_global_dependencies && ./08_class_global_dependencies.sh demo
```

真实输出示例（节选）：

```text
---- [2/6] 类依赖参数化: 两个 RateLimitGuard 实例, 各自独立计数
    $ heavy 第 3 次(超过 limit=2)   =>   HTTP 429
        {
          "detail": "IP 127.0.0.1 第 3 次请求，超过 heavy 守卫的上限 2"
        }
    [PASS] heavy 第 3 次 -> 429
    [PASS] heavy 计数表独立: {127.0.0.1: 3}
    ...reports 第 1~6 次请求的 PASS 与 GET /admin/stats 输出省略...
    [PASS] reports 计数表独立: {127.0.0.1: 6}
    ...
---- [6/6] 执行顺序: app 级 -> router 级 -> 端点级
    $ GET /admin/trace   =>   HTTP 200
        {
          "trace": [
            "global",
            "router",
            "endpoint"
          ],
          "explain": "global=app 级 -> router=路由器级 -> endpoint=端点级"
        }
    ...1 行 PASS(状态码 200)省略...
    [PASS] 顺序 = global -> router -> endpoint
    ...
====================================================================
  演示完成: 31 项断言全部通过
```

诚实预期：限流计数与全局请求数是进程内变量，重启即归零。demo 每次自行起服务、断言
从零开始，可反复执行；用 `start` 手动起服务时，429 何时出现随之前的请求而定。

## How It Works

Depends 接受任何可调用对象，传"类"与传"实例"的处置不同。传类时，FastAPI 读取
`__init__` 的参数签名（去掉 self），q/size 解析为 query 参数、`ge=1` 校验照常生效，
再调用类本身——实例即注入值（`Depends(Pagination)`）。

```python
class Pagination:
    def __init__(
        self,
        q: Annotated[int, Query(ge=1, description="页码，从 1 起")] = 1,
        size: Annotated[int, Query(ge=1, le=50, description="每页条数，1~50")] = 10,
    ) -> None:
        self.q = q          # FastAPI 解析 query 后调用 Pagination(q=2, size=3)
        self.size = size    # 实例注入端点参数 page，q/size 即实例属性
```

传实例（`Depends(RateLimitGuard(limit=2))`）时，实例化在 import 时只执行一次，实例被
模块级变量长期持有，FastAPI 每请求调用一次它的 `__call__`。两个守卫的计数表互不相通，
各自守着自己的 `self.counts`——计数跨请求累积靠实例常驻，而非每请求新建。

命名要避开路径参数：类依赖的参数默认按 query 解析，若参数名与路径占位符同名（路由
`/items/{q}` 配上参数 `q`），它会被当成路径参数取值，来源静默改变。

执行顺序固定为 app 级 -> router 级 -> 端点级。三层依赖各自往 `request.state`（每请求
一份的属性容器）记一笔，`GET /admin/trace` 回显 ["global", "router", "endpoint"]；
app 级先运行，403 被拒的请求也计入全局计数。

`dependencies=[Depends(x)]` 的返回值被框架丢弃，这个位置只认副作用。要拿值就在端点
参数里声明同一个依赖：同一请求内同一可调用只执行一次（依赖缓存），demo [3] 的
`cache_proof: true` 就是两个参数拿到同一实例的证据。

## Pitfalls & Q&A

- **指望 `Depends(Pagination)` 的实例跨请求记住东西**：传类时每请求新建实例，属性天然
  只属于本请求。解法：跨请求状态放模块级变量（如 REQUEST_COUNT），或 import 时实例化
  并持有（如 HEAVY_GUARD）。
- **全局依赖把 /docs 也拦了**：app 级依赖对文档路由同样生效，限流/鉴权全局依赖抛
  429/403 时文档页一起打不开。解法：对 /docs、/openapi.json 放行，或改挂 router 级。
- **挂载级依赖的返回值拿不到**：`dependencies=[Depends(compute_user)]` 之后端点里没有
  这个值。解法：挂载级只放副作用型依赖；要值就在端点参数里声明同一依赖，命中缓存不重跑。
- **router 级依赖管不管 include_router（把一个 router 的路由并进上层）的子路由？管
  得到：依赖随宿主 router 追加到名下每条路径；没被收编的路由（如 /public/ping）免凭证。
- **Q：三层都挂了同一个依赖，会执行几次？** 一次。依赖缓存按可调用对象去重，声明多处
  也只跑第一处，其余拿到同一返回值——这正是简写式（`page = Depends(Pagination)`）与
  完整式（`Annotated[Pagination, Depends(Pagination)]`）拿到同一实例的原因。
- **Q：429 之后会一直 429 吗？** 本演示会：计数只增不减、没有冷却窗口。真实限流常用
  滑动窗口或令牌桶，并把计数放共享存储（如 Redis）；多 worker（多服务进程）时各一本账，
  进程内计数会低估总量。
- **Q：app 级依赖能改响应吗？** 不能。它运行在端点函数之前，拿不到响应对象；要加响应
  头或统一包装错误格式，需要中间件。
