import type { Narration } from "../../registry/types";

/**
 * ch11 · closing — 口播文本（原 47/48 两页合并为一步：五行 API 一次讲完）。
 * 长度 = 章节步数 = Closing.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — API 速查表（五行逐个点名 + 警示）
  "常用入口就五个，收好。a sync def 用来定义协程。a wait 用来让出控制权。a sync i o.run 是程序主入口，一次就够。create_task 是真并发的入口。a sync i o.sleep 是会谦让的睡眠——换成 time.sleep，全店停摆。",
  // step 1 — 收尾
  "完整代码在仓库里。下一讲：任务编排——Task Group、超时、取消。下期见。",
];
