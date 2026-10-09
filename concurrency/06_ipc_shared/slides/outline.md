# Video Outline

> **主题**：`monochrome-print`（模板锁定——python-concurrency 系列统一黑白印刷皮肤；用户可在对齐时改）
> **总时长**：约 7 分钟（口播 2099 字 / 46 拍，估时累加 ~420s，按本仓库 PLAYBOOK 实测口径 5 字/秒；成片以 afinfo 实测为准）
> **章节数**：7 章 / 46 步
> **模板**：thread-lifecycle（7 章结构逐章对位：hook / background / 心智模型 / live-demo / mechanism / pitfalls / qa-closing；口播体量 2059 字 vs 模版 2130 字同量级）
> **上下文**：系列第 6 讲，直接承接 mp-accel 结尾预告「下一讲拆进程间通信」；线程侧竞态 / 同步原语已在前两讲讲过，本讲只做一句呼应不展开
> **script 定稿口径**：script.md 为用户定稿（45 拍）。新手 review 提示的行话点（pickle / 校验和 / 原子性 / 探针 / 对称成本 / 代理 / 悬空）台词层保留原样，**白话兜底全部转移到画面小注**——各 step 已逐一落位，见「零上下文」标注
> **TTS 口径**：`G I L` 拆写已直接写入 script 定稿；`3,596` 台词写「三千五百九十六」；IPC / pickle / spawn / RPC 等屏幕保留原样，口播用白话说法（打包工具 / 启动子进程 / 派人跑一趟）；符号（+= / ≥ / ×）一律不进口播（PLAYBOOK 坑 19）

---

## 1. hook — 片头：三个没答案的问题（8 steps · ~54s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 引用：「子进程里明明改了那个变量，父进程怎么就是看不见？」—— 来源 article §Background L12
- 引用：「50MB 的数组传给子进程，怎么要等小半秒？」—— 来源 article 引言 L5-6 / 输出 [3] 366ms L87
- 引用：「共享计数器更新一万次，怎么悄悄丢了六千四百多次？」—— 来源 article 输出 [4] 丢失 6,404 次 L93
- 词义：进程＝正在运行的程序（标题屏小注，口播「进程各有各的内存」前先立住）—— 来源 article §Background L18 / 新手 review 屏幕兜底清单
- 词义：父进程＝主程序，子进程＝它派出去的分身（引用卡小注）—— 来源 article §Background L12
- 数据：SharedMemory 比 pickle+Pipe 快 18.5× —— 来源 article 引言 L6
- 数据：Queue 一秒约 25.7 万条（100,000 条 / 0.39s）—— 来源 article 输出 [2] L81
- 图签：hands-on-python · concurrency / 06 · Pipe · Queue · SharedMemory · Manager —— 系列模板 thread-lifecycle 片头约定

**开发计划**：
- step 1 (~7s) — 片头标题页：主标「进程间通信」+ 副标「把传话的路重新接上」+ 工程图签 + 小注「进程＝正在运行的程序」
- step 2 (~8s) — 冷开场第一问：hero 引用卡「子进程里明明改了那个变量，父进程怎么就是看不见？」+ 小注「父进程＝主程序，子进程＝它派出去的分身」
- step 3 (~5s) — 第二问：hero 引用卡「50MB 的数组传给子进程，怎么要等小半秒？」
- step 4 (~6s) — 第三问：hero 引用卡「共享计数器更新一万次，怎么悄悄丢了六千四百多次？」
- step 5 (~9s) — 三道坎清单（递进列表 1/3）：第 1 条「内存互相隔离——你改的是自己的那份副本，对方永远看不见」
- step 6 (~7s) — 清单（递进列表 2/3）：第 2 条「想传数据，只能搬字节——先打包、再拆包」
- step 7 (~7s) — 清单（递进列表 3/3）：第 3 条「共享有代价——要么绕远路，要么没人看守」+ 小注「绕远路＝每次都问中间人；没人看守＝同时改没人拦」
- step 8 (~5s) — 预告：四通道名卡（Pipe / Queue / SharedMemory / Manager）+ 小注「Python 标准库自带」+ 标语「哪条快、哪条有坑，挨个分析」

口播节选：
> 「子进程里明明改了那个变量，父进程怎么就是看不见？」

---

## 2. background — 共享是怎么丢掉的（5 steps · ~59s）

