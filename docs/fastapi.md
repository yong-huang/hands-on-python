# ⚡ FastAPI 25 实验学习清单(hands-on-python 第四系列) · Todo List

> 通过 25 个实验（每实验 170-350 行应用代码 + 配套演示脚本）系统掌握 FastAPI：先在路由与请求地基上把参数、校验、响应、错误四件事做扎实，再下到依赖注入深水区，然后实测异步与并发的执行真相，接入数据库与鉴权两座大山，最终以测试、配置、限流、容器化交付一个完整短链接服务
> 约束：macOS Apple Silicon · Python 3.13.9（CPython，PEP 668 受管，统一走仓库根 `.venv`）· 全部本机可跑、零外部服务依赖（HTTP 服务由实验脚本自己拉起、自己清理）；fastapi 0.142.2 / uvicorn 0.54.0 已实测装通，版本见文末环境配置
> 串联机制：能力阶梯型——阶段即能力等级（路由请求地基 → 依赖注入深水区 → 异步与并发 → 数据与认证 → 生产化与交付），项目 24 为 🏁 综合交付项目，串联前 23 个实验的成果
> 预计周期：8 周（每天 1.5-2 小时）

## 🤖 AI 辅助提示词速查

| 场景 | 提示词 |
|:---|:---|
| **开始一个新实验** | `我要开始 FastAPI 项目「[名称]」（labs/NN_short_name/），目标是 [功能]。请给我完整代码约 [行数] 行：main.py 演示应用 + NN_short_name.sh 主演示脚本（创建 → 观察 → 破坏 → 验证 → 清理，断言输出 [PASS]），跑在仓库根 .venv（Python 3.13.9，fastapi 0.142.2），附验收命令，中文注释。只输出代码。` |
| **排障** | `我的 FastAPI 应用出现 [报错/行为异常]，现象：[描述]，完整 traceback：[粘贴]。请分析根因并给最小修复。` |
| **异步写法审查** | `这段 FastAPI 端点代码：[粘贴]。请指出 async def 与 def 的选择是否正确、代码真实执行在事件循环还是线程池、有无阻塞事件循环的写法，并给修改对照。` |
| **生产部署审查** | `我要把 FastAPI 应用部署到生产（uvicorn/gunicorn workers + Docker + 反向代理），当前配置：[粘贴]。请审查 worker 数/超时/日志/环境变量并给改进清单。` |

## 📊 总进度

进度：█████████████████████████ 25/25 (100%)

| 阶段 | 项目数 | 已完成 |
|:---|:---:|:---:|
| 第一阶段：路由与请求地基（项目 1-5） | 5 | 5 |
| 第二阶段：依赖注入深水区（项目 6-10） | 5 | 5 |
| 第三阶段：异步与并发（项目 11-14） | 4 | 4 |
| 第四阶段：数据与认证（项目 15-19） | 5 | 5 |
| 第五阶段：生产化与交付（项目 20-25） | 6 | 6 |
| **合计** | **25** | **25** |

---

## 🗂️ 第一阶段：路由与请求地基（项目 1-5）

> **目标**：会写一个参数齐全、校验严谨、错误体面的 FastAPI 应用——四类参数、模型校验、响应出口、错误契约与表单文件全部落成可断言的演示脚本

### [x] 项目 1：最小应用与参数系统

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~170 行（main.py，另含 ~270 行演示脚本） |
| **核心知识点** | FastAPI() 应用与路由装饰器、路径/查询/请求头/Cookie 四类参数的声明式取参（Annotated + Query/Header/Cookie）、ge/le/min_length 约束、422 的 detail[0] 三字段结构（loc/msg/type）、Header 与 Cookie 的下划线↔连字符映射 |
| **技术栈** | fastapi 0.142.2 + pydantic 2.13.5 + uvicorn 0.54.0（✅ 2026-10-04 实现并通过脚本验收） |
| **验收标准** | 演示脚本断言路由表与预期 7 条一致（另含框架自动注册的 /docs、/openapi.json）；`/books/1002` 返回 200 且 id 已从 str 转成 int、`/books/9999` 返回 404（参数合法但查无此书）、`/books/abc` 返回 422 且 loc=`["path","book_id"]`、type=int_parsing；`page=0` 触发 greater_than_equal、`size=99` 触发 less_than_equal（约束违约断言）；X-Request-Source 头的下划线映射与大小写不敏感各一条断言；Cookie 先 set 后 get（jar 文件断言）；`discount=abc` 返回 422 且 type=float_parsing |
| **前置** | 无 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「最小应用与参数系统」。请给我完整代码约 170 行：图书检索 API，路径参数（book_id: int）、查询参数（page/size 带 ge/le、keyword/category 可选）、请求头参数（X-Request-Source）、Cookie 参数（last_topic 先 set 后 get）四类各一组端点，附 Cookie 写入辅助端点与 float 类型坑演示端点；演示脚本断言 /books/abc 的 422 里 loc=["path","book_id"] 与 type=int_parsing、page=0 的 type=greater_than_equal、头参数下划线映射与大小写不敏感，依赖 fastapi + uvicorn，中文注释。只输出代码。`

**完成日期**：2026-10-04
**踩坑记录**：路径参数声明默认值永不生效（路径段缺席时路由本身不匹配，须按必填声明）；bool 查询参数接受 1/yes/on 等多种取值，`"2"` 与空串才是 422；`?keyword=` 传的是空串而非缺省，撞上 min_length=1 会 422；查询参数不做下划线↔连字符映射，该转换只发生在 Header/Cookie。

---

### [x] 项目 2：Pydantic 模型与校验体系

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~190 行（main.py，另含 ~380 行演示脚本） |
| **核心知识点** | BaseModel 三层嵌套模型树（Customer/OrderItem/Order）、Field 约束（gt/le/max_length/pattern）、field_validator 单字段定制检查与改写、model_validator 跨字段规则、computed_field 演生字段、422 的 loc 嵌套索引路径 |
| **技术栈** | fastapi 0.142.2 + pydantic 2.13.5（✅ 2026-10-04 实现并通过脚本验收） |
| **验收标准** | 合法创建返回 201 且 computed_field 现场算出 total 与 discount（请求体注入 total 字段被忽略，演生字段不可注入断言）；第二个 item 的 price=-1 返回 422 且 loc 精确到 `["body","items",1,"price"]`（嵌套索引断言）；单件 99999 元打爆总价上限由 model_validator 在模型级拦截（跨字段 422 断言）；小写带空格的优惠券经 field_validator 归一为大写（改写断言）；5 种约束违约各打一枪，第一条错误的 loc/msg/type 逐一断言 |
| **前置** | 项目 1 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「Pydantic 模型与校验体系」。请给我完整代码约 190 行：Customer/OrderItem/Order 三层嵌套模型，Field 约束（gt/max_length/pattern）、field_validator 做优惠券 strip+upper 归一化、model_validator(mode="after") 做总价上限拦截、computed_field 算 total；演示脚本断言：嵌套失败 422 的 loc 精确到 ["body","items",1,"price"]、跨字段违约 422、注入 computed 同名字段被忽略、5 种约束违约的 loc/msg/type 逐一核对，依赖 fastapi，中文注释。只输出代码。`

