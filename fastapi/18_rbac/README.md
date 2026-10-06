# 18 · 依赖链做 RBAC：认证查票，授权查座位

> 角色权限不必以 if 判断的形式散落在端点函数里：把"登录了吗、角色够吗、资源是
> 你的吗"做成三层依赖，FastAPI 在进入端点函数之前逐层放行或拦下。读完本篇，
> 你能分清 401 与 403 的语义分界，写出 require_role("admin") 这样的参数化角色
> 依赖，以及按资源归属放行的对象级检查。

## Background

授权逻辑没有固定去处时，最常见的写法是把它直接写进端点函数：取到当前用户，判断
角色是不是 admin，不是就抛 403。一两个端点这样写没有问题。

撞墙出现在规模上：文档管理这类服务有十几个端点，新建可能忘了判角色，删除只在
函数中间判了一半，判断语句散落各处，很难回答"到底哪些操作要求 admin"。

更隐蔽的漏判在对象层面：接口只判了"是不是 admin"，没判"这篇文档是不是你的"，
任何登录用户都能删掉别人的文档。授权由此从各端点的私事，变成请求进入端点之前
必须统一完成的事——把它做进依赖链，就是本篇的主题。

## What

**定义**：RBAC（Role-Based Access Control，基于角色的访问控制）是"用户绑定角色、
角色绑定权限"的授权模型。它在 FastAPI 里的落地形式是一串分层依赖（dependency，
框架在端点函数之前执行的函数）：认证依赖回答"你是谁"，授权依赖回答"你能做什么"。

可以把整套机制想象成**剧院检票**：认证是查票——没买票请先买（401 Unauthorized，
未认证）；授权是查座位——三等座的票坐不了一等座（403 Forbidden，已认证但权限
不足）。但和剧院不同的是，这里的"查座位"还包含对象级归属：同一张票，面对不同
资源的答案不同。

| 层 | 依赖 | 失败响应 | 回答的问题 |
|:--|:--|:--|:--|
| router 级 | `require_login` | 401 + `WWW-Authenticate` | 登录了吗 |
| 端点级 | `require_role("admin")` | 403（detail 写明角色差距） | 角色够吗 |
| 对象级 | `get_doc_and_check_owner` | 403 或 404 | 这份资源是你的吗 |

三条泳道是三次请求的裁决现场：未登录停在第一层，角色不够停在第二层，对象归属在第三层分出 204 与 403。

![Lab 18 · RBAC 三层闸门：登录、角色、对象归属](images/rbac.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/18_rbac/images/rbac.html)
> （或本地打开 [`images/rbac.html`](images/rbac.html)）。

## When to Use

典型场景：管理后台（少数固定角色、操作边界明确）；多租户内容服务（owner 才能
改删自己的数据）；同一个 router 下"部分端点登录即可、部分还要特定角色"的混合
布局。

何时不用：只有一两个端点、两三种角色时，端点内 if 也够；权限随数据动态变化时
（审批流多级签核、按属性组合计算），角色模型表达不了，该上策略引擎——OPA、
Cedar 这类把"允许/拒绝"规则外置成独立决策组件的方案。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| 端点内 if | 判断与业务混写，靠自觉 | 一两个端点的极小场景 |
| 依赖链 | 分层复用，进入端点前统一拦截 | 固定角色 + 资源归属（本篇） |
| 策略引擎 | 规则外置、可动态计算 | 多条件组合、频繁变更的授权 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（Python 3.13、fastapi、httpx、pyjwt、bcrypt），
未创建则先在 fastapi 目录执行 `fastapi/scripts/load_resources.sh`。

演示应用在本目录 main.py：预置用户 alice（admin）与 bob（user），文档两篇（doc1
归 alice，doc2 归 bob），由 uvicorn（FastAPI 配套的 ASGI 服务器，监听端口并把
HTTP 请求翻译成对应用的调用）托管在端口 8918。

```bash
cd fastapi/18_rbac && ./18_rbac.sh demo
```

demo 共 6 章：401/403 对照表、未登录被拦、角色不足被拒、admin 放行、对象级归属、
分层结构总览。真实输出（节选，`...` 处省略了中间输出）：

