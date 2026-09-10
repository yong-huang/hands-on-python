# 02 · HTTP 协议观察器：手搓报文，看清 wsgiref 藏了什么

> 上一篇 [WSGI 最小应用](../01_wsgi_barebones/README.md)里，`environ` 和 body 之间的
> HTTP 细节全部由 wsgiref 代劳。本实验下到 socket 层：**自己拼请求报文、自己解析响应、
> 自己实现 chunked 解码和 keep-alive 复用**——做完再看 `requests.get()` 那一行代码，
> 你知道它背后发生了什么。全程只依赖标准库，服务端也是本实验自带的一个 60 行极简 HTTP/1.1 服务。

## 1. 为什么需要它

Web 框架开发者每天和 HTTP 打交道，但多数人对报文的认知停在"headers 是个 dict"。三个必须下到字节层才看得见的事实：**报文是四段式文本**（起始行 / 头 / 空行 / 体），所谓解析就是按 CRLF 切字符串；**body 的结束由两种机制定界**——`Content-Length` 先知长度，或 `Transfer-Encoding: chunked` 分块流式， 没有 Content-Length 时读多少全靠块长行；**连接可以复用**（keep-alive），"一个请求一条 TCP 连接"是 1.0 时代的老黄历，复用与否服务端 accept 计数器一测便知。本实验把三件事全部做成可断言的实测。

## 2. 总览：核心机制一图看懂

![HTTP/1.1 报文解剖：四段式与 body 定界](images/http_protocol.svg)

一句话心智模型：**HTTP 报文 = 起始行 + 头 + 空行 + 体，前段按 CRLF 逐行读，"体读多长"由头里的定界机制说了算**。看图上排是四段式的横向流水线；下排三个机制都从头部"长"出来——`Connection` 头决定连接复用，`Content-Length` 与 `chunked` 是体定界的两种互斥答案。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/web/02_http_protocol/images/http_protocol.html)
> （或本地打开 [`images/http_protocol.html`](images/http_protocol.html)）。

## 3. 快速开始

```bash
cd web/02_http_protocol
python3 http_protocol.py    # 完整演示（4 个小节，内置验收断言，零第三方依赖）
```

真实输出节选（macOS, CPython 3.14；服务端口每次由内核分配）：

```
========================================================
[1. 报文逐字节观察：GET /text 的来程与去程]
========================================================
  手搓请求报文原文: b'GET /text HTTP/1.1\r\nHost: 127.0.0.1\r\nAccept: text/plain\r\nConnection: close\r\n\r\n'
  原始响应前 120 字节: b'HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 151\r\nConnection: close\r\n\r\nHTTP/1.1 \xe6\x8a\xa5\xe6\x96\x87\xe7\xbb\x93\xe6\x9e'
  结构拆解: 状态行 HTTP/1.1 200 OK → 96 字节头部 → 空行 CRLF → 151 字节 body（Content-Length=151）
  报文 = 起始行 + 头 + 空行 + 体，四段式结构，与语言无关

========================================================
[3. chunked 解码：chunk-size 行 + 数据 + 终止块]
========================================================
  原始 body（chunked 编码态）: b'14\r\nHTTP/1.1 \xe6\x8a\xa5\xe6\x96\x87\xe7\xbb\x93\xe6\x9e\r\n83\r\n\x84\xe4\xb8\x80\xe5\xad\xa6\xe5\xb0\xb1\xe4\xbc\x9a\xef\xbc\x9a\xe8\xaf\xb7\xe6\xb1\x82\xe8\xa1\x8c/\xe7\x8a\xb6\xe6'...
  块长序列: [20, 131, 0]（HEX: 14/83/0），末块 0 = 终止块
  解码还原 151 字节，与原文逐字节相等 ✓

========================================================
[4. keep-alive 复用：3 个请求 1 条连接 vs 一请求一连接]
========================================================
  复用组: 3 个请求（含 1 个 POST）共用 1 条连接，服务端 accept 次数 = 1
  对照组: 2 个请求 2 条连接（Connection: close），服务端 accept 次数 = 2

========================================================
全部断言通过 ✓ 手搓解析与 http.client 逐项一致、chunked 逐字节还原、
keep-alive 3 请求 1 连接（服务端计数器为证）
```