**信息池**：
- 机制：线程时代所有线程共享同一进程内存，全局计数器谁都能直接读写，「共享是免费的」—— 来源 article §Background L12
- 机制：多进程绕开 GIL（全局解释器锁）拿到真并行，也拆掉了共享内存 —— 来源 article 引言 L3
- 词义：GIL——同一时刻只有一个线程真正干活的全局大锁（前两讲主角，本讲一句带过；台词已拆写「G I L」）—— 来源 article 引言 L3
- 撞墙：子进程里改「全局变量」改的是自己那份副本，父进程永远看不见 —— 来源 article §Background L12
- 痛点：互相看不见变量，只能把数据序列化成字节流来回搬运，大对象搬一次几百毫秒 —— 来源 article §Background L14
- 出路：硬扛不通信就退回单进程，并行白做 —— 来源 article §Background L14
- 设施：IPC 不是 Python 新发明——操作系统早有管道、共享内存 —— 来源 article §Background L16
- 包装：标准库 multiprocessing 把操作系统设施包装成 Python 对象，给出四条通道 —— 来源 article §Background L18

**开发计划**：
- step 1 (~12s) — 线程时代回放：一个进程框内多条线程共写同一个计数器 + 标语「线程时代，共享是免费的」
- step 2 (~14s) — GIL 与代价：GIL 大锁卡「同一时刻只有一个线程真正干活」→ 真并行 / 内存隔离两半分屏（屏幕写 GIL，台词已拆写）
- step 3 (~11s) — 撞墙演示：子进程框里改副本（数值变了），父进程框里原件纹丝不动 + 标语「改的是它自己的那份副本」
- step 4 (~12s) — 两条路对比：打包搬运 vs 退回单进程 + 中间「进程＝独立运行的程序，每个进程都分配独立的内存」（口播定义拍，屏幕立大字）
- step 5 (~10s) — 收束：操作系统传话设施打底（管道＝一边进一边出的管子 / 共享内存＝大家共用的内存，白话标注）+ 标语「四条通道登场」

口播节选：
> 绕开它，使用真并行；但真并行有个代价：内存也跟着隔离了。

---

## 3. channels — 四条通道与三条路线（7 steps · ~60s）

**信息池**：
- 三路线表：Pipe/Queue 走「序列化+管道，每字节都要拷贝」/ SharedMemory 走「同一块物理内存，零拷贝直读」/ Manager 走「代理+RPC，每次访问一个来回」—— 来源 article §What L28-32
- 词义：序列化（pickle）＝把对象打包成字节流再运输 —— 来源 article §Background L14
- 词义：RPC＝远程过程调用，把访问转发给另一个进程执行再带回（屏幕用，口播不念）—— 来源 article §What L26
- 性能排序即实现排序：零拷贝 > 管道 > RPC —— 来源 article §What L34
- 纪律排序相反：Manager 的 dict 最像普通 dict，也最容易忘记 get 与 set 之间隔着两次调用 —— 来源 article §What L34
- 办公室类比：四间隔音办公室——互传纸条（Pipe/Queue，内容先抄一遍）/ 共用一块白板（SharedMemory，同一块板面）/ 雇秘书跑腿（Manager，每句吩咐一趟来回）—— 来源 article §What L36
- 类比失效边界：白板不拦两人同时擦同一格（同步自理）；纸条抄大图纸很慢（大块数据按字节计）—— 来源 article §What L38
- API 事实：Pipe 双端双工 send/recv 走 pickle；Queue 内部＝Pipe+锁+喂食线程；SharedMemory 生命周期手动管理；Manager 代理每次属性访问都是 RPC —— 来源 article §Quick Start L107-111

**开发计划**：
- step 1 (~12s) — 第一路线主视觉：Pipe/Queue 卡 + 打包→字节流→管子→拆包四段流水线 + 标语「每个字节都要拷贝」+ 小注「打包＝序列化（pickle）」
- step 2 (~8s) — 第二路线：SharedMemory 卡 + 多个进程框连到同一块物理内存块 + 标语「零拷贝，直接读」
- step 3 (~9s) — 第三路线：Manager 卡 + 中间人（服务进程）居中，访问箭头一来一回 + 小注「RPC＝把访问转发给另一个进程再带回」
- step 4 (~9s) — 办公室类比 1/3：四间隔音办公室场景 + 互传纸条示意（先抄一遍，图越大抄得越久）
- step 5 (~7s) — 类比 2/3：共用一块白板（大家看到的是同一块板面）
- step 6 (~5s) — 类比 3/3：雇一位秘书（每句吩咐一趟来回）
- step 7 (~10s) — 类比失效边界双卡：白板不防同时擦写 + 小注「同步＝排队，要自己解决」；纸条按字节计费 + 性能排序条「零拷贝 > 管道 > RPC」

