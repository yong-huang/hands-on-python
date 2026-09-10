# 12 · JWT + OAuth2 认证：签名 cookie 思想的工业级放大

> FastAPI 段收官。项目 3 手写的 HMAC 签名 cookie，在 JWT 里变成了工业标准的三段式
> `header.payload.signature`——**签名防篡改、不保密、不防过期**的结论原样成立。
> 本实验用 FastAPI 的 OAuth2PasswordBearer + PyJWT + bcrypt 搭出完整认证链：
> 登录签发 → 依赖解码验签 → 四路 401（缺失/篡改/错密钥/过期）全部实测。

## 1. 为什么需要它

JWT 是面试必考、实战必用的认证方案，但多数教程止步于"能跑通"。四个必须亲手验证的点：**exp 是独立的一关**——过期 token 的签名完全合法，仍然必须 401（实测 `ExpiredSignatureError`）；**密钥即主权**——攻击者用自己的密钥签出格式完美的 token，验签照样拒之门外；**用户表只有 bcrypt 哈希**——直接打印断言无明文；**统一 401 文案**——错误密码与用户不存在同响应，掐断用户名枚举。四条全在本实验的断言里。

## 2. 总览：核心机制一图看懂

![JWT 认证全链路：签发与三关校验](images/fastapi_jwt_auth.svg)

一句话心智模型：**登录用 bcrypt 换信任，签发把信任装进 token；此后每个请求靠"验签 + 过期"两关重放信任——服务端不再存会话状态**。看图主路径是三关全过的 happy path；下方两条拒绝路径分别守在密码校验（401 统一文案）与 token 解码（四路 401）两道闸口。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/12_fastapi_jwt_auth/images/fastapi_jwt_auth.html)
> （或本地打开 [`images/fastapi_jwt_auth.html`](images/fastapi_jwt_auth.html)）。

## 3. 快速开始

```bash
cd web/12_fastapi_jwt_auth
source ../.venv/bin/activate
python3 fastapi_jwt_auth.py    # 完整演示（3 个小节，内置验收断言）
```

真实输出节选（macOS, CPython 3.14 · FastAPI 0.141.1 + PyJWT 2.13.0 + bcrypt 5.0.0）：

```
========================================================
[2. 四路 401：缺失、篡改签名、错误密钥、过期 token（验收点）]
========================================================
  ① 无 token              → 401（OAuth2PasswordBearer 直接拦下）
  ② 篡改签名段            → 401（HS256 验签不过）
  ③ 错误密钥签发的 token  → 401（SECRET 不对，签名必然不匹配）
  ④ 过期 token（exp=过去）→ 401（jwt.decode 抛 ExpiredSignatureError）
  项目 3 的结论原样成立：签名防篡改，不防过期——所以 exp 校验是独立的一关

========================================================
[3. 用户表只存 bcrypt 哈希（验收点）]
========================================================
  users 表: {'alice': '$2b$12$/o0mU9Nep2J6cXwwe...'}
  错误密码登录 → 401（与'用户不存在'同文案）
```

诚实预期：

- **/token 的参数用 query string 简化**：标准 OAuth2 password flow 用表单编码（`OAuth2PasswordRequestForm`），且必须走 HTTPS——演示环境从简，README 明确标注差异
- **用户表是进程内 dict**：教学聚焦认证链路本身；落库版本（bcrypt 哈希列 + 失败计数）见项目 7 的书签应用，两者结构一致
- **HS256 密钥 ≥32 字节**：第一版用 15 字节密钥被 PyJWT 的 `InsecureKeyLengthWarning` 当场教育（RFC 7518 建议）——警告即规范，已如实改成长密钥

## 4. 核心概念

### 4.1 JWT 三段式与签名边界

header（算法）.payload（claims）.signature（对前两段的 HMAC）——各段 base64url 编码。payload **只是 base64，不是加密**：`sub`/`exp` 任何人可读可解，所以密码、隐私绝不能进 claims。签名保证 payload 不可篡改——改一个字符验签就挂（§2 的 ②③ 实测）。与项目 3 签名 cookie 的血缘：同一思想，多了标准化 claims 与生态互操作。

### 4.2 过期与吊销：无状态的天花板

`exp` claim 让服务端拒绝过期 token（实测 ④）——但**已签发的未过期 token 无法单方面作废**（项目 3 的"发出收不回"原样成立）。工业界的补丁：短过期（15 分钟）+ refresh token 换新、黑名单表、或 token 版本号随密码修改递增。无状态的省，要用吊销的难来还。

### 4.3 OAuth2PasswordBearer：协议级集成

`OAuth2PasswordBearer(tokenUrl="/token")` 做两件事：从 `Authorization: Bearer` 头提取 token（缺失直接 401）；告诉 Swagger 有认证——`/docs` 右上角出现 Authorize 按钮，交互测试登录后自动带 token。**认证逻辑与文档按钮是同一个声明**，这是 FastAPI 类型驱动的又一例。

### 4.4 bcrypt 与错误响应的枚举防护

