# 05 · 表单与文件上传：Content-Type 决定谁来解析请求体

> FastAPI 里两类表单体（urlencoded 与 multipart）如何声明、如何被解析成 str/int 或
> UploadFile。读完本篇，你能写出带大小上限（413 Payload Too Large）与扩展名白名单
> （415 Unsupported Media Type）的文件上传接口，并解释"JSON 端点收到表单体为什么报 422"。

## Background

表单是 Web 最古老的交互方式之一。CGI（最早期服务器处理请求的脚本约定）年代，浏览器提交
`<form>` 时把字段编码成 `name=alice&age=30`，服务器自己拆字符串——这种编码即
application/x-www-form-urlencoded，浏览器提交不含文件的 `<form>` 时的默认值。

带文件的表单换一种编码：multipart/form-data。它用一段随机字符串作 boundary（边界分隔符），
把普通字段与文件内容拼成多段报文，文件内容不做转码、原样嵌入。

那时收文件只有两种姿势：整个读进内存，或手写解析器边读边写临时文件。小文件进内存快；上百 MB
的视频会把进程内存顶爆。临时文件稳，但清理逻辑得每个服务自己扛。

FastAPI 的路线是把这个取舍封装起来：底层框架 Starlette 收下报文，放进一个"先内存、超限落盘"
的临时文件，端点（即处理某个路由的函数，下同）代码只面对一个文件句柄（UploadFile，下节展开）。

## What

**定义**：Form 是"从表单体取一个字段"的参数声明（`Annotated[str, Form()]`），File 是同一套
声明的文件版；两者都要求请求体是两种表单编码之一，而文件参数的差别在"内容放在哪"：

| 声明 | 内容放哪 | 适合 |
|:--|:--|:--|
| `Annotated[bytes, File()]` | 全量读进内存 | 几 KB 的图标、配置片段 |
| `Annotated[UploadFile, File()]` | SpooledTemporaryFile（先内存后磁盘的临时文件） | 一切可能变大的文件 |

可以把 UploadFile 想象成**溢出即落盘的水桶**：不到 1MB 的内容存在桶里（内存），超过就自动
溢到底下的托盘（磁盘临时文件）。失效边界：溢出后数据不会流回内存，后续读取全部走磁盘；托盘
要等请求结束时的 `close()` 才收走，不是溢出瞬间。

每个 UploadFile 自带元数据三元组：`filename`（客户端声明的原始文件名）、`content_type`
（客户端声称的内容格式，如 text/plain，是"声明"而非"事实"）、`size`（解析器统计的字节数）。

下图按时间顺序走完一次 multipart 上传：报文如何被 boundary 切分进"先内存、溢落盘"的
临时区，端点（图中标作"视图函数"）如何分块读，两道防线（413 / 415）各在什么时机断。

![multipart 文件上传时序：先内存、溢落盘、分块写](images/forms_files.svg)

