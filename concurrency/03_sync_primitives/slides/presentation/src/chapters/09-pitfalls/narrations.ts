import type { Narration } from "../../registry/types";

/**
 * ch09 · pitfalls — 口播文本（对应 script.md 第 41~44 拍）。
 * 台词层拆写易错词：无（time.sleep / requests / maxsize 原形可读）。
 */
export const narrations: Narration[] = [
  // step 0 — 坑一：协程里调阻塞函数
  "四个真实踩过的坑。第一，在协程里调阻塞函数：time.sleep、同步 requests。整个程序卡住——阻塞调用冻住了事件循环，别的协程全部停摆，Semaphore 也救不了。解法：一律换异步库。",
  // step 1 — 坑二：无界队列 + 生产快于消费
  "第二，无界队列遇上生产快于消费。现象：压测每秒请求数看着正常，内存却持续上涨。解法：maxsize 开背压，再监控队列长度——只看请求数会漏掉。",
  // step 2 — 坑三：忘发毒丸
  "第三，忘了给消费者发毒丸。现象：程序退不出去——消费者不知道生产已结束，get 永远挂起。解法：每个消费者发一枚 None 哨兵。线程版的教训，异步世界原样成立。",
  // step 3 — 坑四：Semaphore 包错范围
  "第四，Semaphore 包错范围。把整个循环体包进去，吞吐能直接掉一个数量级——慢了十倍。解法：只包受限资源那几行——锁要锁得少、锁得准，许可同理。",
];