诚实预期：

- **复用组的"3 请求 1 连接"由进程内计数器断言**（服务端与客户端同进程，`STATS` dict 共享）——跨进程时把计数器换成响应头回显即可，结论不变
- **手搓客户端按 Content-Length 提前收工**：keep-alive 连接不会主动关闭，若不按头定界而傻等对端断开，就会白等一个 idle timeout——这本身就是定界机制存在的理由

## 4. 核心概念

### 4.1 四段式报文：HTTP 就是按 CRLF 切字符串

```
GET /text HTTP/1.1\r\n        ← 起始行（请求行；响应侧是状态行）
Host: 127.0.0.1\r\n           ← 头部，一行一个 k: v
Accept: text/plain\r\n
\r\n                          ← 空行，头结束的标记
<151 字节的体>                 ← 体，定界方式看头部
```

解析器没有任何魔法：`raw.partition(b"\r\n\r\n")` 一刀分开头和体，头部再按行切。手写解析器与 `http.client` 对同一响应给出逐项相同的状态/头/体（§2 验收点），说明标准库做的也是同一件事，只是把边界情况（多行头、大小写、HTTP/0.9 兼容……）处理得更完备。

### 4.2 body 定界：Content-Length vs chunked

**有 `Content-Length: N`**：读到恰好 N 字节为止，多一节都是下一条报文的（keep-alive 下按长度切分是正确性要求，不是优化）。**没有（流式场景）**：`Transfer-Encoding: chunked`——每块前置一行十六进制块长，`0\r\n\r\n` 终止：

```
14\r\n<20 字节>\r\n83\r\n<131 字节>\r\n0\r\n\r\n
```

解码器 7 行写完：读块长行 → 读对应字节 → 循环到 0 号块。本实验实测两种机制互斥出现，且 chunked 解码与原文逐字节相等。

### 4.3 keep-alive：服务端 accept 计数器说话

复用组同一个 socket 对象连发 GET/POST/GET 三个请求，服务端 `accept()` 只执行 1 次；对照组每请求声明 `Connection: close`，2 个请求 2 条连接。服务端循环里顺手实现了 keep-alive 的标配策略——**空闲超时**（`recv` 超时就优雅关闭），生产服务器的 keep-alive timeout 是同一件事。

### 4.4 POST 与 Content-Length 请求头

请求体同样要定界：手搓 POST 必须自带 `Content-Length: 4` 头，服务端按它把 `ping` 从流里切出来再回显。`http.client`/`requests` 帮你自动加这个头——现在你知道省掉的是什么。

## 5. 关键代码解析

**为什么服务端要区分"头读够"和"体读够"两个循环？**

```python
while CRLF.encode() * 2 not in buf:   # 头：边界是"空行"这个标记
    buf += conn.recv(4096)
head, _, buf = buf.partition(CRLF.encode() * 2)
need = int(headers.get("content-length", 0))
while len(buf) < need:                # 体：边界是头里声明的数字
    buf += conn.recv(4096)
payload, buf = buf[:need], buf[need:] # 多读的部分是下一条请求，留在 buf 里
```

头和体的定界机制不同：头靠标记（空行），体靠声明（数字）。最后 `buf[need:]` 保留粘包余量——keep-alive 下一条请求的头可能已经躺在缓冲区里，这一行处理的就是"TCP 粘包"的本质：**TCP 只有字节流，报文边界是应用层自己切的**。

坑清单（本实验开发过程真实踩中）：

