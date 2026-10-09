import type { Narration } from "../../registry/types";

/** ch03 · pool-map — 口播文本（对应 script.md 第 17~22 拍）。 */
export const narrations: Narration[] = [
  // step 0 — Pool 定义（worker 白话由屏幕小注承载）
  "最常用的是进程池 Pool：预先雇好固定数量的 worker，循环领任务。",
  // step 1 — map 三步总览
  "批量派任务用 map，从提交到收工，三步。",
  // step 2 — 第 1 步 · 提交
  "一，提交：主进程把任务列表切块，分给 worker。",
  // step 3 — 第 2 步 · 并行执行
  "二，并行执行：几个 worker 各领一块，同时开算。",
  // step 4 — 第 3 步 · 汇合
  "三，汇合：结果按输入顺序回来——不是完成顺序。",
  // step 5 — pickle 规矩（打包机白话与物流成本标语由屏幕承载）
  "但有个规矩：谁也不能直接拿对方的内存——参数和返回值都要先打包再运输，干这活的叫 pickle。",
];
