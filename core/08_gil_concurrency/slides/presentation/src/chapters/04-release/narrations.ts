import type { Narration } from "../../registry/types";

export const narrations: Narration[] = [
  "那什么时候释放 GIL？time.sleep() 可以，socket.recv() 可以，numpy.sum() 也可以。",
  "for 循环十亿次，不行。str.join()，不行。re.match()，也不行。",
  "注意，「是 C 扩展」不等于「释放 GIL」。re 和 json 就是 C 写的，但它们直接操作 Python 对象，GIL 不放。numpy 能释放，是因为它在 C 层显式调了 Py_BEGIN_ALLOW_THREADS。",
];