口播节选：
> SharedMemory 是共用一块白板——大家看到的，是同一块板面。

---

## 4. live-demo — 真机实验：四段输出逐一现形（7 steps · ~57s）

**信息池**：
- 命令：`python3 ipc_shared.py`（四个实测小节 + 全部断言，约 3 秒；口播不念，屏幕 mono 承载）—— 来源 article §Quick Start L68-70
- 输出 [2]：100,000 条分毫不差，耗时 0.39s（≈256,866 条/秒，含 pickle 开销）—— 来源 article L81
- 输出 [3]：SharedMemory 子进程侧 20ms（零拷贝直读）/ pickle+Pipe 366ms / 加速 18.5× / 两边 CRC32 一致 —— 来源 article L86-88
- 输出 [4]：无锁最终 count=3,596（丢失 6,404 次）/ 加锁 count=10,000 分毫不差 —— 来源 article L92-94
- 词义：校验和＝给数据拍的指纹，两边一致＝数据完好（step 4 角标，口播只说指纹）—— 来源 article L88 / 新手 review 兜底
- 词义：pickle＝前面说的打包工具（step 4 角标）—— 来源 article §Background L14 / 新手 review 兜底
- 诚实预期：SharedMemory 加速比 18~30× 波动（断言只锁 ≥5×）；Manager 无锁丢失率 60%+ 是常态不是偶发；§1/§2 全零失败 —— 来源 article L98-102
- 对照锚点：Manager 无锁丢更新与线程 counter += 1 竞态同构（02_race_gil / 03_sync_primitives 已讲），只是窗口宽几百倍 —— 来源 article §Q&A L173

**开发计划**：
- step 1 (~4s) — 模拟终端窗口：mono 命令 `python3 ipc_shared.py` + 四个小节标题 + 小注「跑完自动核对结果」
- step 2 (~10s) — 终端节选 [2]：Queue 十万条 0.39s + 数据角标「≈25.7 万条/秒」+ 小注「每条都过打包、拷贝、拆包」
- step 3 (~9s) — 终端节选 [3] 上半：SharedMemory 20ms 零拷贝直接读高亮
- step 4 (~8s) — 终端节选 [3] 下半：pickle+Pipe 366ms 对照 + 大字「18.5×」+ 双角标「pickle＝打包工具」「校验和＝数据指纹，两边一致＝完好」
- step 5 (~9s) — 终端节选 [4]：无锁 count=3,596（10,000 格进度缺 6,404 格可视化）+ 小注「四个进程同时抢着加一，更新的空当被别人插队」
- step 6 (~9s) — 加锁对照：count=10,000 满格 + 标语「同一份代码，截然不同的结果——就差一把锁」

口播节选：
> 不加锁：只剩三千五百九十六——丢了六千四百多次。

---

## 5. mechanism — 拆开看：三条路线的实现与纪律（8 steps · ~82s）

**信息池**：
- 机制：Pipe/Queue 传的都是 pickle 副本——改副本不影响原件，大对象序列化成本按字节计费 —— 来源 article §How It Works L121-122
- 机制：Queue 内部＝「Pipe + 锁 + 喂食线程」（后台线程把 put 的对象搬到底层 Pipe，让 put 尽快返回）—— 来源 article §How It Works L119
- 机制：SharedMemory 两次 memcpy——父写一次、子读一次，没有序列化、没有管道、没有第三份拷贝 —— 来源 article §How It Works L127
- 纪律：生命周期手动管理（close()+unlink()，忘 unlink 泄漏到 /dev/shm）；只共享内存不共享原子性，同步自己上锁 —— 来源 article §How It Works L129
- 词义：原子性＝一口气做完、中间插不进手（step 3 小注，口播只说排队）—— 来源 thread-lifecycle 前作口径 / 新手 review 兜底
- 机制：Manager 代理把所有属性访问转发到独立服务进程执行再带回；d["k"] += 1 是两次独立 RPC——窗口大开，1 万次丢 6,404 次 —— 来源 article §How It Works L135-137
- 方法一：校验和探针必须比被测物便宜——sum(50MB) 两秒起步把 18.5× 淹没到 1.2×；zlib.crc32 毫秒级差异立刻显形 —— 来源 article §How It Works L143-145
- 词义：探针＝测量用的验货工具；被测物＝要量的传输本身（step 5 小注）—— 来源 article §How It Works L145 / 新手 review 兜底
- 方法二：把对称成本从计时里剥掉——spawn 0.3~0.5s 两边各付一遍；子进程预 spawn + Event 发车后只测纯传输 —— 来源 article §How It Works L149-151
- 词义：spawn＝启动一个全新子进程；Event＝跨进程发令旗（step 7/8 小注）—— 来源 article §How It Works L149 / mp-accel 前作

