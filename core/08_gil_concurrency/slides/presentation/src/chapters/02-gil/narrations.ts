import type { Narration } from "../../registry/types";

export const narrations: Narration[] = [
  "一句话心智模型：GIL 只锁「执行字节码」这件事。线程一进入 I/O 等待，就把锁让出去。",
  "线程 1 发起 socket.recv()，阻塞等待——等待期间释放 GIL。线程 2 获得锁执行 5 毫秒，I/O 完成后线程 1 重新竞争。",
  "这就是「多线程能加速 I/O、不能加速 CPU」的微观原因。",
  "每次切换间隔约 5 毫秒——sys.getswitchinterval()。",
];
