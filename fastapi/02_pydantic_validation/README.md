# 02 · Pydantic 模型与校验体系：把请求体的检查规则写成声明

> 本实验用「订单创建」API 展示 FastAPI 请求体校验的完整链路：嵌套模型、Field 约束、
> field_validator / model_validator、computed_field 演生字段，以及 422 错误体里的 loc
> 路径如何逐层指向嵌套字段。跑通 `./02_pydantic_validation.sh all` 即可复现全部输出。

## Background

没有校验库的时代，请求体的检查长在端点函数（处理该 URL 的函数）里：一段接一段的 `if` 与 `raise`。
一个下单接口要手写"邮箱含 @、单价大于 0、数量是正整数、列表非空"等十几次判断。

痛点在两处：一是重复，同一条"price 必须大于 0"在创建、更新、批量导入三个接口各抄一遍；
二是漂移，三份副本改一漏二，错误格式还随人手不同。演进方向由此确定：把规则从过程代码搬到
数据形状的声明上，由统一引擎执行并输出统一格式的错误；FastAPI 把这台引擎内建在参数声明里。

## What

Pydantic 是一个基于类型注解的数据校验与序列化库；BaseModel 是它的规则载体——继承它定义
一个类，每个带注解的字段就是一条检查项。FastAPI 看到参数标注了 BaseModel，就把 JSON
请求体交给它检查，失败自动返回 422（HTTP 状态码，"结构可读但内容不合规"）。

可以把模型想成收费站前的闸门：请求体必须整辆通过，任何一个零件不合规都当场拦下。
但闸门只查进来的形状，不保证用途合法——"库存够不够"这类要查数据库的规则，
得由端点函数或跨字段校验器另行处理。

| 部件 | 职责 | 本实验的例子 |
|---|---|---|
| `Field` | 单字段约束 | `price: float = Field(gt=0)` |
| `field_validator` | 单字段的定制检查或改写 | 优惠券 strip+upper 归一化 |
| `model_validator` | 跨字段规则 | 订单总价不得超过 10000 元 |
| `computed_field` | 由其他字段算出的输出字段 | `total` 与 `discount` |

这四类部件在一条校验管线上的位置如下：主路径逐层放行，任一层失败都汇入
同一个 422 出口，`loc`（出错字段的位置路径，How It Works 详述）逐层指认到具体字段。

![Lab 02 · 请求体校验管线：从 JSON 文本到模型实例](images/pydantic_validation.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/02_pydantic_validation/images/pydantic_validation.html)
> （或本地打开 [`images/pydantic_validation.html`](images/pydantic_validation.html)）。

## When to Use

- 对外 API 的请求体与响应结构：字段多、嵌套深、调用方不可控，声明式校验收益最大。
- 解析外部配置或第三方回调：把形状不可信的数据一次性转成带类型的对象。
- 团队内部的数据契约：用 BaseModel 替代裸 dict 传参，字段拼错在实例化时就报错。

何时不用：一次性脚本解析一两行文本，直接取值更快；性能敏感的热点路径上把同一批数据
反复解析成模型，转换开销会累积；对纯透传、不读内容的代理逻辑，模型层没有意义。

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| 手写 if/raise | 零依赖，但规则重复、错误格式不统一 | 单接口、三五条规则的小脚本 |
| marshmallow | 同为声明式校验库，需显式调用 `load()` | 已有 marshmallow 存量代码的旧项目 |
| Pydantic | 注解即规则，与 FastAPI 和类型系统原生集成 | FastAPI 项目与新建 Python 服务 |

## Quick Start

前置：fastapi 目录 `.venv`（fastapi / uvicorn / httpx 已装好；未创建则先在 fastapi 目录执行 `fastapi/scripts/load_resources.sh`）；实验零外部服务，HTTP 服务由脚本自行拉起、自行清理。

```bash
cd fastapi/02_pydantic_validation
./02_pydantic_validation.sh all   # start -> 6 章演示与断言 -> clean
```

真实输出示例（节选，`created_at` 时间戳每次运行不同；`order_no` 由全新进程从 ORD-1001 重新计数，与示例一致）：

