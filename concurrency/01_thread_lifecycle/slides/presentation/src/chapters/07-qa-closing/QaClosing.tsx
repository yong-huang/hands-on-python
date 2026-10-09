import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./QaClosing.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function QaClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — append vs counter += 1 双栏对照 */
  if (step === 0) {
    return (
      <div className="scene-pad qa-scene qa-vs-scene">
        <div className="qa-thesis qa-rise">两个线程同时写，会坏吗？</div>
        <div className="qa-vs-cols">
          <div className="qa-vs-card qa-pop" style={delay(400)}>
            <div className="qa-vs-head mono">{"✓\uFE0E"} list.append</div>
            <div className="qa-vs-demo">
              <span className="qa-vs-cell mono qa-vs-cell--one">4</span>
              <span className="qa-vs-ok mono">一次写入 · 不会坏</span>
            </div>
            <div className="qa-vs-why">单字节码原子 —— 就是刚才说的那一口「气」</div>
          </div>
          <div className="qa-vs-card qa-vs-card--bad qa-pop" style={delay(1500)}>
            <div className="qa-vs-head mono">{"✗\uFE0E"} counter += 1</div>
            <div className="qa-vs-demo">
              <span className="qa-vs-step mono">读</span>
              <span className="qa-vs-step mono">加</span>
              <span className="qa-vs-step mono">写</span>
              <span className="qa-vs-cut mono">↑ 中间可以被切换</span>
            </div>
            <div className="qa-vs-why">
              期望 <b>5</b>，实际 <b className="qa-bad">4</b> —— <b className="qa-bad">更新丢了</b>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 命名：竞态 */
  if (step === 1) {
    return (
      <div className="scene-pad qa-scene qa-name-scene">
        <div className="qa-name-sub qa-rise">更新被悄悄丢掉 —— 这个现象，有个名字</div>
        <h1 className="qa-name-hero qa-rise" style={delay(500)}>
          竞<span className="qa-name-accent">态</span>
        </h1>
        <div className="qa-name-en mono qa-rise" style={delay(1100)}>
          RACE CONDITION
        </div>
        <div className="qa-name-next qa-rise" style={delay(1900)}>
          <span className="label-mono">下一讲</span>实测它到底能丢多少
        </div>
      </div>
    );
  }

  /* step 2 — 收尾 */
  return (
    <div className="scene-pad qa-scene qa-end-scene">
      <div className="qa-end-repo mono qa-rise">
        hands-on-python / concurrency / 01_thread_lifecycle
      </div>
      <div className="qa-end-cmd mono qa-rise" style={delay(600)}>
        <span className="qa-end-prompt">$</span> python3 thread_lifecycle.py
      </div>
      <div className="qa-end-hero qa-rise" style={delay(1600)}>
        一跑，就有<b className="qa-name-accent">体感</b>
      </div>
      <div className="qa-end-byeline qa-rise" style={delay(2600)}>
        链接在评论区 · 下期见
      </div>
    </div>
  );
}
