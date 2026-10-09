import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Whiteboard.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 话筒 SVG（GIL 类比：同一时刻只有一个线程能拿着）。 */
function MicSvg() {
  return (
    <svg viewBox="0 0 120 190" className="wb-mic" aria-hidden>
      <rect x="40" y="12" width="40" height="72" rx="20" fill="var(--surface-3)" stroke="var(--accent)" strokeWidth="3" />
      <line x1="46" y1="34" x2="74" y2="34" stroke="var(--accent)" strokeWidth="2" opacity="0.5" />
      <line x1="46" y1="48" x2="74" y2="48" stroke="var(--accent)" strokeWidth="2" opacity="0.5" />
      <line x1="46" y1="62" x2="74" y2="62" stroke="var(--accent)" strokeWidth="2" opacity="0.5" />
      <path d="M28 66 q 0 34 32 38 q 32 -4 32 -38" fill="none" stroke="var(--text)" strokeWidth="3" />
      <line x1="60" y1="104" x2="60" y2="152" stroke="var(--text)" strokeWidth="3" />
      <line x1="34" y1="162" x2="86" y2="162" stroke="var(--text)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function WhiteboardChapter({ step }: ChapterStepProps) {
  /* step 0 — 白板登場 */
  if (step === 0) {
    return (
      <div className="scene-pad wb-scene wb-board-scene">
        <div className="wb-board wb-pop">
          <div className="label-mono">白板</div>
          <div className="wb-board-line mono">counter = 100</div>
        </div>
        <div className="wb-board-tag wb-rise" style={delay(900)}>
          把共享变量，想成一块<b className="wb-accent">白板</b>
        </div>
      </div>
    );
  }

  /* step 1 — 丢失现场 */
  if (step === 1) {
    return (
      <div className="scene-pad wb-scene wb-lose-scene">
        <div className="wb-board wb-board--wide wb-pop">
          <div className="label-mono">白板 · counter = 100</div>
          <div className="wb-lose-steps">
            <div className="wb-lose-step wb-rise" style={delay(400)}>
              <span className="wb-lose-ord mono">①</span>
              同事 A、同事 B 同时看了一眼 —— 各自算出 <b>101</b>
            </div>
            <div className="wb-lose-step wb-rise" style={delay(1400)}>
              <span className="wb-lose-ord mono">②</span>
              先回来的：擦掉，写 <b>101</b>
            </div>
            <div className="wb-lose-step wb-rise" style={delay(2200)}>
              <span className="wb-lose-ord mono">③</span>
              后回来的：也写 <b>101</b> —— <b className="wb-accent">覆盖了先写的</b>
            </div>
          </div>
        </div>
        <div className="wb-lose-verdict wb-rise" style={delay(3000)}>
          一次加法，<b className="wb-accent">凭空消失</b>
        </div>
      </div>
    );
  }

  /* step 2 — 类比纠偏：检查点 */
  if (step === 2) {
    return (
      <div className="scene-pad wb-scene wb-fix-scene">
        <div className="wb-fix-gloss wb-rise">
          CPython —— 就是你敲 <span className="mono">python3</span> 启动的那个官方版 Python
        </div>
        <div className="wb-fix-hero wb-rise" style={delay(400)}>
          这个比方，差了半句：线程切换，<b className="wb-accent">不是随时都能发生</b>
        </div>
        <div className="wb-fix-statement">
          <div className="wb-fix-flags">
            <span className="wb-fix-flag mono wb-rise" style={delay(1500)}>循环跳回开头那一下</span>
            <span className="wb-fix-mid label-mono wb-rise" style={delay(1900)}>语句中部 · 不被打断</span>
            <span className="wb-fix-flag mono wb-rise" style={delay(2300)}>函数进门出门那一下</span>
          </div>
          <div className="wb-fix-bar mono wb-rise" style={delay(1100)}>
            counter += 1
          </div>
        </div>
        <div className="wb-fix-foot wb-rise" style={delay(2700)}>
          只在固定的<b className="wb-accent">检查点</b>切换
        </div>
      </div>
    );
  }

  /* step 3 — 事实一：竞态窗口 */
  if (step === 3) {
    return (
      <div className="scene-pad wb-scene wb-fact1-scene">
        <div className="wb-fact1-kicker label-mono wb-rise">两件事，记住 · 第一件</div>
        <div className="wb-fact1-hero wb-rise" style={delay(300)}>
          竞态窗口
        </div>
        <div className="wb-fact1-bar">
          <div className="wb-fact1-seg wb-rise" style={delay(900)}>
            <span className="mono">读旧值</span>
            <span className="label-mono">100</span>
          </div>
          <div className="wb-fact1-window wb-pop" style={delay(1700)}>
            <span className="label-mono">窗口</span>
            被插进别人的完整读写
          </div>
          <div className="wb-fact1-seg wb-rise" style={delay(2500)}>
            <span className="mono">写新值</span>
            <span className="label-mono">101（用过期旧值算的）</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 事实二：GIL 话筒 */
  return (
    <div className="scene-pad wb-scene wb-mic-scene">
      <div className="wb-mic-left">
        <div className="wb-fact1-kicker label-mono wb-rise">两件事，记住 · 第二件</div>
        <div className="wb-mic-hero wb-rise" style={delay(300)}>
          GIL —— <b className="wb-accent">全局解释器锁</b>
        </div>
        <div className="wb-mic-rules">
          <div className="wb-mic-rule wb-rise" style={delay(1600)}>
            <span className="mono">{"✓\uFE0E"}</span> 同一时刻，只有一个线程能拿着话筒
          </div>
          <div className="wb-mic-rule wb-rise" style={delay(2400)}>
            <span className="mono">{"✗\uFE0E"}</span> 只管在固定地点递话筒，<b>不管你的动作是不是做到一半</b>
          </div>
        </div>
      </div>
      <MicSvg />
    </div>
  );
}
