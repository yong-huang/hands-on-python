import type { ChapterStepProps } from "../../registry/types";
import "./Release.css";

const ROWS = [
  { op: "time.sleep()", ok: true, why: "I/O 等待" },
  { op: "socket.recv()", ok: true, why: "网络 I/O" },
  { op: "numpy.sum()", ok: true, why: "C 扩展显式释放" },
  { op: "for range(10⁹)", ok: false, why: "纯 Python" },
  { op: "str.join()", ok: false, why: "纯 Python" },
  { op: "re.match() / json.dumps()", ok: false, why: "C 扩展但未释放" },
];

export default function ReleaseChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad rl-scene rl-lead-scene">
      <div className="rl-lead-line rl-rise">什么时候释放 GIL？</div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad rl-scene rl-table-scene">
      <div className="rl-table-head rl-rise">哪些操作会让出 GIL？</div>
      <div className="rl-table">
        {ROWS.map((r, i) => (
          <div key={r.op} className={"rl-row rl-rise " + (r.ok ? "rl-row-yes" : "rl-row-no")} style={{ animationDelay: `${400+i*350}ms` }}>
            <span className={"rl-row-badge " + (r.ok ? "rl-badge-yes" : "rl-badge-no")}>{r.ok ? "Yes" : "No"}</span>
            <span className="rl-row-op">{r.op}</span>
            <span className="rl-row-why">{r.why}</span>
          </div>
        ))}
      </div>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad rl-scene rl-cec-scene">
      <div className="rl-cec-big rl-rise">「是 C 扩展」≠「释放 GIL」</div>
      <div className="rl-cec-cols">
        <div className="rl-cec-card rl-rise" style={{ animationDelay: "900ms" }}>
          <span className="rl-cec-name">re · json</span>
          <span className="rl-cec-desc">C 实现，但直接操作 Python 对象 → GIL 不放</span>
        </div>
        <div className="rl-cec-card rl-cec-good rl-rise" style={{ animationDelay: "1700ms" }}>
          <span className="rl-cec-name">numpy</span>
          <span className="rl-cec-desc">C 层显式 Py_BEGIN_ALLOW_THREADS → 释放</span>
        </div>
      </div>
    </div>
  );
  return (
    <div className="scene-pad rl-scene rl-rule-scene">
      <div className="rl-rule-line rl-rise">判定口诀</div>
      <div className="rl-rule-body rl-rise" style={{ animationDelay: "700ms" }}>看<b>等 I/O</b> 还是<b>跑字节码</b></div>
      <div className="rl-rule-sub rl-fade" style={{ animationDelay: "1600ms" }}>C 扩展要查有没有显式释放</div>
    </div>
  );
}
