import type { ChapterStepProps } from "../../registry/types";
import "./Lazy.css";

/**
 * ch06 · lazy — 惰性管道（4 steps）
 *
 * step 0  无限流概念：integers() 不会算完
 * step 1  管道串联：integers → map → filter → take（四环节接线）
 * step 2  真机：前十个偶数平方逐个滴灌
 * step 3  日志管道四环节 + 输出
 */

const PIPE_NODES = [
  { name: "integers", desc: "无限生成" },
  { name: "map", desc: "平方" },
  { name: "filter", desc: "留偶数" },
  { name: "take", desc: "取十个" },
];

const LOG_NODES = ["log_lines", "parse", "filter_errors", "take(5)"];

export default function LazyChapter({ step }: ChapterStepProps) {
  /* step 0 — 无限流 */
  if (step === 0) {
    return (
      <div className="scene-pad lz-scene lz-infinite-scene">
        <div className="lz-infinite-lead lz-rise">真正的大杀器：惰性管道</div>
        <div className="lz-infinite-stream lz-rise" style={{ animationDelay: "500ms" }}>
          <span className="lz-stream-num">1</span>
          <span className="lz-stream-num">2</span>
          <span className="lz-stream-num">3</span>
          <span className="lz-stream-num">4</span>
          <span className="lz-stream-dots">⋯</span>
          <span className="lz-stream-note">integers() · 无限生成</span>
        </div>
        <div className="lz-infinite-foot lz-rise" style={{ animationDelay: "1700ms" }}>
          不用怕，<b>它不会算完</b>
        </div>
      </div>
    );
  }

  /* step 1 — 管道串联 */
  if (step === 1) {
    return (
      <div className="scene-pad lz-scene lz-pipe-scene">
        <div className="lz-pipe-lead lz-rise">管道串起来</div>
        <div className="lz-pipe">
          {PIPE_NODES.map((n, i) => (
            <span key={n.name} className="lz-pipe-unit">
              {i > 0 && <span className="lz-pipe-link lz-rise" style={{ animationDelay: `${700 + i * 400}ms` }} />}
              <span className="lz-pipe-node lz-rise" style={{ animationDelay: `${400 + i * 400}ms` }}>
                <span className="lz-pipe-name">{n.name}</span>
                <span className="lz-pipe-desc">{n.desc}</span>
              </span>
            </span>
          ))}
        </div>
        <div className="lz-pipe-foot lz-rise" style={{ animationDelay: "2400ms" }}>
          每个值，<b>要一个才算一个</b>
        </div>
      </div>
    );
  }

  /* step 2 — 真机偶数平方 */
  if (step === 2) {
    const squares = [0, 4, 16, 36, 64, 100, 144, 196, 256, 324];
    return (
      <div className="scene-pad lz-scene lz-squares-scene">
        <div className="lz-squares-lead lz-rise">前十个偶数的平方</div>
        <div className="lz-squares">
          {squares.map((n, i) => (
            <span key={n} className="lz-square lz-pop" style={{ animationDelay: `${500 + i * 160}ms` }}>
              {n}
            </span>
          ))}
        </div>
        <div className="lz-squares-foot lz-rise" style={{ animationDelay: "2600ms" }}>
          要一个，<b>才算一个</b>
        </div>
      </div>
    );
  }

  /* step 3 — 日志管道 */
  return (
    <div className="scene-pad lz-scene lz-log-scene">
      <div className="lz-log-pipe lz-rise">
        {LOG_NODES.map((n, i) => (
          <span key={n} className="lz-log-unit">
            {i > 0 && <span className="lz-log-arrow">→</span>}
            <span className="lz-log-node">{n}</span>
          </span>
        ))}
      </div>
      <div className="lz-log-lines lz-rise" style={{ animationDelay: "900ms" }}>
        <div className="lz-log-line">[2024-01-03 10:02:02] connection timeout</div>
        <div className="lz-log-line">[2024-01-06 10:05:05] db query slow</div>
        <div className="lz-log-line">[2024-01-09 10:08:08] cache miss</div>
        <div className="lz-log-dim">…</div>
      </div>
      <div className="lz-log-foot lz-rise" style={{ animationDelay: "2200ms" }}>
        每个环节，<b>一次只处理一个元素</b>
      </div>
    </div>
  );
}
