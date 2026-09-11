# 07 · 蓝图与登录认证：书签应用（Flask 段收官）

> 前三站学的零件——上下文（04）、模板表单（05）、ORM（06）——这一站组装成完整应用：
> **应用工厂 + auth/links 双蓝图 + SQLAlchemy + 登录限流**的书签服务。四个验收点全部
> test_client 实测：两个 create_app 实例数据互不可见；注册→登录→加书签→登出全流程
> 的每个状态码；用户表里只有 scrypt 哈希没有明文；连错 5 次密码后**正确密码也进不来**。

## 1. 为什么需要它

单文件实验教会了零件，真实项目问的是组织方式：**几十个视图怎么分区**（蓝图 + url_prefix）、**配置怎么按环境切换**（应用工厂 + test_config）、**"登录态"在请求之间怎么流转**（session 存 user_id → before_app_request 装载 g.user → 蓝图守卫统一拦截）。再加两道安全底线：密码绝不能明文落库（werkzeug scrypt），登录接口必须扛暴力破解（失败计数锁定）。这四件事没有一个能靠"背概念"回答，本实验全部用断言钉死。

## 2. 总览：核心机制一图看懂

![书签应用：从注册到加书签的完整防线](images/flask_auth_app.svg)

一句话心智模型：**注册把密码变成哈希，登录把身份变成 session，守卫把 session 变成 g.user——三层各管一段，谁也不越界**。看图主路径是合法用户的六站流水线；下方两条拒绝路径是"连错 5 次 → 429"与"未登录 → 302"，它们分别由 login 视图与 links 蓝图守卫把守。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/07_flask_auth_app/images/flask_auth_app.html)
> （或本地打开 [`images/flask_auth_app.html`](images/flask_auth_app.html)）。

## 3. 快速开始

```bash
cd web/07_flask_auth_app
source ../.venv/bin/activate
python3 flask_auth_app.py    # 完整演示（4 个小节，内置验收断言）
```

真实输出节选（macOS, CPython 3.14 · Flask 3.1.3）：

```
========================================================
[1. 应用工厂与蓝图注册：create_app 的隔离性（验收点）]
========================================================
  蓝图注册: ['auth', 'links']；url_map 含 /auth/* 与 /links/*（url_prefix 分区）
  app A 注册了 alice；app B 用户数 = 0——同一份代码，两个独立世界

========================================================
[2. 全流程：注册 / 登录 / 加书签 / 登出 / 未登录守卫（验收点）]
========================================================
  未登录 GET /links/ → 302 → /auth/login（蓝图 before_request 守卫）
  注册成功 → 302；错误密码登录 → 401（错误文案与剩余次数回显）
  正确密码登录 → 302 → /links/（session 存 user_id）
  添加书签 → 列表页显示「Flask 官方文档」· 我的书签（1）

========================================================
[3. 密码只存哈希：直接查库验证（验收点）]
========================================================
  用户表 password_hash = scrypt:32768:8:1$IRJGDITdFuOGgLt5$be...
  明文 'wonderland' 不在库里（scrypt 单向哈希，盐值内嵌格式串）

========================================================
[4. 限流：5 次错误后锁定，正确密码也进不来（验收点）]
========================================================
  连续 5 次错误密码 → 5 × 401（每次提示剩余次数）
  第 6 次（仍错误）→ 429 Too Many Requests
  锁定后用【正确】密码 → 仍是 429：锁定检查先于密码校验，爆破没有第二次机会
```

诚实预期：

- **本应用表单未挂 CSRFProtect**：教学聚焦蓝图/工厂/认证；真实上线必须补上（项目 5 的 `CSRFProtect(app)` 一行即可，本应用表单结构完全兼容）
- **用户不存在与密码错误返回同一响应**（都是 401）：防用户名枚举；但失败计数器只存在于已注册用户身上，探测者可借此推断用户名是否存在——生产应把计数也记在 IP 维度
- **限流是纯计数器**：无时间窗（15 分钟自动解锁需自己加）、不按 IP、重启即清零——生产补强清单见 §4 输出末行
- **运行后不落任何文件**：全部 sqlite 库建在 `tempfile.TemporaryDirectory`，进程退出自动清理

## 4. 核心概念

### 4.1 应用工厂：create_app(test_config)

工厂把"创建应用"变成函数调用：每次产出独立实例——各自的 `SECRET_KEY`、各自的 engine、各自注册蓝图。§1 实测两个实例：A 注册了 alice，B 的用户表是空的。这正是测试环境（内存库）、开发（本地库）、生产（远端库）共用一份代码的方式，也是 Flask 官方教程与大型项目的标准起手式。`app.teardown_appcontext(close_db)` 则保证每个请求结束时 session 被关闭——项目 6 的"一请求一 session"落地。

### 4.2 双蓝图与登录态流转

auth 蓝图（`url_prefix="/auth"`）管注册/登录/登出；links 蓝图（`/links`）管书签。登录态三级流转：**登录成功 → `session["user_id"]`**（签名 Cookie 承载，项目 3 的签名 cookie 思想）；**每个请求开始 → `before_app_request` 查库装 `g.user`**（app 级钩子，项目 4 的 g）；**links 蓝图 `before_request` 检查 g.user**——蓝图级守卫一处声明，全蓝图视图生效，未登录一律 302 去登录页。

### 4.3 密码哈希：scrypt 与单向性

`generate_password_hash`（werkzeug，默认 scrypt）产出 `scrypt:32768:8:1$盐$哈希` 格式串——参数、盐、哈希自包含，校验时 `check_password_hash` 原样解析。§3 直接开 sqlite 文件查表：明文不在库里。哈希的意义：拖库也拿不到密码（只能离线暴力试）；scrypt 的内存难度让 GPU 暴力破解贵到肉疼。

