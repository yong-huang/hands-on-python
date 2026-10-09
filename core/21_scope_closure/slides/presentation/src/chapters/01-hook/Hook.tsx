import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const letterIndex = (i: number) => ({ "--i": i }) as CSSProperties;

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="label-mono hk-rise">Python · Core 21</div>
          <hr
            className="rule hk-title-rule hk-rise"
            style={{ animationDelay: "180ms" }}
          />
          <h1 className="hk-title-main hk-rise" style={{ animationDelay: "320ms" }}>
            活过函数的<span className="hk-title-accent">变量</span>
          </h1>
          <div className="hk-title-en hk-rise" style={{ animationDelay: "620ms" }}>
            The variable that outlives the function
          </div>
          <div className="hk-title-sub hk-rise" style={{ animationDelay: "820ms" }}>
            Python 作用域与闭包 —— LEGB · cell · nonlocal · 迟绑定
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={{ animationDelay: "1050ms" }}>
          <div className="hk-tb-row"><span>Subj</span><b>scope-closure</b></div>
          <div className="hk-tb-row"><span>Repo</span><b>hands-on-python</b></div>
          <div className="hk-tb-row"><span>Lab</span><b>core / 21</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — make_counter 代码卡：函数体跑完，count 按理该销毁 */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene hk-code-scene">
        <div className="hk-code-card card hk-rise">
          <div className="hk-code-head">
            <span className="hk-code-dot" />
            <span className="label-mono">make_counter.py</span>
          </div>
          <pre className="hk-code"><code>
            <span className="hk-ln">{"def make_counter():"}</span>
            <span className="hk-ln">{"    count = 0"}</span>
            <span className="hk-ln">{"    def counter():"}</span>
            <span className="hk-ln hk-ln-key">{"        nonlocal count"}</span>
            <span className="hk-ln">{"        count += 1"}</span>
            <span className="hk-ln">{"        return count"}</span>
            <span className="hk-ln hk-ln-return">{"    return counter"}</span>
          </code></pre>
        </div>
        <div className="hk-code-notes">
          <div className="hk-note hk-rise" style={{ animationDelay: "1200ms" }}>
            <div className="label-mono">make_counter() · 调用结束</div>
            <div className="hk-note-text">函数体已经<b>跑完</b>，返回了 counter</div>
          </div>
          <div className="hk-stamp hk-rise" style={{ animationDelay: "3200ms" }}>
            <span className="label-mono">栈帧 · 按理已回收</span>
            <div className="hk-stamp-text">count —— 该跟着销毁</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — counter 连续调用：1 → 2，count 还活着 */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene hk-call-scene">
        <div className="hk-frame-tag hk-rise">
          <span className="label-mono">make_counter 栈帧</span>
          <span className="hk-frame-state">已销毁</span>
        </div>
        <div className="hk-call-row hk-rise" style={{ animationDelay: "500ms" }}>
          <span className="hk-call-prompt mono">{"counter()"}</span>
          <span className="hk-call-arrow">→</span>
          <span className="hero-num hk-call-num hk-pop" style={{ animationDelay: "1050ms" }}>1</span>
        </div>
        <div className="hk-call-row hk-rise" style={{ animationDelay: "1400ms" }}>
          <span className="hk-call-prompt mono">{"counter()"}</span>
          <span className="hk-call-arrow">→</span>
          <span className="hero-num hk-call-num hk-pop" style={{ animationDelay: "2150ms" }}>2</span>
        </div>
        <div className="hk-call-foot hk-rise" style={{ animationDelay: "2600ms" }}>
          <b>count</b> 活过了它所在的函数
        </div>
      </div>
    );
  }

  /* step 3 — 点题：闭包 */
  return (
    <div className="scene-pad hk-scene hk-word-scene">
      <div className="hk-word-en hk-rise">Closure</div>
      <h1 className="hk-word-main">
        <span className="letter-stagger">
          <span className="letter" style={letterIndex(0)}>闭</span>
          <span className="letter" style={letterIndex(1)}>包</span>
        </span>
      </h1>
      <div className="hk-word-cue hk-rise" style={{ animationDelay: "700ms" }}>
        函数 + 它捕获的自由变量 · 打包在一起
      </div>
    </div>
  );
}
