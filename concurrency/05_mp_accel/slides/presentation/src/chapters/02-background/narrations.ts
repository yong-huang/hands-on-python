import type { Narration } from "../../registry/types";

/**
 * ch02 · background — 口播文本（对应 script.md 第 9~16 拍）。
 * TTS 拆写只在这一层：GIL → 「G I L」、IO → 「I O」（PLAYBOOK 坑 19）。
 */
export const narrations: Narration[] = [
  // step 0 — GIL 定义
  "先说线程为什么白忙活。Python 有把全局大锁：G I L，全局解释器锁。",
  // step 1 — 解释器白话 + 规矩（字节码小注由屏幕承载）
  "解释器，就是替你一行行跑代码的程序。全局解释器锁，在同一时刻，只放行一个线程。",
  // step 2 — 锁前排队
  "纯计算的活，4 个线程在锁前排队，一人算一段，还要互相抢锁。",
  // step 3 — 实测对照
  "实测数素数：串行 0.49 秒，4 线程 0.66 秒——不加速，还倒贴。",
  // step 4 — IO 让锁
  "I O 密集的活没事：线程一等外部响应，此时会把 G I L 让出去。",
  // step 5 — 进程定义
  "出路在进程——一份独立运行的程序，自带全套内存。",
  // step 6 — 每解释器一把锁
  "关键在这：G I L 是每个解释器一把——每新开一个进程，多一把新锁。各锁各的，真正同时执行。",
  // step 7 — multiprocessing 登场
  "标准库把这套打包成 multiprocessing：开进程、派任务、收结果，全包了。",
];
