# Video Outline

> **标题**：obj(42) 也能跑？—— Python 可调用对象与 `__call__` 协议
> **主题**：待定（Checkpoint Plan 对齐后填入 theme-id）
> **总时长**：约 3 分 22 秒（口播 ~630 汉字；各步估时累加 202 秒；若按 kokoro 实测 ~5 字/秒折算成片约 2 分 45 秒）
> **章节数**：7 章 / 31 步
> **内容裁剪说明**：延续系列压缩口径（mro-mixin / slots-memory 同款），**信息保留度 ~47%**
> （口播 626 汉字 ÷ article 散文 1331 汉字）。真机数字全保留（10/15、110/130/135、
> 42/200/17、True/False 清单）；代码机制走「代码卡 + 真实输出」画面呈现。刻意压缩：
> Q3 方案对比表（压成 components 章末两步口播 + 画面表格）、MRO 与 lab 12 交叉引用
> （挂画面角标）、`[6]` 代码细节（口播一句 + 画面逐字）、咖啡机比喻（舍弃）。
> 若要求保留度 ≥60%，口播需再加约 80 秒 —— Checkpoint Plan 定夺。

---

## 1. hook — 一个对象能被调用吗（4 steps · ~15s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 悬念原句：`my_func(42)` 能调用，那 `obj(42)` 呢 —— 来源 article 引言 L3
- 答案锚点：只要类定义了 `__call__`，实例就能像函数一样被调用 —— 来源 article 引言 L3-4
- 等价式：`obj(42)` 实际执行的是 `obj.__call__(42)` —— 来源 article §What L10
- 系列坐标：hands-on-python · core / 13 —— 来源 article §How L47-48

**开发计划**：

- step 1 (~3s) — 片头标题页：主标「能被调用的对象」+ 副标「Python `__call__` 协议」+ 右下工程图签
- step 2 (~4s) — 左右对照：`my_func(42)` ✓ 能调 vs `obj(42)` ？悬念
- step 3 (~4s) — 答案 hero：「也能。只要类里定义了 `__call__`」
- step 4 (~4s) — 等价式上屏：`obj(42)` → `obj.__call__(42)`（mono 箭头变换）

口播节选：
> 就一个问题：my_func(42) 能调用，那 obj(42) 呢。……答案是：也能。只要类里定义了 __call__。

---

## 2. multiplier — 最小例子：带配置的函数（3 steps · ~19s）

**信息池**：
- 代码结构：`__init__` 捕获配置参数（`self.factor = factor`）、`__call__` 执行计算 —— 来源 article §What L17-25
- 最小例子：`double = Multiplier(2)` 之后 `double(5)` 返回 `10`，实例带配置 `factor=2` —— 来源 article L14
- 实测输出：`double(5) = 10`、`triple(5) = 15`、`isinstance(double, Multiplier): True`、`callable(double): True` —— 来源 article 输出 L54-58
- 双重身份：既是"函数"又是正经对象 —— 来源 article §What L12 / Q1 L204

**开发计划**：

- step 1 (~5s) — 代码卡：Multiplier 两个方法（`__init__` 存倍数 / `__call__` 做乘法，行注释点角色）
- step 2 (~5s) — 实测：`double = Multiplier(2)` → `double(5)` → `10`（调用与结果一起亮）
- step 3 (~9s) — 双实例对比 `double`/`triple`（同骨架不同配置，`triple(5)=15`）+ 底部双徽章 `callable: True` / `isinstance: True`

口播节选：
> double = Multiplier(2)，它就能当函数使：double(5)，10。……callable 一查，True。isinstance 也在，它还是个正经对象。

---

## 3. state — 带记忆的逻辑：为什么需要它（6 steps · ~31s）

**信息池**：
- 需求原型：一段"带记忆"的逻辑，每次调用累加计数的统计函数 —— 来源 article §Why L32
- 纯函数局限：栈帧（stack frame，一次调用在内存中的临时记录）创建、返回即销毁 —— 来源 article §Why L34
- 老办法一：闭包能存状态，但逻辑一复杂就层层嵌套 —— 来源 article §Why L36
- 老办法二：模块级 global 简单直接，却污染全局命名空间 —— 来源 article §Why L36
- 老办法三：函数挂属性 `fn.counter += 1` 可行，但隐蔽到 review 很难想到 —— 来源 article §Why L36
- 协议化答案：类侧定义特殊方法，`self` 天然是状态的容身之处 —— 来源 article §Why L38

