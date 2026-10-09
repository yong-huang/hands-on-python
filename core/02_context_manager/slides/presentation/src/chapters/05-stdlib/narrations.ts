import type { Narration } from "../../registry/types";

/**
 * ch05 · stdlib — 口播文本（contextlib 现成货，对应 script.md 第 23~26 拍）。
 * 长度 = 章节步数 = Stdlib.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 货架过渡
  "标准库里，还全是现成货。",
  // step 1 — suppress
  "with suppress，指定某个异常，优雅地忽略。一行顶四行 try/except。",
  // step 2 — redirect_stdout
  "with redirect_stdout。print 出来的东西，改道，去别处。",
  // step 3 — 地图收尾
  "一行 with，各管一件事。",
];
