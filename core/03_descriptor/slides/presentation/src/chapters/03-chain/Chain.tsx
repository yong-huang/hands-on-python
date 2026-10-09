import type { ChapterStepProps } from "../../registry/types";
import "./Chain.css";

/**
 * ch03 · chain — 两类描述符与查找链（6 steps）
 *
 * step 0  分类标准：有没有 __set__ / __delete__
 * step 1  两类对照卡：数据描述符 vs 非数据描述符
 * step 2  查找链引入：obj.attr + __getattribute__ + 四空槽
 * step 3  四步链逐段点亮
 * step 4  口诀不等式 hero
 * step 5  四实战模式预告
 */

const CHAIN = [
  { ord: "1", mono: "type(obj).__dict__", desc: "数据描述符 → 调 __get__" },
  { ord: "2", mono: "obj.__dict__", desc: "实例字典，直接返回" },
  { ord: "3", mono: "type(obj).__dict__", desc: "非数据描述符 → 调 __get__" },
  { ord: "4", mono: "raise", desc: "AttributeError" },
];

const MODES = [
  { name: "TypedField", tag: "验证" },
  { name: "CachedProperty", tag: "缓存" },
  { name: "LazyField", tag: "惰性" },
  { name: "LoggedField", tag: "审计" },
];

export default function ChainChapter({ step }: ChapterStepProps) {
  /* step 0 — 分类标准 */
  if (step === 0) {
    return (
      <div className="scene-pad lk-scene lk-rule-scene">
        <div className="lk-rule-lead lk-rise">描述符分两类</div>
        <div className="lk-rule-line lk-rise" style={{ animationDelay: "500ms" }}>
          标准就一条：有没有定义
        </div>
        <div className="lk-rule-tokens">
          <span className="lk-token lk-rise" style={{ animationDelay: "1100ms" }}>__set__</span>
          <span className="lk-token-or lk-rise" style={{ animationDelay: "1400ms" }}>或</span>
          <span className="lk-token lk-rise" style={{ animationDelay: "1600ms" }}>__delete__</span>
        </div>
      </div>
    );
  }

  /* step 1 — 两类对照 */
  if (step === 1) {
    return (
      <div className="scene-pad lk-scene lk-kinds-scene">
        <div className="lk-kind lk-rise">
          <div className="lk-kind-name">数据描述符</div>
          <div className="lk-kind-cond">定义了 __set__ 或 __delete__</div>
          <div className="lk-kind-note">权限：压过实例字典</div>
        </div>
        <div className="lk-kind lk-kind-2 lk-rise" style={{ animationDelay: "600ms" }}>
          <div className="lk-kind-name">非数据描述符</div>
          <div className="lk-kind-cond">只有 __get__</div>
          <div className="lk-kind-note">权限：低于实例字典</div>
        </div>
        <div className="lk-kinds-foot lk-rise" style={{ animationDelay: "1500ms" }}>
          听着像废话，<b>差别巨大</b>
        </div>
      </div>
    );
  }

  /* step 2 — 查找链引入 */
  if (step === 2) {
    return (
      <div className="scene-pad lk-scene lk-intro-scene">
        <div className="lk-intro-code lk-rise">obj.attr</div>
        <div className="lk-intro-sub lk-rise" style={{ animationDelay: "500ms" }}>
          每次读属性，都经过 <span className="lk-intro-mono">__getattribute__</span>
        </div>
        <div className="lk-intro-slots">
          {[1, 2, 3, 4].map((n, i) => (
            <div key={n} className="lk-slot lk-rise" style={{ animationDelay: `${900 + i * 160}ms` }}>
              <span className="lk-slot-ord">{n}</span>
              <span className="lk-slot-bar" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 3 — 四步链逐段点亮 */
  if (step === 3) {
    return (
      <div className="scene-pad lk-scene lk-full-scene">
        <div className="lk-full-head lk-rise">obj.attr 的查找顺序</div>
        <div className="lk-chain">
          {CHAIN.map((c, i) => (
            <div key={c.ord} className="lk-step lk-rise" style={{ animationDelay: `${300 + i * 700}ms` }}>
              <span className="lk-step-ord">{c.ord}</span>
              <span className="lk-step-mono">{c.mono}</span>
              <span className="lk-step-desc">{c.desc}</span>
              {i < CHAIN.length - 1 && <span className="lk-step-arrow">↓</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 4 — 口诀不等式 */
  if (step === 4) {
    return (
      <div className="scene-pad lk-scene lk-motto-scene">
        <div className="lk-motto-kicker lk-rise">口诀给你</div>
        <div className="lk-motto">
          <span className="lk-motto-item lk-motto-hot lk-pop" style={{ animationDelay: "600ms" }}>
            数据描述符
          </span>
          <span className="lk-motto-gt lk-pop" style={{ animationDelay: "1300ms" }}>&gt;</span>
          <span className="lk-motto-item lk-pop" style={{ animationDelay: "1700ms" }}>
            实例字典
          </span>
          <span className="lk-motto-gt lk-pop" style={{ animationDelay: "2400ms" }}>&gt;</span>
          <span className="lk-motto-item lk-pop" style={{ animationDelay: "2800ms" }}>
            非数据描述符
          </span>
        </div>
      </div>
    );
  }

  /* step 5 — 四模式预告 */
  return (
    <div className="scene-pad lk-scene lk-modes-scene">
      <div className="lk-modes-lead lk-rise">四个实战模式，全在这条链上做文章</div>
      <div className="lk-modes">
        {MODES.map((m, i) => (
          <div key={m.name} className="lk-mode lk-rise" style={{ animationDelay: `${500 + i * 250}ms` }}>
            <span className="lk-mode-name">{m.name}</span>
            <span className="lk-mode-tag">{m.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
