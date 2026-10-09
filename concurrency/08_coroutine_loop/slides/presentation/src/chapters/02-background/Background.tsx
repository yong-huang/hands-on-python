import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Background.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/* step 0 · 上万条连接，谁处理？——连接点阵 + 每条连一根线程 */
function WhoHandles() {
  return (
    <div className="bk-who">
      <div className="bk-who-hero bk-hero-in">上万条连接，同时在等数据。</div>
      <div className="bk-who-q bk-hero-in" style={delay(700)}>
        靠谁处理？
      </div>
      <div className="bk-thread-farm bk-fade" style={delay(1600)}>
        {Array.from({ length: 3 }, (_, row) => (
          <div className="bk-thread-row" key={row}>
            {Array.from({ length: 10 }, (_, col) => (
              <div className="bk-thread-unit" key={col} style={delay(1900 + (row * 10 + col) * 45)}>
                <span className="bk-conn-dot" />
                <span className="bk-thread-line" />
              </div>
            ))}
          </div>
        ))}
        <div className="bk-thread-ellipsis bk-fade" style={delay(3600)}>每条连接，各占一条线程 —— 上千条连接，就是上千个线程</div>
      </div>
      <div className="bk-default bk-rise" style={delay(4200)}>
        默认答案：<strong>线程</strong> —— 一个任务占一条线程，切换交给操作系统
      </div>
    </div>
  );
}

/* step 1 · 成本上涨：柱状图线性爬升，绝大多数是空心的「干等」 */
function CostChart() {
  const bars = [
    { conn: "100", h: 34, idle: false },
    { conn: "1,000", h: 118, idle: false },
    { conn: "10,000", h: 236, idle: true },
  ];
  return (
    <div className="bk-cost">
      <div className="bk-cost-hero bk-hero-in">
        内存和来回切换的开销，
        <br />
        跟着「同时要对付的任务数」<em>直线上涨</em>。
      </div>
      <div className="bk-cost-chart bk-fade" style={delay(1400)}>
        <svg viewBox="0 0 760 320" aria-hidden>
          <line x1="40" y1="290" x2="740" y2="290" stroke="var(--rule)" strokeWidth="2" />
          {bars.map((b, i) => (
            <g key={b.conn} className="bk-bar" style={delay(1800 + i * 900)}>
              <rect
                x={110 + i * 220}
                y={290 - b.h}
                width={130}
                height={b.h}
                style={delay(1800 + i * 900)}
                fill={b.idle ? "none" : "var(--surface-3)"}
                stroke={b.idle ? "var(--text-faint)" : "var(--text)"}
                strokeWidth="2"
                strokeDasharray={b.idle ? "7 7" : undefined}
              />
              <text x={175 + i * 220} y={310} textAnchor="middle" fill="var(--text-mute)" fontSize="21" style={{ fontFamily: "var(--font-mono)", animationDelay: `${2700 + i * 900}ms` }}>
                {b.conn} 条连接
              </text>
            </g>
          ))}
          <text x="620" y="60" fill="var(--accent)" fontSize="23" style={{ fontFamily: "var(--font-body)" }} className="bk-idle-note" {...delay(4600)}>
            绝大多数线程，只是在干等
          </text>
        </svg>
      </div>
    </div>
  );
}

