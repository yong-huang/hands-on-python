import type { Narration } from "../../registry/types";

/**
 * ch07 · qa-closing — 口播文本（对应 script.md 第 40~45 拍）。
 * 长度 = 章节步数 = QaClosing.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — Q1
  "最后几个选型问题。Pipe 和 Queue 怎么选？两点对话用 Pipe，更轻；多人分发任务、回收结果，用 Queue。",
  // step 1 — Q3 三条路
  "大数组怎么传最快？能不传就不传——只读数据在开进程之前放好，子进程整份复刻父进程的内存，零通信。",
  // step 2 — Q3 收束
  "要传：SharedMemory 零拷贝最快；pickle 加 Pipe，最通用也最慢，是兜底。",
  // step 3 — Q4 上
  "Manager 和 SharedMemory 都能共享，怎么选？高频小状态，Manager 加锁，可读性优先。",
  // step 4 — Q4 下
  "大块二进制，SharedMemory，性能优先。生产系统里，通常是分工共存。",
  // step 5 — 收尾
  "完整代码在仓库第六讲目录。下一讲：把开线程、开进程换成统一接口——下期见。",
];
