import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Mechanism.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/* step 0 · asyncio.run = 三步打包 */
function RunThreeSteps() {
  return (
    <div className="me-run">
      <div className="me-run-kicker me-fade">机制细节 · 之一</div>
      <div className="me-run-hero me-hero-in" style={delay(300)}>
        asyncio.run 做了什么？
      </div>
      <div className="me-run-flow">
        {["新建事件循环", "跑到结束", "最后清理"].map((s, i) => (
          <div className="me-run-step" key={s}>
            {i > 0 && (
              <svg viewBox="0 0 80 24" aria-hidden className="me-run-arrow me-fade" style={delay(1600 + i * 700)}>
                <line x1="0" y1="12" x2="60" y2="12" stroke="var(--text)" strokeWidth="2.5" />
                <path d="M60 4 L78 12 L60 20 Z" fill="var(--text)" />
              </svg>
            )}
            <div className="me-run-box me-pop" style={delay(1300 + i * 700)}>
              <span className="me-run-num">{i + 1}</span>
              {s}
            </div>
          </div>
        ))}
      </div>
      <div className="me-run-note me-rise" style={delay(4200)}>
        跟手动一步步建循环对照，结果完全一致 —— 它只是替你<b>打包好了</b>，没有别的名堂。
      </div>
    </div>
  );
}

/* step 1 · 循环里的两张表 */
function TwoTables() {
  return (
    <div className="me-tables">
      <div className="me-run-kicker me-fade">机制细节 · 之二</div>
      <div className="me-run-hero me-hero-in" style={delay(300)}>
        循环内部，靠两样东西排班
      </div>
      <div className="me-tables-grid">
        <div className="me-table-card me-card-in" style={delay(1100)}>
          <div className="me-table-name">就绪队列</div>
          <div className="me-table-gloss">「立刻能跑」的队伍</div>
          <div className="me-queue">
            {["任务", "任务", "任务"].map((t, i) => (
              <span key={i} className="me-queue-cell me-pop" style={delay(1900 + i * 300)}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="me-table-card me-card-in" style={delay(1700)}>
          <div className="me-table-name">定时器堆</div>
          <div className="me-table-gloss">「睡着的人」的闹钟表 —— 就是前面说的那张</div>
          <div className="me-alarm">
            {["0.3s", "1s", "5s"].map((t, i) => (
              <span key={t} className="me-alarm-cell me-pop" style={delay(2500 + i * 300)}>
                <span className="me-alarm-clock" />
                {t}
              </span>
            ))}
          </div>
          <div className="me-table-move me-fade" style={delay(4000)}>
            到点 → 搬回就绪队列
          </div>
        </div>
      </div>
    </div>
  );
}

/* step 2 · 铁律：一个线程一个循环 */
function OneLoopRule() {
  return (
    <div className="me-rule">
      <div className="me-rule-hero me-hero-in">
        一个线程，同时只能有
        <br />
        <em>一个</em>运行中的事件循环。
      </div>
      <div className="me-rule-term me-card-in" style={delay(1600)}>
        <div className="me-rule-term-line">
          <span className="me-rule-prompt">&gt;&gt;&gt;</span> 在协程里再调 asyncio.run(…)
        </div>
        <div className="me-rule-term-line me-rule-err me-fade" style={delay(3000)}>
          RuntimeError: asyncio.run() cannot be called from a running event loop
        </div>
      </div>
      <div className="me-rule-note me-rise" style={delay(4400)}>
        直接报错，没有商量。
      </div>
    </div>
  );
}

function MechanismInner({ step }: ChapterStepProps) {
  if (step === 0) return <RunThreeSteps />;
  if (step === 1) return <TwoTables />;
  return <OneLoopRule />;
}

export default function Mechanism({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <MechanismInner step={step} />
    </div>
  );
}
