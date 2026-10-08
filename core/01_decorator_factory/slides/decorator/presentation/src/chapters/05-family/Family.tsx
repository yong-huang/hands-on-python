import type { ChapterStepProps } from "../../registry/types";
import "./Family.css";

/**
 * ch05 · family — 家族地图：工厂与五种形态（4 steps）
 *
 * step 0  参数三连问（需求 config dump）
 * step 1  三层嵌套 = 装饰器工厂
 * step 2  五形态谱系总览
 * step 3  装饰类的装饰器：@singleton / @add_repr
 */

const FORMS = [
  { ord: "01", name: "函数版", tag: "计时 · 日志" },
  { ord: "02", name: "工厂版", tag: "retry · cache" },
  { ord: "03", name: "类版", tag: "状态显式" },
  { ord: "04", name: "装饰类", tag: "singleton · repr" },
  { ord: "05", name: "标准库", tag: "lru_cache 等" },
];

export default function FamilyChapter({ step }: ChapterStepProps) {
  /* step 0 — 参数三连问 */
  if (step === 0) {
    return (
      <div className="scene-pad fm-scene">
        <div className="fm-lead fm-rise">需求，更刁钻了</div>
        <div className="fm-term fm-rise" style={{ animationDelay: "600ms" }}>
          <div className="fm-term-bar">requirements</div>
          <div className="fm-term-body">
            <div className="fm-q">
              <span className="fm-q-mark">?</span>重试 · <b>几次</b>？
            </div>
            <div className="fm-q">
              <span className="fm-q-mark">?</span>缓存 · <b>存多久</b>？
            </div>
            <div className="fm-q">
              <span className="fm-q-mark">?</span>日志 · <b>什么级别</b>？
            </div>
          </div>
        </div>
        <div className="fm-lead-sub fm-rise" style={{ animationDelay: "1800ms" }}>
          参数一出现，事情就不一样了
        </div>
      </div>
    );
  }

  /* step 1 — 三层嵌套工厂 */
  if (step === 1) {
    return (
      <div className="scene-pad fm-scene">
        <div className="fm-layers">
          <div className="fm-layer fm-layer-1 fm-rise">
            <div className="fm-layer-tag">
              <span className="fm-layer-ord">第 1 层</span>接参数 · retry(times=3)
            </div>
            <div className="fm-layer fm-layer-2 fm-rise" style={{ animationDelay: "1300ms" }}>
              <div className="fm-layer-tag">
                <span className="fm-layer-ord">第 2 层</span>接函数 · decorator(func)
              </div>
              <div className="fm-layer fm-layer-3 fm-rise" style={{ animationDelay: "2600ms" }}>
                <div className="fm-layer-tag">
                  <span className="fm-layer-ord">第 3 层</span>真正干活 · wrapper(*args)
                </div>
                <div className="fm-layer-core">干活的逻辑在这里</div>
              </div>
            </div>
          </div>
        </div>
        <div className="fm-factory-foot fm-rise" style={{ animationDelay: "3900ms" }}>
          <span className="fm-foot-chip fm-foot-chip-accent">装饰器工厂</span>
          <span className="fm-foot-chip">名字唬人 · 其实就是函数套函数</span>
        </div>
      </div>
    );
  }

  /* step 2 — 五形态谱系 */
  if (step === 2) {
    return (
      <div className="scene-pad fm-scene">
        <div className="fm-spectrum">
          {FORMS.map((f, i) => (
            <div key={f.ord} className="fm-form fm-rise" style={{ animationDelay: `${300 + i * 110}ms` }}>
              <span className="fm-form-ord">{f.ord}</span>
              <span className="fm-form-name">{f.name}</span>
              <span className="fm-form-tag">{f.tag}</span>
            </div>
          ))}
        </div>
        <div className="fm-spectrum-rail" aria-hidden />
        <div className="fm-spectrum-foot fm-rise" style={{ animationDelay: "1500ms" }}>
          不用背 · 知道有这张地图就行
        </div>
      </div>
    );
  }

  /* step 3 — 装饰类 */
  return (
    <div className="scene-pad fm-scene fm-classes">
      <div className="fm-classdemo fm-rise">
        <div className="fm-classdemo-head">拿类开刀 · ①</div>
        <pre className="fm-classdemo-code">{`@singleton
class Config: ...`}</pre>
        <div className="fm-classdemo-out">
          <span className="fm-prompt">&gt;&gt;&gt;</span> Config("prod") is Config("dev")
          <span className="fm-out-true fm-out-in" style={{ animationDelay: "1300ms" }}>
            True
          </span>
        </div>
        <div className="fm-classdemo-note fm-rise" style={{ animationDelay: "1700ms" }}>
          全局只有一个实例
        </div>
      </div>

      <div className="fm-classdemo fm-rise" style={{ animationDelay: "2900ms" }}>
        <div className="fm-classdemo-head">拿类开刀 · ②</div>
        <pre className="fm-classdemo-code">{`@add_repr
class User: ...`}</pre>
        <div className="fm-classdemo-out">
          <span className="fm-prompt">&gt;&gt;&gt;</span> print(alice)
          <span className="fm-out-true fm-out-in" style={{ animationDelay: "4400ms" }}>
            User(name=&#39;alice&#39;, role=&#39;admin&#39;)
          </span>
        </div>
        <div className="fm-classdemo-note fm-rise" style={{ animationDelay: "4800ms" }}>
          打印格式，自动补好
        </div>
      </div>
    </div>
  );
}
