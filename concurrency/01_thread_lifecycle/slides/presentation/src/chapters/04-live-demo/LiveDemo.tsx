import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./LiveDemo.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** article L100-102 的真实批次输出（双源：原样搬进画面）。 */
const BATCHES = [
  ["W1#t0", "W3#t0", "W2#t0", "W1#t1", "W0#t0", "W2#t1", "W1#t2", "W3#t1", "W2#t2", "W0#t1", "W3#t2", "W0#t2"],
  ["W0#t0", "W3#t0", "W2#t0", "W1#t0", "W2#t1", "W0#t1", "W1#t1", "W3#t1", "W0#t2", "W2#t2", "W1#t2", "W3#t2"],
  ["W3#t0", "W1#t0", "W2#t0", "W0#t0", "W1#t1", "W2#t1", "W3#t1", "W0#t1", "W3#t2", "W0#t2", "W2#t2", "W1#t2"],
];

/** 模拟终端窗框（s1~s3 复用同一扇窗，叙事连续）。 */
function Term({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div className="ld-term ld-rise" style={style}>
      <div className="ld-term-bar">
        <span className="ld-term-dot" />
        <span className="ld-term-dot" />
        <span className="ld-term-dot" />
        <span className="ld-term-title mono">thread_lifecycle.py</span>
      </div>
      <pre className="ld-term-body mono">{children}</pre>
    </div>
  );
}