**开发计划**：
- step 1 (~14s) — 第一路线拆解：打包副本在管道两端流动的示意 + 标语「改副本，不影响原件」+ Queue 三件套小注（管道 + 锁 + 后台搬运线程）
- step 2 (~10s) — 第二路线拆解：同一块内存上「父写一次、子读一次」两次内存复制 + 标语「没有第三份拷贝」
- step 3 (~9s) — SharedMemory 纪律双卡：生命周期自己管（小注「close 只断开、unlink 才删除，系统不替你收拾」）+ 自己上锁保持同步（小注「原子性＝一口气做完、中间插不进手」）
- step 4 (~13s) — Manager 拆解：改一个共享的数展开成「读回来 + 写回去」两个来回，空当被别的进程穿插 → 丢更新 + 小注「远程调用＝派人跑一趟」
- step 5 (~12s) — 基准方法一（反例）：逐字节求和 2 秒验货把 18.5× 压成 1.2× 的时间条对照 + 小注「探针＝验货工具；校验和＝数据指纹」+ 标语「测的是探针，不是传输」
- step 6 (~8s) — 方法一（正解）：毫秒级校验和 + 角标「zlib.crc32（C 实现）」+ 标语「测量的尺子，不能比量到的东西还贵」
- step 7 (~10s) — 基准方法二：spawn 0.3~0.5s 对称成本示意（两边各付一遍）+ 小注「spawn＝启动一个全新子进程」+ 标语「加速比被稀释」
- step 8 (~7s) — 方法二正解：子进程预挂载停在起跑线、Event 发令后计时只测纯传输 + 小注「Event＝跨进程发令旗；挂载＝把共享内存接好」+ 标语「差异才可见」

口播节选：
> 测量的尺子，不能比量到的东西还贵。

---

## 6. pitfalls — 五个真实的坑（5 steps · ~50s）

**信息池**：
- 坑 1：忘 shm.unlink()——共享内存块泄漏，重启才清；close() 只断开映射不删除 —— 来源 article §Pitfalls L159
- 坑 2：用完的一端不 close——对端以为还在写，EOF（数据流结束信号）永远不来 —— 来源 article §Pitfalls L160
- 坑 3：Manager 代理当本地对象遍历——`for k in d:` 每次迭代一个 RPC；解法先 d.copy() 一次拷回 —— 来源 article §Pitfalls L161
- 坑 4：在 shm.buf 上留引用——bytes() 是拷贝、shm.buf 是视图，删除块后变悬空内存；解法先拷成 bytes —— 来源 article §Pitfalls L162
- 坑 5：以为 Queue 传过去的是原对象——全是 pickle 副本，改副本不影响原件；要真正共享用 SharedMemory 或 Manager —— 来源 article §Pitfalls L163
- 词义：/dev/shm＝基于内存的共享文件系统（口播不念，屏幕小注）—— 来源 article §How It Works L129
- 词义：留引用＝把内存位置记下来存着用；悬空＝指向已删掉的块（step 4 小注）—— 来源 article §Pitfalls L162 / 新手 review 兜底
- 词义：遍历＝逐项翻看；代理＝秘书手里的原件（step 3 小注）—— 来源 article §Pitfalls L161 / 新手 review 兜底

**开发计划**：
- step 1 (~11s) — 坑 1 卡片：close ≠ unlink 对比（断开映射 vs 删除块）+ /dev/shm 泄漏堆积示意 + 小注「断开和删除是两个动作」
- step 2 (~6s) — 坑 2 卡片：Pipe 两端示意，一端不关 → 对端等待信号「永远等不到」+ 小注「EOF＝结束信号（那句『说完了』）」+ 标语「用完要 close」
- step 3 (~11s) — 坑 3 卡片：for 循环逐项访问＝每项请秘书跑一趟的箭头雨 vs 一次性拷回再遍历对照 + 小注「代理＝秘书手里的原件」
- step 4 (~9s) — 坑 4 卡片：视图 vs 拷贝示意——删块后引用指向「拆掉的空地」读出乱码 + 标语「要留存，先拷成字节串」
- step 5 (~14s) — 坑 5 卡片 + 五坑收束：Queue 传副本改原件不动 + 五坑编号清单全览收尾

