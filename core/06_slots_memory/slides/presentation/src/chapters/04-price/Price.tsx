import type { ChapterStepProps } from "../../registry/types";
import "./Price.css";

/**
 * ch04 · price — 三个代价与一个误会（4 steps）
 *
 * step 0  代价一：动态属性 AttributeError 真机
 * step 1  代价二：weakref TypeError + __weakref__ 解法
 * step 2  代价三：子类忘声明 → 链上归零（继承链示意）
 * step 3  误会：z=0 来自 __init__，pickle 正常（角标）
 */

export default function PriceChapter({ step }: ChapterStepProps) {
  /* step 0 — 代价一 */
  if (step === 0) {
    return (
      <div className="scene-pad pr-scene pr-dyn-scene">
        <div className="pr-cost-head pr-rise">
          代价一 · <b>动态属性没了</b>
        </div>
        <div className="pr-dyn-code pr-rise" style={{ animationDelay: "400ms" }}>
          <span className="pr-dim">&gt;&gt;&gt;</span> p.z = 3
        </div>
        <div className="pr-dyn-trace pr-pop" style={{ animationDelay: "1300ms" }}>
          <div className="pr-dyn-trace-bar">AttributeError</div>
          <pre className="pr-dyn-trace-code">{'\'SlotPoint\' object has no attribute \'z\' and no __dict__ for setting new attributes'}</pre>
        </div>
      </div>
    );
  }

  /* step 1 — 代价二 weakref */
  if (step === 1) {
    return (
      <div className="scene-pad pr-scene pr-weak-scene">
        <div className="pr-cost-head pr-rise">
          代价二 · <b>weakref 默认不可用</b>
        </div>
        <div className="pr-weak-cols">
          <pre className="pr-weak-code pr-weak-code-bad pr-rise" style={{ animationDelay: "500ms" }}>{`weakref.ref(p)
# TypeError: cannot create weak
# reference to 'SlotPoint' object`}</pre>
          <pre className="pr-weak-code pr-weak-code-fix pr-rise" style={{ animationDelay: "1500ms" }}>{`__slots__ = ("x", "y",
               "__weakref__")  # 显式声明`}</pre>
        </div>
      </div>
    );
  }

  /* step 2 — 代价三 继承链 */
  if (step === 2) {
    return (
      <div className="scene-pad pr-scene pr-inherit-scene">
        <div className="pr-cost-head pr-rise">
          代价三 · 最阴的一个
        </div>
        <div className="pr-inherit-chain">
          <div className="pr-chain-node pr-chain-node-ok pr-rise" style={{ animationDelay: "600ms" }}>
            <span className="pr-chain-name">SlotPoint</span>
            <span className="pr-chain-note">__slots__ 声明 ✓</span>
          </div>
          <span className="pr-chain-link pr-fade" style={{ animationDelay: "1400ms" }}>↓ 继承</span>
          <div className="pr-chain-node pr-chain-node-bad pr-pop" style={{ animationDelay: "1900ms" }}>
            <span className="pr-chain-name">子类没声明 __slots__</span>
            <span className="pr-chain-note">悄悄长回 __dict__</span>
          </div>
        </div>
        <div className="pr-inherit-foot pr-rise" style={{ animationDelay: "2900ms" }}>
          整条链省的内存，<b>归零</b>
        </div>
      </div>
    );
  }

  /* step 3 — 误会 */
  return (
    <div className="scene-pad pr-scene pr-default-scene">
      <div className="pr-default-term pr-rise">
        <div className="pr-default-bar">SlotWithDefault(1, 2)</div>
        <div className="pr-default-body">
          <div className="pr-default-line pr-line-in" style={{ animationDelay: "400ms" }}>
            z=0
          </div>
          <div className="pr-default-line pr-default-dim pr-line-in" style={{ animationDelay: "1500ms" }}>
            (default comes from __init__, not slots)
          </div>
        </div>
      </div>
      <div className="pr-default-note pr-rise" style={{ animationDelay: "2500ms" }}>
        默认值来自 <span className="pr-default-mono">__init__</span> 形参，<b>跟 slots 无关</b>
      </div>
      <div className="pr-default-badge pr-fade" style={{ animationDelay: "3300ms" }}>
        pickle 序列化正常工作
      </div>
    </div>
  );
}
