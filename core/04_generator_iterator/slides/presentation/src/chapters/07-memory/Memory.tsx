import type { ChapterStepProps } from "../../registry/types";
import "./Memory.css";

/**
 * ch07 · memory — 内存对比（3 steps）
 *
 * step 0  真机双条：3,516 KB vs 104 bytes
 * step 1  倍数 hero：~34,621x smaller
 * step 2  诚实预期卡 + 对比表淡色背景
 */

const TABLE = [
  ["内存", "O(n) 全部存储", "O(1) 逐个处理"],
  ["何时计算", "立即全部计算", "按需逐个计算"],
  ["无限流", "不支持", "支持"],
  ["适合", "需要多次遍历", "单次遍历"],
];

export default function MemoryChapter({ step }: ChapterStepProps) {
  /* step 0 — 真机双条 */
  if (step === 0) {
    return (
      <div className="scene-pad mm-scene mm-terms-scene">
        <div className="mm-term mm-rise">
          <div className="mm-term-bar">python3 generator_iterator.py</div>
          <div className="mm-term-body">
            <div className="mm-term-line mm-line-in" style={{ animationDelay: "400ms" }}>
              List comprehension:&nbsp;&nbsp;~3,516 KB
            </div>
            <div className="mm-term-line mm-term-acc mm-line-in" style={{ animationDelay: "1600ms" }}>
              Generator expression:&nbsp;&nbsp;104 bytes
            </div>
          </div>
        </div>

        <div className="mm-bars">
          <div className="mm-bar-row">
            <span className="mm-bar-label">列表</span>
            <span className="mm-bar mm-bar-long mm-bar-grow" style={{ animationDelay: "2200ms" }} />
          </div>
          <div className="mm-bar-row">
            <span className="mm-bar-label">生成器</span>
            <span className="mm-bar mm-bar-tiny mm-bar-grow" style={{ animationDelay: "2900ms" }} />
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 倍数 hero */
  if (step === 1) {
    return (
      <div className="scene-pad mm-scene mm-ratio-scene">
        <div className="mm-ratio-num mm-pop">~34,621x</div>
        <div className="mm-ratio-word mm-rise" style={{ animationDelay: "1100ms" }}>
          smaller
        </div>
      </div>
    );
  }

  /* step 2 — 诚实预期 + 对比表背景 */
  return (
    <div className="scene-pad mm-scene mm-honest-scene">
      <div className="mm-honest-table mm-rise" aria-hidden>
        <div className="mm-honest-row mm-honest-head">
          <span />
          <span>列表推导</span>
          <span>生成器管道</span>
        </div>
        {TABLE.map(([k, a, b]) => (
          <div key={k} className="mm-honest-row">
            <span>{k}</span>
            <span>{a}</span>
            <span>{b}</span>
          </div>
        ))}
      </div>

      <div className="mm-honest-card mm-pop" style={{ animationDelay: "900ms" }}>
        <div className="mm-honest-line">数值随版本变（getsizeof 估算）</div>
        <div className="mm-honest-line mm-honest-line-acc">但数量级差距，稳定</div>
      </div>
    </div>
  );
}
