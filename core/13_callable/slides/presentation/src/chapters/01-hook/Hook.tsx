import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句放标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad cb-scene">
        <div className="cb-title-center">
          <div className="cb-eyebrow cb-rise">Python · Core 13</div>
          <hr className="rule cb-title-rule" />
          <h1 className="cb-title-main cb-rise" style={{ animationDelay: "240ms" }}>
            能被<span className="cb-title-accent">调用</span>的对象
          </h1>
          <div className="cb-title-en cb-rise" style={{ animationDelay: "480ms" }}>
            Objects You Can Call
          </div>
          <div className="cb-title-sub cb-rise" style={{ animationDelay: "660ms" }}>
            Python <code className="cb-mono">__call__</code> 协议
          </div>
        </div>
        <div className="cb-titleblock cb-rise" style={{ animationDelay: "860ms" }}>
          <div className="cb-tb-row"><span>Subj</span><b>callable</b></div>
          <div className="cb-tb-row"><span>Repo</span><b>hands-on-python</b></div>
          <div className="cb-tb-row"><span>Lab</span><b>core / 13</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — 对照拷问：函数能调，对象呢 */
  if (step === 1) {
    return (
      <div className="scene-pad cb-scene">
        <div className="label-mono cb-kicker cb-rise">就一个问题</div>
        <div className="cb-duel">
          <div className="cb-chip cb-chip-known cb-rise" style={{ animationDelay: "300ms" }}>
            <code className="cb-chip-code">my_func(42)</code>
            <span className="cb-chip-cap">函数 · 能调</span>
          </div>
          <div className="cb-chip cb-chip-unknown cb-pop" style={{ animationDelay: "1050ms" }}>
            <code className="cb-chip-code">obj(42)</code>
            <span className="cb-chip-q">？</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 答案：__call__ */
  if (step === 2) {
    return (
      <div className="scene-pad cb-scene">
        <h1 className="cb-answer-hero cb-stamp">也能。</h1>
        <div className="cb-answer-sub cb-rise" style={{ animationDelay: "500ms" }}>
          只要类里定义了{" "}
          <code className="cb-answer-dunder">__call__</code>
        </div>
      </div>
    );
  }

  /* step 3 — 等价式：调用劈开看 */
  return (
    <div className="scene-pad cb-scene">
      <div className="cb-eq-row cb-rise">
        <code className="cb-eq-from">obj(42)</code>
      </div>
      <div className="cb-eq-arrow cb-rise" style={{ animationDelay: "420ms" }}>↓</div>
      <div className="cb-eq-row cb-rise" style={{ animationDelay: "640ms" }}>
        <code className="cb-eq-to">
          obj<span className="cb-eq-insert">.__call__</span>(42)
        </code>
      </div>
      <div className="cb-eq-cap cb-rise" style={{ animationDelay: "1400ms" }}>
        实际执行的，是下面这一行
      </div>
    </div>
  );
}
