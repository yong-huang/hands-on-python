# Video Outline

> **主题**：`monochrome-print`（模板锁定——python-concurrency 系列统一黑白印刷皮肤）
> **总时长**：约 5 分 55 秒（口播 1763 字 / 54 拍；实际成片以 afinfo 实测为准）
> **章节数**：7 章 / 54 步
> **模板**：thread-lifecycle（7 章结构逐章对位：hook / background / 心智模型 / live-demo / mechanism / pitfalls / qa-closing）
> **压缩口径**：台词短拍化（平均 33 字/拍），白话解释与细节由屏幕小注/信息池承载（画面自解释）；2026-10-01 起按用户修订版 script 同步（结构 54 拍不变）

---

## 1. hook — 片头：三个没答案的问题（8 steps · ~38s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 数据：串行 0.492s vs Pool(4) 0.197s（2.50×）vs threading(4) 0.660s（0.75×）—— 来源 article §Quick Start L75-79
- 数据：加速比 2.4~3.2× 波动，断言只锁 ≥2.0× 底线 —— 来源 article §Quick Start L99
- 输出：父进程退出码 0，stdout = 'OK 1'，真相在 stderr —— 来源 article §Quick Start L84-87
- 机制：macOS 默认 spawn，子进程重新 import 主模块 —— 来源 article 引言 L5 / §How It Works L129
- 命令：python3 mp_accel.py，四个小节 + 全部断言，约 15 秒 —— 来源 article §Quick Start L62-64
- 词义：线程＝程序里并排干活的小分队（口播不念，屏幕小注）—— 来源新手 review

**开发计划**：
- step 1 (~4s) — 片头标题页：主标「多核加速」+ 副标「绕开 GIL 的真并行」+ 工程图签（hands-on-python · concurrency / 05 · multiprocessing.Pool）
- step 2 (~4s) — 冷开场第一问：hero 引用卡「4 个线程一起计算，怎么比单线程还慢？」+ 白话小注「线程＝程序里并排干活的小分队」
- step 3 (~5s) — 第二问：hero 引用卡「换成 4 个进程，一下快了 2.5 倍——为什么？」
- step 4 (~5s) — 第三问：hero 引用卡「有时候程序显示一切正常，结果却悄悄丢了一部分。」
- step 5 (~5s) — 三件事清单（递进列表 1/3）：「线程在纯计算上白忙活」+ 数据角标「速度只剩 0.75 倍」
- step 6 (~5s) — 清单（递进列表 2/3）：「进程才是真并行」+ 数据角标「实测 2.5 倍加速」
- step 7 (~4s) — 清单（递进列表 3/3）：「静默失败」+ 角标「报了成功，结果照样丢」
- step 8 (~5s) — 预告：三跑法同场比武三根时间条（串行 0.49 / 4 线程 0.66 / 4 进程 0.20 秒，进程条 accent 高亮）+ 标语「挨个分析给你看」

口播节选：
> 「换成 4 个进程，一下快了 2.5 倍——为什么？」

---

## 2. background — 线程为什么白忙（8 steps · ~52s）

**信息池**：
- 定义：GIL 全局解释器锁——同一时刻只允许一个线程执行字节码 —— 来源 article 引言 L3 / §Background L14
- 词义：解释器——真正替你一行行跑代码的程序；CPython 是官方参考实现 —— 来源 article §Background L14
- 词义：字节码——Python 把代码拆出来的小指令（口播不念，屏幕小注）—— 来源 article §Background L14
- 数据：4 个素数计数任务串行 0.492s，4 线程 0.660s——锁争用倒贴 —— 来源 article §Background L14
- 词义：CPU 密集（瓶颈在算力）/ IO 密集（大部分时间在等网络或磁盘）—— 来源 article §Background L16
- 机制：IO 等待时线程释放 GIL，所以线程在 IO 场景仍够用 —— 来源 article §Background L16
- 机制：GIL 每解释器一把，进程各自带完整解释器，锁互不相干 —— 来源 article §Background L18
- 词义：进程——操作系统分配资源的基本单位，拥有独立内存空间 —— 来源 article §Background L18

