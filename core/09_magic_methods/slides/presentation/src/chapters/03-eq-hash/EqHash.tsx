import type { ChapterStepProps } from "../../registry/types";
import "./EqHash.css";
export default function EqHashChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad eh-scene eh-contract-scene">
      <div className="eh-contract-lead eh-rise">两个必须配套</div>
      <div className="eh-contract-flow eh-pop" style={{ animationDelay: "700ms" }}>
        <span className="eh-flow-chip"><span className="eh-flow-mono">__eq__</span> 管等于</span>
        <span className="eh-flow-arrow">⇒</span>
        <span className="eh-flow-chip"><span className="eh-flow-mono">__hash__</span> 管哈希</span>
      </div>
      <div className="eh-contract-rule eh-rise" style={{ animationDelay: "1700ms" }}>
        <span className="eh-mono">a == b</span> → <span className="eh-mono">hash(a) == hash(b)</span>
        <div className="eh-contract-code">hash((self.x, self.y))  # 与 __eq__ 同一批字段</div>
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad eh-scene eh-trap-scene">
      <div className="eh-trap-big eh-rise">只定义 __eq__？</div>
      <div className="eh-trace eh-pop" style={{ animationDelay: "1000ms" }}>
        <div className="eh-trace-bar">自动降级</div>
        <div className="eh-trace-body"><span className="eh-mono">__hash__ = None</span> → 不可哈希 → dict TypeError</div>
      </div>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad eh-scene eh-term-scene">
      <div className="eh-term eh-rise">
        <div className="eh-term-bar">python3 magic_methods.py</div>
        <div className="eh-term-body">
          <div className="eh-line eh-line-in" style={{ animationDelay: "300ms" }}><span className="eh-p">p1 == p2:</span> True</div>
          <div className="eh-line eh-line-in" style={{ animationDelay: "1400ms" }}><span className="eh-p">hash(p1) == hash(p2):</span> True</div>
          <div className="eh-line eh-line-in" style={{ animationDelay: "2500ms" }}><span className="eh-p">d[p2]:</span> origin <span className="eh-dim">(same hash, found via __eq__)</span></div>
        </div>
      </div>
    </div>
  );
  return (
    <div className="scene-pad eh-scene eh-combo-scene">
      <div className="eh-combo-line eh-rise">dict key、set 去重，<b>全靠这两个方法配合</b></div>
    </div>
  );
}
