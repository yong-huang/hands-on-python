import type { Narration } from "../../registry/types";

export const narrations: Narration[] = [
  "口说无凭，真机跑一组基准。CPU 密集：素数计数，4 个线程。",
  "serial 0.005 秒，threading 0.005 秒。比值 1.01——原地踏步。",
  "multiprocessing 0.046 秒，比值 8.49——反而更慢。任务粒度太小，进程启动成本吞掉了并行收益。",
  "换 I/O 密集：8 个 100 毫秒的 sleep。",
  "serial 0.827 秒，threading 0.106 秒——7.82 倍加速。",
  "asyncio 0.102 秒——8.12 倍。两个都比串行快，因为 GIL 在 I/O 等待期间被释放了。",
];
