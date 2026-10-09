import type { Narration } from "../../registry/types";

/**
 * ch02 · protocol — 口播文本（协议三方法，对应 script.md 第 5~9 拍）。
 * 长度 = 章节步数 = Protocol.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 协议本体
  "先看协议本体。三个魔法方法：__get__ 管读，__set__ 管写，__delete__ 管删。",
  // step 1 — __get__ 签名
  "重点看 __get__ 的签名。obj 是发起访问的实例，objtype 是所在的类。",
  // step 2 — 类访问 None 陷阱
  "细节来了：User.age 这样用类访问，obj 传的是 None。里面不判断，直接取实例属性，当场崩。",
  // step 3 — 放类属性上
  "写好的描述符往哪放？放类的属性上。注意，是类身上，不是实例身上。",
  // step 4 — __set_name__
  "再送一个小魔法：__set_name__。类创建时自动调用，把属性名送进来。不用手动传名字，报错信息还精确。",
];
