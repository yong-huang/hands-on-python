# 08 · Pydantic 校验与自动文档：类型驱动的新范式

> Flask 的世界里，校验靠 WTForms 显式声明、文档靠手写；
> FastAPI 把这两件事从**类型注解**里"长"出来——`Field(ge=0, max_length=20, pattern=...)`
> 同时是校验规则、文档说明和出口契约。本实验用 4 组违规 payload 证明"违规请求进不了
> handler"，用 `internal_price` 证明 response_model 的出口闸，用 openapi.json 证明
> 约束被自动编译成了文档。

## What

手写校验的痛点是"规则与实现分离"：文档写 price ≥ 0，代码里却忘了查——两张皮。FastAPI 的答案是把契约做进函数签名：**注解就是校验**（违规 422，loc 精确指向字段）、**模型就是文档**（OpenAPI 由代码生成，永不过期）、**response_model 就是出口闸**（内部字段被裁剪，多配的也不会泄露）。一句话心智模型：**请求先过"解析三来源 → Pydantic 约束"两道门，handler 拿到的已是验证过的实例；出口再过 response_model 裁剪**。

## Why

三件事共享同一份类型定义，改一处全生效。本实验每一件都有断言：负价格 422 指向 `body.price`、响应只剩 3 个合法字段、schema 里 `minimum: 0` 原样在案。

## How

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

========================================================
[3. response_model 出口闸：internal_price 永不外泄（验收点）]
========================================================
  handler 返回了 5 个字段的 dict，响应只有 3 个: ['name', 'price', 'sku']

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
- **stderr 静音了一条 starlette 提示**（testclient 配 httpx2 更佳）：本系列刻意用 httpx（清单实测组合），提示与本实验无关

### 三类参数：函数签名就是接口契约

路径参数 `item_id: int = Path(ge=1)`、查询参数 `keyword: str = Query(min_length=2)`、请求体 `item: ItemIn`——三种来源、同一套约束语法。类型不只是提示：`price: float` 意味着 `"399"`（字符串）也能被强制转换进来，而 `"abc"` 直接 422。**解析 → 类型转换 → 约束校验**三步全部发生在 handler 之前。

### Pydantic v2 的模型：约束写在字段上

`Field(ge=0, max_length=20, pattern=r"^[A-Z]{3}-\d{4}$")` 覆盖数值边界、长度、正则三类最常用约束。v2 相对 v1 的高频差异：`regex=` → `pattern=`、`.dict()` → `model_dump()`、`parse_obj` → `model_validate`、校验核心换成了 Rust 实现的 pydantic-core（快 5-50 倍）。网上旧教程的 v1 写法要能认出来。

### response_model：出口闸与输入模型分离

`ItemIn` 管输入约束，`ItemOut` 管输出形状——**同一资源的进出分开建模**是 FastAPI 的标准姿势。handler 返回全量 dict（含 `internal_price`、`owner`），response_model 按输出模型裁剪。安全意义：新增敏感字段时只要不进 ItemOut 就不会泄露——防线在模型层，不靠人肉记得删。

### OpenAPI：文档是编译产物

`/openapi.json` 是从路由表与模型**自动编译**出的规范：`ge=0` 变 `minimum: 0`、pattern 原样在案、每个模型成为 `components.schemas` 成员。`/docs`（Swagger UI）只是这份 JSON 的交互皮。文档永不过期的原因：它与代码同源——改了模型没改文档是不可能的。

## Deep Dive

**为什么校验断言查 `loc` 而不是只查 422？**

```python
locs = [tuple(e["loc"]) for e in r.json()["detail"]]
assert ("body", field) in locs, f"errors 应指向 body.{field}: {locs}"
```

只断言 422 是弱校验：字段约束改错对象（比如负价格被 name 的规则拦下）也是 422。`loc` 是 FastAPI 的字段级定位承诺——查它才算验证了"对的规则拦下了对的错"。这是把接口契约测到字段粒度的做法。

踩坑清单：

- **忘了 response_model，直接 return 全量 dict**：内部字段原样出网——本项目 `internal_price` 若没有出口闸就直接泄露；这不是理论风险，是"加字段忘了删"的现实路径
- **`Query()` 无默认值写法**：`keyword: str = Query(min_length=2)` 有默认 None → 变可选；必填要写 `Query(..., min_length=2)` 或干脆不用默认值语法
- **v1 教程的 `regex=` / `.dict()`**：v2 里 `regex` 参数已移除（会直接报错）、`.dict()` 触发弃用告警；认得出旧写法是新项目避坑的基本功
- **依赖 httpx 的 TestClient**：`TestClient` 需要 httpx，没装会 `ImportError`——它不在 fastapi 的必需依赖里（本系列 requirements 已含）

## Q&A

**Q1: FastAPI 的 422 错误结构是什么？前端怎么利用？**
`detail` 数组，每项含 `loc`（来源+字段路径）、`msg`（英文错误描述）、`type`（错误类型码）。前端按 loc 精确定位到表单字段渲染错误——字段级反馈不需要自己写映射。

**Q2: path/query/body 的同名参数冲突时 FastAPI 怎么区分？**
标量类型（int/str…）默认解析为查询参数；路径里出现过的名字解析为路径参数；Pydantic 模型注解解析为 body。要显式指定用 `Path()`/`Query()`/`Body()` 包裹——这也是给约束留位置的地方。