**完成日期**：2026-10-04
**踩坑记录**：field_validator 忘写 return 会让字段静默变成 None（不报错，问题在下游才暴露，每个分支都要有返回值）；`default=datetime.now()` 这类调用式默认在类定义时求值一次、全体实例共用，须换 default_factory；model_validator(mode="before") 拿到的是原始 dict，没有 self，跨字段用 values.get 读、return values 交还。

---

### [x] 项目 3：响应建模

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~240 行（main.py，另含 ~250 行演示脚本） |
| **核心知识点** | response_model 出口闸（收下敏感字段不回传）、无 response_model 的反面教材对照、status_code 声明（201 + Location 头）、HTMLResponse/RedirectResponse/StreamingResponse/FileResponse 五类响应形态、FileResponse 路径遍历防线 |
| **技术栈** | fastapi 0.142.2（✅ 2026-10-04 实现并通过脚本验收） |
| **验收标准** | POST /users 请求体含 password 而响应 JSON 无该字段（出口闸断言）；忘挂 response_model 的 legacy 端点原样回传内部字段（反面教材对照断言）；201 响应带 Location 头；HTML 响应 Content-Type 为 text/html；307 重定向断言 Location 且 curl -L 跟一跳到达；流式响应三块文本逐块到达且无应用层 Content-Length；FileResponse 带 Content-Disposition 且字节级一致 |
| **前置** | 项目 2 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「响应建模」。请给我完整代码约 240 行：response_model 出口闸端点（收 password 不回传）与忘挂出口闸的反面教材端点、status_code=201 的创建端点带 Location 头、HTMLResponse、RedirectResponse、StreamingResponse 三块文本、FileResponse 文件下载（带 Content-Disposition 与路径遍历拒绝）；演示脚本断言出口闸后响应无 password 字段、201 带 Location、流式逐块到达且无 Content-Length、文件字节级一致，依赖 fastapi + uvicorn，中文注释。只输出代码。`

**完成日期**：2026-10-04
**踩坑记录**：response_model 与 `->` 返回注解各说各话会互相矛盾（注解标 UserOut、函数却返回内部全量）；StreamingResponse 生成器中途抛异常时状态码与响应头已定死（第一块发出即 200）；FileResponse 的文件名来自请求参数直接拼路径时会中 `..%2F` 路径遍历，须先归一化再白名单校验。

---

### [x] 项目 4：错误处理体系

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~190 行（main.py，另含 ~230 行演示脚本） |
| **核心知识点** | HTTPException 与 headers 透传、@app.exception_handler 自定义处理器、覆盖 RequestValidationError 改写 422 信封、未捕获异常的兜底 500（信封给客户端、堆栈只进日志）、统一错误信封契约（code/message/detail） |
| **技术栈** | fastapi 0.142.2（✅ 2026-10-04 实现并通过脚本验收） |
| **验收标准** | 正常扣减返回 200 且信封只约束错误响应（成功路径断言）；业务异常 InventoryShortage 返回 409 且信封字段齐全（断言）；HTTPException(404) 经覆盖后的处理器返回约定结构；校验失败返回覆盖后的 422 信封（不再是 FastAPI 默认结构，断言）；未捕获异常返回 500 信封且 traceback 只出现在日志不出现在响应（断言）；四条路径的错误信封对照总览输出 |
| **前置** | 项目 3 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「错误处理体系」。请给我完整代码约 190 行：库存扣减 API，自定义业务异常 InventoryShortage + exception_handler 返回 409 统一信封（code/message/detail），覆盖 RequestValidationError 与 HTTPException 的 422/404 信封，兜底 handler 给客户端 500 信封、堆栈只进日志；演示脚本断言：成功 200、业务异常 409 信封字段齐全、422 与 404 均为覆盖后结构、500 响应无堆栈而日志有、四条路径信封对照输出，依赖 fastapi + uvicorn，中文注释。只输出代码。`

**完成日期**：2026-10-04
**踩坑记录**：handler 里再抛异常没人接直接变 500（409 handler 里顺手查库存又出错即是）；覆盖 422 会丢默认结构，前端按 detail 数组取值会取不到；HTTPException 漏传 headers（401 时应带 WWW-Authenticate）；端点里包一层 `except Exception` 会吞掉 HTTPException，改变其状态码语义。

---

