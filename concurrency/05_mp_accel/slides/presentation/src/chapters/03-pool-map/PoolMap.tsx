import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./PoolMap.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const STEPS = ["提交", "并行执行", "汇合"] as const;

export default function PoolMapChapter({ step }: ChapterStepProps) {
  /* step 0 — Pool 定义 */
  if (step === 0) {
    return (
      <div className="scene-pad pm-scene pm-def-scene">
        <div className="label-mono pm-rise">multiprocessing · 最常用</div>
        <h1 className="pm-def-name pm-rise" style={delay(250)}>
          multiprocessing<span className="pm-def-dot">.</span>Pool
        </h1>
        <div className="pm-def-gloss pm-rise" style={delay(850)}>
          进程池 ＝ 预先雇好固定数量的 worker，循环领任务
        </div>
        <div className="pm-def-worker pm-rise" style={delay(1500)}>
          <span className="label-mono">名词</span>
          worker ＝ 池里干活的小进程
        </div>
        <div className="pm-def-corner pm-rise" style={delay(2100)}>
          <span className="label-mono">记账</span>
          建池是一次性成本，建好应复用
        </div>
      </div>
    );
  }

  /* step 1 — pool.map 三步管线总览 */
  if (step === 1) {
    return (
      <div className="scene-pad pm-scene pm-pipe-scene">
        <div className="pm-pipe-head pm-rise">
          <span className="mono pm-pipe-fn">pool.map</span>
          <span className="pm-pipe-claim">从提交到收工，三步</span>
        </div>
        <div className="pm-pipe">
          {STEPS.map((s, i) => (
            <div className="pm-pipe-item" key={s}>
              {i > 0 && (
                <span className="pm-pipe-arrow pm-rise" style={delay(600 + i * 500)}>→</span>
              )}
              <div className="pm-pipe-node pm-pop" style={delay(i * 500)}>
                <div className="pm-pipe-ord mono">{`0${i + 1}`}</div>
                <div className="pm-pipe-cn">{s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 2 — 第 1 步 · 提交：切块分发 */
  if (step === 2) {
    return (
      <div className="scene-pad pm-scene pm-submit-scene">
        <div className="pm-stage-label pm-rise">
          <span className="pm-stage-ord mono">01</span> 提交
        </div>
        <div className="pm-submit">
          <div className="pm-submit-main pm-pop">
            <div className="label-mono">主进程</div>
            <div className="pm-submit-tasks">
              {[0, 1, 2, 3].map((i) => (
                <span className="pm-task-chip" key={i}>{`T${i}`}</span>
              ))}
            </div>
          </div>
          <div className="pm-submit-flows">
            {[0, 1, 2, 3].map((i) => (
              <div className="pm-flow pm-flow-run" style={delay(600 + i * 220)} key={i}>
                <span className="pm-flow-chip mono">{`T${i}`}</span>
              </div>
            ))}
          </div>
          <div className="pm-submit-workers">
            {[1, 2, 3, 4].map((i) => (
              <div className="pm-worker pm-rise" style={delay(1200 + i * 160)} key={i}>
                <span className="mono">W{i}</span>
                <span className="pm-worker-note">领一块</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pm-submit-note pm-rise" style={delay(2100)}>
          任务列表切块，分给池里的 worker
        </div>
      </div>
    );
  }

  /* step 3 — 第 2 步 · 并行执行：同时开算 */
  if (step === 3) {
    return (
      <div className="scene-pad pm-scene pm-run-scene">
        <div className="pm-stage-label pm-rise">
          <span className="pm-stage-ord mono">02</span> 并行执行
        </div>
        <div className="pm-run-grid">
          {[1, 2, 3, 4].map((i) => (
            <div className="pm-run-card pm-pop" style={delay(i * 260)} key={i}>
              <div className="pm-run-name mono">W{i}</div>
              <div className="pm-run-track">
                <div className="pm-run-fill pm-run-fill-go" style={delay(500 + i * 260)} />
              </div>
              <div className="pm-run-note">同时开算</div>
            </div>
          ))}
        </div>
        <div className="pm-run-tagline pm-rise" style={delay(2100)}>
          各领一块，<em>同时</em>开算
        </div>
      </div>
    );
  }

  /* step 4 — 第 3 步 · 汇合：按输入顺序回流 */
  if (step === 4) {
    return (
      <div className="scene-pad pm-scene pm-join-scene">
        <div className="pm-stage-label pm-rise">
          <span className="pm-stage-ord mono">03</span> 汇合
        </div>
        <div className="pm-join">
          <div className="pm-join-workers">
            {[
              { w: "W1", t: "0.31s 完成" },
              { w: "W3", t: "0.12s 完成" },
              { w: "W2", t: "0.22s 完成" },
              { w: "W4", t: "0.05s 完成" },
            ].map((x, i) => (
              <div className="pm-join-worker pm-rise" style={delay(i * 260)} key={x.w}>
                <span className="mono">{x.w}</span>
                <span className="pm-join-t mono">{x.t}</span>
              </div>
            ))}
          </div>
          <div className="pm-join-flow">
            {["T0", "T1", "T2", "T3"].map((t, i) => (
              <span className="pm-join-chip mono pm-flow-back" style={delay(900 + i * 300)} key={t}>
                {t}
              </span>
            ))}
          </div>
          <div className="pm-join-tiny pm-rise" style={delay(2100)}>
            <span className="label-mono">注</span>
            上方完成时刻为示意
          </div>
          <div className="pm-join-main pm-pop" style={delay(2100)}>
            <div className="label-mono">主进程收到</div>
            <div className="pm-join-order mono">[ T0 · T1 · T2 · T3 ]</div>
          </div>
        </div>
        <div className="pm-join-note pm-rise" style={delay(2500)}>
          按<em>输入顺序</em>回来——不是完成顺序，队伍不乱
        </div>
      </div>
    );
  }

  /* step 5 — pickle：谁也不能直接拿对方的内存 */
  return (
    <div className="scene-pad pm-scene pm-pickle-scene">
      <div className="pm-pickle-rule pm-rise">
        规矩：谁也不能直接拿对方的<em>内存</em>
      </div>
      <div className="pm-pickle-lane">
        <div className="pm-pickle-proc pm-rise" style={delay(300)}>
          <span className="mono">进程 A</span>
          <span className="pm-pickle-param mono">参数</span>
        </div>
        <div className="pm-pickle-bridge">
          <div className="pm-parcel pm-parcel-go">
            <span className="mono">pickle</span>
          </div>
          <div className="pm-parcel-hint pm-rise" style={delay(1500)}>
            先打包，再运输
          </div>
        </div>
        <div className="pm-pickle-proc pm-rise" style={delay(700)}>
          <span className="mono">进程 B</span>
          <span className="pm-pickle-param mono">结果 ←</span>
        </div>
      </div>
      <div className="pm-pickle-def pm-rise" style={delay(2100)}>
        <span className="label-mono">名词</span>
        pickle ＝ Python 自带的对象打包机（压成字节，运过去再拆开）
      </div>
      <div className="pm-pickle-tagline pm-rise" style={delay(2800)}>
        这份物流成本，就是多进程的<em>核心代价</em>
      </div>
    </div>
  );
}
