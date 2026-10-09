import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";
export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页 */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="kicker hk-rise">Python · Polymorphism</div>
          <hr className="rule hk-title-rule" />
          <h1 className="hk-title-main hk-rise" style={{ animationDelay: "250ms" }}>
            <span className="hk-title-code">三种</span>多态路线
          </h1>
          <hr className="rule hk-title-rule" style={{ animationDelay: "350ms" }} />
          <div className="hk-title-sub hk-rise" style={{ animationDelay: "600ms" }}>
            Duck Typing · ABC · Protocol
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={{ animationDelay: "850ms" }}>
          <div className="hk-tb-row"><span>Subj</span><b>abc-duck-typing</b></div>
          <div className="hk-tb-row"><span>Repo</span><b>hands-on-python</b></div>
          <div className="hk-tb-row"><span>Lab</span><b>core / 10</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — 反差 */
  if (step === 1) return (
    <div className="scene-pad hk-scene hk-lead-scene">
      <div className="hk-lead-line hk-rise">魔术方法让自定义类像内置类型一样好用</div>
      <div className="hk-lead-sub hk-rise" style={{ animationDelay: "600ms" }}>但那靠的是<b>约定</b>而非约束</div>
    </div>
  );

  /* step 2 — 追问 */
  if (step === 2) return (
    <div className="scene-pad hk-scene hk-ask-scene">
      <div className="hk-ask-line hk-rise">想强制所有子类都实现 <span className="hk-mono">deliver()</span>？</div>
      <div className="hk-ask-big hk-rise" style={{ animationDelay: "700ms" }}>光靠约定<b>行吗</b>？</div>
    </div>
  );

  /* step 3 — 三路线预告 */
  return (
    <div className="scene-pad hk-scene hk-chips-scene">
      <div className="hk-chips-lead hk-rise">三条多态路线</div>
      <div className="hk-chips-row">
        {["继承","Duck Typing","Protocol"].map((t,i)=>(
          <span key={t} className="hk-chip hk-rise" style={{ animationDelay: `${600+i*400}ms` }}>{t}</span>
        ))}
      </div>
      <div className="hk-chips-foot hk-rise" style={{ animationDelay: "2200ms" }}>各管什么，<b>正是本实验要分清的</b></div>
    </div>
  );
}
