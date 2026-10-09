import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";

/**
 * ch05 · closing — 一句话与系列回收（3 steps）
 *
 * step 0  金句 hero：super() = MRO 中我之后的下一个
 * step 1  系列回收：描述符 → slots → MRO（每个环节都有协议）
 * step 2  CTA：hands-on-python 终端（系列同款）
 */

const SERIES = [
  { name: "描述符", tag: "属性存取" },
  { name: "__slots__", tag: "实例开销" },
  { name: "MRO", tag: "方法查找" },
];

export default function ClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — 金句 */
  if (step === 0) {
    return (
      <div className="scene-pad cl-scene cl-quote-scene">
        <div className="cl-quote-kicker cl-rise">一句话记住</div>
        <div className="cl-quote-big cl-rise" style={{ animationDelay: "700ms" }}>
          <span className="cl-quote-mono">super()</span> 是 MRO 中
          <br />
          <b>我之后的下一个</b>
        </div>
        <div className="cl-quote-strike cl-rise" style={{ animationDelay: "1900ms" }}>
          不是父类
        </div>
      </div>
    );
  }

  /* step 1 — 系列回收 */
  if (step === 1) {
    return (
      <div className="scene-pad cl-scene cl-series-scene">
        <div className="cl-series-lead cl-rise">
          Python 把每个环节都<b>安排了协议</b>
        </div>
        <div className="cl-series-list">
          {SERIES.map((s, i) => (
            <div key={s.name} className="cl-series-item cl-rise" style={{ animationDelay: `${600 + i * 450}ms` }}>
              <span className="cl-series-name">{s.name}</span>
              <span className="cl-series-tag">管{s.tag}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 2 — CTA */
  return (
    <div className="scene-pad cl-scene">
      <div className="cl-cta">
        <div className="cl-term cl-rise">
          <div className="cl-term-bar">hands-on-python</div>
          <div className="cl-term-body">
            <div className="cl-cmd">
              <span className="cl-prompt">$</span> cd core/07_mro_mixin
            </div>
            <div className="cl-cmd">
              <span className="cl-prompt">$</span> python3 mro_mixin.py
            </div>
            <div className="cl-cmd cl-cmd-out">
              D(B, C) MRO: D -&gt; B -&gt; C -&gt; A -&gt; object
            </div>
            <div className="cl-cmd">
              <span className="cl-prompt">$</span>
              <span className="cl-cursor" />
            </div>
          </div>
        </div>
        <div className="cl-cta-foot">
          <span className="cl-cta-chip cl-rise" style={{ animationDelay: "1800ms" }}>
            零依赖 · python3 一跑就有体感
          </span>
          <span className="cl-cta-chip cl-cta-chip-accent cl-rise" style={{ animationDelay: "3000ms" }}>
            链接在评论区 · 下期见
          </span>
        </div>
      </div>
    </div>
  );
}
