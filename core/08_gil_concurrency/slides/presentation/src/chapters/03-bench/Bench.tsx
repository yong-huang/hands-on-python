import type { ChapterStepProps } from "../../registry/types";
import "./Bench.css";

const CPU = [
  { name: "serial", time: "0.005s", ratio: "" },
  { name: "threading", time: "0.005s", ratio: "1.01x" },
  { name: "multiprocessing", time: "0.046s", ratio: "8.49x ↓" },
];
const IO = [
  { name: "serial", time: "0.828s", ratio: "" },
  { name: "threading", time: "0.106s", ratio: "7.84x ↑" },
  { name: "asyncio", time: "0.101s", ratio: "8.19x ↑" },
];

export default function BenchChapter({ step }: ChapterStepProps) {
  if (step === 0) return (
    <div className="scene-pad bn-scene bn-design-scene">
      <div className="bn-design-lead bn-rise">口说无凭，真机跑基准</div>
      <div className="bn-design-cards">
        <div className="bn-design-card bn-rise" style={{ animationDelay: "700ms" }}>
          <span className="bn-design-tag">CPU 密集</span><span className="bn-design-desc">素数计数 · 4 workers</span>
        </div>
        <div className="bn-design-card bn-rise" style={{ animationDelay: "1500ms" }}>
          <span className="bn-design-tag">I/O 密集</span><span className="bn-design-desc">8 × 100ms sleep</span>
        </div>
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="scene-pad bn-scene bn-tbl-scene">
      <div className="bn-tbl-head bn-rise"><span className="bn-dim">真机 · </span>CPU 密集（素数计数，n=5000）</div>
      <div className="bn-tbl">
        {CPU.map((r, i) => (
          <div key={r.name} className="bn-tbl-row bn-rise" style={{ animationDelay: `${500+i*600}ms` }}>
            <span className="bn-tbl-name">{r.name}</span><span className="bn-tbl-time">{r.time}</span>
            <span className={"bn-tbl-ratio" + (i===2 ? " bn-tbl-bad" : "")}>{r.ratio}</span>
          </div>
        ))}
      </div>
    </div>
  );
  if (step === 2) return (
    <div className="scene-pad bn-scene bn-note-scene">
      <div className="bn-note-big bn-rise">n=5000 太小</div>
      <div className="bn-note-sub bn-rise" style={{ animationDelay: "700ms" }}>进程启动成本（~48ms）远超计算本体（~5ms）</div>
      <div className="bn-note-fix bn-rise" style={{ animationDelay: "1600ms" }}>n 调大到 200,000 → 才能看到并行加速</div>
    </div>
  );
  if (step === 3) return (
    <div className="scene-pad bn-scene bn-io-scene">
      <div className="bn-io-lead bn-rise">换 I/O 密集：8 × 100ms sleep</div>
    </div>
  );
  if (step === 4) {
    return (
      <div className="scene-pad bn-scene bn-tbl-scene">
        <div className="bn-tbl-head bn-rise"><span className="bn-dim">真机 · </span>I/O 密集（8 × 100ms sleep）</div>
        <div className="bn-tbl">
          {IO.map((r, i) => (
            <div key={r.name} className="bn-tbl-row bn-rise" style={{ animationDelay: `${500+i*600}ms` }}>
              <span className="bn-tbl-name">{r.name}</span><span className="bn-tbl-time">{r.time}</span>
              <span className={"bn-tbl-ratio" + (i>0 ? " bn-tbl-good" : "")}>{r.ratio}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="scene-pad bn-scene bn-done-scene">
      <div className="bn-done-big bn-rise">Both FASTER</div>
      <div className="bn-done-sub bn-rise" style={{ animationDelay: "700ms" }}>GIL 在 I/O 等待期间被释放了</div>
    </div>
  );
}
