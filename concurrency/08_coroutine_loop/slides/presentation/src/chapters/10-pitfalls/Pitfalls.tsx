import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

interface Pit {
  num: string;
  title: string;
  symptom: string;
  cause: string;
  fix: string;
}

const PITS: Pit[] = [
  {
    num: "01",
    title: "以为调用协程函数就会执行",
    symptom: "程序什么都没做，成功退出",
    cause: "只造了协程对象，没人驱动它",
    fix: "await 它，或者 create_task 挂上循环",
  },
  {
    num: "02",
    title: "以为 await 会创建新线程",
    symptom: "按「多线程同时干活」的想象去找，怎么都找不到",
    cause: "实测全部协程都在主线程",
    fix: "记住单线程交错的模型，真并行交给进程",
  },
  {
    num: "03",
    title: "把 await 一个协程，当成并发",
    symptom: "总耗时等于各任务加起来",
    cause: "await 链是挨个顺序执行",
    fix: "先 create_task 挂上去，再收结果",
  },
  {
    num: "04",
    title: "在协程里调 time.sleep",
    symptom: "整个事件循环被卡死，所有协程一起停摆",
    cause: "time.sleep 是站着死等，一步不让，别人全插不进来",
    fix: "在 asyncio 的世界里睡觉，只准用会谦让的 asyncio.sleep",
  },
  {
    num: "05",
    title: "把纯计算的活放进协程",
    symptom: "循环被独占，其他协程全部饿死",
    cause: "计算不结束，永远走不到让出的地方",
    fix: "run_in_executor —— 外包窗口，把活儿转交给别的线程或进程",
  },
];

