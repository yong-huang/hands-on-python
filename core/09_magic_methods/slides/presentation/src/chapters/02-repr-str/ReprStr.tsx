import type { ChapterStepProps } from "../../registry/types";
import "./ReprStr.css";
export default function ReprStrChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad rs-scene rs-cards-scene">
      <div className="rs-lead rs-rise">先看最基础的两个</div>
      <div className="rs-cards">
        <div className="rs-card rs-rise" style={{ animationDelay: "500ms" }}>
          <span className="rs-card-tag">__repr__</span>
          <span className="rs-card-desc">调试 · 精确 · unambiguous</span>
          <span className="rs-card-code">return f"Point({'{'}self.x{'}'}, {'{'}self.y{'}'})"</span>
        </div>
        <div className="rs-card rs-card-2 rs-rise" style={{ animationDelay: "1100ms" }}>
          <span className="rs-card-tag">__str__</span>
          <span className="rs-card-desc">显示 · 可读 · human-readable</span>
          <span className="rs-card-code">return f"({'{'}self.x{'}'}, {'{'}self.y{'}'})"</span>
        </div>
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad rs-scene rs-quote-scene">
      <div className="rs-quote-line rs-rise"><span className="rs-mono">repr</span> 要能还原对象</div>
      <div className="rs-quote-line rs-quote-line-2 rs-rise" style={{ animationDelay: "700ms" }}><span className="rs-mono">str</span> 要给人看</div>
    </div>
  );
  return (
    <div className="scene-pad rs-scene rs-term-scene">
      <div className="rs-term rs-rise">
        <div className="rs-term-bar">python3 magic_methods.py</div>
        <div className="rs-term-body">
          <div className="rs-term-line rs-line-in" style={{ animationDelay: "300ms" }}><span className="rs-prompt">&gt;&gt;&gt;</span> repr(p)</div>
          <div className="rs-term-line rs-term-acc rs-line-in" style={{ animationDelay: "1000ms" }}>Point(3, 4)</div>
          <div className="rs-term-line rs-line-in" style={{ animationDelay: "1800ms" }}><span className="rs-prompt">&gt;&gt;&gt;</span> str(p)</div>
          <div className="rs-term-line rs-term-dim rs-line-in" style={{ animationDelay: "2500ms" }}>(3, 4)</div>
        </div>
      </div>
    </div>
  );
}