```text
    $ GET http://127.0.0.1:8918/docs-list   (无 Authorization 头)
        -> HTTP 401  detail='未登录：请在 Authorization 头携带 Bearer 令牌（先 POST /token）'
        [PASS] 无令牌 -> 401  (实测 401)
        [PASS] WWW-Authenticate: Bearer 响应头存在  (Bearer)
...
        -> HTTP 403  detail='角色权限不足：本操作需要 admin 角色，你的角色是 user'
        [PASS] bob 调 POST /docs -> 403  (实测 403)
        [PASS] 403 没带 WWW-Authenticate(那是 401 的规范要求)
...
        -> HTTP 201  {'id': 3, 'title': '发布清单 v1（alice 建）', 'owner': 'alice'}
        [PASS] alice 调 POST /docs -> 201  (实测 201)
...
    $ DELETE /docs/2  (bob 的令牌; doc2 的 owner 就是 bob)
        -> HTTP 204
        [PASS] bob 删自己的文档 -> 204  (实测 204)
    $ DELETE /docs/1  (bob 的令牌; doc1 的 owner 是 alice)
        -> HTTP 403  detail='对象权限不足：文档 1 的 owner 是 alice，你不是 owner 且不具备 admin 角色'
        [PASS] bob 删 admin 的文档 -> 403  (实测 403)
...
  演示完成: 19 项断言全部通过
```

诚实预期：每次 POST /token 签发的 JWT（JSON Web Token，自带签名与过期时间的
令牌格式）都不同——iat/exp 时间戳在变，令牌内容不可断言；脚本断言的只有状态
码、WWW-Authenticate 头与 detail 文案。两次实测均 19 项断言全绿，新文档 id
恒为 3。

## How It Works

401 与 403 的分界线是"服务器是否已把请求关联到已知用户"。没带令牌或令牌无效，
服务器不知道请求来自谁，返回 401 并按 RFC 6750 携带 `WWW-Authenticate: Bearer`
响应头，告诉客户端凭证该怎么带。

带了有效令牌但身份不够格，服务器明确知道是谁、缺什么，返回 403，无须再带该头。
demo[2] 与 demo[3] 的现场正是分界线的两侧。

require_role 是一个依赖工厂（呼应 lab 10）：调用它得到的不是布尔值，而是一个
依赖函数，角色名被闭包捕获进 role_checker。

判断逻辑只写一遍，不同角色各生成一份；每次调用返回新函数对象，而 FastAPI 以
函数对象为缓存键，所以 require_role("admin") 与 require_role("user") 是两个
互不共享结果的依赖。

对象级依赖 get_doc_and_check_owner 的签名决定了它必须同时收两样东西：doc_id
来自路径参数（FastAPI 按参数名匹配），user 来自 Depends(get_current_user)。

缺前者无从谈起归属，缺后者不知道在替谁判断——这正是对象级与角色级的签名差异。
demo[5] 的 204 与 403，是同一个依赖对不同资源的两次分支。

三层都经由 get_current_user 取用户，FastAPI 的每请求依赖缓存（同一请求内同一
依赖函数只执行一次，见 lab 06）保证 JWT 只解码一次：router 级 require_login 与
端点级闸共享同一次解码结果。demo[6] 的文字结构图即这三层的叠加关系。

## Pitfalls & Q&A

- **角色写进 JWT 后无法即时吊销**：令牌签发后在过期前一直有效，把 role 放进令牌
  载荷，服务端改角色、封禁用户都要等令牌过期才生效。解法：令牌只放身份标识
  （sub），角色与状态每次从服务端读取——main.py 里 get_current_user 的做法。
- **403 泄漏资源存在性**：对"别人的私有文档"返回 403，等于承认资源存在，攻击者
  可据此枚举 id。常见做法：不可读的资源一律 404。本篇文档列表对登录用户公开，
  为教学保留 403/404 区分（demo[5] 的第三个分支，不存在的文档返回 404）。
- **对象级判断漏在业务层**：归属检查写在某个端点函数体内，新端点就可能忘了抄
  这段判断。解法：做成依赖（get_doc_and_check_owner），授权在进入端点前完成，
  "忘记"在结构上不再可能。
- **依赖顺序带来的执行开销**：bcrypt（慢哈希算法，慢是它抗暴力破解的手段）与
  JWT 解码都不便宜。每请求缓存挡住了同一依赖的重复执行，挡不住多个依赖各做一遍
  认证——认证逻辑只写 get_current_user 一处，角色闸里别再解一次令牌。
- **Q：DELETE /docs/{id} 为什么不用 require_role("admin")？** 挂了角色闸，bob
  就永远删不掉自己的文档；对象级依赖把"admin 或 owner"写成一条规则，两个角色
  各自该过的闸各自过。
- **Q：端点还要不要自己声明 get_current_user？** 分两种：用角色闸返回值时
  （`Annotated[User, Depends(require_role("admin"))]`）授权与取用户一举两得；
  只挂 require_login 的端点（如 /docs-list）再声明一次 get_current_user 即可，
  缓存使它没有额外的解码开销。
- **Q：客户端分别该怎么处理 401 与 403？** 401 引导登录或刷新令牌后重试；403
  提示无权限即可，原样重试没有意义——服务器已经明确知道是谁、缺什么。
