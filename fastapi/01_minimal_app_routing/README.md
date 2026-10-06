# 01 · 最小应用与参数系统:四类参数的声明式类型契约

> FastAPI 把"解析 HTTP 请求参数"变成函数签名上的类型声明:来源、类型、约束写在
> 同一处,取值、类型转换与校验由框架完成,失败统一返回 422。读完本篇,你能用
> 路径、查询、请求头、Cookie 四类参数搭出一个图书检索 API,并读懂 422 JSON 里
> loc / msg / type 三字段各自的作用。

## Background

在没有这类取参框架的年代,一个 WSGI 应用(Python 定义的 Web 服务器与应用之间
的调用接口)拿到的只有原始文本:路径是一段字符串,查询串(URL 问号后面的
键值对)是 `"page=2&size=3"` 这样的原文。

取一个参数要手写三步:取字符串、做类型转换、决定失败时报什么错,每个端点都
重复这三步;忘写转换时 `page="2"` 悄悄变成字符串。转换失败也没有统一出路:
`int("abc")` 的 ValueError 没接住就是 500,真实原因只是"参数格式错了"。

Python 3.5 的类型注解(在函数签名上标注参数类型的语法)让"把参数描述写进
签名"成为可能。FastAPI 据此把取参收编为框架职责:读签名、取值、转换、校验
都在调用函数之前完成,校验由 pydantic(基于类型注解做数据校验的库)承担。

## What

**定义**:FastAPI 的参数系统是一套声明式取参机制——在端点(处理某个 URL 的
函数)签名里声明每个参数"从哪来、是什么类型、满足什么约束",框架在调用
函数之前完成取值、转换与校验,失败统一返回 422(Unprocessable Content,
"参数格式无法处理")。

可以把函数签名想象成入库验收单:框架按单逐项验货,不合格整批退回,货物
见不到收件人(函数体)。但和验收单不同的是:未声明的参数会被静默放行
(忽略不报错),且只管格式,不管业务规则——查无此书是 404(Not Found)的事。

四类参数对照(本实验每个端点演示一类):

| 参数 | 声明写法 | 取值位置 |
|:--|:--|:--|
| 路径参数 | `book_id: int` | URL 路径段 `/books/1002` |
| 查询参数 | `Annotated[int, Query(ge=1)] = 1` | URL `?page=2` |
| 请求头 | `Annotated[str, Header()]` | 头字段 `X-Request-Source` |
| Cookie | `Annotated[str \| None, Cookie()]` | 头字段 `Cookie: last_topic=...` |

`Query()` / `Header()` / `Cookie()` 是 FastAPI 声明来源与约束的辅助类;
`Annotated`(typing 里给类型附加元数据的写法)把类型与约束组合到同一注解
上;这些信息还会生成 OpenAPI 文档(/docs 页面的接口描述文件)。

一条请求从 curl 到端点函数的完整管线如下:横轴是主路径,任一参数不合法
就在校验层拐进虚线分支——422 出口,带 loc / msg / type 错误明细。

![Lab 01 · 请求管线:四类参数的声明式校验](images/minimal_app_routing.svg)

> 🌐 **交互版**:[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/fastapi/01_minimal_app_routing/images/minimal_app_routing.html)
> (或本地打开 [`images/minimal_app_routing.html`](images/minimal_app_routing.html))。

## When to Use

- **资源定位**:按 ID 取详情——文档站按文章 ID 取正文、订单按单号查询;
- **列表分页与过滤**:搜索结果页的 page / size / keyword,可缺失、可组合;
- **客户端环境与偏好**:请求头标记请求来源做分流,Cookie 记住上次的栏目。

何时不用:请求体是嵌套结构时改用 Pydantic 模型声明请求体(见 lab 02),
不要堆十几个查询参数;一两个参数的内部小工具,Flask 手动取参改动更小。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| FastAPI 参数声明 | 签名即契约,自动转换 + 422 + OpenAPI 文档 | 新 API,参数多、调用方多 |
| Flask `request.args` | 手动取值、手动转换、手动报错 | 已有 Flask 项目的小改动 |
| Django REST framework | 参数经由声明式字段(serializer)声明 | 已有 Django 技术栈 |

## Quick Start

前置:fastapi 目录执行 `fastapi/scripts/load_resources.sh`(创建 `.venv` 并安装
fastapi / uvicorn / httpx 等),本实验无其他依赖;uvicorn(把 FastAPI 应用
跑成 HTTP 服务的服务器)由脚本代为启停,服务端口固定 8901。

