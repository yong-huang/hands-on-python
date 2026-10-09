import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./CheckThenAct.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const THREADS = ["线程 1", "线程 2", "线程 3", "线程 4", "线程 5", "线程 6"];

export default function CheckThenActChapter({ step }: ChapterStepProps) {
  /* step 0 — 写法 + 为什么危险 */
  if (step === 0) {
    return (
      <div className="scene-pad ct-scene ct-shape-scene">
        <div className="ct-shape-tag ct-rise">更危险的写法：先检查，再行动</div>
        <div className="ct-code ct-pop">
          <div className="ct-code-line mono">
            <span className="ct-code-kw">if</span> balance &gt;= 100:
          </div>
          <div className="ct-code-line ct-code-line--indent mono">balance -= 100</div>
        </div>
        <div className="ct-why ct-rise" style={delay(1300)}>
          单看没毛病。危险在两步之间——检查完、扣款前，<b className="ct-accent">余额可能已经被别人改掉</b>
        </div>
        <div className="ct-why2 ct-rise" style={delay(2900)}>
          你的决定，基于一个<b className="ct-accent">过期了的余额</b>
        </div>
      </div>
    );
  }

  /* step 1 — Barrier 复现 */
  if (step === 1) {
    return (
      <div className="scene-pad ct-scene ct-barrier-scene">
        <div className="ct-barrier-ask ct-rise">这个写法，真的会出事吗？</div>
        <div className="ct-barrier-head ct-rise" style={delay(1000)}>
          <span className="label-mono">两道 Barrier · 把最坏交错钉成必然</span>
        </div>
        <div className="ct-barrier-lanes">
          {THREADS.map((t, i) => (
            <div className="ct-barrier-lane ct-rise" style={delay(500 + i * 250)} key={t}>
              <span className="ct-barrier-name mono">{t}</span>
              <span className="ct-barrier-check mono">{"✓\uFE0E"} 通过检查（都读到 100）</span>
            </div>
          ))}
        </div>
        <div className="ct-barrier-write ct-rise" style={delay(2600)}>
          <span className="mono">→</span> 集体扣款
        </div>
        <div className="ct-barrier-result ct-pop" style={delay(3200)}>
          余额 <b className="ct-bad">-500</b>，一次不差
        </div>
        <div className="ct-barrier-conclusion ct-rise" style={delay(4000)}>
          结论：出事了 —— 本该只扣 <b>1</b> 次，实际 <b className="ct-bad">6</b> 次全部生效，且是<b className="ct-accent">必然</b>
        </div>
      </div>
    );
  }

  /* step 2 — 锁 gloss + 现实 */
  return (
    <div className="scene-pad ct-scene ct-lock-scene">
      <div className="ct-lock-gloss ct-rise">
        刚才的整个过程，没有用任何锁。锁——让线程排队、一次只放一个进来的工具。没有它，这种交错随时可能发生。
      </div>
      <div className="ct-lock-hero ct-rise" style={delay(1400)}>
        错不每次都犯，
        <br />
        但一次就是<b className="ct-accent">事故</b>
      </div>
    </div>
  );
}
