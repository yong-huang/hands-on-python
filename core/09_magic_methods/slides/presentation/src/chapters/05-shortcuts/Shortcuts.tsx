import type { ChapterStepProps } from "../../registry/types";
import "./Shortcuts.css";
export default function ShortcutsChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad sc-scene sc-to-scene">
      <div className="sc-to-lead sc-rise">不想手写全套比较方法？</div>
      <div className="sc-to-name sc-pop" style={{ animationDelay: "600ms" }}>@total_ordering</div>
      <div className="sc-to-note sc-rise" style={{ animationDelay: "1500ms" }}>只写 __eq__ + __lt__ → 自动生成 __le__ / __gt__ / __ge__</div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad sc-scene sc-dc-scene">
      <div className="sc-dc-lead sc-rise">@dataclass 更省</div>
      <div className="sc-dc-list sc-rise" style={{ animationDelay: "600ms" }}>
        <div className="sc-dc-item">__init__ · __repr__ · __eq__ 全自动</div>
        <div className="sc-dc-item">order=True → 全套比较</div>
        <div className="sc-dc-item">frozen=True → 保留 __hash__</div>
      </div>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad sc-scene sc-container-scene">
      <div className="sc-container-lead sc-rise">容器协议</div>
      <div className="sc-container-list sc-rise" style={{ animationDelay: "600ms" }}>
        {[["__len__","管长度"],["__getitem__","管取值"],["__iter__","管迭代"]].map(([m,d],i)=>(
          <div key={m} className="sc-container-item sc-rise" style={{ animationDelay: `${800+i*300}ms` }}>
            <span className="sc-container-mono">{m}</span><span className="sc-container-desc">{d}</span>
          </div>
        ))}
      </div>
      <div className="sc-container-note sc-fade" style={{ animationDelay: "1800ms" }}>RingBuffer 就是这么做的</div>
    </div>
  );
  return (
    <div className="scene-pad sc-scene sc-done-scene">
      <div className="sc-done-big sc-rise">魔术方法</div>
      <div className="sc-done-sub sc-rise" style={{ animationDelay: "700ms" }}>让类像内置类型一样自然</div>
    </div>
  );
}
