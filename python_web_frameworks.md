# 🌐 Python Web 框架 20 小项目学习清单 · Todo List（含 1 个选做前沿）

> 通过 20 个小项目（每项目 100-350 行代码）系统掌握 Python Web 开发：先手写 WSGI/HTTP/会话打地基，再依次拿下 Flask 微框架、FastAPI 现代异步框架、Django 全家桶，最终三框架同题对比并交付一个完整容器化上线的短链接服务
> 约束：macOS Apple Silicon · Python 3.14.7（Homebrew，PEP 668 受管，必须 venv）· 全部本机可跑、零云依赖；仅第一阶段零第三方依赖，框架阶段统一 `web/.venv`（全部依赖已于 2026-09-10 实测装通，版本见文末环境配置）
> 串联机制：知识体系型——阶段即能力等级（WSGI 地基 → Flask → FastAPI → Django → 对比与交付），项目 17 为 ⛓️ 三框架同题集成点，项目 19 为 🏁 综合交付项目，项目 20 为 ⚠️ 选做前沿
> 预计周期：6 周（每天 1.5-2 小时）

## 🤖 AI 辅助提示词速查

| 场景 | 提示词 |
|:---|:---|
| **开始一个新项目** | `我要开始 Python Web 项目「[名称]」（框架：[Flask/FastAPI/Django]），目标是 [功能]。请给我完整代码约 [行数] 行，跑在 web/.venv（Python 3.14），单实验目录 web/NN_short_name/，含类型注解、中文注释、test_client/pytest 验收断言，附验收命令。只输出代码。` |
| **排障** | `我的 [框架] 应用出现 [报错/行为异常]，现象：[描述]，完整 traceback：[粘贴]。请分析根因并给最小修复。` |
| **框架对比** | `同一个 [需求] 我分别用 [框架A] 和 [框架B] 实现了，代码：[粘贴]。请从路由/校验/ORM/认证/生态五个维度对比差异并给选型建议。` |
| **生产部署审查** | `我要把 [应用] 部署到生产（uvicorn/gunicorn + Docker + nginx），当前配置：[粘贴]。请审查 worker 数/超时/日志/环境变量并给改进清单。` |

## 📊 总进度

进度：░░░░░░░░░░░░░░░░░░░░ 0/20 (0%)

| 阶段 | 项目数 | 已完成 |
|:---|:---:|:---:|
| 第一阶段：Web 地基（零依赖手写） | 3 | 0 |
| 第二阶段：Flask 微框架 | 4 | 0 |
| 第三阶段：FastAPI 现代 ASGI | 5 | 0 |
| 第四阶段：Django 全家桶 | 4 | 0 |
| 第五阶段：对比、部署与综合 | 4 | 0 |
| **合计** | **20** | **0** |

---

## 🗂️ 第一阶段：Web 地基（项目 1-3）

> **目标**：不靠任何框架吃透 WSGI 协议、HTTP 报文与会话机制——之后三个框架的"魔法"全是这三课的封装

