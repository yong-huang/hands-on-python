import type { ChapterStepProps } from "../../registry/types";
import "./TwoSteps.css";

export default function TwoStepsChapter({ step }: ChapterStepProps) {
  /* step 0 — 两步流水线：空盒分配 → 装属性 */
  if (step === 0) {
    return (
      <div className="scene-pad ts-scene">
        <div className="ts-kicker ts-rise">MyClass() 的两次内部调用</div>
        <div className="ts-pipe">
          <div className="ts-pipe-call ts-rise" style={{ animationDelay: "200ms" }}>
            MyClass<span className="ts-paren">()</span>
          </div>
          <div className="ts-pipe-arrow ts-rise" style={{ animationDelay: "360ms" }}>→</div>
          <div className="card ts-pipe-card ts-rise" style={{ animationDelay: "520ms" }}>
            <div className="ts-pipe-no">01 · __new__</div>
            <div className="ts-pipe-what">
              分配内存<small>把实例造出来</small>
            </div>
            <div className="ts-box ts-box-raw" />
          </div>
          <div className="ts-pipe-arrow ts-rise" style={{ animationDelay: "760ms" }}>→</div>
          <div className="card ts-pipe-card ts-rise" style={{ animationDelay: "920ms" }}>
            <div className="ts-pipe-no">02 · __init__</div>
            <div className="ts-pipe-what">
              填属性<small>往实例里装东西</small>
            </div>
            <div className="ts-box ts-box-filled">
              <span className="ts-slot">key</span>
              <span className="ts-slot">value</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 金句：管生 / 管养 */
  if (step === 1) {
    return (
      <div className="scene-pad ts-scene">
        <div className="ts-crest">
          <div className="ts-crest-col ts-rise">
            <code className="ts-crest-dunder">__new__</code>
            <div className="ts-crest-char ts-crest-accent ts-stamp" style={{ animationDelay: "200ms" }}>生</div>
            <div className="ts-crest-cap ts-rise" style={{ animationDelay: "420ms" }}>决定给哪个对象</div>
          </div>
          <div className="ts-crest-divider" />
          <div className="ts-crest-col ts-rise" style={{ animationDelay: "420ms" }}>
            <code className="ts-crest-dunder">__init__</code>
            <div className="ts-crest-char ts-stamp" style={{ animationDelay: "520ms" }}>养</div>
            <div className="ts-crest-cap ts-rise" style={{ animationDelay: "680ms" }}>只负责初始化它</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 终端模拟：Tracked() 一次实例化，两行日志 */
  if (step === 2) {
    return (
      <div className="scene-pad ts-scene">
        <div className="ts-term">
          <div className="ts-term-head">
            <span className="ts-term-dot" />
            <span className="ts-term-dot" />
            <span className="ts-term-dot" />
            <span className="ts-term-title">python3 · Tracked 实验</span>
          </div>
          <pre className="ts-term-body"><code>
            <span className="ts-ln ts-rise">{">>> obj = Tracked()"}</span>
            <span className="ts-ln ts-ln-hot ts-wipe" style={{ animationDelay: "950ms" }}>
              {"__new__ called (#1) -> creating instance of Tracked"}
            </span>
            <span className="ts-ln ts-ln-hot ts-wipe" style={{ animationDelay: "1950ms" }}>
              {"__init__ called -> initializing <__main__.Tracked object at 0x1013e8440>"}
            </span>
          </code></pre>
        </div>
        <div className="ts-term-cap ts-rise" style={{ animationDelay: "2500ms" }}>
          一次实例化，两行日志 —— 两个方法都动了
        </div>
      </div>
    );
  }

  /* step 3 — 顺序结论：先 __new__ 后 __init__，雷打不动 */
  if (step === 3) {
    return (
      <div className="scene-pad ts-scene">
        <h1 className="ts-order-hero ts-rise">
          先 <code className="ts-mono-tag">__new__</code>，后{" "}
          <code className="ts-mono-tag">__init__</code>
        </h1>
        <div className="ts-order-sub ts-rise" style={{ animationDelay: "420ms" }}>
          顺序雷打不动
        </div>
        <div className="ts-order-chips">
          <span className="ts-chip ts-pop" style={{ animationDelay: "800ms" }}>
            __new__ called
          </span>
          <span className="ts-chip-arrow ts-rise" style={{ animationDelay: "980ms" }}>→</span>
          <span className="ts-chip ts-pop" style={{ animationDelay: "1160ms" }}>
            __init__ called
          </span>
        </div>
        <div className="ts-order-note ts-rise" style={{ animationDelay: "1600ms" }}>
          地址每次都不同 · 看顺序就行
        </div>
      </div>
    );
  }

  /* step 4 — 分工卡：cls vs self，实例 vs None */
  return (
    <div className="scene-pad ts-scene">
      <div className="ts-duel">
        <div className="card ts-duel-card ts-rise">
          <code className="ts-duel-name">__new__</code>
          <dl className="ts-duel-rows">
            <div className="ts-row">
              <dt>第一个参数</dt>
              <dd>
                <code className="ts-mono-tag">cls</code> —— 类本身
              </dd>
            </div>
            <div className="ts-row">
              <dt>干的活</dt>
              <dd>把实例造出来，还回去</dd>
            </div>
            <div className="ts-row">
              <dt>返回值</dt>
              <dd>必须返回实例</dd>
            </div>
          </dl>
        </div>
        <div className="card ts-duel-card ts-slide" style={{ animationDelay: "820ms" }}>
          <code className="ts-duel-name">__init__</code>
          <dl className="ts-duel-rows">
            <div className="ts-row">
              <dt>第一个参数</dt>
              <dd>
                <code className="ts-mono-tag">self</code> —— 实例
              </dd>
            </div>
            <div className="ts-row">
              <dt>干的活</dt>
              <dd>往实例里设置属性</dd>
            </div>
            <div className="ts-row">
              <dt>返回值</dt>
              <dd>
                <code className="ts-mono-tag">None</code>，写了也被忽略
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