/* 每坑一枚小图形，把「现象」演出来（内容驱动，跟随口播在解法行之后出现） */
function PitMotif({ num }: { num: string }) {
  if (num === "01") {
    return (
      <svg viewBox="0 0 1180 104" aria-hidden className="pf-motif">
        <rect x="240" y="26" width="250" height="52" fill="none" stroke="var(--text)" strokeWidth="2" strokeDasharray="7 7" className="pf-m-pop" style={delay(4200)} />
        <text x="365" y="59" textAnchor="middle" fill="var(--text-2)" fontSize="24" style={{ fontFamily: "var(--font-mono)" }}>sample()</text>
        <text x="365" y="100" textAnchor="middle" fill="var(--text-faint)" fontSize="18" style={{ fontFamily: "var(--font-body)" }}>协程对象 · 只是个空壳</text>
        <g className="pf-m-pop" style={delay(4800)}>
          <line x1="520" y1="52" x2="640" y2="52" stroke="var(--text-faint)" strokeWidth="2.5" strokeDasharray="5 8" />
          <line x1="548" y1="38" x2="612" y2="66" stroke="var(--accent)" strokeWidth="3" />
          <line x1="612" y1="38" x2="548" y2="66" stroke="var(--accent)" strokeWidth="3" />
        </g>
        <text x="700" y="60" fill="var(--accent)" fontSize="24" fontWeight="700" style={{ fontFamily: "var(--font-body)" }} className="pf-m-pop" style={delay(5300)}>
          没人驱动 → 一行不跑
        </text>
      </svg>
    );
  }
  if (num === "02") {
    return (
      <svg viewBox="0 0 1180 104" aria-hidden className="pf-motif">
        <rect x="150" y="26" width="300" height="52" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2.5" className="pf-m-pop" style={delay(4200)} />
        <text x="300" y="59" textAnchor="middle" fill="var(--accent)" fontSize="24" fontWeight="700" style={{ fontFamily: "var(--font-mono)" }}>MainThread</text>
        <text x="300" y="100" textAnchor="middle" fill="var(--text-mute)" fontSize="18" style={{ fontFamily: "var(--font-body)" }}>全部协程都在这</text>
        <g className="pf-m-pop" style={delay(4900)}>
          <rect x="640" y="26" width="300" height="52" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeDasharray="6 6" />
          <text x="790" y="59" textAnchor="middle" fill="var(--text-faint)" fontSize="22" style={{ fontFamily: "var(--font-mono)" }}>新线程？</text>
          <line x1="668" y1="22" x2="912" y2="82" stroke="var(--accent)" strokeWidth="3" />
          <line x1="912" y1="22" x2="668" y2="82" stroke="var(--accent)" strokeWidth="3" />
        </g>
      </svg>
    );
  }
  if (num === "03") {
    return (
      <svg viewBox="0 0 1180 104" aria-hidden className="pf-motif">
        <rect x="150" y="36" width="300" height="40" fill="var(--surface-3)" stroke="var(--text)" strokeWidth="2" className="pf-m-grow" style={delay(4200)} />
        <text x="300" y="63" textAnchor="middle" fill="var(--text-2)" fontSize="20" style={{ fontFamily: "var(--font-mono)" }}>任务 1 · 100ms</text>
        <rect x="450" y="36" width="300" height="40" fill="var(--surface-3)" stroke="var(--text)" strokeWidth="2" className="pf-m-grow" style={delay(4800)} />
        <text x="600" y="63" textAnchor="middle" fill="var(--text-2)" fontSize="20" style={{ fontFamily: "var(--font-mono)" }}>任务 2 · 100ms</text>
        <text x="850" y="63" fill="var(--accent)" fontSize="26" fontWeight="700" style={{ fontFamily: "var(--font-mono)" }} className="pf-m-pop" style={delay(5400)}>
          = 203ms
        </text>
        <text x="850" y="100" fill="var(--text-mute)" fontSize="18" style={{ fontFamily: "var(--font-body)" }}>首尾相加，不是重叠</text>
      </svg>
    );
  }
  if (num === "04") {
    return (
      <svg viewBox="0 0 1180 104" aria-hidden className="pf-motif">
        <g className="pf-m-pop" style={delay(4200)}>
          <circle cx="230" cy="50" r="34" fill="var(--surface-2)" stroke="var(--text)" strokeWidth="2.5" />
          <line x1="230" y1="50" x2="230" y2="28" stroke="var(--text)" strokeWidth="3" />
          <line x1="230" y1="50" x2="252" y2="60" stroke="var(--accent)" strokeWidth="3" />
        </g>
        <text x="230" y="102" textAnchor="middle" fill="var(--text-mute)" fontSize="18" style={{ fontFamily: "var(--font-body)" }}>time.sleep · 死等</text>
        {[340, 470, 600, 730].map((x, i) => (
          <g key={x} className="pf-m-pop" style={delay(4700 + i * 250)}>
            <rect x={x} y="30" width="96" height="40" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeDasharray="5 5" />
            <text x={x + 48} y="56" textAnchor="middle" fill="var(--text-faint)" fontSize="18" style={{ fontFamily: "var(--font-body)" }}>
              协程
            </text>
          </g>
        ))}
        <text x="620" y="100" fill="var(--text-mute)" fontSize="18" style={{ fontFamily: "var(--font-body)" }}>全部一起停摆</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 1180 104" aria-hidden className="pf-motif">
      <rect x="150" y="34" width="300" height="40" fill="var(--accent)" className="pf-m-grow" style={delay(4200)} />
      <text x="300" y="61" textAnchor="middle" fill="var(--surface-2)" fontSize="20" style={{ fontFamily: "var(--font-body)" }}>计算 · 独占循环</text>
      {[520, 640, 760].map((x, i) => (
        <g key={x} className="pf-m-pop" style={delay(4700 + i * 250)}>
          <rect x={x} y="34" width="88" height="40" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeDasharray="5 5" />
          <text x={x + 44} y="60" textAnchor="middle" fill="var(--text-faint)" fontSize="17" style={{ fontFamily: "var(--font-body)" }}>
            饿死
          </text>
        </g>
      ))}
      <g className="pf-m-pop" style={delay(5600)}>
        <line x1="900" y1="54" x2="1010" y2="54" stroke="var(--accent)" strokeWidth="2.5" />
        <path d="M1010 44 L1030 54 L1010 64 Z" fill="var(--accent)" />
        <text x="905" y="30" fill="var(--accent)" fontSize="19" fontWeight="700" style={{ fontFamily: "var(--font-body)" }}>外包窗口</text>
        <text x="1044" y="61" fill="var(--text-2)" fontSize="19" style={{ fontFamily: "var(--font-mono)" }}>线程 / 进程</text>
      </g>
    </svg>
  );
}

/* step 0 · 引子：五个坑的编号预告条 */
function PitIntro() {
  return (
    <div className="pf-intro">
      <div className="pf-intro-hero pf-hero-in">最后，五个真坑。</div>
      <div className="pf-intro-strip">
        {PITS.map((p, i) => (
          <span key={p.num} className="pf-intro-num pf-pop" style={delay(400 + i * 250)}>
            {p.num}
          </span>
        ))}
      </div>
      <div className="pf-intro-note pf-rise" style={delay(1400)}>
        每一个，都有真实现象。
      </div>
    </div>
  );
}

/* steps 1-5 · 坑卡：现象 / 原因 / 解法 + 现象小图形 */
function PitCard({ pit }: { pit: Pit }) {
  return (
    <div className="pf-card-page">
      <div className="pf-card">
        <div className="pf-card-head">
          <span className="pf-card-num">坑 {pit.num}</span>
          <span className="pf-card-title">{pit.title}</span>
        </div>
        <div className="pf-rows">
          <div className="pf-row pf-rise" style={delay(900)}>
            <span className="pf-row-kind">现象</span>
            <span className="pf-row-text">{pit.symptom}</span>
          </div>
          <div className="pf-row pf-rise" style={delay(1900)}>
            <span className="pf-row-kind">原因</span>
            <span className="pf-row-text">{pit.cause}</span>
          </div>
          <div className="pf-row pf-row-fix pf-rise" style={delay(3200)}>
            <span className="pf-row-kind">解法</span>
            <span className="pf-row-text">{pit.fix}</span>
          </div>
        </div>
        <PitMotif num={pit.num} />
      </div>
    </div>
  );
}

function PitfallsInner({ step }: ChapterStepProps) {
  if (step === 0) return <PitIntro />;
  return <PitCard pit={PITS[step - 1]!} />;
}

export default function Pitfalls({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <PitfallsInner step={step} />
    </div>
  );
}
