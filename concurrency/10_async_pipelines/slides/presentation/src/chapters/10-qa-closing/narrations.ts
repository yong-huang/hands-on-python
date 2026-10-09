import type { Narration } from "../../registry/types";

/**
 * ch10 · qa-closing — 口播文本（对应 script.md 第 45~47 拍）。
 * 台词层拆写易错词：a sync i o / a wait。
 */
export const narrations: Narration[] = [
  // step 0 — Q1：两个 Queue 的区别
  "最后两个迁移问题。a sync i o.Queue 和 queue.Queue 什么区别？API 几乎一致，等待机制完全不同：一个 a wait 让出，一个阻塞线程。跨线程传数据，还得用线程队列，或者走专门的桥接。",
  // step 1 — Q2：毒丸关闭在异步版
  "毒丸关闭在异步版有什么不同？协议一模一样：None 哨兵、task_done、join。只是收工时用 gather 一次性等齐所有消费者——线程版经验，无缝搬过来。",
  // step 2 — 收尾
  "完整代码在仓库里。链接在评论区，下期见。",
];
