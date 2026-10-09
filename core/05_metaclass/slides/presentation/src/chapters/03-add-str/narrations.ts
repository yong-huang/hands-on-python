import type { Narration } from "../../registry/types";

/**
 * ch03 · add-str — 口播文本（自动加方法，对应 script.md 第 10~13 拍）。
 * 长度 = 章节步数 = AddStr.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 需求
  "元类能干什么？第一件：给一批类自动加方法。比如自动 __str__。",
  // step 1 — 注入成功
  "真机：Person 打印出完整字段，自动注入成功。",
  // step 2 — 跳过已有
  "但注意这条输出：custom str，metaclass skipped。类自己定义了 __str__，元类就跳过。",
  // step 3 — 原则
  "批量注入必须尊重已有定义——不然会悄悄覆盖用户的实现。",
];
