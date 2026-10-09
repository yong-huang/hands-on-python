import type { ChapterStepProps } from "../../registry/types";
import "./Type.css";

/**
 * ch02 · type — 类的类（5 steps）
 *
 * step 0  心智模型 hero：class Foo ≙ type("Foo", bases, namespace)
 * step 1  语法糖双卡：class 写法 ≙ type 调用
 * step 2  真机终端：Dog 属性 + type(Dog) / type(type)
 * step 3  层级链：type(42) → int → type
 * step 4  收束：isinstance(int, type) = True
 */

const CHAIN = [
  { expr: "type(42)", result: "int" },
  { expr: "type(int)", result: "type" },
  { expr: "type(type)", result: "type" },
];

export default function TypeChapter({ step }: ChapterStepProps) {
  /* step 0 — 心智模型 hero */
  if (step === 0) {
    return (
      <div className="scene-pad tp-scene tp-model-scene">
        <div className="tp-model-lead tp-rise">
          <span className="tp-model-k">class</span> Foo 不是声明，是<b>表达式</b>
        </div>

        <div className="tp-model-call tp-pop" style={{ animationDelay: "900ms" }}>
          <span className="tp-model-fn">type</span>(
          <span className="tp-model-arg tp-model-arg-1">"Foo"</span>,{" "}
          <span className="tp-model-arg tp-model-arg-2">bases</span>,{" "}
          <span className="tp-model-arg tp-model-arg-3">namespace</span>)
        </div>

        <div className="tp-model-legend">
          <span className="tp-model-legend-item tp-rise" style={{ animationDelay: "1800ms" }}>
            <i className="tp-dot tp-dot-1" />类名
          </span>
          <span className="tp-model-legend-item tp-rise" style={{ animationDelay: "2100ms" }}>
            <i className="tp-dot tp-dot-2" />父类
          </span>
          <span className="tp-model-legend-item tp-rise" style={{ animationDelay: "2400ms" }}>
            <i className="tp-dot tp-dot-3" />属性
          </span>
        </div>
      </div>
    );
  }

  /* step 1 — 语法糖双卡 */
  if (step === 1) {
    return (
      <div className="scene-pad tp-scene tp-sugar-scene">
        <div className="tp-sugar-cols">
          <pre className="tp-sugar-card tp-rise">{`class Dog(Animal):
    species = "Canine"`}</pre>

          <div className="tp-sugar-eq tp-pop" style={{ animationDelay: "1200ms" }}>
            等价于
          </div>

          <pre className="tp-sugar-card tp-sugar-card-acc tp-rise" style={{ animationDelay: "600ms" }}>{`Dog = type("Dog",
    (Animal,),
    {"species": "Canine"})`}</pre>
        </div>
      </div>
    );
  }

  /* step 2 — 真机终端 */
  if (step === 2) {
    return (
      <div className="scene-pad tp-scene tp-term-scene">
        <div className="tp-term tp-rise">
          <div className="tp-term-bar">python3 metaclass.py</div>
          <div className="tp-term-body">
            <div className="tp-term-line tp-line-in" style={{ animationDelay: "300ms" }}>
              Dog.kingdom&nbsp;= Animalia
            </div>
            <div className="tp-term-line tp-line-in" style={{ animationDelay: "1000ms" }}>
              Dog.species = Canine
            </div>
            <div className="tp-term-line tp-term-acc tp-line-in" style={{ animationDelay: "1800ms" }}>
              type(Dog)&nbsp;&nbsp;&nbsp;= type
            </div>
            <div className="tp-term-line tp-term-acc tp-line-in" style={{ animationDelay: "2600ms" }}>
              type(type)&nbsp;= type
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 层级链 */
  if (step === 3) {
    return (
      <div className="scene-pad tp-scene tp-chain-scene">
        <div className="tp-chain-lead tp-rise">往下挖一层</div>
        <div className="tp-chain">
          {CHAIN.map((c, i) => (
            <span key={c.expr} className="tp-chain-unit">
              {i > 0 && <span className="tp-chain-link tp-rise" style={{ animationDelay: `${900 + i * 500}ms` }} />}
              <div className="tp-chain-node tp-rise" style={{ animationDelay: `${500 + i * 500}ms` }}>
                <span className="tp-chain-expr">{c.expr}</span>
                <span className="tp-chain-res">{c.result}</span>
              </div>
            </span>
          ))}
        </div>
        <div className="tp-chain-foot tp-rise" style={{ animationDelay: "2400ms" }}>
          类的链条，<b>最后都落在 type 上</b>
        </div>
      </div>
    );
  }

  /* step 4 — 收束 */
  return (
    <div className="scene-pad tp-scene tp-final-scene">
      <div className="tp-final-code tp-rise">
        <span className="tp-final-k">isinstance</span>(int, type)
      </div>
      <div className="tp-final-true tp-pop" style={{ animationDelay: "1100ms" }}>
        True
      </div>
      <div className="tp-final-foot tp-rise" style={{ animationDelay: "2000ms" }}>
        type 是所有类的类，<b>也是它自己的实例</b>
      </div>
    </div>
  );
}