### [x] 项目 5：表单与文件上传

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行（main.py，另含 ~250 行演示脚本） |
| **核心知识点** | python-multipart 的 multipart/form-data 解析、Form 字段与 JSON Body 不同端点二选一的边界、UploadFile（SpooledTemporaryFile 流式落盘）、多文件上传、大小与类型防线（先验再落盘）、422 与 413 的分工 |
| **技术栈** | fastapi 0.142.2 + python-multipart 0.0.32（✅ 2026-10-04 实现并通过脚本验收） |
| **验收标准** | 表单字段端点与 JSON 端点各自的 Content-Type 匹配断言（发错类型得 422）；UploadFile 上传落盘后与原文件逐字节一致（断言）；超限文件被大小防线拒绝（状态码断言）；非法扩展名/MIME 被类型防线拒绝（断言）；多文件上传逐个落盘且文件名齐全（断言）；演示脚本覆盖创建 → 观察 → 破坏 → 验证 → 清理全生命周期 |
| **前置** | 项目 4 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「表单与文件上传」。请给我完整代码约 200 行：Form 字段端点（multipart/form-data）与 JSON Body 端点对照、UploadFile 单文件与多文件上传（Annotated[list[UploadFile], File()]），落盘前做大小与扩展名两道防线，超限与非法类型分别拒绝；演示脚本用 curl -F 实测断言：落盘内容与原文件逐字节一致、超限文件被拒、非法类型被拒、多文件逐个落盘且文件名齐全，依赖 fastapi + uvicorn + python-multipart，中文注释。只输出代码。`

**完成日期**：2026-10-04
**踩坑记录**：依赖 python-multipart 未安装时报 Form/File 无法识别（运行时断言前先探导入）；UploadFile 是 SpooledTemporaryFile，小文件在内存、超阈值才落临时盘，验收断言要按落盘后的最终文件比对；multipart 端点收到 JSON Content-Type 得 422，属于"来源不匹配"而非服务端 bug。

---

## 🗂️ 第二阶段：依赖注入深水区（项目 6-10）

> **目标**：吃透 FastAPI 的骨架机制——请求进来之后、视图执行之前发生的一切：依赖链的解析顺序、yield 生命周期、类依赖与全局挂载、测试替身与依赖工厂复用

### [x] 项目 6：Depends 依赖链

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~180 行（main.py + 演示脚本） |
| **核心知识点** | Depends 声明式依赖与返回值注入、三层嵌套依赖（配置 → 会话 → 业务校验）的深度优先解析顺序、每请求依赖缓存（use_cache 默认 True，同请求同一依赖只算一次）、依赖与普通参数校验的分工 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0（已实测装通；实验未实现） |
| **验收标准** | 三层依赖执行顺序日志断言为深度优先（外层先于内层、全部先于视图，顺序写进注释解释）；同一请求内同一依赖函数只执行一次（调用计数 = 1 断言）；不同请求间计数递增（缓存不跨请求断言）；依赖返回值注入端点参数（值断言）；use_cache=False 的依赖在多个参数位置各执行一次（计数对照断言） |
| **前置** | 项目 4 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「Depends 依赖链」。请给我完整代码约 180 行：配置 → 会话 → 业务校验三层嵌套 Depends，依赖内打印层级日志，业务依赖带调用计数器；演示脚本断言：执行顺序为深度优先且全在视图之前、同请求内同依赖只执行一次（计数=1）、不同请求计数递增、use_cache=False 的依赖每次参数位置独立执行，main.py 中文注释解释依赖解析的深度优先顺序。只输出代码。`

### [x] 项目 7：yield 依赖与生命周期

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~180 行（main.py + 演示脚本） |
| **核心知识点** | yield 依赖的 setup/teardown 两段式、退出代码在响应发送之后执行、异常不豁免清理、多个 yield 依赖的后进先出退出顺序、yield 依赖前段抛 HTTPException 的语义 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0（已实测装通；实验未实现） |
| **验收标准** | setup → 视图 → teardown 时序日志断言；端点抛 HTTPException 时 teardown 仍执行（清理日志断言，异常不豁免清理）；两个 yield 依赖的 teardown 顺序与 setup 相反（LIFO 断言）；yield 依赖 setup 段抛 HTTPException 返回约定状态码且 teardown 仍运行（断言）；模拟 DB 连接的 close 调用计数与请求数相等（资源归还断言） |
| **前置** | 项目 6 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「yield 依赖与生命周期」。请给我完整代码约 180 行：模拟 DB 连接的 yield 依赖（setup 打日志、teardown 归还连接并计数），两个 yield 依赖叠加演示 LIFO 退出顺序，一个端点抛 HTTPException 验证清理不豁免，一个依赖在 setup 段抛 HTTPException；演示脚本断言：setup → 视图 → teardown 顺序、异常路径 teardown 仍执行、teardown 顺序与 setup 相反、close 计数 = 请求数，main.py 中文注释。只输出代码。`

### [x] 项目 8：类依赖与全局依赖

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~170 行（main.py + 演示脚本） |
| **核心知识点** | callable 类依赖（__call__，每请求实例化）、dependencies=[Depends(...)] 列表写法、router 级依赖与应用级全局依赖、依赖短路（依赖抛 HTTPException 终止请求）、类依赖不进 OpenAPI 的取舍 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0（已实测装通；实验未实现） |
| **验收标准** | 类依赖每请求新建实例（实例计数断言）；router 级依赖对该 router 全部路由生效、对 router 外路由零调用（计数断言）；app 级依赖对任意路径都执行（执行数 = 请求数断言）；依赖短路时端点函数零调用（计数断言）；全局 → router → 端点三级依赖的执行顺序日志断言 |
| **前置** | 项目 6 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「类依赖与全局依赖」。请给我完整代码约 170 行：__call__ 类依赖做请求审计（每请求实例化并计数）、一个 router 挂 dependencies=[Depends(...)] 与蓝外路由对照、app 级全局依赖对所有路径生效、一个短路依赖在条件不满足时抛 429 且端点零调用；演示脚本断言：实例计数 = 请求数、router 依赖对蓝外路由零调用、全局依赖执行数 = 总请求数、短路时端点零调用、三级依赖顺序日志，main.py 中文注释。只输出代码。`

