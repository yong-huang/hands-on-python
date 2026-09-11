# 05 · 模板与表单：Jinja2 渲染与两道输入防线

> 上一篇的视图直接返回 dict——真实服务要返回 HTML。本实验把服务端渲染三件套一次配齐：
> **Jinja2 模板**（base.html 继承 + 宏渲染字段 + 自定义过滤器 + 自动转义）、
> **WTForms 校验**（必填/长度，错误文案随表单回显）、**CSRF 防线**（CSRFProtect 全局
> 拦截无 token 的 POST）。XSS 输入存得进库、渲染出来是安全文本——用 test_client
> 把"防线分层"四个字做成可断言的事实。

## 1. 为什么需要它

表单是 Web 输入的主入口，围绕它有三个必须亲手验证的安全事实：**CSRF 攻击为什么被 token 一招破解**——恶意站点诱导浏览器发跨站 POST，但拿不到埋在你表单页里的随机 token；**CSRFProtect 与 FlaskForm 校验是两道不同的闸**——前者在视图之前拦截（400），后者在视图里管格式（200 回显错误）；**转义发生在渲染出口而不是入库口**——`<script>` 能合法存进存储，Jinja2 渲染时把它变成无害文本，`|safe` 是唯一豁免口。三个事实本实验全部有断言。

## 2. 总览：核心机制一图看懂

![一次表单提交的防线流水线](images/flask_templates_forms.svg)

一句话心智模型：**GET 渲染表单时埋 token，POST 回来先过 CSRF 闸（400 拒绝）再过格式闸（200 回显），全过才落库 + flash + 302**。看图主路径是合法提交的六站流水线；下方两条拒绝路径分别是"无/伪造 token"与"字段违规"——它们发生在不同站点、返回不同状态码。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/05_flask_templates_forms/images/flask_templates_forms.html)
> （或本地打开 [`images/flask_templates_forms.html`](images/flask_templates_forms.html)）。

## 3. 快速开始

```bash
cd web/05_flask_templates_forms
source ../.venv/bin/activate
python3 flask_templates_forms.py    # 完整演示（5 个小节，内置验收断言）
```

真实输出节选（macOS, CPython 3.14 · Flask 3.1.3 + WTForms 3.2.2）：

```
========================================================
[2. CSRF 防线：无 token 的 POST 走不到视图（验收点）]
========================================================
  不带 csrf_token 的 POST → 400（CSRFProtect 在视图之前拦截）
  原理：token 由服务器签发并埋进表单，恶意站点诱导的跨站 POST 拿不到它
  伪造 token 的 POST      → 400（签名校验不过）

========================================================
[4. 合法提交：302 落库 + flash 消息（验收点）]
========================================================
  带 token 合法提交 → 302 重定向，存储落库 1 条
  重定向后页面：flash「留言成功！」+ 留言渲染 + 共 1 条留言（dtime 过滤器显示时间）

========================================================
[5. 自动转义：`<script>` 出门就变 `&lt;script&gt;`（验收点）]
========================================================
  提交内容: '<script>alert(1)</script>你好' → 落库成功（存储层不过滤）
  渲染结果: &lt;script&gt;alert(1)&lt;/script&gt;你好（Jinja2 自动转义）

========================================================
全部断言通过 ✓ 无 token 400 / 缺字段超长 200 回显 / 合法 302 落库 + flash / XSS 转义
```

诚实预期：

- **csrf_token 长度 91 字符**：每次签发值都不同（含随机数与时间戳），长度与格式随 flask-wtf 版本浮动
- **转义断言依赖默认配置**：`app.jinja_env.autoescape` 默认按文件后缀开启（.html 开）；显式关掉 autoescape 本实验立刻红——这本身就是个好实验
- **存储层不过滤**：`MESSAGES` 里存的是原始 `<script>` 文本。这不是漏洞，是分层——过滤错位置（入库）会让你失去原始数据，出口转义才是安全边界

## 4. 核心概念

### 4.1 模板继承与宏：一处定义，处处生效

`base.html` 定骨架（header/flash 区/content 块），`messages.html` 用 `{% extends %}` 只填内容块——改导航只动一处。字段渲染抽成 `_macros.html` 的 `render_field(field)` 宏：label、控件、错误文案位三件套统一产出，新增表单零成本复用。过滤器是模板里的"管道"：内置 `|length` 数条数，自定义 `@app.template_filter("dtime")` 把 datetime 格式化成 `HH:MM:SS`。

### 4.2 flash 消息：一次性便签

`flash("留言成功！")` 把消息塞进 session，**只在下一次响应渲染时出现、渲染完即焚**——所以它天然配 PRG（Post-Redirect-Get）模式：POST 成功 302 回列表页，刷新不会重复提交，flash 也只闪这一次。模板里 `get_flashed_messages(with_categories=true)` 取出，可按 `ok/error` 分类染色。

### 4.3 CSRF：token 为什么有效

攻击场景：你登录着 bank.com，又逛了 evil.com，后者藏一个 `<form action="bank.com/transfer" method="post">` 自动提交——浏览器带着你的 Cookie 发请求。防线：**POST 必须携带服务器签发在表单页里的随机 token**，evil.com 跨站拿不到这个值（同源策略挡着），服务器直接 400。`hidden_tag()` 在表单里埋 `csrf_token` 隐藏域，`CSRFProtect` 则把校验提到视图之前——本实验实测"无 token 的 POST 连视图一行代码都没执行"。

