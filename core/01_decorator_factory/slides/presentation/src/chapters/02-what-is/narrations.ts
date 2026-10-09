import type { Narration } from "../../registry/types";

/**
 * ch02 · what-is — 口播文本（对应 script.md 第 5~8 拍）。
 * 长度 = 章节步数 = WhatIs.tsx 里 step 的取值个数。
 * 「@」按中文读音写作「艾特」，便于 TTS 合成。
 */
export const narrations: Narration[] = [
  // step 0 — 加工盒子
  "拆开看，它就是个普通的函数。特别的地方就一条：输入是函数，返回值还是函数。",
  // step 1 — @timer 悄悄换函数
  "你在函数头上写艾特 timer，Python 会悄悄把原函数换掉。换成被 timer 包了一层的新函数。",
  // step 2 — 语法糖
  "艾特 timer 这一行，翻译过来就是一句赋值。把函数喂给 timer，再把结果存回去。没有魔法，就是普通的函数调用。但你赚到了：代码一行没改，功能多了一层。",
  // step 3 — 洋葱叠加
  "两个装饰器叠一起呢？艾特 a 在上、艾特 b 在下，等价于 a 包 b、b 包函数。包的时候从下往上，执行的时候从上往下。跟洋葱一样，一层套一层。",
];
