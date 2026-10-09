import type { ChapterStepProps } from "../../registry/types";
import "./Typed.css";

/**
 * ch04 · typed — TypedField 验证字段（6 steps）
 *
 * step 0  需求卡：age int / 0–150
 * step 1  代码走读①：__set_name__ 记属性名
 * step 2  代码走读②：__set__ 校验（TypeError / ValueError 两出口）
 * step 3  真机终端：真实报错输出
 * step 4  权力演示：塞 obj.__dict__ 也拦得住
 * step 5  降级坑：漏写 __set__ → 验证被绕过
 */

export default function TypedChapter({ step }: ChapterStepProps) {
  /* step 0 — 需求卡 */
  if (step === 0) {
    return (
      <div className="scene-pad tp-scene tp-req-scene">
        <div className="tp-req-head tp-rise">
          第一个实战 · <b>验证字段</b>
        </div>
        <div className="tp-req-sub tp-rise" style={{ animationDelay: "500ms" }}>
          需求：age 这个属性
        </div>
        <div className="tp-req-rules">
          <div className="tp-req-rule tp-rise" style={{ animationDelay: "1100ms" }}>
            <span className="tp-req-rule-k">类型</span>
            必须是 <code>int</code>
          </div>
          <div className="tp-req-rule tp-rise" style={{ animationDelay: "1700ms" }}>
            <span className="tp-req-rule-k">范围</span>
            0 到 150 之间
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 代码走读① __set_name__ */
  if (step === 1) {
    return (
      <div className="scene-pad tp-scene tp-walk-scene">
        <div className="tp-walk-head tp-rise">
          <span className="tp-walk-ord">走读 ①</span>
          先把属性名记下来
        </div>
        <div className="tp-codecard tp-rise" style={{ animationDelay: "300ms" }}>
          <div className="tp-codecard-bar">typed_field.py</div>
          <pre className="tp-code">{`class TypedField:
    def __set_name__(self, owner, name):
        self.name = name   # "age"，报错时用得上`}</pre>
        </div>
        <div className="tp-walk-foot tp-rise" style={{ animationDelay: "1500ms" }}>
          类创建时自动调用，<b>名字自己送上门</b>
        </div>
      </div>
    );
  }

  /* step 2 — 代码走读② __set__ 校验 */
  if (step === 2) {
    return (
      <div className="scene-pad tp-scene tp-walk-scene">
        <div className="tp-walk-head tp-rise">
          <span className="tp-walk-ord">走读 ②</span>
          __set__ 里做校验
        </div>
        <div className="tp-codecard tp-rise" style={{ animationDelay: "300ms" }}>
          <div className="tp-codecard-bar">typed_field.py</div>
          <pre className="tp-code tp-code-sm">{`    def __set__(self, obj, value):
        if not isinstance(value, int):
            raise TypeError(f"{self.name}: expected int, got str")
        if value < 0:
            raise ValueError(f"{self.name}: must >= 0")
        if value > 150:
            raise ValueError(f"{self.name}: must <= 150")`}</pre>

          <span className="tp-exit tp-exit-1 tp-fade" style={{ animationDelay: "1800ms" }}>
            出口① TypeError
          </span>
          <span className="tp-exit tp-exit-2 tp-fade" style={{ animationDelay: "2400ms" }}>
            出口② ValueError
          </span>
          <span className="tp-exit tp-exit-3 tp-fade" style={{ animationDelay: "3000ms" }}>
            出口③ ValueError
          </span>
        </div>
      </div>
    );
  }

  /* step 3 — 真机终端 */
  if (step === 3) {
    return (
      <div className="scene-pad tp-scene tp-term-scene">
        <div className="tp-term tp-rise">
          <div className="tp-term-bar">python3 descriptor.py</div>
          <div className="tp-term-body">
            <div className="tp-term-line tp-line-in" style={{ animationDelay: "400ms" }}>
              Type validation:
            </div>
            <div className="tp-term-line tp-term-err tp-line-in" style={{ animationDelay: "1300ms" }}>
              TypeError: age: expected int, got str
            </div>
            <div className="tp-term-line tp-line-in" style={{ animationDelay: "2300ms" }}>
              Range validation:
            </div>
            <div className="tp-term-line tp-term-err tp-line-in" style={{ animationDelay: "3200ms" }}>
              ValueError: age: must &gt;= 0
            </div>
            <div className="tp-term-line tp-term-err tp-line-in" style={{ animationDelay: "4100ms" }}>
              ValueError: age: must &lt;= 150
            </div>
          </div>
        </div>
        <div className="tp-term-foot tp-rise" style={{ animationDelay: "5100ms" }}>
          坏数据，<b>根本进不了对象</b>
        </div>
      </div>
    );
  }

  /* step 4 — 塞 dict 拦得住 */
  if (step === 4) {
    return (
      <div className="scene-pad tp-scene tp-bypass-scene">
        <div className="tp-bypass-lead tp-rise">
          有人想绕过它：<span className="tp-bypass-mono">obj.__dict__["age"] = "bad"</span>
        </div>

        <div className="tp-bypass-flow">
          <div className="tp-bypass-node tp-rise" style={{ animationDelay: "900ms" }}>
            <div className="tp-bypass-node-k">实例字典</div>
            <div className="tp-bypass-node-v">"bad"</div>
          </div>
          <span className="tp-bypass-arrow tp-fade" style={{ animationDelay: "1600ms" }}>→</span>
          <div className="tp-bypass-gate tp-pop" style={{ animationDelay: "2000ms" }}>
            <span className="tp-bypass-gate-mono">obj.age</span>
            <span className="tp-bypass-gate-sub">读取时</span>
          </div>
          <span className="tp-bypass-arrow tp-fade" style={{ animationDelay: "2600ms" }}>→</span>
          <div className="tp-bypass-gate tp-bypass-gate-acc tp-pop" style={{ animationDelay: "3000ms" }}>
            <span className="tp-bypass-gate-mono">__get__</span>
            <span className="tp-bypass-gate-sub">照样走校验</span>
          </div>
        </div>

        <div className="tp-bypass-stamp tp-stamp-in" style={{ animationDelay: "3900ms" }}>
          拦得住
        </div>
      </div>
    );
  }

  /* step 5 — 降级坑 */
  return (
    <div className="scene-pad tp-scene tp-fall-scene">
      <div className="tp-fall-lead tp-rise">
        但你<b>漏写 __set__</b>，事情就反过来了
      </div>

      <div className="tp-fall-cols">
        <div className="tp-fall-col">
          <div className="tp-fall-tag tp-rise" style={{ animationDelay: "600ms" }}>
            有 __set__ · 数据描述符
          </div>
          <div className="tp-fall-lane tp-fall-lane-ok tp-rise" style={{ animationDelay: "1000ms" }}>
            坏值 → 拦截 ✓
          </div>
        </div>

        <div className="tp-fall-col">
          <div className="tp-fall-tag tp-fall-tag-bad tp-rise" style={{ animationDelay: "1400ms" }}>
            漏写 __set__ · 降级非数据
          </div>
          <div className="tp-fall-lane tp-fall-lane-bad tp-rise" style={{ animationDelay: "1800ms" }}>
            坏值 → 直进字典 → 被读到 ✕
          </div>
        </div>
      </div>

      <div className="tp-fall-foot tp-rise" style={{ animationDelay: "2600ms" }}>
        验证<b>整个被绕过</b>——这是最常见的翻车点
      </div>
    </div>
  );
}
