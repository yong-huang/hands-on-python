import type { Narration } from "../../registry/types";

/**
 * ch05 · orm — 口播文本（ORM 字段映射，对应 script.md 第 20~25 拍）。
 * 长度 = 章节步数 = Orm.tsx 里 step 的取值个数。
 */
export const narrations: Narration[] = [
  // step 0 — 需求
  "第三件，也是最实用的：ORM 字段映射。需求：类里声明 Field，表结构自动生成。",
  // step 1 — OrmMeta 代码
  "代码：OrmMeta 的 __new__，扫描 namespace。把所有 Field 收进 cls._fields，表名取 name.lower()。",
  // step 2 — 时机对比
  "注意这里拦的是 __new__。它管「类怎么创建」；单例的 __call__ 管「实例怎么创建」。时机不同。",
  // step 3 — 真机字段
  "真机：User._table 是 user，_fields 是 id、name、email。",
  // step 4 — SQL 三连
  "SQL 直接生成：CREATE TABLE、SELECT、INSERT，全从这两个类属性拼出来。",
  // step 5 — 零样板
  "用户类里，一行样板都没有。这就是「类创建之前拦截」的价值。",
];
