# 12 · 死锁与竞态诊断工坊：复现、验尸、修复

> 死锁人人背得出四个条件，但亲手"造一个、抓一个、修一个"的体验完全不同。本实验
> 在**隔离的子进程**里稳定复现交叉锁死锁，用 `faulthandler` 自动 dump 两个互相等待
> 的线程栈，再用统一锁序修复到连跑 100 次无挂起——外加一条本实验亲自踩出来的教训：
> 死锁演示绝不能放在主进程里。

## 1. 为什么需要它

死锁的麻烦在于它**不报错、不退出、只挂起**——日志安静、CPU 空闲、进程健康，唯一的症状是"怎么还不返回"。没有现场抓取手段，你只能对着代码猜。本实验建立一套完整的死锁处理流程：稳定复现（放大窗口）→ 自动验尸（faulthandler 定时 dump）→ 定位（两个栈停在互相持有的锁上）→ 修复（锁排序）→ 回归验证（100 次守护超时循环）。

## 2. 总览：核心机制一图看懂

![死锁：交叉获取两把锁](images/deadlock_workshop.svg)

一句话心智模型：**T1 持 A 要 B、T2 持 B 要 A——两条"等待中…"谁也不返回，循环等待成立，死锁即成**。看图上下对称的两条等待箭头：B 告诉 T1"永不返回"，A 告诉 T2"永不返回"。修复只改一处：全局约定先 A 后 B，T2 的第二条 acquire 永远排在 B 之后，交叉消失。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/concurrency/12_deadlock_workshop/images/deadlock_workshop.html)
> （或本地打开 [`images/deadlock_workshop.html`](images/deadlock_workshop.html)）。

## 3. 快速开始

```bash
cd concurrency/12_deadlock_workshop
python3 deadlock_workshop.py      # 复现 + 验尸 + 修复，约 20 秒
```

真实输出（macOS, CPython 3.13.9）：

```
========================================================
[1+2. 复现死锁，faulthandler 3 秒后抓现场]
========================================================
  子进程死锁成立，faulthandler 在 3 秒时 dump 了全部线程栈
  现场（两个线程都停在 transfer_bad 的锁等待上）：
    File ".../deadlock_workshop.py", line 45 in transfer_bad
    File ".../deadlock_workshop.py", line 40 in transfer_bad
  诊断结论：两个线程分别持有 A/B 并等待对方持有的锁 → 循环等待 → 死锁
  教训：死锁演示必须在子进程里做——挂死线程是非 daemon，主进程会被拖到永远退不出

========================================================
[3. 修复：统一锁序，连跑 100 次无挂起]
========================================================
  100 轮全部正常退出（0.3s）——统一锁序消灭循环等待
  锁排序法则：全局约定'永远先 A 后 B'，谁都不反转 → 死锁四条件的循环等待被拆除
  兜底三件套：acquire(timeout=) / 守护超时 / faulthandler 现场
```

dump 文件里最关键的两行（完整现场见 /tmp/_deadlock_dump.txt）：

```
  File ".../deadlock_workshop.py", line 45 in transfer_bad   ← T1 停在 with LOCK_B
  File ".../deadlock_workshop.py", line 40 in transfer_bad   ← T2 停在 with LOCK_A
```

诚实预期（本机 3 次实测）：

- **死锁 100% 稳定复现**：`sleep(0.01)` 把窗口放大到调度器必然命中——复现死锁不靠运气，靠窗口工程
- **dump 中的行号 45/40 分别对应两个分支的 `with` 语句**：两行行号不同 = 交叉等待的直接证据
- **§3 的 100 轮只要 0.3s**：统一锁序后无争用等待，纯函数调用开销

## 4. 核心概念

### 4.1 死锁四条件与循环等待

互斥、持有并等待、不可剥夺、循环等待——四个条件**同时**成立才死锁。工程上唯一能安全拆除的就是循环等待：给系统内所有锁定一个全局顺序，所有线程按同一顺序获取。本项目 `transfer_good` 无论业务方向如何都先拿 `LOCK_A` 再拿 `LOCK_B`——反序调用方只是"业务上反了"，锁序没反。

### 4.2 faulthandler：进程的行车记录仪

`faulthandler.dump_traceback_later(3, file=stderr)` 起一个看门狗线程，3 秒后把**所有线程的 Python 栈**写到指定文件——进程挂起也能写（各线程在锁上等待时已释放 GIL）。dump 出两行 `transfer_bad` 且行号不同，就是"互相等待"的实锤。同类工具：`threading.enumerate()` 看活着谁、`acquire(timeout=)` 探测锁、py-spy（第三方）看任意时刻栈。

### 4.3 修复工具箱：三道防线

