import type { Narration } from "../../registry/types";

/**
 * ch06 · demo-lazy — 口播文本（对应 script.md 第 20~23 拍）。
 * 长度 = 章节步数 = DemoLazy.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 跑实验
  "口说无凭，跑实验。一行命令，四个小节，半秒跑完，全部断言自动核对。",
  // step 1 — 调用得到对象
  "先看调用协程函数，到底发生了什么。调用 sample，拿回来的不是结果，是一个协程对象。此刻函数里的执行痕迹：空。一行都没跑。",
  // step 2 — run 驱动 + 打包
  "用 a sync i o.run 驱动它，才有返回值，执行痕迹也从「空」变成了「跑过了」。原来，调用协程函数只是打包：要干的活、用到的变量、干到了哪一行，装进一个对象。要等事件循环来驱动，才真正执行。",
  // step 3 — never a waited 第一大坑
  "那忘了 a wait 呢？这个没人管的协程对象，程序清理它的时候会报警：never a waited——从没被执行过。这是 a sync i o 第一大坑：启动那行 a sync i o.run 忘了写，或者协程里面又调的另一个协程忘了 a wait。程序什么都没干，就成功退出了。",
];
