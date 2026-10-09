import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Background.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** step 0：轮流写计数器的线程片。 */
const THREADS = ["线程 A", "线程 B", "线程 C"] as const;

export default function BackgroundChapter({ step }: ChapterStepProps) {
  /* step 0 — 线程时代：所有线程共写同一个计数器 */
  if (step === 0) {
    return (
      <div className="scene-pad bg-scene bg-free-scene">
        <div className="bg-free-head bg-rise">
          <span className="label-mono">多进程 · 背景</span>
        </div>
        <h2 className="bg-free-title bg-rise" style={delay(200)}>
          线程时代，共享是<b>免费</b>的
        </h2>
        <div className="bg-free-diagram">
          <div className="bg-free-proc card bg-rise" style={delay(500)}>
            <div className="bg-free-proc-tag label-mono">一个进程</div>
            <div className="bg-free-threads">
              {THREADS.map((t, i) => (
                <span key={t} className="bg-thread mono bg-pop" style={delay(900 + i * 350)}>
                  {t}
                </span>
              ))}
            </div>
            <div className="bg-free-counter">
              <span className="label-mono">全局计数器</span>
              <span className="bg-counter-val mono bg-pop" style={delay(2100)}>count = 3</span>
            </div>
            <div className="bg-free-note">谁都能直接读写，不用打招呼</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — GIL 与代价：真并行 / 内存隔离两半分屏 */
  if (step === 1) {
    return (
      <div className="scene-pad bg-scene bg-gil-scene">
        <div className="bg-gil-band card bg-rise">
          <span className="bg-gil-name mono">GIL</span>
          <div className="bg-gil-desc">
            <div className="bg-gil-cn">全局解释器锁</div>
            <div className="bg-gil-talk">同一时刻，只放一个线程真正干活</div>
          </div>
        </div>
        <div className="bg-gil-lead bg-rise" style={delay(700)}>
          多进程 = 绕开 GIL，拿到<b>真并行</b>——但代价同时到账
        </div>
        <div className="bg-gil-halves">
          <div className="bg-half card bg-rise" style={delay(1300)}>
            <div className="bg-half-tag label-mono bg-ok">得到</div>
            <div className="bg-half-title">真并行</div>
            <div className="bg-half-cores">
              <span className="bg-core mono bg-pop" style={delay(1900)}>核 1</span>
              <span className="bg-core mono bg-pop" style={delay(2050)}>核 2</span>
              <span className="bg-core mono bg-pop" style={delay(2200)}>核 3</span>
            </div>
            <div className="bg-half-note">多个核同时开算</div>
          </div>
          <div className="bg-half card bg-rise" style={delay(1600)}>
            <div className="bg-half-tag label-mono bg-lose">代价</div>
            <div className="bg-half-title">内存隔离</div>
            <div className="bg-half-mems">
              <span className="bg-mem mono bg-pop" style={delay(2200)}>内存 A</span>
              <span className="bg-mem mono bg-pop" style={delay(2350)}>内存 B</span>
            </div>
            <div className="bg-half-note">互相看不见对方的变量</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 撞墙演示：子进程改副本，父进程看不见 */
  if (step === 2) {
    return (
      <div className="scene-pad bg-scene bg-wall-scene">
        <div className="bg-wall-head bg-rise">
          <span className="label-mono">第一个坑</span>
        </div>
        <h2 className="bg-wall-title bg-rise" style={delay(200)}>
          改的是<b>自己那份副本</b>
        </h2>
        <div className="bg-wall-diagram">
          <div className="bg-wall-proc card bg-rise" style={delay(600)}>
            <div className="label-mono">父进程</div>
            <div className="bg-wall-val mono">count = 0</div>
            <div className="bg-wall-still">纹丝不动</div>
          </div>
          <div className="bg-wall-gap">
            <div className="bg-wall-link" />
            <div className="bg-wall-block bg-pop" style={delay(2400)}>看不见</div>
          </div>
          <div className="bg-wall-proc bg-wall-child card bg-rise" style={delay(900)}>
            <div className="label-mono">子进程</div>
            <div className="bg-wall-val mono">
              count = 0<span className="bg-wall-flip bg-pop" style={delay(1600)}>42</span>
            </div>
            <div className="bg-wall-still bg-wall-flipped">改得热火朝天</div>
          </div>
        </div>
        <div className="bg-wall-punch bg-rise" style={delay(3100)}>
          顺着线程的老思路一写，第一个坑马上出现
        </div>
      </div>
    );
  }

  /* step 3 — 只剩两条路：打包搬运 vs 退回单进程 */
  if (step === 3) {
    return (
      <div className="scene-pad bg-scene bg-roads-scene">
        <div className="bg-roads-head bg-rise">
          <span className="label-mono">进程 ＝ 独立运行的程序 · 一人一套内存</span>
        </div>
        <h2 className="bg-roads-title bg-rise" style={delay(200)}>
          想协作，只剩<b>两条路</b>
        </h2>
        <div className="bg-roads-row">
          <div className="bg-road card bg-rise" style={delay(700)}>
            <div className="bg-road-ord mono">路 1</div>
            <div className="bg-road-title">把数据打包运来运去</div>
            <div className="bg-road-demo">
              <span className="bg-road-box mono">原件</span>
              <span className="bg-road-arrow" />
              <span className="bg-road-box mono">副本</span>
            </div>
            <div className="bg-road-note">打包 → 运输 → 拆包，运费按字节计</div>
          </div>
          <div className="bg-road card bg-rise" style={delay(1000)}>
            <div className="bg-road-ord mono">路 2</div>
            <div className="bg-road-title">退回单进程</div>
            <div className="bg-road-demo">
              <span className="bg-road-box bg-road-lone mono">一个进程</span>
              <span className="bg-road-x mono bg-pop" style={delay(2000)}>×</span>
            </div>
            <div className="bg-road-note">不通信了——并行白做</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 收束：操作系统设施打底，标准库包装出四条通道 */
  const CH = ["Pipe", "Queue", "SharedMemory", "Manager"] as const;
  return (
    <div className="scene-pad bg-scene bg-base-scene">
      <div className="bg-base-head bg-rise">
        <span className="label-mono">好消息</span>
      </div>
      <h2 className="bg-base-title bg-rise" style={delay(200)}>
        操作系统早就<b>备好了</b>
      </h2>
      <div className="bg-base-stack">
        <div className="bg-base-layer card bg-rise" style={delay(800)}>
          <div className="label-mono bg-base-tag">标准库 multiprocessing · 包装成 Python 对象</div>
          <div className="bg-base-chs">
            {CH.map((c, i) => (
              <span key={c} className="bg-ch mono bg-pop" style={delay(1500 + i * 200)}>{c}</span>
            ))}
          </div>
        </div>
        <div className="bg-base-arrow bg-rise" style={delay(1200)}>只管包装，路是现成的</div>
        <div className="bg-base-layer bg-base-os card bg-rise" style={delay(500)}>
          <div className="label-mono bg-base-tag">操作系统 · 现成的传话设施</div>
          <div className="bg-base-chs">
            <span className="bg-oschip mono bg-pop" style={delay(900)}>管道（一边进 · 一边出）</span>
            <span className="bg-oschip mono bg-pop" style={delay(1050)}>共享内存（大家看同一块）</span>
          </div>
        </div>
      </div>
    </div>
  );
}
