import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Mechanism.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 契约解决的三坑（逐条划掉）。 */
const SOLVED = [
  { name: "异常不再静默", talk: "出口必抛" },
  { name: "退出没有孤儿", talk: "块结束全收场" },
  { name: "取消有人负责", talk: "连带责任制" },
] as const;

export default function MechanismChapter({ step }: ChapterStepProps) {
  /* step 0 — 取消怎么发生：线程掐不死 */
  if (step === 0) {
    return (
      <div className="scene-pad me-scene">
        <div className="me-head me-rise">
          <span className="label-mono">机制拆开 · 先回答</span>
        </div>
        <div className="me-q-hero me-rise" style={delay(200)}>
          取消，到底<b>怎么发生</b>的？
        </div>
        <div className="me-thread-card me-rise" style={delay(1200)}>
          <div className="me-thread-line">
            <span className="mono me-thread-name">线程</span>
            <span className="me-thread-talk">系统管的干活人手</span>
            <span className="me-thread-no me-stamp">✕ 掐不死</span>
          </div>
          <div className="me-thread-note">Python 在语言层面做不到直接杀线程</div>
        </div>
      </div>
    );
  }

  /* step 1 — 注入取消异常，落在最近的 await 点 */
  if (step === 1) {
    return (
      <div className="scene-pad me-scene">
        <div className="me-head me-rise">
          <span className="label-mono">真正的做法 · 注入</span>
          <span className="mono me-head-note">CancelledError ＝ 取消异常</span>
        </div>
        <div className="me-cor-stage">
          <svg className="me-cor-svg me-rise" style={delay(300)} viewBox="0 0 1120 130" aria-hidden>
            <line x1="30" y1="65" x2="1090" y2="65" stroke="var(--rule)" strokeWidth="2" />
            <circle cx="360" cy="65" r="9" fill="var(--surface-3)" stroke="var(--rule)" strokeWidth="1.5" />
            <circle cx="760" cy="65" r="9" fill="var(--surface-3)" stroke="var(--rule)" strokeWidth="1.5" />
          </svg>
          <div className="me-await me-a1 me-rise" style={delay(900)}>
            <span className="mono">await 点</span>
            <span className="me-await-talk">让出控制权 · 回去排队</span>
          </div>
          <div className="me-await me-a2 me-rise" style={delay(1100)}>
            <span className="mono">await 点</span>
            <span className="me-await-talk">让出控制权 · 回去排队</span>
          </div>
          <div className="me-inject me-stamp">
            <span className="mono me-inject-chip">「取消异常」</span>
            <span className="me-inject-talk">往协程里注入</span>
          </div>
          <div className="me-inject-here me-stamp2">取消异常 · 就落在最近的 await 点</div>
        </div>
        <div className="me-propagate me-rise" style={delay(7200)}>
          一进来，就顺着<b>普通报错的路</b>往外传
        </div>
      </div>
    );
  }

  /* step 2 — 解释实验：try/finally 照常工作 */
  if (step === 2) {
    return (
      <div className="scene-pad me-scene">
        <div className="me-head me-rise">
          <span className="label-mono">解释实验现象</span>
        </div>
        <div className="me-why-q me-rise" style={delay(200)}>
          为什么清理代码<b>每次都执行了</b>？
        </div>
        <div className="me-try-card me-rise" style={delay(1100)}>
          <div className="mono me-try-line"><span className="me-kw">try</span>:</div>
          <div className="mono me-try-line me-try-indent">干活…</div>
          <div className="mono me-try-line"><span className="me-kw">finally</span>:</div>
          <div className="mono me-try-line me-try-indent">清理 <span className="me-finally-ok">✓ 照常工作</span></div>
        </div>
        <div className="me-why-a me-rise" style={delay(2200)}>
          取消走的是<b>普通报错的路</b>——清理逻辑不特殊，照跑
        </div>
      </div>
    );
  }

  /* step 3 — 两条推论双卡 */
  if (step === 3) {
    return (
      <div className="scene-pad me-scene">
        <div className="me-head me-rise">
          <span className="label-mono">两条推论</span>
        </div>
        <div className="me-infer-row">
          <div className="me-infer-card me-infer-ok me-rise" style={delay(400)}>
            <div className="me-infer-ord mono">推论一</div>
            <div className="me-infer-name">清理逻辑，必须放 finally 里</div>
            <div className="me-infer-talk">取消走异常路径，finally 必经</div>
          </div>
          <div className="me-infer-card me-infer-bad me-rise" style={delay(2600)}>
            <div className="me-infer-ord mono">推论二</div>
            <div className="me-infer-name">except 全接住、不抛 → 「取消不动」</div>
            <div className="me-infer-talk">取消异常也被接住，任务对取消免疫</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 任务组契约 + 逐条划掉三坑 */
  if (step === 4) {
    return (
      <div className="scene-pad me-scene">
        <div className="me-head me-rise">
          <span className="label-mono">任务组的契约</span>
        </div>
        <div className="me-contract-hero me-rise" style={delay(200)}>
          块结束，<span className="me-accent">必定收场</span>
        </div>
        <div className="me-contract-pair">
          <span className="me-contract-exit me-rise" style={delay(900)}>正常 → 等齐了再出门</span>
          <span className="me-contract-exit me-rise" style={delay(1400)}>有异常 → 取消其余，打包上抛</span>
        </div>
        <div className="me-solved-list">
          {SOLVED.map((s, i) => (
            <div key={s.name} className="me-solved-row me-rise" style={delay(3200 + i * 1600)}>
              <span className="me-solved-mark">✓</span>
              <span className="me-solved-name">{s.name}</span>
              <span className="me-solved-talk">—— {s.talk}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 5 — 细节：从异常组列表逐个取出 */
  return (
    <div className="scene-pad me-scene">
      <div className="me-head me-rise">
        <span className="label-mono">一个细节</span>
      </div>
      <div className="me-eg-stage">
        <div className="me-eg-list me-rise" style={delay(200)}>
          <div className="me-eg-title mono">ExceptionGroup.exceptions</div>
          <div className="me-eg-row me-rise" style={delay(900)}><span className="mono">[0]</span> ValueError(…) <b>← 逐个取出</b></div>
          <div className="me-eg-row me-rise" style={delay(1500)}><span className="mono">[1]</span> TypeError(…)</div>
        </div>
        <div className="me-eg-note me-rise" style={delay(2200)}>
          异常<b>不再单独抛</b>——解包要逐个来
        </div>
      </div>
    </div>
  );
}
