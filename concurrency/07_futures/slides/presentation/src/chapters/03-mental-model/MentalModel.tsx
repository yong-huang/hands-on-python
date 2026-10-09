import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./MentalModel.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** as_completed：完成序放行示意（快/中/慢三道，先完成先出场）。 */
const LANES = [
  { name: "快任务", grow: 500, dur: 700, out: 2600 },
  { name: "中任务", grow: 800, dur: 1100, out: 4200 },
  { name: "慢任务", grow: 1100, dur: 1600, out: 5800 },
] as const;

export default function MentalModelChapter({ step }: ChapterStepProps) {
  /* step 0 — 走一遍流程：submit 立刻给欠条，后厨开工 */
  if (step === 0) {
    return (
      <div className="scene-pad fw-scene fw-flow-scene">
        <div className="label-mono fw-rise">新接口怎么用 · 走一遍流程</div>
        <div className="fw-flow">
          <div className="fw-submit mono fw-pop" style={delay(1800)}>
            submit（提交）
          </div>
          <span className="fw-flow-arrow fw-grow" style={delay(2800)}>→</span>
          <div className="fw-receipt card fw-pop" style={delay(3300)}>
            <div className="mono fw-receipt-tag">Future</div>
            <div className="fw-receipt-main">欠条</div>
          </div>
        </div>
        <div className="fw-kitchen fw-pop" style={delay(4800)}>
          <span className="label-mono">后厨（worker）</span>
          <div className="fw-kitchen-dots">
            {[0, 1, 2].map((i) => (
              <span className="fw-dot fw-dot--work" style={delay(5400 + i * 300)} key={i} />
            ))}
          </div>
          <span className="fw-kitchen-talk">已经开工</span>
        </div>
        <div className="fw-flow-note mono fw-rise" style={delay(6600)}>
          立刻返回 —— 不等执行完
        </div>
      </div>
    );
  }

  /* step 1 — 唯一取货口：result 三件事 */
  if (step === 1) {
    const ports = [
      { verb: "取结果", talk: "活儿的产出，从这儿拿" },
      { verb: "收异常", talk: "worker 里炸的错，从这儿抛给你" },
      { verb: "带超时", talk: "等不到就先走，result(0.2)" },
    ];
    return (
      <div className="scene-pad fw-scene fw-port-scene">
        <div className="fw-port-receipt card fw-pop" style={delay(300)}>
          <div className="mono fw-receipt-tag">Future</div>
          <div className="fw-port-hero">
            唯一取货口：<span className="mono">result</span>
          </div>
        </div>
        <div className="fw-ports">
          {ports.map((p, i) => (
            <div className="fw-port-row fw-rise" style={delay(2400 + i * 1600)} key={p.verb}>
              <span className="fw-port-verb">{p.verb}</span>
              <span className="fw-port-talk">{p.talk}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 2 — as_completed：谁先干完谁先出来 */
  if (step === 2) {
    return (
      <div className="scene-pad fw-scene fw-lanes-scene">
        <div className="fw-lanes-head fw-rise">
          <span className="label-mono">新姿势 · as_completed</span>
          <span className="fw-lanes-sub">按完成的顺序放行</span>
        </div>
        <div className="fw-lanes">
          {LANES.map((l) => (
            <div className="fw-lane" key={l.name}>
              <span className="fw-lane-name mono">{l.name}</span>
              <div className="fw-lane-track">
                <div
                  className="fw-lane-bar fw-lane-bar--grow"
                  style={{ animationDelay: `${l.grow}ms`, animationDuration: `${l.dur}ms` }}
                />
              </div>
              <span className="fw-lane-out mono fw-pop" style={delay(l.out)}>出</span>
            </div>
          ))}
        </div>
        <div className="fw-lanes-hero fw-rise" style={delay(6600)}>
          谁先干完，<span className="fw-accent">谁先出来</span>
        </div>
      </div>
    );
  }

  /* step 3 — 餐厅取餐心智模型 */
  if (step === 3) {
    const scenes = [
      { tag: "01", name: "递小票", talk: "submit" },
      { tag: "02", name: "找位子刷手机", talk: "不等，该干嘛干嘛" },
      { tag: "03", name: "叫到号", talk: "欠条就绪" },
      { tag: "04", name: "取餐走人", talk: "result 取货" },
    ];
    return (
      <div className="scene-pad fw-scene fw-rest-scene">
        <div className="label-mono fw-rise">把它想象成餐厅取餐</div>
        <div className="fw-rest-row">
          {scenes.map((s, i) => (
            <div className="fw-rest-cell" key={s.tag}>
              {i > 0 && <span className="fw-rest-arrow fw-grow" style={delay(1200 + i * 900)}>→</span>}
              <div className="fw-rest-card fw-pop" style={delay(400 + i * 900)}>
                <div className="mono fw-rest-tag">{s.tag}</div>
                <div className="fw-rest-name">{s.name}</div>
                <div className="mono fw-rest-talk">{s.talk}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 4 — 呼叫器的坑：异常藏在欠条里 */
  if (step === 4) {
    return (
      <div className="scene-pad fw-scene fw-pit-scene">
        <div className="fw-pit-lost fw-rise" style={delay(600)}>
          没人去取，<span className="fw-accent">做坏的餐就没人收拾</span>
        </div>
        <div className="fw-pit-flow">
          <div className="fw-pit-worker card fw-pop" style={delay(2600)}>
            <span className="fw-err-dot" />
            <span className="mono">worker</span>
            <span className="fw-pit-error mono fw-pop" style={delay(3800)}>出错</span>
          </div>
          <div className="fw-pit-receipt card fw-pop" style={delay(5400)}>
            <div className="mono fw-receipt-tag">Future · 欠条</div>
            <div className="fw-pit-hidden mono fw-pop" style={delay(7200)}>
              异常藏在这里
            </div>
          </div>
        </div>
        <div className="fw-pit-hero fw-rise" style={delay(9600)}>
          不吵不闹，<span className="fw-accent">只是消失</span>
        </div>
      </div>
    );
  }

  /* step 5 — cancel 的边界（fallthrough 兜底步） */
  return (
    <div className="scene-pad fw-scene fw-cancel-scene">
      <div className="label-mono fw-rise">小票也不能让后厨停工 · cancel</div>
      <div className="fw-cancel-duo">
        <div className="fw-cancel-card card fw-pop" style={delay(700)}>
          <div className="fw-cancel-name">还没下锅的订单</div>
          <div className="fw-cancel-talk">排队中，还没开工</div>
          <div className="fw-cancel-verdict mono fw-pop" style={delay(2400)}>可撤 ✓</div>
        </div>
        <div className="fw-cancel-card card fw-pop" style={delay(3600)}>
          <div className="fw-cancel-name">已经做上的</div>
          <div className="fw-cancel-talk">后厨正在炒</div>
          <div className="fw-cancel-verdict mono fw-pop" style={delay(5200)}>撤不了 ✗</div>
        </div>
      </div>
    </div>
  );
}
