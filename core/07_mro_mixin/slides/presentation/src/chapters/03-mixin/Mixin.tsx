import type { ChapterStepProps } from "../../registry/types";
import "./Mixin.css";

/**
 * ch03 · mixin — Mixin 协作链（5 steps）
 *
 * step 0  转场卡：确定的顺序 → Mixin 好戏
 * step 1  Mixin 概念卡：可插拔功能件
 * step 2  真机代码卡：MyService(MixinLog, MixinValidate, Base)
 * step 3  真机终端：__init__ 执行序逐行点亮
 * step 4  super 链条机制图（一环扣一环）
 */

const CHAIN = ["MyService", "MixinLog", "MixinValidate", "Base", "object"];

export default function MixinChapter({ step }: ChapterStepProps) {
  /* step 0 — 转场 */
  if (step === 0) {
    return (
      <div className="scene-pad mx-scene mx-lead-scene">
        <div className="mx-lead-line mx-rise">有了确定的顺序，才有下一场好戏</div>
        <div className="mx-lead-name mx-pop" style={{ animationDelay: "900ms" }}>
          Mixin
        </div>
      </div>
    );
  }

  /* step 1 — 概念卡 */
  if (step === 1) {
    return (
      <div className="scene-pad mx-scene mx-concept-scene">
        <div className="mx-concept-lead mx-rise">Mixin 就是<b>可插拔的功能件</b></div>
        <div className="mx-concept-demo">
          <div className="mx-plug mx-rise" style={{ animationDelay: "700ms" }}>
            <span className="mx-plug-name">MixinLog</span>
            <span className="mx-plug-desc">只管日志</span>
          </div>
          <div className="mx-plug mx-rise" style={{ animationDelay: "1200ms" }}>
            <span className="mx-plug-name">MixinValidate</span>
            <span className="mx-plug-desc">只管校验</span>
          </div>
          <span className="mx-concept-eq mx-fade" style={{ animationDelay: "1800ms" }}>→</span>
          <div className="mx-combo mx-pop" style={{ animationDelay: "2300ms" }}>
            组合几个，<b>就获得几个能力</b>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 真机代码 */
  if (step === 2) {
    return (
      <div className="scene-pad mx-scene mx-code-scene">
        <div className="mx-code-head mx-rise">
          <span className="mx-dim">真机 · </span>业务类组合两个 Mixin
        </div>
        <pre className="mx-codecard mx-rise" style={{ animationDelay: "400ms" }}>{`class MyService(MixinLog, MixinValidate, Base):
    def __init__(self):
        super().__init__()`}</pre>
      </div>
    );
  }

  /* step 3 — __init__ 执行序 */
  if (step === 3) {
    return (
      <div className="scene-pad mx-scene mx-init-scene">
        <div className="mx-init-head mx-rise">
          <span className="mx-dim">真机 · </span>造一个实例，__init__ 执行顺序
        </div>
        <div className="mx-init-list">
          <div className="mx-init-row mx-rise" style={{ animationDelay: "600ms" }}>
            <span className="mx-init-idx">1</span> MixinLog.__init__ <span className="mx-init-note">called by MyService</span>
          </div>
          <div className="mx-init-row mx-rise" style={{ animationDelay: "1800ms" }}>
            <span className="mx-init-idx">2</span> MixinValidate.__init__ <span className="mx-init-note">called by MyService</span>
          </div>
          <div className="mx-init-row mx-rise" style={{ animationDelay: "3000ms" }}>
            <span className="mx-init-idx">3</span> Base.__init__ <span className="mx-init-note">called by MyService</span>
          </div>
        </div>
        <div className="mx-init-foot mx-rise" style={{ animationDelay: "4200ms" }}>
          正是 <b>MRO 的下一个</b>
        </div>
      </div>
    );
  }

  /* step 4 — super 链 */
  return (
    <div className="scene-pad mx-scene mx-links-scene">
      <div className="mx-links-lead mx-rise">靠什么串起来？</div>
      <div className="mx-links-chain">
        {CHAIN.map((c, i) => (
          <span key={c} className="mx-links-unit">
            {i > 0 && <span className="mx-links-connector">
              <span className="mx-links-super mx-fade" style={{ animationDelay: `${800 + i * 500}ms` }}>super()</span>
            </span>}
            <span className="mx-links-node mx-rise" style={{ animationDelay: `${500 + i * 450}ms` }}>{c}</span>
          </span>
        ))}
      </div>
      <div className="mx-links-foot mx-rise" style={{ animationDelay: "3300ms" }}>
        每个 __init__ 都调 super().__init__()，<b>一环扣一环</b>
      </div>
    </div>
  );
}
