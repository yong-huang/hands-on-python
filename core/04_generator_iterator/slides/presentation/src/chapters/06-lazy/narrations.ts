import type { Narration } from "../../registry/types";

/**
 * ch06 · lazy — 口播文本（惰性管道，对应 script.md 第 25~28 拍）。
 * 长度 = 章节步数 = Lazy.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 无限流
  "真正的大杀器：惰性管道。integers() 是个无限流——不用怕，它不会算完。",
  // step 1 — 管道串联
  "管道串起来：integers 生成，map 平方，filter 留偶数，take 取十个。",
  // step 2 — 真机偶数平方
  "真机：前十个偶数的平方，0 到 324。每个值，都是要一个才算一个。",
  // step 3 — 日志管道
  "日志管道同理：log_lines → parse → filter_errors → take(5)。每个环节，一次只处理一个元素。",
];
