import type { Narration } from "../../registry/types";

/**
 * ch04 · send — 口播文本（双向通信，对应 script.md 第 14~19 拍）。
 * 长度 = 章节步数 = Send.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 概念反转
  "yield 只出不进？不是。它能双向通信。",
  // step 1 — accumulator 代码
  "看这个累加器：received = yield total。收到一个数，加进 total。",
  // step 2 — 核心一行
  "核心就是这一行：等号右边向外产出 total，函数暂停。send 一个值过来，赋给 received，恢复执行。",
  // step 3 — priming 流程
  "规矩也有一条：先 next(gen) 启动，跑到 yield 暂停住。这叫 priming。",
  // step 4 — priming 坑
  "跳过启动，直接 send(10)？直接 TypeError。",
  // step 5 — 真机
  "真机：send(10) -> total=10。send(20) -> total=30。send(30) -> total=60。",
];