> 🌐 **交互版**：[在线打开(GitHub Pages)](https://yong-huang.github.io/hands-on-python/fastapi/05_forms_files/images/forms_files.html)
> (或本地打开 [`images/forms_files.html`](images/forms_files.html))。

## When to Use

multipart 上传的归属场景：浏览器 `<form>` 或等价前端组件发起的文件提交——用户头像、资料附件、
后台批量导入的 CSV，单文件几 KB 到几十 MB。

何时不用：纯字段提交，urlencoded 甚至 JSON body 更省事；几百 MB 的大文件或客户端不是浏览器时，
改用对象存储预签名 URL（服务端只签发带凭证的上传地址，文件从客户端直传存储桶，不穿应用服务器）。

| 方案 | 差异 | 什么时候选它 |
|:--|:--|:--|
| JSON body | 结构化字段，无二进制 | 无文件的普通接口 |
| Form（urlencoded） | 仅键值对 | 登录、搜索这类纯字段提交 |
| multipart Form | 键值对与文件混装 | 浏览器发起的文件上传 |
| 对象存储预签名 URL | 上传流量绕过应用服务器 | 大文件、高并发上传 |

## Quick Start

前置：fastapi 目录 `.venv` 已就绪并装有 python-multipart（multipart 报文的解析器，Form/File 端点的
必需依赖，缺失时定义路由即报 RuntimeError，见文末）。演示应用在同目录 `main.py`，端口 8905。

```bash
cd fastapi/05_forms_files && ./05_forms_files.sh demo
```

真实输出示例（节选）：

```text
    $ curl -X POST /upload -F file=@sample_300k.txt    =>   HTTP 200
        {
          "filename": "sample_300k.txt",
          "content_type": "text/plain",
          "size": 307200,
          "chunks": 1,
          "chunk_size": 1048576,
          "saved_to": "/tmp/fastapi_lab05_uploads/sample_300k.txt"
        }
    [PASS] cmp 校验: 落盘文件与源文件逐字节一致
```

预期说明：demo 用 300KB（307200 字节）与 2.5MB（2621440 字节）样例演示分块落盘，后者报告
`chunks: 3`（1MB+1MB+0.5MB）；`.exe` 上传返回 415；上传目录 start 时清空、clean 时删除。

## How It Works

先看报文长什么样。`curl --trace-ascii` 抓到的一次真实 multipart 请求体（节选，boundary 每次
随机生成）：

```text
Content-Type: multipart/form-data; boundary=------------------------36F2yIulvQQJj8UtiJrWeL

--------------------------36F2yIulvQQJj8UtiJrWeL
Content-Disposition: form-data; name="file"; filename="note.txt"
Content-Type: text/plain

hello multipart.
--------------------------36F2yIulvQQJj8UtiJrWeL--
```

三件事值得注意：分隔行等于 `--` 加 boundary；段头与内容之间隔一个空行；末尾分隔行以 `--` 结束
报文。urlencoded 装不下文件，是因为它必须把内容转码成一行键值对，而 multipart 允许二进制原样嵌段。
解析分两步，各有决策者：

1. 端点声明决定"读不读表单"：有 `Form()/File()` 就走表单解析 `request.form()`；声明了
   Pydantic 模型则按 JSON 读原始字节（pydantic 是 FastAPI 依赖的数据校验库）；
2. Content-Type 决定解析出什么：只有两种表单编码会被解析，其余一律返回空表。

demo [7] 的两个 422 各落在一处：JSON 端点收到表单体，拿到的是原始字节而非字典，pydantic 报
`model_attributes_type`；表单端点收到 JSON，表单解析返回空表，字段报 `missing`（loc 即出错位置）。

multipart 解析时，Starlette 把每个文件段写进 SpooledTemporaryFile（标准库的"先内存后磁盘"
临时文件，溢出阈值 `max_size=1024*1024` 即 1MB）。

端点再分块读它落盘：你在 [3] 看到的 `chunks: 3` 来自 main.py 的 `save_stream`——每次最多读
1MB，2.5MB 文件读 3 次。两个 1MB 是两回事：写入侧的溢出阈值 vs 读取侧的分块大小，互不依赖。

```python
while True:
    block: bytes = await src.read(chunk_size)  # 异步分块读: 等待期间事件循环可服务其他请求
    if not block:
        break
    size += len(block)
    out.write(block)
    if max_bytes is not None and size > max_bytes:
        raise FileTooLarge(size)  # 写下一块之前就断: 不等读完, read_bytes 就是中途断的证据
```

413 响应里的 `read_bytes: 262144` 小于文件实际 307200 字节：服务端在第 4 块（4×64KB）就停了
手；半成品在 except 分支里删除，磁盘不留残余。

python-multipart 为什么是必需依赖：urlencoded 拆解标准库就能做；multipart 要处理 boundary
匹配、段头解析与二进制流，Starlette 把它外包给 python-multipart 包。

缺失时，第一条含 `Form()/File()` 的路由在定义处就抛 `RuntimeError: Form data requires
"python-multipart" to be installed`——在应用启动时，而不是第一个请求到达时。

## Pitfalls & Q&A

- **同步 `def` 里读大文件**：`def upload(file: UploadFile)` 中的 `file.file.read()` 是阻塞
  调用，读盘期间整个事件循环（asyncio 的单线程调度器）停摆，并发请求全部排队。解法：`async def` 配 `await file.read(n)` 分块读。
- **忘装 python-multipart**：报错长相即上文那句 RuntimeError。解法：`pip install
  python-multipart`；别装成名字相近的 `multipart` 包，FastAPI 会给出专门的更正提示。
- **防线挂在读完之后**：先 `data = await file.read()` 再 `len(data)` 判断，判断时大文件已
  全量穿过网络与临时区，防线形同虚设。解法：边读边计数，超限立即断并删半成品。
- **只信 content_type**：该头是客户端声称的，想写什么写什么（demo [6] 的 `;type=text/markdown`
  就是 curl 替客户端"声称"的）。解法：白名单同时校验扩展名与魔数（文件开头几字节的固定签名）。
- **Q：415 拒收时文件真的没被接收吗？** 不完全是。multipart 解析发生在端点运行之前，字节已进
  临时区；应用层防线挡的是"写进你的存储"。要在网络边界掐断，得靠反向代理（nginx 的
  client_max_body_size）。
- **Q：单文件参数收到两个文件会怎样？** 422。`Annotated[UploadFile, File()]` 只收一个，同名
  多段会校验失败；要收多个就声明 `list[UploadFile]`，只来一个时它也装得下（列表长度 1）。
- **Q：UploadFile.size 元数据可信吗？** 它由解析器统计，可与落盘数对照，但不应单独当凭据；
  本演示响应里的 size 是端点边读边数的，与 `GET /files` 的磁盘字节数一致。
