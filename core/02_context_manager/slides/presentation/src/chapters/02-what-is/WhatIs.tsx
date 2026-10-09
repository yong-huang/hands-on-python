import type { ChapterStepProps } from "../../registry/types";
import "./WhatIs.css";

/**
 * ch02 · what-is — with 是什么（5 steps）
 *
 * step 0  资源的一生：进场 → 中间 → 出场（三段流程图 + 巡航点）
 * step 1  出场保证：成/败双轨汇入出场门 + 崩九次兜九次计数
 * step 2  as f 绑定：进场把资源递给你
 * step 3  语法糖等价式：with 一行 ≈ try/finally 五行
 * step 4  澄清卡：with ≠ try/except，异常照样抛
 */

const STAGES = [
  { ord: "1", mono: "__enter__", name: "进场", desc: "拿资源" },
  { ord: "2", mono: "with 块", name: "中间", desc: "跑你的代码" },
  { ord: "3", mono: "__exit__", name: "出场", desc: "交还资源" },
];

const STAGE_LIT_DELAYS = ["1700ms", "3000ms", "4600ms"];
const TICKS = Array.from({ length: 9 }, (_, i) => i);

export default function WhatIsChapter({ step }: ChapterStepProps) {
  /* step 0 — 资源的一生 */
  if (step === 0) {
    return (
      <div className="scene-pad wi-scene wi-life-scene">
        <div className="wi-head wi-rise">
          <span className="wi-head-tag">心智模型</span>
          <span className="wi-head-code">with obj as x:</span>
        </div>

        <div className="wi-lane-wrap">
          <div className="wi-lane">
            <span className="wi-runner" />
          </div>
          <div className="wi-stages">
            {STAGES.map((s, i) => (
              <div
                key={s.mono}
                className="wi-stage wi-rise"
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                <div className="wi-stage-top">
                  <span className="wi-stage-ord">{s.ord}</span>
                  <span className="wi-stage-mono">{s.mono}</span>
                </div>
                <div className="wi-stage-name">{s.name}</div>
                <div className="wi-stage-desc">{s.desc}</div>
                <span
                  className="wi-stage-lit"
                  style={{ animationDelay: STAGE_LIT_DELAYS[i] }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="wi-life-foot wi-rise" style={{ animationDelay: "5300ms" }}>
          资源的一生，<b>被 with 切成三步</b>
        </div>
      </div>
    );
  }

  /* step 1 — 出场保证：成/败都汇入出场门 */
  if (step === 1) {
    return (
      <div className="scene-pad wi-scene wi-guar-scene">
        <div className="wi-fork">
          <div className="wi-fork-src wi-rise">
            <div className="wi-fork-src-name">with 块</div>
            <div className="wi-fork-src-mono">your code</div>
          </div>
          <div className="wi-fork-rails">
            <div className="wi-rail wi-rail-ok">
              <span className="wi-rail-tag">正常完成</span>
            </div>
            <div className="wi-rail wi-rail-bad">
              <span className="wi-rail-tag">中途抛异常</span>
            </div>
          </div>
          <div className="wi-gate wi-pop" style={{ animationDelay: "1800ms" }}>
            <div className="wi-gate-mono">__exit__</div>
            <div className="wi-gate-name">出场</div>
            <span className="wi-gate-stamp wi-stamp-in" style={{ animationDelay: "2400ms" }}>
              都执行
            </span>
          </div>
        </div>

        <div className="wi-tally">
          <div className="wi-tally-row">
            <span className="wi-tally-label">崩 9 次</span>
            <span className="wi-tally-marks">
              {TICKS.map((i) => (
                <i key={i} className="wi-tick" style={{ animationDelay: `${2800 + i * 270}ms` }} />
              ))}
            </span>
          </div>
          <div className="wi-tally-row">
            <span className="wi-tally-label wi-tally-label-acc">兜 9 次</span>
            <span className="wi-tally-marks">
              {TICKS.map((i) => (
                <i key={i} className="wi-tick wi-tick-acc" style={{ animationDelay: `${2800 + i * 270}ms` }} />
              ))}
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — as 绑定：进场把资源递给你 */
  if (step === 2) {
    return (
      <div className="scene-pad wi-scene wi-as-scene">
        <div className="wi-as-code wi-rise">
          with open(<span className="wi-as-str">"data.txt"</span>){" "}
          <span className="wi-as-target">
            as f<span className="wi-as-target-line" />
          </span>
          :
        </div>

        <div className="wi-as-flow">
          <div className="wi-as-chip wi-rise" style={{ animationDelay: "900ms" }}>
            <div className="wi-as-chip-mono">__enter__ 返回值</div>
            <div className="wi-as-chip-name">资源</div>
          </div>
          <div className="wi-as-leader">
            <span className="wi-as-leader-label">进场 · 递给你</span>
          </div>
          <div className="wi-as-chip wi-as-chip-f wi-rise" style={{ animationDelay: "2100ms" }}>
            <div className="wi-as-chip-mono">as 变量</div>
            <div className="wi-as-chip-name">f</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 语法糖等价式 */
  if (step === 3) {
    return (
      <div className="scene-pad wi-scene wi-sugar-scene">
        <div className="wi-compare">
          <div className="wi-codecard wi-codecard-acc wi-rise">
            <div className="wi-codecard-bar">with · 1 行</div>
            <pre className="wi-code wi-code-oneline">
              {`with open("file.txt") as f: data = f.read()`}
            </pre>
          </div>

          <div className="wi-eq wi-pop" style={{ animationDelay: "1000ms" }}>
            ≈
          </div>

          <div className="wi-codecard wi-codecard-dim wi-rise" style={{ animationDelay: "500ms" }}>
            <div className="wi-codecard-bar">try/finally · 5 行</div>
            <pre className="wi-code">{`f = open("file.txt")
try:
    data = f.read()
finally:
    f.close()`}</pre>
          </div>
        </div>

        <div className="wi-sugar-foot wi-rise" style={{ animationDelay: "2600ms" }}>
          <b>谁获取、谁释放</b>，一眼看清
        </div>
      </div>
    );
  }

  /* step 4 — 澄清：with ≠ try/except */
  return (
    <div className="scene-pad wi-scene wi-clar-scene">
      <div className="wi-clar-head wi-rise">
        <span className="wi-clar-word">with</span>
        <span className="wi-clar-neq wi-pop" style={{ animationDelay: "700ms" }}>
          ≠
        </span>
        <span className="wi-clar-word">try/except</span>
      </div>

      <div className="wi-prop">
        <div className="wi-prop-token wi-rise" style={{ animationDelay: "1300ms" }}>
          ValueError
        </div>
        <div className="wi-prop-line wi-line-draw" style={{ animationDelay: "1800ms" }} />
        <div className="wi-prop-gate wi-pop" style={{ animationDelay: "2400ms" }}>
          <div className="wi-prop-gate-mono">with</div>
          <div className="wi-prop-gate-ok wi-fade-in" style={{ animationDelay: "3300ms" }}>
            出场 · 照做 OK
          </div>
        </div>
        <div className="wi-prop-line wi-line-draw" style={{ animationDelay: "3800ms" }} />
        <div className="wi-prop-exit wi-rise" style={{ animationDelay: "4300ms" }}>
          照样往上抛
        </div>
      </div>

      <div className="wi-clar-foot wi-rise" style={{ animationDelay: "5200ms" }}>
        它只保证一件事：<b>走之前，把资源还了</b>
      </div>
    </div>
  );
}
