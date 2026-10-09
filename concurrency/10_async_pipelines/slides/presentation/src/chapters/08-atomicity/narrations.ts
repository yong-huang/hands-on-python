import type { Narration } from "../../registry/types";

/**
 * ch08 · atomicity — 口播文本（对应 script.md 第 38~40 拍）。
 * 台词层拆写易错词：a wait / a sync i o。
 */
export const narrations: Narration[] = [
  // step 0 — 核心代码：读改写三步，线程版必须上锁
  "最核心的一处代码：多个消费者并发执行同一行——从 results 字典取出计数、加一、写回去。线程版这里必须上锁：读、改、写三步，间隙会被切换打断。",
  // step 1 — 异步版敢裸写：同步段天然原子
  "异步版敢裸写：只有 a wait 点才会切换，这几行之间没有 a wait，天然原子。同步段天然原子，这是 a sync i o 的重要红利。",
  // step 2 — 边界：插进 await 即破裂
  "但边界同样清晰：中间一旦插进一个 a wait，原子性立刻破裂。a wait 之前安全，之后不一定——这句话你要时刻记住。",
];
