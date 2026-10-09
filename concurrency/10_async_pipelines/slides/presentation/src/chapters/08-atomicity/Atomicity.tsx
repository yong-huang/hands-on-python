import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Atomicity.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const CODE_LINE = "results[item] = results.get(item, 0) + 1";

export default function AtomicityChapter({ step }: ChapterStepProps) {
  /* step 0 — 核心代码：读改写三步，线程版必须上锁 */
  if (step === 0) {
    return (
      <div className="scene-pad at-scene">
        <div className="at-head at-rise">
          <span className="label-mono">最核心的一行 · 多个消费者并发执行</span>
        </div>
        <div className="at-code at-rise" style={delay(300)}>
          <span className="mono">{CODE_LINE}</span>
        </div>
        <div className="at-steps">
          {[
            { name: "读", code: "results.get(item, 0)", at: 1600 },
            { name: "改", code: "+ 1", at: 3000 },
            { name: "写", code: "results[item] =", at: 4400 },
          ].map((s, i) => (
            <div className="at-step-cell" key={s.name}>
              {i > 0 && (
                <span className="at-step-gap at-rise" style={delay(s.at - 500)}>
                  间隙·可被切换打断
                </span>
              )}
              <div className="at-step at-rise" style={delay(s.at)}>
                <span className="at-step-name">{s.name}</span>
                <span className="at-step-code mono">{s.code}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="at-lock-row at-rise" style={delay(5800)}>
          <span className="at-lock-badge">线程版 · 必须上锁</span>
          <span className="at-lock-talk">三步之间的间隙，会被线程切换插进来</span>
        </div>
      </div>
    );
  }

  /* step 1 — 异步版敢裸写：同步段天然原子 */
  if (step === 1) {
    return (
      <div className="scene-pad at-scene">
        <div className="at-head at-head--ok at-rise">
          <span className="label-mono">异步版 · 零锁裸写</span>
        </div>
        <div className="at-code at-code--scan at-rise" style={delay(300)}>
          <span className="mono">{CODE_LINE}</span>
          <span className="at-scan-line at-scan-sweep" />
        </div>
        <div className="at-scan-note at-rise" style={delay(1600)}>
          这几行之间 <b className="mono">没有 await</b> —— 只有 await 点才会切换
        </div>
        <div className="at-atomic at-pop" style={delay(2800)}>
          天然原子
        </div>
        <div className="at-dividend at-rise" style={delay(4000)}>
          <span className="label-mono">asyncio 红利</span>
          同步段天然原子
        </div>
      </div>
    );
  }

  /* step 2 — 边界：插进 await 即破裂 */
  return (
    <div className="scene-pad at-scene">
      <div className="at-head at-head--warn at-rise">
        <span className="label-mono">边界 · 同样清晰</span>
      </div>
      <div className="at-code at-code--broken at-rise" style={delay(300)}>
        <span className="mono">results[item] = results.get(item, 0)</span>
        <span className="at-break-await mono at-pop" style={delay(1600)}>
          await asyncio.sleep(0)
        </span>
        <span className="mono">+ 1</span>
        <span className="at-break-line at-break-draw" style={delay(2800)} />
      </div>
      <div className="at-break-word at-pop" style={delay(3400)}>原子性 · 当场破裂</div>
      <div className="at-motto">
        <span className="at-motto-ok at-rise" style={delay(4400)}>await 之前 · 安全</span>
        <span className="at-motto-no at-rise" style={delay(5200)}>之后 · 不一定</span>
      </div>
    </div>
  );
}
