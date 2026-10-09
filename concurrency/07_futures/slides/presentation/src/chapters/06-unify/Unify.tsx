import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Unify.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function UnifyChapter({ step }: ChapterStepProps) {
  /* step 0 — 对照表（字典）落地 */
  if (step === 0) {
    const rows = [
      { name: "ThreadPoolExecutor", make: "创建 4 个线程的执行器" },
      { name: "ProcessPoolExecutor", make: "创建 4 个进程的执行器" },
    ];
    return (
      <div className="scene-pad un-scene un-dict-scene">
        <div className="un-dict-head un-rise" style={delay(300)}>
          <span className="label-mono">统一接口怎么落地 · 一张对照表（术语叫字典）</span>
        </div>
        <div className="un-dict-table card un-pop" style={delay(900)}>
          <div className="un-dict-cols mono un-rise" style={delay(1700)}>
            <span>名字（键）</span>
            <span>创建方法（值）</span>
          </div>
          {rows.map((r, i) => (
            <div className="un-dict-row un-rise" style={delay(2500 + i * 900)} key={r.name}>
              <span className="mono un-dict-name">{r.name}</span>
              <span className="un-dict-make">{r.make}</span>
            </div>
          ))}
        </div>
        <div className="un-dict-hero un-rise" style={delay(6800)}>
          干活的函数不用知道背后是谁 —— 换后端，就是<span className="un-accent">换右栏</span>
        </div>
      </div>
    );
  }

  /* step 1 — 换插头，电压没变 */
  if (step === 1) {
    return (
      <div className="scene-pad un-scene un-plug-scene">
        <div className="un-plug-flow">
          <div className="un-plug-code card un-pop" style={delay(400)}>
            <div className="mono un-plug-tag">你的业务代码</div>
            <div className="un-plug-wire un-grow" style={delay(1600)} />
          </div>
          <div className="un-plug-sockets">
            <div className="un-plug-socket un-pop" style={delay(2600)}>
              <span className="mono">线程插座</span>
            </div>
            <div className="un-plug-socket un-pop" style={delay(3400)}>
              <span className="mono">进程插座</span>
            </div>
          </div>
        </div>
        <div className="un-plug-hero un-rise" style={delay(4600)}>
          换了插头，<span className="un-accent">电压没变</span>
        </div>
        <div className="un-plug-note mono un-rise" style={delay(5350)}>
          底下还是线程和进程那两套模型
        </div>
      </div>
    );
  }

  /* step 2 — IO 用线程：等待时松开 GIL */
  if (step === 2) {
    return (
      <div className="scene-pad un-scene un-io-scene">
        <div className="un-io-head un-rise" style={delay(300)}>
          <span className="label-mono">换后端前 · 先看活儿是哪种</span>
        </div>
        <div className="un-io-tasks">
          <div className="un-io-task un-rise" style={delay(1400)}>
            等网页回话
          </div>
          <div className="un-io-task un-rise" style={delay(2400)}>
            等文件读完
          </div>
          <div className="un-io-tag mono un-pop" style={delay(3400)}>
            等字当头 ＝ IO
          </div>
        </div>
        <div className="un-io-verdict un-rise" style={delay(4600)}>
          用<span className="un-accent">线程</span>：等待时它会松开 GIL（Python 的全局解释器锁）
        </div>
      </div>
    );
  }

  /* step 3 — GIL 与纯算用进程（fallthrough 兜底步） */
  return (
    <div className="scene-pad un-scene un-gil-scene">
      <div className="un-gil-lock un-pop" style={delay(300)}>
        <span className="mono un-gil-name">GIL</span>
        <span className="un-gil-talk">全局解释器锁 · 同一时刻只准一个线程干活</span>
      </div>
      <div className="un-gil-duo">
        <div className="un-gil-card card un-pop" style={delay(2400)}>
          <div className="un-gil-card-tag mono">等字当头</div>
          <div className="un-gil-card-main">用线程</div>
          <div className="un-gil-card-talk">等的时候松开锁，让别人干活</div>
        </div>
        <div className="un-gil-card card un-pop" style={delay(4600)}>
          <div className="un-gil-card-tag mono">纯算的活</div>
          <div className="un-gil-card-main">用进程</div>
          <div className="un-gil-card-talk">一人一间屋，绕开这把锁</div>
        </div>
      </div>
    </div>
  );
}
