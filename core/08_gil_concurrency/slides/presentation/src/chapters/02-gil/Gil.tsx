import type { ChapterStepProps } from "../../registry/types";
import "./Gil.css";

export default function GilChapter({ step }: ChapterStepProps) {
  if (step === 0) {
    return (
      <div className="scene-pad gl-scene gl-model-scene">
        <div className="gl-model-head gl-rise">一句话心智模型</div>

        <div className="gl-model-cols">
          <div className="gl-model-card gl-rise" style={{ animationDelay: "400ms" }}>
            <div className="gl-model-card-tag">锁什么</div>
            <div className="gl-model-card-big">执行字节码</div>
            <div className="gl-model-card-sub">只锁这一件事</div>
          </div>

          <div className="gl-model-connector gl-fade" style={{ animationDelay: "1000ms" }}>
            <span className="gl-model-conn-lock">GIL</span>
            <span className="gl-model-conn-arrow">→</span>
            <span className="gl-model-conn-unlock">释放</span>
          </div>

          <div className="gl-model-card gl-model-card-acc gl-rise" style={{ animationDelay: "1600ms" }}>
            <div className="gl-model-card-tag">I/O 等待时</div>
            <div className="gl-model-card-big">让出锁</div>
            <div className="gl-model-card-sub">其他线程立刻获得</div>
          </div>
        </div>

        <div className="gl-model-foot gl-rise" style={{ animationDelay: "2600ms" }}>
          这就是「多线程能加速 I/O」的<b>微观原因</b>
        </div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="scene-pad gl-scene gl-timeline-scene">
        <div className="gl-timeline gl-rise">
          {[1,2,3].map(n => (
            <div key={n} className="gl-tl-row">
              <span className="gl-tl-label">Thread {n}</span>
              <span className="gl-tl-track">
                {[0,1,2].map(s => (
                  <span key={s} className={"gl-tl-block" + ((n+s)%3===0 ? " gl-tl-io" : "")} style={{ left: `${s*33+n*6}%` }} />
                ))}
              </span>
            </div>
          ))}
        </div>
        <div className="gl-tl-note gl-fade" style={{ animationDelay: "2000ms" }}>
          ~5ms 切换一次 · I/O 时释放 GIL
        </div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="scene-pad gl-scene gl-micro-scene">
        <div className="gl-micro-lead gl-rise">微观时序</div>
        <div className="gl-micro-steps">
          {[["T1 拿 GIL → 发起 recv()","阻塞等待"],["GIL 释放 → T2 获得","执行 5ms"],["I/O 完成 → T1 重新竞争"]].map(([a,b],i)=>(
            <div key={i} className="gl-micro-step gl-rise" style={{ animationDelay: `${600+i*800}ms` }}>
              <span className="gl-micro-ord">{i+1}</span>
              <span className="gl-micro-text"><b>{a}</b><br />{b}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="scene-pad gl-scene gl-concl-scene">
      <div className="gl-concl-big gl-rise">
        多线程能加速 <span className="gl-concl-io">I/O</span>
      </div>
      <div className="gl-concl-big gl-concl-neg gl-rise" style={{ animationDelay: "900ms" }}>
        不能加速 <span className="gl-concl-cpu">CPU</span>
      </div>
      <div className="gl-concl-foot gl-rise" style={{ animationDelay: "1800ms" }}>
        这就是<b>微观原因</b>
      </div>
    </div>
  );
}
