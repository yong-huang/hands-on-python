import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 5 steps（含静默标题页）
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页（静默，不配音）
  "",
  // step 1 — 追问
  "Python 起 4 个线程，CPU 能跑满吗？",
  // step 2 — 答案
  "答案是不能。CPython 有一把全局解释器锁——GIL。同一时刻，只允许一个线程执行字节码。",
  // step 3 — 三模型预告
  "threading、multiprocessing、asyncio——三种并发模型的真实边界，今天一次拆完。",
];
