import type { ChapterStepProps } from "../../registry/types";
import "./InitSubclass.css";

/**
 * ch06 · init-subclass — 轻量替代（4 steps）
 *
 * step 0  转折卡：不是所有需求都配动用元类
 * step 1  轻量版登场：__init_subclass__（3.6+）
 * step 2  真机：handlers 注册 + 子类列表
 * step 3  原则 hero + 选择对比表
 */

export default function InitSubclassChapter({ step }: ChapterStepProps) {
  /* step 0 — 转折 */
  if (step === 0) {
    return (
      <div className="scene-pad is-scene is-turn-scene">
        <div className="is-turn-line is-rise">
          不过，不是所有需求
        </div>
        <div className="is-turn-big is-rise" style={{ animationDelay: "500ms" }}>
          都配动用元类
        </div>
      </div>
    );
  }

  /* step 1 — 轻量版 */
  if (step === 1) {
    return (
      <div className="scene-pad is-scene is-light-scene">
        <div className="is-light-lead is-rise">只是注册一下子类？</div>
        <div className="is-light-name is-pop" style={{ animationDelay: "700ms" }}>
          __init_subclass__
        </div>
        <div className="is-light-sub is-rise" style={{ animationDelay: "1600ms" }}>
          Python 3.6+ · 元类的轻量替代
        </div>
      </div>
    );
  }

  /* step 2 — 真机 */
  if (step === 2) {
    return (
      <div className="scene-pad is-scene is-term-scene">
        <div className="is-term is-rise">
          <div className="is-term-bar">python3 metaclass.py</div>
          <div className="is-term-body">
            <div className="is-term-line is-line-in" style={{ animationDelay: "300ms" }}>
              Registered handlers: ['click', 'key']
            </div>
            <div className="is-term-line is-line-in" style={{ animationDelay: "1400ms" }}>
              click handler: handling click
            </div>
            <div className="is-term-line is-line-in" style={{ animationDelay: "2500ms" }}>
              All subclasses: ['ClickEvent', 'KeyEvent']
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 原则 */
  return (
    <div className="scene-pad is-scene is-rule-scene">
      <div className="is-rule-lead is-rise">
        原则一句话：能用 <span className="is-rule-mono">__init_subclass__</span>，就不用元类
      </div>
      <div className="is-rule-table is-rise" style={{ animationDelay: "1200ms" }}>
        <div className="is-rule-row">
          <span className="is-rule-use">子类注册 / 校验 · 简单钩子</span>
          <span className="is-rule-pick is-rule-pick-light">__init_subclass__</span>
        </div>
        <div className="is-rule-row">
          <span className="is-rule-use">修改命名空间 · 单例 · ORM</span>
          <span className="is-rule-pick is-rule-pick-heavy">元类</span>
        </div>
      </div>
    </div>
  );
}
