import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./WhyAnswer.css";

/**
 * ch04 · why-answer — 装饰器是标准答案（5 steps）
 *
 * step 0  预告：两个下场
 * step 1  下场一 · 重复（同一份逻辑抄十遍）
 * step 2  下场二 · 改动要命（挨个改，漏一个翻车）
 * step 3  标准答案：抽成装饰器，写一遍
 * step 4  说加就加，说摘就摘
 */

const FNS = Array.from({ length: 10 }, (_, i) => `fn_${String(i + 1).padStart(2, "0")}`);
const MISS = 6; // fn_07 —— 漏改的那一个

export default function WhyAnswerChapter({ step }: ChapterStepProps) {
  /* step 0 — 两个下场 */
  if (step === 0) {
    return (
      <div className="scene-pad wa-scene">
        <div className="wa-preview-title wa-rise">一股脑写进业务函数</div>
        <div className="wa-slots">
          <div className="wa-slot wa-rise" style={{ animationDelay: "700ms" }}>
            <span className="wa-slot-ord">①</span>
            <span className="wa-slot-hint">下场</span>
          </div>
          <div className="wa-slot wa-rise" style={{ animationDelay: "1000ms" }}>
            <span className="wa-slot-ord">②</span>
            <span className="wa-slot-hint">下场</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 下场一：重复 */
  if (step === 1) {
    return (
      <div className="scene-pad wa-scene">
        <div className="wa-grid wa-grid-roomy">
          {FNS.map((name, i) => (
            <div key={name} className="wa-cell wa-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="wa-cell-name">{name}</span>
              <span className="wa-mark wa-mark-plain">同一段</span>
            </div>
          ))}
        </div>
        <div className="wa-repeat-stamp wa-rise" style={{ animationDelay: "1400ms" }}>
          同一份逻辑 <span className="wa-repeat-x">× 10</span>
        </div>
      </div>
    );
  }

  /* step 2 — 下场二：改动要命 */
  if (step === 2) {
    return (
      <div className="scene-pad wa-scene">
        <div className="wa-change wa-rise" style={{ animationDelay: "600ms" }}>
          需求变更 · 日志要加时间戳
        </div>
        <div className="wa-grid">
          {FNS.map((name, i) => (
            <div key={name} className={`wa-cell ${i === MISS ? "wa-cell-miss" : ""}`}>
              <span className="wa-cell-name">{name}</span>
              {i === MISS ? (
                <span className="wa-mark wa-mark-miss">漏</span>
              ) : (
                <span className="wa-mark wa-mark-edit" style={{ animationDelay: `${1700 + i * 130}ms` }}>
                  改
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="wa-consequence wa-rise" style={{ animationDelay: "4400ms" }}>
          漏一个 → 日志对不上，慢慢捞吧
        </div>
      </div>
    );
  }

  /* step 3 — 标准答案 */
  if (step === 3) {
    return (
      <div className="scene-pad wa-scene">
        <div className="wa-answer">
          <div className="wa-module wa-rise">
            <div className="wa-module-name">@timer</div>
            <div className="wa-module-sub">横切逻辑 · 写一遍</div>
          </div>
          <div className="wa-fan" aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className="wa-fan-bar"
                style={{
                  "--rot": `rotate(${-27 + i * 6}deg)`,
                  animationDelay: `${1000 + i * 70}ms`,
                } as CSSProperties}
              />
            ))}
          </div>
          <div className="wa-grid wa-grid-mini wa-rise" style={{ animationDelay: "700ms" }}>
            {FNS.map((name) => (
              <span key={name} className="wa-cell-name wa-cell-name-mini">
                {name}
              </span>
            ))}
          </div>
        </div>
        <div className="wa-answer-foot">
          <span className="wa-foot-chip wa-rise" style={{ animationDelay: "3200ms" }}>
            抽出来
          </span>
          <span className="wa-foot-chip wa-rise" style={{ animationDelay: "3900ms" }}>
            单独写一遍
          </span>
          <span className="wa-foot-chip wa-foot-chip-accent wa-rise" style={{ animationDelay: "4600ms" }}>
            @ 到需要的函数头上
          </span>
        </div>
      </div>
    );
  }

  /* step 4 — 说加就加，说摘就摘 */
  return (
    <div className="scene-pad wa-scene">
      <div className="wa-toggle">
        <div className="wa-toggle-card wa-rise">
          <div className="wa-toggle-at">＠timer</div>
          <div className="wa-toggle-fn">fn()</div>
          <div className="wa-toggle-label wa-label-on">插上 · 生效</div>
        </div>
        <div className="wa-toggle-card wa-toggle-off wa-rise" style={{ animationDelay: "1000ms" }}>
          <div className="wa-toggle-at wa-toggle-at-off">＠timer</div>
          <div className="wa-toggle-fn">fn()</div>
          <div className="wa-toggle-label">摘掉 · 恢复</div>
        </div>
      </div>
      <div className="wa-zero wa-rise" style={{ animationDelay: "2200ms" }}>
        业务代码 · 一行不动
      </div>
    </div>
  );
}
