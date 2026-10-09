import type { Narration } from "../../registry/types";
export const narrations: Narration[] = [
  "先看最基础的两个：__repr__ 和 __str__。一个给调试，一个给显示。",
  "repr 要 unambiguous——能还原对象。str 要 human-readable——给人看。",
  "真机：repr(p) 是 Point(3, 4)，str(p) 是 (3, 4)。",
];
