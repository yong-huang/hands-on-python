import type { ChapterStepProps } from "../../registry/types";
import "./WhatIs.css";

/**
 * ch02 · what-is — 可暂停的函数（5 steps）
 *
 * step 0  判定卡：含 yield 即生成器函数
 * step 1  心智模型：next() 推着跑，yield 处停
 * step 2  栈帧冻结：局部变量原封不动，精确恢复
 * step 3  生命周期状态机
 * step 4  真机状态检查：type / gi_running / gi_frame
 */

export default function WhatIsChapter({ step }: ChapterStepProps) {
  /* step 0 — 判定卡 */
  if (step === 0) {
    return (
      <div className="scene-pad wt-scene wt-transform-scene">
        <div className="wt-transform-lead wt-rise">函数里只要含一个 yield</div>

        <div className="wt-transform-cols">
          <div className="wt-transform-card wt-transform-card-dim wt-rise" style={{ animationDelay: "500ms" }}>
            <div className="wt-transform-tag">普通函数</div>
            <pre className="wt-code">{`def f():
    return 1`}</pre>
          </div>

          <div className="wt-transform-arrow wt-pop" style={{ animationDelay: "1200ms" }}>
            <span className="wt-transform-arrow-word">含 yield</span>
            <span className="wt-transform-arrow-glyph">→</span>
          </div>

          <div className="wt-transform-card wt-transform-card-acc wt-rise" style={{ animationDelay: "1700ms" }}>
            <div className="wt-transform-tag">生成器函数</div>
            <pre className="wt-code">{`def g():
    yield 1`}</pre>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 心智模型：next() 推着跑 */
  if (step === 1) {
    return (
      <div className="scene-pad wt-scene wt-model-scene">
        <div className="wt-model-code wt-rise">
          <div className={"wt-model-row wt-model-here"}>
            <span className="wt-model-marker">▶</span>
            def gen():
          </div>
          <div className="wt-model-row wt-model-indent">
            <span className="wt-model-marker" />
            a = 1
          </div>
          <div className="wt-model-row wt-model-yield wt-model-indent">
            <span className="wt-model-marker" />
            yield a
          </div>
        </div>

        <div className="wt-model-steps">
          <div className="wt-model-step wt-rise" style={{ animationDelay: "800ms" }}>
            <span className="wt-model-key">next()</span> 推它跑
          </div>
          <span className="wt-model-arrow wt-fade" style={{ animationDelay: "1600ms" }}>→</span>
          <div className="wt-model-step wt-model-step-acc wt-pop" style={{ animationDelay: "2000ms" }}>
            跑到下一个 <span className="wt-model-key">yield</span> 就停
          </div>
        </div>

        <div className="wt-model-foot wt-rise" style={{ animationDelay: "2700ms" }}>
          可暂停 · <b>可恢复</b>
        </div>
      </div>
    );
  }

  /* step 2 — 栈帧冻结 */
  if (step === 2) {
    return (
      <div className="scene-pad wt-scene wt-freeze-scene">
        <div className="wt-freeze-cols">
          <div className="wt-freeze-code wt-rise">
            <div className="wt-freeze-code-bar">gen() 暂停在 yield</div>
            <pre className="wt-code">{`def fib():
    a, b = 0, 1
    while True:
        yield a   ← 停在这里
        a, b = b, a + b`}</pre>
          </div>

          <div className="wt-freeze-frame wt-rise" style={{ animationDelay: "700ms" }}>
            <div className="wt-freeze-frame-tag">栈帧 · 原封不动</div>
            <div className="wt-freeze-var">a = 0</div>
            <div className="wt-freeze-var">b = 1</div>
          </div>
        </div>

        <div className="wt-freeze-foot wt-rise" style={{ animationDelay: "2200ms" }}>
          下次从暂停处，<b>精确恢复</b>
        </div>
      </div>
    );
  }

  /* step 3 — 生命周期状态机 */
  if (step === 3) {
    return (
      <div className="scene-pad wt-scene wt-fsm-scene">
        <div className="wt-fsm-lead wt-rise">它的一生，是一台状态机</div>

        <div className="wt-fsm">
          <div className="wt-fsm-node wt-rise" style={{ animationDelay: "300ms" }}>
            <div className="wt-fsm-node-name">已创建</div>
            <div className="wt-fsm-node-sub">调用不执行</div>
          </div>
          <span className="wt-fsm-edge wt-fsm-edge-l1">
            <span className="wt-fsm-edge-label">next()</span>
          </span>
          <div className="wt-fsm-node wt-fsm-node-mid wt-rise" style={{ animationDelay: "1000ms" }}>
            <div className="wt-fsm-node-name">运行中</div>
            <div className="wt-fsm-node-sub">⇄ 已暂停（yield）</div>
          </div>
          <span className="wt-fsm-edge wt-fsm-edge-l2">
            <span className="wt-fsm-edge-label">return</span>
          </span>
          <div className="wt-fsm-node wt-fsm-node-end wt-rise" style={{ animationDelay: "1900ms" }}>
            <div className="wt-fsm-node-name">StopIteration</div>
            <div className="wt-fsm-node-sub">函数返回</div>
          </div>
        </div>

        <div className="wt-fsm-foot wt-rise" style={{ animationDelay: "2800ms" }}>
          运行中 ⇄ 已暂停，<b>想停就停，想续就续</b>
        </div>
      </div>
    );
  }

  /* step 4 — 真机状态检查 */
  return (
    <div className="scene-pad wt-scene wt-inspect-scene">
      <div className="wt-inspect-term wt-rise">
        <div className="wt-inspect-bar">python3 generator_iterator.py</div>
        <div className="wt-inspect-body">
          <div className="wt-inspect-line wt-line-in" style={{ animationDelay: "300ms" }}>
            type: generator
          </div>
          <div className="wt-inspect-line wt-line-in" style={{ animationDelay: "1100ms" }}>
            gi_running: False
          </div>
          <div className="wt-inspect-line wt-line-in" style={{ animationDelay: "1900ms" }}>
            gi_frame: True
          </div>
          <div className="wt-inspect-line wt-line-in" style={{ animationDelay: "2700ms" }}>
            after exhaust: gi_frame=None
          </div>
        </div>
      </div>
      <div className="wt-inspect-foot wt-rise" style={{ animationDelay: "3600ms" }}>
        暂停时帧还在，<b>耗尽后帧就没了</b>
      </div>
    </div>
  );
}
