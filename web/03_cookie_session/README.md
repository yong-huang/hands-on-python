# 03 · Cookie 与 Session 手写：无状态 HTTP 上的登录态

> HTTP 无状态，服务器天然把每个请求都当陌生人。本实验亲手实现"记住你是谁"的两种存法：
> **服务端 session**（cookie 只放随机号牌，状态在服务器）与**客户端签名 cookie**
> （状态放 cookie 本体，HMAC 签名防篡改——JWT 的直系祖先）。签发、携带、校验、
> 篡改、过期全流程用 `http.client` 实测断言，安全属性逐个点名。

## Background

这节讲"记住你是谁"在无状态 HTTP 上是怎么一步步解决的。

HTTP 无状态（stateless——服务器对每个请求一视同仁，不记住上一次请求来自谁），可登录态恰恰需要"记住"。早期的做法是把身份塞进每次请求：在 URL 里带用户名或会话编号（URL 重写），或用 HTTP Basic Auth（一种每个请求都重发账号密码的简单认证头）反复自证身份。

痛点很明显：URL 会进服务器日志、会被 `Referer` 头带给第三方；密码每个请求都在线缆上走一遍，暴露面随流量增长。1994 年 Netscape 为购物车场景发明了 cookie（浏览器存储的小段数据，之后对同一站点的每个请求自动回带）——身份携带从此交给浏览器自动完成。

有了携带机制，剩下的问题只有一个：状态本身存在哪——服务器，还是客户端？这正是本实验两种模式分野的由来。

## What

这节回答登录态方案的三个核心问题：状态存哪、签名防什么、`Set-Cookie` 属性各挡什么。

登录态方案要解决的是：HTTP 本身不记人，如何在后续请求里识别"这是已登录的 alice"。两种存法：

- **服务端 session**：cookie 只放随机号牌（sessionid），状态 `{user, exp}` 在服务器 dict 里
- **客户端签名 cookie**：状态放 cookie 本体，附 HMAC（Hash-based MAC，用只有双方知道的 SECRET 对内容生成的校验码）签名防篡改——JWT（JSON Web Token，签名 cookie 思路的工业级标准格式）的直系祖先

三个不亲手做过就答不清的问题：

- 登录态到底存在哪——两种存法的安全边界完全不同（吊销能力 vs 无状态成本）
- HMAC 签名防的是什么——只防篡改，不防过期，也不防"整个 cookie 被原样偷走"
- `Set-Cookie` 的安全属性各挡什么攻击——`HttpOnly` 挡 XSS（跨站脚本攻击——注入页面窃取 cookie 的恶意脚本）偷 cookie，`SameSite` 挡 CSRF（跨站请求伪造——诱导已登录浏览器自动携带 cookie 发请求）

一句话心智模型：**登录 = 用一次账号密码换一张长期饭票；校验 = 验票（存在性/HMAC）+ 验期（exp）两关**。输出 §1 签发的 `Set-Cookie: sid=648d...; Max-Age=3600` 就是刚换到的一张票，票面上还印着有效期。

## When to Use

这节讲两种登录态方案各自适配什么场景，以及什么时候根本不需要它们。

典型场景：

- 给网站做登录的时候：默认选服务端 session——封号、改密、踢下线都要求"立刻生效"，删一行 session 表就完成吊销
- 做无状态 API / 多服务互信的时候：签名 cookie（或其工业形态 JWT）服务端零存储，天然适合水平扩展
- 审查存量系统的时候：看到 cookie 值是 `base64payload.签名` 的形状，就能认出签名 cookie 模式——它的攻击面与 session 完全不同

何时不用：没有用户概念的内部服务、纯静态站点不需要任何登录态机制，不要为此引入 cookie 校验。

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| 服务端 session | 状态在服务器，可即时吊销，扩展需共享存储 | 需要封号/踢人的网站 |
| 签名 cookie / JWT | 状态在客户端，零存储，吊销困难 | 无状态扩展、跨服务信任 |
| HTTP Basic Auth | 每请求重发账号密码 | 临时内部工具、调试 |
| URL 重写 | 会话编号进 URL，易泄露 | 遗留系统 |

