import type { Narration } from "../../registry/types";

/**
 * ch03 · why — 口播文本（忘了还的后果 + with 是标准答案，对应 script.md 第 10~17 拍）。
 * 长度 = 章节步数 = Why.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 反问
  "有人会说：忘关就忘关呗，能出多大的事？",
  // step 1 — 句柄泄漏
  "文件句柄，漏一两个看不出来。服务跑一整天，句柄耗尽，新连接全被拒。",
  // step 2 — 锁挂死
  "换成锁试试。一个进程拿着锁不还，其他的全在等。这叫锁挂死。",
  // step 3 — 事务悬挂
  "数据库事务也一样。崩在半路，提交还是回滚，没人收尾。事务就这么悬挂着。",
  // step 4 — try/finally 能救
  "那把 close 包进 try/finally？能救。",
  // step 5 — 两个下场
  "但每个用资源的地方，都得写一遍。代码翻一倍，还总有人忘。",
  // step 6 — 标准答案
  "with，就是这件事的标准答案。把收拾残局的逻辑写一遍，交给 with。",
  // step 7 — 永远有人兜底
  "从此你只管用资源。无论成败，出场永远有人兜底。",
];
