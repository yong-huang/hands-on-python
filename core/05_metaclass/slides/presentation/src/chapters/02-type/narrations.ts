import type { Narration } from "../../registry/types";

/**
 * ch02 · type — 口播文本（类的类，对应 script.md 第 5~9 拍）。
 * 长度 = 章节步数 = Type.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 心智模型
  "心智模型一句话：class Foo 不是声明，是表达式。Python 在背后调 type(\"Foo\", bases, namespace)，类就诞生了。",
  // step 1 — 语法糖展开
  "展开给你看。class Dog(Animal): species = \"Canine\"，等价于 Dog = type(\"Dog\", (Animal,), {\"species\": \"Canine\"})。",
  // step 2 — 真机
  "真机：Dog.species 是 Canine。type(Dog) 是 type；type(type) 还是 type。",
  // step 3 — 层级链
  "往下挖一层：type(42) 是 int，type(int) 是 type。类的链条，最后都落在 type 上。",
  // step 4 — 收束
  "再狠一点：isinstance(int, type) 是 True。type 是所有类的类，也是它自己的实例。",
];
