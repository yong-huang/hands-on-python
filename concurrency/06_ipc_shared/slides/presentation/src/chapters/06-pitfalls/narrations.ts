import type { Narration } from "../../registry/types";

/**
 * ch06 · pitfalls — 口播文本（对应 script.md 第 35~39 拍）。
 * 长度 = 章节步数 = Pitfalls.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 坑 1
  "五个真实踩过的坑。一，忘了删共享内存块——它在系统里一直泄漏，重启才清得掉。断开和删除是两个动作，删除要显式做。",
  // step 1 — 坑 2
  "二，用完的一端不关——对端以为还在写，永远等不到结束信号。",
  // step 2 — 坑 3
  "三，把 Manager 代理当本地对象遍历——每迭代一项，都是一个来回，大字典慢成灾难。先一次性拷回来，再遍历。",
  // step 3 — 坑 4
  "四，在共享内存上留引用——删除块之后变成悬空内存，读出来全是错的。要留存，先拷成字节串。",
  // step 4 — 坑 5 + 收束
  "五，以为 Queue 传过去的是原对象——改「传过去的」，原件纹丝不动。这些全是副本。要真正共享，用 SharedMemory 或 Manager。",
];
