import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./SingleThread.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const ORDER = ["A1", "B1", "A2", "B2", "A3", "B3"];

/* step 0 · 双泳道交错 + 断言核对 */
function Interleave() {
  return (
    <div className="sg-ile">
      <div className="sg-ile-kicker sg-fade">await 让出的到底是什么：控制权</div>
      <div className="sg-ile-lanes sg-card-in" style={delay(500)}>
        {["A", "B"].map((lane) => (
          <div className="sg-ile-lane" key={lane}>
            <span className="sg-ile-lane-name">协程 {lane}</span>
            <div className="sg-ile-cells">
              {ORDER.map((cell, i) => (
                <span
                  key={cell + i}
                  className={
                    "sg-ile-cell " +
                    (cell[0] === lane ? "sg-cell-on sg-cell-pop" : "sg-cell-slot")
                  }
                  style={delay(1200 + i * 620)}
                >
                  {cell[0] === lane ? cell : ""}
                </span>
              ))}
            </div>
          </div>
        ))}
        <div className="sg-ile-meta">睡眠设成零秒：让出控制权，但立刻排回队尾</div>
      </div>
      <div className="sg-ile-check sg-rise" style={delay(5400)}>
        <span className="sg-check-label">断言核对</span>
        <span className="sg-check-seq">A1 B1 A2 B2 A3 B3</span>
        <span className="sg-check-mark">✓ 一字不差 · 跑多少遍都一样</span>
      </div>
    </div>
  );
}

/* step 1 · 线程断言：全在 MainThread */
function MainThreadCard() {
  return (
    <div className="sg-mt">
      <div className="sg-mt-hero sg-hero-in">
        全部协程代码，跑在
        <br />
        <em>同一条线程</em>上。
      </div>
      <div className="sg-mt-badge sg-card-in" style={delay(1200)}>
        <span className="sg-mt-badge-name">MainThread</span>
        <span className="sg-mt-badge-note">主线程 —— 程序一启动自带的那个线程</span>
      </div>
      <div className="sg-mt-lines">
        <div className="sg-mt-line sg-rise" style={delay(2600)}>
          asyncio <b>从不创建新线程</b>
        </div>
        <div className="sg-mt-line sg-rise" style={delay(3600)}>
          并发 ≠ 并行 —— 只是<b>不让 CPU 闲着等数据</b>
        </div>
      </div>
    </div>
  );
}

/* step 2 · 设计心得：断言要建立在分毫不差的机制上 */
function DesignLesson() {
  return (
    <div className="sg-lesson">
      <div className="sg-lesson-title sg-hero-in">
        断言，要建立在<span>分毫不差</span>的机制上。
      </div>
      <div className="sg-lesson-grid">
        <div className="sg-lesson-card sg-card-in" style={delay(3500)}>
          <div className="sg-lesson-name">零秒睡眠的轮转</div>
          <svg viewBox="0 0 380 110" aria-hidden>
            <line x1="24" y1="55" x2="356" y2="55" stroke="var(--rule)" strokeWidth="4" />
            {[40, 108, 176, 244, 312].map((x, i) => (
              <g key={x} className="sg-tick sg-tick-pop" style={delay(4200 + i * 300)}>
                <circle cx={x} cy="55" r="11" fill={i % 2 ? "var(--surface-3)" : "var(--accent)"} stroke="var(--text)" strokeWidth="1.5" />
              </g>
            ))}
          </svg>
          <div className="sg-lesson-verdict sg-verdict-ok">顺序每次分毫不差 → 能核对 ✓</div>
        </div>
        <div className="sg-lesson-card sg-card-in" style={delay(9500)}>
          <div className="sg-lesson-name">真实的几十毫秒睡眠</div>
          <svg viewBox="0 0 380 110" aria-hidden>
            <line x1="24" y1="55" x2="356" y2="55" stroke="var(--rule)" strokeWidth="4" />
            {[40, 118, 168, 252, 322].map((x, i) => (
              <g key={x} className="sg-tick sg-tick-pop" style={delay(10200 + i * 300)}>
                <circle cx={x} cy="55" r="11" fill={i % 2 ? "var(--surface-3)" : "var(--accent)"} stroke="var(--text)" strokeWidth="1.5" />
              </g>
            ))}
            <text x="190" y="98" textAnchor="middle" fill="var(--text-faint)" fontSize="19" style={{ fontFamily: "var(--font-body)" }}>
              闹钟有误差 · 系统时不时卡一下
            </text>
          </svg>
          <div className="sg-lesson-verdict sg-verdict-bad">顺序会变 → 核对时好时坏 ✗</div>
        </div>
      </div>
      <div className="sg-lesson-note sg-rise" style={delay(17500)}>
        整个实验零随机 —— 任何机器，都该百分百通过。
      </div>
    </div>
  );
}

function SingleThreadInner({ step }: ChapterStepProps) {
  if (step === 0) return <Interleave />;
  if (step === 1) return <MainThreadCard />;
  return <DesignLesson />;
}

export default function SingleThread({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <SingleThreadInner step={step} />
    </div>
  );
}
