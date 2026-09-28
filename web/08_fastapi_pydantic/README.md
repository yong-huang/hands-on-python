# 08 · Pydantic 校验与自动文档：类型驱动的新范式

> FastAPI 把接口校验与 API 文档从**类型注解**里"长"出来——`Field(ge=0, max_length=20, pattern=...)`
> 同时是校验规则、文档说明和出口契约。本实验用 4 组违规 payload 证明"违规请求进不了
> handler"，用 `internal_price` 证明 response_model 的出口闸，用 openapi.json 证明
> 约束被自动编译成了文档。

## Background

这节回答两个问题：类型注解普及之前，API 的校验与文档怎么做，痛点在哪。

早期的 Python Web API，校验靠在每个 handler（处理一个请求的路由函数，Flask 里叫视图函数）里手写 `if`/`raise`：价格非负、名字限长、编码匹配正则，一条条写成命令式判断。文档则是另一摊活——在 wiki 或 Swagger YAML 里手工描述"price ≥ 0"。

痛点是"规则与实现分离"：文档写 price ≥ 0，代码里却忘了查——两张皮；反过来，改了代码没改文档，接口消费方拿着过期说明对接，联调对不上。校验代码还在每个接口重复出现，散落、难测。

Pydantic 应运而生：一个基于类型注解的数据校验库——声明"这个字段是 float 且 ge=0"，库负责解析与拦截。FastAPI 在其上走得更远：把模型注解直接写进函数签名，校验、文档、出口裁剪全部由同一份类型定义派生。本实验要证明的就是这个派生链条真实成立。

## What

这节定义 Pydantic 与 FastAPI 的分工、一个心智模型，以及全文覆盖的机制总览。

Pydantic 是 Python 的数据校验库：用类型注解声明数据模型（BaseModel 的子类），实例化时自动完成解析、类型转换与约束校验。

FastAPI 是构建在它之上的 Web 框架：**注解就是校验**（违规 422，loc 精确指向字段）、**模型就是文档**（OpenAPI 由代码生成，永不过期）、**response_model 就是出口闸**（内部字段被裁剪，多配的也不会泄露）。

一句话心智模型：**请求先过"解析三来源 → Pydantic 约束"两道门，handler 拿到的已是验证过的实例；出口再过 response_model 裁剪**。三件事共享同一份类型定义，改一处全生效。

可以把这套机制想象成机场安检：值机口核对"来源"（路径/查询/请求体——即参数从哪里来），安检门执行"约束"（Field 规则），登机口还有一道"出口闸"（response_model，禁止未申报物品出港）。但和机场不同的是，这三道关卡是同一个模型类派生的——改一处注解，三道关卡同时生效。

| 机制 | 在本实验中的形态 | 验收方式 |
|---|---|---|
| 签名校验 | `ItemIn` 的 Field 约束 | 4 组违规 payload（故意构造来违反约束的请求体）全部 422，loc 指向字段 |
| response_model | `ItemOut` 只留 3 个合法字段 | handler 返回 5 字段，响应只剩 3 |
| OpenAPI 文档 | `/openapi.json` 与 `/docs` 同源 | `minimum: 0`、pattern 原样在案 |

## When to Use

这节给判断力：什么项目值得采用"类型驱动"的校验与文档，哪些场合不必。

典型场景：

- 在做对外或跨团队 REST API 时——openapi.json 是天然契约，前端按它生成客户端、联调不靠口口相传
- 在做输入来源复杂（路径/查询/请求体混用）的服务时——三类参数一套约束语法，校验代码不再逐接口重写
- 在做内部字段多、怕误泄露的服务时——response_model 把"哪些字段能出网"固化在模型层，不靠人肉记得删

何时不用：

- 一次性内部脚本、无对外契约的页面：校验与文档都用不上，引框架是负担
- 遗留 Django 项目：Django REST framework 的 serializer 体系已覆盖同类需求，不必混搭
- 极简原型：几个接口直接手写判断更快，契约意识可以等接口稳定再补

同类方案对比：

