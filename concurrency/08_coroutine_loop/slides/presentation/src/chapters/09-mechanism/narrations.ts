import type { Narration } from "../../registry/types";

/**
 * ch09 · mechanism — 口播文本（对应 script.md 第 29~30 拍，第 30 拍拆为 2 步）。
 * 长度 = 章节步数 = Mechanism.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — a sync i o.run 三步
  "补两个机制细节。第一，a sync i o.run 到底做了什么。三步：新建事件循环，跑到结束，最后清理。实验里跟手动一步步建循环对照，结果完全一致——它只是替你把这几步打包好了，没有别的名堂。",
  // step 1 — 两张表
  "第二，循环内部靠两样东西排班：一支「立刻能跑」的队伍，叫就绪队列——就是前面说的待命队伍；一张「睡着的人」的闹钟表，叫定时器堆，到点就搬回队伍。",
  // step 2 — 铁律
  "还有一条铁律：一个线程，同时只能有一个运行中的事件循环。在协程里再调 a sync i o.run，直接报错。",
];
