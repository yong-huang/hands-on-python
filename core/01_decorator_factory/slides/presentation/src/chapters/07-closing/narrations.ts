import type { Narration } from "../../registry/types";

/**
 * ch07 · closing — 口播文本（对应 script.md 第 30~32 拍）。
 * 长度 = 章节步数 = Closing.tsx 里 step 的取值个数。
 * 「@」按中文读音写作「艾特」，便于 TTS 合成。
 */
export const narrations: Narration[] = [
  // step 0 — 框架里的 @
  "为什么值得花时间搞懂它？框架的路由，头上是艾特。pydantic 的校验，头上是艾特。你天天在用的 functools，也是。",
  // step 1 — 看穿魔法
  "框架的注册、校验，玩的就是这一套。把艾特后面发生的事想明白。那些魔法，你一眼就能看穿。",
  // step 2 — CTA
  "这套全家桶的完整代码，在 hands on python 仓库里。零依赖，python3 一跑就有体感。链接在评论区，下期见。",
];