```bash
bash labs/01_minimal_app_routing/01_minimal_app_routing.sh
```

脚本自动起停服务,跑完 6 节演示、31 项断言;`start` / `clean` 子命令可单独起停与清理。真实输出(节选):

```text
---- [2/6] 路径参数: book_id: int —— 声明即转换
    $ curl -X GET http://127.0.0.1:8901/books/abc    =>   HTTP 422
        {
          "detail": [
            {
              "type": "int_parsing",
              "loc": [
                "path",
                "book_id"
              ],
              "msg": "Input should be a valid integer, unable to parse string as an integer",
              "input": "abc"
            }
          ]
        }
    [PASS] GET /books/abc -> 422
```

诚实预期:`msg` 文案来自 pydantic(本仓库实测 2.13.5),随版本措辞可能变化,
`loc` 与 `type` 稳定;端口 8901 被占用时,脚本会先清掉同端口的残留进程再启动,
若服务仍起不来,日志在 `/tmp/hof01_uvicorn.log`。

## How It Works

一个请求自外向内过三步,全部发生在函数体之前:

1. **路由匹配**:`/books/abc` 命中 `/books/{book_id}` 模板;
2. **取参**:框架读函数签名决定来源——名字出现在路径模板里的按路径参数取,
   包了 `Query()` / `Header()` / `Cookie()` 的按声明的来源取,其余默认按查询参数;
3. **转换与校验**:原始字符串 `"1002"` 交给 pydantic 按注解的 `int` 转换;
   全部通过才调用函数,任一失败立即生成 422,函数体不会执行。

`detail[0]` 三字段,对照上一节真实输出:

| 字段 | 含义 | `/books/abc` 的真实值 |
|:--|:--|:--|
| `loc` | 出错位置:[来源, 参数名] 两段 | `["path", "book_id"]` |
| `msg` | 给人读的描述 | `Input should be a valid integer...` |
| `type` | 机器可读错误码,调用方按它分支 | `int_parsing` |

`loc` 第一段标记来源(path / query / header / cookie / body),前端不用猜
错在哪层。输出里 `greater_than_equal` 来自 `Query(ge=1)` 约束,`float_parsing`
同理——校验都发生在函数体之前,想在函数里 try/except 来不及。

Header 的映射规则:HTTP 头名用连字符(`X-Request-Source`),Python 变量名
不允许连字符,所以参数写成 `x_request_source`;`fastapi.Header` 默认把
下划线换回连字符去找,且头名不区分大小写,全小写同样命中。

最核心的一处声明(main.py):

```python
@app.get("/books/{book_id}")
async def get_book(book_id: int) -> dict[str, Any]:
    # book_id: int 同时做三件事:声明来源(名字匹配路径模板)、
    # 声明转换规则(str -> int)、在 OpenAPI 文档里标成 integer;
    # "abc" 在校验层被拦下,函数体永远只见到合法的 int。
    book = BOOKS.get(book_id)
```

## Pitfalls & Q&A

踩坑清单(现象 + 原因 + 解法):

- **路径参数的默认值永不生效**:`def f(book_id: int = 5)` 里的 5 用不上,
  `GET /books` 得到 404——路径段缺席时路由本身就不匹配。解法:按必填声明。
- **bool 不是只有 true/false**:`?flag=1/on/yes` 都得 True,`0/off/no` 得
  False,`"2"` 与空串是 422。解法:当开关用,要严格取值就声明 `str` 自己解析。
- **None 与空串语义不同**:`?keyword=` 传的是空串,撞上 `min_length=1` 变
  422;不传才是 None。解法:函数里先判 `is None`,再处理空值。
- **查询参数不做下划线映射**:该转换只发生在 Header / Cookie,`page_size: int`
  对应的就是 `?page_size=`。解法:要别的写法就显式 `Query(alias="pageSize")`。

问答:

- **Q:想自己处理转换失败,不要 422?** 声明成 `str` 拿原始值自己转换,代价是丢掉自动 422 与文档标注。
- **Q:422 能换成 400 或统一错误格式吗?** 注册 `exception_handler(RequestValidationError)`,保留 loc/msg/type 换外壳,见 lab 04。
- **Q:同一个头出现多次怎么收?** 声明为 `Annotated[list[str] | None, Header()] = None`,重复值收集成列表。
- **Q:签名上的声明越来越长怎么办?** 把"类型 + 约束"提成 `Annotated` 类型别名复用,可参数化写法见 lab 10。