**开发计划**：

- step 1 (~6s) — 需求 hero：一个「每调一次计数 +1」的统计函数意象
- step 2 (~5s) — 纯函数做不到：栈帧出现→销毁的示意，函数体空无一物
- step 3 (~5s) — 老办法一：闭包（嵌套层级越叠越深的示意）
- step 4 (~4s) — 老办法二：global 变量（全局命名空间被污染的示意）
- step 5 (~5s) — 老办法三：函数挂属性（`fn.counter` 隐蔽角落的示意）
- step 6 (~6s) — 第四个答案 hero：`__call__` 协议 + 「self 是状态的容身之处」

口播节选：
> 纯函数做不到。栈帧用完就销毁，函数体里什么都留不下。……__call__ 给了第四个答案。self，天生就是状态的容身之处。

---

## 4. accumulator — 累加器：状态跨调用保留（3 steps · ~24s）

**信息池**：
- 代码关键：`self.total = start` 构造时初始化一次；`__call__` 里 `self.total += x` —— 来源 article §Accumulator L117-129
- 状态机制：调用结束后实例还活着，属性留到下一次调用 —— 来源 article L129 / Deep Dive L192
- 实测输出：`acc(10) = 110`、`acc(20) = 130`、`acc(5) = 135`、`acc.total = 135` —— 来源 article 输出 L60-64
- 坑：同一个 acc 传到别处继续调，total 接着累积；要"从头算"就新建实例 —— 来源 article 坑清单 L197

**开发计划**：

- step 1 (~7s) — 代码卡：Accumulator（`total` 归 100 / `__call__` 加 x 还回去，注释点出"实例还活着"）
- step 2 (~9s) — 实测：三次调用数字递增 110 → 130 → 135（同一实例徽章贯穿）
- step 3 (~8s) — 提醒卡：传出去接着记账；要"从头算"就新建实例

口播节选：
> acc(10) 是 110，acc(20) 是 130，acc(5) 是 135。同一个实例，三次调用，账连着记。

---

## 5. components — 当组件用：策略与验证器（7 steps · ~42s）

**信息池**：
- 策略注入：`Formatter` 把格式化函数作为策略注入，运行时可换成任何可调用对象 —— 来源 article §Formatter L133
- 策略实测：同一份数据 JSON / CSV / Table 三种渲染 —— 来源 article 输出 L67-86
- 扩展成本：新增策略只需添加一个函数；函数、lambda、任何可调用对象都行 —— 来源 article L147
- 验证器设计：职责单一、错误集中收集而非遇第一个就停 —— 来源 article §Validator L151
- 验证实测：`42: OK`、`200: range: must be 0-150`、`17: parity: must be even` —— 来源 article 输出 L88-90
- 何时不用：无状态一次性逻辑直接写函数；状态只有一个变量闭包更轻 —— 来源 article §Why L40 / Q3 表 L229-235

**开发计划**：

- step 1 (~6s) — Formatter 结构：策略函数从外面注入（插头意象）
- step 2 (~6s) — 实测：同一份数据三格式并排（JSON / CSV / Table），策略徽章随之切换
- step 3 (~3s) — 扩展成本 hero：新增格式 = 加一个函数
- step 4 (~5s) — Validator 结构：每条检查一个小验证器，错误集中收集
- step 5 (~5s) — 实测三连：42 通过 / 200 卡范围 / 17 卡奇偶（各报各的）
- step 6 (~7s) — 可增减 + 泛化：验证器、策略都接受函数 / lambda / 任何可调用对象
- step 7 (~10s) — 判断卡两列：什么时候用（多状态 / 要方法 / 要组合）vs 什么时候不用（无状态写函数 / 单变量用闭包）

口播节选：
> 同一份数据，换个策略，JSON、CSV、表格，随便切。……42 全过。200 卡在范围，17 卡在奇偶。各报各的。

---

## 6. callable-check — `callable()` 查什么 + 两个 `__call__`（5 steps · ~37s）

