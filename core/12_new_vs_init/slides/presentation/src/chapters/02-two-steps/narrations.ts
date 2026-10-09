import type { Narration } from "../../registry/types";

/**
 * ch02 · two-steps — 口播文本（对应 script.md 第 3~7 拍）。
 * 长度 = 章节步数 = TwoSteps.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 两步流水线：__new__ 造 → __init__ 填
  "实际上，背后是两步。第一步，__new__，分配内存，把实例造出来。第二步，才是 __init__，往实例里填属性。",
  // step 1 — 金句：管生管养
  "一句话记住：__new__ 管生，__init__ 管养。",
  // step 2 — Tracked 实验：两行日志
  "看个实验。写个 Tracked 类，两个方法各打一行日志。实例化一次，日志出来两行。",
  // step 3 — 顺序结论 + 诚实预期
  "先 __new__，后 __init__，顺序雷打不动。地址每次跑都不一样，别较劲，看顺序就行。",
  // step 4 — 分工卡：cls vs self / 返回实例 vs None
  "分工也不一样。__new__ 的第一个参数是类，它负责把实例还回去。__init__ 的第一个参数是实例 self。返回 None，写了也会被忽略。",
];
