import type { CSSProperties, ReactNode } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./LiveDemo.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 模拟终端窗口骨架（真实输出文本取自 article §Quick Start）。 */
function Term({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fd-term card fd-pop" style={delay(300)}>
      <div className="fd-term-head mono">{title}</div>
      <div className="fd-term-body">{children}</div>
    </div>
  );
}

export default function LiveDemoChapter({ step }: ChapterStepProps) {
  /* step 0 — 一行命令，四个小节 */
  if (step === 0) {
    const sections = ["[1] 统一接口：线程/进程一键切换", "[2] as_completed：谁先完成谁先出", "[3] 异常传播：原样重现", "[4] result(timeout)：到点翻脸"];
    return (
      <div className="scene-pad fd-scene fd-boot-scene">
        <Term title="实验 · 约 3 秒">
          <div className="fd-term-cmd mono fd-rise" style={delay(900)}>
            <span className="fd-term-prompt">$</span> python3 futures_executor.py
            <span className="fd-term-caret" />
          </div>
          {sections.map((s, i) => (
            <div className="fd-term-line mono fd-rise" style={delay(2200 + i * 600)} key={s}>
              {s}
            </div>
          ))}
        </Term>
        <div className="fd-boot-note mono fd-rise" style={delay(6600)}>
          只用标准库 · 不装任何东西 · 跑完自动核对结果
        </div>
      </div>
    );
  }

  /* step 1 — 第一节：同一份代码，两个后端 */
  if (step === 1) {
    return (
      <div className="scene-pad fd-scene fd-same-scene">
        <div className="fd-same-code card fd-pop" style={delay(300)}>
          <span className="mono fd-same-code-tag">业务代码</span>
          <span className="fd-same-code-main">只写一份</span>
        </div>
        <div className="fd-same-duo">
          <div className="fd-same-backend fd-pop" style={delay(2000)}>
            <span className="mono">线程池</span>
            <span className="fd-same-ok mono fd-rise" style={delay(4600)}>✓ 每项均相等</span>
          </div>
          <div className="fd-same-backend fd-pop" style={delay(3200)}>
            <span className="mono">进程池</span>
            <span className="fd-same-ok mono fd-rise" style={delay(5400)}>✓ 每项均相等</span>
          </div>
        </div>
        <div className="fd-same-hero fd-rise" style={delay(6400)}>
          50 个任务，两边结果<span className="fd-accent">每项均相等</span>
        </div>
      </div>
    );
  }

  /* step 2 — 耗时：快递费 */
  if (step === 2) {
    return (
      <div className="scene-pad fd-scene fd-cost-scene">
        <div className="fd-cost-chart">
          <div className="fd-cost-row">
            <span className="fd-cost-name mono">线程池</span>
            <div className="fd-cost-bar fd-cost-bar--fast fd-grow" style={delay(700)} />
            <span className="fd-cost-val mono fd-rise" style={delay(1600)}>≈ 0</span>
          </div>
          <div className="fd-cost-row">
            <span className="fd-cost-name mono">进程池</span>
            <div className="fd-cost-bar fd-cost-bar--slow fd-grow" style={delay(1000)} />
            <span className="fd-cost-val mono fd-rise" style={delay(2200)}>51 ms</span>
          </div>
        </div>
        <div className="fd-cost-duo">
          <div className="fd-cost-meta fd-rise" style={delay(4600)}>
            线程 ＝ 同一个屋里<span className="fd-accent">递纸条</span>，不要钱
          </div>
          <div className="fd-cost-meta fd-rise" style={delay(6400)}>
            进程 ＝ <span className="fd-accent">跨城寄包裹</span>，按趟收费
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 大活儿才赚回运费 */
  if (step === 3) {
    return (
      <div className="scene-pad fd-scene fd-worth-scene">
        <div className="fd-worth-duo">
          <div className="fd-worth-card card fd-pop" style={delay(500)}>
            <div className="fd-worth-verdict mono fd-pop" style={delay(1400)}>✗</div>
            <div className="fd-worth-name">小活儿寄包裹</div>
            <div className="fd-worth-talk">运费比活儿本身还贵</div>
          </div>
          <div className="fd-worth-card card fd-pop" style={delay(2800)}>
            <div className="fd-worth-verdict mono fd-pop" style={delay(3800)}>✓</div>
            <div className="fd-worth-name">大活儿多开几间屋</div>
            <div className="fd-worth-talk">比如给几百万个数开方</div>
          </div>
        </div>
        <div className="fd-worth-hero fd-rise" style={delay(6000)}>
          分摊下来，<span className="fd-accent">运费才赚得回来</span>
        </div>
      </div>
    );
  }

  /* step 4 — 第二节：完成序 ≠ 提交序 */
  if (step === 4) {
    const submit = ["慢任务", "中任务", "快任务"];
    const done = ["快任务", "中任务", "慢任务"];
    return (
      <div className="scene-pad fd-scene fd-order-scene">
        <div className="fd-order-block">
          <div className="fd-order-label mono fd-rise" style={delay(400)}>提交顺序</div>
          <div className="fd-order-row">
            {submit.map((t, i) => (
              <span className="fd-order-chip mono fd-pop" style={delay(900 + i * 450)} key={`s${t}`}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="fd-order-mid fd-grow" style={delay(2600)}>↓ 出来的却是</div>
        <div className="fd-order-block">
          <div className="fd-order-label mono fd-rise" style={delay(3200)}>完成顺序</div>
          <div className="fd-order-row">
            {done.map((t, i) => (
              <span className="fd-order-chip fd-order-chip--hot mono fd-pop" style={delay(4000 + i * 550)} key={`d${t}`}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="fd-order-note fd-rise" style={delay(8200)}>
          同时挂几百个网页请求，<span className="fd-accent">谁先回来先处理谁</span>
        </div>
      </div>
    );
  }

  /* step 5 — wait：专等第一个完成 */
  if (step === 5) {
    return (
      <div className="scene-pad fd-scene fd-waitone-scene">
        <div className="fd-waitone-head fd-rise">
          <span className="label-mono">配套的 wait · 专等第一个完成</span>
        </div>
        <div className="fd-waitone-flow">
          <div className="fd-waitone-first card fd-pop" style={delay(700)}>
            <span className="mono">第一个完成</span>
          </div>
          <span className="fd-waitone-arrow fd-grow" style={delay(2200)}>→</span>
          <div className="fd-waitone-take fd-pop" style={delay(3000)}>马上端走</div>
        </div>
        <div className="fd-waitone-rest fd-rise" style={delay(4600)}>其余的，继续跑</div>
      </div>
    );
  }

  /* step 6 — 第三节：错误留言 */
  if (step === 6) {
    return (
      <div className="scene-pad fd-scene fd-err-scene">
        <div className="fd-err-head fd-rise" style={delay(600)}>
          <span className="label-mono">第三节 · 出错怎么送到你手上</span>
        </div>
        <Term title="[3] 异常传播">
          <div className="fd-term-line mono fd-rise" style={delay(1600)}>worker 里炸出一个 ValueError</div>
          <div className="fd-err-msg mono fd-pop" style={delay(3000)}>
            留言：「worker 里爆炸了」
          </div>
        </Term>
      </div>
    );
  }

  /* step 7 — 两边都原样送到 */
  if (step === 7) {
    return (
      <div className="scene-pad fd-scene fd-deliver-scene">
        <div className="fd-deliver-row fd-rise" style={delay(600)}>
          <span className="mono fd-deliver-from">线程池</span>
          <span className="fd-deliver-arrow fd-grow" style={delay(1800)}>→</span>
          <span className="fd-deliver-to">原样送到你面前</span>
        </div>
        <div className="fd-deliver-row fd-rise" style={delay(3200)}>
          <span className="mono fd-deliver-from">进程池</span>
          <span className="fd-deliver-arrow fd-grow" style={delay(4200)}>→</span>
          <span className="fd-deliver-to">
            也原样送到 —— 这份是<span className="fd-accent">跨进程打包寄回</span>的
          </span>
        </div>
      </div>
    );
  }

  /* step 8 — 第四节：0.2 秒超时，205ms 翻脸 */
  if (step === 8) {
    return (
      <div className="scene-pad fd-scene fd-timeout-scene">
        <div className="fd-timeout-head fd-rise" style={delay(500)}>
          <span className="label-mono">第四节 · result 限 0.2 秒</span>
        </div>
        <div className="fd-timeout-track">
          <div className="fd-timeout-bar fd-grow" style={delay(1000)} />
          <div className="fd-timeout-mark fd-pop" style={delay(2800)}>
            <span className="fd-timeout-flag mono">205 ms</span>
            <span className="fd-timeout-pin" />
          </div>
        </div>
        <div className="fd-timeout-hero fd-rise" style={delay(4600)}>
          准时翻脸 —— <span className="fd-accent">超时异常当场就抛</span>
        </div>
        <div className="fd-timeout-note mono fd-rise" style={delay(7000)}>
          多出的几毫秒 ＝ 系统安排任务的最小时间单位
        </div>
      </div>
    );
  }

  /* step 9 — 边界金句（fallthrough 兜底步） */
  return (
    <div className="scene-pad fd-scene fd-boundary-scene">
      <div className="fd-boundary-duo">
        <div className="fd-boundary-card fd-pop" style={delay(400)}>
          <div className="mono fd-boundary-tag">你这边</div>
          <div className="fd-boundary-name">翻脸走人</div>
        </div>
        <div className="fd-boundary-card fd-pop" style={delay(1600)}>
          <div className="mono fd-boundary-tag">任务那边</div>
          <div className="fd-boundary-name">还在后台跑完</div>
        </div>
      </div>
      <div className="fd-boundary-hero fd-rise" style={delay(3200)}>
        翻脸的只是<span className="fd-accent">你</span>，不是它
      </div>
    </div>
  );
}
