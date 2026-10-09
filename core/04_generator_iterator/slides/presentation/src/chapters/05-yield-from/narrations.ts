import type { Narration } from "../../registry/types";

/**
 * ch05 · yield-from — 口播文本（委托子生成器，对应 script.md 第 20~24 拍）。
 * 长度 = 章节步数 = YieldFrom.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 委托概念
  "生成器里还能委托给另一个生成器：yield from。",
  // step 1 — flatten 走读
  "展平一个多层列表：遇到子列表，就 yield from 递归下去。遇到值，就 yield 出来。",
  // step 2 — 三件事
  "它做了三件事：值透传、异常透传、子生成器的返回值捕获。",
  // step 3 — 真机
  "真机：[1, [2, 3, [4, 5]], 6, [7, 8, 9]]，展平成 1 到 9。",
  // step 4 — 协程伏笔
  "这套暂停加委托，就是后来 async/await 的前身。",
];
