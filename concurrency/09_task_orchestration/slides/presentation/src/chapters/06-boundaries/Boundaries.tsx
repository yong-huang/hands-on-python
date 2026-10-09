import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Boundaries.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function BoundariesChapter({ step }: ChapterStepProps) {
  /* step 0 — 超时即取消 + 协作式约束 */
  if (step === 0) {
    return (
      <div className="scene-pad bd-scene">
        <div className="bd-head bd-rise">
          <span className="label-mono">边界 · wait_for</span>
        </div>
        <div className="bd-eq-hero bd-rise" style={delay(200)}>
          超时 <span className="bd-eq-sign">＝</span> <span className="bd-eq-accent">取消</span>
        </div>
        <div className="bd-eq-proof bd-rise" style={delay(1200)}>
          <span className="mono bd-proof-num">201ms</span>
          <span>准时触发，就是证据</span>
        </div>
        <div className="bd-eq-limit bd-rise" style={delay(3200)}>
          但它同样<b>协作式</b>——死循环不让出，超时也没办法
        </div>
      </div>
    );
  }

  /* step 1 — gather 只收集不取消 vs TaskGroup */
  if (step === 1) {
    return (
      <div className="scene-pad bd-scene">
        <div className="bd-head bd-rise">
          <span className="label-mono">边界 · gather</span>
        </div>
        <div className="bd-gather-hero bd-rise" style={delay(200)}>
          关键差异：只<b>收集</b>，<span className="bd-eq-accent">不取消</span>
        </div>
        <div className="bd-vs-row">
          <div className="bd-vs-card bd-rise" style={delay(1400)}>
            <div className="bd-vs-title mono">gather · 默认</div>
            <div className="bd-vs-line"><span className="mono">A ✓</span></div>
            <div className="bd-vs-line bd-vs-bad"><span className="mono">B ✕ 抛异常</span><span className="bd-vs-talk">后面的结果被丢掉</span></div>
            <div className="bd-vs-line bd-vs-dim"><span className="mono">C 继续跑完</span><span className="bd-vs-talk">没人等它</span></div>
          </div>
          <div className="bd-vs-card bd-vs-tg bd-rise" style={delay(3600)}>
            <div className="bd-vs-title mono">TaskGroup</div>
            <div className="bd-vs-line">一个失败 → <b>全员叫停</b></div>
            <div className="bd-vs-talk-row">必须全成、否则全撤的活儿</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 用时间证明取消真的发生 */
  if (step === 2) {
    return (
      <div className="scene-pad bd-scene">
        <div className="bd-head bd-rise">
          <span className="label-mono">最核心的一处代码</span>
        </div>
        <div className="bd-proof-hero bd-rise" style={delay(200)}>
          用<b>时间</b>证明取消真的发生
        </div>
        <div className="bd-assert bd-rise" style={delay(1200)}>
          <span className="mono bd-assert-code">{'assert elapsed < 0.5'}</span>
          <span className="bd-assert-talk">秒表一量，总耗时必须小于 0.5 秒</span>
        </div>
        <div className="bd-axis-wrap bd-rise" style={delay(3400)}>
          <div className="bd-axis-bar">
            <div className="bd-axis-mark bd-mark-boom" style={{ left: "10%" }}>
              <b>0.1s</b><span>引爆点</span>
            </div>
            <div className="bd-axis-mark bd-mark-line" style={{ left: "50%" }}>
              <b>0.5s</b><span>断言线</span>
            </div>
            <div className="bd-axis-mark bd-mark-slow" style={{ left: "90%" }}>
              <b>1.0s</b><span>慢任务全程</span>
            </div>
          </div>
        </div>
        <div className="bd-proof-note bd-rise" style={delay(6200)}>
          只有慢任务<b>真被取消</b>，才可能跑进 0.5 秒
        </div>
      </div>
    );
  }

  /* step 3 — 清理记号：双重证明 */
  return (
    <div className="scene-pad bd-scene">
      <div className="bd-head bd-rise">
        <span className="label-mono">双重证明</span>
      </div>
      <div className="bd-double-row">
        <div className="bd-double-card bd-rise" style={delay(200)}>
          <div className="bd-double-ord mono">证据一 · 及时</div>
          <div className="bd-double-name">102ms &lt; 0.5s</div>
          <div className="bd-double-talk">时间断言卡在线中间</div>
        </div>
        <div className="bd-double-card bd-rise" style={delay(1800)}>
          <div className="bd-double-ord mono">证据二 · 干净</div>
          <div className="bd-double-name">「我清理过了」✓</div>
          <div className="bd-double-talk">finally 执行时，打上记号</div>
        </div>
      </div>
      <div className="bd-double-final bd-rise" style={delay(3400)}>
        取消，既<b>及时</b>，又<b>干净</b>
      </div>
    </div>
  );
}
