# Video Outline

> **标题**：import 的后台流水线 —— Python 模块与导入系统（sys.modules · `__main__` · 循环导入 · 包）
> **主题**：`indigo-porcelain`（靛蓝瓷）—— 沿用 scope-closure 同款（Checkpoint Plan 已选定）
> **总时长**：约 5 分 20 秒（口播 ~1360 字符，含标点与英文 / 节拍累加折算）
> **章节数**：7 章 / 30 步
> **内容裁剪说明**：主线全量保留（三步流水线 / 员工名录比喻 / 执行一次 + 副作用与配置推论 / `__main__` 守卫 +
> spawn 重放 + 测试推论 / 循环导入病根与三档修法 / 包与相对导入 / 命名卫生两坑：遮蔽标准库、星号导入）。
> 本篇 article 为六段式长文（正文 ~4650 字符），字符保留度 ~30%，关键事实清单（11 项）逐条在稿；
> 刻意压缩：importlib.reload 热更新（Q4）、finder/loader 展开口播（挂 mono 角标）、C `#include` 历史对比、
> 三种组织方式对比表、环境变量 SHORTENER_DB 案例名——取舍已在 Checkpoint Plan 向用户呈现。

---

## 1. hook — 两次 import 的怪现象（3 steps · ~35s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 现象锚点：首次 import 打印「[counter_mod] 模块体执行」，二次静默；`counter_mod is again` → True —— 来源 article 输出 L72-77
- 心智模型原句：import = 查缓存 → 执行模块体 → 绑定名字 —— 来源 article §What L25
- 三件事预告：执行一次 / `__main__` 分流 / 循环导入半初始化 —— 来源 article 头注 L3-6
- 实验文件锚点：counter_mod / greeter / bad_a / shapepkg 四组 —— 来源 article Quick Start L72-95

**开发计划**：

- step 1 (~10s) — 片头标题页：主标「import 的后台流水线」+ 副标「Python 模块与导入系统 · sys.modules · `__main__` · 循环导入 · 包」+ 右下工程图签
- step 2 (~17s) — counter_mod 两次 import 对比卡：首次执行打印 vs 二次静默，`is` → True
- step 3 (~8s) — 点题：import 不只是一行关键字，三步流水线预告

口播节选：
> 今天讲模块与导入系统。……同一个文件，import 两遍。第二遍，静悄悄，什么都没发生。

---

## 2. pipeline — 三步流水线与员工名录（6 steps · ~63s）

**信息池**：
- 三步心智模型原句：查缓存 → 执行模块体 → 绑定名字 —— 来源 article §What L25
- 关键顺序：模块对象先入缓存，模块体才开始跑 —— 来源 article 头注 L3-4
- 员工名录比喻：HR 全套入职流程 → 登记名录 → 按名录发工牌；模块没有"离职"，进程不重启缓存一直在 —— 来源 article §What L27
- 绑定语义：import 到手是模块对象，函数/类/变量全挂在身上，调用即属性访问 —— 来源 article §What L31
- 深层机制：finder 按 sys.path 逐目录定位、loader 读文件执行（mono 角标用）—— 来源 article §How It Works L163

**开发计划**：

- step 1 (~13s) — 第一步「查缓存」：sys.modules 缓存表登场（登记表/名录意象）
- step 2 (~10s) — 第二步「执行模块体」：先入缓存再执行的顺序强调
- step 3 (~11s) — 第三步「绑定名字」：名字 → 模块对象；模块对象是属性容器（函数/类/变量挂上面）
- step 4 (~11s) — 员工名录比喻上：新员工头一回来，HR 走全套入职流程
- step 5 (~14s) — 名录比喻下：登记进名录 → 按名录发工牌；「模块没有离职，进程不重启缓存一直在」
- step 6 (~4s) — 转场：这条流水线直接推出三件事（三格预告骨架）

口播节选：
> 第一步，查缓存。……模块对象先塞进缓存，模块体才开始跑。

---

## 3. run-once — 第一件事：每个进程只执行一次（3 steps · ~35s）

