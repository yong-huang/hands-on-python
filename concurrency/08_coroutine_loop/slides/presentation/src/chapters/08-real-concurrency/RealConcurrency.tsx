import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./RealConcurrency.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/* step 0 · await 链：两根时间条首尾相接 = 203ms */
function AwaitChain() {
  return (
    <div className="rc-chain">
      <div className="rc-kicker rc-fade">最实用的一组对照 —— 排队写法</div>
      <div className="rc-chain-hero rc-hero-in" style={delay(400)}>
        排着队，挨个 await
      </div>
      <div className="rc-chain-chart rc-card-in" style={delay(1200)}>
        <svg viewBox="0 0 900 220" aria-hidden>
          <text x="30" y="52" fill="var(--text-mute)" fontSize="21" style={{ fontFamily: "var(--font-mono)" }}>
            s1 · 100ms
          </text>
          <rect x="30" y="70" width="380" height="46" className="rc-bar rc-bar-grow" style={delay(1700)} fill="var(--surface-3)" stroke="var(--text)" strokeWidth="2" />
          <text x="470" y="150" fill="var(--text-mute)" fontSize="21" style={{ fontFamily: "var(--font-mono)" }}>
            s2 · 100ms
          </text>
          <rect x="470" y="70" width="380" height="46" className="rc-bar rc-bar-grow" style={delay(2900)} fill="var(--surface-3)" stroke="var(--text)" strokeWidth="2" />
          <line x1="30" y1="160" x2="850" y2="160" stroke="var(--rule)" strokeWidth="2" />
          {[0, 100, 200].map((ms, i) => (
            <text key={ms} x={30 + i * 400} y="192" fill="var(--text-faint)" fontSize="20" style={{ fontFamily: "var(--font-mono)" }}>
              {ms}ms
            </text>
          ))}
          <text x="850" y="52" textAnchor="end" className="rc-total" fill="var(--accent)" fontSize="34" fontWeight="700" style={{ fontFamily: "var(--font-mono)", animationDelay: "3800ms" }}>
            共 203ms
          </text>
        </svg>
      </div>
      <div className="rc-chain-note rc-rise" style={delay(4400)}>
        两个 100 毫秒的任务，结果跑了 <b>203 毫秒</b> —— s1 不完，s2 不开始。
      </div>
    </div>
  );
}

/* step 1 · create_task：重叠 = 101ms + 2.01× */
function TaskOverlap() {
  return (
    <div className="rc-overlap">
      <div className="rc-kicker rc-fade">最实用的一组对照 —— 并发写法</div>
      <div className="rc-chain-hero rc-hero-in" style={delay(300)}>
        <code>create_task</code>：先挂上去，一起跑
      </div>
      <div className="rc-chain-chart rc-card-in" style={delay(900)}>
        <svg viewBox="0 0 900 250" aria-hidden>
          <text x="44" y="46" fill="var(--text-mute)" fontSize="21" style={{ fontFamily: "var(--font-mono)" }}>
            c1 · 100ms
          </text>
          <rect x="30" y="60" width="225" height="38" className="rc-bar rc-bar-grow" style={delay(1400)} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
          <text x="44" y="146" fill="var(--text-mute)" fontSize="21" style={{ fontFamily: "var(--font-mono)" }}>
            c2 · 100ms
          </text>
          <rect x="30" y="160" width="225" height="38" className="rc-bar rc-bar-grow" style={delay(2200)} fill="var(--surface-3)" stroke="var(--text)" strokeWidth="2" />
          <line x1="30" y1="54" x2="30" y2="204" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 5" />
          <line x1="30" y1="220" x2="480" y2="220" stroke="var(--rule)" strokeWidth="2" />
          <text x="30" y="244" textAnchor="middle" fill="var(--text-faint)" fontSize="20" style={{ fontFamily: "var(--font-mono)" }}>
            0
          </text>
          <text x="255" y="244" textAnchor="middle" fill="var(--text-faint)" fontSize="20" style={{ fontFamily: "var(--font-mono)" }}>
            100ms
          </text>
          <text x="480" y="244" textAnchor="middle" fill="var(--text-faint)" fontSize="20" style={{ fontFamily: "var(--font-mono)" }}>
            200ms
          </text>
          <text x="300" y="120" fill="var(--text-2)" fontSize="21" style={{ fontFamily: "var(--font-body)" }} className="rc-fade" {...delay(3100)}>
            同一起点，同时开跑
          </text>
          <text x="560" y="118" className="rc-total" fill="var(--accent)" fontSize="38" fontWeight="700" style={{ fontFamily: "var(--font-mono)", animationDelay: "3100ms" }}>
            共 101ms
          </text>
        </svg>
      </div>
      <div className="rc-xbadge rc-hero-in" style={delay(3400)}>
        <span className="rc-xbadge-main">
          实测：排队 <b>203ms</b>，是并发 <b>101ms</b> 的 <b>2.01 倍</b>
        </span>
        <span className="rc-xbadge-sub">多出来的，是事件循环自身的开销，小到可以忽略</span>
      </div>
    </div>
  );
}

/* step 2 · 本质差异：await ≠ 并发 */
function Essence() {
  return (
    <div className="rc-essence">
      <div className="rc-essence-hero rc-hero-in">差距不在写法，在并发。</div>
      <div className="rc-essence-card rc-card-in" style={delay(1100)}>
        <div className="rc-essence-line">
          await 一个协程函数 =
        </div>
        <div className="rc-essence-line2 rc-rise" style={delay(1900)}>
          普普通通的<b>按顺序调用</b>
        </div>
        <div className="rc-essence-line3 rc-rise" style={delay(3200)}>
          只不过中途，<u>允许别人插一脚</u> —— 它不并发。
        </div>
      </div>
    </div>
  );
}

/* step 3 · 正确姿势：create_task 挂循环，await 只收结果 */
function RightWay() {
  return (
    <div className="rc-right">
      <div className="rc-right-kicker rc-fade">想同时跑？两步</div>
      <div className="rc-right-flow">
        <div className="rc-right-step rc-card-in" style={delay(500)}>
          <span className="rc-right-num">1</span>
          <span className="rc-right-text">
            <code>create_task</code> 把协程挂上循环
            <em>立刻参与调度</em>
          </span>
        </div>
        <svg viewBox="0 0 90 24" aria-hidden className="rc-right-arrow rc-fade" style={delay(2000)}>
          <line x1="0" y1="12" x2="70" y2="12" stroke="var(--text)" strokeWidth="2.5" />
          <path d="M70 4 L88 12 L70 20 Z" fill="var(--text)" />
        </svg>
        <div className="rc-right-step rc-card-in" style={delay(2400)}>
          <span className="rc-right-num">2</span>
          <span className="rc-right-text">
            之后的 <code>await</code>
            <em>只负责收结果</em>
          </span>
        </div>
      </div>
    </div>
  );
}

function RealConcurrencyInner({ step }: ChapterStepProps) {
  if (step === 0) return <AwaitChain />;
  if (step === 1) return <TaskOverlap />;
  if (step === 2) return <Essence />;
  return <RightWay />;
}

export default function RealConcurrency({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <RealConcurrencyInner step={step} />
    </div>
  );
}
