# 06 · Depends 依赖链：依赖在端点函数之前执行

> Depends 是 FastAPI 的依赖注入入口：把参数声明成 `Depends(函数)`，框架就在端点函数
> 运行前替你构造好这个值，连同它牵出的整条资源链。读完本篇，你能说清三层依赖链的
> 执行顺序、每请求缓存的覆盖范围，以及 use_cache=False 绕过缓存后多出的那条记录。

## Background

在依赖注入机制出现之前，Web 框架里准备"请求前置资源"靠手写：读配置、连数据库、
取当前用户，各写一个函数，在每个处理函数的开头挨个调用。

资源之间有依赖时样板开始堆叠。取当前用户要先有数据库会话，开会话要先读配置；
每个端点都按 settings → db → user 的顺序手写这三步，顺序写错要到运行时才暴露。

另一件旧工具是装饰器：它能把"进入处理函数之前先执行某段代码"统一收口。
但装饰器叠到两三层后，参数从哪里来、彼此怎么传递，要读完每个装饰器才能回答。

依赖注入（Dependency Injection，把"资源如何构造"从使用方剥离、由框架统一构造后
递给使用方的设计）为此而生：FastAPI 把这套机制收敛成一个 `Depends` 声明。

## What

**定义**：Depends 是"让 FastAPI 在端点函数运行前构造参数值"的声明：写成
`Annotated[User, Depends(get_current_user)]`（Annotated 是 typing 的"类型+附加信息"标注写法），框架就调用该函数并把返回值装进参数。

本实验的演示应用是一条三层依赖链，每层只认识上一层：

| 链层 | 依赖函数 | 它依赖谁 | 产出 |
|:--|:--|:--|:--|
| 第一层 | get_settings | 无 | 配置对象（含 db_dsn 连接串） |
| 第二层 | get_db | get_settings | 伪数据库会话（用 dsn 建立） |
| 第三层 | get_current_user | get_db | 当前用户（查"会话"所得） |

可以把依赖树想象成**按配方递归备料**：端点报出"我要 user"，框架顺着配方往下问
（user 要 db，db 要 settings），问到不依赖任何东西的根，再逐层组装回来。
失效边界：备料每道菜各买一份，依赖树不是——每请求缓存规定同一函数在一次请求内
只执行一次，树里其他引用处直接复用那份返回值。

两个配套规则：依赖全部执行完之前，端点函数体一行都不会跑；缓存的生命周期是
单个请求，下个请求从链的根重新执行。

一条 GET /posts 触发的完整解析过程如下图：主路径是从请求到端点函数的深度优先
执行序（①→②→③），依赖树里的虚线箭头指向被依赖者；下方两侧分别是每请求缓存
（同函数只执行一次）与 use_cache=False 重跑（多出第 ④ 条记录）的对照。

![Lab 06 · Depends 依赖链:深度优先解析与每请求缓存](images/depends_chain.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/fastapi/06_depends_chain/images/depends_chain.html)
> (或本地打开 [`images/depends_chain.html`](images/depends_chain.html))。

## When to Use

- **每请求都要的资源**：数据库会话、配置对象、连接池借出的连接——声明一次，
  链由框架自动补齐，端点函数只管业务。
- **横切校验**：登录态、权限、API 令牌。校验逻辑放在依赖里，失败抛
  HTTPException（抛出后由框架转换成对应状态码的错误响应），请求在业务代码前被拦下。
- **可复用参数包**：分页（skip/limit）、过滤条件，多个端点共享同一份声明。

何时不用：与请求无关的常量和纯计算，直接 import 更直白；一次性逻辑包成依赖多一层
间接。测试期前置资源用 pytest fixture（pytest 里构造测试前置资源的机制）。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 直接 import/调用 | 构造时机与作用域自己管，框架不参与 | 与请求无关的常量、纯计算 |
| Depends | 每请求构造、可嵌套、请求内缓存、可被覆盖替换 | 请求级资源准备与横切校验 |
| pytest fixture | 测试框架接管构造，作用域可跨用例共享 | 测试代码里替代真实依赖 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（未创建则先在 fastapi 目录执行 `fastapi/scripts/load_resources.sh`）；
演示应用在同目录 `main.py`，由 uvicorn（把应用跑成 HTTP 服务的服务器）监听 8906 端口。

```bash
cd fastapi/06_depends_chain && ./06_depends_chain.sh demo
```

脚本按 5 步走，每步附带断言：

1. 打印三层依赖链的文字结构图；
2. 请求 /posts 后用 GET /trace 读执行记录，断言顺序精确为 settings→db→user；
3. 再发一次请求，断言记录仍是三条（缓存跨请求重置、请求内不重复）；
4. 请求 /posts/draft，断言记录四条且第 4 条是重复的 user；
5. 带错误令牌请求 POST /posts，断言 403 且 /trace 为空。

