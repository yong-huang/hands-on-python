import type { Narration } from "../../registry/types";

/**
 * ch05 · closing — 口播文本（金句与系列回收，对应 script.md 第 25~27 拍）。
 * 长度 = 章节步数 = Closing.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 金句
  "一句话记住：super() 是 MRO 中我之后的下一个，不是父类。",
  // step 1 — 系列回收
  "描述符管属性存取，上期 slots 管实例开销，这期 MRO 管方法查找——Python 把每个环节都安排了协议。",
  // step 2 — CTA
  "完整代码在 hands-on-python 仓库，python3 一跑就有体感。链接在评论区，下期见。",
];