**信息池**：
- 实测输出：两次 import 拿到同一对象 True；`sys.modules['counter_mod'].get_name() = 'counter_mod'` —— 来源 article 输出 L76-77
- 代码锚点：`import counter_mod as again` / `counter_mod is again` —— 来源 article 代码 L108-112
- 副作用推论：模块级连接、注册、print 每进程只发生一次；解法 = 包进函数或挪进守卫 —— 来源 article §What L29 / 坑1 L171-174
- 配置推论：环境变量必须先于首次 import 就位，晚了读到空值（12-factor）—— 来源 article 代码段 L114 / 坑2 L176-179

**开发计划**：

- step 1 (~4s) — 第一件宣布：模块体，每个进程只执行一次（hero 句）
- step 2 (~13s) — 实测卡：两次 import 同一对象，`is` → True，模块体只打印一次（终端模拟）
- step 3 (~18s) — 推论双卡：副作用每进程一次（解法：包进函数/挪守卫）/ 环境变量先于首次 import 就位

口播节选：
> 第一件：模块体，每个进程只执行一次。……晚了，读到的就是空值。

---

## 4. main-guard — 第二件事：`__main__` 分流闸（4 steps · ~49s）

**信息池**：
- 实测输出：被导入 `__name__='greeter'` 守卫未触发、`greet('imported')` 照常可用；直接运行 `__name__='__main__'` 打印 hello, world —— 来源 article 输出 L80-85
- 代码锚点：`if __name__ == "__main__": main()` —— 来源 article 代码 L118-121
- spawn 重放：spawn 子进程 re-import 主模块定位 pickle 目标，无守卫则 `p.start()` 重放 —— 来源 article Q1 L191-192
- 测试推论：逻辑放函数、守卫只调 main()，入口与逻辑分离才测得了 —— 来源 article Q3 L197-198

**开发计划**：

- step 1 (~9s) — 第二件宣布：`__name__` 两态（直接运行 = `"__main__"` vs 被导入 = 模块名）
- step 2 (~12s) — 直接运行分支：python3 greeter.py，守卫块触发（终端模拟 hello, world）
- step 3 (~12s) — 被导入分支：`__name__='greeter'` 守卫跳过、函数照常能用；逻辑放函数守卫只调 main（才测得了）
- step 4 (~16s) — spawn 重放场景：无守卫则入口代码重放，`__main__` 守卫为它而生

口播节选：
> 第二件：直接运行的模块，name 是 main。被导入时，name 是模块名。……这条分流，就是为它准备的。

---

## 5. circular — 第三件事：循环导入与半初始化（6 steps · ~55s）

**信息池**：
- 实测报错：`ImportError: cannot import name 'Loud' from 'bad_a'`（子进程复现）—— 来源 article 输出 L89
- 病根过程：解释器先把 A 塞进 sys.modules（此时 A 的名字一个没定义），B 的 from 找不到 Loud —— 来源 article §How It Works L155
- 修好形态：函数体内 `from good_b import shout`；`Loud.speak() = 'LOUD! Loud'` —— 来源 article 代码 L148-152 / 输出 L91
- 三档解法：① 重新划分模块 ② 函数内延迟 import ③ 整模块 import 不用 from —— 来源 article §How It Works L157
- Q2：函数内 import 是延迟解析，代价一次 sys.modules 查表，可忽略 —— 来源 article Q2 L194-195
- 版本注：3.13- 与 3.14+ 报错文案不同、语义相同（mono 角标用）—— 来源 article 诚实预期 L103

**开发计划**：

- step 1 (~9s) — 第三件宣布：循环导入，A 顶部 import B、B 顶部 import A（双向箭头示意）
- step 2 (~8s) — 病根上：A 先入缓存，但里面的名字一个都还没定义（半空模块可视化）
- step 3 (~10s) — 病根下：B 的 from 取 Loud 找不到 → ImportError 当场报错（报错复现，屏幕显示真实代码 `from bad_a import Loud`）
- step 4 (~6s) — 修法第一档：重新划分模块，拆掉循环（治本）
- step 5 (~11s) — 修法第二档：import 挪进函数体——延迟解析，调用时两模块都已就绪（最常用）
- step 6 (~11s) — 修法第三档：整模块 import 不用 from——错误推迟不是消失

