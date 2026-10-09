import type { Narration } from "../../registry/types";

/**
 * ch04 · family — 口播文本（两条实现路，对应 script.md 第 18~22 拍）。
 * 长度 = 章节步数 = Family.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 过渡设问
  "这套机制怎么写？Python 给了两条路。",
  // step 1 — 类式
  "第一条，类式。定义 __enter__ 和 __exit__ 两个方法。进场拿资源，出场做清理。",
  // step 2 — Transaction 双轨
  "最典型的应用，数据库事务。正常跑完，自动 commit。中途抛异常，自动 rollback。成败两条路，它都想好了。",
  // step 3 — 函数式
  "第二条，函数式。一个 @contextmanager，加一个 yield。yield 前面是进场，yield 后面是出场。几十行的类，三行就写完。",
  // step 4 — 选型地图
  "两条路，功能等价。复杂状态用类式，简单场景用函数式。不用背，知道有这两条路就行。",
];
