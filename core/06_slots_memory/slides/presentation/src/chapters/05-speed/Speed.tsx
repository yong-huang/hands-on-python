import type { ChapterStepProps } from "../../registry/types";
import "./Speed.css";

/**
 * ch05 · speed — 速度真相（3 steps）
 *
 * step 0  历史卡：3.10 及以前提速 10%~40%
 * step 1  真机基准：3.13 write 0.91x / read 0.99x（3.10 对照角标）
 * step 2  定论 hero：理由是内存，不是速度
 */

export default function SpeedChapter({ step }: ChapterStepProps) {
  /* step 0 — 历史 */
  if (step === 0) {
    return (
      <div className="scene-pad sp-scene sp-history-scene">
        <div className="sp-history-kicker sp-rise">那速度呢？</div>
        <div className="sp-history-line sp-rise" style={{ animationDelay: "500ms" }}>
          历史上（3.10 及以前），属性访问确实能
        </div>
        <div className="sp-history-num sp-pop" style={{ animationDelay: "1300ms" }}>
          提速 10%~40%
        </div>
      </div>
    );
  }

  /* step 1 — 真机基准 */
  if (step === 1) {
    return (
      <div className="scene-pad sp-scene sp-bench-scene">
        <div className="sp-bench-term sp-rise">
          <div className="sp-bench-bar">Attribute access speed (1M iterations x 100 objects)</div>
          <div className="sp-bench-body">
            <div className="sp-bench-line sp-line-in" style={{ animationDelay: "300ms" }}>
              regular_write: 0.6052s
            </div>
            <div className="sp-bench-line sp-line-in" style={{ animationDelay: "1000ms" }}>
              slot_write:&nbsp;&nbsp;&nbsp; 0.6676s
            </div>
            <div className="sp-bench-line sp-line-in" style={{ animationDelay: "1700ms" }}>
              regular_read:&nbsp; 0.6560s
            </div>
            <div className="sp-bench-line sp-line-in" style={{ animationDelay: "2400ms" }}>
              slot_read:&nbsp;&nbsp;&nbsp;&nbsp; 0.6643s
            </div>
          </div>
        </div>

        <div className="sp-ratios">
          <div className="sp-ratio sp-pop" style={{ animationDelay: "3100ms" }}>
            <span className="sp-ratio-k">3.13 写</span>
            <span className="sp-ratio-v">0.91x</span>
          </div>
          <div className="sp-ratio sp-pop" style={{ animationDelay: "3600ms" }}>
            <span className="sp-ratio-k">3.13 读</span>
            <span className="sp-ratio-v">0.99x</span>
          </div>
          <div className="sp-ratio sp-ratio-dim sp-pop" style={{ animationDelay: "4100ms" }}>
            <span className="sp-ratio-k">3.10 对照</span>
            <span className="sp-ratio-v">写 1.38x / 读 1.08x</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 定论 */
  return (
    <div className="scene-pad sp-scene sp-verdict-scene">
      <div className="sp-verdict-old sp-rise">
        「slots 快 20-30%」= <span className="sp-verdict-old-tag">旧经验值</span>
      </div>
      <div className="sp-verdict-big sp-rise" style={{ animationDelay: "1200ms" }}>
        今天用 slots，理由是<b>内存</b>，不是速度
      </div>
    </div>
  );
}
