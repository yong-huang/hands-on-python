import type { ChapterStepProps } from "../../registry/types";
import "./WhatIs.css";

/**
 * ch02 · what-is — 装饰器是什么（4 steps）
 *
 * step 0  加工盒子：函数进、函数出
 * step 1  @timer 悄悄换掉原函数
 * step 2  语法糖：func = timer(func)
 * step 3  双装饰器叠加 = 洋葱
 */
export default function WhatIsChapter({ step }: ChapterStepProps) {
  /* step 0 — 加工盒子 */
  if (step === 0) {
    return (
      <div className="scene-pad wi-scene">
        <div className="wi-pipeline">
          <div className="wi-endpoint wi-rise">
            <div className="wi-endpoint-name">sleep()</div>
            <div className="wi-endpoint-tag">函数</div>
          </div>
          <div className="wi-wire wi-wire-l" />
          <div className="wi-box wi-rise" style={{ animationDelay: "900ms" }}>
            <div className="wi-box-name">timer</div>
            <div className="wi-box-sub">加工盒子</div>
          </div>
          <div className="wi-wire wi-wire-r" />
          <div className="wi-endpoint wi-endpoint-out wi-rise" style={{ animationDelay: "1900ms" }}>
            <div className="wi-endpoint-name">sleep()</div>
            <div className="wi-endpoint-tag wi-tag-accent">还是函数</div>
          </div>
        </div>
        <div className="wi-pipeline-foot wi-foot wi-rise" style={{ animationDelay: "2600ms" }}>
          <span>输入 · 一个函数</span>
          <span className="wi-foot-dot" />
          <span>输出 · 一个新函数</span>
        </div>
      </div>
    );
  }

  /* step 1 — @timer 悄悄换函数 */
  if (step === 1) {
    return (
      <div className="scene-pad wi-scene">
        <div className="wi-swap">
          <div className="wi-panel wi-rise">
            <div className="wi-panel-tag">Before</div>
            <div className="wi-panel-code">
              <div className="wi-cl">def sleep():</div>
              <div className="wi-cl wi-cl-indent">time.sleep(1)</div>
            </div>
            <div className="wi-panel-note">原函数 · 一个字没动</div>
          </div>

          <div className="wi-swap-mid wi-rise" style={{ animationDelay: "800ms" }}>
            <div className="wi-swap-at">@timer</div>
            <div className="wi-swap-arrow">→</div>
          </div>

          <div className="wi-panel wi-rise" style={{ animationDelay: "1300ms" }}>
            <div className="wi-panel-tag">After</div>
            <div className="wi-wrapped">
              <div className="wi-wrapped-layer">
                <span className="wi-wrapped-label">timer</span>
                <div className="wi-panel-code wi-panel-code-inner">
                  <div className="wi-cl">def sleep():</div>
                  <div className="wi-cl wi-cl-indent">time.sleep(1)</div>
                </div>
              </div>
            </div>
            <div className="wi-panel-note wi-note-accent">实际是包了一层的新函数</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 语法糖 */
  if (step === 2) {
    return (
      <div className="scene-pad wi-scene">
        <div className="wi-sugar">
          <div className="wi-sugar-left wi-rise">
            <div className="wi-cl wi-cl-deco">@timer</div>
            <div className="wi-cl">def sleep():</div>
            <div className="wi-cl wi-cl-indent">time.sleep(1)</div>
          </div>
          <div className="wi-sugar-eq wi-rise" style={{ animationDelay: "900ms" }}>
            =
          </div>
          <div className="wi-sugar-right wi-rise" style={{ animationDelay: "1400ms" }}>
            <span className="wi-var">sleep</span>
            <span className="wi-op"> = </span>
            <span className="wi-fn">timer(sleep)</span>
          </div>
        </div>

        <div className="wi-sugar-notes">
          <div className="wi-notechip wi-rise" style={{ animationDelay: "2600ms" }}>
            <i>①</i>把函数<span className="wi-em">喂给</span> timer
          </div>
          <div className="wi-notechip wi-rise" style={{ animationDelay: "3400ms" }}>
            <i>②</i>结果再<span className="wi-em">存回去</span>
          </div>
        </div>

        <div className="wi-sugar-foot wi-rise" style={{ animationDelay: "4400ms" }}>
          <span className="wi-foot-chip">没有魔法 · 普通函数调用</span>
          <span className="wi-foot-chip wi-foot-chip-accent">赚到 · 一行没改，多一层功能</span>
        </div>
      </div>
    );
  }

  /* step 3 — 洋葱叠加 */
  return (
    <div className="scene-pad wi-scene">
      <div className="wi-onion">
        <div className="wi-onion-code wi-rise">
          <div className="wi-cl">
            <span className="wi-ord">②</span>
            <span className="wi-cl-deco">@a</span>
          </div>
          <div className="wi-cl">
            <span className="wi-ord">①</span>
            <span className="wi-cl-deco">@b</span>
          </div>
          <div className="wi-cl">def func(): ...</div>
        </div>

        <div className="wi-onion-stack">
          <div className="wi-layer wi-layer-a wi-rise" style={{ animationDelay: "1500ms" }}>
            <span className="wi-layer-name">a</span>
            <div className="wi-layer wi-layer-b wi-rise" style={{ animationDelay: "900ms" }}>
              <span className="wi-layer-name">b</span>
              <div className="wi-layer wi-layer-core wi-rise">
                <span className="wi-layer-name">func()</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wi-onion-foot">
        <div className="wi-foot-chip wi-rise" style={{ animationDelay: "2300ms" }}>
          包的时候 · <b>从下往上</b>
        </div>
        <div className="wi-foot-chip wi-rise" style={{ animationDelay: "3100ms" }}>
          执行的时候 · <b>从上往下</b>
        </div>
        <div className="wi-foot-chip wi-foot-chip-accent wi-rise" style={{ animationDelay: "3900ms" }}>
          跟洋葱一样，一层套一层
        </div>
      </div>
    </div>
  );
}
