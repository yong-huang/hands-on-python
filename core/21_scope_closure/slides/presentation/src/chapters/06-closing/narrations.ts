import type { Narration } from "../../registry/types";

/**
 * ch06 · closing — 口播文本（对应 script.md 第 31~33 拍）。
 * 长度 = 章节步数 = Closing.tsx 里 step 的取值个数（3 → step 0..2）。
 */
export const narrations: Narration[] = [
  // step 0 — 回望装饰器：wrapper 即闭包，times / store 是自由变量
  "这套机制，你早就在用。装饰器的 wrapper，就是闭包。retry 的次数、缓存的 store，全是自由变量，靠 cell 活过装饰那一刻。",
  // step 1 — 四件套收拢：LEGB · cell · nonlocal · 迟绑定
  "这一路：LEGB 管名字往哪找，cell 管变量活多久。nonlocal 是跨层修改的通行证。而迟绑定是个提醒：闭包存的是变量，不是值。",
  // step 2 — CTA：hands-on-python 仓库 + 运行命令 + 下期见
  "完整代码在 hands-on-python 仓库，零依赖，python3 一跑就有体感。链接在评论区，下期见。",
];