**信息池**：
- 协议本质：`callable(x)` 为 True 当且仅当 x 的**类型**（或 MRO）定义了 `__call__`，检查类型层面而非实例属性 —— 来源 article Deep Dive L174
- 实测清单：`callable(len) / callable(str) / callable(Multiplier(2))` 为 True；`callable(42) / callable(None)` 为 False —— 来源 article 输出 L93-97
- 反直觉点：`callable(str)` 为 True，类本身可调用（触发 `type.__call__` 创建实例）—— 来源 article 诚实预期 L112
- 坑：实例挂 `__call__` 属性骗不过 `callable()`，`a()` 也不走它；要可调用就定义在类上 —— 来源 article 坑清单 L196
- 两个 `__call__`：`Foo(10)` 创建走 `type.__call__`（内部 `__new__` + `__init__`），`foo(5)` 才走你定义的 —— 来源 article L179-190

**开发计划**：

- step 1 (~6s) — 问题 hero：`callable(x)` 到底查什么 → 答案「类型上有没有 `__call__`」
- step 2 (~6s) — True/False 两列清单（函数 / lambda / 内置 vs 42 / None）
- step 3 (~7s) — 反直觉卡：`callable(str)` 也是 True（调用类 = 创建实例）
- step 4 (~9s) — 坑演示：`a.__call__ = lambda: None` 骗不过 `callable`，调用也不走它
- step 5 (~9s) — 两个 `__call__` 分流图：`Foo(10)` 创建（type 的）vs `foo(5)` 调用（你写的）

口播节选：
> callable(x) 到底查什么？查的是 x 的类型上有没有 __call__。……分清两个 __call__：Foo(10) 创建实例，走的是 type 的；foo(5) 才走你写的。

---

## 7. closing — 澄清、装饰器与去哪儿练（3 steps · ~34s）

**信息池**：
- 澄清误解：函数也能挂属性（`fn.custom = 1` 合法，函数有 `__dict__`）；可调用对象真正优势 = 方法 + 多个可读写状态 —— 来源 article 诚实预期 L111 / Q1 L204
- 类装饰器：`@Retry(times=3)` 本质是带 `__call__` 的对象；函数装饰器闭包存状态，类装饰器 `self` 存、更清晰 —— 来源 article Q2 L208-227
- 仓库定位：hands-on-python，零第三方依赖 —— 来源 article §How L44-48
- 运行命令：`cd core/13_callable && python3 callable.py` —— 来源 article How L47-48

**开发计划**：

- step 1 (~11s) — 澄清卡：`fn.custom = 1` 合法（函数有 `__dict__`）→ 真正优势 = 方法 + 多状态
- step 2 (~13s) — 类装饰器一眼：`@Retry(times=3)` 结构 + 「闭包存状态 vs self 存状态」对照
- step 3 (~10s) — CTA：hands-on-python 仓库路径 mono 字体，零依赖 `python3` 一跑就有体感，下期见

口播节选：
> 先澄清一个误会：函数其实也能挂属性，fn.custom = 1 是合法的。……类装饰器也顺带看一眼。@Retry(times=3)，本质就是个带 __call__ 的对象。

---

## 素材清单

### 1. hook
- ✓ 全部画面为文字排版 / 图形演示，无需外部图片

### 2. multiplier
- ✓ 代码卡 + 实测输出 + 双徽章，CSS 自绘

### 3. state
- ✓ 栈帧示意、闭包嵌套示意、老办法对比卡，CSS/SVG 自绘

### 4. accumulator
- ✓ 代码卡 + 递增数字演示，CSS 自绘

### 5. components
- ✓ 策略插头意象、三格式并排、验证器三连，CSS 自绘
- ⚠️ Q3 方案对比表建议直接排版（article L229-235 原表）

### 6. callable-check
- ✓ True/False 清单、坑演示、两个 `__call__` 分流图，CSS/SVG 自绘

### 7. closing
- ✓ 仓库路径 mono 排版
- ⚠️ 可选：hands-on-python 仓库截图（如需真实截图请用户提供，或用 placeholder）
- ⚠️ 如想挂 Python 官方 logo 需用户提供；否则纯文字「Python」排版
