import type { Narration } from "../../registry/types";

/** ch07 · qa-closing — 口播文本（对应 script.md 第 49~54 拍）。imap 拆写为 i m a p。 */
export const narrations: Narration[] = [
  // step 0 — Q1 fork
  "最后两个问题。fork 和 spawn 差在哪？fork 复制父进程内存——快，但只在 Mac、Linux 上有。",
  // step 1 — Q1 spawn
  "spawn 重新启动一个解释器——慢一点，但跨平台，macOS 和 Windows 默认支持。",
  // step 2 — Q2 map/imap
  "map 等全批，整批回；i m a p 流式，一个一个出；无序版，谁先完成谁先出——不用陪着最慢的等。",
  // step 3 — 选型 1/2
  "全家桶怎么选？等网络，默认线程；计算重，才上进程池。",
  // step 4 — 选型 2/2
  "统一的池写法，有 futures 这层接口；海量连接，是协程——后面专门讲。",
  // step 5 — 收尾
  "完整代码在仓库第五讲目录。下一讲拆进程间通信——下期见。",
];
