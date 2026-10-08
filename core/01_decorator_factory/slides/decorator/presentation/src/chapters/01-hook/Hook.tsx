import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const FNS = Array.from({ length: 10 }, (_, i) => `fn_${String(i + 1).padStart(2, "0")}`);

/**
 * ch01 · hook — 标题页 + 一个 @ 治复制粘贴（4 steps）
 *
 * step 0  片头标题页
 * step 1  十个函数 + 「都要加耗时统计」需求浮现
 * step 2  复制 ×10 的死循环
 * step 3  @ 登场，点名「装饰器」
 */
export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页 */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <hr className="rule hk-title-rule hk-rule-draw" />
          <h1 className="hk-title-main hk-rise" style={{ animationDelay: "250ms" }}>
            一个 <span className="hk-title-at">@</span> 的魔法
          </h1>
          <div className="hk-title-sub hk-rise" style={{ animationDelay: "600ms" }}>
            Python 装饰器 · 是什么 · 为什么需要它
          </div>
          <hr className="rule hk-title-rule hk-rule-draw" style={{ animationDelay: "350ms" }} />
        </div>
        <div className="hk-titleblock hk-rise" style={{ animationDelay: "1000ms" }}>
          <div className="hk-tb-row">
            <span>Subj</span>
            <b>decorator</b>
          </div>
          <div className="hk-tb-row">
            <span>Repo</span>
            <b>hands-on-python</b>
          </div>
          <div className="hk-tb-row">
            <span>Lab</span>
            <b>core / 01</b>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 十个函数 + 需求 */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene">
        <div className="hk-fnfield">
          {FNS.map((name, i) => (
            <div key={name} className="hk-fn hk-rise" style={{ animationDelay: `${120 + i * 70}ms` }}>
              <span className="hk-fn-pin" />
              {name}
            </div>
          ))}
        </div>
        <div className="hk-req">
          <div className="hk-req-leader hk-leader-draw" />
          <div className="hk-req-card hk-rise" style={{ animationDelay: "1150ms" }}>
            <div className="hk-req-tag">New Requirement</div>
            <div className="hk-req-text">
              每个函数，都要加<span className="hk-em">耗时统计</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 复制粘贴死循环 */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene">
        <div className="hk-copy">
          <div className="hk-copy-col hk-rise">
            <div className="hk-codecard">
              <div className="hk-codecard-bar">timing.py</div>
              <pre className="hk-code">{`t0 = time.perf_counter()
run()
print(time.perf_counter() - t0)`}</pre>
            </div>
            <div className="hk-copy-note">一份计时代码</div>
          </div>

          <div className="hk-copy-arrow hk-rise" style={{ animationDelay: "500ms" }}>
            →
          </div>

          <div className="hk-copy-col hk-rise" style={{ animationDelay: "750ms" }}>
            <div className="hk-stack">
              {[5, 4, 3, 2, 1, 0].map((i) => (
                <div
                  key={i}
                  className="hk-stack-card"
                  style={{
                    "--tx": `${i * 16}px`,
                    "--ty": `${i * 30}px`,
                    "--dim": 1 - i * 0.09,
                    animationDelay: `${850 + (5 - i) * 90}ms`,
                  } as CSSProperties}
                >
                  <div className="hk-stack-bar">timing.py</div>
                  <pre className="hk-stack-code">{`t0 = time.perf_counter()
run()
print(time.perf_counter() - t0)`}</pre>
                </div>
              ))}
            </div>
            <div className="hk-copy-note">
              复制 <span className="hk-stack-x">× 10</span>
            </div>
          </div>
        </div>

        <div className="hk-loop hk-rise" style={{ animationDelay: "1500ms" }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
            <path
              d="M18 5a13 13 0 1 1-9.2 3.8"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              fill="none"
            />
            <path d="M4.5 3.5l5 5-6.8 1.8z" fill="var(--accent)" />
          </svg>
          明天改成毫秒？<b>十处一起改</b>
        </div>
      </div>
    );
  }

  /* step 3 — @ 登场 */
  return (
    <div className="scene-pad hk-scene hk-at-scene">
      <div className="hk-at-ring">
        <span className="hk-tick hk-tick-n" />
        <span className="hk-tick hk-tick-e" />
        <span className="hk-tick hk-tick-s" />
        <span className="hk-tick hk-tick-w" />
        <span className="hk-at-sym">@</span>
      </div>
      <div className="hk-at-copy">
        <div className="kicker hk-rise" style={{ animationDelay: "850ms" }}>
          Python 里有个符号
        </div>
        <div className="hk-at-big hk-rise" style={{ animationDelay: "1050ms" }}>
          专门治这个
        </div>
      </div>
    </div>
  );
}
