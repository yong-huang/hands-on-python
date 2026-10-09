import type { Narration } from "../../registry/types";

/**
 * ch07 · closing — 口播文本（三层拦截 + CTA，对应 script.md 第 30~33 拍）。
 * 长度 = 章节步数 = Closing.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 三层回收
  "回收一下三层：__new__ 创建类，__call__ 管实例，__init_subclass__ 管子类钩子。",
  // step 1 — 系列拼图
  "这也是这个系列的第五块拼图。装饰器管函数增强，with 管资源，描述符管属性，生成器管遍历，元类管类的诞生。",
  // step 2 — 应用收束
  "ORM 的字段映射、框架的单例、插件自动注册，底层全是这套。",
  // step 3 — CTA
  "完整代码在 hands-on-python 仓库。零依赖，python3 一跑就有体感。链接在评论区，下期见。",
];
