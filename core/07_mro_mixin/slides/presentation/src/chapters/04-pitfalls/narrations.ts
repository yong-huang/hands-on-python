import type { Narration } from "../../registry/types";

/**
 * ch04 · pitfalls — 口播文本（断链与四原则，对应 script.md 第 21~24 拍）。
 * 长度 = 章节步数 = Pitfalls.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 断链
  "前提是每一环都协作。哪个 Mixin 忘了调 super，链就静默断在那，后面的类全不初始化——多继承最常见的静默 bug。",
  // step 1 — 四原则
  "Mixin 怎么写才对？四条：只提供方法，不维护状态；放在继承列表左侧；名字带 Mixin 后缀；不独立使用。",
  // step 2 — 放左侧原理
  "为什么放左侧？局部优先——Mixin 的方法会先于业务类同名方法被找到；业务类的初始化，仍由 super 链在最后完成。",
  // step 3 — 绕链坑
  "还有个手痒写法：ClassName.__init__(self) 直接指定类。整条 MRO 链被你绕断。Mixin 里永远用 super。",
];
