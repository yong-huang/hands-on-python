import type { ChapterStepProps } from "../../registry/types";
import "./Diamond.css";

/**
 * ch02 · diamond — 钻石继承与 C3（5 steps）
 *
 * step 0  真机 MRO 序列逐环点亮：D → B → C → A → object
 * step 1  反直觉标注：B 的 super() 跳向 C
 * step 2  真机：D().greet() 调用序 D/B/C/A 各带 MRO index
 * step 3  恰好一次 vs 两次对照
 * step 4  C3 三性质卡
 */

const MRO = ["D", "B", "C", "A", "object"];

const CALLS = [
  { idx: 0, name: "D", note: "D().greet() 入口" },
  { idx: 1, name: "B", note: "MRO 下一个" },
  { idx: 2, name: "C", note: "再下一个" },
  { idx: 3, name: "A", note: "最后命中" },
];

const PROPS = [
  { name: "单调性", note: "子类 MRO 保序" },
  { name: "局部优先", note: "先出现的父类优先" },
  { name: "唯一性", note: "每个类只出现一次" },
];

export default function DiamondChapter({ step }: ChapterStepProps) {
  /* step 0 — MRO 序列 */
  if (step === 0) {
    return (
      <div className="scene-pad dm-scene dm-mro-scene">
        <div className="dm-mro-head dm-rise">
          <span className="dm-dim">真机 · </span>D(B, C) 的 MRO
        </div>
        <div className="dm-mro-chain">
          {MRO.map((m, i) => (
            <span key={m} className="dm-mro-unit">
              {i > 0 && <span className="dm-mro-arrow dm-fade" style={{ animationDelay: `${700 + i * 500}ms` }}>→</span>}
              <span className="dm-mro-node dm-pop" style={{ animationDelay: `${400 + i * 500}ms` }}>
                <span className="dm-mro-idx">{i}</span>
                {m}
              </span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  /* step 1 — B 的 super 跳 C */
  if (step === 1) {
    return (
      <div className="scene-pad dm-scene dm-jump-scene">
        <div className="dm-jump-lead dm-rise">注意</div>
        <div className="dm-jump-line dm-rise" style={{ animationDelay: "400ms" }}>
          B 的 <span className="dm-jump-mono">super()</span> 跳向的是 <b>C</b>，
          不是它的父类 A
        </div>
        <div className="dm-jump-diagram dm-fade" style={{ animationDelay: "1400ms" }}>
          <span className="dm-jump-chip">B</span>
          <span className="dm-jump-path">→ super →</span>
          <span className="dm-jump-chip dm-jump-chip-acc">C</span>
          <span className="dm-jump-skip">（跳过 A）</span>
        </div>
      </div>
    );
  }

  /* step 2 — 调用序 */
  if (step === 2) {
    return (
      <div className="scene-pad dm-scene dm-call-scene">
        <div className="dm-call-head dm-rise">
          <span className="dm-dim">真机 · </span>D().greet()
        </div>
        <div className="dm-call-list">
          {CALLS.map((c, i) => (
            <div key={c.name} className="dm-call-row dm-rise" style={{ animationDelay: `${500 + i * 450}ms` }}>
              <span className="dm-call-idx">[{c.idx}]</span>
              <span className="dm-call-name">{c.name}.greet</span>
              <span className="dm-call-note">{c.note}</span>
            </div>
          ))}
        </div>
        <div className="dm-call-foot dm-rise" style={{ animationDelay: "2500ms" }}>
          依次命中，<b>每个一次</b>
        </div>
      </div>
    );
  }

  /* step 3 — 恰好一次 vs 两次 */
  if (step === 3) {
    return (
      <div className="scene-pad dm-scene dm-once-scene">
        <div className="dm-once-cols">
          <div className="dm-once-card dm-rise">
            <div className="dm-once-tag">沿 MRO 走（super）</div>
            <div className="dm-once-big dm-once-good">× 1</div>
            <div className="dm-once-note">A.greet 恰好一次 —— C3 保证</div>
          </div>
          <div className="dm-once-card dm-once-card-2 dm-rise" style={{ animationDelay: "900ms" }}>
            <div className="dm-once-tag">直接写 A.greet(self)</div>
            <div className="dm-once-big dm-once-bad">× 2</div>
            <div className="dm-once-note">A 的代码执行两次，「恰好一次」失效</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — C3 三性质 */
  return (
    <div className="scene-pad dm-scene dm-props-scene">
      <div className="dm-props-lead dm-rise">C3 凭什么？三个性质</div>
      <div className="dm-props-list">
        {PROPS.map((p, i) => (
          <div key={p.name} className="dm-prop dm-rise" style={{ animationDelay: `${600 + i * 450}ms` }}>
            <span className="dm-prop-ord">{i + 1}</span>
            <span className="dm-prop-name">{p.name}</span>
            <span className="dm-prop-note">{p.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
