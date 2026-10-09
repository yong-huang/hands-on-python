import type { ChapterStepProps } from "../../registry/types";
import "./Send.css";

/**
 * ch04 · send — 双向通信（6 steps）
 *
 * step 0  概念反转：yield 双向箭头
 * step 1  accumulator 代码卡
 * step 2  核心一行：received = yield total 双向标注
 * step 3  priming 时间线：next 启动 → 暂停 → send 恢复
 * step 4  priming 坑：直接 send → TypeError
 * step 5  真机终端：send(10/20/30) → total 10/30/60
 */

export default function SendChapter({ step }: ChapterStepProps) {
  /* step 0 — 概念反转 */
  if (step === 0) {
    return (
      <div className="scene-pad sn-scene sn-flip-scene">
        <div className="sn-flip-yield sn-rise">yield</div>

        <div className="sn-flip-arrows">
          <div className="sn-flip-arrow sn-flip-arrow-dim sn-rise" style={{ animationDelay: "500ms" }}>
            <span className="sn-flip-glyph">↓</span>
            <span className="sn-flip-word">只出不进？</span>
          </div>
          <div className="sn-flip-arrow sn-flip-arrow-acc sn-pop" style={{ animationDelay: "1500ms" }}>
            <span className="sn-flip-glyph">↓ ↑</span>
            <span className="sn-flip-word">双向通信</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — accumulator 代码 */
  if (step === 1) {
    return (
      <div className="scene-pad sn-scene sn-code-scene">
        <div className="sn-codecard sn-rise">
          <div className="sn-codecard-bar">accumulator.py</div>
          <pre className="sn-code">{`def accumulator():
    total = 0
    while True:
        received = yield total
        total += received`}</pre>
        </div>
        <div className="sn-code-foot sn-rise" style={{ animationDelay: "1500ms" }}>
          收到一个数，<b>加进 total</b>
        </div>
      </div>
    );
  }

  /* step 2 — 核心一行 */
  if (step === 2) {
    return (
      <div className="scene-pad sn-scene sn-core-scene">
        <div className="sn-core-line sn-pop">
          received = <span className="sn-core-yield">yield total</span>
        </div>

        <div className="sn-core-notes">
          <div className="sn-core-note sn-rise" style={{ animationDelay: "1200ms" }}>
            <span className="sn-core-note-dir">向外 →</span>
            产出 total，函数暂停
          </div>
          <div className="sn-core-note sn-rise" style={{ animationDelay: "2200ms" }}>
            <span className="sn-core-note-dir">← 送回</span>
            send 的值赋给 received，恢复
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — priming 时间线 */
  if (step === 3) {
    return (
      <div className="scene-pad sn-scene sn-prime-scene">
        <div className="sn-prime-lead sn-rise">
          规矩：<span className="sn-prime-mono">next(gen)</span> 先启动
        </div>

        <div className="sn-prime-line">
          <span className="sn-prime-node sn-rise" style={{ animationDelay: "600ms" }}>
            <span className="sn-prime-node-k">①</span> next(gen) 启动
          </span>
          <span className="sn-prime-link" />
          <span className="sn-prime-node sn-prime-node-acc sn-rise" style={{ animationDelay: "1500ms" }}>
            <span className="sn-prime-node-k">②</span> 跑到 yield 暂停
          </span>
          <span className="sn-prime-link" />
          <span className="sn-prime-node sn-rise" style={{ animationDelay: "2400ms" }}>
            <span className="sn-prime-node-k">③</span> send(v) 恢复
          </span>
        </div>

        <div className="sn-prime-foot sn-rise" style={{ animationDelay: "3100ms" }}>
          这一步启动，<b>叫 priming</b>
        </div>
      </div>
    );
  }

  /* step 4 — priming 坑 */
  if (step === 4) {
    return (
      <div className="scene-pad sn-scene sn-trap-scene">
        <div className="sn-trap-code sn-rise">
          <span className="sn-trap-bad">gen.send(10)</span>
          <span className="sn-trap-note">跳过启动，直接发</span>
        </div>
        <div className="sn-trace sn-pop" style={{ animationDelay: "1000ms" }}>
          <div className="sn-trace-bar">TypeError</div>
          <pre className="sn-trace-code">cannot send non-None value to a just-started generator</pre>
        </div>
        <div className="sn-trap-fix sn-rise" style={{ animationDelay: "2200ms" }}>
          先 <span className="sn-trap-fix-mono">next(gen)</span>，再 send
        </div>
      </div>
    );
  }

  /* step 5 — 真机 */
  return (
    <div className="scene-pad sn-scene sn-term-scene">
      <div className="sn-term sn-rise">
        <div className="sn-term-bar">python3 generator_iterator.py</div>
        <div className="sn-term-body">
          <div className="sn-term-line sn-term-dim sn-line-in" style={{ animationDelay: "300ms" }}>
            accumulator:
          </div>
          <div className="sn-term-line sn-line-in" style={{ animationDelay: "1100ms" }}>
            send(10) -&gt; total=10
          </div>
          <div className="sn-term-line sn-line-in" style={{ animationDelay: "2100ms" }}>
            send(20) -&gt; total=30
          </div>
          <div className="sn-term-line sn-line-in" style={{ animationDelay: "3100ms" }}>
            send(30) -&gt; total=60
          </div>
        </div>
      </div>
      <div className="sn-term-foot sn-rise" style={{ animationDelay: "4100ms" }}>
        收一个，加一个，<b>双向都在干活</b>
      </div>
    </div>
  );
}
