# Video Outline

> **标题**：yield 的暂停键 —— Python 生成器与迭代器、惰性求值
> **主题**：待定（Checkpoint Plan 对齐后填入 theme-id）
> **总时长**：约 4 分 55 秒（口播 ~680 汉字 / 含标点英文 ~1320 字符；各步估时累加 294 秒；女声 zf_001 实测语速较快，正片预计 ~4 分半）
> **章节数**：8 章 / 34 步
> **内容裁剪说明**：按用户反馈延续 descriptor 口径——**实现讲足**：状态机、手写迭代器
> 对比、send 双向（含 priming 坑）、yield from 三件事、惰性管道与内存对比全保留
> （含 article 真实输出行）。仅不展开：demo [7] 随机日志内容、close()/GeneratorExit
> 细节、Q1 yield vs return 完整表格（核心差异融入正文）。

---

## 1. hook — 两个麻烦，一个 yield（4 steps · ~32s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 痛点一：千万级数据先存列表 → 爆内存 —— 来源 article 导语 L4 / §Why L13
- 痛点二：手写可遍历对象要 `__iter__` / `__next__` 20+ 行样板 —— 来源 article 导语 L3-4
- 符号主角：一个小小的 `yield` 同时解决两个问题 —— 来源 article 导语 L5
- 系列衔接：描述符是属性访问协议，迭代器是遍历协议 —— 来源 article 导语 L3

**开发计划**：

- step 1 (~9s) — **片头标题页**：主标「yield：函数的暂停键」+ 副标「Python 生成器与迭代器 · 惰性求值」+ 右下工程图签（Lab core / 04）
- step 2 (~9s) — 千万行日志卡 + 「先全读进列表？」→ 内存爆掉的红线示意（爆的过程）
- step 3 (~9s) — 手写遍历的负担清单：`__iter__` / `__next__` / 状态变量，「二十行起步」
- step 4 (~5s) — 一个小 `yield` 双钩卡，两个麻烦同时划掉，点名「生成器」

口播节选：
> 今天讲 Python 生成器。暂停恢复、双向通信、惰性管道，一层层拆开。……它叫生成器。

---

## 2. what-is — 可暂停的函数（5 steps · ~42s）

**信息池**：
- 判定：函数含 `yield` 即生成器函数（不再是普通函数）—— 来源 article §What L9
- 心智模型原句：`next()` 推它跑到下一个 `yield`，栈帧连同局部变量原封不动停在原地，精确恢复 —— 来源 article §What L9
- 生命周期状态机：已创建（调用不执行）→ 运行中 ⇄ 已暂停（yield 产出值）→ 函数返回 → StopIteration —— 来源 article §What L9
- 状态检查真机输出：`type: generator` / `gi_running: False` / `gi_frame: True` / 耗尽后 `gi_frame=None` —— 来源 article 输出 L55-60

**开发计划**：

- step 1 (~6s) — 判定卡：普通函数 vs 生成器函数（含 yield 即变身）
- step 2 (~9s) — 心智模型 hero：可暂停/可恢复（播放器播放/暂停双键隐喻）
- step 3 (~9s) — 栈帧冻结示意：局部变量 a、b 冻在原地，恢复箭头精确回到暂停点
- step 4 (~11s) — 状态机图：已创建 → 运行中 ⇄ 已暂停 → StopIteration（节点连线逐段点亮）
- step 5 (~7s) — 真机状态检查：`type: generator`、`gi_frame` 暂停在 / 耗尽后 None

口播节选：
> 函数里只要含一个 yield，它就不再是普通函数。……下次从暂停处，精确恢复。

---

## 3. iter-gen — 手写迭代器 vs 生成器（4 steps · ~38s）

**信息池**：
- for 底层：不断调 `__next__()` 直到 `StopIteration` —— 来源 article L87
- 手写代码：`__iter__` 返回自身、`__next__` 推进、done 状态、raise StopIteration —— 来源 article L71-78
- 生成器代码：fib 5 行（`a, b = 0, 1` while + yield）—— 来源 article L80-85
- 等价论断：生成器自动实现 `__iter__`（返回自身）和 `__next__`（恢复到下一个 yield）—— 来源 article L87

**开发计划**：