1. **预防**：统一锁序（治本）；或干脆少用多锁——把临界区合并成一把锁保护
2. **检测**：`acquire(timeout=0.5)` 拿不到就报警而不是无限等；配合 faulthandler dump 找对手
3. **兜底**：守护超时（`future.result(timeout=)`）让挂起可被发现——注意被放弃的线程还挂着，进程退出时会等它（见 §3 坑清单）

## 5. 关键代码解析

**为什么死锁演示要在子进程里跑？**

```python
p = subprocess.Popen([sys.executable, __file__, "--deadlock-child"],
                     stdout=subprocess.DEVNULL, stderr=open(dump_path, "w"))
time.sleep(5)
p.kill(); p.wait()          # 死锁进程本来就救不活，直接击杀
dump = open(dump_path).read()
```

第一版把死锁线程放在主进程：挂死的 worker 是**非 daemon 线程**，`ThreadPoolExecutor` 退出时 `shutdown(wait=True)` 永远等它——整个脚本挂死 90 秒。修复姿势：死锁进程 daemon 化/子进程化，父进程超时击杀后验尸。**演示故障时要给"故障现场"留好退路。**

坑清单：

- **死锁线程放主进程**：脚本永远退不出；演示、测试都必须子进程隔离
- **复现靠碰运气**：窗口太小调度器不命中；在两次 acquire 之间 sleep 放大窗口，把概率变成必然
- **断言字符串抄文档不抄实测**：faulthandler 实际输出是 `Timeout (0:00:03)!` 而不是想当然的 `Timeout (3 seconds)`——本实验断言第一版就写错了，dump 一直正常却被误判失败
- **修复只改一处却不回归**：统一锁序后必须连跑 100 次守护超时循环——"看起来修了"和"100 次都过"是两回事

## 6. 文件结构

```
12_deadlock_workshop/
├── deadlock_workshop.py                     # 主演示脚本：复现/验尸/修复
├── README.md                                # 本教程文档
└── images/
    ├── deadlock_workshop.json       # 图源（typed JSON IR，可编辑重渲染）
    ├── deadlock_workshop.html       # 交互示意图（浏览器打开）
    └── deadlock_workshop.svg        # 双主题矢量图（本 README §2 内嵌）
```

`deadlock_workshop.py` 内容：`transfer_bad()/transfer_good()` 反序与锁序版本 / `deadlock_child()` 子进程死锁 + faulthandler 验尸 / `demo_deadlock_and_dump()` 击杀与诊断（验收点 1/2）/ `demo_fix()` 统一锁序 100 轮回归（验收点 3）。

## 7. 深入要点

**Q1: 死锁的四个必要条件？工程上拆哪个？**
互斥、持有并等待、不可剥夺、循环等待。前三者通常是业务/系统属性，工程上拆**循环等待**：全局锁序 + 所有线程遵守，成本最低、无性能损失。

**Q2: 线上进程疑似死锁，怎么诊断？**
faulthandler（dump_traceback_later 或 SIGUSR1 触发 dump）抓全部线程栈；或 py-spy dump / gdb attach。看有没有两个以上线程分别停在不同锁的 acquire 上——有就是循环等待。

**Q3: 锁排序怎么落地到大系统？**
给锁编号（按获取的资源层级），封装统一的"多锁获取函数"内部按编号排序（`sorted` 后依次 acquire）；代码评审检查任何反序 acquire。数据库行锁、两把 mutex 嵌套同理。

**Q4: acquire(timeout=) 能防死锁吗？**
不能防，只能检测：超时说明拿不到锁，可能是死锁也可能是慢——抛错/告警把"永久挂起"降级为"可发现的失败"。真正防死锁还是锁序。

**Q5: try/finally 释放锁和死锁什么关系？**
finally 保证"持有并等待"不会变成"永久持有"（异常路径也放锁），减少死锁诱因；但它防不了循环等待——两者是不同层面的卫生。

## 8. 总结

1. **死锁 = 循环等待**：交叉获取两把锁是最小模型，放大窗口就能稳定复现
2. **faulthandler 是验尸官**：定时 dump 全线程栈，两个栈停在互持的锁上就是实锤
3. **死锁演示必须子进程隔离**：挂死线程非 daemon，主进程会被拖到永远退不出
4. **统一锁序治本**：业务顺序 ≠ 锁序，100 次守护超时循环做回归
5. **三道防线**：锁序预防、acquire(timeout=) 检测、守护超时兜底

下一篇进入 [13 · 并发设计模式集](../13_concurrency_patterns/README.md)——优雅关闭、令牌桶限流、指数退避、fan-out/fan-in，四个生产级模式一次配齐。
