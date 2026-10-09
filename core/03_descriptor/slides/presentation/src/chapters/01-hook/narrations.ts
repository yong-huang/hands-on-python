import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（标题页 + obj.attr 不是查字典，对应 script.md 第 1~4 拍）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页
  "今天讲 Python 描述符。协议怎么写，查找链怎么走，四个实战模式，手写一遍。",
  // step 1 — obj.attr 不是查字典
  "u.name、obj.attr，这样的代码你天天在写。但你可能没想过：这一行，Python 不是查个字典就完事的。",
  // step 2 — 三件套同源
  "property、classmethod、staticmethod。这三个天天见的内建，底层是同一套东西。",
  // step 3 — 描述符点名
  "它叫描述符。一个定义了 __get__、__set__ 的类，往类属性上一放。obj.attr 的读写，就归它管。",
];
