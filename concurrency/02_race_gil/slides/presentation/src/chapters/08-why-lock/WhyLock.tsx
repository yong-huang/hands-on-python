import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./WhyLock.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function WhyLockChapter({ step }: ChapterStepProps) {
  /* step 0 — 追问 */
  if (step === 0) {
    return (
      <div className="scene-pad wl-scene wl-ask-scene">
        <div className="wl-ask-hero wl-pop">
          既然有 GIL，
          <br />
          为什么还要<b className="wl-accent">锁</b>？
        </div>
      </div>
    );
  }

  /* step 1 — 击穿 + 字节码 gloss */
  if (step === 1) {
    return (
      <div className="scene-pad wl-scene wl-break-scene">
        <div className="wl-break-line wl-rise">
          GIL 保护的是 <b className="wl-accent">Python 程序本身</b>（解释器——真正替你一行行跑代码的那个程序），不是你的业务规则
        </div>
        <div className="wl-break-line wl-rise" style={delay(1800)}>
          你的每一小步，Python 都拆成一条条小指令——<b className="wl-accent">术语叫字节码</b>——每条都在 GIL 之下
        </div>
        <div className="wl-break-verdict wl-pop" style={delay(3600)}>
          「余额永不为负」照样被<b className="wl-accent">击穿</b>
        </div>
      </div>
    );
  }

  /* step 2 — 原子 + 公式 */
  if (step === 2) {
    return (
      <div className="scene-pad wl-scene wl-atom-scene">
        <div className="wl-atom-gloss wl-rise">
          「<b className="wl-accent">原子</b>」——一口气做完，中间没人插队
        </div>
        <div className="wl-atom-formula wl-pop" style={delay(1000)}>
          GIL 管<b className="wl-accent">字节码</b>的原子性
          <br />
          锁管<b className="wl-accent">你业务</b>的原子性
        </div>
      </div>
    );
  }

  /* step 3 — 何时不用 */
  if (step === 3) {
    return (
      <div className="scene-pad wl-scene wl-skip-scene">
        <div className="wl-skip-hero wl-rise">什么时候可以不管它？</div>
        <div className="wl-skip-cases">
          {["单线程", "各用各的变量", "一次性小脚本"].map((c, i) => (
            <div className="wl-skip-card wl-pop" style={delay(800 + i * 450)} key={c}>
              {c}
            </div>
          ))}
        </div>
        <div className="wl-skip-foot wl-rise" style={delay(2300)}>
          —— 这三种情况，<b className="wl-accent">放心不用锁</b>
        </div>
      </div>
    );
  }

  /* step 4 — 修法预告 */
  if (step === 4) {
    return (
      <div className="scene-pad wl-scene wl-fix-scene">
        <div className="wl-fix-hero wl-rise">
          丢失怎么修？<b className="wl-accent">加锁</b>
        </div>
        <div className="wl-fix-sub wl-rise" style={delay(1200)}>
          把读、改、写，包成一口气
        </div>
        <div className="wl-fix-next wl-rise" style={delay(2400)}>
          <span className="label-mono">下一讲</span>拆锁的三件套
        </div>
      </div>
    );
  }

  /* step 5 — 收尾 */
  return (
    <div className="scene-pad wl-scene wl-end-scene">
      <div className="wl-end-repo mono wl-rise">
        hands-on-python / concurrency / 02_race_gil
      </div>
      <div className="wl-end-cmd mono wl-rise" style={delay(600)}>
        <span className="wl-end-prompt">$</span> python3 race_gil.py
      </div>
      <div className="wl-end-hero wl-rise" style={delay(1600)}>
        一跑，就有<b className="wl-accent">体感</b>
      </div>
      <div className="wl-end-byeline wl-rise" style={delay(2600)}>
        链接在评论区 · 下期见
      </div>
    </div>
  );
}
