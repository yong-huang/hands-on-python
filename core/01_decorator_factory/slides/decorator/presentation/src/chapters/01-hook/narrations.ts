import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（标题页开场，对应 script.md 第 1~4 拍）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 * 「@」按中文读音写作「艾特」，便于 TTS 合成。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页
  "今天讲 Python 装饰器。就两件事：它是什么，为什么你需要它。",
  // step 1 — 十个函数 + 需求
  "假设你写了十个函数。产品说：每个都要加耗时统计。",
  // step 2 — 复制粘贴死循环
  "怎么办？复制粘贴，十遍。明天要改成毫秒呢？再改十遍。",
  // step 3 — @ 登场，点名装饰器
  "Python 里有个符号，专门治这个。一个艾特。它叫装饰器。",
];
