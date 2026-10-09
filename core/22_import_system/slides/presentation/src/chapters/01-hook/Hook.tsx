import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad ho-scene ho-title-scene">
        <div className="ho-title-center">
          <div className="label-mono ho-rise">Python · Core 22</div>
          <hr
            className="rule ho-title-rule ho-rise"
            style={{ animationDelay: "180ms" }}
          />
          <h1 className="ho-title-main ho-rise" style={{ animationDelay: "320ms" }}>
            <span className="ho-title-kw mono">{"import"}</span>
            <span className="ho-title-rest">的后台流水线</span>
          </h1>
          <div className="ho-title-en ho-rise" style={{ animationDelay: "620ms" }}>
            The pipeline behind a keyword
          </div>
          <div className="ho-title-sub ho-rise" style={{ animationDelay: "820ms" }}>
            {"Python 模块与导入系统 —— sys.modules · __main__ · 循环导入 · 包"}
          </div>
        </div>
        <div className="ho-titleblock ho-rise" style={{ animationDelay: "1050ms" }}>
          <div className="ho-tb-row"><span>Subj</span><b>import-system</b></div>
          <div className="ho-tb-row"><span>Repo</span><b>hands-on-python</b></div>
          <div className="ho-tb-row"><span>Lab</span><b>core / 22</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — 两次 import 的怪现象 */
  if (step === 1) {
    return (
      <div className="scene-pad ho-scene ho-twice-scene">
        <div className="ho-twice-card card ho-rise">
          <div className="ho-twice-head">
            <span className="ho-twice-dot" />
            <span className="label-mono">同一模块 · import 两遍</span>
          </div>
          <div className="ho-call-row ho-rise" style={{ animationDelay: "900ms" }}>
            <span className="ho-call-prompt mono">{">>> import counter_mod"}</span>
            <span className="ho-call-out">{"[counter_mod] 模块体执行 · 只此一次"}</span>
          </div>
          <div className="ho-call-row ho-rise" style={{ animationDelay: "2600ms" }}>
            <span className="ho-call-prompt mono">{">>> import counter_mod as again"}</span>
            <span className="ho-call-out ho-call-out-silent">{"（静默 —— 缓存命中）"}</span>
          </div>
          <div className="ho-is-line ho-rise" style={{ animationDelay: "4400ms" }}>
            <span className="mono ho-is-expr">{"counter_mod is again"}</span>
            <span className="ho-is-arrow">→</span>
            <span className="hero-num ho-is-result ho-pop" style={{ animationDelay: "5000ms" }}>True</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 点题：三步流水线 */
  return (
    <div className="scene-pad ho-scene ho-pipe-scene">
      <div className="ho-pipe-lead ho-rise">
        <span className="mono ho-pipe-kw">{"import"}</span>
        <span className="ho-pipe-not">不只是一行关键字</span>
      </div>
      <div className="ho-pipe-row">
        <span className="ho-pipe-chip ho-rise" style={{ animationDelay: "900ms" }}>
          <span className="label-mono">STEP 1</span>查缓存
        </span>
        <span className="ho-pipe-arrow ho-rise" style={{ animationDelay: "1150ms" }}>→</span>
        <span className="ho-pipe-chip ho-rise" style={{ animationDelay: "1350ms" }}>
          <span className="label-mono">STEP 2</span>执行模块体
        </span>
        <span className="ho-pipe-arrow ho-rise" style={{ animationDelay: "1600ms" }}>→</span>
        <span className="ho-pipe-chip ho-rise" style={{ animationDelay: "1800ms" }}>
          <span className="label-mono">STEP 3</span>绑定名字
        </span>
      </div>
      <div className="ho-pipe-en">
        <span className="letter-stagger">
          {"PIPELINE".split("").map((ch, i) => (
            <span key={i} className="letter" style={{ "--i": i } as CSSProperties}>{ch}</span>
          ))}
        </span>
      </div>
    </div>
  );
}
