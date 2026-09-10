# 03 · Cookie 与 Session 手写：无状态 HTTP 上的登录态

> 前两篇里每个请求都是陌生人——HTTP 无状态。本实验亲手实现"记住你是谁"的两种存法：
> **服务端 session**（cookie 只放随机号牌，状态在服务器）与**客户端签名 cookie**
> （状态放 cookie 本体，HMAC 签名防篡改——JWT 的直系祖先）。签发、携带、校验、
> 篡改、过期全流程用 `http.client` 实测断言，安全属性逐个点名。

## 1. 为什么需要它

`Set-Cookie` 一行谁都会写，但三个问题不亲手做过就答不清：**登录态到底存在哪**——服务端 dict 里还是用户浏览器里？两种存法的安全边界完全不同（吊销能力 vs 无状态成本）；**HMAC 签名防的是什么**——只防篡改不防过期，也不防"整个 cookie 被原样偷走"；**Set-Cookie 的安全属性各挡什么攻击**——`HttpOnly` 挡 XSS 偷 cookie，`SameSite` 挡 CSRF 跨站携带。本实验把两种模式从签发到拒绝路径全部跑通，四个验收断言（登录 200 / 无 cookie 401 / 篡改 401 / 过期 401）全部真实触发。

## 2. 总览：核心机制一图看懂

![登录态的签发与校验：两种存法](images/cookie_session.svg)

一句话心智模型：**登录 = 用一次账号密码换一张长期饭票；校验 = 验票（存在性/HMAC）+ 验期（exp）两关**。看图主路径是签发到 200 的happy path；下方两条拒绝路径分别对应"裸请求"与"票面被改或已过期"——本实验的三条 401 全部走的是这两条路。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/03_cookie_session/images/cookie_session.html)
> （或本地打开 [`images/cookie_session.html`](images/cookie_session.html)）。

## 3. 快速开始

```bash
cd web/03_cookie_session
python3 cookie_session.py    # 完整演示（4 个小节，内置验收断言，零第三方依赖）
```

真实输出节选（macOS, CPython 3.14；服务端口每次由内核分配）：

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

========================================================
[3. 客户端签名 cookie 模式：状态在客户端，HMAC 防篡改]
========================================================
  cookie 值 = payload.签名: YWxpY2V8MTc4OTA1ODA0...4b7de4bd69ecb1bf
  payload 解码 = 'alice|1789058041'（用户名|过期时间戳，明文但不可改）
  原样携带 → 200（欢迎回来, alice · 这是受保护页）
  payload 改成 mallory、签名不动 → 401（HMAC compare_digest 不过）

========================================================
[4. 过期校验：签名合法也救不了过期的登录态]
========================================================
  签发的 payload: 'alice|1789054431'（exp 已是过去）
  签名本身合法（SECRET 没变）→ 仍 401：签名防篡改，不防过期

========================================================
全部断言通过 ✓ 登录 200 + 安全属性齐全、无 cookie 401、篡改 payload 401、过期 401
```

诚实预期：

- **session 表里每次登录都多一行**：§1 与 §2 各登录一次，`SESSIONS` 里可见两条记录——真实系统还需要过期清理（服务端 Expire 旧键），本实验为教学保持最小实现
- **SECRET 是硬编码的演示值**：生产必须从环境变量/密钥管理注入；泄露 SECRET = 全部签名 cookie 可被伪造，这是签名 cookie 模式最大的软肋
- **payload 是明文 base64**：签名 cookie 不保密、只防篡改——密码之类绝不能放进 payload，这正是后面 JWT 课文反复强调的"signed ≠ encrypted"

## 4. 核心概念

### 4.1 服务端 session：cookie 只是取号牌

登录成功后服务端生成 `secrets.token_hex(16)` 作 sessionid，状态 `{user, exp}` 存进 `SESSIONS` dict，cookie 里只带这个随机号牌。每次请求查表 + 查过期即可恢复登录态。代价与收益都在"状态在服务端"：**吊销 = 删一行**（logout 的全部实现）；水平扩展需要共享存储（Redis）——多台服务器必须看得到同一张表。

### 4.2 客户端签名 cookie：状态在用户手里

把状态本体 `alice|过期时间戳` base64 后附上 `HMAC-SHA256(SECRET, payload)` 前 32 位十六进制，格式 `payload.签名`。校验两关：`hmac.compare_digest` 验签（恒时比较，防时序侧信道）→ 解码查 exp。**服务端零存储**，天然适合分布式；但 cookie 发出去就收不回——无法单点吊销，只能换 SECRET（全员掉线）或等它过期。JWT 的 header.payload.signature 三段式就是这一格式的工业级放大。

### 4.3 Set-Cookie 的安全属性：每个都挡一种攻击

| 属性 | 挡什么 | 不挡什么 |
|:---|:---|:---|
| `HttpOnly` | XSS 脚本 `document.cookie` 偷 cookie | 网络层截获 |
| `SameSite=Lax` | CSRF 跨站请求自动携带 | 站内 XSS |
| `Max-Age=3600` | 浏览器侧过期后继续携带 | 服务端校验缺失 |
| `Path=/` | 其他路径误携带 | 同路径下的读取 |

关键认知：**浏览器侧过期（Max-Age）与服务端校验（exp）缺一不可**——只设前者，抓包重放旧 cookie 依然畅通；§4 的过期实验证明的就是"签名合法 ≠ 可以通行"。

### 4.4 校验顺序：先验签、再验期

过期检查必须放在验签**之后**且同样执行：如果先查 exp 再验签，攻击者可以用"过期时间填无穷大"的 payload 配不上合法签名绕过时序差；先验签后验期则每一步都在已认证的数据上操作。`hmac.compare_digest` 替代 `==` 则堵住逐字节比较的计时侧信道。

## 5. 关键代码解析

**为什么 `check_cookie` 里两种模式都先"取出再检查"而不是 try/except？**

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

cookie 是**用户可控输入**：格式错误、base64 非法、exp 不是数字都是常态而非异常。防御性解析的每一层失败都安静地落到 `return None`（401），绝不让恶意构造的输入把请求变成 500——把"输入不可信"刻进形状里。

坑清单：

- **`sessionid` 用 `random` 生成**：可预测的 sid 等于没锁；必须用 `secrets`（CSPRNG）
- **签名比较用 `==`**：普通比较短路返回，逐字节耗时差可被测量（时序攻击）；`compare_digest` 恒时
- **只设 `Max-Age` 不做服务端过期检查**：浏览器删了 cookie 不等于服务端认可失效——抓包重放照样 200
- **签名 cookie 里放敏感信息**：base64 一秒解开，signed ≠ encrypted；要保密就走服务端 session 或 JWE

## 6. 文件结构

```
03_cookie_session/
├── README.md                            # 本教程文档
├── cookie_session.py                    # 主演示脚本：两种模式签发/校验/篡改/过期实测
└── images/
    ├── cookie_session.json      # 图源（typed JSON IR，可编辑重渲染）
    ├── cookie_session.html      # 交互示意图（浏览器打开）
    └── cookie_session.svg       # 双主题矢量图（本 README §2 内嵌）
