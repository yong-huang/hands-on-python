import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Background.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 老三招（steps 0~2 递进：讲到哪招哪招亮，判词只给当招）。 */
const TRICKS = [
  { ord: "第一招", name: "加日志重跑", verdict: "死锁的时候，日志是安静的" },
  { ord: "第二招", name: "对着代码猜", verdict: "你缺的不是猜测，是现场" },
  { ord: "第三招", name: "重启了事", verdict: "治好了这一次，下一次照挂" },
] as const;

/** step 3 — 四步链（hook 路线图的回声，压缩版）。 */
const FLOW = ["复现", "取证", "修复", "回归"] as const;

export default function BackgroundChapter({ step }: ChapterStepProps) {
  /* step 0~2 — 老三招递进列表 */
  if (step === 0 || step === 1 || step === 2) {
    const active = step;
    return (
      <div className="scene-pad bd-scene bd-trick-scene">
        <div className="bd-trick-head bd-rise">
          <span className="label-mono">排查卡住 · 老三招</span>
          <span className="label-mono bd-trick-count">
            失灵 {active + 1} / 3
          </span>
        </div>
        <div className="bd-tricks">
          {TRICKS.map((t, i) => {
            const state =
              i < active ? "bd-trick--done" : i === active ? "bd-trick--active" : "bd-trick--todo";
            return (
              <div className={`bd-trick ${state}`} key={t.ord}>
                <span className="bd-trick-ord mono">{t.ord}</span>
                <div className="bd-trick-body">
                  <div className="bd-trick-name">{t.name}</div>
                  {i === active && (
                    <div className="bd-trick-verdict bd-rise" style={delay(650)}>
                      {t.verdict}
                    </div>
                  )}
                  {i < active && <div className="bd-trick-verdict">{t.verdict}</div>}
                </div>
                {i < active && <span className="bd-trick-mark mono">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* step 3 — 收束：靠得住的是流程 + 零依赖角标 */
  if (step === 3) {
    return (
      <div className="scene-pad bd-scene bd-pivot-scene">
        <div className="bd-pivot-line bd-rise">
          老三招靠不住，靠得住的是<span className="bd-accent">流程</span>
        </div>
        <div className="bd-flow">
          {FLOW.map((f, i) => (
            <div className="bd-flow-item" key={f}>
              {i > 0 && (
                <span className="bd-flow-arrow bd-rise" style={delay(700 + i * 300)}>
                  →
                </span>
              )}
              <span className="bd-flow-node bd-pop" style={delay(500 + i * 300)}>
                {f}
              </span>
            </div>
          ))}
        </div>
        <div className="bd-pivot-tag mono bd-rise" style={delay(2000)}>
          stdlib only · faulthandler / subprocess 内置 · 0 第三方依赖
        </div>
      </div>
    );
  }

  /* step 4~5 — 两个信号（讲到哪个亮哪个，前一个灰化保留） */
  if (step === 4 || step === 5) {
    const active = step - 4;
    return (
      <div className="scene-pad bd-scene bd-signal-scene">
        <div className="bd-signal-head bd-rise">
          <span className="label-mono">适用 · 两个信号</span>
        </div>
        <div className="bd-signal-question bd-rise" style={delay(200)}>
          什么时候轮到这套流程？
        </div>
        <div className="bd-signals">
          {/* 信号一 */}
          <div className={`bd-signal ${active === 0 ? "bd-signal--active" : "bd-signal--done"}`}>
            <span className="bd-signal-ord mono">01</span>
            <div className="bd-signal-body">
              <div className="bd-signal-name">程序会挂起，而且 CPU 空闲</div>
            </div>
            {active === 1 && <span className="bd-signal-mark mono">✓</span>}
          </div>
          {/* 信号二 */}
          <div className={`bd-signal ${active === 1 ? "bd-signal--active" : "bd-signal--todo"}`}>
            <span className="bd-signal-ord mono">02</span>
            <div className="bd-signal-body">
              <div className="bd-signal-name">多把锁：一把还没放，又去拿另一把</div>
              {active === 1 && (
                <div className="bd-nested bd-rise" style={delay(800)} aria-hidden>
                  <span className="bd-nested-lock bd-nested-lock--held mono">A</span>
                  <span className="bd-nested-link" />
                  <span className="bd-nested-lock mono">B</span>
                  <span className="bd-nested-note mono">持有 A · 够着要 B</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — 边界：只有一把锁，圈凑不成 */
  if (step === 6) {
    return (
      <div className="scene-pad bd-scene bd-boundary-scene">
        <div className="bd-boundary-head bd-rise">
          <span className="label-mono">边界 · 用不着</span>
        </div>
        <div className="bd-boundary-main">
          <div className="bd-boundary-lock">
            <svg viewBox="0 0 120 150" aria-hidden className="bd-lock-svg bd-pop">
              <rect className="bd-lock-body" x="25" y="62" width="70" height="60" rx="4" />
              <path className="bd-lock-shackle" d="M 42 62 V 42 A 18 18 0 0 1 78 42 V 62" />
              <circle className="bd-lock-hole" cx="60" cy="88" r="7" />
            </svg>
            <div className="bd-lock-label mono">LOCK_A · 唯一</div>
          </div>
          <div className="bd-boundary-circle">
            <svg viewBox="0 0 200 210" aria-hidden className="bd-circle-svg bd-rise" style={delay(500)}>
              <circle
                className="bd-circle-arc"
                cx="100"
                cy="108"
                r="70"
                strokeDasharray="295 70"
              />
              <text
                className="bd-circle-q"
                x="100"
                y="40"
                textAnchor="middle"
                dominantBaseline="central"
              >
                ?
              </text>
            </svg>
            <div className="bd-circle-label mono bd-rise" style={delay(1100)}>
              缺一环 · 圈合不上
            </div>
          </div>
        </div>
        <div className="bd-boundary-line bd-rise" style={delay(1600)}>
          循环等待<span className="bd-accent">根本凑不成</span>
        </div>
      </div>
    );
  }

  /* step 7 — 边界：纯 asyncio / 分布式死锁（两卡随语序先后亮） */
  if (step === 7) {
    return (
      <div className="scene-pad bd-scene bd-edge-scene">
        <div className="bd-edge-head bd-rise">
          <span className="label-mono">边界 · 也用不着</span>
        </div>
        <div className="bd-edge-cards">
          <div className="bd-edge-card card bd-pop">
            <div className="label-mono bd-edge-tag">纯 asyncio</div>
            <div className="bd-edge-name">忘了 await</div>
            <div className="bd-edge-talk">排查思路不一样</div>
          </div>
          <div className="bd-edge-card card bd-pop" style={delay(4600)}>
            <div className="label-mono bd-edge-tag">分布式死锁</div>
            <div className="bd-edge-name">本进程的工具看不见</div>
            <div className="bd-edge-talk">得换分布式追踪</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 8 — 备选工具：py-spy / threading.enumerate */
  const tools = [
    {
      tag: "第三方",
      name: "py-spy",
      talk: "随时附到进程上看栈",
      sub: "没法预埋埋点的现场",
    },
    {
      tag: "标准库",
      name: "threading.enumerate",
      talk: "看现在谁活着",
      sub: "一行代码，不装任何东西",
    },
  ];
  return (
    <div className="scene-pad bd-scene bd-tool-scene">
      <div className="bd-tool-head bd-rise">
        <span className="label-mono">工具箱 · 备选</span>
      </div>
      <div className="bd-tools">
        {tools.map((t, i) => (
          <div className="bd-tool card bd-pop" style={delay(i === 0 ? 1200 : 5200)} key={t.name}>
            <div className="label-mono bd-tool-tag">{t.tag}</div>
            <div className="bd-tool-name mono">{t.name}</div>
            <div className="bd-tool-talk">{t.talk}</div>
            <div className="bd-tool-sub mono">{t.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
