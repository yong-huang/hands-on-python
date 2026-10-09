import type { Narration } from "../../registry/types";

/**
 * ch04 · price — 口播文本（三个代价与一个误会，对应 script.md 第 12~15 拍）。
 * 长度 = 章节步数 = Price.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 代价一
  "第一个代价：动态属性没了，p.z = 3 直接 AttributeError。",
  // step 1 — 代价二
  "第二个代价：weakref 默认报 TypeError，要用得显式声明 __weakref__。",
  // step 2 — 代价三
  "第三个最阴：子类忘了声明 __slots__，会悄悄长回 __dict__，整条链省的内存归零。",
  // step 3 — 误会
  "顺带纠正：slots 不存默认值，z=0 来自 __init__ 的形参，跟 slots 无关。",
];