### [x] 项目 9：测试替身

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~180 行（main.py + 演示脚本） |
| **核心知识点** | dependency_overrides 按函数对象精确替换、真假依赖调用计数对照、嵌套链中只替换叶子依赖（父链逻辑仍走真实现）、测试收尾清空 overrides 还原行为、TestClient 与 overrides 的配合 |
| **技术栈** | fastapi 0.142.2 + httpx 0.28.1（TestClient 依赖）（已实测装通；实验未实现） |
| **验收标准** | override 假 DB 后真依赖零调用、假依赖调用次数与请求数相等（双计数断言）；只替换嵌套链的叶子依赖后上层组合逻辑仍按真实现执行（断言）；未注册 override 的依赖不受影响（对照断言）；清空 dependency_overrides 后行为还原（断言）；同一依赖函数被两个端点共用时一次 override 全局生效（断言） |
| **前置** | 项目 6、8 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「测试替身」。请给我完整代码约 180 行：真实 DB 依赖（读写内存字典并计数）+ 假 DB 依赖，用 dependency_overrides 精确替换，演示只替换三层嵌套链的叶子依赖、替换共享依赖一次生效、finally 里清空 overrides 还原；演示脚本断言：替换后真依赖零调用且假依赖计数与请求数相等、叶子替换后父链仍走真实现、未替换依赖不受影响、清空后行为还原，依赖 fastapi + httpx，main.py 中文注释。只输出代码。`

### [x] 项目 10：Annotated 与依赖工厂

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~180 行（main.py + 演示脚本） |
| **核心知识点** | Annotated[int, Query(...)] 与 Annotated[T, Depends(...)] 写法统一、参数化依赖工厂（闭包返回依赖函数）、Annotated 类型别名复用（分页/阈值语义）、工厂依赖进 OpenAPI、use_cache=False 与工厂的组合 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0（已实测装通；实验未实现） |
| **验收标准** | 同一工厂生成的两个不同参数依赖在同请求各自生效（断言两值不同且各符参数，如 page_size=5 与 page_size=20）；Annotated 别名在 ≥3 个端点复用且 /openapi.json 含依赖声明的参数文档（断言）；工厂默认值可被查询串覆盖（断言）；工厂产物设 use_cache=False 时同请求两次出现各执行一次（计数断言） |
| **前置** | 项目 6 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「Annotated 与依赖工厂」。请给我完整代码约 180 行：写一个参数化依赖工厂 make_limit(default, max_value) 返回依赖函数，生成两个不同参数的 Annotated 类型别名（如 PageLimit=5、FeedLimit=20）在 ≥3 个端点复用，OpenAPI 可见；演示脚本断言：两别名同请求各自生效且默认值可被查询串覆盖、/openapi.json 含依赖参数文档、use_cache=False 的工厂产物同请求两次出现各执行一次，依赖 fastapi，main.py 中文注释。只输出代码。`

---

## 🗂️ 第三阶段：异步与并发（项目 11-14）

> **目标**：知道代码到底跑在哪根线程上——事件循环与线程池的实测边界，后台任务、WebSocket 长连接与流式响应的适用取舍

### [x] 项目 11：async def 与 def 的执行真相

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行（main.py + 演示脚本） |
| **核心知识点** | 事件循环单线程调度 vs anyio 线程池、def 端点跑在 AnyIO worker 线程、async 端点误用 time.sleep 阻塞整个事件循环、并发吞吐实测、线程名定位真实执行位置 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0 + httpx 0.28.1（已实测装通；实验未实现） |
| **验收标准** | 50 并发请求 async 端点（内 asyncio.sleep 0.5s）总耗时 <2s，同负载 def 端点（内 time.sleep 0.5s）明显更慢（比值 ≥2 断言）；端点内打印 threading.current_thread().name——async 版为事件循环线程、def 版为 AnyIO worker 线程（执行位置断言）；async 端点误用 time.sleep(0.5) 后同负载退化为串行量级（阻塞事件循环断言） |
| **前置** | 项目 6；建议先有 asyncio 语法基础 |
| **⚠️ 风险** | 并发断言对机器负载敏感，阈值已放宽（<2s vs 串行需 25s）；压测用 httpx.AsyncClient 自写并发，不装额外压测工具 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「async def 与 def 的执行真相」。请给我完整代码约 220 行：同一 IO 任务（0.5s 延迟）的 def 与 async def 两端点，端点内打印 threading.current_thread().name 证明执行位置，再加一个 async 端点误用 time.sleep 的反面教材；演示脚本起真 uvicorn（subprocess），httpx.AsyncClient 并发 50 实测三版本耗时（断言 async <2s、def/async ≥2、sleep 版退化到串行量级），依赖 fastapi + uvicorn + httpx，main.py 中文注释。只输出代码。`

### [x] 项目 12：后台任务三形态

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行（main.py + 演示脚本） |
| **核心知识点** | BackgroundTasks 响应返回后同进程执行、asyncio.create_task 即发即忘（无生命周期管理、异常无人接）、外部队列的边界（跨进程可靠性）、三形态的失败恢复差异 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0 + httpx 0.28.1（已实测装通；实验未实现） |
| **验收标准** | BackgroundTasks 任务完成时间戳晚于响应到达客户端的时间戳（"响应先于任务"双时间戳断言）；create_task 任务抛异常默认静默（异常钩子捕获断言）；进程退出时 create_task 未完成任务丢失、外部队列方案可由下个进程续跑（对照断言）；三形态"适合场景"对照表输出 |
| **前置** | 项目 11 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「后台任务三形态」。请给我完整代码约 200 行：同一写日志任务分别用 BackgroundTasks、asyncio.create_task、内存外部队列（独立消费协程）实现，create_task 版本挂异常钩子捕获静默失败；演示脚本断言：BackgroundTasks 完成时间戳晚于响应到达时间（双时间戳）、create_task 异常被钩子捕获而非消失、进程退出时未消费任务对照三形态写出"适合场景"表，依赖 fastapi + uvicorn + httpx，main.py 中文注释。只输出代码。`