### [ ] 项目 1：WSGI 最小应用手写

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~130 行 |
| **核心知识点** | WSGI 协议两件套（environ、start_response）、"应用就是可调用对象"（server → middleware → app 洋葱模型）、路由表分发、状态码与响应头、wsgiref.validate 合规校验 |
| **技术栈** | 仅标准库 wsgiref，零第三方依赖 ✅ |
| **验收标准** | 路由 `/`、`/hello/<name>`、不存在路径分别返回 200/200/404 且 Content-Type 正确（curl 实测断言）；用 `wsgiref.validate.validator` 包住应用后全部请求仍通过（协议合规断言）；自写日志中间件对每个请求输出"方法 路径 状态码 耗时ms"，连打 5 个不同请求日志全齐且格式一致 |
| **前置** | 无 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「WSGI 最小应用手写」。请给我完整代码约 130 行：用 wsgiref.simple_server 在 127.0.0.1:8000 起 WSGI 应用，实现 dict 路由表（含 /hello/<name> 动态段与 404 兜底）、一个日志中间件（方法/路径/状态码/耗时）并用 wsgiref.validate.validator 包裹应用证明合规，main 里附带自测：起服务线程后用 urllib 实际请求三类路径断言状态码与头，零第三方依赖，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 2：HTTP 协议观察器

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~160 行 |
| **核心知识点** | 请求行/响应行/头部逐字节拆解、socket 手搓 GET/POST 报文、Content-Length vs chunked 传输编码、keep-alive 连接复用、http.client 对照组 |
| **技术栈** | 仅标准库 socket / http.client，零第三方依赖 ✅ |
| **验收标准** | 对本地文件服务：手搓 socket GET 解析出的状态码/关键响应头/Body 与 http.client 结果逐项相等（断言）；对自写 chunked 响应服务逐 chunk 解码还原 Body，与原始内容逐字节相等（断言）；同一 socket 对象连续两次 GET 成功（keep-alive 复用断言，`sock` 对象身份不变） |
| **前置** | 项目 1 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「HTTP 协议观察器」。请给我完整代码约 160 行：① socket 手搓 HTTP GET 报文请求本地 http.server，逐行解析响应行/头/体并与 http.client 结果逐项比对断言；② 自写 5 行级 chunked 响应的 HTTP/1.1 服务，手搓客户端按 chunk-size 解码还原 Body 并逐字节断言；③ 手写支持 keep-alive 的极简服务，同一 socket 连续两次 GET 断言连接对象复用。全程打印原始报文便于观察，零第三方依赖，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 3：Cookie 与 Session 手写

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~160 行 |
| **核心知识点** | Set-Cookie 属性（Path/Expires/Max-Age/HttpOnly/SameSite）、服务端 session 存储（内存 dict + session id）、客户端签名 cookie（HMAC，itsdangerous 同款原理）、登录态校验全流程 |
| **技术栈** | 仅标准库 http.server / hmac，零第三方依赖 ✅ |
| **验收标准** | 手写客户端走完全流程并断言：POST 登录 → 响应带 Set-Cookie → 带 Cookie 访问受保护页 200 → 不带 Cookie 访问受保护页 401；篡改签名 cookie 的 payload（不动签名）后服务端 HMAC 校验失败拒绝（断言 401）；签发时 Max-Age 设为 -1 的 cookie 再访问被拒（过期生效断言） |
| **前置** | 项目 1 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「Cookie 与 Session 手写」。请给我完整代码约 160 行：用 http.server.BaseHTTPRequestHandler 实现登录（两种模式对比——服务端 session dict 存 sessionid、客户端 HMAC 签名 cookie 存 payload+签名），受保护页校验登录态并演示 Set-Cookie 各属性（Expires/Max-Age/HttpOnly/SameSite），main 里用 http.client 模拟完整登录流程并内置四条验收断言（登录 200/无 cookie 401/篡改签名 401/过期 cookie 401），零第三方依赖，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

## 🗂️ 第二阶段：Flask 微框架（项目 4-7）

> **目标**：从最贴近手写 WSGI 心智模型的微框架入手，掌握请求上下文、模板、ORM 与认证，独立交付一个带登录的多蓝图应用