真实输出示例（节选，[3][4][5] 章节输出省略）：

```text
---- [2/5] 一次请求的执行顺序: settings -> db -> user, 端点函数在最后
    $ curl http://127.0.0.1:8906/posts   =>   HTTP 200
        {
          "author": "alice",
          "db_dsn": "pseudo://localhost/articles",
          "posts": [ ...两篇已发布文章的列表，此处省略... ]
        }
    [PASS] GET /posts 状态码 200
    ...两行 PASS 省略...
    $ httpx GET http://127.0.0.1:8906/trace   =>   HTTP 200
        trace = ["settings", "db", "user"]
    [PASS] 执行记录恰为 settings,db,user
    ...[3][4][5] 章节的请求与断言输出省略...
  演示完成: 18 项断言全部通过
```

预期说明：每个依赖被调用时向进程内列表追加一条记录，/trace 读取即清空——
这个观测端点是本实验专设的教学装置，真实项目不会有。`all` 子命令会先清理
再演示、结束后再清理；18 项断言全部通过即环境与实验内容一致。

## How It Works

FastAPI 在应用启动时把每个端点的参数解析成一棵依赖树，节点是依赖函数与它们的
子依赖。/posts 的树是三层链的倒挂：user 挂着 db，db 挂着 settings。请求按
深度优先（先下钻到链的最深处、再逐层折返）执行，第三层代码最能说明顺序保证：

```python
async def get_current_user(db: Annotated[PseudoSession, Depends(get_db)]) -> User:
    _record("user")  # 执行到这里时, settings 与 db 必已完成: 深度优先先解子依赖
    row = db.fetch_user()
    return User(name=row["name"], role=row["role"])
```

你在 demo [2] 看到的 `["settings", "db", "user"]` 就是这棵树的深度优先遍历序：
根最先，端点函数最后。

缓存机制落在一个字典上：FastAPI 为每个请求新建一个 dependency_cache，每解析完
一个依赖，就以"依赖函数对象本身"为键存下返回值。

同一个函数在树里出现两次时（/posts 里 user 链上的 db 与端点第二个参数 db 是
同一个函数），第二次直接查表命中、不再执行——demo [3] 一轮请求只留三条记录。

`Depends(use_cache=False)` 跳过查表、强制重新调用，执行后把新值写回缓存；
它的子依赖不受牵连，仍按默认的 use_cache=True 查表——所以 demo [4] 只多出
一条 user，settings 与 db 没有跟着重跑。

子依赖的穿透与短路：端点只声明第三层，框架穿透补齐整条链，db_dsn 从第一层
穿过会话传进响应；任何依赖抛出 HTTPException 时，解析阶段立即中断，声明在后的
依赖与端点函数体都不执行——demo [5] 的空 trace 说明连链的根都没有启动。

## Pitfalls & Q&A

- **依赖函数的默认参数会变成查询参数**：`dsn: str = "pseudo://dev"` 不是内部配置——
  FastAPI 把它当 `?dsn=` 查询参数（实测：OpenAPI 即自动生成的接口描述文档里，dsn
  位置标为 query，带 `?dsn=evil://override` 即可覆盖）。解法：配置走上游依赖（settings 层）。
- **类依赖 `__init__` 的可变默认值其实不跨请求共享（实测澄清）**：默认参数在 class 定义时
  求值一次，但 FastAPI 对缺失的查询参数默认值做按请求深拷贝——实测（fastapi 0.142.2）
  三次请求 `seen` 均为 `['anon']`，与普通函数依赖 `bucket: list[str] = []` 行为一致。
  真正要避开的仍是第一条：这些默认参数会被当成查询参数暴露出去。
- **use_cache 与 async/sync 无关**：缓存不看依赖是 `async def` 还是 `def`
  （后者进线程池执行，见 lab 11）；想每次拿新值就显式写 use_cache=False。
- **Q：缓存的键到底是什么？** 依赖函数对象本身。两个代码相同的函数是两个键，
  互不命中；用 lambda 或 functools.partial 包一层也生成新对象、新键。
- **Q：依赖抛异常后，已执行的依赖需要清理怎么办？** 普通依赖没有清理钩子，
  已执行的依赖就留在那里；需要"用完必清理"的资源要用 yield 依赖，把清理代码
  写在 yield 之后，见 lab 07。
- **Q：什么时候值得写 use_cache=False？** 返回值必须每次新鲜时：时间戳、
  随机值、临时文件句柄。代价是放弃"一次构造、多处复用"，引用几次就执行几次
  （demo [4] 的第 4 条记录）。
- **Q：依赖缓存能跨请求复用吗？** 不能。dependency_cache 每个请求新建，
  demo [3] 实测第二次请求仍从 settings 跑起。跨请求共享的进程级资源（连接池、
  配置对象）用模块级单例或 lifespan（应用启动与关闭时各执行一次的钩子，见 lab 07）管理。