### [x] 项目 13：WebSocket 长连接

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行（main.py + 演示脚本） |
| **核心知识点** | WebSocket 握手 accept/close 生命周期、WebSocketDisconnect 异常、内存连接管理器（连入/断开维护房间人数）、房间广播、断线清理 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0 + httpx 0.28.1（已实测装通；实验未实现） |
| **验收标准** | 双客户端连入后 A 发消息 B 收到（广播断言）；一方断开后房间人数减一且不再收到广播（断言）；向已断开连接 send 抛异常被管理器捕获并摘除连接（清理断言）；拒绝路径（未 accept 即 close）返回约定关闭码（断言） |
| **前置** | 项目 11 |
| **⚠️ 风险** | WebSocket 断言细节多，卡住可先在浏览器手测再补自动化 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「WebSocket 长连接」。请给我完整代码约 200 行：WebSocket 端点 + 内存连接管理器（connect/disconnect 维护房间人数），broadcast 广播消息带昵称与时间戳，配极简 HTML 页面供浏览器手测；演示脚本用 TestClient websocket_connect 断言：双客户端互收消息、一方断开后人数减一且不再收到广播、向死连接 send 的异常被管理器捕获并摘除，依赖 fastapi + httpx，main.py 中文注释。只输出代码。`

### [x] 项目 14：流式响应与 SSE

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行（main.py + 演示脚本） |
| **核心知识点** | StreamingResponse 生成器分块输出、chunked 传输编码、text/event-stream 事件协议（event/data/id 字段与空行分帧）、流式 vs 一次性组装的首字节与内存差异 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0 + httpx 0.28.1（已实测装通；实验未实现） |
| **验收标准** | 客户端逐 chunk 接收且拼接结果与原始内容逐字节一致（断言）；SSE 事件流按协议解析出 event/data/id 三字段（断言）；首块到达时间早于完整响应完成（首字节时间断言）；大响应下流式的进程内存峰值低于一次性组装（对照断言，或以首字节时间替代） |
| **前置** | 项目 3、11 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「流式响应与 SSE」。请给我完整代码约 200 行：StreamingResponse 生成器逐块产出 5 块文本（每块间隔 0.2s）与一次性 JSONResponse 对照端点，SSE 端点按 text/event-stream 协议输出带 event/data/id 的事件；演示脚本用 httpx stream 断言：逐块到达且拼接逐字节一致、首块时间早于总耗时、SSE 按空行分帧解析出三字段，依赖 fastapi + uvicorn + httpx，main.py 中文注释。只输出代码。`

---

## 🗂️ 第四阶段：数据与认证（项目 15-19）

> **目标**：把真实业务的两座大山——数据库与鉴权——接进来：async ORM 与连接池、迁移、OAuth2 + JWT 完整链、RBAC 分层依赖与可观测性

### [x] 项目 15：SQLAlchemy async

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行（main.py + 演示脚本） |
| **核心知识点** | create_async_engine 与 async_sessionmaker、AsyncSession 经 Depends 注入（每请求独立 session）、expire_on_commit 行为、连接池 pool_size 与并发排队、sqlite 并发写的 WAL 与 busy_timeout |
| **技术栈** | sqlalchemy + aiosqlite（⚠️ 未在当前 .venv 实测集内，开工时 pip 补装，纯 Python 低风险） |
| **验收标准** | async session 经 Depends 注入且每请求独立（session 对象身份断言）；expire_on_commit=True 提交后再访问属性触发 refresh（行为断言）；并发 50 写 sqlite（WAL + busy_timeout）全部成功无 database is locked（断言）；连接池 pool_size 上限实测：超上限请求排队等待而非报错（耗时对照断言） |
| **前置** | 项目 7、11 |
| **⚠️ 风险** | sqlite 并发写有先天上限，须开 WAL 并设 busy_timeout，断言阈值放宽；asyncio 环境下不要混用同步 Session |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「SQLAlchemy async」。请给我完整代码约 220 行：create_async_engine(sqlite+aiosqlite, WAL) + async_sessionmaker，User/Post 两模型 CRUD 端点，AsyncSession 经 Depends 注入（依赖内 yield 关闭 session），连接池 pool_size=5；演示脚本断言：每请求 session 独立（对象身份）、expire_on_commit 行为、并发 50 写全部成功无 database is locked、超 pool_size 的请求排队等待，依赖 fastapi + sqlalchemy + aiosqlite + httpx，main.py 中文注释。只输出代码。`

### [x] 项目 16：Alembic 迁移

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行（main.py + alembic 最小目录 ini/env.py + 迁移脚本） |
| **核心知识点** | alembic init 目录结构、autogenerate 比对模型与库差异生成迁移、upgrade/downgrade 往返、迁移脚本与模型同步、alembic 命令的 subprocess 调用 |
| **技术栈** | alembic + sqlalchemy + aiosqlite（⚠️ 开工时补装） |
| **验收标准** | autogenerate 检出模型新增列并生成迁移脚本（文件存在且含新列名断言）；upgrade 后 PRAGMA table_info 含新列、downgrade 后消失（往返断言）；upgrade 后旧行数据完好（断言）；两次连续 upgrade 幂等（第二次无操作断言） |
| **前置** | 项目 15 |
| **⚠️ 风险** | Alembic 需独立目录（alembic.ini + env.py），放在实验目录子目录下；演示脚本用 subprocess 调 alembic 命令完成迁移验收 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「Alembic 迁移」。请给我完整代码约 200 行：alembic 最小目录（ini + env.py 指向异步 engine）+ 两版迁移脚本（0001 建表、0002 加列），演示脚本 subprocess 执行 autogenerate/upgrade/downgrade；断言：upgrade 后 PRAGMA table_info 含新列且旧行数据完好、downgrade 后新列消失、再次 upgrade 幂等，依赖 alembic + sqlalchemy + aiosqlite，main.py 中文注释。只输出代码。`