**开发计划**：
- step 1 (~7s) — GIL 定义主视觉：SVG 大锁 + 大字「GIL · 全局解释器锁」+ 小注「Python 全局的一把大锁」
- step 2 (~7s) — 解释器卡（替你一行行跑代码的程序）+ 规矩卡「同一时刻，只放行一个线程」+ mono 小注「字节码＝代码拆出来的小指令」
- step 3 (~6s) — 4 线程在锁前排成单队：依次入队的线程片 + 大锁闸门 + 注「一人算一段，还要互相抢锁」
- step 4 (~6s) — 实测对照：数素数任务两根时间条（串行 0.49 秒 / 4 线程 0.66 秒，后者更长）+ 标语「不加速，还倒贴」
- step 5 (~5s) — IO 交接示意：等网络中的线程 A 把 GIL 令牌让给线程 B + 标语「线程的用武之地在等待，不在计算」
- step 6 (~5s) — 进程卡：一份独立运行的程序＝独立内存 + 自己的解释器
- step 7 (~8s) — 双进程各配一把锁：两个进程框各自圈住内存与 GIL 小锁 + 标语「新开一个进程，多一把新锁」+ 注「各锁各的，真正同时执行」
- step 8 (~8s) — multiprocessing 登场：hero 代码名 + 副标「标准库的多进程方案」+ 三枚职责片（开进程 / 派任务 / 收结果·全包）

口播节选：
> 关键在这：GIL 每个解释器一把——新开一个进程，多一把新锁。

---

## 3. pool-map — 心智模型：Pool 派单三步（6 steps · ~35s）

**信息池**：
- 定义：multiprocessing 把任务交给多个独立解释器进程，每个进程一把独立 GIL —— 来源 article §What L24
- 流程：pool.map 三步——提交 / 并行执行 / 汇合（按输入顺序返回）—— 来源 article §What L26-30
- 词义：Pool 进程池——预先启动固定数量 worker、循环领任务的结构；worker＝池里干活的小进程 —— 来源 article §What L28
- 角标：池的创建是一次性成本，建好应复用 —— 来源 article §Quick Start L107
- 类比：连锁餐厅中央派单——总部 / 四家分店全套独立厨房 / 出餐按下单顺序（口播不念，作 step 4 画面隐喻）—— 来源 article §What L32
- 词义：pickle——对象序列化机制（白话：对象打包机）；物流成本＝核心代价 —— 来源 article §What L34

**开发计划**：
- step 1 (~7s) — Pool 定义：hero 代码名 multiprocessing.Pool + 白话注（预先雇好固定数量的 worker，循环领任务）+ worker 小注「池里干活的小进程」+ 角标「建池是一次性成本，建好应复用」
- step 2 (~4s) — pool.map 三步管线：提交 → 并行执行 → 汇合 + 标语「从提交到收工，三步」
- step 3 (~5s) — 第 1 步·提交：主进程把任务列表切成 4 块分发给 worker（节点 1 亮）
- step 4 (~5s) — 第 2 步·并行执行：4 个 worker 各领一块同时开算（进度条同涨）
- step 5 (~5s) — 第 3 步·汇合：结果按输入顺序回流主进程 + 注「按输入顺序，不是完成顺序」（餐厅派单作画面隐喻：四家分店出餐按下单顺序上桌）
- step 6 (~9s) — pickle 规矩：两进程边界 + 装箱运输示意（参数去 / 结果回都要过 pickle 箱）+ 白话定义「pickle＝Python 自带的对象打包机」+ 标语「物流成本＝多进程的核心代价」

口播节选：
> 谁也不能直接拿对方的内存——参数和返回值都要先打包再运输，干这活的叫 pickle。

---

