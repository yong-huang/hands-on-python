import type { Narration } from "../../registry/types";
export const narrations: Narration[] = [
  "Duck Typing：走起来像鸭子就是鸭子。只关注对象是否有某个方法，不关注类型。",
  "quack(duck) 只调 duck.speak()——只要有 speak() 方法就行。quack(Duck()) 正常，quack(Person()) 炸 AttributeError。",
  "灵活，但缺方法只会在调用时炸出 AttributeError，接口约定全靠口头。",
  "这就是 Duck Typing 的边界：失败点在调用时。",
];