### [ ] 项目 4：Flask 最小应用与请求上下文

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~150 行 |
| **核心知识点** | 路由与动态参数、request / g / current_app 三对象、应用上下文与请求上下文栈、werkzeug.local.LocalProxy 线程隔离原理、before/after/teardown 钩子、test_client |
| **技术栈** | Flask 3.1.3（✅ 2026-09-10 Python 3.14 实测装通） |
| **验收标准** | test_client 断言动态路由 /user/<name>、404 兜底、自定义 errorhandler 全部符合预期；在请求上下文外访问 request 抛 RuntimeError 且被捕获（上下文边界断言）；钩子执行顺序日志断言为 before → 视图 → after → teardown，且视图抛异常时 teardown 仍执行；两个线程各自 push 上下文写 g，值互不串（LocalProxy 线程隔离断言） |
| **前置** | 项目 1 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「Flask 最小应用与请求上下文」。请给我完整代码约 150 行：单文件 Flask 应用含动态路由与自定义 errorhandler；用工作线程演示在上下文外访问 request 抛 RuntimeError、两个线程各自写 g 互不串（LocalProxy 线程隔离）；挂 before_request/after_request/teardown_request 打日志断言执行顺序与异常时 teardown 仍执行；main 用 app.test_client() 跑全部验收断言，依赖仅 Flask，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 5：模板与表单

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~180 行（含模板文件） |
| **核心知识点** | Jinja2 模板继承/宏/过滤器/自动转义、WTForms 字段校验与渲染、CSRF token 机制（Flask-WTF）、flash 消息流转 |
| **技术栈** | Flask 3.1.3 + WTForms 3.2.2 + Flask-WTF（✅ 2026-09-10 实测装通） |
| **验收标准** | test_client 断言：缺字段/超长字段提交返回 200 且错误文案出现在响应里，合法提交 302 且数据写入存储；响应 HTML 中 `<script>` 被自动转义为 `&lt;script&gt;`（XSS 防护断言）；无 CSRF token 的 POST 被拒（400 断言），带 token 通过并写入 flash 消息（重定向后响应含消息文本） |
| **前置** | 项目 4 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「模板与表单」。请给我完整代码约 180 行：Flask + Flask-WTF 实现留言表单（base.html 模板继承 + 宏渲染字段 + flash 消息），WTForms 校验长度与必填；单文件内用 render_template_string 或临时模板目录组织，main 用 test_client 断言：非法提交 200 带错误文案、合法提交 302 落存储、script 标签被转义、无 CSRF token 被拒 400 而带 token 通过，依赖仅 flask + flask-wtf，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 6：SQLAlchemy ORM 实战

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行 |
| **核心知识点** | SQLAlchemy 2.0 声明式模型与 Mapped 注解、一对多关系与级联、session 生命周期（detached/expire 坑）、N+1 查询实测与 selectinload、Alembic 迁移 |
| **技术栈** | SQLAlchemy 2.0.52 + Alembic 1.19.2 + sqlite3（✅ 2026-09-10 实测装通） |
| **验收标准** | User/Post 两模型写种子数据，跨关系与聚合查询断言结果正确；开启 echo 统计 SQL：懒加载遍历 20 个作者的帖子产生 21 条 SQL（N+1 复现断言），加 selectinload 后降为 ≤2 条（数字断言）；alembic revision + upgrade 给 Post 加列后 PRAGMA table_info 含新列且旧行数据完好（断言） |
| **前置** | 项目 4 |
| **⚠️ 风险** | Alembic 需独立目录（alembic.ini + env.py），放在实验目录子目录下；demo 脚本里用 subprocess 调 alembic 命令完成迁移验收 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「SQLAlchemy ORM 实战」。请给我完整代码约 200 行：SQLAlchemy 2.0 声明式定义 User/Post 一对多模型，sqlite 落库；开启 echo 统计懒加载 N+1（断言 21 条 SQL）再演示 selectinload 降为 ≤2 条；演示 session detached 坑与 expire_on_commit 行为并注释解释；附 alembic 最小目录（ini + env.py + 一版迁移），demo 里 subprocess 执行 upgrade 后用 PRAGMA 断言新列存在且数据完好，依赖 sqlalchemy + alembic，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 7：蓝图与登录认证 —— 书签应用

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~250 行（应用工厂 + auth/bookmark 两蓝图 + 模板） |
| **核心知识点** | 应用工厂模式（create_app）、蓝图拆分项目结构、before_request 登录保护、werkzeug 密码哈希（scrypt）、session 登录态、注册/登录/登出全流程 |
| **技术栈** | Flask 3.1.3 + werkzeug（Flask 自带）（✅ 实测装通） |
| **验收标准** | test_client 全流程断言：注册 → 登出 → 登录 → 添加书签 → 受保护页 200，未登录直访受保护路由 302 到 /auth/login；直接读 sqlite 用户表断言密码列不含明文（只存 scrypt 哈希）；同一账户连续 5 次错误密码后触发限流，第 6 次返回 429（断言） |
| **前置** | 项目 4、5、6 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「书签应用：蓝图与登录认证」。请给我完整代码约 250 行：Flask 应用工厂 + auth（注册/登录/登出）与 bookmark（增删列表）两蓝图，sqlite 存用户（werkzeug generate_password_hash）与书签，before_request/装饰器做登录保护，错误密码连续 5 次触发简单限流；main 用 test_client 断言全流程（注册→登出→登录→加书签→200、未登录 302 到登录页、库里无明文密码、第 6 次错误密码 429），依赖仅 Flask，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

## 🗂️ 第三阶段：FastAPI 现代 ASGI（项目 8-12）

> **目标**：掌握类型驱动的现代 API 开发——校验、依赖注入、异步真相、中间件与 JWT 认证，能解释每个请求在 ASGI 栈里的真实执行位置

