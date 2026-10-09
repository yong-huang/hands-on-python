import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./QaClosing.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function QaClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — Q1：gather 侧 */
  if (step === 0) {
    return (
      <div className="scene-pad qa-scene">
        <div className="qa-head qa-rise">
          <span className="label-mono">常问 · 第一问</span>
          <span className="qa-q-talk">都能容错，怎么选？</span>
        </div>
        <div className="qa-gather-card qa-rise" style={delay(1400)}>
          <div className="mono qa-tool-name">gather</div>
          <div className="qa-gather-line">
            哪个失败，就把<b>错误本身</b>当作一份结果，收进列表
          </div>
          <div className="qa-gather-line qa-gather-sub">其余任务一个不停，照常跑完</div>
        </div>
        <div className="qa-count-row">
          <span className="qa-count-chip qa-rise" style={delay(4400)}>100 个页面</span>
          <span className="qa-count-chip qa-rise" style={delay(5200)}>挂了 3 个</span>
          <span className="qa-count-hero qa-rise" style={delay(6200)}>
            拿回 <span className="hero-num qa-hero-num">97</span> 个
          </span>
        </div>
      </div>
    );
  }

  /* step 1 — Q1：TaskGroup 侧（对照收束） */
  if (step === 1) {
    return (
      <div className="scene-pad qa-scene">
        <div className="qa-head qa-rise">
          <span className="label-mono">常问 · 第一问</span>
          <span className="qa-q-talk">另一个答案是——</span>
        </div>
        <div className="qa-tg-card qa-rise" style={delay(300)}>
          <div className="mono qa-tool-name">TaskGroup</div>
          <div className="qa-gather-line">
            一个失败，<b>全员取消</b>
          </div>
          <div className="qa-gather-line qa-gather-sub">必须全成、否则全撤的活儿，比如下单</div>
        </div>
        <div className="qa-pair-note qa-rise" style={delay(1800)}>
          批量独立查询 → gather · 事务型一组 → TaskGroup
        </div>
      </div>
    );
  }

  /* step 2 — Q2：异常组处理两条路 */
  if (step === 2) {
    return (
      <div className="scene-pad qa-scene">
        <div className="qa-head qa-rise">
          <span className="label-mono">常问 · 第二问</span>
          <span className="qa-q-talk">异常组怎么处理？</span>
        </div>
        <div className="qa-roads">
          <div className="qa-road qa-rise" style={delay(700)}>
            <div className="qa-road-tag">路一 · 3.11 新写法</div>
            <div className="mono qa-road-code">except* ValueError: …</div>
            <div className="qa-road-talk">按错误类型，分组接住</div>
          </div>
          <div className="qa-road qa-rise" style={delay(2600)}>
            <div className="qa-road-tag">路二 · 笨办法</div>
            <div className="mono qa-road-code">for exc in eg.exceptions: …</div>
            <div className="qa-road-talk">一个一个过一遍，是什么错就怎么处理</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 仓库卡 */
  if (step === 3) {
    return (
      <div className="scene-pad qa-scene qa-repo-scene">
        <div className="label-mono qa-rise">完整代码在仓库里</div>
        <hr className="rule qa-repo-rule qa-rise" style={delay(160)} />
        <div className="qa-repo-path qa-rise" style={delay(340)}>
          hands-on-python <span className="qa-repo-sep">/</span> concurrency <span className="qa-repo-sep">/</span> 09_task_orchestration
        </div>
        <div className="mono qa-repo-cmd qa-rise" style={delay(800)}>$ python3 task_orchestration.py</div>
      </div>
    );
  }

  /* step 4 — 终屏：下一讲 + 下期见 */
  return (
    <div className="scene-pad qa-scene qa-end-scene">
      <div className="label-mono qa-rise">下一讲</div>
      <div className="qa-end-title qa-rise" style={delay(300)}>
        异步流水线
      </div>
      <div className="qa-end-sub qa-rise" style={delay(900)}>
        把生产者消费者，搬进单线程世界
      </div>
      <hr className="rule qa-repo-rule qa-rise" style={delay(1500)} />
      <div className="qa-end-bye qa-rise" style={delay(1800)}>下期见</div>
    </div>
  );
}
