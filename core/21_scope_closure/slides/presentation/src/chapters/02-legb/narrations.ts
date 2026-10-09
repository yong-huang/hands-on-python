import type { Narration } from "../../registry/types";

/**
 * ch02 · legb — 口播文本（唯一真相源，逐字使用）。
 * 长度 = 章节步数 = Legb.tsx 里 step 的取值个数（0..7）。
 */
export const narrations: Narration[] = [
  // step 0 — hero 问题句：作用域管什么
  "看穿它之前，先补块地基：作用域。它管的事很简单：一个名字，在代码的某处，指向谁。",
  // step 1 — LEGB 四格链骨架登场
  "Python 查名字，走一条固定的链，叫 LEGB。",
  // step 2 — L 格点亮
  "L，Local。当前函数内部。",
  // step 3 — E 格点亮
  "E，Enclosing。外层函数。",
  // step 4 — G 格点亮
  "G，Global。模块级。",
  // step 5 — B 格点亮 + 查找规则
  "B，Built-in。内建的，print、len 这些不用导入。从里往外找，找到就停。",
  // step 6 — legb_demo 遮蔽代码卡
  "看个例子。inner 自己赋了值，读到的就是自己那一层。外层的 enclosing？被遮住了，看不见。这就叫就近遮蔽。",
  // step 7 — 规矩卡：赋值即声明
  "规矩只有一条：赋值即声明。函数里写 value 等于什么，是新建一个局部名。不是改外层，是新建。",
];
