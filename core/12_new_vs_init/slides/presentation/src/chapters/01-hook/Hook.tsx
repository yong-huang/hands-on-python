import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句放标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad bi-scene">
        <div className="bi-title-center">
          <div className="label-mono bi-rise">Python · Core 12</div>
          <hr className="rule bi-title-rule" />
          <h1 className="bi-title-main bi-rise" style={{ animationDelay: "300ms" }}>
            一个对象的<span className="bi-title-accent">诞生</span>
          </h1>
          <div className="bi-title-en bi-rise" style={{ animationDelay: "560ms" }}>
            The Birth of an Object
          </div>
          <div className="bi-title-sub bi-rise" style={{ animationDelay: "760ms" }}>
            <code className="bi-mono">__new__</code>
            <span className="bi-sub-vs">vs</span>
            <code className="bi-mono">__init__</code>
            <span className="bi-sub-dash">——</span>
            谁管生 · 谁管养
          </div>
        </div>
        <div className="bi-titleblock bi-rise" style={{ animationDelay: "980ms" }}>
          <div className="bi-tb-row"><span>Subj</span><b>new-vs-init</b></div>
          <div className="bi-tb-row"><span>Repo</span><b>hands-on-python</b></div>
          <div className="bi-tb-row"><span>Lab</span><b>core / 12</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — MyClass() 大字上屏 + 批注式拷问 */
  if (step === 1) {
    return (
      <div className="scene-pad bi-scene">
        <div className="label-mono bi-kicker bi-rise">就一个问题</div>
        <div className="bi-line-hero bi-rise" style={{ animationDelay: "240ms" }}>
          MyClass<span className="bi-line-paren">()</span>
        </div>
        <div className="bi-line-underline" />
        <div className="bi-line-q bi-rise" style={{ animationDelay: "760ms" }}>
          这一行，背后到底发生了什么？
        </div>
      </div>
    );
  }

  /* step 2 — 误解对比：从没写过 __new__ vs 第一反应只有 __init__ */
  if (step === 2) {
    return (
      <div className="scene-pad bi-scene">
        <div className="bi-myth-head bi-rise">写 Python 这么多年</div>
        <div className="bi-myth-grid">
          <div className="card bi-myth-card bi-rise" style={{ animationDelay: "260ms" }}>
            <div className="label-mono">你可能一次都没写过</div>
            <div className="bi-myth-zero-row">
              <span className="hero-num bi-myth-zero bi-pop" style={{ animationDelay: "620ms" }}>
                0
              </span>
              <span className="bi-myth-unit">次</span>
            </div>
            <div className="bi-myth-sub">
              亲手写下 <code className="bi-mono">__new__</code>
            </div>
          </div>
          <div className="bi-myth-divider bi-rise" style={{ animationDelay: "900ms" }}>
            vs
          </div>
          <div className="card bi-myth-card bi-rise" style={{ animationDelay: "1160ms" }}>
            <div className="label-mono">多数人的第一反应</div>
            <div className="bi-myth-quote">
              调 <code className="bi-mono">__init__</code> 呗
            </div>
            <div className="bi-myth-sub">只写它，从来没出过事</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 悬崖：一行代码，只认出一半 */
  return (
    <div className="scene-pad bi-scene">
      <div className="bi-half-line">
        <span className="bi-half-base">MyClass()</span>
        <span className="bi-half-ink">MyClass()</span>
        <span className="bi-half-cut" />
      </div>
      <h1 className="bi-half-main bi-rise" style={{ animationDelay: "520ms" }}>
        对，但只对了一半。
      </h1>
    </div>
  );
}