/* step 2 · 第二撞墙点：抢占式 + GIL 大锁 */
function WallTwo() {
  return (
    <div className="bk-wall">
      <div className="bk-wall-title bk-hero-in">第二个撞墙点：切换，你的代码说了不算。</div>
      <div className="bk-wall-grid">
        <div className="bk-wall-card bk-card-in" style={delay(900)}>
          <div className="bk-wall-card-title">抢占式调度</div>
          <svg viewBox="0 0 380 190" aria-hidden>
            <text x="14" y="30" fill="var(--text-mute)" fontSize="20" style={{ fontFamily: "var(--font-mono)" }}>任务 A</text>
            <line x1="90" y1="24" x2="360" y2="24" stroke="var(--rule)" strokeWidth="6" />
            <text x="14" y="86" fill="var(--text-mute)" fontSize="20" style={{ fontFamily: "var(--font-mono)" }}>任务 B</text>
            <line x1="90" y1="80" x2="360" y2="80" stroke="var(--rule)" strokeWidth="6" />
            <text x="14" y="142" fill="var(--text-mute)" fontSize="20" style={{ fontFamily: "var(--font-mono)" }}>任务 C</text>
            <line x1="90" y1="136" x2="360" y2="136" stroke="var(--rule)" strokeWidth="6" />
            {[140, 210, 320, 165, 260, 300].map((x, i) => (
              <g key={i} className="bk-switch-mark" style={delay(1900 + i * 380)}>
                <line x1={x} y1={i < 3 ? 6 : 62} x2={x} y2={i < 3 ? 42 : 98} stroke="var(--accent)" strokeWidth="3" strokeDasharray="4 4" />
                <circle cx={x} cy={i < 3 ? 24 : 80} r="7" fill="var(--accent)" />
              </g>
            ))}
            <text x="90" y="176" fill="var(--text-2)" fontSize="20" style={{ fontFamily: "var(--font-body)" }} className="bk-fade" {...delay(4400)}>
              操作系统想切就切，根本拦不住
            </text>
          </svg>
        </div>
        <div className="bk-wall-card bk-card-in" style={delay(1500)}>
          <div className="bk-wall-card-title">GIL · 全局解释器锁</div>
          <div className="bk-gil">
            <div className="bk-gil-lock bk-pop" style={delay(2500)}>锁</div>
            <div className="bk-gil-lane bk-fade" style={delay(3000)}>
              <span className="bk-gil-run">线程 1 · 真干活</span>
              <span className="bk-gil-wait">线程 2 · 排队</span>
              <span className="bk-gil-wait">线程 3 · 排队</span>
            </div>
          </div>
          <div className="bk-wall-card-note bk-fade" style={delay(3800)}>同一时刻，只放一个线程干活</div>
        </div>
      </div>
      <div className="bk-wall-punch bk-rise" style={delay(5200)}>
        先执行哪句、后执行哪句，每次都不一样 —— 出了问题，根本没法查。
      </div>
    </div>
  );
}

/* step 3 · 把切换权拿回来 */
function TakeBack() {
  return (
    <div className="bk-takeback">
      <div className="bk-takeback-hero bk-hero-in">把切换权，从操作系统手里拿回来。</div>
      <div className="bk-yield-card bk-card-in" style={delay(1200)}>
        <span className="bk-yield-quote">任务在等待点主动让出 ——</span>
        <span className="bk-yield-say">「我先歇会，你先上。」</span>
      </div>
      <div className="bk-takeback-result bk-rise" style={delay(2600)}>
        这么一来，<strong>一个线程</strong>就能同时照看<strong>上万条连接</strong>。
      </div>
    </div>
  );
}

/* step 4 · asyncio 登场 */
function AsyncioEnter() {
  return (
    <div className="bk-enter">
      <div className="bk-enter-kicker bk-fade">这套思路，做成了 Python 自带的工具</div>
      <div className="bk-enter-plate bk-hero-in" style={delay(500)}>
        asyncio
      </div>
      <div className="bk-enter-timeline">
        <div className="bk-tl-item bk-rise" style={delay(1500)}>
          <span className="bk-tl-ver">3.4</span>
          <span className="bk-tl-desc">进入官方工具箱（标准库）</span>
        </div>
        <div className="bk-tl-line bk-draw" style={delay(2100)} />
        <div className="bk-tl-item bk-rise" style={delay(2500)}>
          <span className="bk-tl-ver">3.5</span>
          <span className="bk-tl-desc">
            有了 <code>async</code>、<code>await</code> 这对专用写法
          </span>
        </div>
      </div>
      <div className="bk-enter-note bk-rise" style={delay(3600)}>
        今天讲的整套机制，都架在它上面。
      </div>
    </div>
  );
}

function BackgroundInner({ step }: ChapterStepProps) {
  if (step === 0) return <WhoHandles />;
  if (step === 1) return <CostChart />;
  if (step === 2) return <WallTwo />;
  if (step === 3) return <TakeBack />;
  return <AsyncioEnter />;
}

export default function Background({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <BackgroundInner step={step} />
    </div>
  );
}