### [ ] 项目 8：Pydantic 校验与自动文档

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~160 行 |
| **核心知识点** | 路径/查询/Body 参数的类型驱动校验、BaseModel 与 Field 约束（ge/max_length/pattern）、response_model 响应过滤、Pydantic v2 与 v1 差异、OpenAPI JSON 与 /docs |
| **技术栈** | FastAPI 0.141.1 + httpx（TestClient 依赖）（✅ 2026-09-10 实测：TestClient 全链路通过） |
| **验收标准** | TestClient 断言非法 payload 返回 422 且 errors 列表含违例字段名（负数进 ge=0 字段、超长字符串各一条）；response_model 把内部模型多余字段从响应 JSON 剔除（断言 key 不存在）；GET /openapi.json 断言含自定义 title 与 Item schema 定义 |
| **前置** | 项目 1（WSGI 地基；与 Flask 段无硬依赖） |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「Pydantic 校验与自动文档」。请给我完整代码约 160 行：FastAPI 应用含路径/查询/Body 三类参数、带 Field 约束的 BaseModel（ge/max_length/pattern）、response_model 过滤内部字段（如内部价 internal_price 不外泄）、自定义 title/tags；main 用 TestClient 断言：合法创建 200、负数与超长各返 422 且 errors 含字段名、响应 JSON 无被过滤字段、/openapi.json 含自定义 schema，依赖 fastapi + httpx，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 9：依赖注入系统

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~160 行 |
| **核心知识点** | Depends 链与嵌套依赖、yield 依赖的 setup/teardown（连接类资源管理）、请求级依赖缓存（use_cache）、dependency_overrides 测试替换、全局依赖 |
| **技术栈** | FastAPI 0.141.1（✅ 实测装通） |
| **验收标准** | yield 依赖打印 setup/teardown 日志，断言顺序为 setup → 视图 → teardown，且端点抛 HTTPException 时 teardown 仍执行；三层嵌套依赖执行顺序日志断言（顺序写进注释解释）；dependency_overrides 换假 DB 后测试断言生效且真依赖零调用（调用计数断言） |
| **前置** | 项目 8 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「FastAPI 依赖注入系统」。请给我完整代码约 160 行：实现三层嵌套 Depends（配置 → 会话 → 业务校验）、yield 依赖模拟 DB 连接的 setup/teardown（含端点抛异常时 teardown 仍执行）、同请求内同依赖只执行一次（use_cache 计数）、dependency_overrides 注入假 DB（真依赖调用计数为 0）；main 用 TestClient 断言全部顺序与计数，依赖 fastapi + httpx，中文注释解释依赖解析的深度优先顺序。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 10：async 端点与 ASGI 真相

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~180 行 |
| **核心知识点** | ASGI 三层（uvicorn server → Starlette app → FastAPI 路由）、def vs async def 的真实执行位置（线程池 vs 事件循环）、并发行为实测、uvicorn --workers 进程模型、anyio 线程池上限 |
| **技术栈** | FastAPI 0.141.1 + uvicorn 0.52.4（✅ 实测装通） |
| **前置** | 项目 8；另需 `python_concurrency.md` 项目 8-11（asyncio 语法已掌握，本项目不重复教） |
| **验收标准** | 实测断言三连：50 并发请求 async def（内 asyncio.sleep 0.5s）总耗时 <2s（事件循环串联等待），同负载 def（内 time.sleep 0.5s）明显更慢（比值 ≥2 断言）；端点内记录线程名——def 版为 AnyIO worker 线程、async 版为主线程（执行位置断言）；uvicorn --workers 4 压 100 请求，worker 日志收集到 ≥3 个不同 PID（多进程分发断言） |
| **⚠️ 风险** | 并发断言对机器负载敏感，阈值已放宽（<2s vs 串行需 25s）；压测用自写 httpx.AsyncClient 并发，不装额外压测工具 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「async 端点与 ASGI 真相」。请给我完整代码约 180 行：FastAPI 定义同一 IO 任务（0.5s 延迟）的 def 与 async def 两端点，端点内打印 threading.current_thread().name 证明执行位置；demo 脚本用 uvicorn 起服务（subprocess），httpx.AsyncClient 并发 50 请求实测两版本耗时（断言 async <2s 且 def/async ≥2），探测 anyio 线程池上限并打印；再用 --workers 4 起多 worker 压 100 请求断言 ≥3 个不同 PID 出现，依赖 fastapi + uvicorn + httpx，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 11：中间件、异常与后台任务

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~170 行 |
| **核心知识点** | @app.middleware("http") 请求前后时序、BaseHTTPMiddleware 与纯 ASGI 中间件差异、HTTPException 与 exception_handler 全局兜底、BackgroundTasks 响应后执行 |
| **技术栈** | FastAPI 0.141.1（✅ 实测装通） |
| **验收标准** | 自定义中间件给每个响应加 X-Process-Time 头，TestClient 断言该头存在且为正数；自定义业务异常注册 exception_handler 后返回约定 JSON（状态码 418 与 message 字段断言）；BackgroundTasks 写文件任务的完成时间戳晚于响应到达客户端的时间戳（"响应先于任务"日志断言） |
| **前置** | 项目 8、9 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「FastAPI 中间件、异常与后台任务」。请给我完整代码约 170 行：@app.middleware 记录耗时写入 X-Process-Time 响应头，自定义 BusinessError + exception_handler 返回 418 约定 JSON，BackgroundTasks 在响应返回后追加写日志文件；main 用 TestClient 断言：所有响应含正数耗时头、业务异常返回 418 与 message、后台任务完成时间戳晚于响应时间（日志双时间戳比对），并注释解释 BaseHTTPMiddleware 与纯 ASGI 中间件差异，依赖 fastapi + httpx，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 12：JWT + OAuth2 认证

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行 |
| **核心知识点** | OAuth2PasswordBearer 流程与 Swagger Authorize、JWT 签发与校验（PyJWT：HS256/exp/sub/aud）、bcrypt 密码哈希、依赖注入保护路由、token 过期与刷新语义 |
| **技术栈** | FastAPI 0.141.1 + PyJWT 2.13.0 + bcrypt 5.0.0（✅ 2026-09-10 实测：bcrypt hash/check 通过） |
| **验收标准** | 登录拿 token → 带 Bearer 访问 /me 返回 200 且 sub 为当前用户名（断言）；无 token、篡改签名的 token、用错误密钥签发的 token 三种情况均 401（三条断言）；签发时 exp 设为过去 → 被拒（过期断言）；用户表只存 bcrypt 哈希（断言无明文） |
| **前置** | 项目 9 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「JWT + OAuth2 认证」。请给我完整代码约 220 行：FastAPI + OAuth2PasswordBearer 实现 /token 登录（bcrypt 验密码、PyJWT 签 HS256 token 含 sub/exp），get_current_user 依赖解码保护 /me 路由，区分凭证异常（无效签名/过期/缺失）各自 401；main 用 TestClient 断言：登录 200 拿 token、带 token 访问 /me 200 且 sub 正确、无 token/篡改签名/错密钥签发/过期 token 四路全 401、sqlite 用户表无明文密码，依赖 fastapi + pyjwt + bcrypt + httpx，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

