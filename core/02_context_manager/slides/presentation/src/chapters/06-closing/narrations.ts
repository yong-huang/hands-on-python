import type { Narration } from "../../registry/types";

/**
 * ch06 · closing — 口播文本（为什么要搞懂它 + CTA，对应 script.md 第 27~29 拍）。
 * 长度 = 章节步数 = Closing.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 你早就在用
  "为什么值得搞懂它？你早就在用了。open 文件，头上是 with。threading 的锁，头上是 with。你天天在用的数据库 session，也是。",
  // step 1 — 三个疑难杂症看穿
  "把 with 背后的三步想明白。句柄泄漏、锁挂死、事务悬挂，一眼看穿。",
  // step 2 — CTA
  "完整代码在 hands-on-python 仓库里。零依赖，python3 一跑就有体感。链接在评论区，下期见。",
];
