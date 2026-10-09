import type { Narration } from "../../registry/types";

/**
 * ch05 · speed — 口播文本（速度真相，对应 script.md 第 16~18 拍）。
 * 长度 = 章节步数 = Speed.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 历史
  "那速度呢？历史上 3.10 及以前，属性访问确实能提速 10% 到 40%。",
  // step 1 — 真机基准
  "但 3.11 之后做了优化，我实测 3.13：写 0.91 倍，读 0.99 倍——基本持平，偶尔反超。",
  // step 2 — 定论
  "所以「slots 快 20-30%」是旧经验值。今天用 slots，理由是内存，不是速度。",
];