## 🗂️ 第四阶段：Django 全家桶（项目 13-16）

> **目标**：驾驭 batteries-included 的工程化框架——MTV 分层、自带 ORM/admin/auth、DRF 构建 REST API、信号缓存与测试体系

### [ ] 项目 13：MTV、ORM 与 admin

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行核心代码（settings/models/admin 多文件） |
| **核心知识点** | startproject/startapp 与 MTV 分层、settings 与 INSTALLED_APPS、models 与 makemigrations/migrate、QuerySet 双下划线跨关系查询与 aggregate、admin 注册与 superuser |
| **技术栈** | Django 6.1.1（✅ 2026-09-10 实测：configure + auth models 通过） |
| **验收标准** | migrate 后 PRAGMA table_info 断言表与字段齐全；ORM 三类查询（filter / 双下划线跨关系 / aggregate）结果与手写 SQL 对照一致（断言）；创建 superuser 后 test client 登录 admin 并 200 访问模型列表页（断言响应含应用名） |
| **前置** | 项目 6（ORM 概念迁移自 SQLAlchemy） |
| **⚠️ 风险** | Django 是多文件工程而非单脚本，"一个项目"= 一个最小可跑 site；主 demo 用 manage.py shell 脚本串流程 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「Django MTV、ORM 与 admin」。请在 web/13_django_mtv_admin/ 下给出完整 Django 工程：一个 blog app（Article/Author 两模型含外键）、admin 注册、fixtures 或迁移钩子灌种子数据；附 manage.py shell 脚本演示 filter/双下划线跨关系/aggregate 三类查询并与原生 SQL 对照断言，test client 登录 superuser 断言 admin 列表页 200；migrate 后用 PRAGMA 断言表结构，依赖 django，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 14：视图与表单

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行 |
| **核心知识点** | FBV vs CBV 取舍、ListView/DetailView/CreateView 泛型视图与分页、Django Form 校验与渲染、auth 组件（LoginView/LoginRequiredMixin）、messages 框架 |
| **技术栈** | Django 6.1.1（✅ 实测装通） |
| **验收标准** | test client 断言：列表页分页正确（每页 N 条，第二页内容与偏移一致）；CreateView POST 合法数据 302 且对象落库，非法数据 200 + 表单错误渲染；未登录访问 LoginRequiredMixin 视图 302 到登录页且 next 参数指向原 URL（断言） |
| **前置** | 项目 13 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「Django 视图与表单」。请给我完整代码约 200 行：同一资源 Article 分别写 FBV 与 CBV（ListView 分页 + DetailView + LoginRequiredMixin 的 CreateView + ModelForm 校验），配 LoginView 登录与 messages 提示；tests.py 用 test client 断言：分页第二页偏移正确、合法创建 302 落库、非法创建 200 带错误、未登录创建 302 到登录页且 next 正确，依赖 django，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 15：DRF 构建 REST API

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行 |
| **核心知识点** | Serializer 校验与嵌套序列化、ModelViewSet + Router 自动路由、权限类（IsAuthenticated/自定义）、分页与过滤、APIClient 测试 |
| **技术栈** | Django 6.1.1 + DRF 3.18.1（✅ 已装通；serializer 在 Django 6.1 + Python 3.14 下实测校验通过） |
| **验收标准** | APIClient 断言 CRUD 全流程状态码：匿名读 200、匿名写 401/403、登录写 201、改删 200/204；分页断言 page_size 生效且第二页切片正确；自定义 @action 路由注册成功（router.urls 含该路由）且响应内容断言通过 |
| **前置** | 项目 13、14 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「DRF 构建 REST API」。请给我完整代码约 220 行：Django + DRF 实现 Article 的 ModelSerializer（含嵌套作者信息与字段校验）、ModelViewSet + Router、IsAuthenticated 写权限 + 匿名只读、PageNumberPagination、自定义 @action（如 /articles/recent/）；tests.py 用 APIClient 断言：匿名读 200 写 401、登录创建 201、更新 200 删除 204、第二页分页切片正确、recent 路由已注册且响应正确，依赖 django + djangorestframework，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 16：信号、缓存与测试

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~180 行 |
| **核心知识点** | post_save/pre_delete 信号与审计日志、缓存框架（LocMemCache）与低级 API、@cached_property、pytest-django 夹具与 mark、coverage 覆盖率 |
| **技术栈** | Django 6.1.1 + pytest-django + pytest-cov（⚠️ pytest-django/pytest-cov 未在 2026-09-10 实测集内，开工时补装，纯 Python 低风险） |
| **验收标准** | post_save 信号在 Article 保存后自动写一行审计日志（断言日志行存在且字段正确）；低级缓存：同参数首次调用命中 DB（connection.queries 计数 +1）、第二次命中缓存查询数不再增加（断言）；pytest 全套用例全绿且 --cov 报告该 app 覆盖率 ≥80% |
| **前置** | 项目 13、15 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「Django 信号、缓存与测试」。请给我完整代码约 180 行：Article app 挂 post_save 信号自动写 AuditLog 审计行，settings 配 LocMemCache 并演示 cache.get_or_set 低级 API（用 CaptureQueriesContext 断言第二次调用零查询），模型加 @cached_property；tests.py 用 pytest-django 写全部用例（信号触发、缓存命中计数、cached_property 首算后缓存），pytest --cov 断言覆盖率 ≥80%，依赖 django + pytest-django + pytest-cov，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

