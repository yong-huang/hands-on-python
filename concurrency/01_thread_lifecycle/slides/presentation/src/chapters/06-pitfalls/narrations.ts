import type { Narration } from "../../registry/types";

/**
 * ch06 · pitfalls — 口播文本（对应 script.md 第 33~37 拍）。
 * 第 35 拍（坑一）拆现象/原因两条，共 6 步。
 * 长度 = 章节步数 = Pitfalls.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 证据采集：append 原子
  "实验怎么记录谁先谁后？不靠 print，靠往列表里 append。append 这一下一口气做完、中间插不进手，专业说法叫原子操作——记下的顺序可信，也不丢。",
  // step 1 — print 行缓冲
  "print 为什么不行？它攒够一整行才真正吐出来，这叫行缓冲。你看到的打印顺序，可能是假的。",
  // step 2 — 坑一（现象）
  "四个真实踩过的坑。第一，手动 run() 之后，再对同一个对象 start()——新线程一启动就报错 AttributeError。",
  // step 3 — 坑一（原因）
  "因为手动 run 会把对象里要干的活清掉，再 start 就找不到活了。",
  // step 4 — 坑二 + 坑三
  "第二，用 print 顺序当证据——你看到的先后、真实的先后，两边都不可信。收集数据用 queue.Queue——一个专门的排队容器，天生防插队。图省事，append 也行。第三，在 daemon 里写文件、存数据——干到一半被掐死，半截数据比没数据更糟。",
  // step 5 — 坑四
  "第四，daemon 设置晚了——start() 之后再设，直接 RuntimeError。线程已经离开 NEW，属性就冻结了。",
];