### 4.4 登录限流：先于密码校验的闸门

`failed_attempts` 计数器挂在用户行上：错误一次 +1，成功登录清零；达到 5 次后，login 视图**第一件事**就是返回 429——密码对错根本不看。§4 的关键断言是"锁定后用正确密码仍 429"：如果闸门放在密码校验之后，攻击者猜中密码的那一次就登进来了，限流形同虚设。

## 5. 关键代码解析

**为什么登录成功要 `session.clear()` 再写入 user_id？**

```python
user.failed_attempts = 0
db.commit()
session.clear()                  # 防会话固定（session fixation）
session["user_id"] = user.id
```

如果登录前后 session 是同一个，攻击者预先种下的 session 值（同站 XSS 或共享电脑场景）在登录后依然有效——先清空再写入等于换了新身份载体。项目 3 讲过签名 cookie 防篡改；clear + 重写是"换票不补票"。

坑清单：

- **密码哈希校验写成 `if user.password_hash == password`**：等于明文比较；永远 `check_password_hash`，它做恒时比较且解析盐
- **"用户不存在"与"密码错误"返回不同提示**：帮攻击者枚举有效用户名；两者统一 401 同文案
- **锁定闸门放在密码校验之后**：本实验 §4 专门断言正确密码也被 429——顺序错了限流就是筛子
- **把业务逻辑写进 `__init__.py`**：工厂只负责装配（配置/扩展/蓝图），视图全在蓝图模块里；`__init__.py` 超过 40 行就该反思
- **忘了 teardown 关 session**：连接积压、SQLite 锁库；`teardown_appcontext` 一行根治（本项目 db.py 现成）

## 6. 文件结构

```
07_flask_auth_app/
├── README.md                              # 本教程文档
├── flask_auth_app.py                      # 主演示脚本：工厂/全流程/哈希/限流四节实测
├── bookmark_app/
│   ├── __init__.py                        # create_app 工厂：装配配置、蓝图、teardown
│   ├── db.py                              # User/Link 模型 + 每请求 session（g）+ 哈希助手
│   ├── auth.py                            # auth 蓝图：注册/登录/登出/限流/before_app_request
│   ├── links.py                           # links 蓝图：列表/添加 + 蓝图级登录守卫
│   └── templates/
│       ├── base.html                      # 骨架：导航按 g.user 切换 + flash 区
│       ├── auth/login.html                # 登录表单
│       ├── auth/register.html             # 注册表单
│       └── links/index.html               # 书签列表 + 添加表单
└── images/
    ├── flask_auth_app.json                # 图源（typed JSON IR，可编辑重渲染）
    ├── flask_auth_app.html                # 交互示意图（浏览器打开）
    └── flask_auth_app.svg                 # 双主题矢量图（本 README §2 内嵌）
```

`flask_auth_app.py` 内容：`new_client()` 工厂产独立实例 / `demo_factory()` 蓝图注册与数据隔离（验收点）/ `demo_full_flow()` 全流程状态码断言（验收点）/ `demo_hash_only()` 直接查库验证 scrypt（验收点）/ `demo_rate_limit()` 5 锁 429 与"正确密码也进不来"（验收点）。环境：`web/.venv`（flask + sqlalchemy，DB 走 tempfile 自动清理）。

## 7. 深入要点

**Q1: 什么是应用工厂模式？解决什么问题？**
把"创建 Flask 应用"封装成 `create_app(config)` 函数：支持多实例（测试/开发/生产不同配置）、避免循环导入（扩展绑定延迟到工厂内）、配合蓝图实现大项目拆分。代价是视图里不能直接 import app 变量，要用 current_app。

**Q2: 蓝图是什么？和直接写在 app 上比好在哪？**
蓝图是"可注册的视图集合"：自带 url_prefix 分区、可独立成模块/可复用（一个 admin 蓝图挂到任何项目）、支持蓝图级 before_request 等钩子（本项目 links 的登录守卫只写一处）。

**Q3: 描述一次带登录态的请求在 Flask 里经过的完整链路。**
WSGI 收到请求压上下文栈（04）→ before_app_request 从 session 读 user_id 装载 g.user → 蓝图守卫检查 g.user → 视图通过 g.db 拿 session 查库（06）→ after_request/teardown 收尾关 session → 弹栈。登录态的载体是签名 session Cookie（03）。

**Q4: 密码为什么必须哈希存储？scrypt/bcrypt/argon2 的共同点？**
拖库防护：单向哈希+盐使明文不可逆。三者都是**慢哈希**（刻意耗 CPU/内存，暴力破解成本高），且盐内嵌格式串。与之对比 SHA256 是快哈希，GPU 每秒数十亿次，不适合存密码。

**Q5: 登录接口的防爆破清单？**
失败计数锁定（本实验，注意先于密码校验）、计数带时间窗自动解锁、按 IP+账号双维度、验证码/递增延迟、统一"用户不存在/密码错误"响应防枚举、全站 HTTPS。

## 8. 总结

1. **工厂 + 蓝图是 Flask 项目的标准骨架**：多实例隔离实测成立，视图分区、守卫一处声明
2. **登录态三级流转**：session 存 id → before_app_request 装 g.user → 蓝图守卫拦截，每级各司其职
3. **密码只存 scrypt 哈希**：直接查库断言无明文——这是可以用 SQL 验证的安全底线
4. **限流的正确姿势是"先于密码校验"**：锁定后正确密码也 429，爆破者猜中也没有用
5. **Flask 段（04-07）收官**：上下文、模板、ORM、组织方式全部到位——下一篇进入 [08 · Pydantic 校验与自动文档](../08_fastapi_pydantic/README.md)，FastAPI 段开篇：类型驱动的新范式