## 🗂️ 第五阶段：对比、部署与综合（项目 17-20）

> **目标**：跳出单框架视角——同一道题用三个框架做一遍拿实测数据，走通生产部署，最后独立交付一个完整容器化的服务

### [ ] ⛓️ 项目 17：三框架同题对比

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~350 行（三个 60-100 行 mini app + 1 个统一验收/压测脚本） |
| **核心知识点** | 同一 TODO API（CRUD + 一个 JWT 受保护路由）三框架各实现一遍、路由/校验/ORM/认证四维写法与代码量对比、同一压测脚本下的 QPS 与 p95 实测 |
| **技术栈** | Flask + FastAPI + Django/DRF（均 ✅ 实测装通）+ httpx 自写 asyncio 压测客户端 |
| **验收标准** | 三个实现通过同一份验收脚本（同一组 HTTP 断言：创建/读取/列表/删除/无 token 401，三遍全绿）；压测脚本对三者各发 1000 请求（并发 50），输出 QPS 与 p95 对比表（数据誊进踩坑记录）；对比表覆盖四维代码行数（wc -l 实测统计，不拍脑袋） |
| **前置** | 项目 7、12、15（三框架阶段全部完成） |
| **⚠️ 风险** | 公平性控制：三者同为 sqlite、同机同条件；压测绝对值不重要，量级与方向才重要 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「三框架同题对比」。请给我完整代码约 350 行：同一 TODO API（列表/创建/读取/删除 + JWT 保护路由）分别用 Flask、FastAPI、Django+DRF 各实现一个 mini app（均 sqlite，各自 60-100 行），外加统一脚本：① 同一组 HTTP 断言依次跑三个 app 全绿；② httpx.AsyncClient 并发 50 发 1000 请求输出三者的 QPS 与 p95 对比表；③ wc -l 统计四维（路由/校验/ORM/认证）代码行数出对比表，依赖三框架 + httpx，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 18：生产部署

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行（部署脚本 + 配置 + Dockerfile） |
| **核心知识点** | gunicorn worker 模型（sync workers/preload）与 uvicorn --workers、12-factor 环境变量配置、Dockerfile 多阶段构建、nginx 反向代理、/healthz 健康检查 |
| **技术栈** | gunicorn 26.2.0（✅ 实测装通）+ Docker 29.4.0（✅ 2026-09-10 daemon 实测在运行）+ nginx（✅ Homebrew 已装） |
| **验收标准** | gunicorn -w 4 起 Flask 书签应用，压测期间 worker 日志收集到 ≥3 个不同 PID（多进程分发断言）；APP_DEBUG 环境变量切换配置生效（断言响应行为不同）；docker build + run 后容器内 curl /healthz 返回 200 且宿主机映射端口同样 200；（选做）nginx 反代 uvicorn 后经代理端口访问成功且响应头含代理痕迹 |
| **前置** | 项目 7、12 |
| **⚠️ 风险** | Docker Desktop 若未启动先 `open -a Docker` 等 daemon 就绪（2026-09-10 实测已在运行）；首次 docker build 拉基础镜像受网络影响，可换国内镜像源 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「生产部署」。请给我完整代码约 200 行：① gunicorn -w 4 部署 Flask 书签应用 + 自写压测脚本断言 ≥3 个 worker PID 有服务记录；② 12-factor 化——APP_DEBUG/SECRET_KEY/DATABASE_URL 全走环境变量，断言切换生效；③ FastAPI 应用的多阶段 Dockerfile + /healthz，docker build 后容器内外 curl 各断言 200；④ 选做 nginx 反代配置与验证，依赖 gunicorn + docker，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 🏁 项目 19：综合项目 —— 短链接服务

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~350 行（FastAPI + SQLAlchemy + JWT + pytest + Docker） |
| **核心知识点** | 全链路整合：缩短/302 重定向/点击统计/自定义码、唯一约束防碰撞与重试、同步 vs 异步 DB 栈选型（写明理由）、pytest 套件、容器化交付 |
| **技术栈** | FastAPI 0.141.1 + SQLAlchemy 2.0.52 + PyJWT + bcrypt（均 ✅ 实测装通） |
| **验收标准** | POST /shorten 得短码 → GET 短码 302 到原 URL 且点击计数落库（连点 3 次断言计数 = 3）；并发生成 200 个随机码无碰撞（唯一约束 + 冲突重试，断言全部成功且库中行数 = 200）；pytest 套件 ≥15 条全绿；Docker 镜像构建运行后 /healthz 200 且完整缩短-重定向流程在容器内跑通；不存在/过期短码返回 404（断言） |
| **前置** | 项目 8-12、18 |
| **⚠️ 风险** | 终极串联项目，工作量 ≈ 2-3 个常规项目，预留一周；先核心缩短-重定向流程，再统计/容器化 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「短链接服务（综合）」。请给我完整代码约 350 行：FastAPI + SQLAlchemy(sqlite) 实现 POST /shorten（支持自定义码、过期时间）、GET /{code} 302 重定向并累加点击计数、点击统计端点、JWT 保护的管理端点；随机码用唯一约束 + 冲突重试；pytest 套件 ≥15 条覆盖上述全部验收（并发 200 码无碰撞、连点计数、404、JWT 401），附多阶段 Dockerfile 与容器内冒烟脚本，依赖 fastapi + sqlalchemy + pyjwt + bcrypt + httpx + pytest，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