## 4. live-demo — 真机实验：三个小节逐一现形（11 steps · ~71s，信息密集章放宽）

**信息池**：
- 命令：python3 mp_accel.py（四个小节 + 全部断言，约 15 秒，纯标准库）—— 来源 article §Quick Start L60-67
- 输出：串行 4 连跑 0.492s；Pool(4) 0.197s（2.50×）；threading(4) 0.660s（0.75×，不加速）—— 来源 article L75-78
- 结论行：「多进程 = 每个进程一把独立 GIL，字节码真并行」—— 来源 article L79
- 输出：父进程退出码 0，stdout = 'OK 1'；stderr：子进程 re-import 重演 p.start() → RuntimeError bootstrapping；子进程 exitcode=1 尸退，worker 结果悄悄丢失 —— 来源 article L84-88
- 输出：输入 [0.3, 0.1, 0.2, 0.05]（最慢先提交）→ map 返回同序；总耗时 0.35s ≈ 最慢任务 0.3s —— 来源 article L93-94
- 规矩：入口代码必须 if __name__ == '__main__' 保护 —— 来源 article L88

**开发计划**：
- step 1 (~5s) — 模拟终端：$ python3 mp_accel.py + 小节目录 [1] 环境探测 [2] 加速比 [3] __main__ 保护 [4] map 保序（命令原文只在屏幕）
- step 2 (~6s) — 终端节选[2]：串行 4 连跑 0.492s + 时间条
- step 3 (~7s) — 同终端：Pool(4) 0.197s（明显更短的条）+ hero「2.5×」+ 注「4 个核真的同时干活了」
- step 4 (~5s) — 对照组：threading(4) 0.660s（最长的条）+ 角标「0.75×，不加速」
- step 5 (~5s) — 结论大字（kicker「结论」）：「每个进程一把独立 GIL，字节码真并行」+ 三条迷你时间条回顾
- step 6 (~7s) — 终端节选[3]：main 保护定义卡（只有主程序本人，才执行启动代码）+ 终端行「父进程退出码 0，stdout = 'OK 1'」
- step 7 (~6s) — 表面正常卡：OK 1 高亮 + 注「看起来一切正常！」
- step 8 (~8s) — stderr 真相层：traceback 摘要（子进程 re-import 重演启动代码 → RuntimeError bootstrapping）+「子进程 exitcode=1」
- step 9 (~5s) — 标语大字：「崩溃会喊，静默失败不喊」+ 注「worker 的结果悄悄丢了——父进程毫不知情」
- step 10 (~8s) — 终端节选[4]：输入四片 0.3 / 0.1 / 0.2 / 0.05（标注「最慢先提交」）→ map 返回同序卡片
- step 11 (~7s) — 时间证据：总耗时 0.35s ≈ 最慢任务 0.3s + 标语「真并行，不是排队」

口播节选：
> 结论：每个进程一把独立 GIL，字节码真并行。

---

## 5. mechanism — 拆开看：加速从哪来、代价在哪（9 steps · ~67s）

**信息池**：
- 机制：Process 启动完整新解释器——自己的 GIL、自己的堆、自己的模块状态 —— 来源 article §How It Works L119
- 代价：spawn 启动一个子进程 50-100ms（重新 import 一切）；macOS/Windows 默认 spawn —— 来源 article L123 / L111
- 代价：所有传参和返回值都要过 pickle 序列化 —— 来源 article L124
- 代价：跨进程改全局变量不可能——各改各的副本；真共享见 06_ipc_shared —— 来源 article L125
- 计时：bench_once 把 Pool 创建放计时外（一次性成本，池复用成百上千次）—— 来源 article L145-153
- 诚实预期：spawn 一套 0.3~0.5s 单列；加速 2.4~3.2× 浮动（性能核/能效核混排）；断言锁 ≥2.0× —— 来源 article L97-101 / L153
- 公式：加速 ≈ 总功 / (总功/n + 启动成本)；任务规模 150,000，单任务 ~0.15s、总功 0.6s、启动 0.4s 摊薄 → 2.5× —— 来源 article L157
- When：值得上＝批量纯计算（缩略图/哈希）/ 长时离线作业（特征工程/日志聚合/批量渲染）；别上＝IO 密集 / 毫秒级单任务 / 高频共享状态 —— 来源 article §When to Use L40-47

