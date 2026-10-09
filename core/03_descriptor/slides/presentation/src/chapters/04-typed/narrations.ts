import type { Narration } from "../../registry/types";

/**
 * ch04 · typed — 口播文本（TypedField 验证字段，对应 script.md 第 16~21 拍）。
 * 长度 = 章节步数 = Typed.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 需求
  "第一个，验证字段。需求：age 必须是 int，还得在 0 到 150 之间。",
  // step 1 — __set_name__
  "__set_name__ 先把属性名记下来，报错的时候用。",
  // step 2 — __set__ 校验
  "__set__ 里做校验。类型不对，抛 TypeError。范围不对，抛 ValueError。",
  // step 3 — 真机
  "真机跑一遍。age 传字符串：TypeError: expected int, got str。age 传 200：ValueError: must <= 150。",
  // step 4 — 塞 dict 拦得住
  "最硬的一点：有人绕过它，直接往实例字典塞同名 key。没用。读的时候，还是走 __get__ 的校验。",
  // step 5 — 降级坑
  "数据描述符，压实例字典一头。但你漏写 __set__，它就降级成非数据描述符。坏值直接进字典，验证整个被绕过。",
];