### [ ] 项目 20：⚠️ 选做——WebSocket 实时聊天室（或 Litestar 对比）

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~150 行 |
| **核心知识点** | FastAPI/Starlette WebSocket 端点与 accept/close、连接管理器广播、（替代路径）Litestar 2.24 的 DI 与 handler 风格 vs FastAPI 对照 |
| **技术栈** | FastAPI WebSocket + uvicorn（✅ 实测装通）；替代路径 Litestar 2.24.0（✅ 2026-09-10 实测 Python 3.14 装通） |
| **验收标准** | 两个 WebSocket 客户端（TestClient websocket_connect）同时连入，A 发消息断言 B 收到（广播生效）；一方断开后不再收到广播且房间人数减一（断言）；选 Litestar 路径者：同一 ping/CRUD 端点两框架各实现，DI 写法差异对照表 + 同一验收脚本双绿 |
| **前置** | 项目 11 |
| **⚠️ 风险** | 选做项目，不影响毕业；二选一即可，WebSocket 断言细节多，卡住可先在 /docs 手测再补自动化 |

**🤖 开始提示词**：
> `我要开始 Python Web 项目「WebSocket 实时聊天室」。请给我完整代码约 150 行：FastAPI WebSocket 端点 + 内存连接管理器（连入/断开维护房间人数），broadcast 广播消息带昵称与时间戳，配极简 HTML 页面用浏览器手测；main 用 TestClient websocket_connect 断言：双客户端互收消息、一方断开后人数减一且不再收到广播。或者（注明走 Litestar 路径）：同一 ping/CRUD 端点 FastAPI 与 Litestar 2.24 各实现一份 + DI 写法对照表 + 统一验收脚本，中文注释。只输出代码。`

**完成日期**：________
**踩坑记录**：________

---

## 📅 周计划

