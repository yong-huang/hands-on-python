import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";
export default function ClosingChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad cl-scene cl-cases-scene">
      <div className="cl-cases-lead cl-rise">什么时候用？</div>
      <div className="cl-cases-list cl-rise" style={{ animationDelay: "600ms" }}>
        {["自定义比较 / 运算 / 显示","dict key · set 去重"].map((t,i)=>(
          <div key={i} className="cl-case-item cl-rise" style={{ animationDelay: `${1200+i*600}ms` }}>{t}</div>
        ))}
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad cl-scene cl-egg-scene">
      <div className="cl-egg-line cl-rise">__slots__ 的 member_descriptor</div>
      <div className="cl-egg-note cl-pop" style={{ animationDelay: "800ms" }}>就是描述符——Python 内部自用</div>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad cl-scene cl-link-scene">
      <div className="cl-link-lead cl-rise">描述符管属性 · slots 管开销 · 魔术方法管运算</div>
    </div>
  );
  return (
    <div className="scene-pad cl-scene">
      <div className="cl-cta">
        <div className="cl-term cl-rise">
          <div className="cl-term-bar">hands-on-python</div>
          <div className="cl-term-body">
            <div className="cl-cmd"><span className="cl-prompt">$</span> cd core/09_magic_methods</div>
            <div className="cl-cmd"><span className="cl-prompt">$</span> python3 magic_methods.py</div>
            <div className="cl-cmd cl-cmd-out">repr(p): Point(3, 4)</div>
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