### 4.4 校验的两道闸，两种状态码

| 闸 | 位置 | 失败表现 | 实测 |
|:---|:---|:---|:---|
| CSRFProtect | 视图之前 | 400，错误页 | 无/伪造 token 均 400 |
| WTForms validators | 视图内 `validate_on_submit()` | 200，重新渲染表单 + 错误文案 | 「昵称必填」「昵称最长 10 字」 |

记住这个区别：**400 = 请求本身不可信；200 = 请求可信但数据不合格**。前者是安全边界，后者是用户体验。

## 5. 关键代码解析

**为什么转义断言查两样东西？**

```python
assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html, "script 应被转义后渲染"
assert "<script>alert(1)" not in html, "绝不能出现可执行的原样 script"
```

只查第一个，恶意内容若被 `|safe` 原样输出、转义串恰好又出现在别处（比如错误提示里），断言会假绿；第二条"负面断言"确保可执行形态真的不存在。安全测试永远要正反两把尺。

坑清单：

- **忘设 `SECRET_KEY`**：CSRF token 与 flash（走 session 签名）都需要它，忘设直接 RuntimeError；生产从环境变量注入，别硬编码进仓库
- **在宏里漏了错误文案位**：`field.errors` 不渲染，校验失败用户只看到"提交没反应"——错误回显是表单的一部分，不是附属品
- **图省事 `|safe`**：它关掉自动转义；本实验的 XSS 输入若套上 `|safe` 渲染就是真漏洞。想加粗/换行用受控的 Markdown 渲染器，不要裸 safe
- **POST 成功后直接 `render_template`**：没有 302，用户刷新就重复提交——PRG 三步（Redirect→Get）是表单处理的标准收尾

## 6. 文件结构

```
05_flask_templates_forms/
├── README.md                              # 本教程文档
├── flask_templates_forms.py               # 主演示脚本：渲染观察/CSRF/校验/提交/转义五节
├── templates/
│   ├── base.html                          # 骨架：header 块 + flash 区 + content 块
│   ├── _macros.html                       # 宏 render_field：label+控件+错误文案三件套
│   └── messages.html                      # 留言页：继承 base，hidden_tag + 宏 + 列表
└── images/
    ├── flask_templates_forms.json         # 图源（typed JSON IR，可编辑重渲染）
    ├── flask_templates_forms.html         # 交互示意图（浏览器打开）
    └── flask_templates_forms.svg          # 双主题矢量图（本 README §2 内嵌）
```

`flask_templates_forms.py` 内容：`MessageForm` 字段与 validators / `dtime` 自定义过滤器 / `index()` 视图（validate_on_submit → 落库+flash+302）/ `fetch_token()`+`post_message()` 测试助手 / 五个 demo 小节（验收点：§2 无 token 400、§4 合法 302 落库、§5 XSS 转义）。环境：`web/.venv`（flask + flask-wtf + wtforms）。

## 7. 深入要点

**Q1: CSRF 是什么？token 防线为什么有效？**
跨站请求伪造：利用浏览器自动携带 Cookie，诱导用户在登录态下向目标站发恶意请求。token 有效是因为它由目标站签发、埋在目标站的表单页里，第三方站点受同源策略限制拿不到；服务器只放行携带正确 token 的 POST。

**Q2: Jinja2 的自动转义防什么？什么时候会失效？**
防 XSS：变量输出前把 `< > & " '` 转成 HTML 实体，注入的脚本变纯文本。失效途径：显式 `|safe`、`Markup()` 包装、对非 HTML 模板（如 JS 模板）默认不开启——每条都是主动豁免，用前想清楚。

**Q3: 模板继承和宏分别解决什么问题？**
继承解决"页面骨架复用"（导航/布局一处定义，block 留槽）；宏解决"局部片段复用"（字段渲染、列表项），可带参数、可跨文件 import。类比：继承是类，宏是函数。

**Q4: flash 消息的原理与生命周期？**
消息写进 session（签名 Cookie 承载），重定向后下一次 GET 渲染时由 `get_flashed_messages()` 取出并从 session 删除——"闪一次"是删除语义保证的。所以必须配重定向使用，同请求内 flash 再渲染也拿不到？能拿到，但典型用法是跨请求传递一次性提示。

**Q5: 为什么校验失败返回 200 而不是 400？**
业界两种都有：服务端渲染传统派用 200 + 表单回显（用户停在表单页看错误）；前后端分离 API 派用 400 + JSON errors。关键是语义一致：本实验的 400 专留给 CSRF（请求不可信），数据不合格用 200 回显——状态码分工明确。

## 8. 总结

1. **模板三件套**：继承管骨架、宏管片段、过滤器管格式化——都是"一处定义，处处生效"
2. **CSRF 防线在视图之前**：无/伪造 token 一律 400，实测视图零执行；token 的可信度来自"签发方是目标站"
3. **校验 200 回显、CSRF 400 拒绝**：两道闸位置不同、语义不同，别混为一谈
4. **转义在出口不在入口**：`<script>` 合法入库、渲染成 `&lt;script&gt;`；`|safe` 是唯一豁免口，用前三思
5. **PRG + flash**：302 切走再 GET，刷新不重复提交，提示只闪一次

下一篇进入 [06 · SQLAlchemy ORM 实战](../06_sqlalchemy_orm/README.md)：给留言板换上真数据库——模型关系、session 生命周期与 N+1 实测。