bcrypt 慢哈希 + 盐、`checkpw` 恒时比较（项目 3 的时序攻击结论直接复用）。响应面：错误密码与用户不存在统一 401 "用户名或密码错误"——任何差异都是枚举用户名的侧信道。项目 7 的失败计数限流在这里同样适用（本实验聚焦 token 链路未重复实现）。

## 5. 关键代码解析

**为什么 get_current_user 把三类解码失败分开捕获？**

```python
try:
    claims = jwt.decode(token, SECRET, algorithms=[ALGO])
except jwt.ExpiredSignatureError:
    raise HTTPException(401, "token 已过期")       # 特指过期：客户端该去刷新
except jwt.PyJWTError:
    raise HTTPException(401, "token 无效")         # 签名/格式/claims 问题
```

对外统一 401，对内分开处理——前端拿到 "token 已过期" 知道该走 refresh 流程，拿到 "token 无效" 该重新登录。另外 `algorithms=[ALGO]` 白名单必不可少：不锁算法会让攻击者用 `alg: none` 或 RS256 混淆攻击绕过验签（经典 JWT 漏洞）。

坑清单：

- **HS256 密钥太短**：PyJWT 2.13 对 <32 字节密钥发 `InsecureKeyLengthWarning`（RFC 7518）——本实验第一版实测中招；密钥从环境变量注入且够长
- **payload 里放敏感信息**：base64 一解就见，signed ≠ encrypted（项目 3 的坑在 JWT 上原样重演）
- **不锁 `algorithms` 白名单**：`alg: none` 攻击让"验签"形同虚设；解码时必须显式 `algorithms=["HS256"]`
- **把 JWT 当会话存储**：claims 只放身份（sub/权限），业务状态查库——token 越大每次请求越贵，且无法中途修改

## 6. 文件结构

```
12_fastapi_jwt_auth/
├── README.md                            # 本教程文档
├── fastapi_jwt_auth.py                  # 主演示脚本：签发/四路401/bcrypt 三节实测
└── images/
    ├── fastapi_jwt_auth.json            # 图源（typed JSON IR，可编辑重渲染）
    ├── fastapi_jwt_auth.html            # 交互示意图（浏览器打开）
    └── fastapi_jwt_auth.svg             # 双主题矢量图（本 README §2 内嵌）
```

`fastapi_jwt_auth.py` 内容：`register_user` bcrypt 入库 / `make_token` 签发（sub/iat/exp，可注错密钥与过期）/ `get_current_user` 依赖（验签+过期+用户存在三关，分异常类型 401）/ `/token` 登录端点 / 三个 demo 小节（验收点：§2 四路 401、§3 哈希无明文）。环境：`web/.venv`（fastapi + pyjwt + bcrypt + httpx）。

## 7. 面试要点

**Q1: JWT 的结构与每段的作用？**
header（算法与类型）、payload（claims：sub/exp/iat 等声明）、signature（对前两段的 HMAC）。前两段 base64url 可解码，签名保证不可篡改——可读不可改。

**Q2: JWT 与服务端 session 的取舍？（项目 3/7 的对比收束）**
JWT 无状态、跨服务信任友好，代价是吊销困难（短过期 + refresh 补偿）；session 状态在服务端、可即时吊销，代价是共享存储。登录态必须可强杀选 session，微服务间信任选 JWT。

**Q3: alg: none 攻击是什么？怎么防？**
攻击者把 header 的 alg 改成 none 并去掉签名，若服务端"按 header 声明的算法验签"则验签被绕过。防御：解码时显式锁定 `algorithms=["HS256"]`，永不信任 token 自报的算法。

**Q4: refresh token 为什么要配套 access token？**
access token 短命（15 分钟）控制泄露窗口，refresh token 长命且只用于换新 access——服务端可对 refresh 单独吊销（存库）。两者分离在"无状态便利"与"可吊销安全"之间取平衡。

**Q5: 密码哈希用 bcrypt 还是 SHA256 加盐？**
SHA256 太快，GPU 每秒数十亿次暴力尝试；bcrypt/scrypt/argon2 是慢哈希（刻意耗 CPU/内存），且盐内嵌格式串。慢是特性不是缺点——把离线爆破的成本抬到不可行。

## 8. 总结

1. **JWT = 签名 cookie 的工业级放大**：三段式、标准 claims、生态互操作；防篡改不防过期不防窃取的结论原样成立
2. **四路 401 实测**：缺失（Bearer 提取层）、篡改/错密钥（验签层）、过期（exp 层）——三道闸各司其职
3. **bcrypt 慢哈希 + 统一 401 文案**：用户表无明文可断言，枚举无线索可断言
4. **FastAPI 段（08-12）收官**：类型校验、依赖注入、执行模型、管道扩展、认证——单框架能力闭环
5. 下一阶段进入 Django：[13 · MTV、ORM 与 admin](../13_django_mtv_admin/README.md) 看全家桶如何用"约定大于配置"重新组织同一套知识