```

`cookie_session.py` 内容：`issue_session()`/`issue_signed_cookie()`/`check_cookie()` 两种模式的核心逻辑（与 HTTP 层解耦）/ `LabHandler` 登录与受保护页（Set-Cookie 属性逐个点名）/ `post_login()`/`get_protected()` 手写测试客户端 / 四个 demo 小节（验收点：§2 无 cookie 401、§3 篡改 401、§4 过期 401）。

## 7. 面试要点

**Q1: Cookie 和 Session 的关系与区别？**
Cookie 是浏览器存储并自动回带的 HTTP 头机制；Session 是"状态存服务端、cookie 只存 sessionid"的登录态方案。Session 依赖 Cookie（或 URL 重写）携带标识，本质是同一枚硬币的两面。

**Q2: 服务端 session 和客户端签名 cookie（JWT）怎么选？**
需要即时吊销（封号、踢人、改密）选 session+共享存储；无状态水平扩展、跨服务信任选签名 cookie/JWT，代价是吊销困难（黑名单/短过期+refresh token 打补丁）。

**Q3: HMAC 签名的 cookie 安全边界在哪？**
防篡改（SECRET 不泄露时 payload 不可改）、不保密（base64 明文可读）、不防窃取（整个 cookie 被偷走就能原样重放）、不防过期重放之外还需服务端查 exp。

**Q4: CSRF 和 XSS 分别怎么威胁登录态？防御是什么？**
XSS：脚本读 `document.cookie` 外传——`HttpOnly` 让 JS 读不到。CSRF：恶意站点诱导浏览器带着 cookie 发跨站请求——`SameSite=Lax/Strict` 限制跨站携带 + CSRF token 校验。

**Q5: 为什么比较签名要用 `compare_digest`？**
普通 `==` 短路返回，比较耗时随匹配前缀长度变化，攻击者可逐字节猜出合法签名（时序侧信道）。`compare_digest` 恒时完成比较，消除这条信息泄漏通道。

## 8. 总结

1. **登录态两种存法**：服务端 session（可吊销、要共享存储）vs 签名 cookie（无状态、发出收不回）
2. **校验两关**：验票（查表/HMAC）+ 验期（exp），顺序不可颠倒，比较必须恒时
3. **Set-Cookie 属性各挡一种攻击**：HttpOnly 对 XSS、SameSite 对 CSRF、Max-Age 管浏览器侧
4. **签名防篡改不防过期不防窃取**：安全属性要说清楚"防什么"，更要说清楚"不防什么"
5. 至此第一阶段零依赖三课完毕——下一篇 [04 · Flask 最小应用](../04_flask_request_context/README.md) 进入框架时代，看 Flask 怎么把这三课封装成 `session` 对象与装饰器

### 🏁 第一阶段小结（项目 1-3 · 零依赖地基）

WSGI 合约（01）→ HTTP 字节层（02）→ 会话机制（03）：三课拼起来正好是一个微型 Web 框架的全部地基。从这里开始进入框架时代——每学一个"魔法"，都回头指认它是哪一课的哪一层封装。