session 与签名 cookie 的详细取舍（吊销、黑名单、refresh token 补丁）见文末 Q2。

## Quick Start

这节把两种模式从签发到拒绝的路径全部实测：四个验收断言（登录 200 / 无 cookie 401 / 篡改 401 / 过期 401）全部真实触发。

前置条件：Python 3 标准库，零第三方依赖。

```bash
cd web/03_cookie_session
python3 cookie_session.py    # 完整演示（4 个小节，内置验收断言，零第三方依赖）
```

真实输出节选（服务端口每次由内核分配）：

```
========================================================
[1. 登录与 Set-Cookie：服务器往响应里塞了什么]
========================================================
  错误密码登录 → 401（状态不过关，绝不发 cookie）
  登录成功 → Set-Cookie: sid=648da12b5fe47d1d30ea1e5eb91bce0d; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600
    · Path=/           ← 安全属性
    · HttpOnly         ← 安全属性
    · SameSite=Lax     ← 安全属性
    · Max-Age=3600     ← 安全属性
  语义: 登录成功: alice（mode=server）——cookie 只有一个随机 sid，用户名留在服务端

========================================================
[3. 客户端签名 cookie 模式：状态在客户端，HMAC 防篡改]
========================================================
  cookie 值 = payload.签名: YWxpY2V8MTc4OTA1ODA0...4b7de4bd69ecb1bf
  payload 解码 = 'alice|1789058041'（用户名|过期时间戳，明文但不可改）
  原样携带 → 200（欢迎回来, alice · 这是受保护页）
  payload 改成 mallory、签名不动 → 401（HMAC compare_digest 不过）
  无状态账：服务端不存任何东西，但 cookie 发出去就收不回——吊销靠换 SECRET 或等过期

========================================================
[4. 过期校验：签名合法也救不了过期的登录态]
========================================================
  签发的 payload: 'alice|1789054431'（exp 已是过去）
  签名本身合法（SECRET 没变）→ 仍 401：签名防篡改，不防过期
  两种模式的过期检查殊途同归：session 查 exp 字段，签名 cookie 查 payload 里的时间戳

========================================================
全部断言通过 ✓ 登录 200 + 安全属性齐全、无 cookie 401、篡改 payload 401、过期 401
```

诚实预期：

- **session 表里每次登录都多一行**：§1 与 §2 各登录一次，`SESSIONS` 里可见两条记录——真实系统还需要过期清理（服务端 Expire 旧键），本实验为教学保持最小实现
- **SECRET 是硬编码的演示值**：生产必须从环境变量/密钥管理注入；泄露 SECRET = 全部签名 cookie 可被伪造，这是签名 cookie 模式最大的软肋
- **payload 是明文 base64**：签名 cookie 不保密、只防篡改——密码之类绝不能放进 payload，这正是后面 JWT（lab 12）反复强调的"signed ≠ encrypted"

本实验用到的标准库速览：

| 工具 | 作用 |
|---|---|
| `secrets` | 密码学安全随机数（CSPRNG），生成不可预测的 sessionid |
| `hmac` | 生成与校验签名；`compare_digest` 提供恒时比较 |
| `base64` | payload 的文本编码——可逆、不保密 |
| `http.client` | 模拟客户端：携带、篡改、重放 cookie 的实测工具 |

## How It Works

这节拆两种模式的服务端实现：session 怎么查表、签名 cookie 怎么验、校验顺序为什么固定、不可信输入怎么防。

### 服务端 session：cookie 只是取号牌

登录成功后服务端生成 `secrets.token_hex(16)` 作 sessionid，状态 `{user, exp}` 存进 `SESSIONS` dict，cookie 里只带这个随机号牌。每次请求查表 + 查过期即可恢复登录态。

代价与收益都在"状态在服务端"：**吊销 = 删一行**（logout 的全部实现）；水平扩展需要共享存储（Redis——常见的内存型共享数据库），多台服务器必须看得到同一张表。输出 §1 的 `sid=648da12b...` 就是这张号牌。

### 客户端签名 cookie：状态在用户手里

