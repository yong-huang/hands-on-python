import type { ChapterStepProps } from "../../registry/types";
import "./Stdlib.css";

/**
 * ch07 · stdlib — property 与标准库（5 steps）
 *
 * step 0  论断：property = 数据描述符
 * step 1  hasattr 真机验证
 * step 2  @property 语法糖展开
 * step 3  同族三件套点名
 * step 4  装饰器 vs 描述符：拦截层面对比
 */

export default function StdlibChapter({ step }: ChapterStepProps) {
  /* step 0 — 论断 */
  if (step === 0) {
    return (
      <div className="scene-pad sd-scene sd-claim-scene">
        <div className="sd-claim-head sd-rise">
          你天天在用的 <span className="sd-claim-mono">property</span>
        </div>
        <div className="sd-claim-verdict sd-pop" style={{ animationDelay: "900ms" }}>
          其实就是个 · 数据描述符
        </div>
        <div className="sd-claim-note sd-rise" style={{ animationDelay: "1800ms" }}>
          回忆第 3 章的两分法：<b>有 __set__ → 数据</b>
        </div>
      </div>
    );
  }

  /* step 1 — hasattr 验证 */
  if (step === 1) {
    return (
      <div className="scene-pad sd-scene sd-proof-scene">
        <div className="sd-proof-term sd-rise">
          <div className="sd-proof-bar">python3</div>
          <div className="sd-proof-body">
            <div className="sd-proof-line sd-line-in" style={{ animationDelay: "200ms" }}>
              <span className="sd-proof-prompt">&gt;&gt;&gt;</span> p = property(lambda self: self.x)
            </div>
            <div className="sd-proof-line sd-line-in" style={{ animationDelay: "700ms" }}>
              <span className="sd-proof-prompt">&gt;&gt;&gt;</span> hasattr(p, "__get__")
            </div>
            <div className="sd-proof-line sd-proof-true sd-line-in" style={{ animationDelay: "1200ms" }}>
              True
            </div>
            <div className="sd-proof-line sd-line-in" style={{ animationDelay: "1700ms" }}>
              <span className="sd-proof-prompt">&gt;&gt;&gt;</span> hasattr(p, "__set__")
            </div>
            <div className="sd-proof-line sd-proof-true sd-line-in" style={{ animationDelay: "2200ms" }}>
              True
            </div>
          </div>
        </div>
        <div className="sd-proof-foot sd-rise" style={{ animationDelay: "2400ms" }}>
          __get__、__set__ <b>全在</b>——铁证
        </div>
      </div>
    );
  }

  /* step 2 — 语法糖展开 */
  if (step === 2) {
    return (
      <div className="scene-pad sd-scene sd-sugar-scene">
        <div className="sd-sugar-cols">
          <pre className="sd-sugar-card sd-rise">{`class User:
    @property
    def age(self):
        return self._age`}</pre>

          <div className="sd-sugar-eq sd-pop" style={{ animationDelay: "1200ms" }}>
            等价于
          </div>

          <pre className="sd-sugar-card sd-sugar-card-2 sd-rise" style={{ animationDelay: "600ms" }}>{`class User:
    age = property(lambda self: ...)
    # 描述符挂上类属性`}</pre>
        </div>
      </div>
    );
  }

  /* step 3 — 同族三件套 */
  if (step === 3) {
    return (
      <div className="scene-pad sd-scene sd-family-scene">
        <div className="sd-family-lead sd-rise">同一套协议的，还有两个</div>
        <div className="sd-family">
          <div className="sd-family-chip sd-family-chip-hot sd-rise">@property</div>
          <div className="sd-family-chip sd-rise" style={{ animationDelay: "500ms" }}>@classmethod</div>
          <div className="sd-family-chip sd-rise" style={{ animationDelay: "1000ms" }}>@staticmethod</div>
        </div>
        <div className="sd-family-foot sd-rise" style={{ animationDelay: "1600ms" }}>
          全是描述符，<b>借装饰器语法挂到类属性上</b>
        </div>
      </div>
    );
  }

  /* step 4 — 装饰器 vs 描述符 */
  return (
    <div className="scene-pad sd-scene sd-vs-scene">
      <div className="sd-vs-lead sd-rise">和装饰器什么关系？</div>
      <div className="sd-vs-cols">
        <div className="sd-vs-card sd-rise" style={{ animationDelay: "500ms" }}>
          <div className="sd-vs-tag">装饰器</div>
          <div className="sd-vs-layer">函数调用层</div>
          <code className="sd-vs-code">f = deco(f) → f()</code>
        </div>
        <div className="sd-vs-card sd-vs-card-2 sd-rise" style={{ animationDelay: "1100ms" }}>
          <div className="sd-vs-tag">描述符</div>
          <div className="sd-vs-layer">属性访问层</div>
          <code className="sd-vs-code">obj.attr → __get__</code>
        </div>
      </div>
      <div className="sd-vs-foot sd-rise" style={{ animationDelay: "1900ms" }}>
        都不改调用方代码，<b>拦的层面不同</b>
      </div>
    </div>
  );
}
