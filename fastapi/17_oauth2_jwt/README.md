# 17 · OAuth2 + JWT 完整链：表单换令牌，签名定真伪

> 用 OAuth2（授权框架，规定"令牌怎么发"）的密码授权流程签发 JWT（JSON Web
> Token，自带声明与签名的三段式令牌），bcrypt（带盐慢哈希）管密码存储，搭出
> 一条完整可验证的认证链。读完本篇，你能跑通"表单换双令牌、refresh 续期、
> 带令牌访问受保护资源"全流程，并看到密码错、篡改、类型误用、过期各 401 现场。

## Background

在没有令牌的年代，Web 应用靠会话（session）认人：登录后服务器存一张"会话 ID
→ 用户"的表，浏览器每个请求都带上会话 ID，服务器查表确认身份，登出就删记录。

这套做法在两个场景撞墙。其一，服务扩到多个实例后，会话表在一台机器的内存里，
用户的下一个请求可能落到另一台机器上，共享会话表要引入集中存储；其二，客户端
不再只有浏览器，手机 App、命令行工具、第三方服务调 API 时，cookie 并不顺手。

无状态令牌的思路随之成型：把"你是谁、到何时为止"直接写进令牌，服务器只验证
令牌不是伪造的，不再查任何表。OAuth2（定义"怎么换令牌"流程的授权框架）与
JWT（定义令牌本身格式）分别补上流程与格式两块拼图。

## What

**定义**：本实验的认证链由三层组成：OAuth2 的 password flow（拿用户名密码
直接换令牌的授权方式）定签发流程；JWT 定令牌格式——三段式字符串，声明在
中间段、末段是防篡改签名；bcrypt 定密码存储，库里只存哈希不存明文。

一个 JWT 长这样，三段以点号分隔：`eyJhbGciOi...` . `eyJzdWIiOi...` . `2f5bb0cc...`。
前两段是 base64 编码（一种把字节变成可打印字符的编码，不是加密），解码即读；
第三段是 HMAC-SHA256 摘要（用共享密钥对前两段算出的带密钥指纹）。

使用时把令牌放进 `Authorization: Bearer <token>` 请求头。Bearer（持有者令牌）
意为"谁持有谁就能用"——服务器不绑定会话或来源地址，只认令牌本身是否有效。

可以把 access 令牌想象成**游乐园的当日门票**：验票员只核对票是真票（签名）、
没过期（exp），不必回总台查购票登记簿；refresh 令牌是**办卡凭证**——当日票
过期后凭它再领一张新票，不必重新买票（重新输密码）。但和实体票不同：JWT
的内容不保密，payload 人人可读，签名只防篡改、不防窥探。

| 三段 | 内容 | 任何人可读吗 |
|:--|:--|:--|
| header | 算法声明 `{"alg":"HS256","typ":"JWT"}` | 能，解码即读 |
| payload | `sub`（为谁发）、`type`（access/refresh）、`iat`/`exp`（何时发/何时过期） | 能，base64 不是加密 |
| signature | 32 字节 HMAC-SHA256 摘要 | 读不出含义，它只是指纹 |

上下两条链：上面从表单凭据到签发双令牌，下面从 Bearer 请求到三道关卡；任一关卡不过都汇入右下的 401。

![Lab 17 · OAuth2 + JWT：颁发链与使用链的三道关卡](images/oauth2_jwt.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/17_oauth2_jwt/images/oauth2_jwt.html)
> （或本地打开 [`images/oauth2_jwt.html`](images/oauth2_jwt.html)）。

## When to Use

典型场景：前后端分离的单页应用调 API（令牌放请求头，不依赖 cookie）；移动 App
调后端（没有浏览器 cookie 可用）；多实例部署的服务（免共享会话表，任何实例
拿同一把 SECRET 都能独立验签）。

何时不用：传统服务端渲染、只有浏览器一种客户端的小站点。cookie + session 更
简单，且服务端删一条会话记录就能"立即踢下线"——JWT 没有这个开关（见
Pitfalls 的注销一条）。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| session + cookie | 服务端存状态，可即时吊销 | 单体 Web、仅浏览器访问 |
| JWT | 自包含、无状态、验证免查表 | 多实例 / 多客户端的 API |
| opaque token（不透明令牌：无含义随机数） | 每请求查表解析，可即时吊销 | 对吊销能力要求高的内网服务 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（Python 3.13、fastapi、httpx、pyjwt、bcrypt），
未创建则先在 fastapi 目录执行 `fastapi/scripts/load_resources.sh`。

演示应用在本目录 `main.py`，由 uvicorn（FastAPI 配套的 ASGI 服务器，监听端口并把
HTTP 请求翻译成对应用的调用）托管在端口 8917。预置用户 alice，密码 secret123。

```bash
cd fastapi/17_oauth2_jwt && ./17_oauth2_jwt.sh demo
```

demo 共 7 步：三段解剖、密码错 401、正常访问 /me、篡改 401、refresh 误用 401、
过期 401 与续期、双令牌对照表（401 即 HTTP"未认证"）。真实输出（节选，`...`
处省略了中间输出；令牌串每次运行都不同，payload 带签发时刻 iat/exp）：