```text
=====> [2] 合法创建：完整请求 -> 201，computed_field 现场算出 total 与 discount
$ curl -s -X POST http://127.0.0.1:8902/orders -H 'Content-Type: application/json' -d @valid.json
HTTP 201
{
  "status": "created",
  "coupon": "VIP2026",
  "total": 1057.5,
  "discount": 105.75,
  "order_no": "ORD-1001",
  "created_at": "2026-10-04T01:27:34+00:00"
}
...（httpx 断言脚本再 POST 一次相同请求，生成第二张订单 ORD-1002）
[OK] 201；order_no=ORD-1002；total=1057.5；discount=105.75
[OK] GET /orders/ORD-1002 回读一致（200）；不存在的订单号 -> 404
...
=====> [6] 约束违约一览：5 种违约各打一枪，看第一条错误的 loc / msg / type
[OK] email 不匹配 pattern
     loc=['body', 'customer', 'email']  type=string_pattern_mismatch
...
[OK] 5 种违约的 loc/msg/type 全部符合预期
=====> [done] 6 章演示与断言全部通过
=====> [clean] 杀掉 uvicorn，确认端口 8902 释放，无残留
端口 8902 已释放，PID/日志/临时文件已清理
```

诚实预期：6 章共 14 行 `[OK]` 断言，422 章节会打印错误全文；脚本结束时端口释放。想手动交互就先 `start`，再按 `main.py` 注释用 curl 试。

## How It Works

### 校验管线：JSON 文本到模型实例

一条请求进来，FastAPI 按四步走：

1. JSON 文本解析成 Python 对象；
2. 按 `Order` 定义逐层构造子模型（`Customer` 与每个 `OrderItem`）；
3. 构造期间执行约束与校验器；
4. 全部通过后，端点函数拿到带类型的对象。

章节 [2] 的 201 响应里，`total` 与
`discount` 不是客户端传的，而是 `@computed_field` 在序列化时现场计算的。

### loc 路径：422 错误怎么精确指认字段

`loc` 是错误定位路径：起点固定为 `body`，其后逐层是字段名，进入列表后换成数字下标。
第二个 item 的单价非法，得到 `["body","items",1,"price"]`（章节 [3] 的 422 全文），
前端拿这一条就能把红框画到具体输入框。

模型级错误不再下钻：`model_validator` 抛出的 `ValueError`，`loc` 停在 `["body"]`、
`type` 为 `value_error`（章节 [4] 的总价上限拦截）。

### 两种校验器与执行顺序

字段级管线分三段：`mode="before"` 校验器 → 核心校验（类型转换与 pattern 等约束）→
`mode="after"` 校验器。优惠券归一必须用 before，原因在顺序：

```python
@field_validator("coupon", mode="before")   # pattern 属于核心校验，先于 after 执行
@classmethod
def normalize_coupon_code(cls, value: object) -> object:
    if isinstance(value, str):              # "  vip2026  " -> "VIP2026"
        return value.strip().upper()        # 先归一，pattern 才能通过
    return value
```

若写成 `mode="after"`，`"vip2026"` 会在 pattern 检查处直接 422，after 校验器没有机会
执行。章节 [5] 里小写带空格的请求能变成响应中的 `"VIP2026"`，靠的就是这个顺序。

`model_validator(mode="after")` 在整棵模型树构造完成后运行，`self` 已是带数据的实例，
适合总价上限这类跨字段规则；抛出的 `ValueError` 由 pydantic 包装，归入模型级 loc。

### 连锁失败：批量端点的全有或全无

`POST /orders/batch` 接收 `list[Order]`，是故意保留的连锁失败演示：校验沿数组下标逐项
下钻，第二条订单的价格非法得到 `loc=["body",1,"items",0,"price"]`。校验发生在端点函数执行
之前，一条失败整批 422，不存在"半批成功"的中间状态。

## Pitfalls & Q&A

踩坑清单（现象、原因、解法）：

- `field_validator` 忘写 `return`：函数返回值就是校验结果，漏掉 return 会让字段静默变成
  `None`，不报任何错，问题在下游才暴露。解法：每个分支都要有返回值。
- 可变默认值：pydantic 会对 `Field(default=[])` 做拷贝，列表不会跨实例共享；真正的坑是
  `default=datetime.now()` 这类调用式默认——它在类定义时求值一次、全体实例共用，
  解法是换成 `default_factory=datetime.now`。
- `model_validator(mode="before")` 拿到的是原始 dict：模型尚未构造，没有 `self`，跨字段
  要用 `values.get("items")` 读、`return values` 交还；写成 `return self` 直接报错。

深入问答：

- 为什么是 422 而不是 400？400 常用于请求本身无法解析（如非法 JSON）；422 表示结构可读
  但内容不合规。FastAPI 把校验失败映射为 422，要统一错误契约时可写异常处理器改写。
- 客户端在请求里提交 `total` 会怎样？`computed_field` 只属于输出：同名输入按 extra 字段
  处理，默认忽略，不影响服务端计算值，这正是"演生字段不可注入"的边界。
- 本实验的 email 为什么用 `pattern` 不用 `EmailStr`？`EmailStr` 依赖 email-validator 包，本仓库 `.venv` 未安装，导入即报错；生产项目装上后应优先 `EmailStr`。
