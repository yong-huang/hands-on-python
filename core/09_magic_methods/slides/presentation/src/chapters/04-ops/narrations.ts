import type { Narration } from "../../registry/types";
export const narrations: Narration[] = [
  "运算符重载也不难。__add__ 加法，__mul__ 乘法，__abs__ 绝对值，__bool__ 真假判断。",
  "不认识右操作数？返回 NotImplemented 哨兵，不抛异常，把选择权交回解释器。",
  "解释器改试右操作数的反射方法，也没有，才抛 TypeError——这是完整的回退链。",
  "真机：Point(3,4) + Point(1,2) = (4,6)，abs(Point(3,4)) = 5.0。",
];
