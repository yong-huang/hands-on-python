import type { Narration } from "../../registry/types";
export const narrations: Narration[] = [
  "再看比较。__eq__ 管等于，__hash__ 管哈希。两个必须配套——a == b 则 hash(a) == hash(b)。",
  "只定义 __eq__ 不定义 __hash__？Python 自动把 __hash__ 设为 None，对象变不可哈希，dict 直接 TypeError。",
  "真机：p1 == p2 是 True，hash(p1) == hash(p2) 也是 True。",
  "做 dict key 或 set 去重，全靠这两个方法配合。",
];
