import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./QaClosing.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/**
 * ch07 · qa-closing — 快问快答与收尾（4 步，script.md 第 44~47 拍）。
 * Q1 速率剖面 / Q2 双 join 对照 + 收尾三步时间线 / Q3 异常路径 + 兜底两件套 / 收尾 CTA。
 */
export default function QaClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — Q1 · 速率剖面：最慢一环决定总吞吐（口播约 17s，预算 ≤16s） */
  if (step === 0) {
    return (
      <div className="scene-pad qc-scene">
        <div className="qc-head qc-rise">
          <span className="label-mono">最后三问 · 快问快答</span>
          <span className="qc-head-ord mono">Q1 / 03</span>
        </div>
        <h2 className="qc-question qc-rise" style={delay(1200)}>
          整条流水线，一秒能处理多少件？
        </h2>

        <div className="qc-profile" aria-hidden>
          <div className="qc-node qc-pop" style={delay(2000)}>
            <span className="qc-node-name">生产</span>
            <span className="qc-node-api mono">put() · 飞快</span>
          </div>
          <span className="qc-flow mono qc-pop" style={delay(2150)}>→</span>
          <div className="qc-node qc-pop" style={delay(2300)}>
            <span className="qc-node-name">队列</span>
            <span className="qc-node-api mono">maxsize 10</span>
          </div>
          <span className="qc-flow mono qc-pop" style={delay(2450)}>→</span>
          <div className="qc-node qc-node--slow qc-pop" style={delay(2600)}>
            <span className="qc-node-name">消费</span>
            <span className="qc-node-api mono">get()</span>
            <span className="qc-slow-tag mono qc-pop" style={delay(5000)}>最慢一环</span>
            <span className="qc-slow-rate qc-pop" style={delay(6800)}>3 毫秒 / 件</span>
          </div>
        </div>

        <div className="qc-throughput qc-rise" style={delay(8500)}>
          <span className="qc-tp-from mono">3 ms / 件</span>
          <span className="qc-tp-arrow mono" aria-hidden>→</span>
          <span className="hero-num qc-tp-num">≈ 330</span>
          <span className="qc-tp-unit">件 / 秒</span>
        </div>

        <div className="qc-tagline qc-rise" style={delay(11000)}>
          背压把上游拉慢——<span className="qc-accent">这本来就是我们要的效果</span>
        </div>
        <div className="qc-note mono qc-rise" style={delay(14200)}>压力要反传回源头</div>
      </div>
    );
  }

  /* step 1 — Q2 · 双 join 对照 + 收尾三步时间线依次点亮（口播约 17s，预算 ≤16s） */
  if (step === 1) {
    return (
      <div className="scene-pad qc-scene">
        <div className="qc-head qc-rise">
          <span className="label-mono">最后三问 · 快问快答</span>
          <span className="qc-head-ord mono">Q2 / 03</span>
        </div>
        <h2 className="qc-question qc-rise" style={delay(150)}>两种等待，别搞混</h2>

        <div className="qc-joins">
          <div className="card qc-join-card qc-rise" style={delay(1700)}>
            <div className="qc-join-name mono">q.join()</div>
            <div className="qc-join-verb">数回执</div>
            <div className="qc-join-note">交齐才放行——管<span className="qc-accent">活</span>干没干完</div>
          </div>
          <span className="qc-join-sep" aria-hidden />
          <div className="card qc-join-card qc-rise" style={delay(6900)}>
            <div className="qc-join-name mono">Thread.join()</div>
            <div className="qc-join-verb">等人</div>
            <div className="qc-join-note">等那个线程函数<span className="qc-accent">真正返回</span></div>
          </div>
        </div>

        <div className="qc-tl">
          <div className="qc-tl-head qc-rise" style={delay(10500)}>
            <span className="label-mono">收尾三步 · 顺序不能乱</span>
          </div>
          <div className="qc-tl-row" aria-hidden>
            <div className="qc-stepnode qc-pop" style={delay(12200)}>
              <span className="qc-stepnode-ord mono">1</span>
              <span className="qc-stepnode-name">队列 join</span>
              <span className="qc-stepnode-sub mono">活清完</span>
            </div>
            <span className="qc-tl-link qc-grow" style={delay(12900)} />
            <div className="qc-stepnode qc-pop" style={delay(13900)}>
              <span className="qc-stepnode-ord mono">2</span>
              <span className="qc-stepnode-name">投毒丸</span>
              <span className="qc-stepnode-sub mono">人退场</span>
            </div>
            <span className="qc-tl-link qc-grow" style={delay(14600)} />
            <div className="qc-stepnode qc-pop" style={delay(15300)}>
              <span className="qc-stepnode-ord mono">3</span>
              <span className="qc-stepnode-name">线程 join</span>
              <span className="qc-stepnode-sub mono">人走了</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — Q3 · 异常路径 + 兜底两件套（口播约 16s，预算 ≤15s） */
  if (step === 2) {
    return (
      <div className="scene-pad qc-scene">
        <div className="qc-head qc-rise">
          <span className="label-mono">最后三问 · 快问快答</span>
          <span className="qc-head-ord mono">Q3 / 03</span>
        </div>
        <h2 className="qc-question qc-rise" style={delay(200)}>消费者中途出错，会怎样？</h2>

        <div className="qc-chain qc-dim" aria-hidden>
          <div className="qc-chain-node qc-pop" style={delay(2000)}>
            <span className="qc-chain-mark mono">{"✗\uFE0E"}</span>
            <span className="qc-chain-name">消费者带崩</span>
            <span className="qc-chain-sub mono">异常终结线程</span>
          </div>
          <span className="qc-chain-arrow mono qc-pop" style={delay(3800)}>→</span>
          <div className="qc-chain-node qc-pop" style={delay(4100)}>
            <span className="qc-chain-name">任务没人处理</span>
            <span className="qc-chain-sub mono">未取任务滞留队列</span>
          </div>
          <span className="qc-chain-arrow mono qc-pop" style={delay(5500)}>→</span>
          <div className="qc-chain-node qc-chain-node--stuck qc-pop" style={delay(5800)}>
            <span className="qc-chain-name">清点卡死</span>
            <span className="qc-chain-sub mono">join 永不返回</span>
          </div>
        </div>

        <div className="qc-fix-head">
          <span className="label-mono qc-rise" style={delay(6900)}>兜底两件</span>
          <hr className="rule qc-grow" style={delay(7000)} />
        </div>

        <div className="qc-fixes">
          <div className="card qc-fix-card qc-pop" style={delay(7600)}>
            <div className="qc-fix-name">
              <span className="qc-fix-mark mono">{"✓\uFE0E"}</span>回执放 <span className="mono">finally</span>
            </div>
            <div className="qc-fix-note">出错也交——回执必达</div>
          </div>
          <div className="card qc-fix-card qc-pop" style={delay(9700)}>
            <div className="qc-fix-name">
              <span className="qc-fix-mark mono">{"✓\uFE0E"}</span>坏任务进死信队列
            </div>
            <div className="qc-fix-note">专门放处理不了的任务——回头慢慢查</div>
            <div className="qc-fix-tag mono qc-rise" style={delay(11600)}>DEAD-LETTER QUEUE</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 收尾 CTA（口播约 5s，动画总预算 ≤4s） */
  return (
    <div className="scene-pad qc-scene">
      <div className="qc-end-repo qc-rise">
        <span className="label-mono">仓库 · 第四讲目录</span>
        <span className="qc-end-path mono">hands-on-python / concurrency / 04_producer_consumer</span>
      </div>
      <div className="qc-end-cmd mono qc-rise" style={delay(1200)}>
        <span className="qc-end-prompt">$</span>python3 producer_consumer.py
      </div>
      <div className="qc-end-hero qc-rise" style={delay(2300)}>
        下一讲，<span className="qc-accent">多进程</span>
      </div>
      <div className="qc-end-bye qc-rise" style={delay(3200)}>下期见</div>
    </div>
  );
}
