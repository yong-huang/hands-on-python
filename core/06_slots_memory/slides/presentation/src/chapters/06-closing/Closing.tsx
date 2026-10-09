import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";

/**
 * ch06 · closing — 何时用与系列回收（4 steps）
 *
 * step 0  三场景卡
 * step 1  描述符彩蛋（member_descriptor callback）
 * step 2  系列衔接：元类管诞生 → slots 管开销
 * step 3  CTA：hands-on-python 终端（系列同款）
 */

const USE_CASES = [
  { name: "上万轻量对象", note: "量大才是主场" },
  { name: "属性固定", note: "不需要动态添加" },
  { name: "内存敏感", note: "缓存 · 游戏实体" },
];

export default function ClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — 三场景 */
  if (step === 0) {
    return (
      <div className="scene-pad cl-scene cl-cases-scene">
        <div className="cl-cases-lead cl-rise">什么时候用？</div>
        <div className="cl-cases">
          {USE_CASES.map((u, i) => (
            <div key={u.name} className="cl-case cl-rise" style={{ animationDelay: `${500 + i * 400}ms` }}>
              <span className="cl-case-name">{u.name}</span>
              <span className="cl-case-note">{u.note}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 1 — 描述符彩蛋 */
  if (step === 1) {
    return (
      <div className="scene-pad cl-scene cl-egg-scene">
        <div className="cl-egg-lead cl-rise">彩蛋</div>
        <div className="cl-egg-flow">
          <div className="cl-egg-node cl-rise" style={{ animationDelay: "500ms" }}>
            <span className="cl-egg-mono">SlotPoint.x</span>
          </div>
          <span className="cl-egg-arrow cl-fade" style={{ animationDelay: "1100ms" }}>→</span>
          <div className="cl-egg-node cl-egg-node-acc cl-pop" style={{ animationDelay: "1500ms" }}>
            <span className="cl-egg-mono">member_descriptor</span>
          </div>
          <span className="cl-egg-arrow cl-fade" style={{ animationDelay: "2100ms" }}>→</span>
          <div className="cl-egg-node cl-rise" style={{ animationDelay: "2500ms" }}>
            <span className="cl-egg-sub">描述符那期讲的协议</span>
          </div>
        </div>
        <div className="cl-egg-foot cl-rise" style={{ animationDelay: "3100ms" }}>
          Python 内部，<b>自己也在用</b>
        </div>
      </div>
    );
  }

  /* step 2 — 系列衔接 */
  if (step === 2) {
    return (
      <div className="scene-pad cl-scene cl-link-scene">
        <div className="cl-link-row cl-rise">
          <span className="cl-link-name">上期 · 元类</span>
          <span className="cl-link-tag">管类的诞生</span>
        </div>
        <div className="cl-link-arrow cl-fade" style={{ animationDelay: "900ms" }}>↓</div>
        <div className="cl-link-row cl-link-row-acc cl-rise" style={{ animationDelay: "1500ms" }}>
          <span className="cl-link-name">这期 · __slots__</span>
          <span className="cl-link-tag">管实例的开销</span>
        </div>
      </div>
    );
  }

  /* step 3 — CTA */
  return (
    <div className="scene-pad cl-scene">
      <div className="cl-cta">
        <div className="cl-term cl-rise">
          <div className="cl-term-bar">hands-on-python</div>
          <div className="cl-term-body">
            <div className="cl-cmd">
              <span className="cl-prompt">$</span> cd core/06_slots_memory
            </div>
            <div className="cl-cmd">
              <span className="cl-prompt">$</span> python3 slots_memory.py
            </div>
            <div className="cl-cmd cl-cmd-out">
              [1] Instance memory comparison:
            </div>
            <div className="cl-cmd">
              <span className="cl-prompt">$</span>
              <span className="cl-cursor" />
            </div>
          </div>
        </div>
        <div className="cl-cta-foot">
          <span className="cl-cta-chip cl-rise" style={{ animationDelay: "1800ms" }}>
            零依赖 · python3 一跑就有体感
          </span>
          <span className="cl-cta-chip cl-cta-chip-accent cl-rise" style={{ animationDelay: "3000ms" }}>
            链接在评论区 · 下期见
          </span>
        </div>
      </div>
    </div>
  );
}
