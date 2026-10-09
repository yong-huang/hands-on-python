import type { Narration } from "../../registry/types";

export const narrations: Narration[] = [
  "自定义类的对象一做 p1 + p2，直接 TypeError。",
  "一打印，<Point object at 0x…>——一串内存地址，啥也看不出来。",
  "放进 set 去重？也全靠对象 id，值一样也不去重。",
  "这些都是因为类没有实现魔术方法——dunder methods。",
];
