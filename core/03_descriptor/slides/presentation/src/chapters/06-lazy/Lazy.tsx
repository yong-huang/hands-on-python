import type { ChapterStepProps } from "../../registry/types";
import "./Lazy.css";

/**
 * ch06 · lazy — LazyField 惰性加载（4 steps）
 *
 * step 0  需求卡：HeavyResource 很重
 * step 1  代码走读：存 factory → 查字典 → 才建+写回（三拍流程）
 * step 2  真机终端：HeavyResource 输出
 * step 3  LoggedField 同骨架带过
 */

export default function LazyChapter({ step }: ChapterStepProps) {
  /* step 0 — 需求 */
  if (step === 0) {
    return (
      <div className="scene-pad lz-scene lz-req-scene">
        <div className="lz-req-head lz-rise">
          第三个实战 · <b>惰性加载</b>
        </div>
        <div className="lz-req-card lz-rise" style={{ animationDelay: "600ms" }}>
          <span className="lz-req-mono">HeavyResource</span>
          <span className="lz-req-note">很重：连接、线程、缓冲区</span>
        </div>
        <div className="lz-req-rule lz-rise" style={{ animationDelay: "1400ms" }}>
          创建时什么都别连，<b>真用到再说</b>
        </div>
      </div>
    );
  }

  /* step 1 — 代码走读 */
  if (step === 1) {
    return (
      <div className="scene-pad lz-scene lz-code-scene">
        <div className="lz-codecard lz-rise">
          <div className="lz-codecard-bar">lazy_field.py</div>
          <pre className="lz-code">{`class LazyField:
    def __init__(self, factory):
        self.factory = factory        # ① 只存起来

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        if self.name not in obj.__dict__:      # ② 一看字典没有
            obj.__dict__[self.name] = \\
                self.factory(obj)              # ③ 才建，写回
        return obj.__dict__[self.name]`}</pre>
        </div>

        <div className="lz-beats">
          <span className="lz-beat lz-rise" style={{ animationDelay: "1100ms" }}>① 存 factory</span>
          <span className="lz-beat lz-rise" style={{ animationDelay: "1900ms" }}>② 查字典</span>
          <span className="lz-beat lz-beat-acc lz-rise" style={{ animationDelay: "2700ms" }}>③ 才建 · 写回</span>
        </div>
        <div className="lz-name-note lz-fade" style={{ animationDelay: "3400ms" }}>
          self.name 由 __set_name__ 自动送入（第 2 章）
        </div>
      </div>
    );
  }

  /* step 2 — 真机 */
  if (step === 2) {
    return (
      <div className="scene-pad lz-scene lz-term-scene">
        <div className="lz-term lz-rise">
          <div className="lz-term-bar">python3 descriptor.py</div>
          <div className="lz-term-body">
            <div className="lz-term-line lz-line-in" style={{ animationDelay: "400ms" }}>
              HeavyResource created (nothing initialized yet)
            </div>
            <div className="lz-term-line lz-term-dim lz-line-in" style={{ animationDelay: "1800ms" }}>
              Accessing database:
            </div>
            <div className="lz-term-line lz-term-acc lz-line-in" style={{ animationDelay: "3000ms" }}>
              [LazyField] Initializing database connection...
            </div>
            <div className="lz-term-line lz-line-in" style={{ animationDelay: "4200ms" }}>
              -&gt; {'{'}'connected': True, 'db': 'mydb'{'}'}
            </div>
            <div className="lz-term-line lz-term-dim lz-line-in" style={{ animationDelay: "5400ms" }}>
              Accessing database again: same object: True
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — LoggedField */
  return (
    <div className="scene-pad lz-scene lz-logged-scene">
      <div className="lz-logged-lead lz-rise">第四个，同款骨架</div>
      <div className="lz-logged-card lz-pop" style={{ animationDelay: "700ms" }}>
        <span className="lz-logged-name">LoggedField</span>
        <span className="lz-logged-tag">读写审计 · 数据描述符</span>
      </div>
      <div className="lz-logged-foot lz-rise" style={{ animationDelay: "1500ms" }}>
        每次读写自动记一笔，<b>骨架同款，不展开了</b>
      </div>
    </div>
  );
}
