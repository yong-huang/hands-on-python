import type { Narration } from "../../registry/types";

/**
 * ch03 · iter-gen — 口播文本（手写迭代器 vs 生成器，对应 script.md 第 10~13 拍）。
 * 长度 = 章节步数 = IterGen.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — for 底层
  "还记得刚才的 StopIteration 吗？它就是迭代器协议的一部分。for 循环的底层，就是不断调 __next__，直到 StopIteration。",
  // step 1 — 手写迭代器
  "手写一个迭代器：__iter__ 返回自己，__next__ 推进状态。再维护一个 done 变量，二十多行起步。",
  // step 2 — 生成器版
  "生成器版，斐波那契：a, b = 0, 1，while 循环里一个 yield。五行。",
  // step 3 — 等价
  "两者等价。这两个方法，生成器自动就有。",
];