### [x] 项目 17：OAuth2 + JWT 完整链

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~240 行（main.py + 演示脚本） |
| **核心知识点** | OAuth2PasswordBearer 与 /token 端点（password flow）、access/refresh 双令牌的 exp 与用途区分、PyJWT 签发与校验（HS256/exp/sub/aud）、bcrypt 密码哈希、get_current_user 依赖保护路由 |
| **技术栈** | pyjwt + bcrypt（⚠️ 开工时补装）+ fastapi 0.142.2 |
| **验收标准** | password flow 登录返回 access/refresh 双令牌且两者 exp 不同（解码断言）；带 Bearer access 访问 /me 返回 200 且 sub 为当前用户名；access 过期后用 refresh 换新 access 成功（断言）；无 token、篡改签名、错误密钥签发三路均 401（三条断言）；refresh 令牌不能访问 /me（用途区分断言）；用户表只存 bcrypt 哈希无明文（断言） |
| **前置** | 项目 8 |
| **⚠️ 风险** | HS256 密钥须 ≥32 字节（短密钥触发 PyJWT 告警）；预期 401 的请求日志按预期失败静音，保持 stderr 干净 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「OAuth2 + JWT 完整链」。请给我完整代码约 240 行：/token 端点（bcrypt 验密码）签发 access(15min)/refresh(1d) 双令牌（HS256，密钥 ≥32B，payload 含 sub/exp/type），refresh 端点换新 access，get_current_user 依赖只认 type=access 并保护 /me；演示脚本断言：双令牌 exp 不同、带 access 访问 /me 200 且 sub 正确、过期 access 换新成功、无 token/篡改/错密钥三路 401、refresh 访问 /me 被拒、库无明文密码，依赖 fastapi + pyjwt + bcrypt + httpx，main.py 中文注释。只输出代码。`

### [x] 项目 18：依赖链做 RBAC

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行（main.py + 演示脚本） |
| **核心知识点** | get_current_user → require_role("admin") 分层依赖组装、401 与 403 的语义区分（WWW-Authenticate 头）、依赖短路时下游零调用、同一依赖树多路由复用 |
| **技术栈** | fastapi 0.142.2 + pyjwt + bcrypt（⚠️ 沿用项目 17 补装） |
| **验收标准** | admin 访问管理路由 200、普通用户 403、匿名 401（三段断言）；401 响应带 WWW-Authenticate 头、403 不带（语义区分断言）；require_role 失败时业务依赖与端点零调用（计数断言）；同一依赖树被 ≥2 个管理路由复用且各自生效（断言） |
| **前置** | 项目 9、17 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「依赖链做 RBAC」。请给我完整代码约 200 行：get_current_user（JWT 解码）→ require_role("admin")（角色不足 403）分层依赖，管理端点（删除用户/查看审计）挂同一依赖树，匿名/用户/管理员三角色对照；演示脚本断言：匿名 401 带 WWW-Authenticate、普通用户 403 不带该头、admin 200、角色不足时下游依赖与端点零调用（计数），依赖 fastapi + pyjwt + bcrypt + httpx，main.py 中文注释。只输出代码。`

### [x] 项目 19：中间件与可观测性

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~200 行（main.py + 演示脚本） |
| **核心知识点** | @app.middleware("http") 请求前后时序、耗时中间件（X-Process-Time）、request_id 生成与贯穿（响应头 + 应用日志同 ID）、上游 X-Request-ID 沿用、ServerErrorMiddleware 在最外层的边界 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0（已实测装通；实验未实现） |
| **验收标准** | 每个响应带 X-Process-Time 且为正数（断言）；request_id 中间件生成 ID 并贯穿响应头与应用日志（同 ID 断言）；上游传来的 X-Request-ID 被沿用而非新生成（断言）；异常路径响应仍为统一错误信封且日志含堆栈（断言）；未处理异常的 500 不经过业务中间件（响应无耗时头，ServerErrorMiddleware 在最外层——实测修正预期） |
| **前置** | 项目 4、11 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「中间件与可观测性」。请给我完整代码约 200 行：耗时中间件写 X-Process-Time、request_id 中间件（上游带 X-Request-ID 则沿用否则生成 uuid4）把 ID 放进响应头与每行应用日志、异常路径走项目 4 的统一信封；演示脚本断言：所有响应耗时头为正数、响应头与日志行同 request_id、上游 ID 被沿用、未处理异常 500 无耗时头且堆栈只进日志，依赖 fastapi + uvicorn + httpx，main.py 中文注释。只输出代码。`

---

## 🗂️ 第五阶段：生产化与交付（项目 20-25）

> **目标**：测试、配置、限流、部署、压测——以一个串联前序全部实验的短链接服务完成交付

### [x] 项目 20：测试体系

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~230 行（app + tests + conftest） |
| **核心知识点** | TestClient（同步）与 httpx.AsyncClient（异步）双客户端、conftest fixture 蓝图（app/client/假 DB 三层）、参数化用例、契约测试（以 /openapi.json 为契约）、测试间隔离 |
| **技术栈** | fastapi 0.142.2 + pytest 9.1.1 + httpx 0.28.1（已实测装通；实验未实现） |
| **验收标准** | pytest 套件 ≥15 条全绿（TestClient 覆盖同步路径、AsyncClient 覆盖 async 路径）；conftest 的 app/client/假 DB fixture 被 ≥3 个测试模块复用（断言导入）；契约测试断言 /openapi.json 含约定路径与必填字段（缺一个即红）；fixture 每条用例重建内存 DB，两条用例写同名资源互不污染（隔离断言） |
| **前置** | 项目 9、15 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「测试体系」。请给我完整代码约 230 行：一个待测 API（沿用项目 15 的 async CRUD 简化版）+ conftest（app fixture、client fixture 双实现、每用例重建的内存 DB fixture）+ tests（≥15 条：CRUD、422、404、契约、隔离），契约测试读 /openapi.json 断言约定路径与字段；pytest 全绿且输出条数统计，依赖 fastapi + pytest + httpx，中文注释。只输出代码。`