口播节选：
> 断开和删除是两个动作，删除要显式做。

---

## 7. qa-closing — 选型问答与收尾（6 steps · ~55s）

**信息池**：
- Q1：Pipe vs Queue——Pipe 双端双工更轻适合两点对话；Queue 多对多安全（内部有锁）适合任务分发，get 支持超时与毒丸协议 —— 来源 article §Q&A L169
- 词义：毒丸协议＝投入一条约定好的特殊消息，消费者收到即退出（口播不念，屏幕小注）—— 来源 article §Q&A L169
- Q3：大数组最快＝能不传就不传——SharedMemory 零拷贝共享（写一次读多次）；只读场景 fork 前放模块级变量，fork 复制父进程内存、写时拷贝（只有真正写入时才复制对应页）；pickle+Pipe 是最慢但最通用的兜底 —— 来源 article §Q&A L177
- 词义：fork＝复制父进程内存来创建子进程的启动方式（与 spawn 相对，macOS/Linux）—— 来源 article §When to Use L52
- Q4：Manager vs SharedMemory——Manager 共享「对象的代理」（什么都能代理但每次 RPC），SharedMemory 共享「裸内存」（最快但只有字节）；高频小状态 Manager+Lock 可读性优先，大块二进制 SharedMemory 性能优先，常分工共存 —— 来源 article §Q&A L181
- 仓库：hands-on-python / concurrency / 06_ipc_shared，python3 直跑 —— 来源 article §Quick Start L68-70
- 续作钩子：下一讲 07_futures——把开线程、开进程换成统一接口 —— 系列排期（07_futures）/ mp-accel 结尾预告先例

**开发计划**：
- step 1 (~11s) — Q1 选型双栏：Pipe（两点对话，更轻）vs Queue（多人分发回收，内部有锁）+ 小注「毒丸＝约定一条『收到就退出』的消息」
- step 2 (~10s) — Q3 主视觉：大数组三条路排序——能不传就不传（fork 前放好，子进程整份复刻父进程内存白拿一份）> SharedMemory 零拷贝 > pickle+Pipe 兜底
- step 3 (~9s) — Q3 收束条：pickle+Pipe 标注「最通用，也最慢」+ 标语「先问能不能不传」
- step 4 (~10s) — Q4 上半：高频小状态（计数器、开关这类）→ Manager 加锁 + 角标「可读性优先＝写起来顺手」
- step 5 (~8s) — Q4 下半：大块二进制（图片、视频帧这类）→ SharedMemory + 角标「性能优先＝快最重要」+ 标语「生产系统里，通常是分工共存」
- step 6 (~7s) — 收尾：仓库路径 hands-on-python · concurrency/06 + 屏幕挂命令 `python3 ipc_shared.py` + 下一讲预告（统一接口）+「下期见」

口播节选：
> 只读数据在开进程之前放好，子进程整份复刻父进程的内存，零通信。

---

## 素材清单

### 1. hook
- ✓ 标题页排版（主标 / 副标 / 工程图签）—— 程序化绘制
- ✓ 三问引用卡、四通道名卡 —— 程序化绘制

### 2. background
- ✓ 线程共享回放、GIL/隔离分屏、副本撞墙示意、两条路对比、设施打底图 —— 程序化绘制

### 3. channels
- ✓ 三路线流水线 / 内存块连线 / 中间人箭头、办公室三类比、失效边界双卡、性能排序条 —— 程序化绘制

### 4. live-demo
- ✓ 模拟终端窗口（真实输出文本取自 article §Quick Start）、进度格缺格可视化、加锁对照 —— 程序化绘制

### 5. mechanism
- ✓ 副本流动示意、两次 memcpy、RPC 两来回窗口、探针时间条对照、起跑线发令图 —— 程序化绘制

### 6. pitfalls
- ✓ close/unlink 对比、EOF 等待、箭头雨对照、视图/拷贝示意、五坑清单 —— 程序化绘制

### 7. qa-closing
- ✓ 选型双栏、三条路排序、分工共存双卡、仓库路径卡 —— 程序化绘制

> 无外部图片素材需求，无待提供素材（⚠️ 项：无）。
