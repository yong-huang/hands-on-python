import type { Narration } from "../../registry/types";

/**
 * ch05 · mechanism — 口播文本（对应 script.md 第 28~32 拍）。
 * 第 28 拍（start 两件事）、第 29 拍（join 语义）各拆两条，共 7 步。
 * 长度 = 章节步数 = Mechanism.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — start() 做两件事
  "先回到那个一字之差：start() 到底做了什么？两件事：请操作系统创建真正的线程，再在新线程里跑 run()。",
  // step 1 — run() 直调对照
  "直接调 t.run() 呢？只是普通方法调用——执行者是你。",
  // step 2 — join()：等待动作与阻塞
  "join() 是调用它的线程对 t 喊的一嗓子：我等你跑完再走——喊完，调用方原地停住，这叫阻塞。一直等到 t 干完活才放行。",
  // step 3 — join 两个推论
  "对已经干完的线程 join，马上返回。设了超时，到点你就不等了——但对方照跑，不会被杀。",
  // step 4 — 不写 join：隐式 join 兜底
  "那不写 join 会怎样？普通线程不用慌：程序退出前，Python 会自动等它们全部跑完。daemon 才没有这个待遇。",
  // step 5 — daemon 强杀时刻
  "daemon 的规矩：daemon=True 必须在 start() 之前设。主线程一退，它被立即掐掉，没机会收尾——文件写到一半，停在半个字节上。",
  // step 6 — 分界线
  "所以分界线很清楚。每隔几秒报个平安、顺手记个监控数字，这种死了无所谓的活，交给 daemon。凡是最后要写进硬盘、写进数据库的收尾活，一概不行。",
];
