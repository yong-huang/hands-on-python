import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（标题页 + 两个麻烦一个 yield，对应 script.md 第 1~4 拍）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页
  "今天讲 Python 生成器。暂停恢复、双向通信、惰性管道，一层层拆开。",
  // step 1 — 千万行日志爆内存
  "处理一份千万行的日志。第一反应：先全读进来，存个列表？内存当场爆掉。",
  // step 2 — 手写遍历的负担
  "再来个需求：自己写一个能被 for 遍历的东西。__iter__、__next__、状态变量，二十行起步。",
  // step 3 — yield 点名
  "这两个麻烦，Python 用一个小小的 yield 一起解决。它叫生成器。",
];
