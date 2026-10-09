import type { Narration } from "../../registry/types";

/**
 * ch03 · chain — 口播文本（两类描述符与查找链，对应 script.md 第 10~15 拍）。
 * 长度 = 章节步数 = Chain.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 分类标准
  "描述符分两类，标准就一条：有没有定义 __set__ 或 __delete__。",
  // step 1 — 两类命名
  "定义了任一的，叫数据描述符。只有 __get__ 的，叫非数据描述符。听着像废话，差别巨大。",
  // step 2 — 差别在查找链
  "差别就在 obj.attr 的查找链上。Python 每次读属性，都按固定顺序找。",
  // step 3 — 四步顺序
  "顺序是：数据描述符最优先。然后实例的 __dict__。然后非数据描述符。都没有，才抛 AttributeError。",
  // step 4 — 口诀
  "口诀给你：数据描述符，大于实例字典，大于非数据描述符。",
  // step 5 — 承上启下
  "后面四个实战模式，全是在这条链上做文章。",
];
