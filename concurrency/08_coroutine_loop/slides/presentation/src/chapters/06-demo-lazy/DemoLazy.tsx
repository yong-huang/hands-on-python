import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./DemoLazy.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const SECTIONS = [
  "[1. 调用协程函数 ≠ 执行函数体]",
  "[2. await 让出控制权：单线程内的交错]",
  "[3. asyncio.run vs 手动建循环]",
  "[4. await 链 vs create_task]",
];

function TerminalFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dl-term dl-term-in">
      <div className="dl-term-bar">
        <span className="dl-term-dot" />
        <span className="dl-term-dot" />
        <span className="dl-term-dot" />
        <span className="dl-term-title">zsh — coroutine_loop.py</span>
      </div>
      <div className="dl-term-body">{children}</div>
    </div>
  );
}

/* step 0 · 命令行 + 四个小节标题 */
function CommandRun() {
  return (
    <div className="dl-stage">
      <TerminalFrame>
        <div className="dl-line dl-cmd">
          <span className="dl-prompt">$</span> python3 coroutine_loop.py
        </div>
        <div className="dl-line dl-cmd-note dl-fade" style={delay(700)}>
          四个小节 · 半秒跑完 · 全部断言自动核对
        </div>
        {SECTIONS.map((s, i) => (
          <div key={s} className="dl-line dl-section dl-fade" style={delay(1200 + i * 420)}>
            {s}
          </div>
        ))}
        <div className="dl-line dl-ok dl-fade" style={delay(3200)}>
          ALL ASSERTIONS PASSED
        </div>
      </TerminalFrame>
    </div>
  );
}

/* step 1 · [1] 调用协程函数：拿到对象，痕迹为空 */
function CallNoRun() {
  return (
    <div className="dl-stage">
      <TerminalFrame>
        <div className="dl-line dl-section">[1. 调用协程函数 ≠ 执行函数体]</div>
        <div className="dl-line dl-out dl-fade" style={delay(400)}>
          <span className="dl-prompt"> </span>coro = sample() →{" "}
          <span className="dl-hl-dim">&lt;coroutine object sample at 0x1051cf4c0&gt;</span>
        </div>
        <div className="dl-line dl-out dl-fade" style={delay(1400)}>
          <span className="dl-prompt"> </span>此刻函数体执行痕迹:{" "}
          <span className="dl-hl-accent">[]</span>
        </div>
        <div className="dl-punch dl-rise" style={delay(2400)}>
          拿回来的不是结果，是一个<span>协程对象</span> —— 一行都没跑。
        </div>
      </TerminalFrame>
    </div>
  );
}

/* step 2 · asyncio.run 驱动 + 打包示意 */
function RunDrive() {
  return (
    <div className="dl-pack">
      <TerminalFrame>
        <div className="dl-line dl-section">[1. 调用协程函数 ≠ 执行函数体]</div>
        <div className="dl-line dl-out dl-fade" style={delay(400)}>
          <span className="dl-prompt"> </span>asyncio.run(coro) →{" "}
          <span className="dl-hl-accent">'sample-结果'</span>，执行痕迹:{" "}
          <span className="dl-hl-accent">['body-ran']</span>
        </div>
        <div className="dl-line dl-out dl-fade" style={delay(1500)}>
          <span className="dl-prompt"> </span>痕迹从「空」变成了「跑过了」
        </div>
      </TerminalFrame>
      <div className="dl-pack-diagram">
        <div className="dl-pack-items">
          {["要干的活", "用到的变量", "干到了哪一行"].map((t, i) => (
            <div key={t} className="dl-pack-item dl-fade" style={delay(2400 + i * 400)}>
              {t}
            </div>
          ))}
        </div>
        <svg viewBox="0 0 90 24" aria-hidden className="dl-pack-arrow dl-fade" style={delay(3700)}>
          <line x1="0" y1="12" x2="70" y2="12" stroke="var(--text)" strokeWidth="2.5" />
          <path d="M70 4 L88 12 L70 20 Z" fill="var(--text)" />
        </svg>
        <div className="dl-pack-box dl-card-in" style={delay(4100)}>
          协程对象
          <span>等事件循环驱动，才真正执行</span>
        </div>
      </div>
    </div>
  );
}

/* step 3 · never awaited：第一大坑 */
function NeverAwaited() {
  return (
    <div className="dl-warn">
      <TerminalFrame>
        <div className="dl-line dl-cmd">
          <span className="dl-prompt">$</span> （忘了 await，协程对象被程序清理时）
        </div>
        <div className="dl-line dl-warn-line dl-fade" style={delay(900)}>
          RuntimeWarning: coroutine 'sample' was <span className="dl-hl-accent">never awaited</span>
        </div>
      </TerminalFrame>
      <div className="dl-warn-body">
        <div className="dl-warn-title dl-hero-in" style={delay(1800)}>
          asyncio 第一大坑
        </div>
        <div className="dl-warn-causes">
          <div className="dl-warn-cause dl-rise" style={delay(2800)}>
            启动那行 <code>asyncio.run</code> 忘了写
          </div>
          <div className="dl-warn-cause dl-rise" style={delay(3600)}>
            协程里面又调的另一个协程，忘了 await
          </div>
        </div>
        <div className="dl-warn-punch dl-hero-in" style={delay(5200)}>
          程序什么都没干，就<span>成功退出</span>了。
        </div>
      </div>
    </div>
  );
}

function DemoLazyInner({ step }: ChapterStepProps) {
  if (step === 0) return <CommandRun />;
  if (step === 1) return <CallNoRun />;
  if (step === 2) return <RunDrive />;
  return <NeverAwaited />;
}

export default function DemoLazy({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <DemoLazyInner step={step} />
    </div>
  );
}
