import type { Narration } from "../../registry/types";

/**
 * ch06 · stdlib — 口播文本（对应 script.md 第 25~29 拍）。
 * 长度 = 章节步数 = Stdlib.tsx 里 step 的取值个数。
 * 「@」按中文读音写作「艾特」，便于 TTS 合成。
 */
export const narrations: Narration[] = [
  // step 0 — lru_cache 登场
  "现成货里，最值得认识的是 functools 的 lru cache。一行艾特，函数就带上了缓存。",
  // step 1 — 0.3s vs 0.00s
  "值多少钱？算斐波那契第三十项。裸算，0.3 秒。挂上缓存，第二次 0.00 秒。",
  // step 2 — 零改动
  "而且函数本身一行没改，就多了头上那一行艾特。",
  // step 3 — wraps
  "真要自己动手写，有个标配动作别忘了。第一行写 functools 的 wraps，把原函数的名字、文档都保住。",
  // step 4 — 满屏 wrapper
  "不加会怎样？函数名全变成 wrapper。日志一打，满屏 wrapper，排查问题是真灾难。",
];