把状态本体 `alice|过期时间戳` base64（把任意字节编码成纯文本的编码方式，可逆、不加密）后附上 `HMAC-SHA256(SECRET, payload)` 前 32 位十六进制，格式 `payload.签名`。

校验两关：`hmac.compare_digest` 验签（恒时比较，防时序侧信道）→ 解码查 exp。**服务端零存储**，天然适合分布式；但 cookie 发出去就收不回——无法单点吊销，只能换 SECRET（全员掉线）或等它过期。

JWT 的 header.payload.signature 三段式就是这一格式的工业级放大。输出 §3"payload 改成 mallory → 401"是验签关，§4 是验期关。

### 校验顺序：先验签、再验期

过期检查必须放在验签**之后**且同样执行：如果先查 exp 再验签，攻击者可以用"过期时间填无穷大"的 payload 配不上合法签名绕过时序差；先验签后验期则每一步都在已认证的数据上操作。`hmac.compare_digest` 替代 `==` 则堵住逐字节比较的计时侧信道。

### cookie 是用户可控输入：防御性解析

```python
if "auth" in jar and "." in jar["auth"]:
    payload_b64, sig = jar["auth"].rsplit(".", 1)
    expected = _sign(payload_b64.encode())
    if hmac.compare_digest(sig, expected):
        user, _, exp = base64.urlsafe_b64decode(payload_b64).decode().partition("|")
        if float(exp) > time.time():
            return user
return None
```

为什么"取出再检查"而不是 try/except：cookie 是**用户可控输入**，格式错误、base64 非法、exp 不是数字都是常态而非异常。防御性解析的每一层失败都安静地落到 `return None`（401），绝不让恶意构造的输入把请求变成 500——把"输入不可信"刻进形状里。

### Set-Cookie 的安全属性：每个都挡一种攻击

| 属性 | 挡什么 | 不挡什么 |
|:---|:---|:---|
| `HttpOnly` | XSS 脚本 `document.cookie` 偷 cookie | 网络层截获 |
| `SameSite=Lax` | CSRF 跨站请求自动携带 | 站内 XSS |
| `Max-Age=3600` | 浏览器侧过期后继续携带 | 服务端校验缺失 |
| `Path=/` | 其他路径误携带 | 同路径下的读取 |

关键认知：**浏览器侧过期（Max-Age）与服务端校验（exp）缺一不可**——只设前者，抓包重放旧 cookie 依然畅通；过期实验证明的就是"签名合法 ≠ 可以通行"。输出 §1 逐个点名的四个属性，对应的就是这张表。

## Pitfalls & Q&A

这节收录四个真实踩过的坑（现象 + 原因 + 解法）与选型问答。

- **`sessionid` 用 `random` 生成**：现象是 sid 可被猜中。原因是 `random` 不是 CSPRNG，可预测的 sid 等于没锁。解法是改用 `secrets`
- **签名比较用 `==`**：现象是签名可在逐字节测量中泄露。原因是普通比较短路返回，耗时差可测（时序攻击——靠测量比较耗时逐字节猜出内容）。解法是 `compare_digest` 恒时比较
- **只设 `Max-Age` 不做服务端过期检查**：现象是抓包重放旧 cookie 照样 200。原因是浏览器删了 cookie 不等于服务端认可失效。解法是服务端 exp 校验与浏览器 Max-Age 缺一不可
- **签名 cookie 里放敏感信息**：现象是 payload 被原样读出。原因是 base64 一秒解开，signed ≠ encrypted。解法是要保密就走服务端 session 或 JWE（JWT 的加密姊妹标准）

**Q1：Cookie 和 Session 的关系与区别？**

已在 What 回答：Cookie 是浏览器存储并自动回带的携带机制，Session 是"状态存服务端、cookie 只存 sessionid"的方案——Session 依赖 Cookie，同一枚硬币的两面。

**Q2：服务端 session 和客户端签名 cookie（JWT）怎么选？**

需要即时吊销（封号、踢人、改密）选 session+共享存储；无状态水平扩展、跨服务信任选签名 cookie/JWT，代价是吊销困难（黑名单/短过期+refresh token 打补丁）。
