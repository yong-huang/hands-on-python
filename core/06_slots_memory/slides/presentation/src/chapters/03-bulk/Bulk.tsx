import type { ChapterStepProps } from "../../registry/types";
import "./Bulk.css";

/**
 * ch03 · bulk — 万级实例实测（3 steps）
 *
 * step 0  批量横条：1328.1 KB vs 468.8 KB → 省 64.7%
 * step 1  版本角标：3.10 能省 68.4%
 * step 2  口径坑：getsizeof 只算本体
 */

export default function BulkChapter({ step }: ChapterStepProps) {
  /* step 0 — 批量横条 */
  if (step === 0) {
    return (
      <div className="scene-pad bk-scene bk-bars-scene">
        <div className="bk-bars-lead bk-rise">真机跑批量：10,000 个实例</div>

        <div className="bk-bars">
          <div className="bk-bar-row bk-rise" style={{ animationDelay: "500ms" }}>
            <span className="bk-bar-label">普通版</span>
            <span className="bk-bar-track">
              <span className="bk-bar bk-bar-regular" />
            </span>
            <span className="bk-bar-val">1328.1 KB</span>
          </div>
          <div className="bk-bar-row bk-rise" style={{ animationDelay: "1300ms" }}>
            <span className="bk-bar-label">slots 版</span>
            <span className="bk-bar-track">
              <span className="bk-bar bk-bar-slots" />
            </span>
            <span className="bk-bar-val bk-bar-val-acc">468.8 KB</span>
          </div>
        </div>

        <div className="bk-savings bk-pop" style={{ animationDelay: "2400ms" }}>
          省 <span className="bk-savings-num">64.7%</span>
        </div>
      </div>
    );
  }

  /* step 1 — 版本角标 */
  if (step === 1) {
    return (
      <div className="scene-pad bk-scene bk-version-scene">
        <div className="bk-version-line bk-rise">
          3.10 上能省到 <span className="bk-version-num">68.4%</span>
        </div>
        <div className="bk-version-note bk-fade" style={{ animationDelay: "1200ms" }}>
          两版的实例字典大小不一样
        </div>
      </div>
    );
  }

  /* step 2 — 口径坑 */
  return (
    <div className="scene-pad bk-scene bk-caliper-scene">
      <div className="bk-caliper-lead bk-rise">口径提醒：getsizeof 只算本体</div>

      <div className="bk-caliper-cards">
        <div className="bk-caliper-card bk-rise" style={{ animationDelay: "700ms" }}>
          <span className="bk-caliper-mono">getsizeof(p)</span>
          <span className="bk-caliper-val">48</span>
          <span className="bk-caliper-note">两个类都显示 48</span>
        </div>
        <div className="bk-caliper-card bk-caliper-card-acc bk-rise" style={{ animationDelay: "1500ms" }}>
          <span className="bk-caliper-mono">+ getsizeof(__dict__)</span>
          <span className="bk-caliper-val">344</span>
          <span className="bk-caliper-note">这才是真实开销</span>
        </div>
      </div>

      <div className="bk-caliper-foot bk-rise" style={{ animationDelay: "2300ms" }}>
        都显示 48 <b>不是 bug</b>，真开销看批量对比
      </div>
    </div>
  );
}