### [x] 项目 21：配置管理与多环境

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~180 行（main.py + 演示脚本 + 多环境 .env 文件） |
| **核心知识点** | pydantic-settings 的 BaseSettings、.env 文件与进程环境变量双来源及优先级、12-factor 配置原则、多环境切换（dev/prod）、缺配置启动即失败、字符串到 bool/int 的类型纠错 |
| **技术栈** | pydantic-settings（⚠️ 开工时补装）+ fastapi 0.142.2 |
| **验收标准** | .env 与进程环境变量双来源、环境变量优先级更高（同名覆盖断言）；dev/prod 切换后应用行为不同（如 debug 端点开关断言）；缺必填配置时启动即失败且报错含字段名（ValidationError 断言）；字符串 "true"→bool、"5"→int 的类型纠错（断言） |
| **前置** | 项目 10 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「配置管理与多环境」。请给我完整代码约 180 行：BaseSettings 定义 APP_NAME/DEBUG/DATABASE_URL/MAX_CONNECTIONS，.env.dev 与 .env.prod 两套文件 + 进程环境变量覆盖演示，应用按 DEBUG 开关暴露 debug 端点；演示脚本断言：环境变量优先级高于 .env（同名覆盖）、切换 ENV 后行为不同、缺必填配置启动即报 ValidationError 且含字段名、"true"→bool 与 "5"→int 类型纠错，依赖 fastapi + pydantic-settings，中文注释。只输出代码。`

### [x] 项目 22：缓存与限流

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行（main.py + 演示脚本） |
| **核心知识点** | 手写令牌桶限流（速率 + 容量 + Retry-After）、进程内 TTL 缓存、缓存边界（DB 调用计数）、并发击穿与 singleflight 锁、缓存与限流都挂在依赖上 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0 + httpx 0.28.1（已实测装通；实验未实现） |
| **验收标准** | 手写令牌桶：超速率连发部分 429 且带 Retry-After 头、窗口恢复后 200（计数断言）；TTL 缓存第二次查询 DB 计数不增（计数断言）；TTL 过期后重新回源（计数再增断言）；并发 20 同时击穿同一 key，实际 DB 查询仅 1 次（singleflight 锁断言） |
| **前置** | 项目 8、11 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「缓存与限流」。请给我完整代码约 220 行：手写令牌桶依赖（rate/capacity 可参数化，超发 429 带 Retry-After）+ 进程内 TTL 缓存 + singleflight 锁防并发击穿，DB 查询带计数器；演示脚本断言：超速率部分 429 且恢复后 200、第二次查询 DB 计数不增、TTL 过期回源计数再增、并发 20 击穿同一 key 实际只查 1 次，依赖 fastapi + httpx，main.py 中文注释。只输出代码。`

### [x] 项目 23：workers 模型与 Docker

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~220 行（部署脚本 + Dockerfile + 多阶段对照） |
| **核心知识点** | uvicorn --workers 进程模型、gunicorn -k uvicorn.workers.UvicornWorker 的 master/worker 模型、多阶段 Dockerfile（builder + runtime）与镜像体积、/healthz 健康检查 |
| **技术栈** | uvicorn 0.54.0 + gunicorn（⚠️ 开工时补装）+ Docker（daemon 就绪后使用） |
| **验收标准** | uvicorn --workers 4 压 100 请求，worker 日志收集到 ≥3 个不同 PID（多进程分发断言）；gunicorn -k uvicorn.workers.UvicornWorker 同断言（双栈对照）；docker build 后容器内 /healthz 200 且完整请求流程跑通；多阶段与单阶段镜像体积对比记录（数据誊进 README） |
| **前置** | 项目 11、21 |
| **⚠️ 风险** | Docker daemon 未启动先 `open -a Docker` 等就绪；首次 build 拉基础镜像受网络影响，可换国内镜像源 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「workers 模型与 Docker」。请给我完整代码约 220 行：① 演示脚本分别以 uvicorn --workers 4 与 gunicorn -k uvicorn.workers.UvicornWorker -w 4 起服务，httpx 并发压 100 请求收集日志 PID（各断言 ≥3 个不同 PID）；② 多阶段 Dockerfile（builder 装 .venv、runtime 只拷产物）+ /healthz，build 后容器内 curl 200，输出两阶段镜像体积对比；依赖 uvicorn + gunicorn + docker，中文注释。只输出代码。`

### [ ] 项目 24：🏁 综合交付 —— 短链接服务

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~350 行（app + pytest 套件 + Dockerfile） |
| **核心知识点** | 全链路串联：缩短/302 重定向/点击统计/自定义码、唯一约束防碰撞与冲突重试、项目 15 的 async session、项目 17 的 JWT 管理端点、项目 22 的限流与缓存、项目 23 的容器化（每项复用标注来源实验号） |
| **技术栈** | fastapi 0.142.2 + sqlalchemy + aiosqlite + pyjwt + bcrypt（均按前序实验就绪） |
| **验收标准** | POST /shorten 得短码 → GET /{code} 302 到原 URL 且点击计数落库（连点 3 次断言计数 = 3）；并发生成 200 个随机码无碰撞（唯一约束 + 冲突重试，断言全部成功且库中行数 = 200）；pytest 套件 ≥15 条全绿；JWT 保护的管理端点无 token 401（断言）；限流与缓存复用生效（超速率 429、热点短码命中缓存计数断言）；Docker 容器内缩短-重定向全流程跑通 |
| **前置** | 项目 15-23 |
| **⚠️ 风险** | 综合交付项目，工作量 ≈ 2-3 个常规实验，预留一周；先核心缩短-重定向流程，再逐项叠加前序能力 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「短链接服务（综合）」。请给我完整代码约 350 行：FastAPI + SQLAlchemy(async sqlite) 实现 POST /shorten（支持自定义码与过期时间）、GET /{code} 302 重定向并累加点击计数、点击统计端点、JWT 保护的管理端点（复用项目 17）、令牌桶限流与热点缓存（复用项目 22，代码里注释标注来源实验号）；随机码唯一约束 + 冲突重试；pytest ≥15 条覆盖全部验收（并发 200 码无碰撞、连点计数、404、JWT 401、限流 429），附 Dockerfile 与容器内冒烟脚本，中文注释。只输出代码。`

### [x] 项目 25：压测基准

