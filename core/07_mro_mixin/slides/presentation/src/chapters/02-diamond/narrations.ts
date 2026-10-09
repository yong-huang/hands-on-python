import type { Narration } from "../../registry/types";

/**
 * ch02 · diamond — 口播文本（钻石继承与 C3，对应 script.md 第 5~9 拍）。
 * 长度 = 章节步数 = Diamond.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — MRO 序列
  "真机：D(B, C) 的 MRO 是 D → B → C → A → object。",
  // step 1 — B 的 super 跳 C
  "注意，B 的 super() 跳向的是 C，不是它的父类 A。",
  // step 2 — 调用序
  "调 D().greet()：D、B、C、A 依次命中，每个一次。",
  // step 3 — 恰好一次
  "A 恰好只执行一次——这是 C3 的保证。直接写 A.greet(self)，它就执行两次。",
  // step 4 — C3 三性质
  "C3 凭什么？三个性质：单调性、局部优先、每个类只出现一次。",
];
