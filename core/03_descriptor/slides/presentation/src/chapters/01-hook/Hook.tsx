import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

/**
 * ch01 · hook — 片头标题页 + obj.attr 不是查字典（4 steps）
 *
 * step 0  片头标题页
 * step 1  obj.attr → 查 obj.__dict__ → 「不止查字典」
 * step 2  三件套汇流：property / classmethod / staticmethod → 同一套底层
 * step 3  描述符点名：__get__ / __set__ 放进类属性槽位
 */

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页 */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="kicker hk-rise">Python · Descriptor Protocol</div>
          <hr className="rule hk-title-rule" />
          <h1 className="hk-title-main hk-rise" style={{ animationDelay: "250ms" }}>
            <span className="hk-title-code">obj.attr</span> 的底牌
          </h1>
          <hr className="rule hk-title-rule" style={{ animationDelay: "350ms" }} />
          <div className="hk-title-sub hk-rise" style={{ animationDelay: "600ms" }}>
            Python 描述符协议 · 查找链 · 四个实战模式
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={{ animationDelay: "1000ms" }}>
          <div className="hk-tb-row">
            <span>Subj</span>
            <b>descriptor</b>
          </div>
          <div className="hk-tb-row">
            <span>Repo</span>
            <b>hands-on-python</b>
          </div>
          <div className="hk-tb-row">
            <span>Lab</span>
            <b>core / 03</b>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — obj.attr 不是查字典 */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene hk-lookup-scene">
        <div className="hk-repl hk-rise">
          <span className="hk-repl-prompt">&gt;&gt;&gt;</span> obj.attr
        </div>

        <div className="hk-dict hk-rise" style={{ animationDelay: "500ms" }}>
          <div className="hk-dict-bar">obj.__dict__</div>
          <div className="hk-dict-row">
            <span className="hk-skeleton" style={{ width: "38%" }} />
          </div>
          <div className="hk-dict-row">
            <span className="hk-skeleton" style={{ width: "58%" }} />
          </div>
          <div className="hk-dict-row">
            <span className="hk-skeleton" style={{ width: "30%" }} />
          </div>
          <span className="hk-scan" />
        </div>

        <div className="hk-stamp hk-stamp-in" style={{ animationDelay: "4800ms" }}>
          不止查字典
        </div>
      </div>
    );
  }

  /* step 2 — 三件套汇流 */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene hk-trio-scene">
        <div className="hk-trio">
          <span className="hk-trio-chip hk-rise">@property</span>
          <span className="hk-trio-chip hk-rise" style={{ animationDelay: "300ms" }}>
            @classmethod
          </span>
          <span className="hk-trio-chip hk-rise" style={{ animationDelay: "600ms" }}>
            @staticmethod
          </span>
        </div>

        <svg className="hk-trio-lines" viewBox="0 0 900 150" fill="none" aria-hidden>
          <path className="hk-draw" pathLength={100} style={{ animationDelay: "900ms" }} d="M150 0 C150 80 450 50 450 140" />
          <path className="hk-draw" pathLength={100} style={{ animationDelay: "1150ms" }} d="M450 0 L450 140" />
          <path className="hk-draw" pathLength={100} style={{ animationDelay: "1400ms" }} d="M750 0 C750 80 450 50 450 140" />
        </svg>

        <div className="hk-trio-node hk-pop" style={{ animationDelay: "2000ms" }}>
          同一套底层
        </div>
      </div>
    );
  }

  /* step 3 — 描述符点名 */
  return (
    <div className="scene-pad hk-scene hk-desc-scene">
      <div className="hk-desc-left">
        <div className="hk-desc-big hk-rise">描述符</div>
        <div className="hk-desc-chips">
          <span className="hk-desc-chip hk-rise" style={{ animationDelay: "500ms" }}>
            __get__ · 读
          </span>
          <span className="hk-desc-chip hk-rise" style={{ animationDelay: "800ms" }}>
            __set__ · 写
          </span>
        </div>
      </div>

      <div className="hk-desc-arrow hk-fade" style={{ animationDelay: "1200ms" }}>
        →
      </div>

      <div className="hk-classcard hk-rise" style={{ animationDelay: "300ms" }}>
        <div className="hk-classcard-bar">user.py</div>
        <pre className="hk-classcode">
          {"class User:\n    age = "}
          <span className="hk-slot hk-slot-in" style={{ animationDelay: "1500ms" }} />
        </pre>
      </div>

      <div className="hk-desc-foot hk-rise" style={{ animationDelay: "2300ms" }}>
        obj.attr 的读写，<b>归它管</b>
      </div>
    </div>
  );
}
