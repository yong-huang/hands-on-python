import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（super() 不是父类，对应 script.md 第 1~4 拍）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 * step 0 为静默标题页，不配音。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页（静默，不配音）
  "",
  // step 1 — 反差
  "super()，名字里带个 super，你一定以为它是「调用父类」。",
  // step 2 — 翻车
  "一到多继承，这个理解就翻车。它其实是「MRO 中的下一个」。",
  // step 3 — MRO 概念
  "什么是 MRO？方法查找顺序。多继承时，Python 用 C3 线性化算法把它算出来。",
  // step 4 — 钻石结构
  "拿钻石继承开刀：B 和 C 都继承 A，D 继承 B 和 C。",
];