| 项目信息 | 详情 |
|:---|:---|
| **行数** | ~250 行（压测脚本 + 结果对比表生成） |
| **核心知识点** | 同题对决的三种并发客户端（httpx 同步逐个、线程池并发、httpx.AsyncClient asyncio 并发）、QPS 与 p99 的计算方法、压测的公平性控制（同机同条件）、量级与方向比绝对值重要 |
| **技术栈** | fastapi 0.142.2 + uvicorn 0.54.0 + httpx 0.28.1（已实测装通；实验未实现） |
| **验收标准** | 三种客户端对项目 24 的重定向端点各发 1000 请求（并发 50），输出 QPS 与 p99 对比表（数据誊进 README）；p99 计算与手算一致（排序取 99 分位断言）；全部请求零失败（状态码 200 计数断言）；asyncio 并发 QPS 高于同步逐个（方向断言，绝对值不作阈值） |
| **前置** | 项目 23、24 |
| **⚠️ 风险** | 压测绝对值不重要，量级与方向才重要；三者同机同条件、目标端点相同才算公平 |

**🤖 开始提示词**：
> `我要开始 FastAPI 项目「压测基准」。请给我完整代码约 250 行：对短链接服务的 GET /{code} 端点，三种客户端（httpx 同步逐个、concurrent.futures 线程池并发 50、httpx.AsyncClient asyncio 并发 50）各发 1000 请求，统一计时算 QPS 与 p99（排序取 99 分位，函数附单测断言与手算一致），输出三者对比表并记录到 README；断言全部响应 200 且 asyncio 并发 QPS 高于同步逐个，依赖 fastapi + uvicorn + httpx，中文注释。只输出代码。`

---

## 📅 周计划

| 周次 | 内容 | 项目数 |
|:---|:---|:---:|
| **第 1 周** | 项目 1-5（路由与请求地基）| 5 |
| **第 2 周** | 项目 6-8（依赖注入：链 / yield / 类与全局）| 3 |
| **第 3 周** | 项目 9-11（测试替身 + 工厂 + 异步真相）| 3 |
| **第 4 周** | 项目 12-14（后台任务 / WebSocket / 流式）| 3 |
| **第 5 周** | 项目 15-17（async ORM / 迁移 / OAuth2+JWT）| 3 |
| **第 6 周** | 项目 18-20（RBAC / 可观测性 / 测试体系）| 3 |
| **第 7 周** | 项目 21-23（配置 / 缓存限流 / workers 与 Docker）| 3 |
| **第 8 周** | 项目 24-25（综合交付 + 压测基准）| 2 |

## 🏆 里程碑

- [x] **完成项目 1-5** → **请求地基通**：四类参数、模型校验、响应出口、错误契约、表单文件全部落成可断言的演示脚本
- [ ] **完成项目 6-10** → **依赖注入深水区毕业**：说清请求进来之后、视图之前发生的一切，能用替身隔离测试、用工厂消除重复
- [ ] **完成项目 11-14** → **异步真相掌握者**：说清每段代码的真实执行位置，能处理后台任务、长连接与流式响应
- [ ] **完成项目 15-19** → **数据与认证工程师**：async ORM + 迁移 + OAuth2/JWT + RBAC + 可观测性全部落地
- [ ] **完成项目 20-23** → **生产化就绪**：测试体系、多环境配置、限流缓存、容器化部署走得通
- [ ] **完成项目 24-25** → **FastAPI 交付者**：独立交付完整、被测、容器化、有压测数据的短链接服务

## 📝 每日日志

| 日期 | 项目 | 耗时 | 收获 | 踩坑 |
|:---|:---|:---:|:---|:---|
| | | | | |

## 🔧 环境配置

```bash
# 0. 已就绪（✅ 2026-10-04 本机实测）：
#    Python 3.13.9（CPython，arm64）——PEP 668 受管（Homebrew），统一走仓库根 .venv
#    一条命令装好一切：./scripts/load_resources.sh（创建 .venv 并安装依赖）
# 1. 一次性初始化（仓库根执行；以下版本组合 2026-10-04 实测装通）：
./scripts/load_resources.sh
#    实测版本：fastapi 0.142.2 / uvicorn 0.54.0 / pydantic 2.13.5 / httpx 0.28.1 /
#    pytest 9.1.1 / python-multipart 0.0.32
# 2. 阶段四、五开工时补装（纯 Python 包，低风险）：
pip install sqlalchemy aiosqlite alembic pyjwt bcrypt pydantic-settings gunicorn
# 3. 每实验开工前：
source .venv/bin/activate && python --version && python -c "import fastapi; print(fastapi.__version__)"
```

## ⚠️ 与已有清单的关系

| 已有清单 | 关系 |
|:---|:---|
| `hands-on-python/docs/python_web_frameworks.md`（已完成 20/20） | **正交互补**：那边的第三阶段是 FastAPI 入门速览（5 个实验，随三框架横向对比展开）；本系列是 FastAPI 纵向深潜，自包含、不要求先读过那边，两系列可独立阅读 |
| `hands-on-python/docs/python_concurrency.md`（并发线） | **衔接不重复**：asyncio 语法在那条线教；本系列项目 11 只讲 async 在 Web 端点的真实执行行为（事件循环 vs 线程池实测），做项目 11 前建议先掌握 asyncio 基础写法 |

## 📚 来源

- [FastAPI 官方文档](https://fastapi.tiangolo.com/zh/)
- [Starlette 文档（FastAPI 的底层 ASGI 框架）](https://www.starlette.io/)
- [Pydantic v2 文档](https://docs.pydantic.dev/latest/)
- [SQLAlchemy 2.0 文档](https://docs.sqlalchemy.org/)
- [Alembic 文档](https://alembic.sqlalchemy.org/)
- [Uvicorn 文档](https://www.uvicorn.org/)
- [MDN HTTP 文档](https://developer.mozilla.org/zh-CN/docs/Web/HTTP)
- [RFC 6455 – The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [MDN Server-sent events](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events)
