import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

/**
 * ch04 · pitfalls — 断链与四原则（4 steps）
 *
 * step 0  断链示意：忘调 super → 链断 → 后面全灰
 * step 1  四原则卡（逐条上屏）
 * step 2  放左侧原理：局部优先
 * step 3  绕链坑：ClassName.__init__(self)
 */

const RULES = [
  { num: "1", name: "只提供方法", note: "不维护状态" },
  { num: "2", name: "放继承列表左侧", note: "局部优先" },
  { num: "3", name: "名字带 Mixin 后缀", note: "可识别" },
  { num: "4", name: "不独立使用", note: "依赖业务类" },
];

export default function PitfallsChapter({ step }: ChapterStepProps) {
  /* step 0 — 断链 */
  if (step === 0) {
    return (
      <div className="scene-pad pf-scene pf-break-scene">
        <div className="pf-break-lead pf-rise">哪个 Mixin 忘了调 super……</div>

        <div className="pf-break-chain">
          <div className="pf-break-node pf-rise" style={{ animationDelay: "500ms" }}>
            MyService
          </div>
          <span className="pf-break-node pf-rise" style={{ animationDelay: "1100ms" }}>MixinLog</span>
          <span className="pf-break-x pf-pop" style={{ animationDelay: "1700ms" }}>✕</span>
          <span className="pf-break-node pf-break-node-dead pf-rise" style={{ animationDelay: "2200ms" }}>MixinValidate</span>
          <span className="pf-break-arrow-dead pf-fade" style={{ animationDelay: "2700ms" }}>→</span>
          <span className="pf-break-node pf-break-node-dead pf-fade" style={{ animationDelay: "3100ms" }}>Base</span>
        </div>

        <div className="pf-break-foot pf-rise" style={{ animationDelay: "3600ms" }}>
          链<b>静默断</b>在那，后面的类全不初始化
        </div>
        <div className="pf-break-badge pf-fade" style={{ animationDelay: "4200ms" }}>
          多继承最常见的静默 bug
        </div>
      </div>
    );
  }

  /* step 1 — 四原则 */
  if (step === 1) {
    return (
      <div className="scene-pad pf-scene pf-rules-scene">
        <div className="pf-rules-lead pf-rise">Mixin 怎么写才对？四条</div>
        <div className="pf-rules-list">
          {RULES.map((r, i) => (
            <div key={r.num} className="pf-rule pf-rise" style={{ animationDelay: `${500 + i * 350}ms` }}>
              <span className="pf-rule-num">{r.num}</span>
              <span className="pf-rule-name">{r.name}</span>
              <span className="pf-rule-note">{r.note}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 2 — 放左侧原理 */
  if (step === 2) {
    return (
      <div className="scene-pad pf-scene pf-left-scene">
        <div className="pf-left-q pf-rise">为什么放<b>左侧</b>？</div>
        <div className="pf-left-ans pf-rise" style={{ animationDelay: "700ms" }}>
          局部优先——Mixin 的方法<b>先于</b>业务类同名方法被找到
        </div>
        <div className="pf-left-note pf-rise" style={{ animationDelay: "1900ms" }}>
          业务类的初始化，仍由 super 链在最后完成
        </div>
      </div>
    );
  }

  /* step 3 — 绕链坑 */
  return (
    <div className="scene-pad pf-scene pf-skip-scene">
      <div className="pf-skip-lead pf-rise">还有个手痒写法</div>
      <div className="pf-skip-code pf-pop" style={{ animationDelay: "700ms" }}>
        <span className="pf-skip-bad">ClassName.__init__</span>(self)
      </div>
      <div className="pf-skip-cons pf-rise" style={{ animationDelay: "1900ms" }}>
        整条 MRO 链<b>被你绕断</b>
      </div>
      <div className="pf-skip-rule pf-rise" style={{ animationDelay: "3100ms" }}>
        Mixin 里，永远用 <span className="pf-skip-mono">super()</span>
      </div>
    </div>
  );
}
