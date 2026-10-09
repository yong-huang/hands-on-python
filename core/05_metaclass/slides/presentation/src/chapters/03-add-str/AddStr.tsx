import type { ChapterStepProps } from "../../registry/types";
import "./AddStr.css";

/**
 * ch03 · add-str — 自动加方法（4 steps）
 *
 * step 0  需求卡：第一件，自动加方法
 * step 1  真机：Person 注入成功
 * step 2  转折：custom str → metaclass skipped
 * step 3  原则卡：尊重已有定义
 */

export default function AddStrChapter({ step }: ChapterStepProps) {
  /* step 0 — 需求卡 */
  if (step === 0) {
    return (
      <div className="scene-pad as-scene as-req-scene">
        <div className="as-req-head as-rise">
          元类能干什么？<b>第一件</b>
        </div>
        <div className="as-req-body as-rise" style={{ animationDelay: "500ms" }}>
          给一批类，自动加方法
        </div>
        <div className="as-req-example as-rise" style={{ animationDelay: "1200ms" }}>
          比如：自动 <span className="as-req-mono">__str__</span>
        </div>
      </div>
    );
  }

  /* step 1 — 注入成功 */
  if (step === 1) {
    return (
      <div className="scene-pad as-scene as-inject-scene">
        <div className="as-inject-term as-rise">
          <div className="as-inject-bar">python3 metaclass.py</div>
          <div className="as-inject-body">
            <div className="as-inject-line as-line-in" style={{ animationDelay: "300ms" }}>
              Person({'{'}'name': 'Alice', 'age': 30{'}'})
            </div>
          </div>
        </div>
        <div className="as-inject-stamp as-pop" style={{ animationDelay: "1500ms" }}>
          自动注入 ✓
        </div>
      </div>
    );
  }

  /* step 2 — 转折：skipped */
  if (step === 2) {
    return (
      <div className="scene-pad as-scene as-skip-scene">
        <div className="as-skip-term as-rise">
          <div className="as-inject-bar">类自己定义了 __str__</div>
          <div className="as-inject-body">
            <div className="as-inject-line as-line-in">custom str</div>
            <div className="as-inject-line as-inject-line-dim as-line-in" style={{ animationDelay: "900ms" }}>
              metaclass skipped
            </div>
          </div>
        </div>
        <div className="as-skip-note as-rise" style={{ animationDelay: "1900ms" }}>
          用户自己写了，<b>元类就跳过</b>
        </div>
      </div>
    );
  }

  /* step 3 — 原则卡 */
  return (
    <div className="scene-pad as-scene as-rule-scene">
      <div className="as-rule-lead as-rise">
        批量注入，必须<b>尊重已有定义</b>
      </div>
      <div className="as-rule-sub as-rise" style={{ animationDelay: "700ms" }}>
        不然会悄悄覆盖用户的实现
      </div>
    </div>
  );
}
