import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./StateMachine.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const STAGES = [
  { cn: "还没点火", en: "NEW" },
  { cn: "正干着活", en: "RUNNABLE" },
  { cn: "干完了 · 报废", en: "TERMINATED" },
];

/** 烟花三态与状态的对应。 */
const FIREWORKS = [
  { label: "静置 · 摆设", en: "NEW" },
  { label: "点火升空", en: "RUNNABLE" },
  { label: "熄灭 · 报废", en: "TERMINATED" },
];

/** 线程入口表：事件 → 状态。 */
const ENTRIES = [
  { event: "创建完，没 start", state: "NEW" },
  { event: "调了 start()", state: "RUNNABLE" },
  { event: "run() 跑完", state: "TERMINATED" },
];

/** 烟花火箭（SVG 手绘：弹体 + 头锥 + 尾翼 + 引线；升空态带尾焰与爆点）。 */
function FireworkSvg({ variant }: { variant: 0 | 1 | 2 }) {
  const ink =
    variant === 1 ? "var(--accent)" : variant === 2 ? "var(--text-faint)" : "var(--text)";
  const body = variant === 2 ? "var(--surface-3)" : "var(--surface-2)";
  return (
    <svg viewBox="0 0 120 172" className="sm-fw-svg" aria-hidden>
      <g>
        <path
          d="M60 160 q 16 -4 10 -20"
          fill="none"
          stroke={ink}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect x="46" y="64" width="28" height="86" rx="11" fill={body} stroke={ink} strokeWidth="2.5" />
        <path
          d="M48 66 L60 30 L72 66 Z"
          fill={body}
          stroke={ink}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M46 122 L31 146 L46 142 Z" fill={ink} />
        <path d="M74 122 L89 146 L74 142 Z" fill={ink} />
        <circle cx="60" cy="88" r="8" fill="none" stroke={ink} strokeWidth="2.5" />
      </g>
      {variant === 1 && (
        <>
          <path
            d="M56 152 L50 168 M65 152 L61 170 M74 150 L72 166"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M98,9 102.4,19.9 114.2,20.7 105.1,28.3 108,39.8 98,33.5 88,39.8 90.9,28.3 81.8,20.7 93.6,19.9"
            fill="var(--accent)"
          />
        </>
      )}
      {variant === 2 && (
        <line x1="14" y1="98" x2="106" y2="78" stroke="var(--text-faint)" strokeWidth="3" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function StateMachineChapter({ step }: ChapterStepProps) {
  /* step 0 — 主角：threading.Thread */
  if (step === 0) {
    return (
      <div className="scene-pad sm-scene sm-hero-scene">
        <div className="label-mono sm-kicker sm-rise">主角 · THE CLASS</div>
        <div className="sm-hero-code mono sm-rise" style={delay(300)}>
          threading.<b>Thread</b>
        </div>
        <div className="sm-hero-sub sm-rise" style={delay(900)}>
          Python 自带 · 最底层的线程工具
        </div>
        <div className="sm-pool-card sm-rise" style={delay(2000)}>
          <span className="label-mono">线程池</span>
          预先雇好一批线程反复用 —— 底层都是它
        </div>
      </div>
    );
  }

  /* step 1 — 单行道：三阶段管线 + 状态机命名 */
  if (step === 1) {
    return (
      <div className="scene-pad sm-scene sm-pipe-scene">
        <div className="label-mono sm-kicker sm-rise">一句话心智模型 · 单行道</div>
        <div className="sm-pipeline">
          {STAGES.map((s, i) => (
            <div className="sm-pipe-item" key={s.en}>
              {i > 0 && (
                <span className="sm-pipe-arrow sm-rise" style={delay(700 + i * 500)}>→</span>
              )}
              <div className="sm-pipe-node sm-pop" style={delay(i * 500)}>
                <div className="sm-pipe-en mono">{s.en}</div>
                <div className="sm-pipe-cn">{s.cn}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="sm-pipe-note sm-rise" style={delay(2300)}>
          状态只会因为几件固定的事变来变去 —— 这叫<b className="sm-accent">状态机</b>
        </div>
      </div>
    );
  }

  /* step 2 — 烟花类比 + daemon 半空掐灭 */
  if (step === 2) {
    return (
      <div className="scene-pad sm-scene sm-fw-scene">
        <div className="sm-fw-cards">
          {FIREWORKS.map((f, i) => (
            <div className={`sm-fw-card sm-rise${i === 2 ? " sm-fw-card--dead" : ""}`} style={delay(i * 600)} key={f.en}>
              <div className="sm-fw-draw">
                <FireworkSvg variant={i as 0 | 1 | 2} />
              </div>
              <div className="sm-fw-label">{f.label}</div>
              <div className="sm-fw-en mono">{f.en}</div>
              {i === 1 && (
                <div className="sm-fw-branch sm-rise" style={delay(2200)}>
                  <span className="label-mono">daemon</span>半空掐灭
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="sm-fw-foot sm-rise" style={delay(2800)}>
          想再放，只能<b className="sm-accent">换新的</b>
        </div>
      </div>
    );
  }

  /* step 3~5 — 状态入口表（1 项 = 1 step：最新行激活，讲过的行灰化保留） */
  if (step === 3 || step === 4 || step === 5) {
    const last = step - 3;
    return (
      <div className="scene-pad sm-scene sm-entry-scene">
        <div className="label-mono sm-kicker sm-rise">三个状态怎么进</div>
        <div className="sm-entry-table">
          {ENTRIES.map((e, i) => {
            let state = "sm-entry--active";
            if (i > last) state = "sm-entry--todo";
            else if (i < last) state = "sm-entry--done";
            const isNew = i === last;
            return (
              <div className={`sm-entry ${state}${isNew ? " sm-rise" : ""}`} key={e.state}>
                <span className="sm-entry-event mono">{e.event}</span>
                <span className="sm-entry-arrow sm-rise" style={delay(isNew ? 500 : 0)}>→</span>
                <span className={`sm-entry-state mono${isNew ? " sm-entry-state--on" : ""}`}>{e.state}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* step 6 — is_alive 验证卡 */
  if (step === 6) {
    return (
      <div className="scene-pad sm-scene sm-alive-scene">
        <div className="sm-alive-q sm-rise">它现在在哪个状态？</div>
        <div className="sm-alive-call mono sm-rise" style={delay(500)}>
          is_alive() <span className="sm-alive-ask">← 用它问一嘴</span>
        </div>
        <div className="sm-alive-table">
          {STAGES.map((s, i) => {
            const alive = s.en === "RUNNABLE";
            return (
              <div className={`sm-alive-row sm-rise${alive ? " sm-alive-row--yes" : ""}`} style={delay(1300 + i * 450)} key={s.en}>
                <span className="sm-alive-en mono">{s.en}</span>
                <span className="sm-alive-cn">{s.cn}</span>
                <span className={`sm-alive-bool mono${alive ? " sm-alive-bool--true" : ""}`}>
                  {alive ? "True" : "False"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* step 6 — RUNNABLE 不等于正在 CPU 上跑 */
  return (
    <div className="scene-pad sm-scene sm-gil-scene">
      <div className="sm-gil-left">
        <div className="label-mono sm-kicker sm-rise">反直觉 · 但重要</div>
        <h1 className="sm-gil-hero sm-rise" style={delay(250)}>
          RUNNABLE
          <br />
          <span className="sm-gil-neq mono">≠</span> 正在 CPU 上跑
        </h1>
        <div className="sm-gil-note sm-rise" style={delay(2600)}>
          is_alive() 是 True —— <b className="sm-accent">只说明它没死</b>
        </div>
      </div>
      <div className="sm-gil-right sm-rise" style={delay(1200)}>
        <div className="label-mono sm-gil-tag">前面那把大锁 · GIL</div>
        <div className="sm-gil-queue">
          {["线程 1", "线程 2", "线程 3"].map((t) => (
            <span className="sm-gil-chip mono" key={t}>{t}</span>
          ))}
        </div>
        <div className="sm-gil-gate mono">GIL</div>
        <div className="sm-gil-pass mono">1 个线程真干活</div>
      </div>
    </div>
  );
}
