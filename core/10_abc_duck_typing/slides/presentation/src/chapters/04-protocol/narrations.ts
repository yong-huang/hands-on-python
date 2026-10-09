import type { Narration } from "../../registry/types";
export const narrations: Narration[] = [
  "Protocol 是 PEP 544 的结构化子类型：结合 Duck Typing 的灵活性和 isinstance 检查。",
  "isinstance(Duck(), Speakable) 是 True——有 speak 方法。isinstance(Person(), Speakable) 是 False——没有。",
  "@runtime_checkable 的 isinstance 只按结构检查方法是否存在，不校验签名。",
  "签名级检查只在 mypy 等静态类型检查器里生效。",
];
