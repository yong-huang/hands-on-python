import type { ChapterStepProps } from "../../registry/types";
import "./Ops.css";
export default function OpsChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad op-scene op-list-scene">
      <div className="op-list-lead op-rise">运算符重载</div>
      <div className="op-list">
        {[["__add__","加法"],["__mul__","乘法"],["__abs__","绝对值"],["__bool__","真假"]].map(([m,d],i)=>(
          <div key={m} className="op-item op-rise" style={{ animationDelay: `${400+i*350}ms` }}>
            <span className="op-item-mono">{m}</span><span className="op-item-desc">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad op-scene op-sentinel-scene">
      <div className="op-sentinel-lead op-rise">不认识右操作数？</div>
      <div className="op-sentinel-code op-pop" style={{ animationDelay: "600ms" }}>
        <div><span className="op-sentinel-k">if</span> isinstance(other, Point): <span className="op-sentinel-dim"># 认识 → 算</span></div>
        <div><span className="op-sentinel-k">return</span> NotImplemented  <span className="op-sentinel-dim"># 不认识 → 哨兵</span></div>
      </div>
      <div className="op-sentinel-note op-rise" style={{ animationDelay: "1600ms" }}>
        哨兵值，不是 NotImplementedError · <b>把选择权交回解释器</b>
      </div>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad op-scene op-chain-scene">
      <div className="op-chain-lead op-rise">回退链</div>
      <div className="op-chain-steps">
        {[["左操作数","__add__"],["右操作数反射","__radd__"],["都没有","TypeError"]].map(([a,b],i)=>(
          <div key={i} className="op-chain-step op-rise" style={{ animationDelay: `${500+i*700}ms` }}>
            <span className="op-chain-ord">{i+1}</span>
            <span className="op-chain-a">{a}</span>
            <span className="op-chain-b">{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="scene-pad op-scene op-term-scene">
      <div className="op-term op-rise">
        <div className="op-term-bar">python3 magic_methods.py</div>
        <div className="op-term-body">
          <div className="op-line op-line-in" style={{ animationDelay: "300ms" }}>
            <span className="op-p">Point(3, 4)</span> + <span className="op-p">Point(1, 2)</span> = <span className="op-acc">(4, 6)</span>
          </div>
          <div className="op-line op-line-in" style={{ animationDelay: "1600ms" }}>
            <span className="op-p">abs</span>(Point(3, 4)) = <span className="op-acc">5.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
