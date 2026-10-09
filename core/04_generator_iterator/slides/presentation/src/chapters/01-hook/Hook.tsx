import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

/**
 * ch01 · hook — 片头标题页 + 两个麻烦一个 yield（4 steps）
 *
 * step 0  片头标题页
 * step 1  千万行日志灌进列表 → 撑爆 → MemoryError
 * step 2  手写遍历的负担清单：__iter__ / __next__ / done / 20+ 行
 * step 3  一个 yield 划掉两个麻烦，点名「生成器」
 */

const BURDENS = [
  { mono: "__iter__", desc: "返回自己" },
  { mono: "__next__", desc: "推进状态" },
  { mono: "self.done", desc: "遍历完没完，自己记" },
  { mono: "raise StopIteration", desc: "结束信号" },
];

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页 */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="kicker hk-rise">Python · Generators &amp; Iterators</div>
          <hr className="rule hk-title-rule" />
          <h1 className="hk-title-main hk-rise" style={{ animationDelay: "250ms" }}>
            <span className="hk-title-code">yield</span>
            <span className="hk-title-colon">：</span>函数的暂停键
          </h1>
          <hr className="rule hk-title-rule" style={{ animationDelay: "350ms" }} />
          <div className="hk-title-sub hk-rise" style={{ animationDelay: "600ms" }}>
            Python 生成器与迭代器 · 惰性求值
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={{ animationDelay: "1000ms" }}>
          <div className="hk-tb-row">
            <span>Subj</span>
            <b>generator-iterator</b>
          </div>
          <div className="hk-tb-row">
            <span>Repo</span>
            <b>hands-on-python</b>
          </div>
          <div className="hk-tb-row">
            <span>Lab</span>
            <b>core / 04</b>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 千万行日志灌爆列表 */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene hk-flood-scene">
        <div className="hk-flood-head hk-rise">
          <span className="hk-flood-dot" />
          app.log — 10,000,000 行
        </div>

        <div className="hk-flood-list hk-rise" style={{ animationDelay: "300ms" }}>
          <div className="hk-flood-list-bar">lines = [ ... ]</div>
          <div className="hk-flood-rows">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="hk-flood-row" style={{ animationDelay: `${600 + i * 180}ms` }} />
            ))}
          </div>
        </div>

        <div className="hk-flood-crack hk-pop" style={{ animationDelay: "2100ms" }}>
          MemoryError
        </div>

        <div className="hk-flood-foot hk-rise" style={{ animationDelay: "2800ms" }}>
          先全读进来？<b>内存当场爆掉</b>
        </div>
      </div>
    );
  }

  /* step 2 — 手写遍历的负担 */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene hk-burden-scene">
        <div className="hk-burden-lead hk-rise">
          自己写一个能被 for 遍历的东西？
        </div>

        <div className="hk-burden-list">
          {BURDENS.map((b, i) => (
            <div key={b.mono} className="hk-burden-item hk-rise" style={{ animationDelay: `${500 + i * 280}ms` }}>
              <span className="hk-burden-mono">{b.mono}</span>
              <span className="hk-burden-desc">{b.desc}</span>
            </div>
          ))}
        </div>

        <div className="hk-burden-count hk-pop" style={{ animationDelay: "1800ms" }}>
          <span className="hk-burden-count-num">20+</span>
          行起步
        </div>
      </div>
    );
  }

  /* step 3 — yield 点名 */
  return (
    <div className="scene-pad hk-scene hk-yield-scene">
      <div className="hk-yield-troubles">
        <div className="hk-trouble hk-rise">
          <span className="hk-trouble-text">内存爆掉</span>
          <span className="hk-trouble-strike" />
        </div>
        <div className="hk-trouble hk-rise" style={{ animationDelay: "300ms" }}>
          <span className="hk-trouble-text">二十行样板</span>
          <span className="hk-trouble-strike hk-trouble-strike-2" />
        </div>
      </div>

      <div className="hk-yield-sym hk-pop" style={{ animationDelay: "900ms" }}>
        yield
      </div>

      <div className="hk-yield-copy hk-rise" style={{ animationDelay: "1700ms" }}>
        <div className="kicker">两个麻烦，一个关键字</div>
        <div className="hk-yield-big">
          它叫<b>生成器</b>
        </div>
      </div>
    </div>
  );
}
