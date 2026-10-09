import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./QaClosing.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** map / imap / imap_unordered 三行（每行配迷你车道演示交付节奏）。 */
const FAMILIES = [
  { name: "map", note: "等全批 · 按输入顺序整批回", mode: "batch", order: [0, 1, 2, 3], base: 1500, gap: 90 },
  { name: "imap", note: "流式 · 按输入顺序一个一个出", mode: "stream", order: [0, 1, 2, 3], base: 900, gap: 340 },
  { name: "imap_unordered", note: "无序版 · 谁先完成谁先出", mode: "stream", order: [2, 0, 3, 1], base: 900, gap: 260 },
] as const;

/** 选型四行。 */
const PICKS = [
  { q: "等网络的活", a: "线程", note: "默认选择" },
  { q: "计算重的活", a: "进程池", note: "真并行" },
  { q: "统一的池写法", a: "futures", note: "线程版 / 进程版都有" },
  { q: "海量连接", a: "协程", note: "后面专门讲" },
] as const;

/** fork 示意：父进程内存被复制给子进程。 */
function ForkPict() {
  return (
    <svg className="qa-pict" width="150" height="84" viewBox="0 0 150 84" fill="none" aria-hidden>
      <rect x="8" y="18" width="52" height="48" rx="3" stroke="currentColor" strokeWidth="2.5" />
      <rect x="20" y="30" width="28" height="8" fill="currentColor" opacity="0.35" />
      <rect x="20" y="44" width="20" height="8" fill="currentColor" opacity="0.35" />
      <path d="M66 42 H92" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 4" />
      <path d="M86 35 L94 42 L86 49" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <rect x="98" y="18" width="52" height="48" rx="3" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 4" />
      <rect x="110" y="30" width="28" height="8" fill="currentColor" opacity="0.35" />
      <rect x="110" y="44" width="20" height="8" fill="currentColor" opacity="0.35" />
      <text x="34" y="80" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">父</text>
      <text x="124" y="80" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">子（复制品）</text>
    </svg>
  );
}

/** spawn 示意：子进程是全新启动的解释器。 */
function SpawnPict() {
  return (
    <svg className="qa-pict" width="150" height="84" viewBox="0 0 150 84" fill="none" aria-hidden>
      <rect x="8" y="18" width="52" height="48" rx="3" stroke="currentColor" strokeWidth="2.5" />
      <rect x="20" y="30" width="28" height="8" fill="currentColor" opacity="0.35" />
      <path d="M66 42 H86" stroke="currentColor" strokeWidth="2.5" />
      <path d="M80 35 L88 42 L80 49" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <rect x="92" y="18" width="52" height="48" rx="3" stroke="currentColor" strokeWidth="2.5" />
      <path d="M100 30 H136 M100 40 H128 M100 50 H120" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <text x="34" y="80" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">父</text>
      <text x="118" y="80" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">全新启动</text>
    </svg>
  );
}

export default function QaClosingChapter({ step }: ChapterStepProps) {
  /* step 0~1 — Q1：fork vs spawn（右栏第二步亮起，各配示意小图） */
  if (step === 0 || step === 1) {
    const showSpawn = step === 1;
    return (
      <div className="scene-pad qa-scene">
        <div className="qa-kicker qa-rise">
          <span className="label-mono">Q1 · fork 和 spawn 差在哪</span>
        </div>
        <div className="qa-duo">
          <div className={`qa-card${showSpawn ? " qa-card--dim" : ""} qa-pop`}>
            <div className="qa-card-name mono">fork</div>
            <ForkPict />
            <div className="qa-card-line qa-card-line--big"><em>快</em>——直接复制内存</div>
            <div className="qa-card-note">只在 Mac、Linux 上有</div>
          </div>
          {showSpawn && (
            <div className="qa-card qa-card--accent qa-pop">
              <div className="qa-card-name mono">spawn</div>
              <SpawnPict />
              <div className="qa-card-line qa-card-line--big">慢一点，但<em>跨平台</em></div>
              <div className="qa-card-note">macOS 和 Windows 默认支持</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* step 2 — Q2：map / imap / unordered 三行 + 迷你车道演示交付节奏 */
  if (step === 2) {
    return (
      <div className="scene-pad qa-scene">
        <div className="qa-kicker qa-rise">
          <span className="label-mono">Q2 · map 和 imap 差在哪</span>
        </div>
        <div className="qa-fam">
          {FAMILIES.map((f, i) => (
            <div className={`qa-fam-row qa-fam-row--${f.name === "map" ? "dim" : "on"} qa-rise`} style={delay(i * 400)} key={f.name}>
              <span className="mono qa-fam-name">{f.name}</span>
              <div className="qa-mini">
                <div className="qa-mini-track">
                  {f.mode === "batch" && <div className="qa-mini-wait qa-grow" style={delay(600)} />}
                  {f.order.map((t, j) => (
                    <span
                      className="qa-mini-chip qa-pop"
                      style={delay(f.base + j * f.gap)}
                      key={j}
                    >
                      {f.mode === "stream" && <i className="qa-mini-ord mono">{j + 1}</i>}
                      T{t}
                    </span>
                  ))}
                </div>
                <div className="qa-mini-note">{f.note}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="qa-corner qa-rise" style={delay(2300)}>
          <span className="label-mono">什么时候换</span>
          任务耗时差异大——不用陪着最慢的一起等
        </div>
      </div>
    );
  }

  /* step 3~4 — 全家桶选型（四行分两步，答案 chip 弹入） */
  if (step === 3 || step === 4) {
    const shown = step === 3 ? PICKS.slice(0, 2) : PICKS.slice(2, 4);
    return (
      <div className="scene-pad qa-scene">
        <div className="qa-kicker qa-rise">
          <span className="label-mono">全家桶怎么选 · {step === 3 ? "1/2" : "2/2"}</span>
        </div>
        <div className="qa-picks">
          {shown.map((p, i) => (
            <div className="qa-pick qa-rise" style={delay(300 + i * 700)} key={p.q}>
              <span className="qa-pick-q">{p.q}</span>
              <span className="qa-pick-arrow qa-grow" style={delay(800 + i * 700)}>→</span>
              <span className="qa-pick-a mono qa-pop" style={delay(1000 + i * 700)}>{p.a}</span>
              <span className="qa-pick-note">{p.note}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 5 — 收尾 */
  return (
    <div className="scene-pad qa-scene qa-end-scene">
      <div className="qa-end-repo qa-rise">
        <span className="label-mono">Repo</span>
        <span className="mono">hands-on-python · concurrency / 05 · mp_accel.py</span>
      </div>
      <h1 className="qa-end-main qa-rise" style={delay(500)}>
        python3 一跑，<em>就有体感</em>
      </h1>
      <hr className="rule qa-end-rule qa-grow" style={delay(1100)} />
      <div className="qa-end-next qa-rise" style={delay(1500)}>
        下一讲：进程间通信——让各进程真正共享数据
      </div>
      <div className="qa-end-bye qa-rise" style={delay(2200)}>
        下期见
      </div>
    </div>
  );
}
