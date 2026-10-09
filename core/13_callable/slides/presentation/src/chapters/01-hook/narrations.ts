import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（对应 script.md 第 1~2 拍）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页（宣布句）
  "今天讲 Python 的可调用对象。",
  // step 1 — 拷问：函数能调，对象呢
  "就一个问题：my_func(42) 能调用，那 obj(42) 呢。",
  // step 2 — 答案：__call__
  "答案是：也能。只要类里定义了 __call__。",
  // step 3 — 等价式
  "obj(42) 这一刀，实际执行的是 obj.__call__(42)。",
];