**开发计划**：
- step 1 (~9s) — 2.5 倍从哪来：4 个进程卡并排（每张＝GIL 小锁 + 独立内存条）+ 标语「4 份互不干扰的计算」
- step 2 (~8s) — 三笔代价卡（递进 1/3）启动费：spawn 白话注（Python 开子进程的默认方式）+ 50~100 毫秒时间条 + 注「重新加载一切」
- step 3 (~6s) — 代价卡 2/3 物流费：参数/返回值装箱过管道示意 + 角标「数据越大越贵」
- step 4 (~6s) — 代价卡 3/3 隔离费：两进程各自改自己副本对照（跨进程箭头打叉）+ 注「真要共享内存，走专门通道——下一讲」
- step 5 (~8s) — 两个数字一：hero「0.3~0.5 秒」+ 代码注「with Pool(4)  # spawn 成本在计时外」+ 注「建池一次性成本」
- step 6 (~6s) — 两个数字二：标尺 2.4~3.2× 浮动区间（快核/慢核标注）+ 角标「验收只锁 2 倍底线」
- step 7 (~6s) — 公式卡大字：加速比 ＝ 总任务量 ÷（单任务量 ＋ 启动时间）
- step 8 (~9s) — 代入算账：0.15s × 4 ＝ 0.6s；启动摊 0.4s → 还剩 2.5× + 警示「任务太小就会倒挂」
- step 9 (~8s) — 判断卡两栏：该上（批量纯计算：缩略图/哈希；长时离线作业）vs 不该上（IO 密集→线程更省 / 毫秒级任务 / 高频共享数据）

口播节选：
> 代入：单任务 0.15 秒，4 份共 0.6 秒，启动摊 0.4 秒，还剩 2.5 倍——任务太小就会倒挂。

---

## 6. pitfalls — 五个真实踩过的坑（6 steps · ~43s）

**信息池**：
- 坑 1：嵌套函数/lambda 传给 Pool → pickle 抛 Can't get local object；原因＝spawn 按限定名 pickle；解法＝模块顶层函数或 functools.partial —— 来源 article §Pitfalls L165
- 坑 2：漏写 __main__ 保护 → 父进程照常 OK、exit 0，worker 结果悄悄丢；解法＝入口一律保护，Jupyter 同样 —— 来源 article §Pitfalls L166
- 坑 3：任务太小就上多进程 → 加速比低于 1；解法＝先算「启动成本 vs 单任务收益」—— 来源 article §Pitfalls L167
- 坑 4：子进程 print 大量内容 → 输出交错撕裂；解法＝结果用返回值带回，主进程统一输出 —— 来源 article §Pitfalls L168
- 坑 5：以为 map 流式返回 → 整批卡到最后；解法＝imap / imap_unordered / as_completed —— 来源 article §Pitfalls L169

**开发计划**：
- step 1 (~9s) — 坑 1 现象卡：代码行 pool.map(lambda …) + 终端错误行「Can't get local object」+ lambda 小注「匿名函数——没有名字的小函数」
- step 2 (~8s) — 坑 1 解法卡：代码对照（顶层 def 函数 / functools.partial）+ 注「spawn 按名字打包函数」
- step 3 (~7s) — 坑 2 卡：main 保护代码行 + 白话（『如果我是主程序，才往下走』）+ 角标「Jupyter 里也要写」+ 回看静默失败
- step 4 (~6s) — 坑 3 卡：倒挂时间条（多进程条比串行长，加速比 <1）+ 注「动手前先算启动成本这笔账」
- step 5 (~6s) — 坑 4 卡：三行输出被撕成交错碎片示意 + 标语「结果用返回值带回来，主进程统一输出」
- step 6 (~7s) — 坑 5 卡：map 车道（等全部干完才整批返回）vs imap 车道（流式·需要流式返回换 imap）+ 角标「无序版：谁先完成谁先出」

