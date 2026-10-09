import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Boundaries.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/* step 0 · 别用之一：纯计算的活 */
function NoCompute() {
  return (
    <div className="bd-no">
      <div className="bd-no-kicker bd-fade">三种情况，别用协程 —— 之一</div>
      <div className="bd-no-hero bd-hero-in" style={delay(400)}>
        纯计算的活
      </div>
      <div className="bd-starve bd-card-in" style={delay(1100)}>
        <div className="bd-cpu-row">
          <span className="bd-cpu-name">某个协程</span>
          <div className="bd-cpu-bar">
            <div className="bd-cpu-fill" style={delay(1700)} />
          </div>
          <span className="bd-cpu-pct bd-fade" style={delay(2600)}>算数不算完，不让位</span>
        </div>
        <div className="bd-hungry-row bd-fade" style={delay(3400)}>
          {["协程 2", "协程 3", "协程 4"].map((n, i) => (
            <span className="bd-hungry-cell" key={n} style={delay(3800 + i * 260)}>
              {n} · 饿死
            </span>
          ))}
        </div>
      </div>
      <div className="bd-no-way bd-rise" style={delay(5200)}>
        真并行，得靠<u>多进程</u> —— 多开几个独立的 Python 程序，各干各的。
      </div>
    </div>
  );
}

/* step 1 · 别用之二 / 之三 */
function NoMisc() {
  return (
    <div className="bd-misc">
      <div className="bd-no-kicker bd-fade">三种情况，别用协程 —— 之二 / 之三</div>
      <div className="bd-misc-grid">
        <div className="bd-misc-card bd-card-in" style={delay(500)}>
          <div className="bd-misc-num">02</div>
          <div className="bd-misc-title">必须调不配合协程的库</div>
          <div className="bd-misc-body">
            它们一调用就<u>卡住整个循环</u>
            <br />
            用线程兜底，更直接
          </div>
        </div>
        <div className="bd-misc-card bd-card-in" style={delay(1200)}>
          <div className="bd-misc-num">03</div>
          <div className="bd-misc-title">就几个并发，逻辑又简单</div>
          <div className="bd-misc-body">
            开线程或按顺序一步步写，都更直观
            <br />
            不值得引入协程
          </div>
        </div>
      </div>
    </div>
  );
}

/* steps 2-3 · 三者对比表逐行亮 */
const TABLE_ROWS = [
  {
    key: "thread",
    name: "线程",
    how: "操作系统想切就切，上面压着 GIL 那把大锁",
    when: "等待不多的活；非要用不支持协程的库时，拿它兜底",
  },
  {
    key: "process",
    name: "进程",
    how: "多开几个独立的 Python，真的能同时干活",
    when: "纯计算的活选它",
  },
  {
    key: "coro",
    name: "协程",
    how: "切换的开销，跟普通函数调用差不多",
    when: "等待特别多的活选它",
  },
];

function CompareTable({ upto }: { upto: number }) {
  return (
    <div className="bd-table">
      <div className="bd-table-title bd-fade">一张表，分清三者</div>
      <div className="bd-table-head bd-fade" style={delay(300)}>
        <span>方案</span>
        <span>调度方式</span>
        <span>什么时候选它</span>
      </div>
      {TABLE_ROWS.slice(0, upto).map((r, i) => {
        const isPast = upto > 1 && i < upto - 2;
        const isPrev = upto > 1 && i === upto - 2;
        const anim = isPast ? "bd-past-in" : isPrev ? "bd-row-dim" : "bd-row-in";
        const d = upto === 1 ? 800 : isPast ? 400 + i * 120 : isPrev ? 1200 : 7000;
        return (
        <div
          key={r.key}
          className={"bd-table-row " + anim}
          style={delay(d)}
        >
          <span className="bd-cell-name">{r.name}</span>
          <span className="bd-cell-how">{r.how}</span>
          <span className="bd-cell-when">{r.when}</span>
        </div>
        );
      })}
    </div>
  );
}

/* step 4 · 收束大字 */
function Verdict() {
  return (
    <div className="bd-verdict">
      <div className="bd-verdict-line bd-hero-in">
        等待，选<span>协程</span>。计算，选<span>进程</span>。
      </div>
      <div className="bd-verdict-note bd-rise" style={delay(1200)}>
        纯计算的活，线程和协程都不行 —— 只有进程。
      </div>
    </div>
  );
}

function BoundariesInner({ step }: ChapterStepProps) {
  if (step === 0) return <NoCompute />;
  if (step === 1) return <NoMisc />;
  if (step === 2) return <CompareTable upto={1} />;
  if (step === 3) return <CompareTable upto={3} />;
  return <Verdict />;
}

export default function Boundaries({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <BoundariesInner step={step} />
    </div>
  );
}
