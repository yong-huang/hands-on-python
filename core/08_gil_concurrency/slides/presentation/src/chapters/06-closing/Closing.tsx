import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";

export default function ClosingChapter({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad cl-scene">
      <div className="cl-cta">
        <div className="cl-term cl-rise">
          <div className="cl-term-bar">hands-on-python</div>
          <div className="cl-term-body">
            <div className="cl-cmd"><span className="cl-prompt">$</span> cd core/08_gil_concurrency</div>
            <div className="cl-cmd"><span className="cl-prompt">$</span> python3 gil_concurrency.py</div>
            <div className="cl-cmd cl-cmd-out">→ Threading ≈ Serial (GIL: no CPU parallel gain)</div>
            <div className="cl-cmd"><span className="cl-prompt">$</span><span className="cl-cursor" /></div>
          </div>
        </div>
        <div className="cl-cta-foot">
          <span className="cl-cta-chip cl-rise" style={{ animationDelay: "1800ms" }}>零依赖 · python3 一跑就有体感</span>
          <span className="cl-cta-chip cl-cta-chip-accent cl-rise" style={{ animationDelay: "3000ms" }}>链接在评论区 · 下期见</span>
        </div>
      </div>
    </div>
  );
}
