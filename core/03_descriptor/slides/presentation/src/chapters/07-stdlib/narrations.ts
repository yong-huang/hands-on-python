import type { Narration } from "../../registry/types";

/**
 * ch07 · stdlib — 口播文本（property 与标准库，对应 script.md 第 33~36 拍，拍 34 拆三步、拍 35+36 合并）。
 * 长度 = 章节步数 = Stdlib.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 论断
  "标准库里，你天天在用的 property，其实就是个数据描述符。",
  // step 1 — hasattr 验证
  "不信：hasattr 一查，__get__、__set__ 全在。",
  // step 2 — 语法糖
  "@property 只是语法糖，帮你把描述符挂到类属性上。",
  // step 3 — 同族
  "classmethod、staticmethod，同理。",
  // step 4 — 与装饰器对比
  "那它和装饰器什么关系？都是不改调用方代码改行为，但拦的层面不同。装饰器拦函数调用，描述符拦属性读写。一个管 f()，一个管 obj.attr。",
];
