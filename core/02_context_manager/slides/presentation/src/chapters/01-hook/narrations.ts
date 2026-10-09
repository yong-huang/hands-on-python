import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（标题页 + 一个 with 治「忘了还」，对应 script.md 第 1~4 拍）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页
  "今天讲 Python 上下文管理器。就两件事：它是什么，为什么你需要它。",
  // step 1 — 打开 / 读取 / 关闭，正常路径
  "先看一段再正常不过的代码。打开文件，读内容，关文件。三步，天经地义。",
  // step 2 — 异常腰斩 close
  "但如果读的时候崩了呢？抛异常，函数当场中断。写在最后的 close，永远执行不到。",
  // step 3 — with 登场，点名机制
  "治这个的，是一个关键字。一个 with。它背后的机制，叫上下文管理器。",
];
