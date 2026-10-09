import type { Narration } from "../../registry/types";

/**
 * ch03 · mixin — 口播文本（Mixin 协作链，对应 script.md 第 16~20 拍）。
 * 长度 = 章节步数 = Mixin.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 转场
  "有了确定的顺序，才有下一场好戏：Mixin。",
  // step 1 — 概念
  "Mixin 就是可插拔的功能件：一个 Mixin 只管一件事，业务类组合几个，就获得几个能力。",
  // step 2 — 真机代码
  "真机：MyService(MixinLog, MixinValidate, Base)。",
  // step 3 — __init__ 执行序
  "造一个实例，__init__ 的执行顺序：MixinLog → MixinValidate → Base——正是 MRO 的下一个。",
  // step 4 — super 链
  "靠什么串起来？每个 __init__ 都调 super().__init__()，链条一环扣一环。",
];
