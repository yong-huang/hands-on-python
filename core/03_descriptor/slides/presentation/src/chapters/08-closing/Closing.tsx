import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";

/**
 * ch08 · closing — 会用 vs 理解（3 steps）
 *
 * step 0  链条回收：验证/缓存/惰性三模式汇入查找链
 * step 1  金句：会用 Python vs 理解 Python
 * step 2  CTA：hands-on-python 终端（decorator 同款）
 */

const MODES = [
  { name: "TypedField", tag: "验证", delay: "500ms" },
  { name: "CachedProperty", tag: "缓存", delay: "1100ms" },
  { name: "LazyField", tag: "惰性", delay: "1700ms" },
];

export default function ClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — 链条回收 */
  if (step === 0) {
    return (
      <div className="scene-pad cl-scene cl-chain-scene">
        <div className="cl-chain-modes">
          {MODES.map((m) => (
            <div key={m.name} className="cl-mode cl-rise" style={{ animationDelay: m.delay }}>
              <span className="cl-mode-name">{m.name}</span>
              <span className="cl-mode-tag">{m.tag}</span>
            </div>
          ))}
        </div>

        <svg className="cl-converge" viewBox="0 0 1200 170" fill="none" aria-hidden>
          <path className="cl-draw" pathLength={100} style={{ animationDelay: "2000ms" }} d="M200 0 C200 90 600 60 600 160" />
          <path className="cl-draw" pathLength={100} style={{ animationDelay: "2200ms" }} d="M600 0 L600 160" />
          <path className="cl-draw" pathLength={100} style={{ animationDelay: "2400ms" }} d="M1000 0 C1000 90 600 60 600 160" />
        </svg>

        <div className="cl-chain-bar cl-pop" style={{ animationDelay: "2900ms" }}>
          <span className="cl-chain-hot">数据描述符</span>
          <span className="cl-chain-gt">&gt;</span>
          <span>实例字典</span>
          <span className="cl-chain-gt">&gt;</span>
          <span>非数据描述符</span>
        </div>
        <div className="cl-chain-foot cl-rise" style={{ animationDelay: "3600ms" }}>
          缓存、验证、惰性，<b>全是这条链上的把戏</b>
        </div>
      </div>
    );
  }

  /* step 1 — 金句 */
  if (step === 1) {
    return (
      <div className="scene-pad cl-scene cl-quote-scene">
        <div className="cl-quote cl-rise">
          <span className="cl-quote-dim">会用 Python</span>
        </div>
        <div className="cl-quote-vs cl-pop" style={{ animationDelay: "800ms" }}>
          vs
        </div>
        <div className="cl-quote cl-quote-acc cl-rise" style={{ animationDelay: "1400ms" }}>
          <span>理解 Python</span>
        </div>
        <div className="cl-quote-foot cl-rise" style={{ animationDelay: "2300ms" }}>
          分得清这两者的，<b>就是这种底层机制</b>
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
              <span className="cl-prompt">$</span> cd core/03_descriptor
            </div>
            <div className="cl-cmd">
              <span className="cl-prompt">$</span> python3 descriptor.py
            </div>
            <div className="cl-cmd cl-cmd-out">
              [1] TypedField (data descriptor with validation):
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
