import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 三样零件（step 4 预告卡）。 */
const PARTS = [
  { ord: "01", code: "asyncio.Queue", cn: "队列", talk: "传送带 · 满了 put 就挂起" },
  { ord: "02", code: "Semaphore", cn: "信号量", talk: "并发闸门 · 拿不到许可排队" },
  { ord: "03", code: "backpressure", cn: "背压", talk: "把压力顶回源头" },
] as const;

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="label-mono hk-rise">PYTHON · CONCURRENCY 10</div>
          <hr className="rule hk-title-rule hk-rise" style={delay(180)} />
          <h1 className="hk-title-main hk-rise" style={delay(320)}>
            <span className="hk-title-accent">异步</span>流水线
          </h1>
          <div className="hk-title-en hk-rise" style={delay(620)}>
            Async Pipelines · Single Thread
          </div>
          <div className="hk-title-sub hk-rise" style={delay(880)}>
            单线程，跑出每秒 200 万条任务
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={delay(1150)}>
          <div className="hk-tb-row"><span>Series</span><b>hands-on-python</b></div>
          <div className="hk-tb-row"><span>Lab</span><b>concurrency / 10</b></div>
          <div className="hk-tb-row"><span>API</span><b>asyncio.Queue · Semaphore</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — 第一数：2.4 毫秒（0.00s 的真身） */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene hk-num-scene">
        <div className="hk-num-head hk-rise">
          <span className="label-mono">实测 · 第一数</span>
          <span className="hk-num-ord mono">01 / 03</span>
        </div>
        <div className="hk-num-body">
          <div className="hk-num-hero">
            <div className="hk-hero-figure hk-pop" style={delay(250)}>
              <span className="hero-num hk-hero-value">2.4</span>
              <span className="hk-hero-unit mono">ms</span>
            </div>
            <div className="hk-hero-caption hk-rise" style={delay(550)}>
              5000 条任务的全部耗时
            </div>
            <div className="hk-hero-stamp hk-rise" style={delay(1900)}>
              执行者 · 单线程 · 零把锁
            </div>
          </div>
          <div className="hk-num-zoom">
            <div className="hk-zoom-term hk-rise" style={delay(800)}>
              <span className="hk-term-prompt mono">$</span>
              <span className="mono">耗时 0.0024s</span>
              <span className="hk-term-mark mono">← 实测值</span>
            </div>
            <div className="hk-zoom-track-wrap hk-rise" style={delay(1200)}>
              <div className="hk-zoom-track">
                <div className="hk-zoom-sliver hk-zoom-grow" style={delay(1700)} />
              </div>
              <div className="hk-zoom-axis mono">
                <span>0</span>
                <span>2.4 ms</span>
                <span>1 秒</span>
              </div>
            </div>
            <div className="hk-zoom-conv hk-rise" style={delay(2300)}>
              <span className="label-mono">折算</span>
              <span className="mono">5000 ÷ 2.4 ms ≈ 2,041,580 条/秒</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 第二数：50 个任务，在飞峰值钳在 10 */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene hk-gate-scene">
        <div className="hk-num-head hk-rise">
          <span className="label-mono">实测 · 第二数</span>
          <span className="hk-num-ord mono">02 / 03</span>
        </div>
        <div className="hk-gate-body">
          <div className="hk-gate-flow">
            <div className="hk-gate-col hk-rise" style={delay(200)}>
              <div className="hk-gate-col-label label-mono">50 个任务 · 一齐出发</div>
              <div className="hk-dotgrid">
                {Array.from({ length: 50 }, (_, i) => (
                  <span
                    key={i}
                    className="hk-dot hk-dot-enter"
                    style={delay(500 + i * 18)}
                  />
                ))}
              </div>
            </div>
            <div className="hk-gate-gate hk-pop" style={delay(1400)}>
              <div className="hk-gate-slot" />
              <div className="hk-gate-name mono">Semaphore(10)</div>
            </div>
            <div className="hk-gate-col hk-rise" style={delay(1800)}>
              <div className="hk-gate-col-label label-mono">在飞 · 同时未完成</div>
              <div className="hk-dotgrid hk-dotgrid-fly">
                {Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={i}
                    className="hk-dot hk-dot-acc hk-dot-pop"
                    style={delay(2100 + i * 90)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="hk-gate-readout">
            <span className="hero-num hk-gate-num hk-pop" style={delay(2500)}>10</span>
            <div className="hk-gate-note hk-rise" style={delay(2900)}>
              在飞 ＝ 已经发出去、还没干完
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 第三数：无界 4749 vs 有界 64 */
  if (step === 3) {
    return (
      <div className="scene-pad hk-scene hk-bar-scene">
        <div className="hk-num-head hk-rise">
          <span className="label-mono">实测 · 第三数</span>
          <span className="hk-num-ord mono">03 / 03</span>
        </div>
        <div className="hk-bar-main">
          <div className="hk-bar-context hk-rise" style={delay(150)}>
            同一个慢消费者 · 生产快于消费
          </div>
          <div className="hk-bars">
            <div className="hk-bar-row">
              <span className="hk-bar-label mono">无界队列</span>
              <div className="hk-bar-track">
                <div className="hk-bar-fill hk-bar-grow" style={delay(500)} />
              </div>
              <span className="hk-bar-value mono">4,749 条 · 一路狂奔</span>
            </div>
            <div className="hk-bar-row">
              <span className="hk-bar-label mono">maxsize=64</span>
              <div className="hk-bar-track">
                <div className="hk-bar-fill hk-bar-fill--acc hk-bar-grow" style={delay(1500)} />
              </div>
              <span className="hk-bar-value mono">64 条 · 恒定</span>
            </div>
          </div>
          <div className="hk-bar-times">
            <span className="hero-num hk-bar-x hk-pop" style={delay(2500)}>×74</span>
            <span className="hk-bar-x-note hk-rise" style={delay(2900)}>差了 74 倍</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 三零件预告：Queue / Semaphore / 背压 */
  return (
    <div className="scene-pad hk-scene hk-parts-scene">
      <div className="hk-parts-kicker hk-rise">
        <span className="label-mono">三个数 · 三样零件</span>
      </div>
      <div className="hk-parts">
        {PARTS.map((p, i) => (
          <div className="hk-parts-item" key={p.ord}>
            {i > 0 && (
              <span className="hk-parts-arrow hk-rise" style={delay(500 + i * 550)}>
                →
              </span>
            )}
            <div className="hk-parts-card hk-pop" style={delay(i * 550)}>
              <div className="hk-parts-ord mono">{p.ord}</div>
              <div className="hk-parts-code mono">{p.code}</div>
              <div className="hk-parts-cn">{p.cn}</div>
              <div className="hk-parts-talk">{p.talk}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="hk-parts-tagline hk-rise" style={delay(1900)}>
        <span className="hk-tag-accent">挨个</span>拆开
      </div>
    </div>
  );
}