| 方案 | 与 FastAPI+Pydantic 的差异 | 什么时候选它 |
|---|---|---|
| 手写 if/raise | 零依赖，但规则散在各 handler，无文档派生 | 一两个接口的内部小件 |
| Flask + Marshmallow/WTForms | 校验库与文档分开维护，仍是两张皮 | 已有 Flask 存量项目 |
| Django REST framework | serializer 显式声明，生态完整但绑定 Django | 项目本身基于 Django |
| gRPC/protobuf | 先写 schema 再生成代码（schema-first），强类型但非 HTTP JSON | 内部服务间高性能 RPC |

## Quick Start

这节把演示跑起来：一条命令、一段真实输出、三条诚实预期，再看模型与路由怎么声明。

本实验每一件都有断言：负价格 422 指向 `body.price`、响应只剩 3 个合法字段、schema 里 `minimum: 0` 原样在案。

### 运行与真实输出

```bash
cd web/08_fastapi_pydantic
source ../.venv/bin/activate
python3 fastapi_pydantic.py    # 完整演示（4 个小节，内置验收断言）
```

真实输出节选（FastAPI 0.141.1 + Pydantic 2.13.5）：

```
========================================================
[2. 校验实测：422 的 loc 精确指向违例字段（验收点）]
========================================================
  {'name': '负价商品', 'price': -1.0, ...   → 422 · loc 指向 body.price
  {'name': 'xxxxxxxxxxxxxxxxxxxxx', ...    → 422 · loc 指向 body.name
  {'name': '坏编码', 'price': 1.0, ...     → 422 · loc 指向 body.sku
  {'name': '缺价格', ...                   → 422 · loc 指向 body.price
  GET /items/0（路径参数 ge=1 违例）→ 422 · loc 指向 path.item_id
  对比项目 5 的 WTForms：约束写在类型注解里，handler 一行校验代码都不用写

========================================================
[3. response_model 出口闸：internal_price 永不外泄（验收点）]
========================================================
  handler 返回了 5 个字段的 dict，响应只有 3 个: ['name', 'price', 'sku']
  出口闸的意义：新增内部字段时（如 owner），忘了改接口也不会泄露——模型说了算

========================================================
[4. 自动文档：/openapi.json 与 /docs 同源（验收点）]
========================================================
  openapi.json: title='商品目录 API' · schemas=['HTTPValidationError', 'ItemIn', 'ItemOut', ...]
  ItemIn.price 带 minimum=0、sku 带 pattern——约束自动进了文档
  GET /docs → 200（Swagger 交互页，与本 JSON 同源，零手写）
```

诚实预期：

- **POST 成功返回 200 而非 201**：FastAPI 默认 200；想语义化加 `status_code=201` 即可，本实验为贴合验收标准保持默认
- **422 的 loc 是 `["body", "price"]` 数组**：第一个元素标记来源（body/path/query），第二个起是字段路径——嵌套模型的错误会更长
- **stderr 静音了一条 starlette 提示**（TestClient 配 httpx 更佳）：本系列刻意用 httpx（清单实测组合），提示与本实验无关

### 模型与路由怎么声明

```python
class ItemIn(BaseModel):
    """输入模型：约束全写在字段上——这段注解同时是校验规则与文档"""

    name: str = Field(min_length=1, max_length=20, description="商品名")
    price: float = Field(ge=0, description="售价，不能为负")
    sku: str = Field(pattern=r"^[A-Z]{3}-\d{4}$", description="编码，如 ABC-1234")

@app.post("/items", response_model=ItemOut)
def create_item(item: ItemIn):
    ...
```

这段在做什么：`Field` 覆盖数值边界（`ge=0`）、长度（`max_length=20`）、正则（`pattern=`）三类最常用约束。

路径参数 `item_id: int = Path(ge=1)`、查询参数 `keyword: str = Query(min_length=2)`、请求体 `item: ItemIn`——三种来源、同一套约束语法。

## How It Works

