import type { Narration } from "../../registry/types";

/**
 * ch05 · late-binding — 口播文本（唯一真相源，逐字使用）。
 * 长度 = 章节步数 = LateBinding.tsx 里 step 的取值个数（8 = step 0..7）。
 */
export const narrations: Narration[] = [
  // step 0 — 预告卡：一个经典陷阱
  "接下来是重头戏，一个经典陷阱。",
  // step 1 — 陷阱代码卡：预期 0、1、2
  "列表推导里造三个函数，lambda 冒号 i，i 从 0 到 2。依次调用，你预期 0、1、2。",
  // step 2 — 结果揭晓：2、2、2
  "结果是 2、2、2。",
  // step 3 — 机制拆解：共享同一个 i，调用时才读
  "为什么？闭包记住的是变量，不是值。三个 lambda 共享同一个 i。函数体到调用时才去读 i。那时循环早跑完了，i 停在 2。",
  // step 4 — 命名卡：迟绑定
  "这叫迟绑定。",
  // step 5 — 修复卡：默认参数快照 + functools.partial
  "修法就一处：给 lambda 加个默认参数，i 等于 i。默认参数在定义时求值，等于当场拍快照。或者用 functools 的 partial，把实参钉死。",
  // step 6 — 复跑结果：0、1、2，齐了
  "再调，0、1、2，齐了。",
  // step 7 — 迁移提示：回调列表 / 定时器
  "以后碰到回调列表、定时器集体读到同一个值，先想到它。",
];
