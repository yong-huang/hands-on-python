import type { Narration } from "../../registry/types";

/**
 * ch04 · nonlocal — 口播文本（对应 script.md 第 4 章各拍，逐字使用）。
 * 长度 = 章节步数 = Nonlocal.tsx 里 step 的取值个数（5 → step 0..4）。
 */
export const narrations: Narration[] = [
  // step 0 — 提问卡 → 答案一行：nonlocal
  "闭包要好用，还差一块：怎么改外层的变量？答案一行：nonlocal。",
  // step 1 — 反例终端：删掉 nonlocal，count += 1 当场 UnboundLocalError
  "不写会怎样？count 加一，直接报错，UnboundLocalError。刚才那条规矩，赋值即声明。Python 看到 count 在函数里被赋值，就认定它是局部变量。读它的时候还没有值，当场翻车。",
  // step 2 — nonlocal 语义图：箭头指向 Enclosing 层的 count
  "nonlocal 就是声明：我要改的，是外层那个 count。",
  // step 3 — global 语义图：指向模块级，人人可见
  "那 global 呢？它指向模块级，人人可见。",
  // step 4 — 两个计数器 A/B 独立跳数，各持一套 cell
  "两个计数器，各调各的：A 到 2，B 才 1，互不干扰。每次 make_counter，都产出一套独立的 cell。闭包版的实例，就是这么来的。",
];
