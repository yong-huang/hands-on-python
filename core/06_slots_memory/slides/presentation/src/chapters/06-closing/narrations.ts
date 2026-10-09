import type { Narration } from "../../registry/types";

/**
 * ch06 · closing — 口播文本（何时用与系列回收，对应 script.md 第 19~22 拍）。
 * 长度 = 章节步数 = Closing.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 三场景
  "什么时候用？上万轻量对象；属性固定，不乱加；内存敏感——缓存、游戏实体。",
  // step 1 — 彩蛋
  "彩蛋：member_descriptor 就是描述符——描述符那期讲的协议，Python 内部自用。",
  // step 2 — 系列衔接
  "上期元类管类的诞生，这期 slots 管实例的开销。",
  // step 3 — CTA
  "完整代码在 hands-on-python 仓库，python3 一跑就有体感。链接在评论区，下期见。",
];
