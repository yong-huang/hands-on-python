import type { ChapterStepProps } from "../../registry/types";
import "./Compare.css";
export default function CompareChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad cm-scene cm-fail-scene">
      <div className="cm-fail-lead cm-rise">三条路线的失败点时机</div>
      <div className="cm-fail-list">
        {[["Duck Typing","调用时","AttributeError"],["ABC","实例化时","TypeError"],["Protocol","isinstance 检查时","结构检查"]].map(([n,w,r],i)=>(
          <div key={n} className="cm-fail-row cm-rise" style={{ animationDelay: `${400+i*500}ms` }}>
            <span className="cm-fail-name">{n}</span>
            <span className="cm-fail-when">{w}</span>
            <span className="cm-fail-what">{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad cm-scene cm-pick-scene">
      <div className="cm-pick-lead cm-rise">选型速查</div>
      <div className="cm-pick-list cm-rise" style={{ animationDelay: "600ms" }}>
        {[["运行时检查","→ Protocol"],["强制实现","→ ABC"],["第三方类","→ register"]].map(([a,b],i)=>(
          <div key={i} className="cm-pick-row cm-rise" style={{ animationDelay: `${1000+i*400}ms` }}>
            <span className="cm-pick-a">{a}</span><span className="cm-pick-b">{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad cm-scene cm-quote-scene">
      <div className="cm-quote-big cm-rise">失败点越靠前</div>
      <div className="cm-quote-big cm-quote-acc cm-rise" style={{ animationDelay: "800ms" }}>约束越强</div>
    </div>
  );
  return (
    <div className="scene-pad cm-scene cm-series-scene">
      <div className="cm-series-lead cm-rise">Python 把每个环节都安排了协议</div>
      <div className="cm-series-list cm-rise" style={{ animationDelay: "800ms" }}>
        {[["魔术方法","运算与显示"],["__slots__","实例开销"],["MRO","方法查找"],["ABC / Protocol","多态约束"]].map(([a,b],i)=>(
          <div key={i} className="cm-series-item cm-rise" style={{ animationDelay: `${1400+i*350}ms` }}>
            <span className="cm-series-name">{a}</span><span className="cm-series-tag">{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
