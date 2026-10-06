# 10 · Annotated 与依赖工厂：类型与依赖合一，配置收进闭包

> FastAPI 依赖声明的现代写法与参数化：把参数类型与参数来源合进同一条声明，可变的配置交给
> 一个能"铸造"依赖的普通函数。读完本篇，你能写出两套上限不同的分页依赖并解释它们为何互不
> 干扰，还能用进程内计数器验证依赖的去重行为。

## Background

FastAPI 的依赖注入（框架在处理请求时替端点函数（处理某个路由的函数，下同）构造好参数、
再传进去的机制）曾只有一种写法：`pg: PageInfo = Depends(pagination_50)`。类型在注解位，
`Depends`（FastAPI 标记"这个参数由框架提供"的构造器）在默认值位。

一个参数的信息拆在两个位置：类型检查器看注解位，FastAPI 看默认值位；复用到第二个端点
时，整串默认值要原样再抄一遍，漏抄就各报各的错。

参数化更麻烦。报表系统要"普通报表每页 50 条封顶、管理报表 200 条封顶"，写死的年代只能
全局变量配 if 分支，或整函数复制一份，配置散落在模块各处。

转机来自标准库：typing.Annotated（PEP 593，在类型提示上附加元数据的注解容器）进入语言
后，FastAPI 自 0.95.0（2023 年 3 月）起支持并把这种写法列为推荐；参数化则交给依赖工厂
——返回依赖函数的普通函数，配置在铸造时一并封存。

## What

**定义**：`Annotated[PageInfo, Depends(pagination_50)]` 一条声明说清两件事——参数
是 PageInfo 类型，值来自 pagination_50 这个依赖。依赖工厂（`make_xxx`）返回依赖函数，
调用一次就把配置封进闭包（记住外层变量的内层函数），随产物复用。

```python
Page      = Annotated[PageInfo, Depends(pagination_50)]   # 类型别名: 上限 50, 普通报表用
AdminPage = Annotated[PageInfo, Depends(pagination_200)]  # 同一工厂, 上限 200, 管理报表用
```

可以把工厂想象成**模具**：一套模具按不同规格各浇一次，得到的是规格固定的两件成品；类型
别名（把类型连同元数据存进变量，之后按名字复用）就是贴在成品上的标签。

失效边界：模具每浇一次都是一件全新成品——新函数对象、新缓存键（缓存键：FastAPI 判断
"同一依赖本次请求是否已执行过"所依据的函数对象，默认按它去重），规格相同也不合并；标签
在运行时并不存在，FastAPI 注册路由时就把别名展开成它指向的那个依赖了。

从工厂到路由的对应关系如下图：每次铸造铸出新函数对象（缓存键 A / B 各自独立），别名只
是分发引用；`/reports/dup` 里同一个缓存键被声明两次（路由参数直连一次、嵌套依赖
page_tag 里一次），同一次请求内也只执行一次。`/trace`（暴露依赖执行计数的端点）是证据。

![Lab 10 · 工厂铸造与缓存键：一铸一键，别名分发](images/annotated_factories.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/10_annotated_factories/images/annotated_factories.html)
> （或本地打开 [`images/annotated_factories.html`](images/annotated_factories.html)）。

## When to Use

典型场景：同一依赖需要多套配置（分页上限、限流速率按角色区分）；同一依赖在依赖树里多处
出现，用别名收敛成唯一入口；团队统一声明风格，让每个路由的参数位都只有一个词。

何时不用：只有一个端点用的简单依赖，直接 `Depends(get_db)` 更直白，工厂化是过度设计；
配置到请求期才确定（如取自请求头）时工厂帮不上——那部分应写成依赖函数自己的参数。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 直接 `Depends(fn)` | 一处声明一处使用 | 单端点、无配置差异 |
| 工厂 `make_xxx(cfg)` | 配置进闭包，产物可多套 | 同一依赖、多套配置并存 |
| 类依赖 `Depends(MyClass)` | 类本身充当可调用对象 | 状态与行为绑定的组件（如限流桶） |
| Annotated 别名 | 类型与依赖合一，可复用 | 新代码的默认写法 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（Python 3.13、fastapi、httpx），未创建则先在仓库根执行
`./scripts/load_resources.sh`。

演示应用在本目录 `main.py`，端口 8910，由 uvicorn（FastAPI 配套的 ASGI 服务器，监听端口
并把 HTTP 请求翻译成对应用的调用）托管。

```bash
cd fastapi/10_annotated_factories && ./10_annotated_factories.sh demo
```

demo 共 5 步：

1. Annotated 新旧写法对照；
2. 同工厂不同参数的上限对比；
3. Page 别名跨路由复用；
4. 用 `/trace` 读取进程内计数器（服务进程里累加的依赖执行次数），验证去重；
5. 类依赖（把类直接当依赖、框架负责实例化）工厂产出的两只限流桶。