口播节选：
> 解释器先把 A 塞进缓存。注意，这时候 A 里的名字，一个都还没定义。……没有，当场报错。

---

## 6. package — 包与命名卫生（5 steps · ~44s）

**信息池**：
- 代码锚点：shapepkg/circle.py 顶部 `from .base import Shape` —— 来源 article 代码 L130-133
- 输出锚点：`Circle().describe() = 'a circle'`；模块坐标 `'shapepkg.circle'` —— 来源 article 输出 L94-95
- 定义：目录 + `__init__.py`（标记文件，Python 看到它才把目录当包）—— 来源 article 代码段说明 L136
- 遮蔽坑：sys.path[0]（脚本所在目录）排最前，自建 random.py/json.py 遮蔽标准库 —— 来源 article §How It Works L165 / 坑3 L181-184
- 星号坑：`from x import *` 名字来源不明，LEGB 分析失效 —— 来源 article 坑4 L186-189
- 何时不用：几十行一次性脚本，单文件加守卫就够 —— 来源 article §When to Use L46

**开发计划**：

- step 1 (~8s) — 包定义：目录 + `__init__.py` 才算包（目录树示意）
- step 2 (~15s) — 相对导入实测：`from .base import Shape`、describe() = 'a circle'、模块坐标 shapepkg.circle
- step 3 (~6s) — 何时不用：几十行的一次性脚本，单文件加守卫就够
- step 4 (~11s) — 遮蔽坑：脚本目录排在搜索路径最前，自建 random.py 遮蔽标准库
- step 5 (~4s) — 星号坑：`from x import *` 名字来源不明（一行警示卡）

口播节选：
> 目录加一个 init.py，Python 才把它当包。……拿标准库的名字给脚本命名，random、json 都会被遮蔽。

---

## 7. closing — 收拢与 CTA（3 steps · ~37s）

**信息池**：
- 四件套：sys.modules 缓存表 / `__main__` 分流闸 / 循环导入半初始化 / 包是模块地址 —— 来源 article §What L25-31
- 应用场景：拆多文件、CLI 入口、包结构、模块测试全走这条流水线 —— 来源 article §When to Use L37-42
- 运行命令：`cd core/22_import_system && python3 import_system.py` —— 来源 article Quick Start L63-64
- 断言收尾：「全部断言通过 ✓」—— 来源 article 输出 L97

**开发计划**：

- step 1 (~9s) — 你早就在用：CLI 入口 / 测试夹具 / 配置加载
- step 2 (~15s) — 四件套收拢卡：缓存表 · 分流闸 · 半初始化 · 模块地址 各一行定位
- step 3 (~13s) — CTA：hands-on-python 仓库 + 运行命令 mono 呈现 +「下期见」

口播节选：
> 这套东西你早就在用。……完整代码在 hands-on-python 仓库，python3 一跑就有体感。

---

## 素材清单

### 1. hook
- ✓ 全部画面为代码卡 / 对比排版 / 图形演示，无需外部图片

### 2. pipeline
- ✓ sys.modules 登记表、员工名录比喻、三步管道、属性容器示意，CSS/SVG 自绘

### 3. run-once
- ✓ 实测终端模拟、推论双卡，CSS/SVG 自绘

### 4. main-guard
- ✓ 两种命运分流图、终端模拟（hello, world / imported）、spawn 场景卡，CSS/SVG 自绘

### 5. circular
- ✓ A↔B 循环箭头、半空模块可视化、ImportError 报错复现、三档修法卡，CSS/SVG 自绘

### 6. package
- ✓ 目录树示意、模块坐标排版、遮蔽/星号警示卡，CSS/SVG 自绘

### 7. closing
- ✓ 仓库路径与命令 mono 字体呈现
- ⚠️ 可选：hands-on-python 仓库截图（如需真实截图请用户提供，或用 placeholder）
