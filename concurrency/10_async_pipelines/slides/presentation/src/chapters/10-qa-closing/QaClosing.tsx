import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./QaClosing.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function QaClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — Q1：两个 Queue 的区别 */
  if (step === 0) {
    return (
      <div className="scene-pad qc-scene">
        <div className="qc-head qc-rise">
          <span className="label-mono">迁移问答 Q1 · 两个 Queue</span>
        </div>
        <div className="qc-q">
          <div className="qc-q-col qc-rise" style={delay(300)}>
            <div className="qc-q-name mono">asyncio.Queue</div>
            <div className="qc-q-row">
              <span className="qc-q-key label-mono">API</span>
              <span>几乎一致</span>
            </div>
            <div className="qc-q-row qc-q-row--fork">
              <span className="qc-q-key label-mono">等待</span>
              <span className="qc-q-acc">await 让出 · 单线程协作</span>
            </div>
          </div>
          <div className="qc-q-col qc-rise" style={delay(1400)}>
            <div className="qc-q-name mono">queue.Queue</div>
            <div className="qc-q-row">
              <span className="qc-q-key label-mono">API</span>
              <span>几乎一致</span>
            </div>
            <div className="qc-q-row qc-q-row--fork">
              <span className="qc-q-key label-mono">等待</span>
              <span className="qc-q-hot">阻塞线程 · 多线程抢占</span>
            </div>
          </div>
        </div>
        <div className="qc-q-note qc-rise" style={delay(3200)}>
          跨线程传数据 → 线程队列，或走<b>专门的桥接</b>
        </div>
      </div>
    );
  }

  /* step 1 — Q2：毒丸关闭在异步版 */
  if (step === 1) {
    return (
      <div className="scene-pad qc-scene">
        <div className="qc-head qc-rise">
          <span className="label-mono">迁移问答 Q2 · 毒丸关闭</span>
        </div>
        <div className="qc-proto-same qc-rise" style={delay(300)}>
          <span className="label-mono">协议一模一样</span>
          <div className="qc-proto-chips">
            <span className="qc-chip qc-pop" style={delay(900)}>None 哨兵</span>
            <span className="qc-chip qc-pop" style={delay(1500)}>task_done</span>
            <span className="qc-chip qc-pop" style={delay(2100)}>join</span>
          </div>
        </div>
        <div className="qc-gather qc-rise" style={delay(3000)}>
          <span className="label-mono">只差一处</span>
          <span className="qc-gather-code mono">
            asyncio.gather(*consumers)
          </span>
          <span className="qc-gather-talk">收工 · 一次等齐所有消费者</span>
        </div>
        <div className="qc-seamless qc-pop" style={delay(4800)}>
          线程版经验 · 无缝搬过来
        </div>
      </div>
    );
  }

  /* step 2 — 收尾页 */
  return (
    <div className="scene-pad qc-scene qc-end-scene">
      <div className="qc-end-center">
        <div className="label-mono qc-rise">HANDS-ON · PYTHON</div>
        <hr className="rule qc-end-rule qc-rise" style={delay(150)} />
        <div className="qc-end-repo qc-rise" style={delay(300)}>
          concurrency / <span className="qc-end-acc">10</span> async_pipelines
        </div>
        <div className="qc-end-talk qc-rise" style={delay(800)}>
          python3 一跑就有体感
        </div>
      </div>
      <div className="qc-end-bye qc-rise" style={delay(1600)}>
        下期见
      </div>
    </div>
  );
}
