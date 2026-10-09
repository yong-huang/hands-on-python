import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";

/**
 * ch08 · closing — 按需生成（3 steps）
 *
 * step 0  机制回收 + 协程三代演进
 * step 1  金句：不提前算好，按需生成
 * step 2  CTA：hands-on-python 终端（系列同款）
 */

const ERAS = [
  { mono: "yield + send", tag: "生成器协程" },
  { mono: "yield from", tag: "@coroutine" },
  { mono: "async / await", tag: "原生协程" },
];

export default function ClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — 机制回收 + 三代演进 */
  if (step === 0) {
    return (
      <div className="scene-pad cl-scene cl-recap-scene">
        <div className="cl-recap-lead cl-rise">
          迭代器是遍历的协议，生成器是它<b>最省的写法</b>
        </div>

        <div className="cl-eras">
          {ERAS.map((e, i) => (
            <span key={e.mono} className="cl-era-unit">
              {i > 0 && <span className="cl-era-arrow">→</span>}
              <span className="cl-era cl-rise" style={{ animationDelay: `${900 + i * 500}ms` }}>
                <span className="cl-era-mono">{e.mono}</span>
                <span className="cl-era-tag">{e.tag}</span>
              </span>
            </span>
          ))}
        </div>

        <div className="cl-recap-foot cl-rise" style={{ animationDelay: "2600ms" }}>
          三代协程，<b>都建立在暂停恢复上</b>
        </div>
      </div>
    );
  }

  /* step 1 — 金句 */
  if (step === 1) {
    return (
      <div className="scene-pad cl-scene cl-quote-scene">
        <div className="cl-quote-row cl-rise">
          <span className="cl-quote-dim">不提前算好</span>
        </div>
        <div className="cl-quote-row cl-quote-acc cl-rise" style={{ animationDelay: "900ms" }}>
          <span>按需生成</span>
        </div>
        <div className="cl-quote-foot cl-rise" style={{ animationDelay: "2000ms" }}>
          零内存管道、协程，<b>你都能看懂</b>
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
              <span className="cl-prompt">$</span> cd core/04_generator_iterator
            </div>
            <div className="cl-cmd">
              <span className="cl-prompt">$</span> python3 generator_iterator.py
            </div>
            <div className="cl-cmd cl-cmd-out">
              [3] send() — bidirectional generator:
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
