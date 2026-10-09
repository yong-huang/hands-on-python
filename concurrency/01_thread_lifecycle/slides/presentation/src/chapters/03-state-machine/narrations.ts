import type { Narration } from "../../registry/types";

/**
 * ch03 · state-machine — 口播文本（对应 script.md 第 15~20 拍）。
 * 第 18 拍「三个状态怎么进」按 1 项 = 1 step 拆成三条（step 3/4/5）。
 * 长度 = 章节步数 = StateMachine.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 主角登场
  "主角：threading.Thread，Python 自带、最底层的线程工具。以后你碰到的更省事的封装，比如线程池——预先雇好一批线程反复用——底层都是它。",
  // step 1 — 单行道：状态机命名
  "记住一句话：线程的一生是一条单行道。NEW，还没点火；RUNNABLE，正干着活；TERMINATED，干完了，报废。它的状态只会因为几件固定的事变来变去。这样的东西，有个名字，叫状态机。",
  // step 2 — 烟花类比 + daemon 分支
  "把它想象成一枚烟花：刚创建出来，只是个摆设，start() 是点火。烧完就报废，想再放，只能换新的。唯一例外：标成了 daemon 的，可能半空中就被掐灭。",
  // step 3 — 状态入口：NEW
  "三个状态怎么进。第一：创建完没 start，是 NEW。",
  // step 4 — 状态入口：RUNNABLE
  "第二：调了 start()，进 RUNNABLE。",
  // step 5 — 状态入口：TERMINATED
  "第三：run() 跑完，进 TERMINATED。",
  // step 6 — is_alive 验证
  "怎么验证它处在哪个状态？用 is_alive() 问它。活着回答 True；NEW 和 TERMINATED，都回答 False。",
  // step 7 — RUNNABLE 不等于正在跑
  "但注意：RUNNABLE 不等于正在 CPU 上跑。前面那把大锁 GIL 之下，同一时刻只有一个线程真正在干活。is_alive() 是 True，只说明它没死。",
];
