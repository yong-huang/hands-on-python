import type { Narration } from "../../registry/types";

/**
 * ch06 · init-subclass — 口播文本（轻量替代，对应 script.md 第 26~29 拍）。
 * 长度 = 章节步数 = InitSubclass.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 转折
  "不过，不是所有需求都配动用元类。",
  // step 1 — 轻量版
  "只是注册一下子类？Python 3.6+ 有轻量版：__init_subclass__。",
  // step 2 — 真机
  "真机：Event 基类下面，click、key 两个子类自动注册，handler 表自动建好。",
  // step 3 — 原则
  "原则一句话：能用 __init_subclass__，就不用元类。",
];
