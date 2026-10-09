import type { Narration } from "../../registry/types";

/**
 * ch05 · cached — 口播文本（CachedProperty 缓存属性，对应 script.md 第 22~28 拍）。
 * 长度 = 章节步数 = Cached.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 需求
  "第二个，缓存属性。需求：stats 这个统计结果，算一次就够，后面全走缓存。",
  // step 1 — 只定义 __get__
  "实现：只定义 __get__。就这一条，它自动成为非数据描述符。",
  // step 2 — factory 首次计算
  "首次访问，调 factory 算出结果。",
  // step 3 — 核心一行
  "核心的一行来了：obj.__dict__[self.name] = value。把结果写回实例字典。",
  // step 4 — 为什么写回
  "为什么要写回去？非数据描述符的优先级，低于实例字典。下次访问，字典直接命中，__get__ 根本不会再被调用。",
  // step 5 — 铁证
  "真机验证：访问两次，Compute count: 1。缓存生效的铁证。",
  // step 6 — 软肋
  "它的软肋也在这条链上。谁往字典里塞一个 stats，缓存就被顶掉了。输出里那个 hacked True，是设计的代价，不是 bug。",
];
