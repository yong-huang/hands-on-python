import type { Narration } from "../../registry/types";

/**
 * ch02 · what-is — 口播文本（with 是什么，对应 script.md 第 5~9 拍）。
 * 长度 = 章节步数 = WhatIs.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 资源的一生三步
  "拆开看，with 把资源的一生，切成三步。进场，拿资源。中间，跑你的代码。出场，交还资源。",
  // step 1 — 出场保证 + 崩九兜九
  "关键就一条：无论中间是成是败，出场都会执行。中间崩九次，它就兜九次。",
  // step 2 — as 绑定
  "with open 后面那个 as f。接的，就是进场交给你的东西。",
  // step 3 — 语法糖等价式
  "你也可以把它当 try/finally 的语法糖。但谁获取、谁释放，一眼就能看清。",
  // step 4 — 澄清：不是 try/except
  "还要澄清一件事。with 不是 try/except。该抛的异常，照样抛。它只保证一件事：走之前，把资源还了。",
];