| 周次 | 内容 | 项目数 |
|:---|:---|:---:|
| **第 1 周** | 项目 1-3（Web 地基：WSGI / HTTP / 会话）| 3 |
| **第 2 周** | 项目 4-7（Flask 全阶段）| 4 |
| **第 3 周** | 项目 8-10（FastAPI：校验 / DI / 异步真相）| 3 |
| **第 4 周** | 项目 11-13（FastAPI 收尾 + Django 开篇）| 3 |
| **第 5 周** | 项目 14-16（Django 收官）| 3 |
| **第 6 周** | 项目 17-19（对比 · 部署 · 综合）+ 项目 20 选做 | 4 |

## 🏆 里程碑

- [ ] **完成项目 1-3** → **协议地基通**：手写过 WSGI 应用、HTTP 报文与会话机制，之后任何框架的"魔法"都不再黑盒
- [ ] **完成项目 4-7** → **Flask 交付者**：独立交付带认证、多蓝图、ORM 支撑的 Flask 应用
- [ ] **完成项目 8-12** → **FastAPI 工程师**：类型驱动校验、依赖注入、异步执行模型、JWT 认证全部落地，说清请求在 ASGI 栈里的真实位置
- [ ] **完成项目 13-16** → **Django 工程师**：MTV 全家桶 + DRF REST API + 信号缓存测试体系
- [ ] **完成项目 17-18** → **选型与上线**：三框架同题拿实测数据做选型，生产部署（gunicorn/uvicorn + Docker + nginx）走得通
- [ ] **完成项目 19** → **Web 全栈工程师**：独立交付完整、被测、容器化的服务
- [ ] **完成项目 20（选做）** → **实时通信入门**：WebSocket 广播或跨框架视野加餐

## 📝 每日日志

| 日期 | 项目 | 耗时 | 收获 | 踩坑 |
|:---|:---|:---:|:---|:---|
| | | | | |

## 🔧 环境配置

```bash
# 0. 已就绪（✅ 2026-09-10 本机实测）：
#    Python 3.14.7（Homebrew /opt/homebrew/bin/python3, arm64）——PEP 668 受管，pip 直装会被拒，必须 venv
#    Docker 29.4.0（daemon 实测在运行）——项目 18、19 用
#    nginx（Homebrew 已装）——项目 18 选做反代用
# 1. 一次性初始化（仓库根执行；以下版本组合 2026-09-10 全链路冒烟通过）：
python3 -m venv web/.venv
source web/.venv/bin/activate
pip install fastapi uvicorn flask flask-wtf sqlalchemy alembic \
            django djangorestframework httpx pytest pyjwt bcrypt \
            python-multipart gunicorn
#    实测版本：fastapi 0.141.1 / uvicorn 0.52.4 / flask 3.1.3 / wtforms 3.2.2 /
#    sqlalchemy 2.0.52 / alembic 1.19.2 / django 6.1.1 / drf 3.18.1 / httpx 0.28.1 /
#    pyjwt 2.13.0 / bcrypt 5.0.0 / python-multipart 0.0.32 / gunicorn 26.2.0
#    冒烟项：FastAPI TestClient 全链路 / Flask test_client / DRF serializer 校验 /
#    bcrypt hash-check / Django configure+auth models，全过
pip install pytest-django pytest-cov   # 项目 16 用（不在上述实测集内 ⚠️，纯 Python 低风险）
# 2. 每项目开工前：
source web/.venv/bin/activate && python --version && python -c "import fastapi, flask, django; print('frameworks OK')"
```

## ⚠️ 与已有清单的关系

| 已有清单 | 关系 |
|:---|:---|
| `python_interview.md`（已完成 20/20，语言机制线） | **正交互补**：那条不含 Web 主题。本清单项目 4 的 LocalProxy 会用到描述符与上下文管理器知识，项目 10 的线程池行为关联 GIL——对应实验（interview/03、08）可回头重读，其余全部为新覆盖 |
| `python_concurrency.md`（0/16，并发线） | **衔接不重复**：asyncio 语法在那条线教（其项目 8-11）；本清单项目 10 只讲 async 在 Web 端点的真实执行行为，项目 17 的压测客户端复用 asyncio 写法。做本项目 10 前建议至少完成并发线的项目 8（asyncio 入门），否则先把并发线排前 |

## 📚 来源

- [FastAPI 官方文档](https://fastapi.tiangolo.com/zh/)
- [Flask 官方文档](https://flask.palletsprojects.com/)
- [Django 官方文档](https://docs.djangoproject.com/zh-hans/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [SQLAlchemy 2.0 文档](https://docs.sqlalchemy.org/)
- [PEP 3333 – Python Web Server Gateway Interface](https://peps.python.org/pep-3333/)
- [PEP 3333 中文社区解读 + MDN HTTP 文档](https://developer.mozilla.org/zh-CN/docs/Web/HTTP)
