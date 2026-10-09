import type { Narration } from "../../registry/types";

/**
 * ch08 · closing — 口播文本（会用 vs 理解 + CTA，对应 script.md 第 37~39 拍）。
 * 长度 = 章节步数 = Closing.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 链条回收
  "回头看那条链：数据描述符、实例字典、非数据描述符。property 的缓存、验证、惰性，全是这条链上的把戏。",
  // step 1 — 金句
  "分得清「会用 Python」和「理解 Python」的，就是这种东西。",
  // step 2 — CTA
  "完整代码在 hands-on-python 仓库。零依赖，python3 一跑就有体感。链接在评论区，下期见。",
];
