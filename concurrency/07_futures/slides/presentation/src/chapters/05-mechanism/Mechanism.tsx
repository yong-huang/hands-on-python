import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Mechanism.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 对号表：提交时的 future → 业务键 映射（article {future: tag} 惯例）。 */
const LEDGER = [
  { future: "快任务", key: "C" },
  { future: "中任务", key: "B" },
  { future: "慢任务", key: "A" },
] as const;

export default function MechanismChapter({ step }: ChapterStepProps) {
  /* step 0 — 欠条机制：凭据先到 */
  if (step === 0) {
    return (
      <div className="scene-pad me-scene me-note-scene">
        <div className="me-note-head me-rise" style={delay(400)}>
          <span className="label-mono">机制一 · 欠条本身</span>
        </div>
        <div className="me-note-flow">
          <div className="me-note-t0 card me-pop" style={delay(1200)}>
            <span className="mono">t = 0</span>
            <span className="me-note-verb">submit</span>
          </div>
          <span className="me-note-arrow me-grow" style={delay(2400)}>→</span>
          <div className="me-note-receipt card me-pop" style={delay(3000)}>
            <div className="mono me-note-tag">凭据 · Future</div>
            <div className="me-note-main">立刻到手</div>
          </div>
          <span className="me-note-arrow me-note-arrow--ghost me-grow" style={delay(4400)}>→</span>
          <div className="me-note-later me-pop" style={delay(5000)}>
            结果 · 稍后才好
          </div>
        </div>
        <div className="me-note-hero me-rise" style={delay(6600)}>
          结果没好，<span className="me-accent">凭据先到</span>
        </div>
      </div>
    );
  }

  /* step 1 — map：保序但全批等齐 */
  if (step === 1) {
    return (
      <div className="scene-pad me-scene me-map-scene">
        <div className="me-map-head me-rise" style={delay(300)}>
          <span className="label-mono">as_completed 的对面 · 自带的 map</span>
        </div>
        <div className="me-map-chart">
          {["任务 1", "任务 2", "任务 3", "任务 4"].map((t, i) => (
            <div className="me-map-row" key={t}>
              <span className="me-map-name mono">{t}</span>
              <div className="me-map-bar me-grow" style={delay(900 + i * 320)} />
            </div>
          ))}
          <div className="me-map-gate me-rise" style={delay(3600)}>
            <span className="me-map-gate-line" />
            <span className="me-map-gate-tag mono">全批等齐 —— 等最慢的</span>
          </div>
        </div>
        <div className="me-map-hero me-rise" style={delay(6200)}>
          保持<span className="me-accent">原序</span>收，任务均匀用 map 省心
        </div>
      </div>
    );
  }

  /* step 2 — 取舍 */
  if (step === 2) {
    return (
      <div className="scene-pad me-scene me-pick-scene">
        <div className="me-pick-hero me-rise" style={delay(300)}>
          耗时差距大，要先完成的先处理
        </div>
        <div className="me-pick-formula mono me-pop" style={delay(1500)}>
          submit + as_completed
        </div>
      </div>
    );
  }

  /* step 3 — 代价：对号表 */
  if (step === 3) {
    return (
      <div className="scene-pad me-scene me-ledger-scene">
        <div className="me-ledger-hero me-rise" style={delay(300)}>
          完成顺序，<span className="me-accent">不一定是提交顺序</span>
        </div>
        <div className="me-ledger-flow">
          <div className="me-ledger-col">
            <div className="me-ledger-label mono me-rise" style={delay(1200)}>提交时</div>
            {["慢任务 A", "中任务 B", "快任务 C"].map((t, i) => (
              <div className="me-ledger-chip mono me-pop" style={delay(1600 + i * 400)} key={t}>
                {t}
              </div>
            ))}
          </div>
          <div className="me-ledger-book card me-pop" style={delay(4200)}>
            <div className="me-ledger-book-tag mono">对号表</div>
            {LEDGER.map((l, i) => (
              <div className="me-ledger-entry mono me-rise" style={delay(4800 + i * 400)} key={l.future}>
                <span>{l.future}</span>
                <span className="me-ledger-arrow">→</span>
                <span className="me-accent">{l.key}</span>
              </div>
            ))}
          </div>
          <div className="me-ledger-col">
            <div className="me-ledger-label mono me-rise" style={delay(3000)}>完成时</div>
            {["快任务 C", "中任务 B", "慢任务 A"].map((t, i) => (
              <div className="me-ledger-chip mono me-pop" style={delay(3400 + i * 400)} key={t}>
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="me-ledger-note me-rise" style={delay(6300)}>收结果时，查表入座</div>
      </div>
    );
  }

  /* step 4 — 异常：暂存，result 那刻才抛 */
  if (step === 4) {
    return (
      <div className="scene-pad me-scene me-store-scene">
        <div className="me-store-head me-rise" style={delay(300)}>
          <span className="label-mono">机制 · 异常的规矩就一条</span>
        </div>
        <div className="me-store-flow">
          <div className="me-store-worker card me-pop" style={delay(900)}>
            <span className="me-store-dot" />
            <span className="mono">worker</span>
            <span className="me-store-error mono me-pop" style={delay(2000)}>出错</span>
          </div>
          <span className="me-store-arrow me-grow" style={delay(2800)}>→</span>
          <div className="me-store-receipt card me-pop" style={delay(3400)}>
            <div className="mono me-store-tag">Future 欠条</div>
            <div className="me-store-pocket mono me-pop" style={delay(4200)}>
              异常 · 暂存中
            </div>
          </div>
        </div>
        <div className="me-store-trigger">
          <span className="me-store-btn mono me-pop" style={delay(5800)}>result() 被调用的那一刻</span>
          <span className="me-store-out mono me-pop" style={delay(7000)}>异常，原样抛出 →</span>
        </div>
      </div>
    );
  }

  /* step 5 — 行规两条 */
  if (step === 5) {
    return (
      <div className="scene-pad me-scene me-rule-scene">
        <div className="me-rule-head me-rise" style={delay(300)}>
          <span className="label-mono">所以 · 行规就两条</span>
        </div>
        <div className="me-rule-duo">
          <div className="me-rule-card card me-pop" style={delay(1100)}>
            <div className="mono me-rule-ord">①</div>
            <div className="me-rule-name mono">as_completed</div>
            <div className="me-rule-talk">统一取 —— 每张都过一遍手</div>
          </div>
          <div className="me-rule-card card me-pop" style={delay(4400)}>
            <div className="mono me-rule-ord">②</div>
            <div className="me-rule-name">完工提醒（回调）</div>
            <div className="me-rule-talk">活一干完，自动帮你查一遍有没有出错</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — 超时与撤单边界 */
  if (step === 6) {
    return (
      <div className="scene-pad me-scene me-edge-scene">
        <div className="me-edge-head me-rise" style={delay(300)}>
          <span className="label-mono">边界也要说清</span>
        </div>
        <div className="me-edge-duo">
          <div className="me-edge-card card me-pop" style={delay(900)}>
            <div className="me-edge-name">超时</div>
            <div className="me-edge-row me-rise" style={delay(2200)}>
              <span className="me-edge-key">你</span>
              <span className="me-edge-val">先走，不再等</span>
            </div>
            <div className="me-edge-row me-rise" style={delay(3200)}>
              <span className="me-edge-key">任务</span>
              <span className="me-edge-val">照跑，没人杀它</span>
            </div>
          </div>
          <div className="me-edge-card card me-pop" style={delay(4200)}>
            <div className="me-edge-name mono">cancel</div>
            <div className="me-edge-row me-rise" style={delay(5400)}>
              <span className="me-edge-key">排队的</span>
              <span className="me-edge-val">能撤 ✓</span>
            </div>
            <div className="me-edge-row me-rise" style={delay(6400)}>
              <span className="me-edge-key">运行中的</span>
              <span className="me-edge-val">撤不了 ✗</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 7 — 到点必须停（fallthrough 兜底步） */
  return (
    <div className="scene-pad me-scene me-stop-scene">
      <div className="me-stop-left card me-pop" style={delay(800)}>
        <div className="me-stop-tag mono">把退出开关做进任务里</div>
        <div className="me-stop-switch mono me-pop" style={delay(2400)}>
          停止标志 [ ON ]
        </div>
        <div className="me-stop-talk me-rise" style={delay(3400)}>任务自己看标志，收工</div>
      </div>
      <div className="me-stop-right card me-pop" style={delay(5000)}>
        <div className="me-stop-tag mono">Python 3.9 起 · 进程池收摊</div>
        <div className="me-stop-queue">
          {["排队 1", "排队 2", "排队 3"].map((q, i) => (
            <span className="me-stop-queued mono me-pop" style={delay(6200 + i * 350)} key={q}>
              {q}
            </span>
          ))}
        </div>
        <div className="me-stop-talk me-rise" style={delay(7600)}>顺手取消所有正在排队的</div>
      </div>
    </div>
  );
}
