import type { Narration } from "../../registry/types";

/**
 * ch02 · slots — 口播文本（一行声明的机制，对应 script.md 第 5~8 拍）。
 * 长度 = 章节步数 = Slots.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 解法一行
  "解法只要一行：类里声明 __slots__ = (\"x\", \"y\")。",
  // step 1 — 机制图
  "Python 给 x 和 y 各建一个 member_descriptor，p.x = 1 直接写进固定槽位，不查字典。",
  // step 2 — 真机
  "真机：has __dict__ 是 False——字典，没了。",
  // step 3 — 本体解剖
  "注意，本体还是 48 字节没变，省的是那张哈希表：344 对 48。",
];
