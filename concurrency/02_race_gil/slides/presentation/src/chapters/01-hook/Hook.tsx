import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 双线程同改一个数的示意（SVG：两支箭头交汇于 counter）。 */
function RaceDiagram() {
  return (
    <svg viewBox="0 0 900 240" className="hk-race-svg" aria-hidden>
      {/* 线程 A 轨迹 */}
      <path
        d="M40 60 H 360"
        stroke="var(--text-faint)"
        strokeWidth="2"
        strokeDasharray="8 8"
        fill="none"
      />
      {/* 线程 B 轨迹 */}
      <path
        d="M40 180 H 360"
        stroke="var(--text-faint)"
        strokeWidth="2"
        strokeDasharray="8 8"
        fill="none"
      />
      {/* 汇聚箭头：分别命中 counter 卡左缘上下两点 */}
      <path
        d="M380 60 L 534 90"
        stroke="var(--accent)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M0 0 L-18 -7 L-14 7 Z"
        fill="var(--accent)"
        transform="translate(548 94) rotate(11)"
      />
      <path
        d="M380 180 L 534 150"
        stroke="var(--accent)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M0 0 L-18 7 L-14 -7 Z"
        fill="var(--accent)"
        transform="translate(548 146) rotate(-11)"
      />
      {/* counter 卡 */}
      <rect
        x="560"
        y="66"
        width="300"
        height="108"
        fill="var(--surface-3)"
        stroke="var(--text)"
        strokeWidth="2.5"
      />
      <text
        x="710"
        y="134"
        textAnchor="middle"
        fill="var(--text)"
        fontSize="52"
        fontWeight="700"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        counter
      </text>
    </svg>
  );
}

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="label-mono hk-rise">PYTHON · CONCURRENCY 02</div>
          <hr className="rule rule-accent hk-title-rule hk-rule-grow" style={delay(180)} />
          <h1 className="hk-title-main hk-scale" style={delay(320)}>
            一次加法，<span className="hk-title-accent">凭空消失</span>
          </h1>
          <div className="hk-title-en hk-rise" style={delay(700)}>
            The Vanishing Increment
          </div>
          <div className="hk-title-sub hk-rise" style={delay(900)}>
            竞态复现与 GIL 边界实测
          </div>
          <div className="hk-title-gloss hk-rise" style={delay(1300)}>
            <span className="hk-gloss-chip mono">race condition · 几个线程抢同一个数</span>
            <span className="hk-gloss-chip mono">GIL · 全局解释器锁</span>
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={delay(1600)}>
          <div className="hk-tb-row"><span>Series</span><b>hands-on-python</b></div>
          <div className="hk-tb-row"><span>Lab</span><b>concurrency / 02</b></div>
          <div className="hk-tb-row"><span>Script</span><b>race_gil.py</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — 承上一讲 + 追问（双线程交汇示意） */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene hk-ask-scene">
        <div className="hk-echo hk-rise">
          <span className="label-mono">上一讲</span>
          线程——同时开跑的另一条任务线——之间，顺序没法复现
        </div>
        <div className="hk-race-wrap hk-pop" style={delay(1400)}>
          <div className="hk-race-thread hk-race-thread--a" style={delay(1900)}>
            <span className="hk-race-chip mono hk-rise" style={delay(1900)}>线程 A</span>
          </div>
          <RaceDiagram />
          <div className="hk-race-thread hk-race-thread--b" style={delay(2300)}>
            <span className="hk-race-chip mono hk-rise" style={delay(2300)}>线程 B</span>
          </div>
        </div>
        <div className="hk-ask-hero hk-rise" style={delay(3000)}>
          两个线程<b className="hk-ask-accent">同时改一个数</b>，结果会怎样？
        </div>
      </div>
    );
  }

  /* step 2 — 直觉：会出错，但说不清（三种可能结果） */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene hk-vague-scene">
        <div className="hk-vague-yes hk-pop">会出错。</div>
        <div className="hk-vague-outs hk-rise" style={delay(1000)}>
          <span className="hk-out-chip mono hk-pop" style={delay(1600)}>101</span>
          <span className="hk-out-chip mono hk-pop" style={delay(1900)}>100</span>
          <span className="hk-out-chip mono hk-pop" style={delay(2200)}>99</span>
          <span className="hk-out-q hk-pop" style={delay(2500)}>？</span>
        </div>
        <div className="hk-vague-but hk-rise" style={delay(3000)}>
          但错成什么样、什么时候错——大多数人<b className="hk-ask-accent">说不清</b>。
        </div>
      </div>
    );
  }

  /* step 3 — 本讲预告 + 反直觉钩子（迷你终端） */
  return (
    <div className="scene-pad hk-scene hk-tease-scene">
      <div className="hk-tease-card hk-pop" style={delay(200)}>
        <span className="label-mono">这一讲</span>
        十秒钟，亲眼看见<b className="hk-ask-accent">一次加法凭空消失</b>
        <span className="hk-tease-term mono">
          <span className="hk-tease-prompt">$</span> python3 race_gil.py
        </span>
      </div>
      <div className="hk-tease-card hk-tease-card--hook hk-pop" style={delay(1400)}>
        <span className="label-mono">反直觉</span>
        最常见的写法：一万次加法，<b className="hk-ask-accent">居然一次都不丢</b>
      </div>
      <div className="hk-tease-strip hk-rise" style={delay(2800)}>
        别急——竞态没消失，它<b className="hk-ask-accent">换了张脸</b>
      </div>
    </div>
  );
}
