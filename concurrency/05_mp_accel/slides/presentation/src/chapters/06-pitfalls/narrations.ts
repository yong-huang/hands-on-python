import type { Narration } from "../../registry/types";

/** ch06 · pitfalls — 口播文本（对应 script.md 第 43~48 拍）。imap 拆写为 i m a p。 */
export const narrations: Narration[] = [
  // step 0 — 坑 1 现象
  "五个真实踩过的坑。一，lambda——匿名函数——丢给进程池，pickle 当场报错。",
  // step 1 — 坑 1 解法
  "spawn 按名字打包函数，它没名字。解法：worker 用文件最外层的有名字函数。",
  // step 2 — 坑 2
  "二，漏写 main 保护——入口代码一律包起来，Jupyter 里也要写。",
  // step 3 — 坑 3
  "三，任务太小就上多进程——比串行还慢。先算启动成本这笔账。",
  // step 4 — 坑 4
  "四，子进程里大量 print——输出撕成一团。结果用返回值带回来。",
  // step 5 — 坑 5
  "五，以为 map 会一个一个返回——它等全部干完才整批返回。需要流式返回，换 i m a p。",
];