```text
    $ POST http://127.0.0.1:8917/token  (表单: username=alice, password=***)   ->   HTTP 200
        access_token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e...sKeewH0alM
    ---------------- JWT 三段解剖 (header.payload.signature) ----------------
    header   (第1段, 算法说明书): {"alg": "HS256", "typ": "JWT"}
    payload  (第2段, 明文声明):   {"sub": "alice", "type": "access", "iat": 1791201877, "exp": 1791201937}
    signature(第3段):             32 字节二进制, hex 前 24 位: 0f620372dd0fbd11b8244fc1...
        [PASS] exp - iat = 60s (access 的设计寿命)  (实测 60s)
...
    $ GET /me  (payload: sub: alice -> mallory, 签名段原样)   ->   HTTP 401
        detail = '签名校验失败：令牌内容与签名不符（疑似篡改）'
...
    $ GET /me  (Bearer <exp=now-10s 的 access>)   ->   HTTP 401
        detail = '令牌已过期（exp 已过），请用 refresh 令牌换新'
    $ POST /refresh  (Bearer 不需要, body 带 refresh 令牌)   ->   HTTP 200
    $ GET /me  (Bearer <换来的新 access>)         ->   HTTP 200
====================================================================
  演示完成: 32 项断言全部通过
====================================================================
```

诚实预期：32 项断言稳定全过；令牌串与 iat/exp 数值每次运行都不同。过期现场
不真等 61 秒——demo 用同一个 SECRET 现场造一个 exp 在 10 秒前的令牌，它与
服务器 60 秒前签出的令牌走完全相同的校验路径（demo 章节有说明）。

## How It Works

密码存储：bcrypt 是带盐的慢哈希。生成哈希时把盐与成本因子（决定算得多慢的
参数）一起编进结果串，`$2b$12$` 里的 12 就是它；校验时 `bcrypt.checkpw` 从
串里解出参数、对明文重算再比对——只存哈希也能验密码。慢是刻意的：实测约
0.16 秒一次，拖慢的是离线破解，不是登录体验。

签名：签发时用 SECRET 对 `header.payload` 算 HMAC-SHA256，摘要放进第三段；
验证时服务器重算一遍、与令牌带来的第三段比对。demo[4] 的两次 401 都来自
这里——改 payload 或改签名本身，重算结果都对不上。

exp 的验证点在 decode 而不是 encode：`jwt.encode` 不看 exp 是否已过（demo[6]
的过期令牌就是 encode 现场造的），`jwt.decode` 验完签名后拿 exp 与当前时间
比较，早了就抛 `ExpiredSignatureError`，端点函数里把它翻译成 401。

password flow 的表单约定：username/password 以表单（`x-www-form-urlencoded`）
提交而不是 JSON——OAuth2 的线协议硬性规定；FastAPI 的 OAuth2PasswordRequestForm
按此解析，响应字段名也遵循同一套线协议约定。

type 检查为什么必不可少：签名只证明"内容没被改"，不证明"该走哪扇门"。
refresh 与 access 同 SECRET 同格式，验签一律通过；demo[5] 拦下 refresh 靠的
是 payload 里 `type` 声明的人工比对。漏掉这一步，1 小时的长命令牌就能顶替
60 秒的短命令牌。

demo[3] 的 200 印证了这套结构：`/me` 端点函数体内没有任何鉴权代码，三道关卡
全部收敛在依赖 `decode_access_claims` 里，FastAPI 在调用端点函数之前先跑完。

## Pitfalls & Q&A

- **SECRET 进了代码库**：demo 把 SECRET 写在 main.py 里是教学妥协，生产照抄
  等于把签名权公开——任何人都能自签合法令牌。解法：SECRET 从环境变量注入
  （12-factor，主张配置外置于环境的应用方法论）并定期轮换，泄露即换钥，
  所有旧令牌随之失效。
- **把敏感数据放进 payload**：demo[1] 当场解码了 payload——放手机号、身份证
  进去等于把资料印在门票背面。解法：payload 只放身份标识与时间声明；需要
  保密内容时改用 JWE（加密版的 JWT）。
- **忘验 type，refresh 顶替 access**：两类令牌同 SECRET 同格式，只验签名和
  exp 时 refresh 畅通无阻。解法：decode 后比对 `type`（demo[5] 的 401），
  把两类令牌的使用范围分开。
- **注销没有"当场作废"开关**：JWT 验证不查库，签出的令牌在 exp 之前始终
  有效，"退出登录"拦不住已泄露的那张。解法：把 access 寿命压短（本实验
  60 秒是极端演示，生产常 15 分钟），再配服务端黑名单记录到期的 refresh。
- **Q：HS256 还是 RS256？** HS256 对称，签发与验证共用一把 SECRET，适合
  签发方就是验证方的单体服务；RS256 非对称，私钥签发、公钥验证，适合
  "认证中心签发、多个服务验证"——验证方只读不写，拿不到签发能力。
- **Q：令牌在浏览器里存哪里？** localStorage 方便但有 XSS（跨站脚本）风险，
  注入的脚本读得到；HttpOnly cookie 挡住脚本但有 CSRF（跨站请求伪造）面。
  常见折中：refresh 存 HttpOnly cookie，access 只留内存、随用随取。
- **Q：access 为什么故意设 60 秒？** 为了让"过期"在 demo 里肉眼可见、可断言。
  生产取值的原则相同——能多短就多短，短到泄露窗口可接受，续期交给 refresh。
