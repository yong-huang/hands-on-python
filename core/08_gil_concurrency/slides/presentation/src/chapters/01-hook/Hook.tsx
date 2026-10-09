import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页 */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="kicker hk-rise">Python · GIL &amp; Concurrency</div>
          <hr className="rule hk-title-rule" />
          <h1 className="hk-title-main hk-rise" style={{ animationDelay: "250ms" }}>
            4 线程，CPU 能<b>跑满</b>吗？
          </h1>
          <hr className="rule hk-title-rule" style={{ animationDelay: "350ms" }} />
          <div className="hk-title-sub hk-rise" style={{ animationDelay: "600ms" }}>
            Python GIL 与并发模型
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={{ animationDelay: "850ms" }}>
          <div className="hk-tb-row"><span>Subj</span><b>gil-concurrency</b></div>
          <div className="hk-tb-row"><span>Repo</span><b>hands-on-python</b></div>
          <div className="hk-tb-row"><span>Lab</span><b>core / 08</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — T1~T4 + 追问 */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene hk-ask-scene">
        <div className="hk-ask-threads hk-rise">
          {[1,2,3,4].map(n => <span key={n} className="hk-ask-t">T{n}</span>)}
        </div>
        <div className="hk-ask-big hk-rise" style={{ animationDelay: "600ms" }}>
          CPU 能<b>跑满</b>吗？
        </div>
      </div>
    );
  }

  /* step 2 — 不能 + GIL */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene hk-gil-scene">
        <div className="hk-gil-no hk-rise">不能</div>
        <div className="hk-gil-line hk-rise" style={{ animationDelay: "600ms" }}>
          CPython 有一把全局解释器锁
        </div>
        <div className="hk-gil-name hk-pop" style={{ animationDelay: "1400ms" }}>GIL</div>
      </div>
    );
  }

  /* step 3 — 三模型预告 */
  return (
    <div className="scene-pad hk-scene hk-preview-scene">
      <div className="hk-preview-line hk-rise">
        同一时刻，只允许<b>一个线程</b>执行字节码
      </div>
      <div className="hk-preview-chips">
        {["threading","multiprocessing","asyncio"].map((t,i) => (
          <span key={t} className="hk-chip hk-rise" style={{ animationDelay: `${1000+i*400}ms` }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