这节按请求的顺序拆机制：参数怎么被解析与拦截、422 的结构、出口闸与文档的派生链路，并与 Quick Start 的输出互相印证。

### 请求进来先过哪几道门

类型不只是提示：`price: float` 意味着 `"399"`（字符串）也能被强制转换进来，而 `"abc"` 直接 422。**解析 → 类型转换 → 约束校验**三步全部发生在 handler 之前——所以违规请求根本进不了函数体（输出 [2] 的五条 422 都是这道门前拦下的）。

FastAPI 靠注解类型识别参数来源：标量类型（int/str…）默认解析为查询参数；路径里出现过的名字解析为路径参数；Pydantic 模型注解解析为 body。要显式指定就用 `Path()`/`Query()`/`Body()` 包裹——这也是给约束留位置的地方。

### 为什么断言要查 loc 而不只是 422

```python
locs = [tuple(e["loc"]) for e in r.json()["detail"]]
assert ("body", field) in locs, f"errors 应指向 body.{field}: {locs}"
```

只断言 422 是弱校验：字段约束改错对象（比如负价格被 name 的规则拦下）也是 422。`loc` 是 FastAPI 的字段级定位承诺——查它才算验证了"对的规则拦下了对的错"。

422 响应的 `detail` 数组每项含 `loc`（来源+字段路径）、`msg`（英文错误描述）、`type`（错误类型码），前端按 loc 精确定位到表单字段渲染错误——字段级反馈不需要自己写映射。

### response_model：出口闸与输入模型分离

`ItemIn` 管输入约束，`ItemOut` 管输出形状——**同一资源的进出分开建模**是 FastAPI 的标准姿势。

handler 返回全量 dict（含 `internal_price`、`owner`），response_model 按输出模型裁剪——输出 [3] 里"返回 5 个字段、响应只有 3 个"就是这道闸的工作记录。安全意义：新增敏感字段时只要不进 ItemOut 就不会泄露——防线在模型层，不靠人肉记得删。

### OpenAPI：文档是编译产物

`/openapi.json` 是从路由表与模型**自动编译**出的规范：`ge=0` 变 `minimum: 0`、pattern 原样在案、每个模型成为 `components.schemas` 成员。

`/docs`（Swagger UI 交互页）只是这份 JSON 的交互皮。文档永不过期的原因：它与代码同源——改了模型没改文档是不可能的。

## Pitfalls & Q&A

这节先列四个真实踩过的坑（现象、原因、解法），再补两个有增量的深入问题。

踩坑清单：

- **忘了 response_model，直接 return 全量 dict**：内部字段原样出网——本项目 `internal_price` 若没有出口闸就直接泄露；这不是理论风险，是"加字段忘了删"的现实路径
- **`Query()` 无默认值写法**：`keyword: str = Query(min_length=2)` 有默认 None → 变可选；必填要写 `Query(..., min_length=2)` 或干脆不用默认值语法
- **v1 教程的 `regex=` / `.dict()`**：v2 里 `regex` 参数已移除（会直接报错）、`.dict()` 触发弃用告警；认得出旧写法是新项目避坑的基本功
- **依赖 httpx 的 TestClient**：`TestClient` 需要 httpx，没装会 `ImportError`——它不在 fastapi 的必需依赖里（本系列 requirements 已含）

**Q1: FastAPI 的 422 错误结构是什么？前端怎么利用？**
结构已在 How It Works 的「为什么断言要查 loc」一节完整给出：`detail` 数组的 loc/msg/type 三件套。

**Q2: path/query/body 的同名参数冲突时 FastAPI 怎么区分？**
识别规则同样在 How It Works 的「请求进来先过哪几道门」一节；显式指定用 `Path()`/`Query()`/`Body()` 包裹。

**Q3: 网上旧教程的 Pydantic v1 写法怎么认？**
核心差异三处：`regex=` → `pattern=`、`.dict()` → `model_dump()`、
`parse_obj` → `model_validate`；

校验核心换成了 Rust 实现的 pydantic-core（快 5-50 倍）。
读旧代码时按这张对照表翻译即可。
