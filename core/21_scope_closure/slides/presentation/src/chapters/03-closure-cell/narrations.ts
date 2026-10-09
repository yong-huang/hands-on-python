import type { Narration } from "../../registry/types";

/**
 * ch03 · closure-cell — 口播文本（唯一真相源，逐字使用）。
 * 长度 = 章节步数 = ClosureCell.tsx 里 step 的取值个数（5 → step 0..4）。
 */
export const narrations: Narration[] = [
  // step 0 — 「自由变量」命名卡
  "地基打完，回头看闭包。内层函数引用了外层的变量，这个变量，叫自由变量。",
  // step 1 — 外层返回对照图：栈帧销毁 vs 变量被打包进 cell、跟着 counter 被带走
  "外层函数返回，栈帧销毁，自由变量却没死。它被打包进一个 cell 对象，跟着 counter 一起被带走。",
  // step 2 — __closure__ 检查卡：终端实测
  "怎么验证？counter 身上带着 closure 属性。里面躺着那个 cell，cell contents 一看，就是当前计数。",
  // step 3 — 字节码对照：STORE_FAST vs STORE_DEREF
  "字节码更诚实。count 加一，编译出来是一条 STORE DEREF 指令。普通局部变量是 STORE FAST，读写栈帧，函数一返回就没了。STORE DEREF 写的不是栈帧，是 cell。",
  // step 4 — 金句收束
  "这就是变量活过函数的全部实现。",
];
