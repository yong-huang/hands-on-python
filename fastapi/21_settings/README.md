# 21 · 配置管理与多环境：优先级链、类型门卫与 12-factor

> 同一份代码跑在开发机、测试库与生产库，差的只是配置。本实验用 pydantic-settings
> 实测那条优先级链——环境变量压过 env 文件、env 文件压过默认值——并让非法配置
> 在启动时就炸出来，而不是半夜在 production 上炸。

## Background

配置硬编码在代码里的时代：阈值写 `10`，密钥直接赋给常量，换环境靠改代码再发版。

撞墙有两处。一是密钥随代码进了版本库，离职员工的邮箱里都躺着生产的 SECRET；
二是"在我机器上是好的"——开发机 debug 开着、阈值是 10，上了生产原样带过去，
没人说得清当前生效的是哪套值。

12-factor（十二要素应用方法论，2011 年由 Heroku 工程师整理成文）第三条给出答案：
**配置存于环境**，代码只有一份。pydantic-settings 把这条原则做成了一道启动期
的类型门卫。

## What

**Settings 类**继承 BaseSettings，字段即配置项：类型注解决定怎么转换，约束
决定合不合法，读取顺序固定为**环境变量 > env 文件 > 默认值**。

可以把 Settings 想象成**配置的门卫**：按优先级收件、验类型、不合格当场拒收。
但和门卫不同的是，它拒收的方式是让整个应用起不来——非法配置宁可启动失败，
也不带病上线。

| 手段 | 类型转换 | 校验 | 多环境 |
|:--|:--|:--|:--|
| `os.environ` 直读 | 手写 | 无 | 手写 |
| 手读 .env 文件 | 手写 | 无 | 手写 |
| pydantic-settings | 自动 | Field 约束 | env_file 参数 |

三个来源按优先级汇入 Settings 门卫，通过校验的配置以单例形态供应全进程——环境变量那条永远最先查。

![Lab 21 · 配置优先级链：环境变量压过文件，文件压过默认值](images/settings.svg)

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/fastapi/21_settings/images/settings.html)
> （或本地打开 [`images/settings.html`](images/settings.html)）。

## When to Use

- 配置项超过三五个、或含非字符串类型时：类型门卫立刻回本。
- 团队项目：`.env.example` 模板进版本库，新人复制即得可跑环境。
- 何时不用：一次性脚本里一两个 `os.environ.get` 足够；为两行配置引一整套
  Settings 是过度工程。

## Quick Start

前置：fastapi 目录 `.venv` 已就绪（pydantic-settings 已装），未创建则先在仓库根执行
`./scripts/load_resources.sh`。运行：

```bash
cd fastapi/21_settings && ./21_settings.sh demo
```

真实输出（节选，`...` 处省略了中间输出）：

```text
=====> [1/5] 优先级链实测: 默认值 -> .env 文件 -> 环境变量
    /config -> {'app_name': 'lab21-dev', 'debug': True, 'threshold': 10, ...}
    [PASS] .env.dev 的 threshold=10 生效

=====> [2/5] 环境变量覆盖 env 文件(优先级最高)
    /config -> {'app_name': 'lab21', 'debug': False, 'threshold': 55, ...}
    [PASS] 环境变量 LAB21_THRESHOLD=55 压过 .env.dev 的 10

=====> [3/5] 类型校验: 非法值让启动直接失败(pydantic-settings 拒收)
    启动失败现场(日志摘录):
        pydantic_core._pydantic_core.ValidationError: 1 validation error for Settings
        threshold
    [PASS] 非法值被拒收, 进程未起来
...
=====> [5/5] 敏感配置走环境注入(呼应 lab 17 的 SECRET)
    /config -> {'app_name': 'lab21-prod', ..., 'secret': '***已注入***'}
    [PASS] SECRET 从环境注入(回显打码)
  演示完成: 7 项断言全部通过。
```

诚实预期：threshold 三套环境的值（10/1/90）由仓库内 env 文件决定，恒定不变。

非法值报错文案含 `ValidationError for Settings` 与字段名 `threshold`（pydantic
2.13 措辞）。`LAB21_ENV_FILE=.env.prod` 与环境变量同用时，环境变量仍最高。

## How It Works

**优先级链的实现顺序**：Settings 初始化时逐字段先查环境变量（`env_prefix`
拼字段名），查不到再读 env_file，最后落默认值。`LAB21_ENV_FILE` 是本实验
自己的开关——`os.getenv` 在类定义前读它决定挂哪套文件。

**类型转换发生在收件时**：环境变量永远是字符串，`threshold=55` 进来是
`"55"`，Field 的 `ge=1, le=100` 验的是转换后的 int。`"abc"` 转不动——
ValidationError 在第一次实例化时抛出，进程拒绝工作。

**`@lru_cache` 让配置全程单例**：`get_settings` 的缓存键是函数本身
（呼应 lab 10），进程内首次调用后处处复用同一 Settings 对象。代价是测试里
改环境变量不生效——见下节第一坑。

## Pitfalls & Q&A

- **env_prefix 忘写**：`DEBUG` 这类通用名会读到别的工具的变量。加
  `env_prefix="LAB21_"` 圈定自己的命名空间。
- **lru_cache 缓存了配置**：测试里 `monkeypatch.setenv` 后再调 `get_settings`
  拿到的还是旧对象。解法：测试里先 `get_settings.cache_clear()`。
- **.env.prod 误提交**：模板（.env.example）进版本库，真实值文件进
  .gitignore；CI 里加一条"版本库中不得出现真实 SECRET"的检查。
- **bool 的解析语义**：pydantic-settings 对 `LAB21_DEBUG=false` 解析为 False，
  但 `LAB21_DEBUG=""` 会报错而非 False——留空和关闭是两回事，按实测为准。

**Q：为什么环境变量优先级最高？** 12-factor 的部署语义：运维在部署层做的
临时调整必须压过仓库里的文件，否则"改配置"又变回"改代码"。

**Q：多环境该建几个文件？** 每个部署环境一个（dev/test/prod），共用的默认
留在字段默认值里。文件数 = 环境数，不要做"万能 env"。

**Q：配置热更新呢？** pydantic-settings 不做热更新——lru_cache 单例在进程内
终身有效。需要热更新就走配置中心，那是另一个量级的设施。
