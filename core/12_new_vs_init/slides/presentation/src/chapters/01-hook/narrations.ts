import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（对应 script.md 第 1~3 拍）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 * dunder 名（__new__ / __init__）按系列惯例原样保留，TTS 可读。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页（宣布句）
  "今天讲 Python 对象的出生。",
  // step 1 — MyClass() 一行 + 灵魂拷问
  "就一个问题：MyClass() 这一行，背后到底发生了什么。",
  // step 2 — 误解：没写过 __new__，第一反应只有 __init__
  "写 Python 这么多年，你可能一次 __new__ 都没写过。多数人的第一反应：调 __init__ 呗。",
  // step 3 — 悬崖金句
  "对，但只对了一半。",
];
