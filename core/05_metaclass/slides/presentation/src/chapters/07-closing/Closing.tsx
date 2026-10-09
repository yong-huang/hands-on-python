import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";

/**
 * ch07 · closing — 三层拦截（4 steps）
 *
 * step 0  三层回收塔：__new__ / __call__ / __init_subclass__
 * step 1  系列五块拼图：装饰器 → with → 描述符 → 生成器 → 元类
 * step 2  应用收束：ORM / 单例 / 插件注册
 * step 3  CTA：hands-on-python 终端（系列同款）
 */

const LAYERS = [
  { mono: "__init_subclass__", desc: "子类钩子", ord: "顶层" },
  { mono: "__call__", desc: "管实例创建", ord: "中层" },
  { mono: "__new__", desc: "创建类本身", ord: "底层" },
];

const PUZZLES = [
  { name: "装饰器", tag: "函数增强" },
  { name: "with", tag: "资源" },
  { name: "描述符", tag: "属性" },
  { name: "生成器", tag: "遍历" },
  { name: "元类", tag: "类的诞生" },
];

const APPS = ["ORM 字段映射", "框架单例", "插件自动注册"];

export default function ClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — 三层回收 */
  if (step === 0) {
    return (
      <div className="scene-pad cl-scene cl-tower-scene">
        <div className="cl-tower-lead cl-rise">回收一下三层</div>
        <div className="cl-tower">
          {LAYERS.map((l, i) => (
            <div key={l.mono} className="cl-layer cl-rise" style={{ animationDelay: `${400 + i * 600}ms` }}>
              <span className="cl-layer-ord">{l.ord}</span>
              <span className="cl-layer-mono">{l.mono}</span>
              <span className="cl-layer-desc">{l.desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 1 — 系列拼图 */
  if (step === 1) {
    return (
      <div className="scene-pad cl-scene cl-puzzle-scene">
        <div className="cl-puzzle-lead cl-rise">
          这个系列的<b>第五块拼图</b>
        </div>
        <div className="cl-puzzles">
          {PUZZLES.map((p, i) => (
            <div key={p.name} className="cl-puzzle cl-rise" style={{ animationDelay: `${500 + i * 400}ms` }}>
              <span className="cl-puzzle-name">{p.name}</span>
              <span className="cl-puzzle-tag">管{p.tag}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 2 — 应用收束 */
  if (step === 2) {
    return (
      <div className="scene-pad cl-scene cl-app-scene">
        <div className="cl-app-lead cl-rise">底层全是这套</div>
        <div className="cl-apps">
          {APPS.map((a, i) => (
            <div key={a} className="cl-app cl-rise" style={{ animationDelay: `${500 + i * 350}ms` }}>
              {a}
            </div>
          ))}
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
              <span className="cl-prompt">$</span> cd core/05_metaclass
            </div>
            <div className="cl-cmd">
              <span className="cl-prompt">$</span> python3 metaclass.py
            </div>
            <div className="cl-cmd cl-cmd-out">
              [1] type() class creation:
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
