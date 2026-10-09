import type { Narration } from "../../registry/types";

/**
 * ch08 · qa-closing — 口播文本（对应 script.md 第 30~32 拍）。
 * 长度 = 章节步数 = QaClosing.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — Q1：gather 侧
  "两个常问的问题。第一问：gather 的容错模式和 TaskGroup 都能容错，怎么选？gather：哪个任务失败，就把那个错误本身，当作一份结果收进列表；其余任务一个不停，照常跑完。批量独立查询用它——100 个页面挂了 3 个，还能拿回 97 个。",
  // step 1 — Q1：TaskGroup 侧
  "TaskGroup：一个失败，全员取消——必须全成、否则全撤的活儿，比如下单。",
  // step 2 — Q2：异常组处理两条路
  "第二问：异常组怎么处理？两条路。用 3.11 的新写法，按错误类型分组接住；或者用笨办法——把组里的错误一个一个过一遍，是什么错，就怎么处理。",
  // step 3 — 仓库卡
  "完整代码在仓库里。",
  // step 4 — 终屏：下一讲 + 下期见
  "下一讲，异步流水线：把生产者消费者，搬进单线程世界。下期见。",
];
