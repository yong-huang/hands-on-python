import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（看不见的字典税，对应 script.md 第 1~4 拍；step 0 为静默标题页）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页（静默，不配音）
  "",
  // step 1 — 悬念
  "一个只有两个属性的小对象，你猜它占多少内存？",
  // step 1 — 双数字
  "我实测了：本体 48 字节，背后却挂着一张 296 字节的字典——字典比对象本身重了 6 倍。",
  // step 2 — 默认行为
  "这是 Python 的默认行为：每个实例附赠一张 __dict__ 哈希表。它随版本膨胀，3.13 实测 296 字节。",
  // step 3 — 上量场景
  "坐标点、配置项、ORM 模型，一造就是上万——字典吃的内存，比你的业务数据还多。",
];