- **`Content-Length` 与实际 body 不一致**：/echo 路由第一版把头写成了请求体长度（4），响应体却是 9 字节——客户端按头等 4 字节永远"没读够"，干等超时；服务端同时在 keep-alive 循环里等下一条请求也超时，线程崩溃、连接 RST。一个头的错误同时打挂两端，这是全实验最深的一坑
- **keep-alive 连接没有 idle timeout**：对端不发下一条请求，`recv` 永远阻塞，线程悄悄泄漏；真实服务器全部带 keep-alive timeout
- **往"空行之后"追加头**：`craft_request(...)` 的返回值已经以空行结尾，再 `+ b"Connection: close"` 会把头拼进 body 位置——头必须拼在空行之前
- **用字符串拼接响应头**：头列表是 `(k, v)` 元组，`"Connection: keep-alive"` 字符串混进去，`f"{k}: {v}"` 解包直接 ValueError

## 6. 文件结构

```
02_http_protocol/
├── README.md                            # 本教程文档
├── http_protocol.py                     # 主演示脚本：报文观察/解析对照/chunked/keep-alive
└── images/
    ├── http_protocol.json       # 图源（typed JSON IR，可编辑重渲染）
    ├── http_protocol.html       # 交互示意图（浏览器打开）
    └── http_protocol.svg        # 双主题矢量图（本 README §2 内嵌）
```

`http_protocol.py` 内容：`handle_request()`+`serve_once()`+`start_server()` 自带极简 HTTP/1.1 服务（三种传输形态 + accept 计数）/ `craft_request()` 手搓报文 / `parse_response()` 手写解析器 / `recv_response()` 按定界机制读响应 / `decode_chunked()` chunked 解码器 / 四个 demo 小节（验收点：§2 解析对照、§4 复用计数）。

## 7. 面试要点

**Q1: HTTP 报文的结构？解析它要做什么？**
四段式：起始行（请求行/状态行）、头部（`k: v` 逐行）、空行 CRLF、体。解析 = 按 CRLF 切行、空行分头体、体按定界机制读。

**Q2: Content-Length 和 Transfer-Encoding: chunked 的区别？什么场景用后者？**
前者先知长度一次读够；后者把 body 切成"十六进制块长 + 数据"的块流，`0` 号块终止。适合 body 边生成边发（流式响应、代理转发、大文件动态压缩）——长度未知时唯一正解。HTTP/1.1 规定两者互斥。

**Q3: keep-alive 是什么？为什么需要？**
HTTP/1.1 默认复用 TCP 连接传多个请求响应，省去每次三次握手与慢启动。客户端 `Connection: close` 可显式关闭。服务器需要 idle timeout 防连接泄漏。

**Q4: TCP 粘包是什么？HTTP 如何应对？**
TCP 是字节流没有消息边界，"粘包"就是两次 write 的字节在同一缓冲里到达。HTTP 靠应用层定界解决：头部按空行、体按 Content-Length/chunked——不解决的话 keep-alive 根本没法实现。

**Q5: WSGI 里的 `wsgi.input` 和本实验什么关系？**
server（如 wsgiref/gunicorn）做完了本实验服务端的活：按定界机制把 body 从 TCP 流里切出来，包成 `wsgi.input` 文件对象交给应用——所以 Flask 的 `request.data` 直接可读，不用关心 chunked。下一篇 [03 · Cookie 与 Session](../03_cookie_session/README.md) 继续看 server/框架替我们管理的状态。

## 8. 总结

1. **报文四段式**：起始行 + 头 + 空行 + 体，解析就是按 CRLF 切
2. **body 两种定界**：Content-Length 读够即止 / chunked 块长行流式，二者互斥
3. **keep-alive 复用连接**：3 请求 1 accept 实测；代价是必须处理空闲超时与按长度切包
4. **Content-Length 写错一个数字，两端一起挂**：头部是协议的"合同条款"
5. 这些细节在框架里被 `environ`/`wsgi.input` 封装——但面试和排障时，字节层理解是硬通货

下一篇进入 [03 · Cookie 与 Session 手写](../03_cookie_session/README.md)：在无状态的 HTTP 上，用手写 HMAC 签名 cookie 撑起登录态。