export default function LiveDemoChapter({ step }: ChapterStepProps) {
  /* step 0 — 一行命令，四个小节 */
  if (step === 0) {
    return (
      <div className="scene-pad ld-scene ld-cmd-scene">
        <Term style={delay(200)}>
          <div className="ld-term-line ld-rise" style={delay(700)}>
            <span className="ld-prompt">$</span> python3 thread_lifecycle.py
          </div>
          {["[1] 状态机走一遍", "[2] start() vs run()", "[3] 交错执行观察", "[4] daemon 截断演示"].map((s, i) => (
            <div className="ld-term-line ld-term-section ld-rise" style={delay(1300 + i * 350)} key={s}>
              {s}
            </div>
          ))}
        </Term>
        <div className="ld-note ld-rise" style={delay(3000)}>
          <span className="label-mono">内置断言</span>
          跑完自动帮你核对结果
        </div>
      </div>
    );
  }

  /* step 1 — t.run()：干活的还是 MainThread */
  if (step === 1) {
    return (
      <div className="scene-pad ld-scene ld-run-scene">
        <Term style={delay(200)}>
          <div className="ld-term-line ld-term-section">[2. start() vs run()]</div>
          <div className="ld-term-line ld-term-hit ld-rise" style={delay(900)}>
            {"t.run()      → 函数体执行了，但线程是 MainThread"}
          </div>
        </Term>
        <div className="ld-run-panel">
          <div className="ld-run-big ld-rise" style={delay(1600)}>
            没有<b className="ld-accent">新线程</b>
          </div>
          <div className="ld-note ld-rise" style={delay(2400)}>
            <span className="label-mono">执行者</span>
            干活的还是主线程 MainThread
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — t.start()：born-by-start，一字之差 */
  if (step === 2) {
    return (
      <div className="scene-pad ld-scene ld-run-scene">
        <Term style={delay(200)}>
          <div className="ld-term-line ld-term-dim">{"t.run()      → 函数体执行了，但线程是 MainThread"}</div>
          <div className="ld-term-line ld-term-hit ld-rise" style={delay(700)}>
            {"t.start()    → 函数体跑在新线程 born-by-start 里"}
          </div>
        </Term>
        <div className="ld-run-panel">
          <div className="ld-run-big ld-rise" style={delay(1500)}>
            一字之差
            <br />
            <b className="ld-accent">天壤之别</b>
          </div>
          <div className="ld-note ld-rise" style={delay(2500)}>
            <span className="label-mono">名词</span>
            born-by-start ＝ 演示给新线程起的名字
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 二次 start：RuntimeError */
  if (step === 3) {
    return (
      <div className="scene-pad ld-scene ld-run-scene">
        <Term style={delay(200)}>
          <div className="ld-term-line ld-rise" style={delay(600)}>
            <span className="ld-prompt">$</span> 对已启动的线程，再 start() 一次？
          </div>
          <div className="ld-term-line ld-term-error ld-rise" style={delay(1600)}>
            RuntimeError: threads can only be started once
          </div>
        </Term>
        <div className="ld-run-panel">
          <div className="ld-run-big ld-rise" style={delay(2400)}>
            线程只能
            <br />
            <b className="ld-accent">启动一次</b>
          </div>
          <div className="ld-note ld-rise" style={delay(3200)}>
            <span className="label-mono">想重跑</span>
            换新对象
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 交错矩阵：3 批 3 种排列（真实输出） */
  if (step === 4) {
    return (
      <div className="scene-pad ld-scene ld-matrix-scene">
        <div className="ld-matrix-head ld-rise">
          <span className="ld-matrix-title">交错观察：4 个线程，各走 3 步，连跑 3 批（真实输出）</span>
          <span className="ld-matrix-legend">
            一格读作：<b className="mono">W2#t1</b> ＝ <b>2 号线程</b>干完了它的<b>第 1 步</b>
          </span>
        </div>
        <div className="ld-matrix">
          {BATCHES.map((batch, bi) => (
            <div className="ld-matrix-row ld-rise" style={delay(500 + bi * 700)} key={bi}>
              <span className="ld-matrix-tag mono">批次 {bi}</span>
              <div className="ld-matrix-cells">
                {batch.map((c, ci) => (
                  <span className="ld-matrix-cell mono" style={delay(700 + bi * 700 + ci * 45)} key={ci}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="ld-matrix-verdict ld-rise" style={delay(3400)}>
          3 批，<b className="ld-accent">3 种排列</b> —— 线程之间，顺序不可预测
        </div>
      </div>
    );
  }

  /* step 5 — 两层事实拆开演：行内永远有序，行间每次不同 */
  if (step === 5) {
    const runs: [string, string][] = [
      ["第 1 次运行", "W1 W3 W2 W1 W0 W2 W1 W3"],
      ["第 2 次运行", "W0 W3 W2 W1 W2 W0 W1 W3"],
    ];
    return (
      <div className="scene-pad ld-scene ld-order-scene">
        <div className="ld-order-thesis ld-rise">两件事，同时成立</div>
        <div className="ld-order-band ld-rise" style={delay(400)}>
          <div className="ld-order-bandhead">
            每个线程<b className="ld-accent">自己</b> —— t0 → t1 → t2，永远有序
          </div>
          {["W0", "W1", "W2", "W3"].map((w, i) => (
            <div className="ld-order-row ld-rise" style={delay(900 + i * 280)} key={w}>
              <span className="ld-order-name mono">{w}</span>
              <span className="ld-order-ticks mono">t0 <i>→</i> t1 <i>→</i> t2</span>
              <span className="ld-order-ok mono">{"✓\uFE0E"}</span>
            </div>
          ))}
        </div>
        <div className="ld-order-band ld-rise" style={delay(2400)}>
          <div className="ld-order-bandhead">
            线程<b className="ld-accent">之间</b> —— 相对先后，每次都不一样
          </div>
          {runs.map(([tag, seq], i) => (
            <div className="ld-order-run ld-rise" style={delay(2900 + i * 500)} key={tag}>
              <span className="ld-order-runtag mono">{tag}</span>
              <span className="ld-order-runseq mono">{seq}</span>
            </div>
          ))}
        </div>
        <div className="ld-order-final">
          <div className="ld-order-hero ld-rise" style={delay(4000)}>
            行内<b>有序</b>，行间<b className="ld-accent">无序</b>
          </div>
          <div className="ld-order-sub ld-rise" style={delay(4800)}>
            所以你跑出来的序列，一定和我不一样 —— 这就是不确定性本身
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — daemon 截断：20 格只跑 5 格 */
  const cells = Array.from({ length: 20 }, (_, i) => i);
  return (
    <div className="scene-pad ld-scene ld-daemon-scene">
      <div className="ld-daemon-head ld-rise">
        <span className="label-mono">daemon 要打 20 条 · 主线程睡 0.3 秒就退</span>
      </div>
      <div className="ld-daemon-track">
        {cells.map((i) => (
          <div
            className={`ld-daemon-cell ld-pop${i < 5 ? " ld-daemon-cell--done" : ""}${i === 5 ? " ld-daemon-cell--cut" : ""}`}
            style={delay(800 + i * 110)}
            key={i}
          >
            <span className="mono">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="ld-daemon-verdict ld-rise" style={delay(3900)}>
        只来得及打 <b className="ld-accent">5 / 20</b> 条，程序直接走人
      </div>
      <div className="ld-daemon-foot ld-rise" style={delay(5000)}>
        <span className="ld-daemon-exit mono">exit code = 0</span>
        <span className="ld-daemon-exit-note">系统眼里，它「正常结束」了</span>
      </div>
    </div>
  );
}
