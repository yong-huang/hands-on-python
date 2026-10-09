import type { ChapterStepProps } from "../../registry/types";
import "./Stdlib.css";

/**
 * ch06 · stdlib — 现成货与标配动作（5 steps）
 *
 * step 0  @lru_cache 登场
 * step 1  fib(30)：0.30s → 0.00s
 * step 2  函数体 0 行改动
 * step 3  标配动作：functools.wraps
 * step 4  反例：满屏 wrapper
 */
export default function StdlibChapter({ step }: ChapterStepProps) {
  /* step 0 — @lru_cache 登场 */
  if (step === 0) {
    return (
      <div className="scene-pad sd-scene">
        <div className="sd-kicker-row sd-rise">
          <span className="sd-kicker-badge">functools · 标准库现成货</span>
        </div>
        <div className="sd-codecard sd-rise" style={{ animationDelay: "400ms" }}>
          <div className="sd-line">from functools import lru_cache</div>
          <div className="sd-line sd-line-blank">&nbsp;</div>
          <div className="sd-line sd-line-deco">@lru_cache(maxsize=None)</div>
          <div className="sd-line">def fib(n):</div>
          <div className="sd-line sd-line-indent">if n &lt; 2: return n</div>
          <div className="sd-line sd-line-indent">return fib(n-1) + fib(n-2)</div>
        </div>
        <div className="sd-one-line sd-rise" style={{ animationDelay: "2200ms" }}>
          一行 <span className="sd-at">@</span>，函数就带上了缓存
        </div>
      </div>
    );
  }

  /* step 1 — 0.30s vs 0.00s */
  if (step === 1) {
    return (
      <div className="scene-pad sd-scene">
        <div className="sd-fib-title sd-rise">
          fib(30) <span className="sd-fib-result">= 832040</span>
        </div>
        <div className="sd-bars">
          <div className="sd-bar-row sd-rise" style={{ animationDelay: "700ms" }}>
            <span className="sd-bar-label">裸算</span>
            <div className="sd-bar-track">
              <div className="sd-bar sd-bar-slow" />
            </div>
            <span className="sd-bar-num">0.30s</span>
          </div>
          <div className="sd-bar-row sd-rise" style={{ animationDelay: "2400ms" }}>
            <span className="sd-bar-label">挂缓存 · 第二次</span>
            <div className="sd-bar-track">
              <div className="sd-bar sd-bar-fast" />
            </div>
            <span className="sd-bar-num sd-bar-num-accent">0.00s</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 函数体 0 行改动 */
  if (step === 2) {
    return (
      <div className="scene-pad sd-scene">
        <div className="sd-codecard sd-codecard-dim">
          <div className="sd-line sd-dim">from functools import lru_cache</div>
          <div className="sd-line sd-line-blank sd-dim">&nbsp;</div>
          <div className="sd-line sd-line-deco sd-line-focus">@lru_cache(maxsize=None)</div>
          <div className="sd-line sd-dim">def fib(n):</div>
          <div className="sd-line sd-line-indent sd-dim">if n &lt; 2: return n</div>
          <div className="sd-line sd-line-indent sd-dim">return fib(n-1) + fib(n-2)</div>
        </div>
        <div className="sd-zero sd-rise" style={{ animationDelay: "900ms" }}>
          函数体 · <span className="sd-zero-num">0</span> 行改动
        </div>
      </div>
    );
  }

  /* step 3 — functools.wraps */
  if (step === 3) {
    return (
      <div className="scene-pad sd-scene sd-horizontal">
        <div className="sd-codecard sd-rise">
          <div className="sd-line">def timer(func):</div>
          <div className="sd-line sd-line-indent sd-line-marked">@functools.wraps(func)</div>
          <div className="sd-line sd-line-indent">def wrapper(*args, **kwargs):</div>
          <div className="sd-line sd-line-indent2">...</div>
          <div className="sd-line sd-line-indent">return wrapper</div>
        </div>
        <div className="sd-wraps-notes">
          <div className="sd-kicker-badge sd-rise" style={{ animationDelay: "900ms" }}>
            自己写装饰器 · 标配第一行
          </div>
          <div className="sd-wraps-item sd-rise" style={{ animationDelay: "1900ms" }}>
            保住 <code>__name__</code>
          </div>
          <div className="sd-wraps-item sd-rise" style={{ animationDelay: "2700ms" }}>
            保住 <code>__doc__</code>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 满屏 wrapper */
  return (
    <div className="scene-pad sd-scene">
      <div className="sd-warn-title sd-rise">忘了 wraps，会怎样？</div>
      <div className="sd-term sd-rise" style={{ animationDelay: "500ms" }}>
        <div className="sd-term-bar">log output</div>
        <div className="sd-term-body">
          {["120.3ms", "118.9ms", "121.5ms"].map((t, i) => (
            <div key={t} className="sd-log sd-rise" style={{ animationDelay: `${1100 + i * 350}ms` }}>
              <span className="sd-log-tag">[timer]</span> <span className="sd-log-name">wrapper</span>{" "}
              耗时 {t}
            </div>
          ))}
        </div>
      </div>
      <div className="sd-warn-foot sd-rise" style={{ animationDelay: "2600ms" }}>
        名字全丢了 · 排查问题是真灾难
      </div>
    </div>
  );
}
