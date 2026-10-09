import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

/**
 * ch01 · hook — super() 不是父类（5 steps）
 *
 * step 0  片头标题页（静默）
 * step 1  反差 hero：super() 名字里带 super，你以为它是「调用父类」
 * step 2  翻车卡：一到多继承就翻车 → 真相：MRO 中的下一个
 * step 3  概念卡：MRO = 方法查找顺序（C3 线性化）
 * step 4  钻石结构图：B(A)、C(A)、D(B, C)
 */

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页 */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="kicker hk-rise">Python · MRO &amp; Mixin</div>
          <hr className="rule hk-title-rule" />
          <h1 className="hk-title-main hk-rise" style={{ animationDelay: "250ms" }}>
            <span className="hk-title-code">super()</span> 不是父类
          </h1>
          <hr className="rule hk-title-rule" style={{ animationDelay: "350ms" }} />
          <div className="hk-title-sub hk-rise" style={{ animationDelay: "600ms" }}>
            MRO 与 Mixin
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={{ animationDelay: "850ms" }}>
          <div className="hk-tb-row">
            <span>Subj</span>
            <b>mro-mixin</b>
          </div>
          <div className="hk-tb-row">
            <span>Repo</span>
            <b>hands-on-python</b>
          </div>
          <div className="hk-tb-row">
            <span>Lab</span>
            <b>core / 07</b>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 反差 hero */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene hk-contrast-scene">
        <div className="hk-contrast-mono hk-rise">super()</div>
        <div className="hk-contrast-line hk-rise" style={{ animationDelay: "600ms" }}>
          名字里带个 super，你一定以为它是
        </div>
        <div className="hk-contrast-big hk-rise" style={{ animationDelay: "1200ms" }}>
          「调用<b>父类</b>」
        </div>
      </div>
    );
  }

  /* step 2 — 翻车卡 */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene hk-crash-scene">
        <div className="hk-crash-line hk-rise">一到<b>多继承</b>，这个理解就翻车。</div>
        <div className="hk-crash-truth hk-pop" style={{ animationDelay: "1100ms" }}>
          它其实是「<span className="hk-crash-acc">MRO 中的下一个</span>」
        </div>
      </div>
    );
  }

  /* step 3 — 概念卡 */
  if (step === 3) {
    return (
      <div className="scene-pad hk-scene hk-mro-scene">
        <div className="hk-mro-abbr hk-rise">MRO</div>
        <div className="hk-mro-full hk-rise" style={{ animationDelay: "500ms" }}>
          Method Resolution Order
        </div>
        <div className="hk-mro-cn hk-rise" style={{ animationDelay: "1000ms" }}>
          方法查找顺序
        </div>
        <div className="hk-mro-c3 hk-rise" style={{ animationDelay: "1800ms" }}>
          多继承时，Python 用 <b>C3 线性化算法</b>把它算出来
        </div>
      </div>
    );
  }

  /* step 4 — 钻石结构 */
  return (
    <div className="scene-pad hk-scene hk-diamond-scene">
      <div className="hk-diamond-lead hk-rise">拿钻石继承开刀</div>

      <div className="hk-diamond-canvas hk-fade" style={{ animationDelay: "400ms" }}>
        <svg className="hk-diamond-svg" viewBox="0 0 900 500" fill="none">
          <path className="hk-dline" d="M450 84 L250 185" />
          <path className="hk-dline" d="M450 84 L650 185" />
          <path className="hk-dline" d="M250 249 L450 350" />
          <path className="hk-dline" d="M650 249 L450 350" />
        </svg>

        <div className="hk-dnode hk-dnode-a">A</div>
        <div className="hk-dnode hk-dnode-b">B <span className="hk-dnode-sub">(A)</span></div>
        <div className="hk-dnode hk-dnode-c">C <span className="hk-dnode-sub">(A)</span></div>
        <div className="hk-dnode hk-dnode-d">D <span className="hk-dnode-sub">(B, C)</span></div>
      </div>
    </div>
  );
}
