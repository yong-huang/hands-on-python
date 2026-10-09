import type { Narration } from "../../registry/types";
export const narrations: Narration[] = [
  "不想手写全套比较方法？@total_ordering：只写 __eq__ 加 __lt__，其余自动生成。",
  "@dataclass 更省：__init__、__repr__、__eq__ 全自动。加 order=True 再送全套比较，加 frozen=True 保留 __hash__。",
  "容器协议也行：__len__ 管长度，__getitem__ 管取值，__iter__ 管迭代。",
  "RingBuffer 就是这么做的。",
];
