import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Background.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 大锁 SVG（描边风，走 currentColor）。 */
function LockGlyph({ size = 200 }: { size?: number }) {
  return (
    <svg
      className="bg-lock-svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
    >
      <rect x="22" y="44" width="56" height="42" rx="3" stroke="currentColor" strokeWidth="3" />
      <path
        d="M34 44 V32 a16 16 0 0 1 32 0 V44"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="50" cy="62" r="6" fill="currentColor" />
      <rect x="47.5" y="62" width="5" height="12" fill="currentColor" />
    </svg>
  );
}

export default function BackgroundChapter({ step }: ChapterStepProps) {
  /* step 0 — GIL 定义主视觉：大锁 + 全名 */
  if (step === 0) {
    return (
      <div className="scene-pad bg-scene bg-gil-scene">
        <div className="bg-gil-lock bg-pop"><LockGlyph size={230} /></div>
        <div className="bg-gil-body">
          <div className="label-mono bg-rise" style={delay(250)}>GLOBAL INTERPRETER LOCK</div>
          <h1 className="bg-gil-name bg-rise" style={delay(450)}>
            GIL <span className="bg-gil-cn">全局解释器锁</span>
          </h1>
          <hr className="rule bg-gil-rule bg-rise" style={delay(750)} />
          <div className="bg-gil-note bg-rise" style={delay(950)}>
            Python 全局的一把大锁
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 解释器卡 + 规矩 + 字节码小注 */
  if (step === 1) {
    return (
      <div className="scene-pad bg-scene bg-interp-scene">
        <div className="bg-interp-card bg-rise">
          <div className="label-mono bg-interp-label">解释器</div>
          <div className="bg-interp-main">替你一行行跑代码的程序</div>
        </div>
        <div className="bg-interp-rulebox bg-rise" style={delay(900)}>
          <span className="bg-interp-rulekey mono">规矩</span>
          同一时刻，只放行一个线程
        </div>
        <div className="bg-interp-gloss bg-rise" style={delay(1700)}>
          <span className="label-mono">小词</span>
          字节码 ＝ Python 把代码拆出来的小指令
        </div>
      </div>
    );
  }

  /* step 2 — 4 线程在锁前排队（依次入队） */
  if (step === 2) {
    return (
      <div className="scene-pad bg-scene bg-queue-scene">
        <div className="bg-queue-gate bg-rise">
          <LockGlyph size={120} />
          <div className="bg-queue-gate-label">只放一个</div>
        </div>
        <div className="bg-queue-line">
          {[0, 1, 2, 3].map((i) => (
            <div className="bg-queue-chip bg-queue-enter" style={delay(700 + i * 420)} key={i}>
              <span className="mono">T{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="bg-queue-note bg-rise" style={delay(2500)}>
          一人算一段，还要互相<em>抢锁</em>
        </div>
      </div>
    );
  }

  /* step 3 — 实测对照：串行 vs 4 线程时间条 */
  if (step === 3) {
    return (
      <div className="scene-pad bg-scene bg-bench-scene">
        <div className="bg-bench-kicker bg-rise">
          <span className="label-mono">实测 · 素数计数 × 4 任务</span>
        </div>
        <div className="bg-bench">
          <div className="bg-bench-row">
            <div className="bg-bench-name bg-rise">串行</div>
            <div className="bg-bench-track">
              <div className="bg-bench-bar bg-bench-bar--serial bg-grow" style={{ ...delay(300), width: "74%" }} />
            </div>
            <div className="bg-bench-sec mono bg-rise" style={delay(500)}>0.49s</div>
          </div>
          <div className="bg-bench-row">
            <div className="bg-bench-name bg-rise" style={delay(900)}>4 线程</div>
            <div className="bg-bench-track">
              <div className="bg-bench-bar bg-bench-bar--threads bg-grow" style={{ ...delay(1100), width: "100%" }} />
            </div>
            <div className="bg-bench-sec mono bg-rise" style={delay(1300)}>0.66s</div>
          </div>
        </div>
        <div className="bg-bench-verdict bg-rise" style={delay(2100)}>
          不加速，还<em>倒贴</em>
        </div>
      </div>
    );
  }

  /* step 4 — IO 交接：等待中的线程把 GIL 令牌让出去 */
  if (step === 4) {
    return (
      <div className="scene-pad bg-scene bg-io-scene">
        <div className="bg-io-lanes">
          <div className="bg-io-lane bg-rise">
            <span className="bg-io-thread mono">线程 A</span>
            <span className="bg-io-state">等网络中…</span>
          </div>
          <div className="bg-io-handoff">
            <span className="bg-io-token bg-slide-across">GIL</span>
          </div>
          <div className="bg-io-lane bg-rise" style={delay(1100)}>
            <span className="bg-io-thread mono">线程 B</span>
            <span className="bg-io-state bg-io-state--on">接着算</span>
          </div>
        </div>
        <div className="bg-io-tagline bg-rise" style={delay(1900)}>
          线程的用武之地在<em>等待</em>，不在计算
        </div>
      </div>
    );
  }

  /* step 5 — 进程：独立运行的程序，自带全套内存 */
  if (step === 5) {
    return (
      <div className="scene-pad bg-scene bg-proc-scene">
        <div className="bg-proc-card bg-pop">
          <div className="bg-proc-head">
            <span className="label-mono">进程</span>
            <span className="bg-proc-en mono">Process</span>
          </div>
          <div className="bg-proc-main">操作系统里独立运行的程序</div>
          <hr className="rule bg-proc-rule" />
          <div className="bg-proc-items">
            <span className="bg-proc-item bg-rise" style={delay(700)}>独立内存</span>
            <span className="bg-proc-item bg-rise" style={delay(950)}>自己的解释器</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — 双进程各配一把锁：新锁互不相干 */
  if (step === 6) {
    return (
      <div className="scene-pad bg-scene bg-dual-scene">
        {[0, 1].map((i) => (
          <div className={`bg-dual-card bg-pop`} style={delay(i * 800)} key={i}>
            <div className="bg-dual-lock"><LockGlyph size={86} /></div>
            <div className="bg-dual-name mono">进程 {i + 1}</div>
            <div className="bg-dual-sub">自己的 GIL · 自己的内存</div>
          </div>
        ))}
        <div className="bg-dual-tagline bg-rise" style={delay(1900)}>
          新开一个进程，多一把<em>新锁</em>
        </div>
        <div className="bg-dual-sub2 bg-rise" style={delay(2500)}>
          各锁各的，真正同时执行
        </div>
      </div>
    );
  }

  /* step 7 — multiprocessing 登场 */
  return (
    <div className="scene-pad bg-scene bg-hero-scene">
      <div className="label-mono bg-rise">PYTHON 标准库</div>
      <h1 className="bg-hero-name bg-rise" style={delay(250)}>
        multiprocessing
      </h1>
      <div className="bg-hero-sub bg-rise" style={delay(800)}>
        标准库的多进程方案
      </div>
      <div className="bg-hero-chips">
        {["开进程", "派任务", "收结果"].map((c, i) => (
          <span className="bg-hero-chip bg-rise" style={delay(1250 + i * 350)} key={c}>
            {c}
          </span>
        ))}
        <span className="bg-hero-chip bg-hero-chip--all bg-rise" style={delay(2350)}>
          全包了
        </span>
      </div>
    </div>
  );
}
