import type { Narration } from "../../registry/types";

/**
 * ch08 · closing — 口播文本（按需生成 + CTA，对应 script.md 第 32~34 拍）。
 * 长度 = 章节步数 = Closing.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 机制回收
  "迭代器是遍历的协议，生成器是它最省的写法。这套暂停恢复，后来长成了协程——async/await 的前身。",
  // step 1 — 金句
  "不提前算好，按需生成。理解了这一点，零内存管道、协程，你都能看懂。",
  // step 2 — CTA
  "完整代码在 hands-on-python 仓库。零依赖，python3 一跑就有体感。链接在评论区，下期见。",
];
