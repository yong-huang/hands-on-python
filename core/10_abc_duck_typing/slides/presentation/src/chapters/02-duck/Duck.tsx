import type { ChapterStepProps } from "../../registry/types";
import "./Duck.css";
export default function DuckChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad dk-scene dk-def-scene">
      <div className="dk-def-name dk-rise">Duck Typing</div>
      <div className="dk-def-quote dk-rise" style={{ animationDelay: "500ms" }}>「走起来像鸭子就是鸭子」</div>
      <div className="dk-def-body dk-rise" style={{ animationDelay: "1200ms" }}>只关注对象<b>有没有某个方法</b>，不关注类型</div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad dk-scene dk-code-scene">
      <div className="dk-code-lead dk-rise"><span className="dk-dim">只看行为：</span></div>
      <pre className="dk-code dk-rise" style={{ animationDelay: "400ms" }}>{`def quack(duck):
    return duck.speak()  # 只要有 speak() 方法就行

quack(Duck())   # "Quack!"
quack(Person()) # AttributeError: no speak()`}</pre>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad dk-scene dk-vs-scene">
      <div className="dk-vs-cols">
        <div className="dk-vs-card dk-vs-good dk-rise" style={{ animationDelay: "500ms" }}>
          <span className="dk-vs-mono">Duck</span><span className="dk-vs-ok">✓</span>
          <span className="dk-vs-note">有 speak() → 正常</span>
        </div>
        <div className="dk-vs-card dk-vs-bad dk-rise" style={{ animationDelay: "1200ms" }}>
          <span className="dk-vs-mono">Person</span><span className="dk-vs-err">✗</span>
          <span className="dk-vs-note">没有 speak() → 炸</span>
        </div>
      </div>
    </div>
  );
  return (
    <div className="scene-pad dk-scene dk-bound-scene">
      <div className="dk-bound-line dk-rise">灵活，但接口约定<b>全靠口头</b></div>
      <div className="dk-bound-sub dk-rise" style={{ animationDelay: "700ms" }}>缺方法只在<b>调用时</b>炸 AttributeError</div>
    </div>
  );
}