- step 1 (~8s) — 协议引入：for 循环底层 = `__next__` 循环直到 StopIteration（拆解动画）
- step 2 (~11s) — 手写迭代器代码卡：`__iter__` / `__next__` / done 状态（20+ 行的视觉压迫）
- step 3 (~9s) — 生成器版代码卡：fib 五行 yield（行数对比条 20+ vs 5）
- step 4 (~10s) — 等价收尾：`__iter__` / `__next__` 两个方法名打上「自动自带」标签

口播节选：
> for 循环的底层，就是不断调 __next__，直到 StopIteration。……两者等价。

---

## 4. send — 双向通信（6 steps · ~48s）

**信息池**：
- accumulator 代码：`received = yield total`；`total += received` —— 来源 article L91-97
- 核心一行（article 原话）：等号右侧向外产出 total 暂停；send(v) 恢复时 v 作为 yield 表达式的值赋给 received —— 来源 article L134-137
- 执行流程：先 `next(gen)` 启动（priming）跑到 yield 暂停；`gen.send(10)` 把 10 赋给 received —— 来源 article L99
- priming 坑：启动前 send(非 None) 报 TypeError —— 来源 article 踩坑 L141
- 真机输出：`send(10) -> total=10` / `send(20) -> total=30` / `send(30) -> total=60` —— 来源 article 输出 L27-29
- 定位：send() 是 Python 协程的早期形态 —— 来源 article L99

**开发计划**：

- step 1 (~6s) — 概念反转卡：yield 不只产出，还能接收（双向箭头）
- step 2 (~9s) — accumulator 代码卡：`received = yield total` + `total += received`
- step 3 (~11s) — 核心一行 hero：等号两个方向标注（向左产出暂停 / send 恢复赋值）
- step 4 (~9s) — 执行流程：next(gen) 启动 → 暂停在 yield → send(10) 恢复（三拍时间线）
- step 5 (~5s) — priming 坑：跳过启动直接 send(10) → TypeError 章
- step 6 (~8s) — 真机终端：send(10)→10 / send(20)→30 / send(30)→60 逐行输出

口播节选：
> 核心就是这一行：等号右边向外产出 total，函数暂停。send 一个值过来，赋给 received，恢复执行。

---

## 5. yield-from — 委托子生成器（5 steps · ~41s）

**信息池**：
- flatten 代码：遇到 list 就 `yield from flatten(item)` 递归，否则 `yield item` —— 来源 article L103-110
- 三件事原句：值透传 / 异常透传（send/throw/close 直达子生成器）/ 返回值捕获（`StopIteration.value`）—— 来源 article L112
- 真机输出：`flatten([1, [2, 3, [4, 5]], 6, [7, 8, 9]]) = [1..9]` —— 来源 article 输出 L37
- 协程伏笔：这套委托机制是 async/await 的前身 —— 来源 article Q3 L168 / L99

**开发计划**：

- step 1 (~7s) — 概念卡：生成器里委托另一个生成器（yield from 语法高亮）
- step 2 (~10s) — flatten 代码走读：子列表 → 递归委托 / 值 → yield（双分支标注）
- step 3 (~9s) — 三件事卡：值透传 / 异常透传 / 返回值捕获（三条逐个点亮）
- step 4 (~9s) — 真机终端：flatten 输入行 + accent 结果行 [1..9] + chain 行
- step 5 (~6s) — 伏笔：这套暂停+委托，就是 async/await 的前身（演进箭头）

口播节选：
> 展平一个多层列表：遇到子列表，就 yield from 递归下去。……它做了三件事。

---

## 6. lazy — 惰性管道（4 steps · ~24s · 短章）

**信息池**：
- 无限流：`integers()` 无限生成不怕不算完 —— 来源 article 输出 L40-41 / §Why L13
- 管道代码：`take(10, filter_gen(偶数, map_gen(x**2, integers())))` —— 来源 article L116-121
- 真机输出：`First 10 even squares: [0, 4, 16, ..., 324]` —— 来源 article 输出 L41
- 日志管道真机：`log_lines → parse → filter_errors → take(5)`，每个环节每次只处理一个元素 —— 来源 article 输出 L48-53 / 诚实预期 L67

**开发计划**：

