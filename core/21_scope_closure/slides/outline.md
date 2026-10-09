# Video Outline

> **标题**：活过函数的变量 —— Python 作用域与闭包（LEGB · cell · nonlocal · 迟绑定）
> **主题**：`indigo-porcelain`（靛蓝瓷）—— 深靛蓝当墨 + 瓷白纸，学术深度系（Checkpoint Plan 已选定）
> **总时长**：实测 3 分 36 秒（33 段音频 afinfo 实测合计 217s；zm_009 语速 3.0~5.8 字/秒）
> **章节数**：6 章 / 33 步
> **内容裁剪说明**：四大主线（LEGB 遮蔽 / cell 机制 / nonlocal vs global / 迟绑定）+
> 装饰器关联全量保留；刻意压缩：Q&A Q3 的第三种修复（生成器表达式包裹）、
> 踩坑清单的「`__closure__` 为 None」与 dis 全量演示、`functools.partial` 仅口播带过。
> 信息保留度以此口径评估。

---

## 1. hook — 活过函数的变量（4 steps · ~30s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 现象锚点：counter() → 1，counter() → 2（状态留在 cell 里）—— 来源 article 输出示例 L33
- 反直觉核心：外层函数返回后自由变量仍存活（存在 cell 对象里）—— 来源 article §What L10
- 关联锚点：装饰器实验里 `ttl_cache` 的 `store`、`make_counter` 的计数器都"活过了函数返回" —— 来源 article 引言 L3-4
- 四主角：LEGB、cell、nonlocal、迟绑定 —— 来源 article 标题 L1 / 头注 L3

**开发计划**：

- step 1 (~8s) — 片头标题页：主标「活过函数的变量」+ 副标「Python 作用域与闭包 · LEGB · cell · nonlocal · 迟绑定」+ 右下工程图签
- step 2 (~10s) — make_counter 代码卡：函数已返回，高亮函数体里的 count「按理该销毁」
- step 3 (~8s) — counter 连续调用：1 → 2 计数跳字，「count 还活着」
- step 4 (~4s) — hero 大字「闭包」登场点题

口播节选：
> 今天讲作用域与闭包。……count 活过了它所在的函数。这个现象，叫闭包。

---

## 2. legb — LEGB 查找链与就近遮蔽（8 steps · ~48s）

**信息池**：
- 定义原句：作用域决定一个名字在某处指向谁 —— 来源 article §What L10
- 查找链：Local → Enclosing → Global → Built-in，同名就近遮蔽 —— 来源 article §What L10
- demo 输出：inner() 读到 local 层的 'local'；外层自己的 value 不受影响: 'enclosing' —— 来源 article 输出示例 L29
- 代码锚点：inner 里 `value = "local"` 这行删掉，才会读到 enclosing/global —— 来源 article 代码 L60
- 规矩原句：赋值即声明局部名；要改外层变量必须显式声明 —— 来源 article §How L66

**开发计划**：

- step 1 (~8s) — hero 问题句：「一个名字，在某处，指向谁」
- step 2 (~5s) — LEGB 四格链骨架横排登场（L → E → G → B，由内到外）
- step 3 (~3s) — L 格点亮：Local · 当前函数内部
- step 4 (~3s) — E 格点亮：Enclosing · 外层函数
- step 5 (~3s) — G 格点亮：Global · 模块级
- step 6 (~6s) — B 格点亮 + 整链完整：Built-in · 内建；「从里往外找，找到就停」
- step 7 (~11s) — legb_demo 代码卡：inner 读到自己层的 'local'，外层 'enclosing' 被遮蔽（就近遮蔽标注）
- step 8 (~9s) — 规矩卡：赋值即声明——函数内赋值 = 新建局部名，不是改外层

口播节选：
> Python 查名字，走一条固定的链，叫 LEGB。……从里往外找，找到就停。

---

## 3. closure-cell — 自由变量与 cell（5 steps · ~45s）

**信息池**：
- 定义原句：闭包 = "内层函数 + 它引用的外层变量（自由变量）"的打包对象 —— 来源 article §What L10
- Deep Dive 证据：被内层捕获的变量升级为 cell，存储指令从 STORE_FAST 变 STORE_DEREF —— 来源 article §Deep Dive L113
- 输出锚点：`__closure__ = (<cell ...: int object ...>,)`，cell_contents=2 —— 来源 article 输出示例 L34
- 对照事实：普通局部变量 STORE_FAST 读写栈帧槽位，函数返回即销毁 —— 来源 article §Deep Dive L113

**开发计划**：

- step 1 (~7s) — 「自由变量」命名卡：内层函数引用外层变量，变量被打上标签
- step 2 (~9s) — 外层返回对照图：栈帧销毁 vs 变量被打包进 cell、跟着 counter 被带走
- step 3 (~10s) — `__closure__` 检查卡：cell 对象 + cell_contents=2 实测输出（终端模拟）
- step 4 (~15s) — 字节码对照：STORE_FAST（栈帧，返回即销毁）vs STORE_DEREF（写 cell）
- step 5 (~4s) — 金句收束：「这就是变量活过函数的全部实现」

口播节选：
> 它被打包进一个 cell 对象，跟着 counter 一起被带走。……STORE_DEREF 写的不是栈帧，是 cell。

