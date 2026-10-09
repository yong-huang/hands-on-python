import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（对应 script.md 第 1~4 拍）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页（宣布句）
  "今天讲作用域与闭包。四样东西：LEGB、cell、nonlocal、还有一个经典陷阱。",
  // step 1 — make_counter 代码卡：函数跑完，count 按理该销毁
  "先看这段代码。make_counter 返回了一个 counter，函数体已经跑完。按理说，里面的 count 该跟着销毁。",
  // step 2 — counter 连续调用，count 还活着
  "可 counter 一调，是 1。再调，是 2。count 活过了它所在的函数。",
  // step 3 — 点题：闭包
  "这个现象，叫闭包。",
];
