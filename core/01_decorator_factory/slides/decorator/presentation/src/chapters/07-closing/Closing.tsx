import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";

/**
 * ch07 · closing — 为什么要搞懂它（3 steps）
 *
 * step 0  你早就在用 @：框架路由 / pydantic / functools
 * step 1  收拢：全是同一套机制，看穿魔法
 * step 2  CTA：hands-on-python 仓库跑一遍
 */
export default function ClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — 框架里的 @ */
  if (step === 0) {
    return (
      <div className="scene-pad cl-scene">
        <div className="cl-lead cl-rise">为什么值得花时间搞懂它？</div>
        <div className="cl-wall">
          <div className="cl-chip cl-rise" style={{ animationDelay: "900ms" }}>
            <div className="cl-chip-code">
              <span className="cl-at">@app.route</span>(<span className="cl-str">"/home"</span>)
            </div>
            <div className="cl-chip-tag">框架 · 路由</div>
          </div>
          <div className="cl-chip cl-rise" style={{ animationDelay: "2200ms" }}>
            <div className="cl-chip-code">
              <span className="cl-at">@field_validator</span>
            </div>
            <div className="cl-chip-tag">pydantic · 校验</div>
          </div>
          <div className="cl-chip cl-rise" style={{ animationDelay: "3500ms" }}>
            <div className="cl-chip-code">
              <span className="cl-at">@functools.cache</span>
            </div>
            <div className="cl-chip-tag">functools · 缓存</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 收拢到同一套机制 */
  if (step === 1) {
    return (
      <div className="scene-pad cl-scene">
        <div className="cl-wall cl-wall-dim">
          <div className="cl-chip cl-chip-mini">
            <div className="cl-chip-code">
              <span className="cl-at">@app.route</span>(...)
            </div>
          </div>
          <div className="cl-chip cl-chip-mini">
            <div className="cl-chip-code">
              <span className="cl-at">@field_validator</span>
            </div>
          </div>
          <div className="cl-chip cl-chip-mini">
            <div className="cl-chip-code">
              <span className="cl-at">@functools.cache</span>
            </div>
          </div>
        </div>
        <svg className="cl-converge" viewBox="0 0 1200 190" fill="none" aria-hidden>
          <path className="cl-draw" d="M200 0 C200 90 600 60 600 180" strokeDasharray="5 5" />
          <path className="cl-draw cl-draw-mid" d="M600 0 L600 180" strokeDasharray="5 5" />
          <path className="cl-draw" d="M1000 0 C1000 90 600 60 600 180" strokeDasharray="5 5" />
        </svg>
        <div className="cl-node cl-rise" style={{ animationDelay: "900ms" }}>
          都是装饰器 · 同一套机制
        </div>
        <div className="cl-punch">
          <div className="cl-punch-line cl-rise" style={{ animationDelay: "1800ms" }}>
            把 @ 后面的事想明白
          </div>
          <div className="cl-punch-line cl-punch-accent cl-rise" style={{ animationDelay: "2700ms" }}>
            那些魔法，一眼看穿
          </div>
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
              <span className="cl-prompt">$</span> cd core/01_decorator_factory
            </div>
            <div className="cl-cmd">
              <span className="cl-prompt">$</span> python3 decorator_factory.py
            </div>
            <div className="cl-cmd cl-cmd-out">
              === 装饰器全家桶 ===
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
