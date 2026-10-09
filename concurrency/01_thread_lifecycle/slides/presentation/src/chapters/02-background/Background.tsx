import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Background.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** step 1 的 10 个串行请求段。 */
const SERIAL = ["req 1", "req 2", "req 3", "req 4", "req 5", "req 6", "req 7", "req 8", "req 9", "req 10"];

/** step 4 底部 10 条重叠等待的相对宽度（1.0 = 最慢的一个）。 */
const OVERLAP = [0.9, 1.0, 0.8, 0.95, 0.85, 0.7, 0.9, 1.0, 0.75, 0.88];

export default function BackgroundChapter({ step }: ChapterStepProps) {
  /* step 0 — 没有并发的世界：串行执行 */
  if (step === 0) {
    return (
      <div className="scene-pad bg-scene bg-serial-scene">
        <div className="bg-serial-left">
          <div className="label-mono bg-kicker bg-rise">没有并发的世界</div>
          <h1 className="bg-hero bg-rise" style={delay(250)}>
            同一时刻
            <br />
            只干<b className="bg-hero-accent">一件事</b>
          </h1>
          <div className="bg-term-card bg-rise" style={delay(1500)}>
            <span className="label-mono">名词</span>
            想同时干几件事 —— 这叫「并发」
          </div>
        </div>
        <div className="bg-serial-stack">
          {["任务 A", "任务 B", "任务 C"].map((t, i) => (
            <div className="bg-serial-row bg-rise" style={delay(600 + i * 500)} key={t}>
              <span className="bg-serial-name mono">{t}</span>
              <span className="bg-serial-state mono">{i === 0 ? "执行中…" : "排队等待"}</span>
            </div>
          ))}
          <div className="bg-serial-arrow bg-rise" style={delay(2100)}>↓ 依次执行</div>
        </div>
      </div>
    );
  }

  /* step 1 — I/O 干等：10 个请求串行 10 轮 */
  if (step === 1) {
    return (
      <div className="scene-pad bg-scene bg-wait-scene">
        <div className="bg-wait-head bg-rise">
          <span className="label-mono">碰上要干等的 I/O</span>
        </div>
        <div className="bg-wait-caption bg-rise" style={delay(300)}>
          10 个请求，<b className="bg-hero-accent">串行等 10 轮</b>
        </div>
        <div className="bg-wait-track">
          {SERIAL.map((r, i) => (
            <div className="bg-wait-cell bg-rise" style={delay(700 + i * 180)} key={r}>
              <div className="bg-wait-bar">
                <span className="bg-wait-dots mono">……</span>
              </div>
              <span className="bg-wait-label mono">{r}</span>
            </div>
          ))}
        </div>
        <div className="bg-cpu-note bg-rise" style={delay(2800)}>
          <span className="label-mono">CPU</span>
          干瞪眼 —— 大部分时间在等，不在算
        </div>
      </div>
    );
  }

  /* step 2 — 多进程：独立内存 + 传话通道 */
  if (step === 2) {
    return (
      <div className="scene-pad bg-scene bg-proc-scene">
        <div className="bg-proc-head bg-rise">
          <span className="label-mono">老办法 · 多进程</span>
          <span className="bg-proc-note mono">进程 ＝ 正在运行的一个程序</span>
        </div>
        <div className="bg-proc-row">
          <div className="bg-proc-box bg-rise" style={delay(300)}>
            <div className="bg-proc-title mono">进程 A</div>
            <div className="bg-proc-mem">
              <div className="label-mono">自己的内存</div>
              <div className="bg-proc-var mono">counter = 0</div>
            </div>
          </div>
          <div className="bg-proc-channel bg-rise" style={delay(1100)}>
            <div className="bg-proc-wire-label label-mono">
              进程间通信 · 传话通道
              <br />来回递 · 又慢又费劲
            </div>
          </div>
          <div className="bg-proc-box bg-rise" style={delay(600)}>
            <div className="bg-proc-title mono">进程 B</div>
            <div className="bg-proc-mem">
              <div className="label-mono">自己的内存</div>
              <div className="bg-proc-var mono">counter = ???</div>
            </div>
          </div>
        </div>
        <div className="bg-proc-verdict bg-rise" style={delay(2100)}>
          想共享一个计数器 —— <b className="bg-hero-accent">撞墙</b>
        </div>
      </div>
    );
  }

  /* step 3 — 线程登场：同一程序里的干活小分队 */
  if (step === 3) {
    return (
      <div className="scene-pad bg-scene bg-thread-scene">
        <div className="bg-proc-head bg-rise">
          <span className="label-mono">线程为此而生 · 同一个程序里</span>
          <span className="bg-proc-note mono">调度器 ＝ 操作系统里的排班管理员</span>
        </div>
        <div className="bg-thread-box bg-rise" style={delay(300)}>
          <div className="bg-thread-lanes">
            {["小分队 1", "小分队 2", "小分队 3"].map((t, i) => (
              <div className="bg-lane bg-rise" style={delay(800 + i * 450)} key={t}>
                <span className="bg-lane-name mono">{t}</span>
                <span className="bg-lane-bar" />
              </div>
            ))}
          </div>
          <div className="bg-shared-mem bg-rise" style={delay(2400)}>
            <span className="label-mono">共享内存</span>
            <span className="bg-shared-var mono">同一份 counter · 数据天然可达</span>
          </div>
        </div>
        <div className="bg-thread-cost bg-rise" style={delay(3100)}>
          便宜、不绕路。代价：<b className="bg-hero-accent">谁先干活，调度员说了算</b>
        </div>
      </div>
    );
  }

  /* step 4 — 重叠对比：串行相加 vs 重叠取最慢 */
  if (step === 4) {
    return (
      <div className="scene-pad bg-scene bg-overlap-scene">
        <div className="bg-overlap-hero bg-rise">
          总耗时 ≈ <b className="bg-hero-accent">最慢的那个</b>
        </div>
        <div className="bg-timeline-block bg-rise" style={delay(500)}>
          <div className="label-mono bg-tl-tag">串行 · 依次等</div>
          <div className="bg-tl-serial">
            {SERIAL.map((r, i) => (
              <span className="bg-tl-cell mono" key={r}>{i + 1}</span>
            ))}
          </div>
        </div>
        <div className="bg-timeline-block bg-rise" style={delay(1500)}>
          <div className="label-mono bg-tl-tag">10 个线程 · 等待全重叠</div>
          <div className="bg-tl-parallel">
            {OVERLAP.map((w, i) => (
              <div
                className={`bg-tl-bar${w === 1.0 ? " bg-tl-bar--slowest" : ""}`}
                style={{ width: `${w * 100}%`, animationDelay: `${1700 + i * 130}ms` }}
                key={i}
              />
            ))}
            <div className="bg-tl-maxline" />
            <span className="bg-tl-maxlabel label-mono">最慢的一个</span>
          </div>
        </div>
        <div className="bg-overlap-foot bg-rise" style={delay(3400)}>
          但<b className="bg-hero-accent">谁先跑完</b>，你说了不算
        </div>
      </div>
    );
  }

  /* step 5 — 边界：纯计算别用线程，GIL 闸门 */
  return (
    <div className="scene-pad bg-scene bg-gil-scene">
      <div className="bg-gil-left">
        <div className="label-mono bg-kicker bg-rise">边界 · WHEN NOT</div>
        <h1 className="bg-hero bg-rise" style={delay(250)}>
          纯计算，别用<b className="bg-hero-accent">线程</b>
        </h1>
        <div className="bg-gil-out bg-rise" style={delay(2400)}>
          <div className="bg-gil-out-row">
            <span className="mono bg-gil-out-when">想并行计算</span>
            <span className="bg-gil-out-arrow">→</span>
            <span>换多进程</span>
          </div>
          <div className="bg-gil-out-row">
            <span className="mono bg-gil-out-when">任务小、串行够快</span>
            <span className="bg-gil-out-arrow">→</span>
            <span>别折腾并发</span>
          </div>
        </div>
      </div>
      <div className="bg-gil-gate bg-rise" style={delay(1200)}>
        <div className="bg-gil-queue">
          {["线程 1", "线程 2", "线程 3", "线程 4"].map((t) => (
            <span className="bg-gil-chip mono" key={t}>{t}</span>
          ))}
        </div>
        <div className="bg-gil-gatebox">
          <div className="label-mono">全局大锁</div>
          <div className="bg-gil-name mono">GIL</div>
        </div>
        <span className="bg-gil-pass mono">1 个线程真干活</span>
      </div>
    </div>
  );
}
