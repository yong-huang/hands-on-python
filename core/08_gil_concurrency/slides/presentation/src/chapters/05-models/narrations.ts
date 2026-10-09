import type { Narration } from "../../registry/types";

export const narrations: Narration[] = [
  "所以选型边界很清楚。threading：I/O 密集，网络、文件、数据库。multiprocessing：CPU 密集，计算、编码。asyncio：大量 I/O 并发，高 QPS API。",
  "细选一下：少量 I/O 不超过 100 并发，threading 简单。大量 I/O 超过 100 并发，asyncio 高效。CPU 密集的部分，用 run_in_executor 转给进程池。",
  "为什么不直接去掉 GIL？它保护 CPython 的引用计数。3.13 起有 free-threading 实验版，3.14 起升级为官方支持。但传统 GIL 构建仍是默认。",
];