口播节选：
> spawn 按名字打包函数，它没名字。解法：worker 用文件最外层的有名字函数。

---

## 7. qa-closing — 最后一问与收尾（6 steps · ~48s）

**信息池**：
- Q1：fork 快、Unix-only（Mac/Linux）、与线程混用有隐患；spawn 重启解释器、慢但跨平台，macOS/Windows 默认 —— 来源 article §Q&A L173-177
- Q2：map 等全批按输入顺序整批回；imap 流式按输入顺序；imap_unordered 完成顺序即产出顺序；吞吐敏感 + 耗时差异大用后两者 —— 来源 article §Q&A L179-181
- 对比表：threading＝IO 密集默认；futures 线程池＝统一池接口（map/submit 同名）；futures 进程池＝按完成顺序收结果（07）；asyncio＝万级并发 IO —— 来源 article §When to Use L51-56
- 仓库：hands-on-python / concurrency / 05_mp_accel，python3 直跑 —— 来源 article §Quick Start L60-64
- 下一讲：06_ipc_shared——跨进程真正共享数据（SharedMemory）—— 来源 article L47 / L125

**开发计划**：
- step 1 (~10s) — Q1 左栏：fork 卡（复制父进程内存 / 快 / 只在 Mac、Linux 上有）
- step 2 (~8s) — Q1 右栏亮起：spawn 卡（重启一个新解释器 / 慢一点 / 跨平台·macOS 和 Windows 默认支持），fork 灰化保留
- step 3 (~9s) — Q2 三行对照：map（等全批·整批回）/ imap（流式·按输入顺序）/ imap_unordered（完成即出）+ 角标「不用陪着最慢的等」
- step 4 (~5s) — 选型卡 1/2：等网络 → threading（默认）/ 计算重 → 进程池
- step 5 (~7s) — 选型卡 2/2：统一池写法 → futures（线程版/进程版）/ 海量连接 → 协程（后面专门讲）
- step 6 (~5s) — 收尾：仓库路径 hands-on-python · concurrency / 05 · mp_accel.py + 大字标语「python3 一跑，就有体感」（画面保留，口播不念）+ 预告「下一讲：进程间通信」+「下期见」

口播节选：
> fork 复制父进程内存——快，但只在 Mac、Linux 上有；spawn 重新启动一个解释器——慢一点，但跨平台。

---

## 素材清单

### 1. hook
- ✓ 标题页排版（主标 / 副标 / 工程图签）—— 程序化绘制
- ✓ 三问引用卡、三件事递进列表、三跑法时间条预告 —— 程序化绘制

### 2. background
- ✓ SVG 大锁、解释器卡、排队闸门、时间条对照、锁令牌交接、进程内存框、hero 代码名 —— 程序化绘制

### 3. pool-map
- ✓ Pool 定义卡、三步管线、切块分发示意、并行进度、保序回流、pickle 装箱运输 —— 程序化绘制

### 4. live-demo
- ✓ 模拟终端窗口（真实输出取自 article §Quick Start）、时间条对照、stderr 真相层、保序卡片 —— 程序化绘制

### 5. mechanism
- ✓ 进程拆解卡、三笔代价卡、诚实数字卡、公式卡、判断两栏 —— 程序化绘制

### 6. pitfalls
- ✓ 坑卡片（代码对照 / 终端错误行 / 倒挂时间条 / 撕裂输出 / 双车道流式对照）—— 程序化绘制

### 7. qa-closing
- ✓ fork vs spawn 双栏、map/imap 三行对照、选型四行卡、收尾页 —— 程序化绘制

> 无外部图片素材需求，无待提供素材（⚠️ 项：无）。
