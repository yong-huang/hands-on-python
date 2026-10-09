import type { Narration } from "../../registry/types";

/**
 * ch06 · lazy — 口播文本（LazyField 惰性加载，对应 script.md 第 29~32 拍）。
 * 长度 = 章节步数 = Lazy.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 需求
  "第三个，惰性加载。需求：HeavyResource 很重，创建时什么都别连，真用到再说。",
  // step 1 — 实现
  "__init__ 把 factory 存起来，什么都不做。__get__ 里一看实例字典没有，才调 factory 建资源，写回字典。",
  // step 2 — 真机
  "真机输出：HeavyResource created，此时啥也没连。访问 database，才打印 Initializing database connection。第二次访问，同一个对象直接返回。",
  // step 3 — LoggedField
  "同款的 LoggedField，做读写审计。数据描述符，一个骨架，不展开了。",
];
