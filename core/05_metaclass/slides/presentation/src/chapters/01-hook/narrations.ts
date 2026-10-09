import type { Narration } from "../../registry/types";

/**
 * ch01 · hook — 口播文本（标题页 + 谁在创建类，对应 script.md 第 1~4 拍）。
 * 长度 = 章节步数 = Hook.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 片头标题页
  "今天讲 Python 元类。type 是什么、单例怎么拦、ORM 字段怎么自动收集，一次拆完。",
  // step 1 — class 定义即创建
  "普通函数，调用时才执行。class 语句反过来——定义那一刻，类对象就已经创建好了。",
  // step 2 — 悬念
  "那这个「创建类」的动作，是谁在干活？",
  // step 3 — type 点名
  "答案是 type。想让一批类自动获得能力，就把 type 换成你自己的。",
];
