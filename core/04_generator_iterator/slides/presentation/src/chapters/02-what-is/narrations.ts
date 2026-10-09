import type { Narration } from "../../registry/types";

/**
 * ch02 · what-is — 口播文本（可暂停的函数，对应 script.md 第 5~9 拍）。
 * 长度 = 章节步数 = WhatIs.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 含 yield 即变身
  "函数里只要含一个 yield，它就不再是普通函数，是生成器函数。",
  // step 1 — 心智模型
  "心智模型：一个可暂停、可恢复的函数。next() 推它跑，跑到下一个 yield 就停。",
  // step 2 — 栈帧冻结
  "停的时候，栈帧连局部变量原封不动冻在原地。下次从暂停处，精确恢复。",
  // step 3 — 状态机
  "它的一生是一台状态机。刚创建，调用不执行；运行中；已暂停；函数返回，抛 StopIteration。",
  // step 4 — 真机状态检查
  "真机看状态：type 是 generator。暂停时 gi_frame 在；耗尽后，gi_frame 变 None。",
];
