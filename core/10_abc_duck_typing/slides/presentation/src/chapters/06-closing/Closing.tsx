import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";
export default function ClosingChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad cl-scene cl-puzzle-scene">
      <div className="cl-puzzle-lead cl-rise">系列拼图</div>
      <div className="cl-puzzle-grid cl-rise" style={{ animationDelay: "600ms" }}>
        {[["魔术方法","运算与显示"],["__slots__","实例开销"],["MRO","方法查找"],["ABC / Protocol","多态约束"]].map(([a,b],i)=>(
          <div key={i} className="cl-puzzle-item cl-pop" style={{ animationDelay: `${800+i*350}ms` }}>
            <span className="cl-puzzle-name">{a}</span>
            <span className="cl-puzzle-tag">{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad cl-scene cl-close-scene">
      <div className="cl-close-line cl-rise">Python 把每个环节都<b>安排了协议</b></div>
    </div>
  );
  return (
    <div className="scene-pad cl-scene">
      <div className="cl-cta">
        <div className="cl-term cl-rise">
          <div className="cl-term-bar">hands-on-python</div>
          <div className="cl-term-body">
            <div className="cl-cmd"><span className="cl-prompt">$</span> cd core/10_abc_duck_typing</div>
            <div className="cl-cmd"><span className="cl-prompt">$</span> python3 abc_duck_typing.py</div>
            <div className="cl-cmd cl-cmd-out">isinstance(Duck(), Speakable): True</div>
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