真实输出（节选，`...` 处省略了中间输出）：

```text
    $ httpx.request("GET", "http://127.0.0.1:8910/trace")   ->   HTTP 200
        {
          "exec_counts": {
            "再铸50#3": 1,
            "再铸50#4": 1,
            "分页200#2": 1,
            "分页50#1": 5
          },
          "factory_calls": {
            "make_pagination": 4,
            "make_bucket": 2
          },
          "buckets": {}
        }
        [PASS] d["exec_counts"].get("分页50#1", 0) == 5
...
        [PASS] d["exec_counts"].get("再铸50#3", 0) == 1
```

预期与实测一致：`size=100` 在普通报表被 422（Unprocessable Entity，校验失败）拦下、在
管理报表放行；`分页50#1` 全程计 5 次，再铸的 `#3`、`#4` 各计 1 次；64 项断言的数字只由
代码决定，与机器无关。

## How It Works

核心机制一条：FastAPI 求解一次请求的依赖树时，用"依赖的可调用对象本身"作请求内缓存的键
（下称缓存键；`Depends` 默认 `use_cache=True` 允许按键去重）；键不是工厂参数，是函数对象本身。

工厂每次被调用都返回一个新函数对象，所以 `make_pagination(50)` 与 `make_pagination(200)`
的产物天然不同键、各自执行——两套上限彼此独立的根源；反过来，`Page` 别名在模块级引用
同一个 `pagination_50`，复用别名的路由全部共享同一个缓存键。

demo [4] 的读数：`/reports/dup` 里 `pagination_50` 直连与嵌套共出现两次，计数只从 3 涨到
4——同键去重；`make_pagination(50)` 调用两次的 `再铸50#3/#4` 同参数也各计 1。

```python
def make_pagination(max_size: int, label: str):
    slot = _next_slot(label)               # 每调用一次工厂 -> 一个新槽位(即新函数对象)
    def pagination(page: Annotated[int, Query(ge=1)] = 1,
                   size: Annotated[int, Query(ge=1, le=max_size)] = 10) -> PageInfo:
        EXEC_COUNTS[slot] = EXEC_COUNTS.get(slot, 0) + 1   # 函数体真跑了才 +1, 422 不计
        return PageInfo(page=page, size=size,
                        max_size=max_size, offset=(page - 1) * size)
    return pagination                      # 返回新函数对象: 它本身就是缓存键
```

FastAPI 注册路由时用 `typing.get_type_hints(include_extras=True)`（保留注解元数据）展开
端点与依赖的全部注解，读到 `Depends` 实例就登记为子依赖；别名因此只是一次变量赋值，
运行时零开销。

类依赖是同一机制的另一面：`Depends(TokenBucket)` 让 FastAPI 实例化这个类；工厂
`make_bucket(name, rate, capacity)` 把速率冻进闭包，类只保留补扣令牌的行为。

demo [5] 印证参数化：慢桶（容量 5）拒掉 cost=8、返回 429 Too Many Requests；快桶
（容量 20）放行 cost=8、余量从 20 降到 12——同一个类，不同参数，行为分野。

## Pitfalls & Q&A

- **工厂在模块导入期干了重活**：`make_xxx` 里连数据库，每次 import 都执行，pytest（Python
  测试框架）收集用例时也跑。解法：重活移进依赖函数体内或 lifespan（进程级生命周期钩子）。
- **误以为同工厂同参数会共享缓存**：`make_pagination(50)` 调用两次是两个对象、两个键，
  demo [4] 的 `same_object=False` 即证据。解法：模块级铸造一次，用别名分发引用。
- **一个 Annotated 里放两个 Depends**：`Annotated[str, Depends(a), Depends(b)]` 不报错，
  但实测只有最后一个生效，`a` 根本不执行。解法：一个注解只放一个 `Depends`。
- **别名套别名顶掉原依赖**：`P2 = Annotated[Page, Depends(other)]` 把元数据叠加成两个
  Depends，按上一条的规则 `other` 生效、原依赖被顶掉且无告警。解法：不在旧别名外再包一层。
- **Q：想让同一键位也执行两次怎么办？** 写 `Depends(fn, use_cache=False)`，实测同一函数
  对象出现两次就各执行一次；代价是同一请求内重复取连接、重复扣令牌。
- **Q：工厂参数能来自请求吗？** 不能。工厂在导入期执行，那时请求尚不存在；请求期才确定
  的值写成依赖函数自己的 `Query`/`Header` 参数，`page` 与 `size` 就是这么进来的。
- **Q：路由级 `dependencies=[...]` 里能用别名吗？** 那里只能放 `Depends(...)`，没有参数
  类型位，"类型与依赖合一"的好处丢失；需要依赖返回值时，放参数位并使用别名。
