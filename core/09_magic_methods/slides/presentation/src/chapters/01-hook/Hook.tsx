import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

export default function HookChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad hk-scene hk-err-scene">
      <div className="hk-err-code hk-rise"><span className="hk-dim">&gt;&gt;&gt;</span> p1 + p2</div>
      <div className="hk-err-trace hk-pop" style={{ animationDelay: "800ms" }}>
        <div className="hk-err-bar">TypeError</div>
        <div className="hk-err-body">unsupported operand type(s) for +: 'Point' and 'Point'</div>
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad hk-scene hk-print-scene">
      <div className="hk-print-code hk-rise"><span className="hk-dim">&gt;&gt;&gt;</span> print(p)</div>
      <div className="hk-print-output hk-pop" style={{ animationDelay: "800ms" }}>&lt;Point object at 0x7f3a2b4c&gt;</div>
      <div className="hk-print-note hk-rise" style={{ animationDelay: "1600ms" }}>一串内存地址，啥也看不出来</div>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad hk-scene hk-set-scene">
      <div className="hk-set-lead hk-rise">放进 set 去重？也全靠对象 id</div>
      <div className="hk-set-demo hk-rise" style={{ animationDelay: "700ms" }}>
        <span className="hk-set-obj">Point(1, 2) @ 0x7f3a</span>
        <span className="hk-set-obj hk-set-obj-2">Point(1, 2) @ 0x7f3b</span>
        <span className="hk-set-arrow">→</span>
        <span className="hk-set-count">set 里有 2 个</span>
      </div>
      <div className="hk-set-note hk-rise" style={{ animationDelay: "1600ms" }}>值一样也不去重</div>
    </div>
  );
  return (
    <div className="scene-pad hk-scene hk-dunder-scene">
      <div className="hk-dunder-lead hk-rise">这些都是因为类没有实现</div>
      <div className="hk-dunder-big hk-pop" style={{ animationDelay: "700ms" }}>
        <span className="hk-dunder-us">__</span>dunder<span className="hk-dunder-us">__</span>
      </div>
      <div className="hk-dunder-sub hk-rise" style={{ animationDelay: "1600ms" }}>
       魔术方法——Python 的运算符和内置函数背后全是它们
      </div>
    </div>
  );
}
