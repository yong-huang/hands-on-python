import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Mechanism.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** GIL 小锁（迷你描边）。 */
function MiniLock() {
  return (
    <svg width="44" height="44" viewBox="0 0 100 100" fill="none" aria-hidden className="mc-lock">
      <rect x="22" y="44" width="56" height="42" rx="3" stroke="currentColor" strokeWidth="5" />
      <path d="M34 44 V32 a16 16 0 0 1 32 0 V44" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="62" r="7" fill="currentColor" />
    </svg>
  );
}

export default function MechanismChapter({ step }: ChapterStepProps) {
  /* step 0 — 2.5 倍从哪来：4 份独立解释器 */
  if (step === 0) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-kicker mc-rise">
          <span className="label-mono">2.5 倍从哪来</span>
        </div>
        <div className="mc-proc-grid">
          {[1, 2, 3, 4].map((i) => (
            <div className="mc-proc-card mc-pop" style={delay(i * 280)} key={i}>
              <div className="mc-proc-lock"><MiniLock /></div>
              <div className="mc-proc-name mono">进程 {i}</div>
              <div className="mc-proc-mem">
                <span className="mc-mem-block" />
                <span className="mc-mem-block" />
                <span className="mc-mem-block" />
              </div>
              <div className="mc-proc-sub">自己的 GIL · 自己的内存</div>
            </div>
          ))}
        </div>
        <div className="mc-tagline mc-rise" style={delay(1600)}>
          4 份<em>互不干扰</em>的计算
        </div>
      </div>
    );
  }

  /* step 1~3 — 三笔代价（递进） */
  if (step === 1) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-cost-head mc-rise">
          <span className="label-mono">代价有三笔 · 1/3</span>
        </div>
        <h1 className="mc-cost-name mc-rise" style={delay(250)}>
          启动费
        </h1>
        <div className="mc-cost-card mc-rise" style={delay(700)}>
          <div className="mc-cost-term mono">spawn</div>
          <div className="mc-cost-gloss">
            Python 开子进程的默认方式——<em>重新</em>启动一个全新解释器
          </div>
          <div className="mc-cost-track">
            <div className="mc-cost-bar mc-grow" style={delay(1400)} />
          </div>
          <div className="mc-cost-sec mono mc-rise" style={delay(1800)}>50 ~ 100 ms / 个</div>
        </div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-cost-head mc-rise">
          <span className="label-mono">代价有三笔 · 2/3</span>
        </div>
        <h1 className="mc-cost-name mc-rise" style={delay(250)}>
          物流费
        </h1>
        <div className="mc-ship">
          <div className="mc-ship-end mc-rise" style={delay(600)}>
            <span className="mono">传参</span>
          </div>
          <div className="mc-ship-lane">
            <div className="mc-parcel mc-parcel-go" />
            <div className="mc-parcel mc-parcel-go mc-parcel-back" />
          </div>
          <div className="mc-ship-end mc-rise" style={delay(900)}>
            <span className="mono">返回值</span>
          </div>
        </div>
        <div className="mc-cost-note mc-rise" style={delay(1700)}>
          全要过 <span className="mono">pickle</span> 打包——数据越大，这笔越贵
        </div>
      </div>
    );
  }
  if (step === 3) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-cost-head mc-rise">
          <span className="label-mono">代价有三笔 · 3/3</span>
        </div>
        <h1 className="mc-cost-name mc-rise" style={delay(250)}>
          隔离费
        </h1>
        <div className="mc-iso">
          {[
            { name: "进程 1", v: "count = 5" },
            { name: "进程 2", v: "count = 5" },
          ].map((p, i) => (
            <div className="mc-iso-card mc-pop" style={delay(500 + i * 700)} key={p.name}>
              <div className="mc-iso-name mono">{p.name}</div>
              <div className="mc-iso-var mono">{p.v}</div>
              <div className="mc-iso-copy">改的只是自己的副本</div>
            </div>
          ))}
          <div className="mc-iso-cross mc-pop" style={delay(1400)}>
            <span className="mono">直接改对方的 →</span> <b>✕</b>
          </div>
        </div>
        <div className="mc-cost-note mc-rise" style={delay(2000)}>
          真要共享内存，走专门通道——<em>下一讲</em>
        </div>
      </div>
    );
  }

  /* step 4 — 诚实数字一：spawn 一整套 0.3~0.5s */
  if (step === 4) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-cost-head mc-rise">
          <span className="label-mono">两个数字 · 1/2</span>
        </div>
        <div className="mc-honest-num mc-rise" style={delay(250)}>
          0.3 ~ 0.5 <span className="mc-honest-unit">秒</span>
        </div>
        <div className="mc-honest-sub mc-rise" style={delay(800)}>
          spawn 一整套——第一次使用躲不掉
        </div>
        <div className="mc-code mc-rise" style={delay(1500)}>
          <span className="mc-code-kw">with</span> multiprocessing.Pool(<span className="mc-code-num">4</span>) <span className="mc-code-comment"># 建池放计时外——一次性成本</span>
        </div>
      </div>
    );
  }

  /* step 5 — 诚实数字二：2.4~3.2× 浮动 */
  if (step === 5) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-cost-head mc-rise">
          <span className="label-mono">两个数字 · 2/2</span>
        </div>
        <div className="mc-scale">
          <div className="mc-scale-line mc-grow" style={delay(300)} />
          <div className="mc-scale-band mc-rise" style={delay(800)}>
            <span className="mono">2.4×</span>
            <span className="mc-scale-hint">加速实测浮动区间</span>
            <span className="mono">3.2×</span>
          </div>
          <div className="mc-scale-cores mc-rise" style={delay(1400)}>
            <span>快核</span>
            <span>慢核</span>
          </div>
        </div>
        <div className="mc-cost-note mc-rise" style={delay(2000)}>
          芯片有快有慢——验收只锁 <em>2 倍底线</em>
        </div>
      </div>
    );
  }

  /* step 6 — 公式 */
  if (step === 6) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-cost-head mc-rise">
          <span className="label-mono">最后一笔账 · 任务规模</span>
        </div>
        <div className="mc-formula mc-rise" style={delay(300)}>
          加速比 ＝ 总任务量 ÷（单任务量 ＋ 启动时间）
        </div>
      </div>
    );
  }

  /* step 7 — 代入算账 */
  if (step === 7) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-calc">
          <div className="mc-calc-row mc-rise">
            <span className="mc-calc-key">单任务</span>
            <span className="mono mc-calc-val">0.15s × 4 ＝ 0.6s</span>
          </div>
          <div className="mc-calc-row mc-rise" style={delay(800)}>
            <span className="mc-calc-key">启动摊入</span>
            <span className="mono mc-calc-val">＋ 0.4s</span>
          </div>
          <div className="mc-calc-result mc-pop" style={delay(1700)}>
            还剩 <b className="mono">2.5×</b>
          </div>
        </div>
        <div className="mc-warn mc-rise" style={delay(2400)}>
          任务太小，启动成本吞掉全部收益——<em>先算这笔账</em>
        </div>
      </div>
    );
  }

  /* step 8 — 判断卡两栏 */
  const YES = [
    { k: "批量纯计算", v: "几万张图各缩一张 / 各算一次哈希" },
    { k: "长时离线作业", v: "特征工程 / 日志聚合 / 批量渲染" },
  ];
  const NO = [
    { k: "IO 密集", v: "线程更省" },
    { k: "毫秒级小任务", v: "启动成本吞掉收益" },
    { k: "高频共享数据", v: "每次都过打包运输" },
  ];
  return (
    <div className="scene-pad mc-scene">
      <div className="mc-judge">
        <div className="mc-judge-col mc-rise">
          <div className="mc-judge-head mc-judge-head--yes">该上</div>
          {YES.map((x, i) => (
            <div className="mc-judge-item mc-rise" style={delay(400 + i * 350)} key={x.k}>
              <div className="mc-judge-key">{x.k}</div>
              <div className="mc-judge-val">{x.v}</div>
            </div>
          ))}
        </div>
        <div className="mc-judge-col mc-judge-col--no mc-rise" style={delay(1100)}>
          <div className="mc-judge-head mc-judge-head--no">不该上</div>
          {NO.map((x, i) => (
            <div className="mc-judge-item mc-rise" style={delay(1400 + i * 300)} key={x.k}>
              <div className="mc-judge-key">{x.k}</div>
              <div className="mc-judge-val">{x.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
