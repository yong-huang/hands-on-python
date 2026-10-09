import type { Narration } from "../../registry/types";

/**
 * ch03 · bulk — 口播文本（万级实例实测，对应 script.md 第 9~11 拍）。
 * 长度 = 章节步数 = Bulk.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 批量实测
  "真机跑批量：一万个实例。普通版 1328 KB，slots 版 468 KB，省 64.7%。",
  // step 1 — 版本角标
  "3.10 上能省到 68%——两版的实例字典大小不一样。",
  // step 2 — 口径坑
  "口径提醒：sys.getsizeof 只算本体，所以两个类都显示 48，不是 bug。真开销看批量对比。",
];