- step 1 (~5s) — 无限流概念：integers() 无限生成，「不用怕，它不会算完」
- step 2 (~5s) — 管道串联代码卡：integers → map 平方 → filter 偶数 → take 10（四环节接线图）
- step 3 (~7s) — 真机：前十个偶数平方 `[0, 4, 16, ..., 324]`（逐个产出的滴灌意象）
- step 4 (~7s) — 日志管道真机：`log_lines → parse → filter_errors → take(5)` 四环节管线 + 5 条输出（每环节一次只处理一个元素角标）

口播节选：
> 管道串起来：integers 生成，map 平方，filter 留偶数，take 取十个。……每个值，都是要一个才算一个。

---

## 7. memory — 内存对比（3 steps · ~26s · 短章）

**信息池**：
- 真机数字：列表推导 ~3,516 KB vs 生成器表达式 104 bytes —— 来源 article 输出 L44-45
- 倍数：`Ratio: ~34,621x smaller` —— 来源 article 输出 L46
- 诚实预期：数值随 Python 版本变化（getsizeof 估算，列表为抽样外推），但数量级差距稳定 —— 来源 article L63-66
- 对比表（step 3 同屏背景素材）：内存 O(n) vs O(1) / 立即 vs 按需 / 无限流不支持 vs 支持 / 多次遍历 vs 单次 —— 来源 article 表 L123-128

**开发计划**：

- step 1 (~9s) — 真机终端：`List comprehension: ~3,516 KB` vs `Generator expression: 104 bytes`（双条对比）
- step 2 (~6s) — 倍数 hero：`~34,621x smaller`（巨型数字）
- step 3 (~11s) — 诚实预期卡 + 对比表淡色背景：数值随版本变、列表为估算值，但**数量级差距稳定**

口播节选：
> 值多少钱？同一份数据，列表推导 3,516 KB。生成器表达式，104 bytes。……三万四千倍的差距。

---

## 8. closing — 按需生成（3 steps · ~26s）

**信息池**：
- 系列回收：描述符管属性访问，迭代器管遍历；生成器是迭代器最省的写法 —— 来源 article 导语 L3 / §What L9
- 协程三代：生成器协程（yield+send）→ @coroutine + yield from → async/await，都建立在暂停/恢复上 —— 来源 article Q3 L168
- 金句：不提前算好，按需生成；零内存管道、协程都建立在这个机制上 —— 来源 article §Why L13
- 仓库：hands-on-python，`cd core/04_generator_iterator && python3 generator_iterator.py` —— 来源 article §How L22-23

**开发计划**：

- step 1 (~11s) — 机制回收：遍历协议 → 生成器最省写法 → 暂停恢复长成协程（三代演进箭头：yield+send → yield from → async/await）
- step 2 (~6s) — 金句卡：不提前算好，**按需生成**（对照排版）
- step 3 (~9s) — CTA：hands-on-python 终端 `cd core/04_generator_iterator` + `python3 generator_iterator.py` + 双 chip（系列同款收尾）

口播节选：
> 迭代器是遍历的协议，生成器是它最省的写法。……不提前算好，按需生成。

---

## 素材清单

### 1. hook
- ✓ 千万行日志卡、二十行清单、yield 双钩卡，CSS/SVG 自绘

### 2. what-is
- ✓ 播放/暂停双键隐喻、栈帧冻结示意、状态机连线图、真机状态输出，CSS/SVG 自绘

### 3. iter-gen
- ✓ 代码双卡对照、行数对比条（20+ vs 5），CSS/SVG 自绘

### 4. send
- ✓ accumulator 代码卡、核心一行双向标注、priming 时间线、真机终端，CSS/SVG 自绘

### 5. yield-from
- ✓ flatten 双分支走读、三件事卡、真机终端摊平输出，CSS/SVG 自绘

### 6. lazy
- ✓ 管道串联图、滴灌产出意象、日志四环节管线、对比表逐行点亮，CSS/SVG 自绘

### 7. memory
- ✓ 真机双条对比、倍数巨型数字、天平意象，CSS/SVG 自绘

### 8. closing
- ✓ 三代演进箭头、金句对照、系列同款终端 CTA，CSS/SVG 自绘
- ⚠️ Python 官方 logo 如需使用请用户提供；否则纯文字排版
