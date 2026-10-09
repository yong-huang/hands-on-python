import type { Narration } from "../../registry/types";

/**
 * ch08 · real-concurrency — 口播文本（对应 script.md 第 26~27 拍，两拍各拆为 2 步）。
 * 长度 = 章节步数 = RealConcurrency.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — a wait 链 203ms
  "接下来，最实用的一组对照：排着队挨个 a wait 的写法，对比 create_task 的写法。排着队跑两个 100 毫秒的任务：203 毫秒。",
  // step 1 — create_task 101ms
  "create_task 真并发：101 毫秒。排队的 203 毫秒，就是它的 2.01 倍——多出来的那一点点，是事件循环自身的开销，小到可以忽略。",
  // step 2 — 差距在并发
  "差距不在写法，在并发。a wait 一个协程函数，就是普普通通按顺序调用，只不过中途允许别人插一脚——它不并发。",
  // step 3 — 正确姿势
  "想同时跑，先 create_task 把协程挂上循环，让它立刻参与调度。之后的 a wait，只负责收结果。",
];