---

## 4. nonlocal — nonlocal vs global（5 steps · ~44s）

**信息池**：
- 报错锚点：内层不写 `nonlocal`，`count += 1` → UnboundLocalError —— 来源 article §Why L14 / 代码 L75-76
- nonlocal 语义：向外层函数作用域找变量（不碰模块级）—— 来源 article §Q&A Q2 L128
- global 语义：只指模块级名字，人人可见 —— 来源 article §Q&A Q2 L128 / §How L81
- 输出锚点：两个闭包计数器互不干扰: A=2，B=1 —— 来源 article 输出示例 L42
- 独立性根因：两次 make_counter() 调用产生两套独立 cell —— 来源 article §Deep Dive L113

**开发计划**：

- step 1 (~6s) — 提问卡「怎么改外层的变量？」→ 答案一行：nonlocal
- step 2 (~15s) — 反例终端：删掉 nonlocal，count += 1 当场 UnboundLocalError（赋值即声明回扣）
- step 3 (~6s) — nonlocal 语义图：箭头从内层指向 Enclosing 层的 count
- step 4 (~5s) — global 语义图：指向模块级，人人可见（模块级总线）
- step 5 (~12s) — 两个计数器 A/B 独立跳数：A=2，B=1，各持一套 cell（「闭包版的实例」）

口播节选：
> nonlocal 就是声明：我要改的，是外层那个 count。……每次 make_counter，都产出一套独立的 cell。

---

## 5. late-binding — 迟绑定陷阱与修复（8 steps · ~49s）

**信息池**：
- 陷阱输出：`[lambda: i for i in range(3)]` 依次调用 → [2, 2, 2] —— 来源 article 输出示例 L37
- 修复输出：`[lambda i=i: i ...]` → [0, 1, 2]，默认参数在定义时求值 = 快照 —— 来源 article 输出示例 L38 / §How L90
- 机制原句：闭包记住的是变量本身，不是它当时的值 —— 来源 article §How L93
- 迟绑定本质：函数体在调用时才读 i，循环结束后 i 是 2 —— 来源 article 诚实预期 L49
- 备选修复：`functools.partial(f, i)` 固定实参 —— 来源 article §How L93 / Q&A Q3 L131
- 事故场景：循环里造闭包，回调列表全部读到循环末值 —— 来源 article 踩坑清单 L117

**开发计划**：

- step 1 (~4s) — 预告卡：「一个经典陷阱」
- step 2 (~8s) — 陷阱代码卡：`[lambda: i for i in range(3)]`，预期 0、1、2
- step 3 (~3s) — 结果揭晓：2、2、2（异常态强调）
- step 4 (~12s) — 机制拆解：三个 lambda 共享同一个 i，调用时才读，i 已停在 2
- step 5 (~3s) — 命名卡：迟绑定
- step 6 (~10s) — 修复卡：`lambda i=i: i` 默认参数快照，副一行 `functools.partial` 备选
- step 7 (~3s) — 复跑结果：0、1、2，齐了
- step 8 (~6s) — 迁移提示：回调列表 / 定时器集体读到同一个值 → 先想到它

口播节选：
> 结果是 2、2、2。……闭包记住的是变量，不是值。这叫迟绑定。

---

## 6. closing — 回望装饰器与 CTA（3 steps · ~30s）

**信息池**：
- 应用版图：装饰器（lab 01）、回调、偏函数全部建立在闭包上 —— 来源 article §Why L14
- Q1 原句：装饰器的 wrapper 就是闭包；retry 的 times、ttl_cache 的 store 都是自由变量，靠 cell 活过装饰时刻 —— 来源 article §Q&A Q1 L125
- 运行命令：`cd core/21_scope_closure && python3 scope_closure.py` —— 来源 article §How L19-20
- 环境口径：demo 输出确定性，任何 CPython 3.x 一致 —— 来源 article 诚实预期 L48

**开发计划**：

- step 1 (~11s) — 回望装饰器：wrapper 即闭包，retry 的 times / 缓存的 store 是自由变量
- step 2 (~10s) — 四件套收拢卡：LEGB · cell · nonlocal · 迟绑定 各一行定位
- step 3 (~9s) — CTA：hands-on-python 仓库 + 运行命令 mono 呈现 + 「下期见」

口播节选：
> 装饰器的 wrapper，就是闭包。……完整代码在 hands-on-python 仓库，python3 一跑就有体感。

---

## 素材清单

### 1. hook
- ✓ 全部画面为代码卡 / 计数跳字排版 / 图形演示，无需外部图片

### 2. legb
- ✓ LEGB 四格链、遮蔽代码卡均为 CSS/SVG 自绘，无需外部素材

### 3. closure-cell
- ✓ 栈帧 vs cell 对照图、`__closure__` 终端模拟、字节码对照卡，CSS/SVG 自绘

### 4. nonlocal
- ✓ 箭头语义图、反例终端模拟、A/B 计数器跳字，CSS/SVG 自绘

### 5. late-binding
- ✓ 陷阱/修复代码卡、结果数字冲击排版，代码 / 图形绘制

### 6. closing
- ✓ 仓库路径与命令 mono 字体呈现
- ⚠️ 可选：hands-on-python 仓库截图（如需真实截图请用户提供，或用 placeholder）
