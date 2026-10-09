import type { Narration } from "../../registry/types";

/**
 * ch04 · live-demo — 口播文本（对应 script.md 第 21~27 拍）。
 * 长度 = 章节步数 = LiveDemo.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 跑实验
  "口说无凭，直接跑实验。一行命令，四个小节，跑完自动帮你核对结果。",
  // step 1 — t.run()：没有新线程
  "先看其中一节：start() 对比 run()。先直接调 t.run()：函数体执行了，但干活的还是主线程 MainThread——没有新线程。",
  // step 2 — t.start()：新线程 born-by-start
  "再调 t.start()：同一个函数体，跑进了新线程 born-by-start 里——那是演示里给新线程起的名字。一字之差，天壤之别。",
  // step 3 — 二次 start：RuntimeError
  "对已启动的线程再 start() 一次？直接 RuntimeError：线程只能启动一次。想重跑，换新对象。",
  // step 4 — 交错观察：3 批 3 种排列
  "接着，交错观察：4 个线程，各走 3 步，连跑 3 批。3 批出现 3 种不同排列——线程之间，顺序不可预测。",
  // step 5 — 线程内永远有序
  "但每个线程自己的 t0、t1、t2，永远有序。无序只发生在线程之间。你跑出来的序列一定和我不一样——这就是不确定性本身。",
  // step 6 — daemon 截断
  "最后看 daemon：它要打 20 条日志，主线程睡 0.3 秒就退。结果只来得及打 5 条，程序直接走人。更气人的是，退出码还是 0——系统眼里，它正常结束了。",
];
