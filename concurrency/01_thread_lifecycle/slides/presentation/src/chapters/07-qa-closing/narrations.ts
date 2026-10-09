import type { Narration } from "../../registry/types";

/**
 * ch07 · qa-closing — 口播文本（对应 script.md 第 38~39 拍）。
 * 第 38 拍拆「对照演示」与「竞态命名」两条，共 3 步。
 * 长度 = 章节步数 = QaClosing.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 最后一问：append vs counter += 1
  "最后一问：两个线程同时往一个 list 里 append，会坏吗？不会——就是刚才说的原子操作。同时对 counter += 1 呢？会丢更新——它拆成读、加、写三步，中间可以被切换。",
  // step 1 — 竞态命名 + 下讲预告
  "这种更新被悄悄丢掉的现象，有个名字，叫竞态——下一讲实测它到底能丢多少。",
  // step 2 — 收尾
  "完整代码在仓库里，一跑就有体感。链接在评论区，下期见。",
];
