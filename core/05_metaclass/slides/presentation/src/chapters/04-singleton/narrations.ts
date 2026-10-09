import type { Narration } from "../../registry/types";

/**
 * ch04 · singleton — 口播文本（单例拦截，对应 script.md 第 14~19 拍）。
 * 长度 = 章节步数 = Singleton.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 需求
  "第二件：单例。需求：一个类，全局只有一个实例。",
  // step 1 — 代码
  "代码：SingletonMeta，一个类级字典 _instances，加一个 __call__。",
  // step 2 — 为什么拦 __call__
  "为什么拦 __call__？ClassName() 这种写法，触发的就是元类的 __call__——实例创建的必经之路。",
  // step 3 — 首次 vs 缓存
  "首次调用，真正创建实例存进字典。之后每次调用，直接返回缓存。",
  // step 4 — 真机
  "真机：db1 is db2，True。",
  // step 5 — 预期陷阱
  "小陷阱：第二次 Database(\"remotehost\") 的参数被忽略了。首次创建胜出，这是单例的预期行为。",
];
