import type { ChapterStepProps } from "../../registry/types";
import "./Models.css";

const MODELS = [
  { name: "threading", scene: "I/O 密集（网络/文件/DB）", gil: "GIL 在 I/O 时释放", mem: "低 · 共享内存" },
  { name: "multiprocessing", scene: "CPU 密集（计算/编码）", gil: "每进程独立 GIL", mem: "高 · 进程隔离" },
  { name: "asyncio", scene: "大量 I/O 并发（高 QPS）", gil: "单线程 · 无 GIL 问题", mem: "最低" },
];

export default function ModelsChapter({ step }: ChapterStepProps) {
  if (step === 0) {
    return (
      <div className="scene-pad md-scene md-table-scene">
        <div className="md-table-lead md-rise">三种并发模型</div>
        <div className="md-table">
          <div className="md-row md-row-head md-rise"><span>模型</span><span>适用场景</span><span>GIL 影响</span><span>内存</span></div>
          {MODELS.map((m, i) => (
            <div key={m.name} className="md-row md-rise" style={{ animationDelay: `${500+i*500}ms` }}>
              <span className="md-row-name">{m.name}</span>
              <span className="md-row-scene">{m.scene}</span>
              <span className="md-row-gil">{m.gil}</span>
              <span className="md-row-mem">{m.mem}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="scene-pad md-scene md-fine-scene">
        <div className="md-fine-lead md-rise">细选一下</div>
        <div className="md-fine-list">
          <div className="md-fine-item md-rise" style={{ animationDelay: "600ms" }}><span className="md-fine-k">I/O &lt; 100</span> threading（简单）</div>
          <div className="md-fine-item md-rise" style={{ animationDelay: "1400ms" }}><span className="md-fine-k">I/O &gt; 100</span> asyncio（高效）</div>
          <div className="md-fine-item md-rise" style={{ animationDelay: "2200ms" }}><span className="md-fine-k">CPU 密集</span> run_in_executor → 进程池</div>
        </div>
      </div>
    );
  }
  return (
    <div className="scene-pad md-scene md-ft-scene">
      <div className="md-ft-lead md-rise">为什么不直接去掉 GIL？</div>
      <div className="md-ft-body md-rise" style={{ animationDelay: "700ms" }}>它保护 CPython 的<b>引用计数</b>内存管理</div>
      <div className="md-ft-timeline md-rise" style={{ animationDelay: "1600ms" }}>
        <span className="md-ft-node md-ft-node-acc">3.13 · free-threading 实验版</span>
        <span className="md-ft-arrow">→</span>
        <span className="md-ft-node">3.14 · phase II 官方支持</span>
        <span className="md-ft-arrow">→</span>
        <span className="md-ft-node">传统 GIL 仍默认</span>
      </div>
    </div>
  );
}
