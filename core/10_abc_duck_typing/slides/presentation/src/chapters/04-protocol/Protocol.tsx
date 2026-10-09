import type { ChapterStepProps } from "../../registry/types";
import "./Protocol.css";
export default function ProtocolChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad pc-scene pc-code-scene">
      <div className="pc-code-lead pc-rise"><span className="pc-dim">Protocol（PEP 544）结构化子类型：</span></div>
      <pre className="pc-code pc-rise" style={{ animationDelay: "400ms" }}>{`@runtime_checkable
class Speakable(Protocol):
    def speak(self) -> str: ...

isinstance(Duck(), Speakable)    # True
isinstance(Person(), Speakable)  # False`}</pre>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad pc-scene pc-vs-scene">
      <div className="pc-vs-cols">
        <div className="pc-vs-card pc-vs-good pc-rise" style={{ animationDelay: "500ms" }}>
          <span className="pc-vs-mono">Duck()</span><span className="pc-vs-res">isinstance: True ✓</span>
        </div>
        <div className="pc-vs-card pc-vs-bad pc-rise" style={{ animationDelay: "1300ms" }}>
          <span className="pc-vs-mono">Person()</span><span className="pc-vs-res">isinstance: False ✗</span>
        </div>
      </div>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad pc-scene pc-combine-scene">
      <div className="pc-combine-line pc-rise">结合两者优点</div>
      <div className="pc-combine-pair pc-rise" style={{ animationDelay: "800ms" }}>
        <span className="pc-combine-a">Duck Typing 的灵活性</span>
        <span className="pc-combine-plus">+</span>
        <span className="pc-combine-b">isinstance 检查</span>
      </div>
    </div>
  );
  return (
    <div className="scene-pad pc-scene pc-note-scene">
      <div className="pc-note-line pc-rise">isinstance 只按结构检查方法<b>是否存在</b></div>
      <div className="pc-note-sub pc-rise" style={{ animationDelay: "800ms" }}>签名级检查在 mypy 等静态类型检查器里生效</div>
    </div>
  );
}
