import type { Narration } from "../../registry/types";
export const narrations: Narration[] = [
  "三条路线的失败点时机不同。Duck Typing 在调用时炸 AttributeError。ABC 在实例化时抛 TypeError。",
  "Protocol 的 isinstance 只按结构检查方法是否存在，不校验签名。",
  "失败点越靠前，约束越强。",
  "需要运行时检查用 Protocol。需要强制实现用 ABC。第三方类用 register()。",
];
