import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（对应 script.md 第 1~3 拍）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页（宣布句）
  "今天讲模块与导入系统。四样东西：sys.modules、main 分流、循环导入、包。",
  // step 1 — 两次 import 的怪现象
  "先看一个现象。同一个文件，import 两遍。第一遍，模块体执行了，打印一行字。第二遍，静悄悄，什么都没发生。可两次拿到的，是同一个对象。",
  // step 2 — 点题：流水线
  "为什么？因为 import 不只是一行关键字。它背后是一条流水线，三步。",
];
