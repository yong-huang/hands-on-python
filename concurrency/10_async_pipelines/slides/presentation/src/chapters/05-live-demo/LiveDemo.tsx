import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./LiveDemo.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** article §Quick Start 真实输出的 §1 节选（屏幕写原样标识符）。 */
const SECTION_TITLE = "[1. 异步流水线：3 生产者 × 2 消费者 × 5000 条]";
const OUT_LINE = "5,000 条全部恰好处理一次，耗时 0.0024s（≈2,041,580 条/秒）";
const SUB_LINE = "单线程跑流水线：没有锁、没有 GIL 争用，只有 await 让出";

export default function LiveDemoChapter({ step }: ChapterStepProps) {
  /* step 0 — 转场：口说无凭，跑实验 */
  if (step === 0) {
    return (
      <div className="scene-pad ld-scene ld-go-scene">
        <div className="ld-go-top ld-rise" style={delay(200)}>
          数据量小、生产消费都快？
        </div>
        <div className="ld-go-mid ld-rise" style={delay(1000)}>
          直接顺序循环，<span className="ld-go-mute">别折腾</span>
        </div>
        <hr className="rule ld-go-rule ld-rise" style={delay(2000)} />
        <div className="ld-go-bottom ld-pop" style={delay(2400)}>
          口说无凭，<span className="ld-go-acc">跑实验</span>
        </div>
      </div>
    );
  }

  /* step 1 — 一行命令 */
  if (step === 1) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-term ld-rise" style={delay(150)}>
          <div className="ld-term-bar">
            <span className="ld-term-dot" />
            <span className="ld-term-dot" />
            <span className="ld-term-dot" />
            <span className="ld-term-title mono">zsh — async_pipelines</span>
          </div>
          <div className="ld-term-body">
            <div className="ld-term-line">
              <span className="ld-prompt mono">$</span>
              <span className="mono">python3 async_pipelines.py</span>
              <span className="ld-caret mono" />
            </div>
          </div>
        </div>
        <div className="ld-meta">
          <span className="ld-chip ld-pop" style={delay(1400)}>纯标准库 · 零依赖</span>
          <span className="ld-chip ld-pop" style={delay(1900)}>3 个实测小节</span>
          <span className="ld-chip ld-pop" style={delay(2400)}>跑完自动核对结果</span>
          <span className="ld-chip ld-chip--acc ld-pop" style={delay(2900)}>约 6 秒</span>
        </div>
      </div>
    );
  }

  /* step 2 — §1 输出 + 0.00 秒之谜 */
  if (step === 2) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-term ld-rise" style={delay(150)}>
          <div className="ld-term-bar">
            <span className="ld-term-dot" />
            <span className="ld-term-dot" />
            <span className="ld-term-dot" />
            <span className="ld-term-title mono">§1 · 5000 条流水线</span>
          </div>
          <div className="ld-term-body">
            <div className="ld-term-line ld-term-line--dim mono">{SECTION_TITLE}</div>
            <div className="ld-term-line ld-term-line--hot mono">
              {OUT_LINE}
              <span className="ld-mag ld-pop" style={delay(3400)}>← 放大看</span>
            </div>
          </div>
        </div>
        <div className="ld-zoom">
          <div className="ld-zoom-cell ld-pop" style={delay(4200)}>
            <span className="mono">0.0024 s</span>
            <span className="ld-zoom-note">秒 · 太小，不直观</span>
          </div>
          <span className="ld-zoom-arrow ld-rise" style={delay(4900)}>→</span>
          <div className="ld-zoom-cell ld-zoom-cell--true ld-pop" style={delay(5400)}>
            <span className="mono">2.4 ms</span>
            <span className="ld-zoom-note">换算成毫秒，一眼看懂</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — §1 小字：没有锁、没有 GIL 争用，只有 await 让出 */
  return (
    <div className="scene-pad ld-scene">
      <div className="ld-term ld-rise" style={delay(150)}>
        <div className="ld-term-bar">
          <span className="ld-term-dot" />
          <span className="ld-term-dot" />
          <span className="ld-term-dot" />
          <span className="ld-term-title mono">§1 · 那行小字</span>
        </div>
        <div className="ld-term-body">
          <div className="ld-term-line ld-term-line--dim mono">{OUT_LINE}</div>
          <div className="ld-term-line ld-term-line--hot mono">{SUB_LINE}</div>
        </div>
      </div>
      <div className="ld-gil">
        <div className="ld-stamps">
          <span className="ld-stamp ld-pop" style={delay(1200)}>没有锁</span>
          <span className="ld-stamp ld-pop" style={delay(1700)}>没有 GIL 争用</span>
          <span className="ld-stamp ld-stamp--acc ld-pop" style={delay(2200)}>只有 await 让出</span>
        </div>
        <div className="ld-gil-card ld-rise" style={delay(3200)}>
          <div className="ld-gil-head">
            <span className="label-mono">GIL · 全局解释器锁</span>
          </div>
          <div className="ld-gil-talk">
            全局大锁——同一时刻只放<b>一个线程</b>干活
          </div>
          <div className="ld-gil-verdict ld-pop" style={delay(4400)}>
            单线程流水线 · 根本没它什么事
          </div>
        </div>
      </div>
    </div>
  );
}
