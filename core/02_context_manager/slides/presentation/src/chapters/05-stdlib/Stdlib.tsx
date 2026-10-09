import type { ChapterStepProps } from "../../registry/types";
import "./Stdlib.css";

/**
 * ch05 · stdlib — 标准库现成货（4 steps）
 *
 * step 0  contextlib 货架过渡
 * step 1  suppress：1 行 vs 4 行对比
 * step 2  redirect_stdout：print 输出改道示意
 * step 3  地图收尾：一行 with 各管一件事
 */

export default function StdlibChapter({ step }: ChapterStepProps) {
  /* step 0 — 货架 */
  if (step === 0) {
    return (
      <div className="scene-pad sd-scene sd-shelf-scene">
        <div className="sd-shelf-head">
          <span className="sd-shelf-tag">contextlib</span>
          <span className="sd-shelf-title">现成货货架</span>
        </div>
        <div className="sd-shelf">
          <span className="sd-box sd-box-hot">suppress</span>
          <span className="sd-box sd-box-hot">redirect_stdout</span>
          <span className="sd-box">ExitStack</span>
          <span className="sd-box">…</span>
        </div>
        <div className="sd-shelf-rule" />
      </div>
    );
  }

  /* step 1 — suppress */
  if (step === 1) {
    return (
      <div className="scene-pad sd-scene sd-suppress-scene">
        <div className="sd-tool-head">
          <span className="sd-shelf-tag">contextlib</span>
          <span className="sd-tool-name">suppress</span>
          <span className="sd-tool-desc">优雅地忽略指定异常</span>
        </div>

        <div className="sd-compare">
          <div className="sd-codecard sd-codecard-dim sd-rise">
            <div className="sd-codecard-bar">try/except · 4 行</div>
            <pre className="sd-code">{`try:
    os.remove("maybe_exists.txt")
except FileNotFoundError:
    pass`}</pre>
          </div>

          <div className="sd-vs">→</div>

          <div className="sd-codecard sd-codecard-acc sd-rise" style={{ animationDelay: "500ms" }}>
            <div className="sd-codecard-bar">with suppress · 1 行</div>
            <pre className="sd-code sd-code-acc">{`with suppress(FileNotFoundError):
    os.remove("maybe_exists.txt")`}</pre>
          </div>
        </div>

        <div className="sd-suppress-foot sd-rise" style={{ animationDelay: "1800ms" }}>
          一行顶四行，<b>该抛的照抛，只是不吵</b>
        </div>
      </div>
    );
  }

  /* step 2 — redirect_stdout */
  if (step === 2) {
    return (
      <div className="scene-pad sd-scene sd-redirect-scene">
        <div className="sd-tool-head">
          <span className="sd-shelf-tag">contextlib</span>
          <span className="sd-tool-name">redirect_stdout</span>
          <span className="sd-tool-desc">把 print 输出改道</span>
        </div>

        <div className="sd-redirect-row">
          <div className="sd-codecard sd-rise">
            <div className="sd-codecard-bar">capture.py</div>
            <pre className="sd-code">{`buf = io.StringIO()
with redirect_stdout(buf):
    print("captured")`}</pre>
          </div>

          <div className="sd-redirect-flow">
            <div className="sd-print-line">
              <span className="sd-print-src sd-rise" style={{ animationDelay: "900ms" }}>
                print("captured")
              </span>
              <span className="sd-print-to sd-rise" style={{ animationDelay: "1300ms" }}>
                原本去屏幕 →
              </span>
            </div>
            <div className="sd-redirect-arrow sd-rise" style={{ animationDelay: "1700ms" }}>
              ↓ 改道
            </div>
            <div className="sd-buf sd-rise" style={{ animationDelay: "2100ms" }}>
              <span className="sd-buf-tag">buf</span>
              <span className="sd-buf-val sd-fade" style={{ animationDelay: "2600ms" }}>
                "captured"
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 地图收尾 */
  return (
    <div className="scene-pad sd-scene sd-map-scene">
      <div className="sd-map-line">
        一行 <b>with</b>，各管一件事
      </div>
      <div className="sd-map-row">
        <span className="sd-box sd-box-hot sd-rise">suppress · 忽略异常</span>
        <span className="sd-box sd-box-hot sd-rise" style={{ animationDelay: "250ms" }}>
          redirect_stdout · 改道输出
        </span>
        <span className="sd-box sd-rise" style={{ animationDelay: "500ms" }}>
          ExitStack · 动态资源
        </span>
      </div>
    </div>
  );
}
